"""Optional PyTorch tabular MLP training. Install backend/requirements-ml.txt to enable."""
from pathlib import Path
import uuid, json
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler, LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, mean_squared_error, r2_score
from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.app.config import settings
from backend.app.models import Dataset, Experiment
from backend.app.services.datasets import DatasetService
import joblib

def train_torch_mlp(db:Session,user_id:str,workspace_id:str,req,task:str)->dict:
    try:
        import torch
        from torch import nn
        from torch.utils.data import DataLoader,TensorDataset
    except ImportError as exc:
        raise HTTPException(501,"PyTorch is not installed. Install backend/requirements-ml.txt and restart the compute service.") from exc
    torch.set_num_threads(max(1,min(4,torch.get_num_threads())))
    ds=db.query(Dataset).filter(Dataset.id==req.dataset_id,Dataset.owner_id==user_id,Dataset.is_deleted.is_(False)).first()
    if not ds: raise HTTPException(404,"Dataset not found in your workspace.")
    target=req.target_column
    if not target or target not in json.loads(ds.columns_json): raise HTTPException(422,"Select a valid target column.")
    df=DatasetService.read_file(Path(ds.storage_path)).dropna(subset=[target])
    features=req.features or [c for c in df.columns if c!=target]; features=[c for c in features if c in df.columns and c!=target]
    if not features or len(df)<30: raise HTTPException(422,"Deep-learning training needs at least one feature and 30 usable target rows.")
    X=df[features]; y=df[target]
    numeric=[c for c in features if pd.api.types.is_numeric_dtype(X[c])]; categorical=[c for c in features if c not in numeric]
    transformers=[]
    if numeric: transformers.append(("num",Pipeline([("impute",SimpleImputer(strategy="median",add_indicator=True)),("scale",StandardScaler())]),numeric))
    if categorical: transformers.append(("cat",Pipeline([("impute",SimpleImputer(strategy="most_frequent")),("encode",OneHotEncoder(handle_unknown="ignore",sparse_output=False))]),categorical))
    prep=ColumnTransformer(transformers)
    label_encoder=None
    if task=="classification":
        label_encoder=LabelEncoder(); y_arr=label_encoder.fit_transform(y.astype(str)); classes=label_encoder.classes_.tolist(); output_dim=len(classes)
        if output_dim<2: raise HTTPException(422,"Classification requires at least two target classes.")
        stratify=y_arr if np.unique(y_arr,return_counts=True)[1].min()>=2 else None
    else:
        y_arr=pd.to_numeric(y,errors="coerce").to_numpy(dtype=np.float32); output_dim=1
    Xtr_raw,Xte_raw,ytr,yte=train_test_split(X,y_arr,test_size=req.test_size,random_state=req.random_seed,stratify=stratify if task=="classification" else None)
    try:
        Xtr=prep.fit_transform(Xtr_raw).astype(np.float32); Xte=prep.transform(Xte_raw).astype(np.float32)
    except Exception as exc: raise HTTPException(422,f"Feature preprocessing failed: {str(exc)[:200]}") from exc
    if task=="regression":
        keep=np.isfinite(ytr); Xtr=Xtr[keep]; ytr=ytr[keep]; keep2=np.isfinite(yte); Xte=Xte[keep2]; yte=yte[keep2]
    if len(Xtr)<10 or len(Xte)<2: raise HTTPException(422,"Not enough valid training or test rows after preprocessing.")
    torch.manual_seed(req.random_seed); np.random.seed(req.random_seed)
    device=torch.device("cuda" if torch.cuda.is_available() else "cpu")
    class TabularMLP(nn.Module):
        def __init__(self,n_in,n_out):
            super().__init__(); self.net=nn.Sequential(nn.Linear(n_in,128),nn.ReLU(),nn.Dropout(.20),nn.Linear(128,64),nn.ReLU(),nn.Dropout(.10),nn.Linear(64,n_out))
        def forward(self,x): return self.net(x)
    model=TabularMLP(Xtr.shape[1],output_dim).to(device)
    tx=torch.tensor(Xtr,dtype=torch.float32); ty=torch.tensor(ytr,dtype=torch.long if task=="classification" else torch.float32)
    loader=DataLoader(TensorDataset(tx,ty),batch_size=min(64,len(tx)),shuffle=True)
    loss_fn=nn.CrossEntropyLoss() if task=="classification" else nn.MSELoss()
    optimizer=torch.optim.AdamW(model.parameters(),lr=0.001,weight_decay=0.0001)
    epochs=50; history=[]
    for epoch in range(epochs):
        model.train(); losses=[]
        for xb,yb in loader:
            xb=xb.to(device); yb=yb.to(device); optimizer.zero_grad(); out=model(xb)
            loss=loss_fn(out,yb if task=="classification" else yb.reshape(-1,1)); loss.backward(); optimizer.step(); losses.append(float(loss.detach().cpu()))
        history.append(round(float(np.mean(losses)),5))
    model.eval()
    with torch.no_grad(): logits=model(torch.tensor(Xte,dtype=torch.float32).to(device)).cpu().numpy()
    if task=="classification":
        pred=np.argmax(logits,axis=1); metrics={"accuracy":round(float(accuracy_score(yte,pred)),4),"f1_macro":round(float(f1_score(yte,pred,average="macro",zero_division=0)),4),"classes":classes}
    else:
        pred=logits.reshape(-1); mse=float(mean_squared_error(yte,pred)); metrics={"mae":round(float(mean_absolute_error(yte,pred)),4),"rmse":round(float(np.sqrt(mse)),4),"r2":round(float(r2_score(yte,pred)),4)}
    experiment_id=str(uuid.uuid4()); folder=settings.ARTIFACTS_DIR/user_id; folder.mkdir(parents=True,exist_ok=True); model_path=folder/f"{experiment_id}.joblib"
    bundle={"kind":"torch_mlp","state_dict":{k:v.detach().cpu() for k,v in model.state_dict().items()},"input_dim":int(Xtr.shape[1]),"output_dim":output_dim,"task":task,"features":features,"preprocessor":prep,"classes":classes if task=="classification" else None}
    joblib.dump(bundle,model_path)
    params={"features":features,"test_size":req.test_size,"seed":req.random_seed,"epochs":epochs,"device":str(device),"training_loss":history}
    exp=Experiment(id=experiment_id,owner_id=user_id,workspace_id=workspace_id,dataset_id=ds.id,name=f"PyTorch MLP · {ds.name}",task_type=f"deep_learning_{task}",estimator="torch_mlp",target_column=target,metrics_json=json.dumps(metrics),parameters_json=json.dumps(params),model_path=str(model_path),status="registered")
    db.add(exp); db.commit()
    return {"experiment_id":experiment_id,"dataset_id":ds.id,"task_type":f"deep_learning_{task}","estimator":"torch_mlp","target_column":target,"features_used":features,"train_rows":len(Xtr),"test_rows":len(Xte),"metrics":metrics,"cross_validation":{"training_loss_first":history[0],"training_loss_last":history[-1],"epochs":epochs,"device":str(device)},"feature_importances":[],"model_status":"registered","model_download_url":f"/api/models/{experiment_id}/download"}
