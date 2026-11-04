"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  BarChart3, BrainCircuit, ChevronLeft, ChevronRight, CloudUpload, Database, Download,
  LayoutDashboard, LogOut, Menu, MessageCircle, Minimize2, RefreshCw, Send, Settings,
  WandSparkles, X,
} from "lucide-react";
import { api, downloadPath, uploadFile } from "@/lib/api";
import { OverviewSection, Analysis } from "./overview-section";
import { CleaningSection, CleanOp, RecipeStep } from "./cleaning-section";
import { PlotStudioSection, PlotSpec, PlotResult, newPlot } from "./plot-studio-section";
import { ModelSection } from "./model-section";
import { SettingsSection } from "./settings-section";
import { UploadSection, ExportSection } from "./records-sections";
import { Dataset, Preview, Profile, SettingsProvider, User, View, useSettings } from "./studio-types";

type Experiment={experiment_id:string;estimator:string;task_type:string;metrics:Record<string,number|number[][]|string[]>;target_column?:string;features_used?:string[];cross_validation?:Record<string,unknown>;feature_importances?:{feature:string;importance:number}[];details?:Record<string,unknown>};
type ExperimentRow={id:string;name:string;task_type:string;estimator:string;status:string;metrics:Record<string,number|number[][]|string[]>;created_at:string};
type VersionRow={version:number;action:string;details:Record<string,unknown>;created_at:string};
type ChatReply={answer:string;provider:string;model?:string;conversation_id:string};
type PreviewResult={ok:boolean;preview:{operation:string;affected:number;rows_before:number;rows_after:number;columns_before:number;columns_after:number;added_columns:string[];removed_columns:string[];missing_before:number;missing_after:number;detail:Record<string,unknown>;before:Record<string,unknown>[];after:Record<string,unknown>[];sample_columns:string[]}};

type NavItem={id:View;label:string;icon:LucideIcon;hint:string;color:string};
const NAV:NavItem[]=[
  {id:"upload",label:"Upload",icon:CloudUpload,hint:"Bring your data",color:"#0ea5e9"},
  {id:"overview",label:"Overview",icon:LayoutDashboard,hint:"Dataset insights",color:"#6366f1"},
  {id:"cleaning",label:"Cleaning",icon:WandSparkles,hint:"Prepare & validate",color:"#10b981"},
  {id:"chat",label:"Plot Studio",icon:BarChart3,hint:"Plots & pivots",color:"#f59e0b"},
  {id:"models",label:"Model Studio",icon:BrainCircuit,hint:"ML pipeline",color:"#ef4444"},
  {id:"export",label:"Export",icon:Download,hint:"Reports & artifacts",color:"#8b5cf6"},
  {id:"settings",label:"Settings",icon:Settings,hint:"Configure project",color:"#64748b"}
];

export function StudioClient(){
  return <SettingsProvider><StudioShell/></SettingsProvider>;
}

function StudioShell(){
 const router=useRouter(); const { settings, catalog, saving, update }=useSettings();
 const [view,setView]=useState<View>("overview"); const [collapsed,setCollapsed]=useState(false); const [mobileOpen,setMobileOpen]=useState(false);
 const [user,setUser]=useState<User|null>(null); const [datasets,setDatasets]=useState<Dataset[]>([]); const [activeIdOverride,setActiveIdOverride]=useState<string>(""); const activeId=activeIdOverride || datasets[0]?.id || ""; const [profile,setProfile]=useState<Profile|null>(null); const [preview,setPreview]=useState<Preview|null>(null);
 const [analysis,setAnalysis]=useState<Analysis|null>(null); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false); const [toast,setToast]=useState(""); const [error,setError]=useState("");
 const uploadDrag=false;
 const [cleanCatalog,setCleanCatalog]=useState<CleanOp[]>([]); const [activeCat,setActiveCat]=useState("All"); const [opFilter,setOpFilter]=useState(""); const [opOptions,setOpOptions]=useState<Record<string,Record<string,unknown>>>({}); const [cleanColumns,setCleanColumns]=useState<string[]>([]); const [cleanPreview,setCleanPreview]=useState<{op:string;result:PreviewResult}|null>(null); const [versions,setVersions]=useState<{version:number;action:string;details:Record<string,unknown>;created_at:string}[]>([]); const [recipe,setRecipe]=useState<RecipeStep[]>([]); const [redoStack,setRedoStack]=useState<string[]>([]);
 const [plotSpec,setPlotSpec]=useState<PlotSpec|null>(null); const [plotSpecs,setPlotSpecs]=useState<PlotSpec[]>([]); const [plotDrafts,setPlotDrafts]=useState<Record<string,PlotResult|{error:string}>>({}); const [widgets,setWidgets]=useState<{id:string;title:string;spec:PlotSpec}[]>([]);
 const [conversationId,setConversationId]=useState("");
 const [task,setTask]=useState("classification"); const [target,setTarget]=useState(""); const [estimator,setEstimator]=useState("random_forest"); const [features,setFeatures]=useState<string[]>([]); const [cvFolds,setCvFolds]=useState("5"); const [testSize,setTestSize]=useState("0.2"); const [tune,setTune]=useState(false); const [experiment,setExperiment]=useState<Experiment|null>(null); const [experiments,setExperiments]=useState<ExperimentRow[]>([]); const [trainingStatus,setTrainingStatus]=useState<{step:string;pct:number}|null>(null);
 const [dbUrl,setDbUrl]=useState(""); const [dbQuery,setDbQuery]=useState("SELECT * FROM customers"); const [dbPreview,setDbPreview]=useState<Record<string,unknown>|null>(null);
 const [chatWidgetOpen,setChatWidgetOpen]=useState(false); const [widgetMessages,setWidgetMessages]=useState<{role:"user"|"assistant";content:string}[]>([]); const [widgetPrompt,setWidgetPrompt]=useState("");

 const active=useMemo(()=>datasets.find(d=>d.id===activeId)||null,[datasets,activeId]);
 const flash=useCallback((message:string)=>{setToast(message);window.setTimeout(()=>setToast(""),3600);},[]);
 const loadProfile=useCallback(async(id:string)=>{if(!id){setProfile(null);setPreview(null);return;}setBusy(true);try{const [p,v]=await Promise.all([api<Profile>(`api/datasets/${id}/profile`),api<Preview>(`api/datasets/${id}/preview?limit=10`)]);setProfile(p);setPreview(v);}catch(e){setError(e instanceof Error?e.message:"Unable to load dataset.");}finally{setBusy(false);}},[]);
 const loadAnalysis=useCallback(async(params?:{bins?:number;outlierMethod?:string;outlierThreshold?:number;correlationMethod?:string})=>{if(!activeId){setAnalysis(null);return;}const q=new URLSearchParams({bins:String(params?.bins??settings?.overview.histogram_bins??16),outlier_method:params?.outlierMethod??settings?.overview.outlier_method??"iqr",outlier_threshold:String(params?.outlierThreshold??settings?.overview.outlier_threshold??1.5),correlation_method:params?.correlationMethod??settings?.overview.correlation_method??"pearson"});try{setAnalysis(await api<Analysis>(`api/datasets/${activeId}/analysis?${q.toString()}`));}catch(e){setError(e instanceof Error?e.message:"Unable to compute analysis.");}},[activeId,settings?.overview.histogram_bins,settings?.overview.outlier_method,settings?.overview.outlier_threshold,settings?.overview.correlation_method]);

 useEffect(()=>{(async()=>{try{const [u,ds,ex]=await Promise.all([fetch("/api/auth/me").then(r=>{if(!r.ok)throw new Error("Session expired");return r.json();}),api<Dataset[]>("api/datasets"),api<ExperimentRow[]>("api/experiments")]);setUser(u);setDatasets(ds);setExperiments(ex);if(!ds.length)setView("upload");}catch{router.replace("/login");}finally{setLoading(false);}})();},[router]);
 useEffect(()=>{(async()=>{if(activeId)await loadProfile(activeId);})();},[activeId,loadProfile]);
 useEffect(()=>{(async()=>{if(activeId)await loadAnalysis();})();},[activeId,loadAnalysis]);
 useEffect(()=>{(async()=>{try{const r=await api<{operations:CleanOp[]}>("api/cleaning/catalog");setCleanCatalog(r.operations);}catch{setCleanCatalog([]);}})();},[]);
 useEffect(()=>{(async()=>{if(!active)return;const guessed=active.column_names.includes("churn")?"churn":active.column_names.find(c=>!["id","customer_id"].includes(c.toLowerCase()))||"";setTarget(guessed);setFeatures(active.column_names.filter(c=>c!==guessed));setCleanColumns([]);setCleanPreview(null);setVersions([]);setPlotSpec(newPlot({x:active.column_names[0]||"",y:active.column_names[1]||"",aggregation:settings?.plots.default_aggregation||"sum",limit:settings?.plots.default_limit||20,bins:settings?.plots.bins||20}));})(); /* reset per dataset */ // eslint-disable-next-line react-hooks/exhaustive-deps
 },[active?.id]);
 useEffect(()=>{(async()=>{if(settings?.models){setTune(settings.models.tune);setCvFolds(String(settings.models.cv_folds));setTestSize(String(settings.models.test_size));}})();},[settings?.models]);

 const refreshAll=async()=>{try{const ds=await api<Dataset[]>("api/datasets");setDatasets(ds);if(activeId&&!ds.some(d=>d.id===activeId))setActiveIdOverride(ds[0]?.id||"");const ex=await api<ExperimentRow[]>("api/experiments");setExperiments(ex);}catch(e){flash(e instanceof Error?e.message:"Refresh failed");}};
 const nav=NAV.filter(n=>settings?.sections?.[n.id]!==false);

 async function onUpload(file?:File){if(!file)return;setError("");setBusy(true);try{const data=await uploadFile(file);await refreshAll();setActiveIdOverride(data.id);setView("overview");flash(`Imported ${data.name} · ${data.rows.toLocaleString()} rows`);}catch(e){setError(e instanceof Error?e.message:"Upload failed");}finally{setBusy(false);}}
 async function loadSample(kind:string){setBusy(true);setError("");try{const d=await api<Dataset>(`api/datasets/sample?kind=${kind}`,{method:"POST"});await refreshAll();setActiveIdOverride(d.id);setView("overview");flash(`${d.name} added to your workspace`);}catch(e){setError(e instanceof Error?e.message:"Sample import failed");}finally{setBusy(false);}}
 async function loadVersions(){if(!active)return;try{setVersions(await api<VersionRow[]>(`api/datasets/${active.id}/versions`));}catch{setVersions([]);}}
 async function applyClean(op:string,dryRun=false){if(!active)return;setBusy(true);setError("");const opts=opOptions[op]||{};const column=String(opts.column||cleanColumns[0]||"");const body={operation:op,column:column||null,columns:cleanColumns.length?cleanColumns:(column?[column]:[]),options:opts,dry_run:dryRun};
  try{if(dryRun){setCleanPreview({op,result:await api<PreviewResult>(`api/datasets/${active.id}/clean/preview`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...body,dry_run:false})})});flash("Preview ready — nothing saved yet");}
   else{const r=await api<{affected:number}>(`api/datasets/${active.id}/clean`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});setRedoStack([]);await refreshAll();await loadProfile(active.id);if(activeId)void loadAnalysis();flash(`${op.replaceAll("_"," ")} applied · ${r.affected} affected`);}}
  catch(e){setError(e instanceof Error?e.message:"Cleaning failed");}finally{setBusy(false);}}
 async function runRecipe(){if(!active||!recipe.length)return;setBusy(true);setError("");try{const r=await api<{log:unknown[];affected:number}>(`api/datasets/${active.id}/clean/recipe`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({steps:recipe.filter(s=>s.enabled).map(s=>({operation:s.operation,column:s.column,columns:s.columns,options:s.options}))})});await refreshAll();await loadProfile(active.id);if(activeId)void loadAnalysis();setRedoStack([]);flash(`Recipe applied · ${r.log.length} steps · ${r.affected} changes`);}catch(e){setError(e instanceof Error?e.message:"Recipe failed");}finally{setBusy(false);}}
 async function undo(){if(!active)return;setBusy(true);try{await api(`api/datasets/${active.id}/undo`,{method:"POST"});setRedoStack(s=>[...s,active.id]);await loadProfile(active.id);await loadVersions();if(activeId)void loadAnalysis();flash("Previous dataset version restored");}catch(e){setError(e instanceof Error?e.message:"Nothing to undo");}finally{setBusy(false);}}
 async function redo(){flash("Undo history kept — re-apply the operation from the Operations tab to move forward again.");setRedoStack([]);}
 async function restoreVersion(version:number){if(!active)return;const drops=versions.filter(v=>v.version>version).length;try{for(let i=0;i<drops;i++)await api(`api/datasets/${active.id}/undo`,{method:"POST"});await loadProfile(active.id);await loadVersions();void loadAnalysis();flash(`Restored version ${version}`);}catch(e){setError(e instanceof Error?e.message:"Could not restore that version");}}
 async function deployModel(id:string){try{await api<{deployed:boolean}>(`api/models/${id}/deploy`,{method:"POST"});setExperiments(await api<ExperimentRow[]>("api/experiments"));flash("Model deployed.");}catch(e){setError(e instanceof Error?e.message:"Deployment failed");}}
 async function askAssistant(question:string):Promise<string>{setBusy(true);try{const r=await api<ChatReply>("api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dataset_id:activeId||null,prompt:question,share_data_with_ai:Boolean(settings?.ai.share_context),include_sample_rows:Boolean(settings?.ai.include_sample_rows),provider:settings?.ai.provider||"auto",model:settings?.ai.model||null,temperature:settings?.ai.temperature,conversation_id:conversationId||null})});setConversationId(r.conversation_id);return `${r.answer}\n\n— ${r.provider}${r.model?` · ${r.model}`:""}`;}catch(e){return e instanceof Error?e.message:"Assistant request failed.";}finally{setBusy(false);}}
 async function askWidget(e:FormEvent){e.preventDefault();if(!widgetPrompt.trim())return;const question=widgetPrompt.trim();setWidgetMessages(m=>[...m,{role:"user",content:question}]);setWidgetPrompt("");const answer=await askAssistant(question);setWidgetMessages(m=>[...m,{role:"assistant",content:answer}]);}
 async function previewDatabase(e:FormEvent){e.preventDefault();setDbPreview(null);setBusy(true);try{const r=await api<Record<string,unknown>>("api/connectors/preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({connection_url:dbUrl,query:dbQuery})});setDbPreview(r);}catch(e){setError(e instanceof Error?e.message:"Connection failed");}finally{setBusy(false);}}
 async function importDatabase(){setBusy(true);try{const r=await api<{id:string}>("api/connectors/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({connection_url:dbUrl,query:dbQuery,name:"database_import.csv"})});await refreshAll();setActiveIdOverride(r.id);setView("overview");setDbPreview(null);flash("Database imported");}catch(e){setError(e instanceof Error?e.message:"Import failed");}finally{setBusy(false);}}
 async function logout(){await fetch("/api/auth/logout",{method:"POST"});router.replace("/");router.refresh();}
 async function train(e:FormEvent){e.preventDefault();if(!active)return;setBusy(true);setError("");try{const request={dataset_id:active.id,task_type:task,target_column:(task==="classification"||task==="regression")?target:null,features,test_size:Number(testSize),cv_folds:Number(cvFolds),estimator,tune,random_seed:Number(settings?.models.random_seed??42)};setTrainingStatus({step:"Queuing training job",pct:10});const job=await api<{job_id:string}>("api/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({request})});let result:Experiment|null=null;for(let attempt=0;attempt<300;attempt++){const status=await api<{status:string;error?:string;result?:Experiment}>(`api/jobs/${job.job_id}`);setTrainingStatus({step:`Training · ${status.status}`,pct:Math.min(95,15+attempt*2)});if(status.status==="completed"){result=status.result??null;break;}if(status.status==="failed"||status.status==="cancelled")throw new Error(status.error||`Training failed.`);await new Promise(resolve=>window.setTimeout(resolve,1000));}if(!result)throw new Error("Training timed out.");const trained=result;setTrainingStatus({step:"Registering experiment",pct:98});setExperiment(trained);setExperiments(await api<ExperimentRow[]>("api/experiments"));setTrainingStatus(null);flash("Experiment trained and registered");}catch(e){setTrainingStatus(null);setError(e instanceof Error?e.message:"Model training failed");}finally{setBusy(false);}}
 const savePlotDefaults=()=>{if(!plotSpec)return;void update({plots:{default_type:plotSpec.type,default_aggregation:plotSpec.aggregation,default_limit:plotSpec.limit,bins:plotSpec.bins}});flash("Plot defaults saved");};

 const title=NAV.find(n=>n.id===view)??NAV[0];
 if(loading)return <div className="auth-form-panel" style={{minHeight:"100vh",color:"#fff"}}>Opening your FINESE workspace…</div>;

 return (
 <div className="studio-shell" style={{background:"linear-gradient(135deg, #f8fbff 0%, #f5f7fa 100%)"}}>
  <aside className={`sidebar ${collapsed?"collapsed":""} ${mobileOpen?"mobile-open":""}`} style={{background:"linear-gradient(180deg, #0b1728 0%, #08111f 100%)", borderRight:"2px solid #0ea5e920"}}>
   <div className="side-brand" style={{borderBottom:"1px solid #1d2b40"}}><span className="brand-symbol" style={{background:"linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)"}}><i/><i/><i/></span><Link href="/" className="brand"><span>FINESE <b style={{color:"#0ea5e9"}}>DATA</b></span></Link></div>
   <button className="side-toggle" onClick={()=>setCollapsed(c=>!c)} aria-label="Collapse sidebar">{collapsed?<ChevronRight size={14}/>:<ChevronLeft size={14}/>}</button>
   <nav className="side-nav"><div className="side-label" style={{color:"#94a3b8"}}>YOUR WORKSPACE</div>{nav.map(item=><button className={`side-item ${view===item.id?"active":""}`} key={item.id} onClick={()=>{setView(item.id);setMobileOpen(false);}} title={item.label} style={view===item.id?{background:`linear-gradient(90deg, ${item.color}20 0%, transparent 100%)`, color:item.color, borderLeft:`3px solid ${item.color}`}:{}}><item.icon size={17} style={{color:view===item.id?item.color:"#93a3b8"}}/><span>{item.label}</span></button>)}</nav>
   <div className="side-bottom" style={{borderTop:"1px solid #1d2b40"}}><div className="profile-avatar" style={{background:"linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)"}}>{(user?.full_name||"F").split(" ").map(s=>s[0]).slice(0,2).join("").toUpperCase()}</div><div className="profile-meta"><b>{user?.full_name||"Analyst"}</b><small>{user?.workspace_name||"Personal workspace"}</small></div><button className="logout-button" onClick={logout} title="Sign out"><LogOut size={16}/></button></div>
  </aside>
  {mobileOpen&&<button aria-label="Close menu" onClick={()=>setMobileOpen(false)} style={{position:"fixed",inset:0,background:"#08111f66",zIndex:4,border:0}}/>}
  <main className="studio-main">
   <header className="studio-topbar" style={{background:"linear-gradient(90deg, #ffffff 0%, #f8fbff 100%)", borderBottom:"2px solid #e0f2fe"}}><div style={{display:"flex",alignItems:"center",gap:12}}><button className="icon-button mobile-side-toggle" onClick={()=>setMobileOpen(true)}><Menu size={17}/></button><div className="crumb">Workspace <span style={{color:"#c5ccd6",padding:"0 7px"}}>/</span> <b style={{color:title.color}}>{title.label}</b></div></div><div className="top-actions"><select className="dataset-select" value={activeId} onChange={e=>setActiveIdOverride(e.target.value)} style={{border:"2px solid #e0f2fe", background:"linear-gradient(90deg, #ffffff 0%, #f8fbff 100%)"}}><option value="">No active dataset</option>{datasets.map(d=><option value={d.id} key={d.id}>{d.name}</option>)}</select><button className="icon-button" onClick={refreshAll} title="Refresh workspace"><RefreshCw size={15}/></button><div className="profile-avatar" style={{width:29,height:29, background:"linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)"}}>{user?.full_name?.[0]?.toUpperCase()||"F"}</div></div></header>
   <div className="studio-content">
    {error&&<div className="inline-alert" style={{background:"linear-gradient(90deg, #fef2f2 0%, #fee2e2 100%)", border:"2px solid #fecaca", color:"#991b1b"}}><b>Action needs attention:</b> {error}<button onClick={()=>setError("")} style={{float:"right",border:0,background:"transparent",color:"inherit"}}><X size={13}/></button></div>}
    {!active&&view!=="upload"&&<div className="panel empty-state" style={{background:"linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)", border:"2px solid #e0f2fe"}}><div className="drop-icon" style={{margin:"0 auto", background:"linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)", color:"#0284c7"}}><Database size={24}/></div><h3>Your workspace is ready for its first dataset</h3><p>Upload a file or load a sample dataset to start profiling, cleaning, chatting and training models.</p><button className="btn-studio" onClick={()=>setView("upload")} style={{background:"linear-gradient(90deg, #0ea5e9 0%, #6366f1 100%)"}}><CloudUpload size={14}/> Upload dataset</button></div>}
    {view==="upload"&&<UploadSection onUpload={onUpload} loadSample={loadSample} busy={busy} previewDatabase={previewDatabase} importDatabase={importDatabase} dbUrl={dbUrl} setDbUrl={setDbUrl} dbQuery={dbQuery} setDbQuery={setDbQuery} dbPreview={dbPreview} uploadDrag={uploadDrag}/>}
    {view==="overview"&&<OverviewSection datasets={datasets} active={active} profile={profile} preview={preview} analysis={analysis} onAnalyze={(params)=>void loadAnalysis(params)} onUpload={()=>setView("upload")} onOpen={setActiveIdOverride} onGo={setView} loading={busy}/>}
    {view==="cleaning"&&<CleaningSection active={active} profile={profile} catalog={cleanCatalog} activeCat={activeCat} setActiveCat={setActiveCat} filter={opFilter} setFilter={setOpFilter} options={opOptions} setOptions={setOpOptions} selectedColumns={cleanColumns} setSelectedColumns={setCleanColumns} preview={cleanPreview} setPreview={setCleanPreview} apply={applyClean} undo={undo} redo={redo} canRedo={redoStack.length>0} busy={busy} versions={versions} loadVersions={loadVersions} restoreVersion={restoreVersion} recipe={recipe} setRecipe={setRecipe} runRecipe={runRecipe}/>}
    {view==="chat"&&<PlotStudioSection active={active} spec={plotSpec} setSpec={setPlotSpec} plotSpecs={plotSpecs} setPlotSpecs={setPlotSpecs} drafts={plotDrafts} setDrafts={setPlotDrafts} onAsk={askAssistant} onSaveTemplate={savePlotDefaults} widgets={widgets} setWidgets={setWidgets}/>}
    {view==="models"&&<ModelSection active={active} profile={profile} task={task} setTask={setTask} target={target} setTarget={setTarget} estimator={estimator} setEstimator={setEstimator} features={features} setFeatures={setFeatures} cvFolds={cvFolds} setCvFolds={setCvFolds} testSize={testSize} setTestSize={setTestSize} tune={tune} setTune={setTune} busy={busy} train={train} experiment={experiment} experiments={experiments} deployModel={deployModel} downloadPath={downloadPath}/>}
    {view==="export"&&<ExportSection active={active} experiments={experiments} downloadPath={downloadPath}/>}
    {view==="settings"&&<SettingsSection user={user}/>}
   </div>
  </main>
  
  <div style={{position:"fixed", bottom:20, right:20, zIndex:1000}}>
    {chatWidgetOpen?<div style={{width:390, height:520, background:"white", borderRadius:14, boxShadow:"0 20px 60px rgba(0,0,0,0.3)", border:"3px solid #f59e0b", display:"flex", flexDirection:"column", overflow:"hidden"}}>
      <div style={{background:"linear-gradient(90deg, #f59e0b 0%, #d97706 100%)", color:"white", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}><MessageCircle size={18}/><span style={{fontWeight:700, fontSize:13}}>Assistant · {settings?.ai.model||settings?.ai.provider||"auto"}</span></div>
        <div style={{display:"flex",gap:6}}><a href="#" onClick={e=>{e.preventDefault();setView("settings");setChatWidgetOpen(false);}} title="AI settings" style={{color:"white"}}><Settings size={14}/></a><button onClick={()=>setChatWidgetOpen(false)} style={{background:"transparent", border:0, color:"white", cursor:"pointer"}} aria-label="Minimize assistant"><Minimize2 size={16}/></button></div>
      </div>
      <div style={{flex:1, overflow:"auto", padding:12, display:"flex", flexDirection:"column", gap:10, background:"linear-gradient(180deg, #fffbeb 0%, white 100%)"}}>
        {widgetMessages.length===0&&<div style={{textAlign:"center", color:"#92400e", fontSize:11, marginTop:40}}><MessageCircle size={30} style={{margin:"0 auto 10px", display:"block", color:"#f59e0b"}}/><div style={{fontWeight:700}}>Ask about your active dataset</div><div style={{fontSize:9, marginTop:4}}>Model: {settings?.ai.model||settings?.ai.provider||"auto"} · {catalog?.total_models??0} models available</div></div>}
        {widgetMessages.map((m,i)=><div key={i} style={{alignSelf:m.role==="user"?"flex-end":"flex-start", maxWidth:"88%", padding:"8px 12px", borderRadius:10, fontSize:10, whiteSpace:"pre-wrap", background:m.role==="user"?"linear-gradient(90deg, #fef3c7 0%, #fde68a 100%)":"linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 100%)", color:m.role==="user"?"#92400e":"#475569"}}>{m.content}</div>)}
      </div>
      <form onSubmit={askWidget} style={{padding:8, borderTop:"2px solid #fde68a", display:"flex", gap:6, background:"white"}}>
        <input value={widgetPrompt} onChange={e=>setWidgetPrompt(e.target.value)} placeholder="Ask about your data..." style={{flex:1, padding:"8px 10px", border:"2px solid #fde68a", borderRadius:6, fontSize:10}}/>
        <button disabled={busy||!widgetPrompt.trim()} style={{padding:"8px 12px", background:"linear-gradient(90deg, #f59e0b 0%, #d97706 100%)", color:"white", border:0, borderRadius:6}} aria-label="Send"><Send size={14}/></button>
      </form>
    </div>:<button onClick={()=>setChatWidgetOpen(true)} aria-label="Open assistant" style={{width:60, height:60, borderRadius:"50%", background:"linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color:"white", border:"3px solid white", boxShadow:"0 8px 24px rgba(245, 158, 11, 0.5)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"}}><MessageCircle size={26}/></button>}
  </div>
  
  {toast&&<div className="toast" role="status" style={{background:"linear-gradient(90deg, #10b981 0%, #059669 100%)"}}>{toast}</div>}
  {saving&&<div className="settings-saving" aria-live="polite"><RefreshCw size={12} className="spin"/> Saving settings…</div>}
  {trainingStatus&&<div className="training-progress" role="status"><span className="tp-head"><BrainCircuit size={14}/> {trainingStatus.step}</span><span className="tp-track"><i style={{width:`${trainingStatus.pct}%`}}/></span><small>{trainingStatus.pct}%</small><button className="btn-quiet small" onClick={()=>setTrainingStatus(null)}><X size={11}/></button></div>}
 </div>
 );
}
