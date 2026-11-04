from pathlib import Path
import json, secrets, urllib.parse, html, time
from contextlib import asynccontextmanager
import pandas as pd
from fastapi import FastAPI, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from backend.app.config import settings
from backend.app.database import init_db, get_db, SessionLocal
from backend.app.models import User, Workspace, Dataset, DatasetVersion, Experiment, Conversation, Job
from backend.app.schemas import RegisterIn, LoginIn, AuthOut, UserOut, CleanIn, TrainIn, ChatIn, PredictIn, AggregateIn, MLJobIn, RecipeIn, PlotIn, PivotIn, SweepIn
from backend.app.security import hash_password, verify_password, issue_token, get_current_user, safe_filename
from backend.app.services.datasets import DatasetService, CleaningEngine
from backend.app.services.ml import MLService
from backend.app.services.ai import AIService
from backend.app.services.insights import InsightsService, outliers as insights_outliers, association as insights_association
from backend.app.services.plots import PlotService
from backend.app.services import ai_catalog, modeling
from backend.app.services.project_settings import SettingsService

@asynccontextmanager
async def lifespan(application: FastAPI):
    init_db()
    yield

app=FastAPI(title="FINESE DATA API",version="2.0.0",description="Authenticated data science and machine-learning workspace API",lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=settings.FRONTEND_ORIGINS,allow_credentials=True,allow_methods=["GET","POST","DELETE","OPTIONS"],allow_headers=["Authorization","Content-Type"])
@app.get("/api/health")
def health(): return {"status":"ok","version":"2.0.0","remote_database_connectors":settings.ALLOW_REMOTE_DATABASE_CONNECTORS}

def user_workspace(db:Session,user:User)->Workspace:
    ws=db.query(Workspace).filter(Workspace.owner_id==user.id).first()
    if not ws:
        ws=Workspace(owner_id=user.id,name="My workspace"); db.add(ws); db.commit(); db.refresh(ws)
    return ws

def own_dataset(db:Session,user:User,dataset_id:str)->Dataset:
    ds=db.query(Dataset).filter(Dataset.id==dataset_id,Dataset.owner_id==user.id,Dataset.is_deleted.is_(False)).first()
    if not ds: raise HTTPException(404,"Dataset not found in your workspace.")
    return ds

def dataset_summary(ds): return {"id":ds.id,"name":ds.name,"format":ds.format,"rows":ds.row_count,"columns":ds.column_count,"column_names":json.loads(ds.columns_json),"size_bytes":ds.byte_size,"created_at":ds.created_at.isoformat()}

def validate_remote_query(connection_url:str, query:str):
    parsed=urllib.parse.urlparse(connection_url)
    if parsed.scheme not in ("postgresql","postgresql+psycopg","mysql","mysql+pymysql") or not parsed.hostname:
        raise HTTPException(422,"Only PostgreSQL and MySQL connection URLs are accepted.")
    allowed={h.lower() for h in settings.REMOTE_DB_ALLOWED_HOSTS}
    if not allowed or parsed.hostname.lower() not in allowed:
        raise HTTPException(403,"This database host is not on the server administrator's REMOTE_DB_ALLOWED_HOSTS allowlist.")
    normalized=query.strip()
    lower=normalized.lower()
    forbidden=(";","--","/*","*/"," into ","pg_read_file","pg_ls_dir","pg_execute_server_program","dblink","lo_import","lo_export","load_file","outfile","dumpfile","sleep(","benchmark(","set_config(")
    if not lower.startswith("select ") or any(token in lower for token in forbidden):
        raise HTTPException(422,"Only a single, read-only SELECT query is accepted. Use a database account that has SELECT privileges only.")
    return parsed

@app.post("/api/auth/register",response_model=AuthOut)
def register(req:RegisterIn,db:Session=Depends(get_db)):
    email=req.email.lower().strip()
    if db.query(User).filter(User.email==email).first(): raise HTTPException(409,"An account with this email already exists.")
    user=User(email=email,full_name=req.full_name.strip(),password_hash=hash_password(req.password)); db.add(user); db.flush()
    db.add(Workspace(owner_id=user.id,name="My workspace")); db.commit(); db.refresh(user)
    return {"access_token":issue_token(user.id),"user":{"id":user.id,"email":user.email,"full_name":user.full_name}}
@app.post("/api/auth/login",response_model=AuthOut)
def login(req:LoginIn,db:Session=Depends(get_db)):
    user=db.query(User).filter(User.email==req.email.lower().strip()).first()
    if not user or not verify_password(req.password,user.password_hash): raise HTTPException(401,"Email or password is incorrect.")
    return {"access_token":issue_token(user.id),"user":{"id":user.id,"email":user.email,"full_name":user.full_name}}
@app.get("/api/auth/me")
def me(user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    ws=user_workspace(db,user); return {"id":user.id,"email":user.email,"full_name":user.full_name,"workspace_id":ws.id,"workspace_name":ws.name}

@app.get("/api/dashboard")
def dashboard(db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ws=user_workspace(db,user); datasets=db.query(Dataset).filter(Dataset.owner_id==user.id,Dataset.is_deleted.is_(False)).order_by(Dataset.created_at.desc()).all()
    exps=db.query(Experiment).filter(Experiment.owner_id==user.id).order_by(Experiment.created_at.desc()).limit(10).all()
    activities=[]
    for ds in datasets[:6]: activities.append({"type":"dataset","label":f"Imported {ds.name}","date":ds.created_at.isoformat()})
    for ex in exps[:6]: activities.append({"type":"model","label":f"Registered {ex.estimator} experiment","date":ex.created_at.isoformat()})
    activities.sort(key=lambda x:x["date"],reverse=True)
    return {"workspace":{ "id":ws.id,"name":ws.name},"stats":{"datasets":len(datasets),"rows":sum(x.row_count for x in datasets),"columns":sum(x.column_count for x in datasets),"experiments":len(exps)},"datasets":[dataset_summary(x) for x in datasets[:8]],"experiments":[{"id":x.id,"name":x.name,"task_type":x.task_type,"estimator":x.estimator,"metrics":json.loads(x.metrics_json),"created_at":x.created_at.isoformat()} for x in exps],"activity":activities[:10]}

@app.get("/api/datasets")
def list_datasets(db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    items=db.query(Dataset).filter(Dataset.owner_id==user.id,Dataset.is_deleted.is_(False)).order_by(Dataset.created_at.desc()).all()
    return [dataset_summary(x) for x in items]

@app.post("/api/datasets/upload")
async def upload_dataset(file:UploadFile=File(...),db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    filename=safe_filename(file.filename or "dataset.csv"); ext=Path(filename).suffix.lower()
    if ext not in {".csv",".tsv",".xlsx",".xls",".json",".jsonl",".ndjson",".parquet",".db",".sqlite",".sqlite3"}: raise HTTPException(415,"Supported formats: CSV, TSV, Excel, JSON, JSONL, Parquet and SQLite.")
    content=await file.read(settings.MAX_UPLOAD_BYTES+1)
    if not content: raise HTTPException(400,"Uploaded file is empty.")
    if len(content)>settings.MAX_UPLOAD_BYTES: raise HTTPException(413,f"Upload exceeds {settings.MAX_UPLOAD_BYTES//1024//1024} MB.")
    ws=user_workspace(db,user); import uuid, hashlib
    dsid=str(uuid.uuid4()); folder=settings.STORAGE_DIR/user.id/dsid; folder.mkdir(parents=True,exist_ok=True); raw=folder/f"source{ext}"; raw.write_bytes(content)
    try: df=DatasetService.read_file(raw)
    except Exception:
        raw.unlink(missing_ok=True); raise
    ds=Dataset(id=dsid,owner_id=user.id,workspace_id=ws.id,name=filename,format=ext.lstrip("."),storage_path=str(raw),byte_size=len(content),row_count=len(df),column_count=len(df.columns),columns_json=json.dumps([str(c) for c in df.columns]),checksum=hashlib.sha256(content).hexdigest())
    db.add(ds); db.add(DatasetVersion(dataset_id=dsid,version=1,storage_path=str(raw),action="upload",details_json="{}")); db.commit()
    return {**dataset_summary(ds),"profile":DatasetService.profile(df,ds)}

@app.post("/api/datasets/sample")
def sample_dataset(kind:str=Query("sales"),db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    if kind not in ("sales","customers","churn"): raise HTTPException(422,"Unknown sample dataset.")
    if kind=="sales":
        df=pd.DataFrame([{"date":f"2026-{(i%12)+1:02d}-{(i%27)+1:02d}","region":["Nairobi","Mombasa","Kisumu","Nakuru"][i%4],"product":["Analytics","IoT","Cloud","Support"][i%4],"units":10+(i*7)%95,"revenue":round((10+(i*7)%95)*(850+(i%5)*120),2),"channel":["Direct","Partner","Online"][i%3],"satisfaction":round(2.5+(i%25)/10,1)} for i in range(160)])
    elif kind=="customers":
        df=pd.DataFrame([{"customer_id":1000+i,"age":22+(i*11)%54,"segment":["SME","Enterprise","Retail","Public Sector"][i%4],"spend":round(500+(i*373)%12000,2),"visits":1+(i*3)%28,"region":["Nairobi","Coast","Rift Valley","Western"][i%4],"renewed":["Yes","No"][i%5==0]} for i in range(220)])
    else:
        df=pd.DataFrame([{"customer_id":2000+i,"tenure_months":1+(i*7)%72,"monthly_charges":round(20+(i*13)%180,2),"contract":["Month-to-month","One year","Two year"][i%3],"support_tickets":(i*5)%8,"usage_gb":round(1+(i*17)%90,1),"churn":["Yes","No"][i%4==0]} for i in range(240)])
    ws=user_workspace(db,user); import uuid
    dsid=str(uuid.uuid4()); path=DatasetService.persist_frame(df,user.id,dsid,1)
    ds=Dataset(id=dsid,owner_id=user.id,workspace_id=ws.id,name=f"Sample {kind.title()} dataset.csv",format="csv",storage_path=str(path),byte_size=path.stat().st_size,row_count=len(df),column_count=len(df.columns),columns_json=json.dumps(list(df.columns)),checksum=DatasetService.checksum(path))
    db.add(ds); db.add(DatasetVersion(dataset_id=dsid,version=1,storage_path=str(path),action="sample",details_json=json.dumps({"kind":kind}))); db.commit()
    return {**dataset_summary(ds),"profile":DatasetService.profile(df,ds)}

@app.get("/api/datasets/{dataset_id}")
def get_dataset(dataset_id:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ds=own_dataset(db,user,dataset_id); df=DatasetService.read_file(Path(ds.storage_path)); return {**dataset_summary(ds),"profile":DatasetService.profile(df,ds),"preview":DatasetService.preview(df)}
@app.get("/api/datasets/{dataset_id}/profile")
def profile_dataset(dataset_id:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ds=own_dataset(db,user,dataset_id); return DatasetService.profile(DatasetService.read_file(Path(ds.storage_path)),ds)
@app.get("/api/datasets/{dataset_id}/preview")
def preview_dataset(dataset_id:str,limit:int=Query(10,ge=1,le=100),db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ds=own_dataset(db,user,dataset_id); return DatasetService.preview(DatasetService.read_file(Path(ds.storage_path)),limit)
@app.post("/api/datasets/{dataset_id}/clean")
def clean_dataset(dataset_id:str,req:CleanIn,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ds=own_dataset(db,user,dataset_id); df=DatasetService.read_file(Path(ds.storage_path))
    if req.dry_run: return CleaningEngine.preview(df,req.operation,req.column,req.columns,req.options)
    if req.options or CleaningEngine.columns_mode(req.operation) in ("multi","multi_required","subset","single","none"):
        out,affected,details=CleaningEngine.apply(df,req.operation,req.column,req.columns,req.options)
        action=req.operation
    else:
        out,affected,action=DatasetService.clean(df,req.operation,req.column,req.strategy,req.value,req.columns); details={}
    versions=db.query(DatasetVersion).filter(DatasetVersion.dataset_id==ds.id).count()+1
    path=DatasetService.persist_frame(out,user.id,ds.id,versions); previous=ds.storage_path; ds.storage_path=str(path); ds.row_count=len(out); ds.column_count=len(out.columns); ds.columns_json=json.dumps(list(out.columns)); ds.byte_size=path.stat().st_size; ds.checksum=DatasetService.checksum(path)
    db.add(DatasetVersion(dataset_id=ds.id,version=versions,storage_path=str(path),action=action,details_json=json.dumps({"affected":affected,"column":req.column,"columns":req.columns,"options":req.options or {},"details":details,"previous_path":previous},default=str))); db.commit()
    return {"dataset":dataset_summary(ds),"operation":action,"affected":affected,"details":details,"version":versions,"profile":DatasetService.profile(out,ds)}
@app.post("/api/datasets/{dataset_id}/clean/preview")
def preview_clean(dataset_id:str,req:CleanIn,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ds=own_dataset(db,user,dataset_id); df=DatasetService.read_file(Path(ds.storage_path))
    return CleaningEngine.preview(df,req.operation,req.column,req.columns,req.options)
@app.post("/api/datasets/{dataset_id}/clean/recipe")
def apply_recipe(dataset_id:str,req:RecipeIn,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ds=own_dataset(db,user,dataset_id); df=DatasetService.read_file(Path(ds.storage_path))
    out,log=CleaningEngine.recipe(df,req.steps)
    versions=db.query(DatasetVersion).filter(DatasetVersion.dataset_id==ds.id).count()+1
    path=DatasetService.persist_frame(out,user.id,ds.id,versions); ds.storage_path=str(path); ds.row_count=len(out); ds.column_count=len(out.columns); ds.columns_json=json.dumps(list(out.columns)); ds.byte_size=path.stat().st_size; ds.checksum=DatasetService.checksum(path)
    db.add(DatasetVersion(dataset_id=ds.id,version=versions,storage_path=str(path),action="recipe",details_json=json.dumps({"steps":req.steps,"log":log},default=str))); db.commit()
    return {"dataset":dataset_summary(ds),"log":log,"affected":sum(step["affected"] for step in log),"version":versions,"profile":DatasetService.profile(out,ds)}
@app.get("/api/cleaning/catalog")
def cleaning_catalog(user:User=Depends(get_current_user)):
    return {"operations":CleaningEngine.catalog()}
@app.get("/api/datasets/{dataset_id}/analysis")
def dataset_analysis(dataset_id:str,bins:int=Query(16,ge=4,le=60),columns:str|None=Query(None),outlier_method:str=Query("iqr"),outlier_threshold:float=Query(1.5,ge=0.5,le=6),correlation_method:str=Query("pearson"),db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ds=own_dataset(db,user,dataset_id); df=DatasetService.read_file(Path(ds.storage_path))
    selected=[c.strip() for c in columns.split(",") if c.strip()] if columns else None
    insights=InsightsService.overview(df,selected,bins)
    insights["outliers"]=insights_outliers(df,selected,outlier_method,outlier_threshold)
    insights["association"]=insights_association(df,selected,correlation_method)
    return insights
@app.get("/api/plots/catalog")
def plot_catalog(user:User=Depends(get_current_user)):
    return {"types":PlotService.catalog(),"aggregations":list(__import__("backend.app.services.plots",fromlist=["AGGREGATIONS"]).AGGREGATIONS)}
@app.post("/api/datasets/{dataset_id}/plot")
def build_plot(dataset_id:str,req:PlotIn,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ds=own_dataset(db,user,dataset_id); df=DatasetService.read_file(Path(ds.storage_path)); return PlotService.build(df,req.spec)
@app.post("/api/datasets/{dataset_id}/pivot")
def build_pivot(dataset_id:str,req:PivotIn,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ds=own_dataset(db,user,dataset_id); df=DatasetService.read_file(Path(ds.storage_path)); return PlotService.pivot(df,req.spec)
@app.get("/api/settings")
def get_settings(db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ws=user_workspace(db,user); return {"settings":SettingsService.get(ws),"ai_catalog":ai_catalog.catalog(),"workspace":{"id":ws.id,"name":ws.name}}
@app.patch("/api/settings")
def patch_settings(payload:dict,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ws=user_workspace(db,user); merged=SettingsService.update(ws,payload or {}); db.commit()
    return {"settings":merged}
@app.post("/api/settings/reset")
def reset_settings(db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ws=user_workspace(db,user); merged=SettingsService.reset(ws); db.commit(); return {"settings":merged}
@app.get("/api/ai/catalog")
def ai_models(user:User=Depends(get_current_user)):
    return ai_catalog.catalog()
@app.get("/api/datasets/{dataset_id}/versions")
def dataset_versions(dataset_id:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ds=own_dataset(db,user,dataset_id)
    versions=db.query(DatasetVersion).filter(DatasetVersion.dataset_id==ds.id).order_by(DatasetVersion.version.desc()).limit(100).all()
    return [{"version":v.version,"action":v.action,"details":json.loads(v.details_json or "{}"),"created_at":v.created_at.isoformat()} for v in versions]

@app.post("/api/datasets/{dataset_id}/aggregate")
def aggregate_dataset(dataset_id:str,req:AggregateIn,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ds=own_dataset(db,user,dataset_id); df=DatasetService.read_file(Path(ds.storage_path))
    if req.group_by not in df.columns: raise HTTPException(422,"Choose a valid grouping column.")
    grouped=df.groupby(req.group_by,dropna=False)
    if req.aggregation=="count": result=grouped.size().rename("value").reset_index()
    else:
        if not req.metric or req.metric not in df.columns: raise HTTPException(422,"Choose a valid numeric metric column.")
        if not pd.api.types.is_numeric_dtype(df[req.metric]): raise HTTPException(422,"Sum, mean and median require a numeric metric column.")
        if req.aggregation not in ("sum","mean","median"): raise HTTPException(422,"Aggregation must be count, sum, mean or median.")
        result=getattr(grouped[req.metric],req.aggregation)().rename("value").reset_index()
    result=result.sort_values("value",ascending=False).head(req.top_n)
    return {"group_by":req.group_by,"metric":req.metric,"aggregation":req.aggregation,"rows":[{"label":str(r[req.group_by]) if pd.notna(r[req.group_by]) else "(Missing)","value":float(r["value"])} for _,r in result.iterrows()]}

@app.post("/api/datasets/{dataset_id}/undo")
def undo_clean(dataset_id:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ds=own_dataset(db,user,dataset_id); versions=db.query(DatasetVersion).filter(DatasetVersion.dataset_id==ds.id).order_by(DatasetVersion.version.desc()).all()
    if len(versions)<2: raise HTTPException(409,"There is no earlier dataset version to restore.")
    previous=versions[-2]; ds.storage_path=previous.storage_path; df=DatasetService.read_file(Path(ds.storage_path)); ds.row_count=len(df); ds.column_count=len(df.columns); ds.columns_json=json.dumps(list(df.columns)); ds.byte_size=Path(ds.storage_path).stat().st_size; ds.checksum=DatasetService.checksum(Path(ds.storage_path)); db.commit()
    return {"dataset":dataset_summary(ds),"profile":DatasetService.profile(df,ds),"restored_version":previous.version}
@app.delete("/api/datasets/{dataset_id}")
def delete_dataset(dataset_id:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ds=own_dataset(db,user,dataset_id); ds.is_deleted=True; db.commit(); return {"deleted":True,"dataset_id":dataset_id}

@app.get("/api/datasets/{dataset_id}/export")
def export_dataset(dataset_id:str,format:str=Query("csv"),db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ds=own_dataset(db,user,dataset_id); df=DatasetService.read_file(Path(ds.storage_path)); fmt=format.lower()
    if fmt=="csv":
        safe=df.copy()
        for col in safe.columns:
            if pd.api.types.is_object_dtype(safe[col]) or pd.api.types.is_string_dtype(safe[col]):
                safe[col]=safe[col].map(lambda v: ("'"+v) if isinstance(v,str) and v.lstrip().startswith(("=","+","-","@","\t")) else v)
        content=safe.to_csv(index=False).encode(); media="text/csv"
    elif fmt=="json": content=df.to_json(orient="records",indent=2,date_format="iso").encode(); media="application/json"
    elif fmt in ("xlsx","excel"):
        import io; bio=io.BytesIO(); df.to_excel(bio,index=False); content=bio.getvalue(); media="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; fmt="xlsx"
    elif fmt=="parquet":
        import io; bio=io.BytesIO()
        try: df.to_parquet(bio,index=False)
        except Exception as exc: raise HTTPException(501,"Parquet export requires pyarrow or fastparquet.") from exc
        content=bio.getvalue(); media="application/vnd.apache.parquet"
    else: raise HTTPException(422,"Supported data exports: csv, json, xlsx, parquet.")
    name=safe_filename(Path(ds.name).stem)+f".{fmt}"
    return Response(content,media_type=media,headers={"Content-Disposition":f'attachment; filename="{name}"'})

@app.get("/api/datasets/{dataset_id}/report")
def dataset_report(dataset_id:str,format:str=Query("html"),db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ds=own_dataset(db,user,dataset_id); df=DatasetService.read_file(Path(ds.storage_path)); p=DatasetService.profile(df,ds); fmt=format.lower()
    if fmt=="json": return p
    if fmt=="html":
        rows="".join(f"<tr><td>{html.escape(str(c['name']))}</td><td>{html.escape(str(c['kind']))}</td><td>{c['missing']}</td><td>{c['unique']}</td></tr>" for c in p['column_profiles'])
        html_doc=f'''<!doctype html><html><head><meta charset="utf-8"><title>FINESE DATA report · {ds.name}</title><style>body{{font:15px Arial,sans-serif;color:#14213b;margin:48px;max-width:1000px}}h1{{color:#f97316}}.kpis{{display:flex;gap:16px}}.kpi{{padding:18px;background:#f3f6fb;border-radius:12px;flex:1}}table{{width:100%;border-collapse:collapse}}td,th{{padding:12px;border-bottom:1px solid #ddd;text-align:left}}</style></head><body><h1>FINESE DATA</h1><h2>Dataset quality report</h2><p>{html.escape(ds.name)}</p><div class="kpis"><div class="kpi"><b>{p['rows']:,}</b><br>Rows</div><div class="kpi"><b>{p['columns']:,}</b><br>Columns</div><div class="kpi"><b>{p['quality_score']}/100</b><br>Structural health indicator</div><div class="kpi"><b>{p['missing_pct']}%</b><br>Missing cells</div></div><h2>Column profile</h2><table><tr><th>Column</th><th>Inferred type</th><th>Missing</th><th>Unique</th></tr>{rows}</table><h2>Recommendations</h2><ul>{''.join(f"<li>{html.escape(x['title'])}: {html.escape(x['detail'])}</li>" for x in p['recommendations'])}</ul><p>Generated by FINESE DATA. Health indicators are heuristic and do not establish the accuracy of source data.</p></body></html>'''
        return HTMLResponse(html_doc,headers={"Content-Disposition":f'attachment; filename="{safe_filename(Path(ds.name).stem)}_report.html"'})
    if fmt=="pdf":
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet
        import io
        bio=io.BytesIO(); styles=getSampleStyleSheet(); story=[Paragraph("FINESE DATA — Dataset Quality Report",styles['Title']),Paragraph(ds.name,styles['Heading2']),Paragraph(f"{p['rows']:,} rows · {p['columns']:,} columns · Structural health: {p['quality_score']}/100",styles['BodyText']),Spacer(1,16)]
        data=[["Column","Type","Missing","Unique"]]+[[c['name'],c['kind'],str(c['missing']),str(c['unique'])] for c in p['column_profiles']]
        table=Table(data,repeatRows=1); table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#101D35")),("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),.4,colors.HexColor("#DCE3EF")),("PADDING",(0,0),(-1,-1),7)])); story += [table,Spacer(1,16),Paragraph("Recommendations",styles['Heading2'])]
        for x in p['recommendations']: story.append(Paragraph(f"• {x['title']}: {x['detail']}",styles['BodyText']))
        SimpleDocTemplate(bio,pagesize=A4).build(story); return Response(bio.getvalue(),media_type="application/pdf",headers={"Content-Disposition":f'attachment; filename="{safe_filename(Path(ds.name).stem)}_report.pdf"'})
    if fmt=="pptx":
        from pptx import Presentation
        from pptx.util import Inches, Pt
        import io
        prs=Presentation(); slide=prs.slides.add_slide(prs.slide_layouts[0]); slide.shapes.title.text="FINESE DATA\nDataset quality report"; slide.placeholders[1].text=f"{ds.name}\n{p['rows']:,} rows · {p['columns']:,} columns · Health indicator {p['quality_score']}/100"
        slide=prs.slides.add_slide(prs.slide_layouts[5]); slide.shapes.title.text="Dataset quality overview"; box=slide.shapes.add_textbox(Inches(1),Inches(1.6),Inches(8),Inches(3)); tf=box.text_frame; tf.text=f"Missing cells: {p['missing_count']:,} ({p['missing_pct']}%)\nExact duplicate rows: {p['duplicate_count']:,}\nMemory footprint: {p['memory_mb']} MB"
        for rec in p['recommendations']:
            para=tf.add_paragraph(); para.text=f"{rec['title']}: {rec['detail']}"; para.level=0
        bio=io.BytesIO(); prs.save(bio); return Response(bio.getvalue(),media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",headers={"Content-Disposition":f'attachment; filename="{safe_filename(Path(ds.name).stem)}_report.pptx"'})
    raise HTTPException(422,"Report formats: html, json, pdf, pptx.")

@app.post("/api/chat")
async def chat(req:ChatIn,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    return await AIService.respond(db,user.id,req)
@app.get("/api/conversations")
def conversations(db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    items=db.query(Conversation).filter(Conversation.owner_id==user.id).order_by(Conversation.updated_at.desc()).limit(50).all()
    return [{"id":x.id,"title":x.title,"dataset_id":x.dataset_id,"updated_at":x.updated_at.isoformat()} for x in items]

@app.post("/api/ml/sweep")
def sweep_models(req:SweepIn,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    """Train several estimators in one call and rank them on a composite score."""
    ws=user_workspace(db,user)
    candidates=req.estimators or [req.estimator]
    available=MLService.available(req.task_type)
    candidates=[c for c in candidates if c in available][:max(1,min(len(candidates),8))]
    if not candidates: raise HTTPException(422,"Choose at least one estimator that supports this task type.")
    runs=[]
    for name in candidates:
        payload=req.model_copy(update={"estimator":name,"tune":False})
        started=time.time()
        try:
            result=MLService.train(db,user.id,ws.id,payload)
            result["duration_seconds"]=round(time.time()-started,2)
            runs.append({"estimator":name,"ok":True,**result})
        except HTTPException as exc:
            runs.append({"estimator":name,"ok":False,"error":str(exc.detail)})
        except Exception as exc:
            runs.append({"estimator":name,"ok":False,"error":str(exc)[:200]})
    summary=modeling.summarize([{"id":r.get("experiment_id"),"name":r.get("estimator"),"task_type":r.get("task_type"),"estimator":r.get("estimator"),"status":"registered","metrics":r.get("metrics"),"created_at":None} for r in runs if r.get("ok")])
    return {"runs":runs,"leaderboard":summary["leaderboard"],"ranked":summary["rows"],"best":summary["rows"][0] if summary["rows"] else None}
@app.get("/api/experiments/summary")
def experiment_summary(db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    items=db.query(Experiment).filter(Experiment.owner_id==user.id).order_by(Experiment.created_at.desc()).limit(200).all()
    payload=[{"id":x.id,"name":x.name,"dataset_id":x.dataset_id,"task_type":x.task_type,"estimator":x.estimator,"status":x.status,"metrics":json.loads(x.metrics_json or "{}"),"created_at":x.created_at.isoformat()} for x in items]
    summary=modeling.summarize(payload)
    counts:dict[str,int]={}
    for item in payload: counts[item["task_type"]]=counts.get(item["task_type"],0)+1
    summary["task_counts"]=counts
    summary["experiments"]=payload
    return summary
@app.get("/api/experiments/{experiment_id}")
def experiment_detail(experiment_id:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    exp=db.query(Experiment).filter(Experiment.id==experiment_id,Experiment.owner_id==user.id).first()
    if not exp: raise HTTPException(404,"Experiment not found.")
    params=json.loads(exp.parameters_json or "{}"); metrics=json.loads(exp.metrics_json or "{}")
    payload={"experiment_id":exp.id,"name":exp.name,"dataset_id":exp.dataset_id,"task_type":exp.task_type,"estimator":exp.estimator,"target_column":exp.target_column,"metrics":metrics,"parameters":params,"feature_importances":params.get("diagnostics",{}).get("feature_importances") or [],"cross_validation":params.get("cv") or {}, "details":params.get("diagnostics") or {}, "features_used":params.get("features") or [],"model_status":exp.status,"created_at":exp.created_at.isoformat()}
    payload["charts"]=modeling.diagnostics(payload)
    return payload
@app.get("/api/experiments/{experiment_id}/learning-curve")
def experiment_learning_curve(experiment_id:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    import joblib
    exp=db.query(Experiment).filter(Experiment.id==experiment_id,Experiment.owner_id==user.id).first()
    if not exp or not exp.model_path or not Path(exp.model_path).exists(): raise HTTPException(404,"Model artifact not found.")
    ds=db.query(Dataset).filter(Dataset.id==exp.dataset_id).first()
    if not ds: raise HTTPException(404,"Dataset not found.")
    df=DatasetService.read_file(Path(ds.storage_path)); params=json.loads(exp.parameters_json or "{}")
    if exp.task_type=="classification":
        df=df.dropna(subset=[exp.target_column]); features=[f for f in (params.get("features") or []) if f in df.columns]
        if not features: raise HTTPException(422,"Saved feature list is no longer valid for this dataset.")
        pipeline=joblib.load(exp.model_path)
        return modeling.learning(pipeline,df[features],df[exp.target_column],int(params.get("cv_folds") or 5),"classification",int(params.get("random_seed") or 42))
    if exp.task_type=="regression":
        df=df.dropna(subset=[exp.target_column]); features=[f for f in (params.get("features") or []) if f in df.columns]
        pipeline=joblib.load(exp.model_path)
        return modeling.learning(pipeline,df[features],df[exp.target_column],int(params.get("cv_folds") or 5),"regression",int(params.get("random_seed") or 42))
    raise HTTPException(422,"Learning curves are available for supervised models.")
@app.post("/api/experiments/compare")
def compare_experiments(payload:dict,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ids=[str(x) for x in (payload.get("ids") or [])][:8]
    if len(ids)<2: raise HTTPException(422,"Select at least two experiments to compare.")
    items=db.query(Experiment).filter(Experiment.id.in_(ids),Experiment.owner_id==user.id).all()
    if len(items)<2: raise HTTPException(404,"Some experiments could not be found in your workspace.")
    payload_rows=[{"name":x.name,"estimator":x.estimator,"task_type":x.task_type,"metrics":json.loads(x.metrics_json or "{}")} for x in items]
    return modeling.compare(payload_rows)
@app.delete("/api/experiments/{experiment_id}")
def delete_experiment(experiment_id:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    exp=db.query(Experiment).filter(Experiment.id==experiment_id,Experiment.owner_id==user.id).first()
    if not exp: raise HTTPException(404,"Experiment not found.")
    if exp.model_path and Path(exp.model_path).exists(): Path(exp.model_path).unlink(missing_ok=True)
    db.delete(exp); db.commit(); return {"deleted":True,"experiment_id":experiment_id}
@app.get("/api/datasets/{dataset_id}/modeling-eda")
def modeling_eda(dataset_id:str,target:str|None=Query(None),db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ds=own_dataset(db,user,dataset_id); df=DatasetService.read_file(Path(ds.storage_path))
    profile=DatasetService.profile(df,ds); eda=__import__("backend.app.services.insights",fromlist=["eda_summary"]).eda_summary(df)
    balance=[]
    if target and target in df.columns:
        vc=df[target].astype("string").fillna("(Missing)").value_counts().head(15)
        balance=[{"label":str(k)[:40],"value":int(v),"pct":round(100*int(v)/max(len(df),1),2)} for k,v in vc.items()]
    mapped = {p["name"]: p for p in profile["column_profiles"]}
    numeric = [{"column": c, "kind": mapped.get(c, {}).get("kind", "numeric"), "missing_pct": mapped.get(c, {}).get("missing_pct", 0), "unique": mapped.get(c, {}).get("unique", 0)} for c in mapped.keys()][:40]
    heat=__import__("backend.app.services.insights",fromlist=["missing_map"]).missing_map(df)
    return {"distribution":eda["frequency"],"balance":balance,"columns":numeric,"missing_columns":heat["per_column"][:20],"missing_rows_with_gaps_pct":100-heat["complete_pct"],"correlation":profile["correlation"]}
@app.get("/api/ml/estimators")
def estimators():
    return {"classification":["logistic_regression","random_forest","extra_trees","gradient_boosting","knn","svm"],"regression":["linear_regression","ridge","random_forest","extra_trees","gradient_boosting","knn","svm"],"unsupervised":["kmeans","isolation_forest"],"deep_learning":{"available":__import__("importlib.util").util.find_spec("torch") is not None,"models":["torch_mlp"],"note":"Install backend/requirements-ml.txt to enable the PyTorch tabular MLP."}}
@app.post("/api/ml/train")
def train_model(req:TrainIn,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ws=user_workspace(db,user); return MLService.train(db,user.id,ws.id,req)
from backend.app.services.jobs import run_ml_job

@app.post("/api/jobs")
def submit_ml_job(payload:MLJobIn,background_tasks:BackgroundTasks,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    ws=user_workspace(db,user)
    ds=own_dataset(db,user,payload.request.dataset_id)
    job=Job(owner_id=user.id,workspace_id=ws.id,job_type="ml_train",status="pending",progress=0,request_json=payload.request.model_dump_json())
    db.add(job); db.commit(); db.refresh(job)
    if settings.JOB_EXECUTION_MODE == "celery":
        from backend.app.tasks import run_ml_job_task
        run_ml_job_task.delay(job.id)
    else:
        background_tasks.add_task(run_ml_job,job.id)
    return {"job_id":job.id,"job_type":job.job_type,"status":job.status,"created_at":job.created_at.isoformat(),"execution_mode":settings.JOB_EXECUTION_MODE}

@app.get("/api/jobs/{job_id}")
def get_job(job_id:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    job=db.query(Job).filter(Job.id==job_id,Job.owner_id==user.id).first()
    if not job: raise HTTPException(404,"Job not found.")
    return {"job_id":job.id,"job_type":job.job_type,"status":job.status,"progress":job.progress,"result":json.loads(job.result_json or "{}"),"error":job.error,"created_at":job.created_at.isoformat(),"started_at":job.started_at.isoformat() if job.started_at else None,"finished_at":job.finished_at.isoformat() if job.finished_at else None}

@app.post("/api/jobs/{job_id}/cancel")
def cancel_job(job_id:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    job=db.query(Job).filter(Job.id==job_id,Job.owner_id==user.id).first()
    if not job: raise HTTPException(404,"Job not found.")
    if job.status in ("pending","running"):
        job.status="cancelled"; job.error="Cancellation requested. A running estimator may finish before the worker observes it."; db.commit()
    return {"job_id":job.id,"status":job.status}

@app.get("/api/experiments")
def experiments(db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    items=db.query(Experiment).filter(Experiment.owner_id==user.id).order_by(Experiment.created_at.desc()).limit(100).all()
    return [{"id":x.id,"name":x.name,"dataset_id":x.dataset_id,"task_type":x.task_type,"estimator":x.estimator,"target_column":x.target_column,"metrics":json.loads(x.metrics_json),"parameters":json.loads(x.parameters_json),"status":x.status,"created_at":x.created_at.isoformat()} for x in items]
@app.post("/api/models/{model_id}/deploy")
def deploy_model(model_id:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    exp=db.query(Experiment).filter(Experiment.id==model_id,Experiment.owner_id==user.id).first()
    if not exp or not exp.model_path or not Path(exp.model_path).exists(): raise HTTPException(404,"Registered model artifact not found.")
    exp.status="deployed"; db.commit()
    return {"model_id":exp.id,"status":"deployed","inference_endpoint":f"/api/models/{exp.id}/predict","method":"POST","request_example":{"rows":[{"feature_name":"value"}]},"note":"The authenticated prediction endpoint is now marked as deployed in this workspace. Production public serving still requires an API gateway, quotas and deployment controls."}

@app.get("/api/models/{model_id}/download")
def download_model(model_id:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    exp=db.query(Experiment).filter(Experiment.id==model_id,Experiment.owner_id==user.id).first()
    if not exp or not exp.model_path or not Path(exp.model_path).exists(): raise HTTPException(404,"Model artifact not found.")
    return StreamingResponse(open(exp.model_path,"rb"),media_type="application/octet-stream",headers={"Content-Disposition":f'attachment; filename="finese_model_{model_id[:8]}.joblib"'})
@app.post("/api/models/{model_id}/predict")
def predict(model_id:str,req:PredictIn,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    import joblib
    exp=db.query(Experiment).filter(Experiment.id==model_id,Experiment.owner_id==user.id).first()
    if not exp or not Path(exp.model_path).exists(): raise HTTPException(404,"Model not found.")
    if len(req.rows)>10000: raise HTTPException(413,"Prediction batch limited to 10,000 rows.")
    try:
        bundle=joblib.load(exp.model_path); frame=pd.DataFrame(req.rows)
        if isinstance(bundle,dict) and bundle.get("kind")=="unsupervised":
            x=frame[bundle["features"]].select_dtypes(include="number")
            x=bundle["scaler"].transform(bundle["imputer"].transform(x))
            pred=bundle["model"].predict(x)
        elif isinstance(bundle,dict) and bundle.get("kind")=="torch_mlp":
            import torch
            from torch import nn
            class TabularMLP(nn.Module):
                def __init__(self,n_in,n_out):
                    super().__init__(); self.net=nn.Sequential(nn.Linear(n_in,128),nn.ReLU(),nn.Dropout(.20),nn.Linear(128,64),nn.ReLU(),nn.Dropout(.10),nn.Linear(64,n_out))
                def forward(self,x): return self.net(x)
            model=TabularMLP(bundle["input_dim"],bundle["output_dim"]); model.load_state_dict(bundle["state_dict"]); model.eval()
            x=bundle["preprocessor"].transform(frame[bundle["features"]]).astype("float32")
            with torch.no_grad(): raw=model(torch.tensor(x,dtype=torch.float32)).cpu().numpy()
            if bundle["task"]=="classification":
                labels=raw.argmax(axis=1); pred=[bundle["classes"][int(i)] for i in labels]
            else: pred=raw.reshape(-1).tolist()
        else:
            pred=bundle.predict(frame)
        return {"model_id":model_id,"predictions":[str(x) if not isinstance(x,(int,float)) else x.item() if hasattr(x,"item") else x for x in pred]}
    except Exception as exc: raise HTTPException(422,f"Prediction failed: {str(exc)[:240]}") from exc

@app.post("/api/connectors/import")
def connector_import(payload:dict,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    if not settings.ALLOW_REMOTE_DATABASE_CONNECTORS: raise HTTPException(503,"Remote connectors are disabled by the server administrator.")
    url=str(payload.get("connection_url", "")); query=str(payload.get("query", "")); name=safe_filename(str(payload.get("name") or "database_import.csv"))
    parsed=validate_remote_query(url,query)
    engine=None
    try:
        engine=create_engine(url,pool_pre_ping=True,connect_args={"connect_timeout":5})
        with engine.connect() as con: df=pd.read_sql_query(query.rstrip(";") + " LIMIT 250000",con)
    except Exception as exc: raise HTTPException(422,"Database import failed. Verify the allowlisted host, driver, network access and a read-only database account.") from exc
    finally:
        if engine: engine.dispose()
    if df.empty: raise HTTPException(422,"The query returned no rows.")
    ws=user_workspace(db,user); import uuid
    dsid=str(uuid.uuid4()); path=DatasetService.persist_frame(df,user.id,dsid,1)
    ds=Dataset(id=dsid,owner_id=user.id,workspace_id=ws.id,name=name,format="database",storage_path=str(path),byte_size=path.stat().st_size,row_count=len(df),column_count=len(df.columns),columns_json=json.dumps(list(df.columns)),checksum=DatasetService.checksum(path))
    db.add(ds); db.add(DatasetVersion(dataset_id=dsid,version=1,storage_path=str(path),action="database_import",details_json=json.dumps({"source_type":parsed.scheme,"query_preview":query[:120]}))); db.commit()
    return {**dataset_summary(ds),"profile":DatasetService.profile(df,ds),"credentials_stored":False}

@app.get("/api/features")
def features():
    return {"formats":["csv","tsv","xlsx","xls","json","jsonl","parquet","sqlite"],"remote_database_connectors_enabled":settings.ALLOW_REMOTE_DATABASE_CONNECTORS,"ai":{"openai_configured":bool(settings.OPENAI_API_KEY),"anthropic_configured":bool(settings.ANTHROPIC_API_KEY)},"reports":["html","json","pdf","pptx"],"models":["classification","regression","clustering","anomaly"]}

@app.post("/api/connectors/preview")
def connector_preview(payload:dict, user:User=Depends(get_current_user)):
    if not settings.ALLOW_REMOTE_DATABASE_CONNECTORS: raise HTTPException(503,"Remote connectors are disabled by the server administrator. Set ALLOW_REMOTE_DATABASE_CONNECTORS=true only in a controlled deployment.")
    url=str(payload.get("connection_url", "")); query=str(payload.get("query", "SELECT 1"))
    parsed=validate_remote_query(url,query)
    engine=None
    try:
        engine=create_engine(url,pool_pre_ping=True,connect_args={"connect_timeout":5})
        with engine.connect() as con:
            result=con.execute(text(f"SELECT * FROM ({query.rstrip(';')}) AS finese_preview LIMIT 100"))
            rows=[dict(r._mapping) for r in result]
        return {"columns":list(rows[0].keys()) if rows else [],"rows":rows,"row_preview_count":len(rows),"credentials_stored":False}
    except Exception as exc: raise HTTPException(422,"Could not preview query. Verify the allowlisted host, driver, network access and read-only permissions.") from exc
    finally:
        if engine: engine.dispose()
