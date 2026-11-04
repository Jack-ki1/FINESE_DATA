"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Brain, BrainCircuit, CheckCircle, Download, Gauge, GitCompare, Layers, LineChart as LineIcon, PlayCircle, Plus, RefreshCw, Rocket, Search, Target, Trash2, TrendingUp, Zap } from "lucide-react";
import { BarChart, ChartFrame, ConfusionMatrix, EmptyChart, GaugeRing, Heatmap, Histogram, LineChart, MetricBarList, PieChart, ScatterChart, StatTile } from "./charts";
import { ChipPicker, DataTable, PageTitle, Panel, Tabs, Toggle } from "./ui";
import { Dataset, Profile, useSettings } from "./studio-types";
import { api } from "@/lib/api";

type Metrics = Record<string, number | number[][] | string[]>;
type ExperimentSummary = { id: string; name: string; task_type: string; estimator: string; status: string; metrics: Metrics; created_at: string };
type Diagnostics = {
  task: string; importance: { feature: string; value: number; signed: number }[]; feature_share: { feature: string; pct: number }[];
  cv: { folds: { metric: string; mean: number; std: number }[] }; roc: number[][]; pr_curve: number[][]; confusion: number[][]; labels: string[];
  calibration: { bin: string; predicted: number | null; observed: number | null; count: number }[]; probability_histogram: { labels: string[]; values: number[] };
  residuals: { points: number[][]; labels: string[]; values: number[]; mean: number | null; std: number | null; max_abs: number | null };
  pred_vs_actual: number[][]; learning_curve: { labels: number[]; train: number[]; test: number[]; train_std?: number[]; test_std?: number[]; scoring?: string; error?: string } | null;
  dataset: Record<string, number>; estimator_params: Record<string, unknown>; baseline: Record<string, number>; training_seconds: number | null; positive_class: string | null;
  per_class: { class: string; support: number; precision: number; recall: number; avg_probability: number }[]; metric_bars: { metric: string; value: number }[];
};

export function ModelSection({ active, profile, task, setTask, target, setTarget, estimator, setEstimator, features, setFeatures, cvFolds, setCvFolds, testSize, setTestSize, tune, setTune, busy, train, experiment, experiments, deployModel, downloadPath }: {
  active: Dataset | null; profile: Profile | null; task: string; setTask: (v: string) => void; target: string; setTarget: (v: string) => void;
  estimator: string; setEstimator: (v: string) => void; features: string[]; setFeatures: (v: string[]) => void; cvFolds: string; setCvFolds: (v: string) => void;
  testSize: string; setTestSize: (v: string) => void; tune: boolean; setTune: (v: boolean) => void; busy: boolean; train: (e: FormEvent) => void;
  experiment: { experiment_id: string; estimator: string; task_type: string; metrics: Metrics } | null; experiments: ExperimentSummary[];
  deployModel: (id: string) => void; downloadPath: (p: string) => void;
}) {
  const { settings, update } = useSettings();
  const cfg = settings?.models;
  const [leaderboard, setLeaderboard] = useState<{ leaderboard: { estimator: string; runs: number; best: number; average: number }[]; rows: { id: string; name: string; estimator: string; task_type: string; score: number | null; rank?: number; metrics: Metrics; created_at: string; status: string }[]; timeline: { date: string; score: number | null; estimator: string }[]; task_counts: Record<string, number>; total: number; deployed: number } | null>(null);
  const [selected, setSelected] = useState<{ experiment_id: string; name: string; estimator: string; task_type: string; metrics: Metrics; charts: Diagnostics; details: Diagnostics; parameters: Record<string, unknown>; created_at: string } | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "performance" | "errors" | "explain" | "data">("overview");
  const [sweep, setSweep] = useState<{ runs: { estimator: string; ok: boolean; error?: string; metrics?: Metrics }[]; ranked: { estimator: string; score: number | null }[] } | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<{ metrics: string[]; rows: { name: string; estimator: string; task_type: string; metrics: Record<string, number | null> }[] } | null>(null);
  const [eda, setEda] = useState<{ distribution: { column: string; labels: string[]; values: number[] }[]; balance: { label: string; value: number; pct: number }[]; columns: { column: string; kind: string; missing_pct: number; unique: number }[]; correlation: { columns: string[]; matrix: number[][] } } | null>(null);
  const [inferenceRows, setInferenceRows] = useState("{}");
  const [predictions, setPredictions] = useState<string[] | null>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const palette = settings?.plots.palette ?? "ocean";

  const isDeep = task.startsWith("deep_learning_");
  const supervised = task === "classification" || task === "regression" || isDeep;
  const estimators = useMemo(() => {
    if (isDeep) return ["torch_mlp"];
    if (task === "classification") return ["logistic_regression", "random_forest", "extra_trees", "gradient_boosting", "knn", "svm"];
    if (task === "regression") return ["linear_regression", "ridge", "random_forest", "extra_trees", "gradient_boosting", "knn", "svm"];
    return ["kmeans", "isolation_forest"];
  }, [task, isDeep]);

  const loadSummary = async () => { try { setLeaderboard(await api<NonNullable<typeof leaderboard>>("api/experiments/summary")); } catch { /* ignore */ } };
  useEffect(() => {
    (async () => { try { const r = await api<NonNullable<typeof leaderboard>>("api/experiments/summary"); setLeaderboard(r); } catch { /* ignore */ } })();
  }, [experiments.length]);
  useEffect(() => {
    (async () => {
      if (!active) return;
      try { const r = await api<NonNullable<typeof eda>>(`api/datasets/${active.id}/modeling-eda${target ? `?target=${encodeURIComponent(target)}` : ""}`); setEda(r); } catch { setEda(null); }
    })();
  }, [active, target]);

  const openExperiment = async (id: string) => {
    setError("");
    try { const r = await api<NonNullable<typeof selected>>(`api/experiments/${id}`); setSelected(r); setDetailTab("overview"); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load experiment."); }
  };
  useEffect(() => {
    (async () => {
      if (!experiment?.experiment_id) return;
      try { const r = await api<NonNullable<typeof selected>>(`api/experiments/${experiment.experiment_id}`); setSelected(r); setDetailTab("overview"); } catch (e) { setError(e instanceof Error ? e.message : "Could not load experiment."); }
    })();
  }, [experiment]);

  const runSweep = async () => {
    if (!active) return; setLocalBusy(true); setError("");
    try {
      const r = await api<NonNullable<typeof sweep>>("api/ml/sweep", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataset_id: active.id, task_type: task, target_column: (task === "classification" || task === "regression") ? target : null, features: features.length ? features : null, cv_folds: Number(cvFolds), test_size: Number(testSize), random_seed: Number(cfg?.random_seed ?? 42), estimators: (cfg?.sweep_estimators?.length ? cfg.sweep_estimators : estimators).slice(0, cfg?.max_candidates ?? 6), tune: false }) });
      setSweep(r); await loadSummary();
    } catch (e) { setError(e instanceof Error ? e.message : "Sweep failed."); } finally { setLocalBusy(false); }
  };
  const runCompare = async () => {
    setError("");
    try { setComparison(await api<NonNullable<typeof comparison>>("api/experiments/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: compareIds }) })); }
    catch (e) { setError(e instanceof Error ? e.message : "Compare failed."); }
  };
  const removeExperiment = async (id: string) => { try { await api(`api/experiments/${id}`, { method: "DELETE" }); if (selected?.experiment_id === id) setSelected(null); await loadSummary(); } catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); } };
  const predict = async () => {
    if (!selected) return; setError("");
    try {
      const parsed = JSON.parse(inferenceRows);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      const r = await api<{ predictions: string[] }>(`api/models/${selected.experiment_id}/predict`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
      setPredictions(r.predictions);
    } catch (e) { setError(e instanceof Error ? e.message : "Prediction failed. Check the JSON row payload."); setPredictions(null); }
  };
  const sampleRow = () => {
    const feats = ((selected?.parameters?.features as string[]) || features || []).filter(Boolean);
    setInferenceRows(JSON.stringify(Object.fromEntries(feats.map(f => [f, 0])), null, 0));
  };

  const filteredLeaderboard = (leaderboard?.rows ?? []).filter(r => !search || `${r.name} ${r.estimator} ${r.task_type}`.toLowerCase().includes(search.toLowerCase()));
  const charts = selected?.charts;

  return <section>
    <PageTitle eyebrow="MACHINE LEARNING WORKBENCH" title="Model Studio" desc="Compare algorithms, inspect behaviour visually, explain predictions and ship the winner — with every parameter under your control." color="#ef4444"
      actions={<div className="inline-controls"><button className="btn-quiet" onClick={loadSummary}><RefreshCw size={13} /> Refresh</button><button className="btn-studio" onClick={() => void runSweep()} disabled={localBusy || !active} style={{ background: "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)" }}><Zap size={13} /> {localBusy ? "Sweeping…" : "Auto-sweep"}</button></div>} />
    {error && <div className="inline-alert">{error}</div>}

    <div className="kpi-row">
      {[{ label: "EXPERIMENTS", value: String(leaderboard?.total ?? experiments.length), color: "#ef4444", sub: "registered runs" },
        { label: "BEST SCORE", value: leaderboard?.rows?.[0]?.score != null ? leaderboard.rows[0].score.toFixed(1) : "—", color: "#10b981", sub: leaderboard?.rows?.[0]?.estimator ?? "train a model" },
        { label: "ALGORITHMS", value: String(leaderboard?.leaderboard.length ?? 0), color: "#8b5cf6", sub: "distinct algorithms" },
        { label: "DEPLOYED", value: String(leaderboard?.deployed ?? 0), color: "#0ea5e9", sub: "serving via API" },
        { label: "TASKS", value: String(Object.keys(leaderboard?.task_counts ?? {}).length), color: "#f59e0b", sub: Object.entries(leaderboard?.task_counts ?? {}).map(([k, v]) => `${k}:${v}`).join(" · ") || "none" }].map(k =>
        <div className="kpi-tile" key={k.label} style={{ borderColor: `${k.color}40` }}><div><small style={{ color: k.color }}>{k.label}</small><strong style={{ color: k.color }}>{k.value}</strong><em>{k.sub}</em></div></div>)}
    </div>

    <div className="two-column">
      <Panel title="Training configuration" subtitle="Every choice is explicit — nothing is hidden" color="#ef4444" className="train-panel">
        <form onSubmit={train}>
          <div className="settings-grid">
            <label className="field">Task<select className="control-select" value={task} onChange={e => setTask(e.target.value)}>
              {["classification", "regression", "clustering", "anomaly", "deep_learning_classification", "deep_learning_regression"].map(t => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
            </select></label>
            <label className="field">Algorithm<select className="control-select" value={estimator} onChange={e => setEstimator(e.target.value)}>{estimators.map(e => <option key={e} value={e}>{e.replaceAll("_", " ")}</option>)}</select></label>
            {supervised && <label className="field wide">Target column<select className="control-select" value={target} onChange={e => setTarget(e.target.value)}>{(active?.column_names ?? []).map(c => <option key={c}>{c}</option>)}</select></label>}
          </div>
          {supervised && <label className="field">Features <small className="muted">({features.length} selected)</small><ChipPicker options={(active?.column_names ?? []).filter(c => c !== target)} value={features} onChange={setFeatures} max={60} /></label>}
          <div className="settings-grid">
            <label className="field">CV folds<input className="control-input" type="number" min={2} max={10} value={cvFolds} onChange={e => setCvFolds(e.target.value)} /></label>
            <label className="field">Test size<select className="control-select" value={testSize} onChange={e => setTestSize(e.target.value)}>{["0.1", "0.15", "0.2", "0.25", "0.3", "0.4"].map(t => <option key={t} value={t}>{Number(t) * 100}%</option>)}</select></label>
            <label className="field">Random seed<input className="control-input" type="number" value={cfg?.random_seed ?? 42} onChange={e => void update({ models: { random_seed: Number(e.target.value) } })} /></label>
          </div>
          <Toggle checked={tune} onChange={setTune} label="Hyper-parameter tuning" hint="Grid search inside cross-validation (slower, often better)" />
          <div className="inline-controls" style={{ marginTop: 10 }}>
            <button className="btn-studio" disabled={busy || !active} style={{ background: "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)" }}><BrainCircuit size={14} /> {busy ? "Training…" : "Train model"}</button>
            <button type="button" className="btn-quiet" onClick={() => void update({ models: { default_task: task, default_estimator: estimator, cv_folds: Number(cvFolds), test_size: Number(testSize), tune } })}><CheckCircle size={13} /> Save defaults</button>
          </div>
        </form>
      </Panel>
      <Panel title="Dataset readiness" subtitle="What the model will actually see" color="#f59e0b">
        {profile && <div className="readiness">
          <StatTile label="Rows available" value={profile.rows.toLocaleString()} hint={`${profile.duplicate_count.toLocaleString()} duplicates`} color="#0ea5e9" />
          <StatTile label="Missing cells" value={`${profile.missing_pct}%`} hint="imputed in the pipeline" color="#f59e0b" />
          <StatTile label="Numeric features" value={String(profile.column_profiles.filter(c => c.kind === "numeric").length)} hint="scaled automatically" color="#10b981" />
          <StatTile label="Categorical features" value={String(profile.column_profiles.filter(c => c.kind !== "numeric").length)} hint="one-hot encoded" color="#8b5cf6" />
        </div>}
        {eda && <div className="chart-grid two" style={{ marginTop: 10 }}>
          <ChartFrame title="Class balance" subtitle={target ? `Target: ${target}` : "Choose a target to inspect balance"}>
            {eda.balance.length ? <PieChart labels={eda.balance.slice(0, 6).map(b => b.label)} values={eda.balance.slice(0, 6).map(b => b.value)} donut palette={palette} height={200} /> : <EmptyChart height={180} message="Pick a classification target to see the class mix." />}
          </ChartFrame>
          <ChartFrame title="Missing by feature" subtitle="Top 8 features">
            <MetricBarList items={eda.columns.slice().sort((a, b) => b.missing_pct - a.missing_pct).slice(0, 8).map(c => ({ label: c.column, value: c.missing_pct }))} palette="sunset" format={v => `${v.toFixed(1)}%`} />
          </ChartFrame>
        </div>}
        {eda && eda.correlation.columns.length > 1 && <ChartFrame title="Feature correlation" subtitle="Watch for collinearity before training">
          <Heatmap rows={eda.correlation.columns.slice(0, 10)} cols={eda.correlation.columns.slice(0, 10)} matrix={eda.correlation.matrix.slice(0, 10).map(r => r.slice(0, 10))} diverging height={240} formatValue={v => v.toFixed(2)} />
        </ChartFrame>}
      </Panel>
    </div>

    {leaderboard && <Panel title="Model leaderboard" subtitle="Composite score: classification = 0.6·F1 + 0.4·accuracy · regression = R²" color="#10b981" action={<label className="search-box"><Search size={13} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search runs" /></label>}>
      <div className="chart-grid three">
        <ChartFrame title="Best score per algorithm" subtitle="Higher is better" palette={palette}>
          <BarChart horizontal labels={leaderboard.leaderboard.slice(0, 8).map(l => l.estimator)} series={[{ name: "best", values: leaderboard.leaderboard.slice(0, 8).map(l => l.best) }]} palette="forest" height={Math.max(150, leaderboard.leaderboard.slice(0, 8).length * 26 + 20)} valueFormatter={v => v.toFixed(1)} />
        </ChartFrame>
        <ChartFrame title="Score timeline" subtitle="Every ranked run in order">
          <LineChart labels={leaderboard.timeline.map(t => t.estimator.slice(0, 8))} series={[{ name: "score", values: leaderboard.timeline.map(t => t.score ?? 0) }]} palette="violet" markers height={220} />
        </ChartFrame>
        <ChartFrame title="Runs per task" subtitle="Coverage across task types">
          <BarChart labels={Object.keys(leaderboard.task_counts)} series={[{ name: "runs", values: Object.values(leaderboard.task_counts) }]} palette="sunset" height={220} />
        </ChartFrame>
      </div>
      <div className="leader-table">
        <DataTable columns={["rank", "name", "estimator", "task_type", "score", "status", "created_at"]} rows={filteredLeaderboard.slice(0, 15).map(r => ({ rank: r.rank ?? "—", name: r.name, estimator: r.estimator, task_type: r.task_type, score: r.score ?? "—", status: r.status, created_at: new Date(r.created_at).toLocaleString() }))} empty="No experiments yet — train a model above." />
      </div>
      <div className="run-actions">{filteredLeaderboard.slice(0, 10).map(r => <div className="run-chip" key={r.id}>
        <button className="link-button" onClick={() => void openExperiment(r.id)}><TrendingUp size={12} /> {r.name.slice(0, 40)}</button>
        <span className="score-pill">{r.score?.toFixed(1) ?? "—"}</span>
        <button className="icon-button" title="Deploy" onClick={() => deployModel(r.id)}><Rocket size={12} /></button>
        <button className="icon-button" title="Download" onClick={() => downloadPath(`api/models/${r.id}/download`)}><Download size={12} /></button>
        <button className="icon-button" title="Compare" onClick={() => setCompareIds(prev => prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id].slice(-4))} style={compareIds.includes(r.id) ? { color: "#8b5cf6", background: "#f3e8ff" } : {}}><GitCompare size={12} /></button>
        <button className="icon-button" title="Delete" onClick={() => void removeExperiment(r.id)}><Trash2 size={12} /></button>
      </div>)}</div>
      {compareIds.length >= 2 && <div className="inline-controls" style={{ marginTop: 8 }}>
        <button className="btn-studio" onClick={() => void runCompare()} style={{ background: "linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)" }}><GitCompare size={13} /> Compare {compareIds.length} runs</button>
        <button className="btn-quiet" onClick={() => { setCompareIds([]); setComparison(null); }}>Clear</button>
      </div>}
      {comparison && <ComparisonView comparison={comparison} palette={palette} />}
    </Panel>}

    {sweep && <Panel title="Sweep results" subtitle="Every candidate trained with identical folds & seed" color="#0ea5e9">
      <BarChart labels={sweep.ranked.map(r => r.estimator)} series={[{ name: "score", values: sweep.ranked.map(r => r.score ?? 0) }]} palette="ocean" height={240} />
      <DataTable columns={["estimator", "status", "detail"]} rows={sweep.runs.map(r => ({ estimator: r.estimator, status: r.ok ? "trained" : "failed", detail: r.ok ? Object.entries(r.metrics ?? {}).filter(([, v]) => typeof v === "number").slice(0, 3).map(([k, v]) => `${k} ${Number(v).toFixed(3)}`).join(" · ") : r.error ?? "" }))} />
    </Panel>}

    {selected && charts && <Panel title={`Run detail — ${selected.name}`} subtitle={`${selected.estimator.replaceAll("_", " ")} · ${selected.task_type} · ${new Date(selected.created_at).toLocaleString()}`} color="#8b5cf6"
      action={<div className="inline-controls"><button className="btn-quiet small" onClick={() => downloadPath(`api/models/${selected.experiment_id}/download`)}><Download size={12} /> Model</button><button className="btn-studio small" onClick={() => deployModel(selected.experiment_id)} style={{ background: "linear-gradient(90deg, #0ea5e9 0%, #0284c7 100%)" }}><Rocket size={12} /> Deploy</button></div>}>
      <Tabs color="#8b5cf6" value={detailTab} onChange={setDetailTab} tabs={[
        { id: "overview", label: <><Gauge size={13} /> Overview</> },
        { id: "performance", label: <><LineIcon size={13} /> Performance</> },
        { id: "errors", label: <><Target size={13} /> Errors</> },
        { id: "explain", label: <><Brain size={13} /> Explainability</> },
        { id: "data", label: <><Layers size={13} /> Data & inference</> },
      ]} />
      {detailTab === "overview" && <div className="chart-grid three">
        <ChartFrame title="Composite score" subtitle="Ranked on the same scale as the leaderboard">
          <div className="gauge-center"><GaugeRing value={scoreOf(selected.task_type, selected.metrics)} color="#8b5cf6" size={130} label="SCORE" /></div>
        </ChartFrame>
        <ChartFrame title="Metric profile" subtitle="All reported metrics">
          <MetricBarList items={charts.metric_bars.filter(m => m.value !== null).slice(0, 9).map(m => ({ label: m.metric, value: m.value }))} palette="violet" format={v => v.toFixed(3)} />
        </ChartFrame>
        <ChartFrame title="Cross-validation stability" subtitle="Mean ± spread across folds">
          <MetricBarList items={charts.cv.folds.map(f => ({ label: `${f.metric} (σ ${f.std.toFixed(3)})`, value: f.mean }))} palette="forest" format={v => v.toFixed(3)} />
        </ChartFrame>
        <ChartFrame title="Model vs baseline" subtitle="Does the model beat a naive baseline?" className="span-2">
          <BarChart labels={Object.keys(charts.baseline)} series={[{ name: "baseline", values: Object.values(charts.baseline) }, { name: "model", values: Object.keys(charts.baseline).map(k => Number(selected.metrics[k.replace("baseline_", "")] ?? 0)) }]} grouped palette="sunset" height={230} />
        </ChartFrame>
        <ChartFrame title="Fold-level variability" subtitle="Spread tells you how much to trust the score">
          <BarChart labels={charts.cv.folds.map(f => f.metric)} series={[{ name: "std", values: charts.cv.folds.map(f => f.std) }]} palette="candy" height={220} />
        </ChartFrame>
      </div>}
      {detailTab === "performance" && <div className="chart-grid three">
        {selected.task_type === "classification" ? <>
          <ChartFrame title="ROC curve" subtitle="True vs false positive rate" className="span-2">
            {charts.roc.length ? <LineChart labels={charts.roc.map((_, i) => String(i))} series={[{ name: "TPR", values: charts.roc.map(p => p[1]) }]} palette="violet" area height={250} /> : <EmptyChart message="ROC needs probability outputs." />}
          </ChartFrame>
          <ChartFrame title="Confusion matrix" subtitle="Actual vs predicted">
            <ConfusionMatrix labels={charts.labels} matrix={charts.confusion} />
          </ChartFrame>
          <ChartFrame title="Precision-recall curve" subtitle="Class balance sensitivity" className="span-2">
            {charts.pr_curve.length ? <LineChart labels={charts.pr_curve.map((_, i) => String(i))} series={[{ name: "Precision", values: charts.pr_curve.map(p => p[1]) }]} palette="forest" height={230} /> : <EmptyChart message="No PR curve available." />}
          </ChartFrame>
          <ChartFrame title="Calibration" subtitle="Predicted vs observed probability">
            {charts.calibration.length ? <BarChart labels={charts.calibration.map(c => c.bin)} series={[{ name: "predicted", values: charts.calibration.map(c => (c.predicted ?? 0) * 100) }, { name: "observed", values: charts.calibration.map(c => (c.observed ?? 0) * 100) }]} grouped palette="ocean" height={230} /> : <EmptyChart message="Calibration unavailable." />}
          </ChartFrame>
          <ChartFrame title="Probability distribution" subtitle="How confident are predictions?">
            <Histogram labels={charts.probability_histogram.labels} values={charts.probability_histogram.values} palette="ocean" height={210} />
          </ChartFrame>
          <ChartFrame title="Learning curve" subtitle={charts.learning_curve?.scoring ? `scoring: ${charts.learning_curve.scoring}` : "train vs validation"}>
            {charts.learning_curve?.labels?.length ? <LineChart labels={charts.learning_curve.labels.map(String)} series={[{ name: "train", values: charts.learning_curve.train }, { name: "validation", values: charts.learning_curve.test }]} palette="sunset" markers height={210} /> : <EmptyChart message="Learning curve unavailable for this model." />}
          </ChartFrame>
          <ChartFrame title="Per-class quality" subtitle="Precision and recall by class">
            {charts.per_class.length ? <BarChart labels={charts.per_class.map(c => c.class)} series={[{ name: "precision", values: charts.per_class.map(c => c.precision * 100) }, { name: "recall", values: charts.per_class.map(c => c.recall * 100) }]} grouped palette="candy" height={210} /> : <EmptyChart message="No per-class statistics." />}
          </ChartFrame>
        </> : <>
          <ChartFrame title="Predicted vs actual" subtitle="Points near the diagonal are accurate" className="span-2">
            {charts.pred_vs_actual.length ? <ScatterChart points={charts.pred_vs_actual} xLabel="actual" yLabel="predicted" palette={palette} height={250} /> : <EmptyChart message="Run a regression model to see this chart." />}
          </ChartFrame>
          <ChartFrame title="Residual histogram" subtitle="Should be centred on zero">
            {charts.residuals.labels?.length ? <Histogram labels={charts.residuals.labels} values={charts.residuals.values} palette="sunset" height={220} /> : <EmptyChart message="No residual data." />}
          </ChartFrame>
          <ChartFrame title="Residual scatter" subtitle="Look for funnels or curvature">
            {charts.residuals.points?.length ? <ScatterChart points={charts.residuals.points} xLabel="predicted" yLabel="residual" palette="violet" height={220} /> : <EmptyChart message="No residual data." />}
          </ChartFrame>
          <ChartFrame title="Error summary" subtitle="Residual diagnostics">
            <MetricBarList items={[{ label: "residual mean", value: charts.residuals.mean ?? 0 }, { label: "residual std", value: charts.residuals.std ?? 0 }, { label: "max |error|", value: charts.residuals.max_abs ?? 0 }]} palette="candy" format={v => v.toFixed(3)} />
          </ChartFrame>
          <ChartFrame title="Learning curve" subtitle="Train vs validation score">
            {charts.learning_curve?.labels?.length ? <LineChart labels={charts.learning_curve.labels.map(String)} series={[{ name: "train", values: charts.learning_curve.train }, { name: "validation", values: charts.learning_curve.test }]} palette="forest" markers height={220} /> : <EmptyChart message="Learning curve unavailable." />}
          </ChartFrame>
        </>}
      </div>}
      {detailTab === "errors" && <div className="chart-grid three">
        <ChartFrame title="Highest-error observations" subtitle="Regression focal points" className="span-2">
          {charts.residuals.points?.length ? <ScatterChart points={[...charts.residuals.points].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 120)} xLabel="predicted" yLabel="error" palette="sunset" height={240} /> : <EmptyChart message="Error inspection is available for regression models." />}
        </ChartFrame>
        <ChartFrame title="Confusion hot spots" subtitle="Largest misclassifications">
          <MetricBarList items={confusionPairs(charts.labels, charts.confusion).slice(0, 8).map(p => ({ label: p.label, value: p.value }))} palette="sunset" format={v => v.toFixed(0)} />
        </ChartFrame>
        <ChartFrame title="Class confusion share" subtitle="Proportion of mistakes by true class">
          <BarChart labels={charts.labels} series={[{ name: "errors", values: charts.confusion.map((row, i) => row.reduce((s, v, j) => s + (i === j ? 0 : v), 0)) }]} palette="sunset" height={200} />
        </ChartFrame>
        <ChartFrame title="Per-class recall" subtitle="Where the model is weakest">
          <BarChart labels={charts.per_class.map(c => c.class)} series={[{ name: "recall %", values: charts.per_class.map(c => c.recall * 100) }]} palette="ocean" height={200} />
        </ChartFrame>
        <ChartFrame title="Support per class" subtitle="Sample counts driving the metrics">
          <PieChart labels={charts.per_class.map(c => c.class)} values={charts.per_class.map(c => c.support)} donut={false} palette={palette} height={200} />
        </ChartFrame>
      </div>}
      {detailTab === "explain" && <div className="chart-grid three">
        <ChartFrame title="Feature importance" subtitle="Signed contribution" className="span-2">
          <BarChart horizontal labels={charts.importance.slice(0, 10).map(i => i.feature)} series={[{ name: "importance", values: charts.importance.slice(0, 10).map(i => i.value) }]} palette="violet" height={Math.max(180, charts.importance.slice(0, 10).length * 28 + 20)} />
        </ChartFrame>
        <ChartFrame title="Contribution share" subtitle="Share of total importance">
          <PieChart labels={charts.feature_share.slice(0, 6).map(f => f.feature)} values={charts.feature_share.slice(0, 6).map(f => f.pct)} donut={true} palette="candy" height={210} />
        </ChartFrame>
        <ChartFrame title="Top drivers ranked" subtitle="The handful of features that matter">
          <MetricBarList items={charts.importance.slice(0, 8).map(i => ({ label: i.feature, value: i.value }))} palette="forest" format={v => v.toFixed(3)} />
        </ChartFrame>
        <ChartFrame title="Signed coefficients" subtitle="Direction of effect" className="span-2">
          <BarChart labels={charts.importance.slice(0, 8).map(i => i.feature)} series={[{ name: "signed", values: charts.importance.slice(0, 8).map(i => i.signed) }]} palette="ocean" height={220} />
        </ChartFrame>
      </div>}
      {detailTab === "data" && <div className="chart-grid three">
        <ChartFrame title="Training split" subtitle="Rows used for fitting vs testing" className="span-2">
          <PieChart labels={["train", "test"]} values={[charts.dataset.train_rows ?? 0, charts.dataset.test_rows ?? 0]} donut palette={palette} height={220} />
        </ChartFrame>
        <ChartFrame title="Dataset facts" subtitle="What was fed to the pipeline">
          <div className="mini-stats vertical">{[["rows", charts.dataset.rows], ["features", charts.dataset.features], ["numeric", charts.dataset.numeric_features], ["categorical", charts.dataset.categorical_features]].map(([k, v]) => <div key={String(k)}><small>{String(k)}</small><b>{Number(v ?? 0).toLocaleString()}</b></div>)}</div>
        </ChartFrame>
        <ChartFrame title="Parameters" subtitle="Final estimator configuration" className="span-2">
          <DataTable columns={["parameter", "value"]} rows={Object.entries(charts.estimator_params).slice(0, 14).map(([k, v]) => ({ parameter: k, value: typeof v === "object" ? JSON.stringify(v) : String(v) }))} maxHeight={220} />
        </ChartFrame>
        <ChartFrame title="Live inference" subtitle="Send a JSON row to the deployed endpoint" action={<div className="inline-controls"><button className="btn-quiet small" onClick={sampleRow}><Plus size={11} /> Sample row</button><button className="btn-studio small" onClick={() => void predict()} style={{ background: "linear-gradient(90deg, #10b981 0%, #059669 100%)" }}><PlayCircle size={11} /> Predict</button></div>} className="span-3">
          <textarea className="control-input mono inference-box" value={inferenceRows} onChange={e => setInferenceRows(e.target.value)} rows={3} placeholder='{"feature": value}' />
          {predictions && <div className="prediction-pills">{predictions.map((p, i) => <span key={i}>{p}</span>)}</div>}
        </ChartFrame>
      </div>}
    </Panel>}

    {!selected && <Panel title="Run explorer" subtitle="Pick any registered experiment to inspect its visuals" color="#94a3b8">
      <EmptyChart height={120} message="Train a model or click a run in the leaderboard to explore its diagnostics." />
    </Panel>}
  </section>;
}

function scoreOf(task: string, metrics: Metrics) {
  if (task === "classification") return 100 * (0.6 * Number(metrics.f1_macro ?? 0) + 0.4 * Number(metrics.accuracy ?? 0));
  if (task === "regression") return Math.max(0, Math.min(100, 100 * Number(metrics.r2 ?? 0)));
  return 0;
}

function confusionPairs(labels: string[], matrix: number[][]) {
  const pairs: { label: string; value: number }[] = [];
  (matrix || []).forEach((row, i) => row.forEach((v, j) => { if (i !== j && v > 0) pairs.push({ label: `${labels[j] ?? j} predicted as ${labels[i] ?? i}`, value: v }); }));
  return pairs.sort((a, b) => b.value - a.value);
}

function ComparisonView({ comparison, palette }: { comparison: { metrics: string[]; rows: { name: string; estimator: string; metrics: Record<string, number | null> }[] }; palette: string }) {
  return <div className="chart-grid two" style={{ marginTop: 12 }}>
    <ChartFrame title="Metric-by-metric comparison" subtitle="Selected runs side by side">
      <BarChart labels={comparison.metrics.slice(0, 6)} series={comparison.rows.map(r => ({ name: r.estimator, values: comparison.metrics.slice(0, 6).map(m => r.metrics[m] ?? 0) }))} grouped palette={palette} height={230} />
    </ChartFrame>
    <ChartFrame title="Head-to-head" subtitle="Relative positioning">
      <BarChart horizontal labels={comparison.rows.map(r => r.estimator)} series={[{ name: "first metric", values: comparison.rows.map(r => r.metrics[comparison.metrics[0]] ?? 0) }]} palette="violet" height={230} />
    </ChartFrame>
    <div className="span-2"><DataTable columns={comparison.metrics} rows={comparison.rows.map(r => r.metrics)} /></div>
  </div>;
}
