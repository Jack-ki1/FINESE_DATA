import json, uuid
from pathlib import Path
from typing import Any
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, GradientBoostingClassifier, RandomForestRegressor, ExtraTreesRegressor, GradientBoostingRegressor, IsolationForest
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, mean_absolute_error, mean_squared_error, r2_score, silhouette_score
from sklearn.model_selection import train_test_split, cross_validate, StratifiedKFold, KFold, GridSearchCV
from sklearn.base import clone
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.cluster import KMeans, DBSCAN
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.svm import SVC, SVR
import joblib
from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.app.config import settings
from backend.app.models import Dataset, Experiment
from backend.app.services.datasets import DatasetService

CLASSIFIERS = {"logistic_regression": LogisticRegression(max_iter=1000), "random_forest": RandomForestClassifier(n_estimators=240, min_samples_leaf=2, n_jobs=2), "extra_trees": ExtraTreesClassifier(n_estimators=240, min_samples_leaf=2, n_jobs=2), "gradient_boosting": GradientBoostingClassifier(), "knn": KNeighborsClassifier(), "svm": SVC(probability=True)}
REGRESSORS = {"linear_regression": LinearRegression(), "ridge": Ridge(), "random_forest": RandomForestRegressor(n_estimators=240,min_samples_leaf=2,n_jobs=2), "extra_trees": ExtraTreesRegressor(n_estimators=240,min_samples_leaf=2,n_jobs=2), "gradient_boosting": GradientBoostingRegressor(), "knn": KNeighborsRegressor(), "svm": SVR()}

def _jsonable(obj):
    if isinstance(obj, dict): return {str(k):_jsonable(v) for k,v in obj.items()}
    if isinstance(obj, list): return [_jsonable(x) for x in obj]
    if isinstance(obj, (np.integer,)): return int(obj)
    if isinstance(obj, (np.floating,)): return float(obj)
    if isinstance(obj, np.ndarray): return obj.tolist()
    if isinstance(obj, float) and not np.isfinite(obj): return None
    return obj

class MLService:
    @staticmethod
    def available(task_type: str) -> list[str]:
        task=(task_type or "").replace("deep_learning_","")
        if task=="classification": return list(CLASSIFIERS.keys())
        if task=="regression": return list(REGRESSORS.keys())
        if task=="deep_learning_classification" or (task_type or "").startswith("deep_learning"): return ["torch_mlp"]
        return ["kmeans","isolation_forest"]

    @staticmethod
    def train(db: Session, user_id: str, workspace_id: str, req) -> dict[str,Any]:
        if req.task_type.startswith("deep_learning_"):
            from backend.app.services.deep_learning import train_torch_mlp
            deep_task = req.task_type.removeprefix("deep_learning_")
            return train_torch_mlp(db,user_id,workspace_id,req,deep_task)
        ds=db.query(Dataset).filter(Dataset.id==req.dataset_id,Dataset.owner_id==user_id,Dataset.is_deleted.is_(False)).first()
        if not ds: raise HTTPException(404,"Dataset not found in your workspace.")
        df=DatasetService.read_file(Path(ds.storage_path))
        task=req.task_type.lower()
        if task in ("classification","regression"):
            target=req.target_column
            if not target or target not in df.columns: raise HTTPException(422,"Select a valid target column.")
            df=df.dropna(subset=[target])
            features=req.features or [c for c in df.columns if c != target]
            features=[f for f in features if f in df.columns and f != target]
            if not features: raise HTTPException(422,"Select at least one feature column.")
            X=df[features]; y=df[target]
            if len(df)<20: raise HTTPException(422,"At least 20 complete target rows are recommended for a model run.")
            numeric=[c for c in features if pd.api.types.is_numeric_dtype(X[c])]
            categorical=[c for c in features if c not in numeric]
            transformers=[]
            if numeric: transformers.append(("numeric",Pipeline([("impute",SimpleImputer(strategy="median",add_indicator=True)),("scale",StandardScaler())]),numeric))
            if categorical: transformers.append(("categorical",Pipeline([("impute",SimpleImputer(strategy="most_frequent")),("encode",OneHotEncoder(handle_unknown="ignore"))]),categorical))
            pre=ColumnTransformer(transformers)
            model_key=req.estimator.lower().replace("-","_")
            models=CLASSIFIERS if task=="classification" else REGRESSORS
            if model_key not in models: raise HTTPException(422,f"Unsupported {task} model. Choose from: {', '.join(models)}")
            if task=="classification" and y.nunique()<2: raise HTTPException(422,"Classification requires at least two target classes.")
            stratify=None
            if task=="classification":
                counts=y.value_counts();
                if len(counts)>1 and counts.min()>=2: stratify=y
            Xtr,Xte,ytr,yte=train_test_split(X,y,test_size=req.test_size,random_state=req.random_seed,stratify=stratify)
            estimator=clone(models[model_key])
            if req.hyperparameters:
                allowed={k:(v[0] if isinstance(v,list) else v) for k,v in models[model_key].get_params().items()}
                overrides={}
                for key,value in req.hyperparameters.items():
                    clean=str(key).removeprefix("model__")
                    if clean in allowed and allowed[clean] is not None:
                        try: overrides[f"model__{clean}"]=type(allowed[clean])(value)
                        except (TypeError,ValueError): raise HTTPException(422,f"Invalid value for hyperparameter '{clean}'.")
                if overrides: estimator.set_params(**overrides)
            pipeline=Pipeline([("preprocess",pre),("model",estimator)])
            tuning_results={}
            try:
                if req.tune:
                    grids={"random_forest":{"model__n_estimators":[120,240],"model__max_depth":[None,12]},"extra_trees":{"model__n_estimators":[120,240],"model__max_depth":[None,12]},"logistic_regression":{"model__C":[0.1,1.0,10.0]},"ridge":{"model__alpha":[0.1,1.0,10.0]},"gradient_boosting":{"model__n_estimators":[80,140],"model__max_depth":[2,3]}}
                    if model_key not in grids: raise HTTPException(422,"Tuning is currently available for Random Forest, Extra Trees, Logistic Regression, Ridge and Gradient Boosting.")
                    folds=min(req.cv_folds,int(ytr.value_counts().min())) if task=="classification" else min(req.cv_folds,len(ytr))
                    if folds<2: raise HTTPException(422,"There are not enough samples per target class for tuning.")
                    splitter=StratifiedKFold(n_splits=folds,shuffle=True,random_state=req.random_seed) if task=="classification" else KFold(n_splits=folds,shuffle=True,random_state=req.random_seed)
                    search=GridSearchCV(pipeline,grids[model_key],cv=splitter,scoring="f1_macro" if task=="classification" else "neg_root_mean_squared_error",n_jobs=1,refit=True)
                    search.fit(Xtr,ytr); pipeline=search.best_estimator_; tuning_results={"best_params":search.best_params_,"best_cv_score":round(float(search.best_score_),4)}
                else:
                    pipeline.fit(Xtr,ytr)
                pred=pipeline.predict(Xte)
            except Exception as exc: raise HTTPException(422,f"Model training failed: {str(exc)[:300]}") from exc
            if task=="classification":
                labels=sorted(pd.Series(yte).astype(str).unique().tolist())
                metrics={"accuracy":round(float(accuracy_score(yte,pred)),4),"precision_macro":round(float(precision_score(yte,pred,average="macro",zero_division=0)),4),"recall_macro":round(float(recall_score(yte,pred,average="macro",zero_division=0)),4),"f1_macro":round(float(f1_score(yte,pred,average="macro",zero_division=0)),4),"confusion_matrix":confusion_matrix(yte,pred).tolist(),"class_labels":labels}
                baseline=DummyClassifier(strategy="most_frequent").fit(Xtr,ytr); metrics["baseline_accuracy"]=round(float(accuracy_score(yte,baseline.predict(Xte))),4)
            else:
                mse=float(mean_squared_error(yte,pred)); metrics={"mae":round(float(mean_absolute_error(yte,pred)),4),"rmse":round(float(np.sqrt(mse)),4),"r2":round(float(r2_score(yte,pred)),4)}
                baseline=DummyRegressor(strategy="mean").fit(Xtr,ytr); metrics["baseline_rmse"]=round(float(np.sqrt(mean_squared_error(yte,baseline.predict(Xte)))),4)
            cv_results={}
            folds=min(req.cv_folds, int(y.value_counts().min()) if task=="classification" else len(ytr)) if task=="classification" else min(req.cv_folds,len(ytr))
            if folds>=2:
                cv=StratifiedKFold(n_splits=folds,shuffle=True,random_state=req.random_seed) if task=="classification" else KFold(n_splits=folds,shuffle=True,random_state=req.random_seed)
                scoring={"accuracy":"accuracy","f1_macro":"f1_macro"} if task=="classification" else {"r2":"r2","neg_rmse":"neg_root_mean_squared_error"}
                try:
                    scores=cross_validate(pipeline,X,y,cv=cv,scoring=scoring,n_jobs=1,error_score="raise")
                    cv_results={k:{"mean":round(float(np.mean(v)),4),"std":round(float(np.std(v)),4)} for k,v in scores.items() if k.startswith("test_")}
                except Exception as exc: cv_results={"warning":str(exc)[:180]}
            try:
                fitted=pipeline.named_steps["model"]
                if hasattr(fitted,"feature_importances_"):
                    names=pipeline.named_steps["preprocess"].get_feature_names_out(); vals=fitted.feature_importances_
                    importances=sorted([{"feature":str(n).split("__")[-1],"importance":round(float(v),5)} for n,v in zip(names,vals)],key=lambda x:x["importance"],reverse=True)[:25]
                elif hasattr(fitted,"coef_"):
                    names=pipeline.named_steps["preprocess"].get_feature_names_out(); vals=np.asarray(fitted.coef_); vals=np.mean(np.abs(vals),axis=0) if vals.ndim>1 else np.abs(vals)
                    importances=sorted([{"feature":str(n).split("__")[-1],"importance":round(float(v),5)} for n,v in zip(names,vals)],key=lambda x:x["importance"],reverse=True)[:25]
                else: importances=[]
            except Exception: importances=[]
            diagnostics={"feature_importances":importances,"cross_validation":_jsonable(cv_results),"tuning":_jsonable(tuning_results)}
            try:
                from backend.app.services import modeling
                ptest = pipeline.predict(Xte)
                if task=="classification": diagnostics.update(modeling.classify_detail(pipeline,Xte,yte))
                else: diagnostics.update(modeling._regression_detail(ptest,yte.to_numpy(),Xte))
                diagnostics["dataset"]={"rows":int(len(df)),"features":len(features),"train_rows":int(len(Xtr)),"test_rows":int(len(Xte)),"numeric_features":len(numeric),"categorical_features":len(categorical)}
                diagnostics["baseline"]={k:v for k,v in metrics.items() if str(k).startswith("baseline_")}
                diagnostics["estimator_params"]={k:_jsonable(v) for k,v in pipeline.named_steps["model"].get_params(deep=False).items()}
                diagnostics["learning_curve"]=modeling.learning(pipeline,X,y,req.cv_folds,task,req.random_seed)
            except Exception as exc: diagnostics["warning"]=f"diagnostics unavailable: {type(exc).__name__}: {str(exc)[:180]}"
            if tuning_results and "best_params" in tuning_results:
                best_tuned={k:v for k,v in tuning_results["best_params"].items()}
                diagnostics["tuning"]={"best_params":best_tuned,"best_cv_score":tuning_results.get("best_cv_score")}
            experiment_id=str(uuid.uuid4()); folder=settings.ARTIFACTS_DIR/user_id; folder.mkdir(parents=True,exist_ok=True); model_path=folder/f"{experiment_id}.joblib"
            joblib.dump(pipeline,model_path)
            exp=Experiment(id=experiment_id,owner_id=user_id,workspace_id=workspace_id,dataset_id=ds.id,name=f"{model_key} · {ds.name}",task_type=task,estimator=model_key,target_column=target,metrics_json=json.dumps(_jsonable(metrics)),parameters_json=json.dumps({"features":features,"test_size":req.test_size,"random_seed":req.random_seed,"cv_folds":folds,"cv":_jsonable(cv_results),"tuning":_jsonable(tuning_results),"diagnostics":_jsonable(diagnostics),"feature_names":features}),model_path=str(model_path),status="registered")
            db.add(exp); db.commit()
            return {"experiment_id":experiment_id,"dataset_id":ds.id,"task_type":task,"estimator":model_key,"target_column":target,"features_used":features,"train_rows":len(Xtr),"test_rows":len(Xte),"metrics":_jsonable(metrics),"cross_validation":_jsonable(cv_results),"feature_importances":importances,"model_status":"registered","model_download_url":f"/api/models/{experiment_id}/download","details":_jsonable(diagnostics)}
        if task in ("clustering","anomaly"):
            features=req.features or list(df.select_dtypes(include="number").columns)
            if not features or any(c not in df.columns for c in features): raise HTTPException(422,"Choose one or more valid feature columns.")
            X=df[features].select_dtypes(include="number").copy()
            features=list(X.columns)
            if X.shape[1]==0: raise HTTPException(422,"Unsupervised starter supports numeric columns; encode categories first in Cleaning.")
            imputer=SimpleImputer(strategy="median"); scaler=StandardScaler(); X=scaler.fit_transform(imputer.fit_transform(X))
            if task=="clustering":
                model=KMeans(n_clusters=3,random_state=req.random_seed,n_init="auto"); labels=model.fit_predict(X); score=silhouette_score(X,labels) if len(set(labels))>1 and len(X)>len(set(labels)) else None
                metrics={"clusters":int(len(set(labels))),"silhouette_score":round(float(score),4) if score is not None else None,"inertia":round(float(model.inertia_),4)}
            else:
                model=IsolationForest(random_state=req.random_seed,contamination="auto"); labels=model.fit_predict(X); metrics={"anomalies":int((labels==-1).sum()),"anomaly_rate":round(float((labels==-1).mean()),4)}
            exp_id=str(uuid.uuid4()); path=settings.ARTIFACTS_DIR/user_id/f"{exp_id}.joblib"; path.parent.mkdir(parents=True,exist_ok=True); joblib.dump({"kind":"unsupervised","model":model,"features":features,"scaler":scaler,"imputer":imputer,"task":task},path)
            exp=Experiment(id=exp_id,owner_id=user_id,workspace_id=workspace_id,dataset_id=ds.id,name=f"{task} · {ds.name}",task_type=task,estimator="kmeans" if task=="clustering" else "isolation_forest",target_column="",metrics_json=json.dumps(metrics),parameters_json=json.dumps({"features":features}),model_path=str(path))
            db.add(exp); db.commit()
            return {"experiment_id":exp_id,"dataset_id":ds.id,"task_type":task,"estimator":exp.estimator,"features_used":features,"train_rows":len(df),"test_rows":0,"metrics":metrics,"cross_validation":{},"feature_importances":[],"model_status":"registered"}
        raise HTTPException(422,"Task type must be classification, regression, clustering or anomaly.")
