"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeftRight, ArrowUp, CheckCircle, ChevronDown, ChevronUp, Clock, Copy, FlaskConical, Gauge, History, Layers, ListChecks, Play, Plus, RefreshCw, RotateCcw, Search, SlidersHorizontal, Sparkles, Trash2, Undo2, WandSparkles, Wrench, X } from "lucide-react";
import { ChartFrame, EmptyChart, Histogram, MetricBarList } from "./charts";
import { ChipPicker, DataTable, PageTitle, Panel, ParamField, ParamSpec, Segmented, Slider, Tabs, Toggle } from "./ui";
import { Dataset, Profile, useSettings } from "./studio-types";
import { api } from "@/lib/api";

export type CleanOp = { id: string; label: string; category: string; columns_mode: "multi" | "multi_required" | "single" | "subset" | "none"; params: ParamSpec[] };
export type RecipeStep = { id: string; operation: string; column?: string | null; columns?: string[]; options: Record<string, unknown>; enabled: boolean };
type Version = { version: number; action: string; details: Record<string, unknown>; created_at: string };
type PreviewResult = { ok: boolean; preview: { operation: string; affected: number; rows_before: number; rows_after: number; columns_before: number; columns_after: number; added_columns: string[]; removed_columns: string[]; missing_before: number; missing_after: number; detail: Record<string, unknown>; before: Record<string, unknown>[]; after: Record<string, unknown>[]; sample_columns: string[] } };

const CATEGORY_ICONS: Record<string, React.ReactNode> = { All: <Layers size={12} />, Text: <Sparkles size={12} />, Missing: <Gauge size={12} />, Duplicates: <Copy size={12} />, Types: <SlidersHorizontal size={12} />, "Date/Time": <Clock size={12} />, Outliers: <ArrowLeftRight size={12} />, Transform: <Wrench size={12} />, Categorical: <ListChecks size={12} />, Structure: <Layers size={12} />, Filter: <Search size={12} />, Validation: <CheckCircle size={12} /> };

export function CleaningSection({ active, profile, catalog, activeCat, setActiveCat, filter, setFilter, options, setOptions, selectedColumns, setSelectedColumns, preview, setPreview, apply, undo, redo, canRedo, busy, versions, loadVersions, restoreVersion, recipe, setRecipe, runRecipe }: {
  active: Dataset | null; profile: Profile | null; catalog: CleanOp[]; activeCat: string; setActiveCat: (v: string) => void; filter: string; setFilter: (v: string) => void;
  options: Record<string, Record<string, unknown>>; setOptions: (updater: (prev: Record<string, Record<string, unknown>>) => Record<string, Record<string, unknown>>) => void;
  selectedColumns: string[]; setSelectedColumns: (v: string[]) => void; preview: { op: string; result: PreviewResult } | null; setPreview: (v: { op: string; result: PreviewResult } | null) => void;
  apply: (op: string, dryRun?: boolean) => Promise<void>; undo: () => void; redo: () => void; canRedo: boolean; busy: boolean;
  versions: Version[]; loadVersions: () => void; restoreVersion: (v: number) => void;
  recipe: RecipeStep[]; setRecipe: (updater: (prev: RecipeStep[]) => RecipeStep[]) => void; runRecipe: () => void;
}) {
  const { settings, update } = useSettings();
  const cfg = settings?.cleaning;
  const [showVersions, setShowVersions] = useState(false);
  const [expandedOp, setExpandedOp] = useState<string | null>(null);
  const [customStep, setCustomStep] = useState<{ operation: string; sql: string; filter: string; aggregate: string; group: string; metric: string }>({ operation: "filter", sql: "", filter: "", aggregate: "sum", group: "", metric: "" });
  const [tab, setTab] = useState<"ops" | "recipe">("ops");
  const columns = active?.column_names ?? [];
  const categories = useMemo(() => ["All", ...Array.from(new Set(catalog.map(c => c.category)))], [catalog]);
  const filtered = catalog.filter(op => (activeCat === "All" || op.category === activeCat) && (!filter || `${op.id} ${op.label} ${op.category}`.toLowerCase().includes(filter.toLowerCase())));

  useEffect(() => {
    (async () => { if (active) await loadVersions(); })();
    // Reload lineage whenever the dataset or its version count changes.
  }, [active, versions.length, loadVersions]);

  const opOptions = (op: string): Record<string, unknown> => ({ ...(cfg ? { strategy: cfg.default_strategy, constant: cfg.constant_value, threshold: cfg.outlier_threshold, keep: cfg.duplicate_keep } : {}), ...(options[op] || {}) });
  const setOpOption = (op: string, key: string, value: unknown) => setOptions(prev => ({ ...prev, [op]: { ...(prev[op] || {}), [key]: value } }));

  return <section>
    <PageTitle eyebrow="DATA PREPARATION" title="Cleaning Studio" desc="Every operation exposes its parameters. Preview the before/after result, batch steps into a reproducible recipe, then commit — with full version history and redo." color="#10b981"
      actions={<div className="inline-controls">
        <button className="btn-quiet" onClick={undo} disabled={!active || busy}><Undo2 size={13} /> Undo</button>
        <button className="btn-quiet" onClick={redo} disabled={!active || busy || !canRedo}><RotateCcw size={13} /> Redo</button>
        <button className="btn-quiet" onClick={() => { setShowVersions(s => !s); loadVersions(); }} disabled={!active}><History size={13} /> History ({versions.length})</button>
      </div>} />

    {active && profile && <div className="kpi-row">
      {[{ label: "ROWS", value: profile.rows.toLocaleString(), color: "#10b981", sub: "current version" }, { label: "MISSING", value: profile.missing_count.toLocaleString(), color: "#f59e0b", sub: `${profile.missing_pct}% of cells` }, { label: "DUPLICATES", value: profile.duplicate_count.toLocaleString(), color: "#ef4444", sub: "exact row copies" }, { label: "HEALTH SCORE", value: `${profile.quality_score}/100`, color: "#6366f1", sub: "completeness + uniqueness" }, { label: "VERSIONS", value: String(versions.length), color: "#0ea5e9", sub: "undo/redo history" }].map(k =>
        <div className="kpi-tile" key={k.label} style={{ borderColor: `${k.color}40`, background: `linear-gradient(135deg, white 0%, ${k.color}0d 100%)` }}><div><small style={{ color: k.color }}>{k.label}</small><strong style={{ color: k.color }}>{k.value}</strong><em>{k.sub}</em></div></div>)}
    </div>}

    {showVersions && <Panel title="Version history" subtitle="Restore any previous snapshot" color="#6366f1" action={<button className="btn-quiet small" onClick={loadVersions}><RefreshCw size={12} /> Refresh</button>}>
      <div className="version-list">{versions.map(v => <div className="version-row" key={v.version}>
        <span className="version-badge">v{v.version}</span>
        <div><b>{String(v.action).replaceAll("_", " ")}</b><small>{new Date(v.created_at).toLocaleString()} · {Number((v.details as { affected?: number }).affected ?? 0).toLocaleString()} affected</small></div>
        <button className="btn-quiet small" onClick={() => restoreVersion(v.version)} disabled={busy}>Restore</button>
      </div>)}{!versions.length && <div className="muted">No versions yet.</div>}</div>
    </Panel>}

    <div className="two-column">
      <Panel title="Missingness overview" subtitle="Where the gaps are" color="#f59e0b">
        <MetricBarList items={profile?.column_profiles.map(c => ({ label: c.name, value: c.missing_pct })).sort((a, b) => b.value - a.value).slice(0, 8) ?? []} palette="sunset" format={v => `${v.toFixed(1)}%`} />
        <div className="mini-stats">
          <div><small>Rows with gaps</small><b>{profile ? Math.round(profile.rows * (1 - profile.dimensions.completeness / 100)).toLocaleString() : "—"}</b></div>
          <div><small>Complete rows</small><b>{profile ? Math.round(profile.rows * profile.dimensions.completeness / 100).toLocaleString() : "—"}</b></div>
          <div><small>Columns affected</small><b>{profile?.column_profiles.filter(c => c.missing > 0).length ?? 0}</b></div>
        </div>
      </Panel>
      <Panel title="Quality recommendations" subtitle={`${profile?.recommendations.length ?? 0} signals`} color="#8b5cf6">
        {profile?.recommendations.map(x => <div className="issue" key={x.title}><span className={`signal-dot ${x.severity}`}>{x.severity === "success" ? <CheckCircle size={12} /> : <Wrench size={12} />}</span><div><b>{x.title}</b><small>{x.detail}</small></div></div>)}
        {!profile && <EmptyChart height={100} message="Select a dataset to see recommendations." />}
      </Panel>
    </div>

    <div className="section-toolbar">
      <Tabs tabs={[{ id: "ops", label: <><WandSparkles size={13} /> Operations</>, count: catalog.length }, { id: "recipe", label: <><Play size={13} /> Recipe (batch)</>, count: recipe.length }]} value={tab} onChange={setTab} color="#10b981" />
      <div className="inline-controls">
        <label className="search-box"><Search size={13} /><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search operations" /></label>
        <Toggle checked={Boolean(cfg?.auto_preview)} onChange={v => void update({ cleaning: { auto_preview: v } })} label="Auto-preview" />
      </div>
    </div>

    {tab === "ops" && <>
      <div className="chip-categories">{categories.map(c => <button key={c} className={`chip ${activeCat === c ? "on" : ""}`} onClick={() => setActiveCat(c)}>{CATEGORY_ICONS[c] ?? null} {c}</button>)}</div>
      <Panel title="Target columns" subtitle="Leave empty to apply to every applicable column" color="#0ea5e9" action={<button className="btn-quiet small" onClick={() => setSelectedColumns(columns)} disabled={!columns.length}>Select all</button>}>
        <ChipPicker options={columns} value={selectedColumns} onChange={setSelectedColumns} emptyText="Select a dataset first." />
      </Panel>
      <div className="op-grid">
        {filtered.map(op => {
          const open = expandedOp === op.id;
          const opts = opOptions(op.id);
          const chosenColumn = String(opts.column ?? selectedColumns[0] ?? columns[0] ?? "");
          return <div className={`op-card ${open ? "open" : ""}`} key={op.id}>
            <button className="op-card-head" onClick={() => setExpandedOp(open ? null : op.id)} aria-expanded={open}>
              <span className="op-cat">{op.category}</span>
              <b>{op.label}</b>
              <small>{op.id.replaceAll("_", " ")}</small>
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {open && <div className="op-card-body">
              {op.columns_mode === "single" && <label className="field">Column<select className="control-select" value={chosenColumn} onChange={e => setOpOption(op.id, "column", e.target.value)}>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></label>}
              {op.columns_mode === "subset" && <label className="field">Subset key column<select className="control-select" value={chosenColumn} onChange={e => setOpOption(op.id, "column", e.target.value)}>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></label>}
              {op.params.map(p => <ParamField key={p.id} spec={p} value={opts[p.id] ?? p.default} onChange={v => setOpOption(op.id, p.id, v)} columns={columns} />)}
              <div className="op-actions">
                <button className="btn-quiet small" disabled={busy || !active} onClick={() => void apply(op.id, true)}><FlaskConical size={12} /> Preview</button>
                <button className="btn-studio small" disabled={busy || !active} onClick={() => void apply(op.id)} style={{ background: "linear-gradient(90deg, #10b981 0%, #059669 100%)" }}><CheckCircle size={12} /> Apply</button>
                <button className="btn-quiet small" disabled={busy || !active} onClick={() => setRecipe(prev => [...prev, { id: crypto.randomUUID(), operation: op.id, column: String(opts.column ?? selectedColumns[0] ?? "") || null, columns: selectedColumns.length ? selectedColumns : (opts.column ? [String(opts.column)] : []), options: opts, enabled: true }])}><Plus size={12} /> Add to recipe</button>
              </div>
            </div>}
          </div>;
        })}
      </div>
      {active && <Panel title="Tuned defaults" subtitle="These values are saved to your project and reused everywhere" color="#64748b" action={<button className="btn-quiet small" onClick={() => void update({ cleaning: { default_strategy: "median", constant_value: "Unknown", outlier_threshold: 1.5, duplicate_keep: "first", category_threshold: 0.9 } })}>Reset defaults</button>}>
        <div className="settings-grid">
          <label className="field">Imputation strategy<select className="control-select" value={cfg?.default_strategy ?? "median"} onChange={e => void update({ cleaning: { default_strategy: e.target.value } })}>{["median", "mean", "mode", "constant", "ffill", "bfill", "zero"].map(o => <option key={o}>{o}</option>)}</select></label>
          <label className="field">Constant fallback<input className="control-input" value={cfg?.constant_value ?? "Unknown"} onChange={e => void update({ cleaning: { constant_value: e.target.value } })} /></label>
          <label className="field">Duplicates: keep<select className="control-select" value={cfg?.duplicate_keep ?? "first"} onChange={e => void update({ cleaning: { duplicate_keep: e.target.value } })}><option value="first">First occurrence</option><option value="last">Last occurrence</option></select></label>
          <Slider label="Outlier threshold" value={cfg?.outlier_threshold ?? 1.5} min={0.5} max={5} step={0.1} onChange={v => void update({ cleaning: { outlier_threshold: v } })} format={v => v.toFixed(1)} />
          <Slider label="Category similarity" value={cfg?.category_threshold ?? 0.9} min={0.5} max={1} step={0.01} onChange={v => void update({ cleaning: { category_threshold: v } })} format={v => v.toFixed(2)} />
        </div>
      </Panel>}
    </>}

    {tab === "recipe" && <Panel title="Cleaning recipe" subtitle="Chain operations and run them as one versioned transaction" color="#10b981" action={<div className="inline-controls">
      <button className="btn-quiet small" onClick={() => setRecipe(() => [])} disabled={!recipe.length}>Clear</button>
      <button className="btn-studio small" onClick={runRecipe} disabled={busy || !active || !recipe.length} style={{ background: "linear-gradient(90deg, #10b981 0%, #059669 100%)" }}><Play size={12} /> Run recipe ({recipe.filter(r => r.enabled).length})</button>
    </div>}>
      {!recipe.length && <EmptyChart height={120} message="No steps yet. Add operations from the Operations tab, or create a custom step below." />}
      <div className="recipe-list">{recipe.map((step, i) => <div className={`recipe-step ${step.enabled ? "" : "off"}`} key={step.id}>
        <span className="recipe-index">{i + 1}</span>
        <div className="recipe-main"><b>{step.operation.replaceAll("_", " ")}</b><small>{step.columns?.length ? `columns: ${step.columns.slice(0, 4).join(", ")}${step.columns.length > 4 ? "…" : ""}` : step.column ? `column: ${step.column}` : "all applicable columns"} · {Object.entries(step.options).filter(([, v]) => v !== "" && v !== undefined && v !== null).slice(0, 3).map(([k, v]) => `${k}=${String(v)}`).join(", ") || "defaults"}</small></div>
        <div className="recipe-actions">
          <button className="icon-button" title="Move up" disabled={i === 0} onClick={() => setRecipe(prev => { const next = [...prev]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; return next; })}><ArrowUp size={13} /></button>
          <button className="icon-button" title="Move down" disabled={i === recipe.length - 1} onClick={() => setRecipe(prev => { const next = [...prev]; [next[i + 1], next[i]] = [next[i], next[i + 1]]; return next; })}><ArrowDown size={13} /></button>
          <button className="icon-button" title={step.enabled ? "Disable" : "Enable"} onClick={() => setRecipe(prev => prev.map(s => s.id === step.id ? { ...s, enabled: !s.enabled } : s))}>{step.enabled ? <CheckCircle size={13} /> : <X size={13} />}</button>
          <button className="icon-button" title="Remove" onClick={() => setRecipe(prev => prev.filter(s => s.id !== step.id))}><Trash2 size={13} /></button>
        </div>
      </div>)}</div>
      <div className="custom-step">
        <h4><Sparkles size={14} /> Custom step / SQL-style control</h4>
        <div className="settings-grid">
          <label className="field">Step type<select className="control-select" value={customStep.operation} onChange={e => setCustomStep(s => ({ ...s, operation: e.target.value }))}><option value="filter">Row filter</option><option value="aggregate">Aggregate preview</option><option value="sql">Read-only SQL query</option></select></label>
          {customStep.operation === "filter" && <>
            <label className="field">Column<select className="control-select" value={customStep.metric} onChange={e => setCustomStep(s => ({ ...s, metric: e.target.value }))}>{columns.map(c => <option key={c}>{c}</option>)}</select></label>
            <label className="field">Condition<input className="control-input" value={customStep.filter} onChange={e => setCustomStep(s => ({ ...s, filter: e.target.value }))} placeholder="e.g. equals Paid · or > 100" /></label>
          </>}
          {customStep.operation === "aggregate" && <>
            <label className="field">Group by<select className="control-select" value={customStep.group} onChange={e => setCustomStep(s => ({ ...s, group: e.target.value }))}>{columns.map(c => <option key={c}>{c}</option>)}</select></label>
            <label className="field">Metric<select className="control-select" value={customStep.metric} onChange={e => setCustomStep(s => ({ ...s, metric: e.target.value }))}>{columns.map(c => <option key={c}>{c}</option>)}</select></label>
            <label className="field">Aggregation<select className="control-select" value={customStep.aggregate} onChange={e => setCustomStep(s => ({ ...s, aggregate: e.target.value }))}>{["count", "sum", "mean", "median"].map(o => <option key={o}>{o}</option>)}</select></label>
          </>}
          {customStep.operation === "sql" && <label className="field wide">Read-only SQL<input className="control-input mono" value={customStep.sql} onChange={e => setCustomStep(s => ({ ...s, sql: e.target.value }))} placeholder="SELECT region, AVG(amount) FROM dataset GROUP BY region" /></label>}
        </div>
        <div className="inline-controls">
          {customStep.operation !== "sql" && <button className="btn-quiet small" onClick={() => {
            if (customStep.operation === "aggregate") { setRecipe(prev => [...prev, { id: crypto.randomUUID(), operation: "filter_rows", column: null, columns: [], options: { operator: "contains", value: "", drop: false }, enabled: true }]); return; }
            const [op, ...rest] = customStep.filter.trim().split(" ");
            const value = rest.join(" ");
            const operator = ["contains", "equals", "greater_than", "less_than", "is_in", "between"].includes(op) ? op : "equals";
            setRecipe(prev => [...prev, { id: crypto.randomUUID(), operation: "filter_rows", column: customStep.metric, columns: [customStep.metric], options: { operator, value: ["contains", "equals"].includes(operator) ? value : customStep.filter, drop: false }, enabled: true }]);
          }}><Plus size={12} /> Add filter step</button>}
          {customStep.operation === "aggregate" && active && <button className="btn-quiet small" onClick={async () => { try { const r = await api<{ rows: { label: string; value: number }[] }>(`api/datasets/${active.id}/aggregate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group_by: customStep.group || columns[0], metric: customStep.aggregate === "count" ? null : customStep.metric, aggregation: customStep.aggregate, top_n: 20 }) }); setPreview({ op: `aggregate:${customStep.group}`, result: { ok: true, preview: { operation: "aggregate", affected: r.rows.length, rows_before: active.rows, rows_after: r.rows.length, columns_before: active.columns, columns_after: 2, added_columns: [], removed_columns: [], missing_before: 0, missing_after: 0, detail: { group_by: customStep.group, metric: customStep.metric, aggregation: customStep.aggregate }, before: [], after: r.rows.map(x => ({ label: x.label, value: x.value })), sample_columns: ["label", "value"] } } }); } catch (e) { setPreview({ op: "aggregate", result: { ok: false, preview: { operation: "aggregate", affected: 0, rows_before: 0, rows_after: 0, columns_before: 0, columns_after: 0, added_columns: [], removed_columns: [], missing_before: 0, missing_after: 0, detail: { error: e instanceof Error ? e.message : "failed" }, before: [], after: [], sample_columns: [] } } }); } }}><Play size={12} /> Run preview</button>}
          <span className="muted small-note">Custom SQL runs read-only against the active dataset copy.</span>
        </div>
      </div>
    </Panel>}

    {preview && <PreviewPanel preview={preview} onClose={() => setPreview(null)} onApply={(op) => apply(op)} busy={busy} palette={settings?.plots.palette} />}

    {active && profile && <Panel title="Version lineage" subtitle="Each clean commits a new immutable CSV snapshot" color="#6366f1">
      <div className="timeline">{versions.slice(0, 8).map(v => <div className="timeline-item" key={v.version}><i /><div><b>v{v.version} · {String(v.action).replaceAll("_", " ")}</b><small>{new Date(v.created_at).toLocaleString()}</small></div></div>)}</div>
    </Panel>}
  </section>;
}

function PreviewPanel({ preview, onClose, onApply, busy, palette = "ocean" }: { preview: { op: string; result: PreviewResult }; onClose: () => void; onApply: (op: string) => void; busy: boolean; palette?: string }) {
  const p = preview.result.preview;
  const [side, setSide] = useState<"before" | "after">("after");
  const error = (p.detail as { error?: string })?.error;
  return <Panel title={`Dry-run preview — ${preview.op.replaceAll("_", " ")}`} subtitle="Nothing is saved until you apply" color="#f59e0b" action={<div className="inline-controls">
    <button className="btn-quiet small" onClick={onClose}><X size={12} /> Close</button>
    {!error && preview.op !== "aggregate" && <button className="btn-studio small" disabled={busy} onClick={() => onApply(preview.op)} style={{ background: "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)" }}><CheckCircle size={12} /> Apply now</button>}
  </div>}>
    {error ? <div className="inline-alert">Preview failed: {error}</div> : <>
      <div className="preview-stats">
        <div><small>Affected</small><b>{p.affected.toLocaleString()}</b></div>
        <div><small>Rows</small><b>{p.rows_before.toLocaleString()} → {p.rows_after.toLocaleString()}</b></div>
        <div><small>Columns</small><b>{p.columns_before} → {p.columns_after}</b></div>
        <div><small>Missing cells</small><b>{p.missing_before.toLocaleString()} → {p.missing_after.toLocaleString()}</b></div>
        <div><small>Row delta</small><b>{p.rows_after - p.rows_before >= 0 ? "+" : ""}{(p.rows_after - p.rows_before).toLocaleString()}</b></div>
      </div>
      {(p.added_columns.length > 0 || p.removed_columns.length > 0) && <div className="inline-alert" style={{ background: "#f0f9ff", borderColor: "#bae6fd", color: "#0369a1" }}>
        {p.added_columns.length > 0 && <>Added: <b>{p.added_columns.join(", ")}</b>. </>}{p.removed_columns.length > 0 && <>Removed: <b>{p.removed_columns.join(", ")}</b>.</>}
      </div>}
      <div className="chart-grid two">
        <ChartFrame title="Result shape" subtitle="Rows and missing cells after the operation">
          <Histogram labels={["rows before", "rows after", "missing before", "missing after"]} values={[p.rows_before, p.rows_after, p.missing_before, p.missing_after]} palette={palette} height={180} />
        </ChartFrame>
        <ChartFrame title="Column change" subtitle="Kept vs added vs removed">
          <MetricBarList items={[{ label: "kept", value: p.columns_after - p.added_columns.length }, { label: "added", value: p.added_columns.length }, { label: "removed", value: p.removed_columns.length }]} palette="violet" format={v => v.toFixed(0)} />
        </ChartFrame>
      </div>
      <div className="inline-controls" style={{ marginBottom: 8 }}><Segmented options={[{ id: "before", label: "Before" }, { id: "after", label: "After" }]} value={side} onChange={setSide} color="#f59e0b" /></div>
      <DataTable columns={p.sample_columns} rows={(side === "before" ? p.before : p.after) as Record<string, unknown>[]} maxHeight={260} />
    </>}
  </Panel>;
}
