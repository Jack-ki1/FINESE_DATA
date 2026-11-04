"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, CheckCircle, ChevronRight, Layers, Plus, RefreshCw, Search, SlidersHorizontal, TrendingUp, Wrench } from "lucide-react";
import { BarChart, BoxPlot, ChartFrame, EmptyChart, GaugeRing, Heatmap, Histogram, MetricBarList, PieChart, ScatterChart, fmt } from "./charts";
import { Accordion, DataTable, PageTitle, Panel, Segmented, Slider } from "./ui";
import { ColumnProfile, Dataset, KPI_LABELS, Preview, Profile, useSettings, View } from "./studio-types";

export type Analysis = {
  rows: number; columns: number; column_names: string[]; kinds: Record<string, string>;
  descriptive: { columns: { column: string; count: number; missing: number; mean: number | null; median: number | null; std: number | null; min: number | null; max: number | null; q25: number | null; q75: number | null; q05: number | null; q95: number | null; iqr: number | null; skew: number | null; kurtosis: number | null; outliers: number; outlier_pct: number; unique: number; histogram: { labels: string[]; values: number[] }; box: { low: number; q05: number; q25: number; median: number; q75: number; q95: number; high: number } }[] };
  missing: { columns: string[]; sample_rows: number; cells: number[][]; per_column: { column: string; missing: number; missing_pct: number }[]; rows_with_missing: number; complete_rows: number; complete_pct: number; patterns: { pattern: string; count: number; pct: number }[] };
  outliers: { method: string; threshold: number; columns: { column: string; outliers: number; outlier_pct: number; lower: number | null; upper: number | null; values: number[]; count: number; min: number | null; max: number | null; median: number | null }[]; total_outliers: number; numeric_columns: string[] };
  association: { columns: string[]; matrix: number[][]; pairs: { a: string; b: string; value: number }[]; method: string; scatter: { x: string; y: string; r: number; points: number[][] }[]; categorical: { a: string; b: string; value: number }[]; mixed: { a: string; b: string; value: number }[] };
  distributions: { numeric: { column: string; labels: string[]; values: number[]; mean: number | null; median: number | null; skew: number | null; kind: string }[]; categorical: { column: string; labels: string[]; values: number[]; distinct: number; kind: string }[]; bins: number };
  eda: { frequency: { column: string; labels: string[]; values: number[] }[] };
};

type Props = { datasets: Dataset[]; active: Dataset | null; profile: Profile | null; preview: Preview | null; analysis: Analysis | null; onAnalyze: (params?: { bins?: number; outlierMethod?: string; outlierThreshold?: number; correlationMethod?: string }) => void; onUpload: () => void; onOpen: (id: string) => void; onGo: (v: View) => void; loading: boolean };

const SECTION_DEFS = [
  { key: "Completeness", icon: "🔍", color: "#0ea5e9", desc: "Missing share by column, row completeness and the implied health score." },
  { key: "Missing Heatmap", icon: "🟨", color: "#f59e0b", desc: "Null-density map across the sampled rows plus the most common gap patterns." },
  { key: "Outliers", icon: "📉", color: "#ef4444", desc: "IQR / z-score fences, tail values and which columns carry the risk." },
  { key: "Correlation", icon: "🌡️", color: "#8b5cf6", desc: "Numeric correlation matrix, strongest pairs and cross-type associations." },
  { key: "Distributions", icon: "📈", color: "#10b981", desc: "Shape of every numeric field and the balance of every category." },
] as const;
type SectionKey = typeof SECTION_DEFS[number]["key"];

export function OverviewSection({ datasets, active, profile, preview, analysis, onAnalyze, onUpload, onGo, loading }: Props) {
  const { settings, update } = useSettings();
  const cfg = settings?.overview;
  const overviewConfig = cfg?.histogram_bins;
  const [snapshotSide, setSnapshotSide] = useState<"top" | "bottom">("top");
  const [openSections, setOpenSections] = useState<SectionKey[]>(() => (settings?.overview?.auto_expand ? [settings.overview.auto_expand as SectionKey] : []));
  const [bins, setBins] = useState(16);
  const [outlierMethod, setOutlierMethod] = useState("iqr");
  const [outlierThreshold, setOutlierThreshold] = useState(1.5);
  const [correlationMethod, setCorrelationMethod] = useState("pearson");
  // Seed the tuning controls from saved settings without a state-setting effect.
  const [seeded, setSeeded] = useState<number | null>(null);
  if (cfg && seeded !== cfg.histogram_bins) {
    setSeeded(cfg.histogram_bins);
    setBins(cfg.histogram_bins); setOutlierMethod(cfg.outlier_method); setOutlierThreshold(cfg.outlier_threshold); setCorrelationMethod(cfg.correlation_method);
  }
  const [search, setSearch] = useState("");
  const [columnFilter, setColumnFilter] = useState<"all" | "nominal" | "numeric" | "datetime">("all");
  const palette = settings?.plots.palette ?? "ocean";

  useEffect(() => {
    (async () => { if (active && overviewConfig) onAnalyze({ bins, outlierMethod, outlierThreshold, correlationMethod }); })();
    // Recompute when the dataset or a tuning parameter changes.
  }, [active, bins, outlierMethod, outlierThreshold, correlationMethod, onAnalyze, overviewConfig]);

  const toggle = (key: SectionKey) => setOpenSections(cur => cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key]);
  const expandAll = () => setOpenSections(SECTION_DEFS.map(s => s.key));
  const collapseAll = () => setOpenSections([]);

  const kpiItems = useMemo(() => {
    const keys = cfg?.kpi_row?.length ? cfg.kpi_row : ["rows", "columns", "missing", "duplicates", "memory"];
    const outlierTotal = analysis?.outliers.total_outliers ?? profile?.column_profiles.reduce((s, c) => s + (c.outliers || 0), 0) ?? 0;
    const map: Record<string, { icon: string; value: string; color: string; sub: string }> = {
      rows: { icon: "📊", value: profile ? profile.rows.toLocaleString() : "0", color: "#6366f1", sub: `${datasets.length} dataset${datasets.length === 1 ? "" : "s"} in workspace` },
      columns: { icon: "📋", value: String(profile?.columns ?? 0), color: "#0ea5e9", sub: "fields profiled" },
      missing: { icon: "⚠️", value: `${profile?.missing_pct ?? 0}%`, color: "#f59e0b", sub: `${(profile?.missing_count ?? 0).toLocaleString()} cells` },
      duplicates: { icon: "🔄", value: profile ? `${((profile.duplicate_count / Math.max(1, profile.rows)) * 100).toFixed(1)}%` : "0%", color: "#ef4444", sub: `${(profile?.duplicate_count ?? 0).toLocaleString()} rows` },
      memory: { icon: "💾", value: `${profile?.memory_mb ?? 0} MB`, color: "#10b981", sub: "in-memory footprint" },
      quality: { icon: "✅", value: `${profile?.quality_score ?? 0}/100`, color: "#8b5cf6", sub: "structural health" },
      outliers: { icon: "📉", value: outlierTotal.toLocaleString(), color: "#ec4899", sub: "flagged observations" },
    };
    return keys.filter(k => map[k]).map(k => ({ key: k, label: KPI_LABELS[k] || k.toUpperCase(), ...map[k] }));
  }, [cfg, profile, analysis, datasets.length]);

  const previewCols = (preview?.columns ?? []).slice(0, cfg?.preview_columns ?? 12);
  const previewRows = (snapshotSide === "top" ? preview?.top : preview?.bottom)?.slice(0, cfg?.preview_rows ?? 10) ?? [];
  const columnRows = useMemo(() => {
    const rows = profile?.column_profiles ?? [];
    return rows.filter(c => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
      const matchKind = columnFilter === "all" || (columnFilter === "nominal" ? ["text", "categorical", "boolean"].includes(c.kind) : columnFilter === "numeric" ? c.kind === "numeric" : c.kind === "datetime" || c.kind === "date-like");
      return matchSearch && matchKind;
    }).slice(0, cfg?.column_summary_rows ?? 15).length ? rows : [];
  }, [profile?.column_profiles, search, columnFilter, cfg?.column_summary_rows]);

  if (!active) return <EmptyWorkspace onUpload={onUpload} />;

  return <section className="overview-section">
    <PageTitle eyebrow="WORKSPACE INTELLIGENCE" title="Dataset Overview" desc={active.name ? `${active.name} · ${active.format.toUpperCase()} · ${active.rows.toLocaleString()} rows × ${active.columns} columns` : "Dive into your dataset with comprehensive KPIs and insights."} color="#6366f1"
      actions={<><button className="btn-quiet" onClick={() => onAnalyze({ bins, outlierMethod, outlierThreshold, correlationMethod })} disabled={loading}><RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh analysis</button><button className="btn-studio" onClick={onUpload} style={{ background: "linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)" }}><Plus size={14} /> Add Dataset</button></>} />

    {/* 1. All five KPIs on one row */}
    <div className="kpi-row" data-testid="kpi-row">
      {kpiItems.map(k => <div className="kpi-tile" key={k.key} style={{ borderColor: `${k.color}40`, background: `linear-gradient(135deg, white 0%, ${k.color}0d 100%)` }}>
        <span className="kpi-emoji">{k.icon}</span>
        <div><small style={{ color: k.color }}>{k.label}</small><strong style={{ color: k.color }}>{k.value}</strong><em>{k.sub}</em></div>
      </div>)}
    </div>

    {/* 2. Data snapshot + column summary — directly below the KPI row */}
    {preview && <Panel title="Data Snapshot — First & Last Rows" subtitle={active.name} color="#3b82f6" action={
      <div className="panel-head-actions">
        <Segmented options={[{ id: "top", label: "First rows" }, { id: "bottom", label: "Last rows" }]} value={snapshotSide} onChange={setSnapshotSide} color="#3b82f6" />
      </div>}>
      <div className="table-wrap"><table className="data-table compact">
        <thead><tr style={{ background: "#eff6ff" }}>{previewCols.map(c => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{previewRows.map((r, i) => <tr key={i}>{previewCols.map(c => <td key={c}>{r[c] === null || r[c] === undefined ? <span className="muted">NULL</span> : String(r[c]).slice(0, 34)}</td>)}</tr>)}</tbody>
      </table></div>
      <div className="panel-foot-note">Showing {previewRows.length} of {previewRows.length && profile ? profile.rows.toLocaleString() : "—"} rows · {previewCols.length} of {profile?.columns ?? 0} columns. Tune row/column counts in Settings → Overview.</div>
    </Panel>}

    {profile && <Panel title="Column Summary" subtitle={`${profile.column_profiles.length} columns profiled`} color="#0ea5e9" action={<div className="inline-controls">
      <label className="search-box"><Search size={13} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter columns" /></label>
      <Segmented options={[{ id: "all", label: "All" }, { id: "nominal", label: "Nominal" }, { id: "numeric", label: "Numeric" }, { id: "datetime", label: "Dates" }]} value={columnFilter} onChange={setColumnFilter} color="#0ea5e9" />
    </div>}>
      <div className="table-wrap"><table className="data-table compact">
        <thead><tr style={{ background: "#eff6ff" }}><th>COLUMN</th><th>TYPE</th><th>MISSING</th><th>UNIQUE</th><th>MEAN</th><th>MEDIAN</th><th>RANGE</th><th>OUTLIERS</th></tr></thead>
        <tbody>{columnRows?.length ? columnRows.map((c: ColumnProfile) => <tr key={c.name}>
          <td className="file-name">{c.name}</td><td><span className={`type-pill ${c.kind}`}>{c.kind}</span></td>
          <td>{c.missing_pct}%</td><td>{c.unique}</td><td>{c.mean ?? "—"}</td><td>{c.median ?? "—"}</td>
          <td>{c.min !== undefined ? `${fmt(c.min)} – ${fmt(c.max ?? 0)}` : "—"}</td><td>{c.outliers ?? 0}</td>
        </tr>) : <tr><td colSpan={8} className="muted">No columns match the filter.</td></tr>}</tbody>
      </table></div>
    </Panel>}

    {/* 3. Data quality dashboard (now below the snapshot + column summary) */}
    {profile && <QualityDashboard profile={profile} analysis={analysis} palette={palette} />}

    {/* 4. Clickable analysis sections */}
    <div className="section-toolbar">
      <div><h3>Exploratory analysis</h3><small>Open any card to see its plots, tables and tunable parameters. Every section ships at least three charts.</small></div>
      <div className="inline-controls">
        <button className="btn-quiet small" onClick={expandAll}>Expand all</button>
        <button className="btn-quiet small" onClick={collapseAll}>Collapse all</button>
      </div>
    </div>
    {!analysis ? <Panel color="#94a3b8"><div className="skeleton-block"><RefreshCw size={16} className="spin" /> Computing descriptive statistics, missingness and associations…</div></Panel> :
      <div className="analysis-list">
        <Accordion testId="section-completeness" title="Completeness" icon={<span>🔍</span>} color="#0ea5e9" open={openSections.includes("Completeness")} onToggle={() => toggle("Completeness")}
          meta={<span>{analysis.missing.per_column.filter(c => c.missing).length} columns with gaps</span>}>
          <CompletenessView analysis={analysis} profile={profile} palette={palette} />
        </Accordion>
        <Accordion testId="section-missing" title="Missing Heatmap" icon={<span>🟨</span>} color="#f59e0b" open={openSections.includes("Missing Heatmap")} onToggle={() => toggle("Missing Heatmap")}
          meta={<span>{analysis.missing.sample_rows.toLocaleString()} rows sampled</span>}>
          <MissingView analysis={analysis} palette={palette} />
        </Accordion>
        <Accordion testId="section-outliers" title="Outliers" icon={<span>📉</span>} color="#ef4444" open={openSections.includes("Outliers")} onToggle={() => toggle("Outliers")}
          meta={<span>{analysis.outliers.total_outliers.toLocaleString()} flagged</span>}>
          <div className="section-params">
            <label className="field">Method<select className="control-select" value={outlierMethod} onChange={e => setOutlierMethod(e.target.value)}><option value="iqr">IQR fence</option><option value="zscore">Z-score</option></select></label>
            <Slider label="Threshold" value={outlierThreshold} min={0.5} max={5} step={0.1} onChange={setOutlierThreshold} format={v => v.toFixed(1)} />
            <button className="btn-quiet small" onClick={() => void update({ overview: { outlier_method: outlierMethod, outlier_threshold: outlierThreshold } })}><SlidersHorizontal size={12} /> Save as default</button>
          </div>
          <OutliersView analysis={analysis} palette={palette} />
        </Accordion>
        <Accordion testId="section-correlation" title="Correlation" icon={<span>🌡️</span>} color="#8b5cf6" open={openSections.includes("Correlation")} onToggle={() => toggle("Correlation")}
          meta={<span>{analysis.association.pairs.length} pairs</span>}>
          <div className="section-params">
            <label className="field">Coefficient<select className="control-select" value={correlationMethod} onChange={e => setCorrelationMethod(e.target.value)}><option value="pearson">Pearson (linear)</option><option value="spearman">Spearman (rank)</option></select></label>
            <button className="btn-quiet small" onClick={() => void update({ overview: { correlation_method: correlationMethod } })}><SlidersHorizontal size={12} /> Save as default</button>
          </div>
          <CorrelationView analysis={analysis} palette={palette} />
        </Accordion>
        <Accordion testId="section-distributions" title="Distributions" icon={<span>📈</span>} color="#10b981" open={openSections.includes("Distributions")} onToggle={() => toggle("Distributions")}
          meta={<span>{analysis.distributions.numeric.length} numeric · {analysis.distributions.categorical.length} categorical</span>}>
          <div className="section-params">
            <Slider label="Histogram bins" value={bins} min={4} max={60} onChange={setBins} />
            <button className="btn-quiet small" onClick={() => void update({ overview: { histogram_bins: bins } })}><SlidersHorizontal size={12} /> Save as default</button>
          </div>
          <DistributionsView analysis={analysis} palette={palette} />
        </Accordion>
      </div>}

    <div className="next-step-row">
      <button className="btn-studio" onClick={() => onGo("cleaning")} style={{ background: "linear-gradient(90deg, #10b981 0%, #059669 100%)" }}><Wrench size={15} /> Proceed to Cleaning <ChevronRight size={15} /></button>
      <button className="btn-quiet" onClick={() => onGo("chat")}><BarChart3 size={14} /> Build plots & pivots</button>
      <button className="btn-quiet" onClick={() => onGo("models")}><TrendingUp size={14} /> Train a model</button>
    </div>
  </section>;
}

function EmptyWorkspace({ onUpload }: { onUpload: () => void }) {
  return <Panel className="empty-state" color="#0ea5e9"><div className="drop-icon" style={{ margin: "0 auto", background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)", color: "#0284c7" }}><Layers size={24} /></div><h3>Your workspace is ready for its first dataset</h3><p>Upload a file or load a sample dataset to start profiling, cleaning, plotting and training models.</p><button className="btn-studio" onClick={onUpload} style={{ background: "linear-gradient(90deg, #0ea5e9 0%, #6366f1 100%)" }}>Upload dataset</button></Panel>;
}

/* ------------------------------------------------- Data quality dashboard --- */
function QualityDashboard({ profile, analysis, palette }: { profile: Profile; analysis: Analysis | null; palette: string }) {
  const dims = [
    { name: "Completeness", val: profile.dimensions.completeness, color: "#10b981", note: `${profile.missing_count.toLocaleString()} empty cells` },
    { name: "Uniqueness", val: profile.dimensions.uniqueness, color: "#8b5cf6", note: `${profile.duplicate_count.toLocaleString()} duplicate rows` },
    { name: "Consistency", val: profile.dimensions.consistency, color: "#0ea5e9", note: "Needs domain rules" },
    { name: "Validity", val: profile.dimensions.validity, color: "#f59e0b", note: "Needs reference data" },
    { name: "Timeliness", val: profile.dimensions.timeliness, color: "#ec4899", note: "Needs freshness SLA" },
  ];
  const outlierCols = (analysis?.outliers.columns ?? []).slice(0, 8).map(c => ({ label: c.column, value: c.outliers }));
  return <Panel title="Data Quality Dashboard — Comprehensive Assessment" subtitle="Completeness · Uniqueness · Consistency · Validity · Timeliness" color="#10b981" className="quality-dashboard">
    <div className="quality-grid">
      <div className="quality-gauge"><GaugeRing value={profile.quality_score} max={100} color={profile.quality_score > 80 ? "#10b981" : profile.quality_score > 60 ? "#f59e0b" : "#ef4444"} size={150} label="DATA HEALTH SCORE" /><small>Weighted completeness + uniqueness indicator. Domain accuracy requires explicit rules.</small></div>
      <div className="quality-dims">{dims.map(m => <div key={m.name} className="quality-dim" style={{ borderColor: `${m.color}33` }}>
        <div className="quality-dim-head"><span style={{ color: m.color }}>{m.name}</span><b style={{ color: m.color }}>{m.val === null || m.val === undefined ? "n/a" : `${m.val}%`}</b></div>
        <span className="track"><i style={{ width: `${m.val ?? 0}%`, background: m.color }} /></span>
        <small>{m.note}</small>
      </div>)}</div>
      <div className="quality-side">
        <ChartFrame title="Outliers by column" subtitle="1.5×IQR flags" height={150}><MetricBarList items={outlierCols} palette={palette} format={v => v.toLocaleString()} /></ChartFrame>
      </div>
    </div>
    <div className="quality-signals">
      {profile.recommendations.slice(0, 4).map(x => <div className="signal" key={x.title}>
        <span className={`signal-dot ${x.severity}`}>{x.severity === "success" ? <CheckCircle size={12} /> : <AlertCircle size={12} />}</span>
        <div><b>{x.title}</b><small>{x.detail}</small></div>
      </div>)}
    </div>
  </Panel>;
}

/* ------------------------------------------------------------ Completeness -- */
function CompletenessView({ analysis, profile, palette }: { analysis: Analysis; profile: Profile | null; palette: string }) {
  const perColumn = analysis.missing.per_column.filter(c => c.missing);
  const [preview, setPreview] = useState(true);
  return <div className="chart-grid three">
    <ChartFrame title="Missing share by column" subtitle="Top columns by missing percentage" palette={palette}>
      <BarChart horizontal labels={perColumn.slice(0, 8).map(c => c.column)} series={[{ name: "missing %", values: perColumn.slice(0, 8).map(c => c.missing_pct) }]} palette={palette} height={Math.max(180, perColumn.slice(0, 8).length * 30 + 30)} valueFormatter={v => `${v.toFixed(1)}%`} />
    </ChartFrame>
    <ChartFrame title="Cell completeness" subtitle="Filled vs empty cells" palette={palette}>
      <PieChart labels={["Filled", "Missing"]} values={[Math.max(0, (analysis.rows * analysis.columns) - (profile?.missing_count ?? 0)), profile?.missing_count ?? 0]} donut palette="forest" height={220} />
    </ChartFrame>
    <ChartFrame title="Row completeness" subtitle="Rows with and without any gap" palette={palette}>
      <BarChart labels={["Complete", "Has gaps"]} series={[{ name: "rows", values: [analysis.missing.complete_rows, analysis.missing.rows_with_missing] }]} palette="candy" height={220} />
    </ChartFrame>
    <ChartFrame title="Column gap distribution" subtitle="How many columns share each missing band" palette={palette}>
      {(() => {
        const bands = ["0%", "0–5%", "5–25%", "25–50%", "50–100%"];
        const counts = [0, 0, 0, 0, 0];
        analysis.missing.per_column.forEach(c => { const p = c.missing_pct; const band = p === 0 ? 0 : p <= 5 ? 1 : p <= 25 ? 2 : p <= 50 ? 3 : 4; counts[band]++; });
        return <BarChart labels={bands} series={[{ name: "columns", values: counts }]} palette="sunset" height={200} />;
      })()}
    </ChartFrame>
    <ChartFrame title="Most affected columns" subtitle="Absolute missing counts" className="span-2">
      <DataTable columns={["column", "missing", "missing_pct"]} rows={perColumn.slice(0, 12).map(c => ({ column: c.column, missing: c.missing, missing_pct: `${c.missing_pct}%` }))} maxHeight={230} empty="No missing values anywhere — completeness is 100%." />
    </ChartFrame>
    <ChartFrame title="Sample preview" subtitle="First rows with NULL highlights" action={<button className="btn-quiet small" onClick={() => setPreview(p => !p)}>{preview ? "Hide" : "Show"}</button>} className="span-3">
      {preview && <div className="table-wrap" style={{ maxHeight: 240, overflow: "auto" }}><table className="data-table compact"><thead><tr>{analysis.missing.columns.slice(0, 10).map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>
        {Array.from({ length: Math.min(analysis.missing.sample_rows, 10) }, (_, i) => <tr key={i}>{analysis.missing.columns.slice(0, 10).map((c, ci) => <td key={c} className={analysis.missing.cells[ci]?.[i] ? "cell-null" : ""}>{analysis.missing.cells[ci]?.[i] ? <span className="muted">NULL</span> : "•"}</td>)}</tr>)}
      </tbody></table></div>}
      {!preview && <EmptyChart height={120} message="Preview hidden." />}
    </ChartFrame>
  </div>;
}

/* ----------------------------------------------------------- Missing heatmap -- */
function MissingView({ analysis, palette }: { analysis: Analysis; palette: string }) {
  const visible = analysis.missing.columns.slice(0, 24);
  const [order, setOrder] = useState<"column" | "density">("column");
  const idx = order === "density" ? [...visible].map((_, i) => i).sort((a, b) => analysis.missing.per_column.find(p => p.column === visible[b])!.missing_pct - analysis.missing.per_column.find(p => p.column === visible[a])!.missing_pct) : visible.map((_, i) => i);
  const rows = Math.min(analysis.missing.sample_rows, 40);
  const cells = idx.map(i => analysis.missing.cells[i]?.slice(0, rows) ?? []);
  const density = visible.map(c => ({ label: c, value: analysis.missing.per_column.find(p => p.column === c)?.missing_pct ?? 0 }));
  return <div className="chart-grid three">
    <ChartFrame title="Missingness heat map" subtitle={`${rows} sampled rows × ${visible.length} columns — darker means NULL`} className="span-2"
      action={<Segmented options={[{ id: "column", label: "By column" }, { id: "density", label: "By density" }]} value={order} onChange={setOrder} />}>
      <div className="missing-map" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(6px, 1fr))` }}>
        {Array.from({ length: rows }, (_, r) => idx.map((ci, k) => <span key={`${r}-${k}`} title={`${visible[ci]} · row ${r + 1}: ${cells[k]?.[r] ? "NULL" : "value"}`} className={cells[k]?.[r] ? "on" : ""} style={cells[k]?.[r] ? { background: paletteColor(palette, k) } : undefined} />))}
      </div>
      <div className="missing-legend"><span><i /> value</span><span><i className="on" /> NULL</span><span className="muted">Hover a cell for its column</span></div>
    </ChartFrame>
    <ChartFrame title="Column null density" subtitle="Missing % per column" palette={palette}>
      <BarChart horizontal labels={density.slice(0, 9).map(d => d.label)} series={[{ name: "%", values: density.slice(0, 9).map(d => d.value) }]} palette="sunset" height={Math.max(180, density.slice(0, 9).length * 26 + 20)} valueFormatter={v => `${v.toFixed(1)}%`} />
    </ChartFrame>
    <ChartFrame title="Top missing patterns" subtitle="Which combination of fields is empty most often" className="span-2">
      <BarChart horizontal labels={analysis.missing.patterns.map(p => p.pattern.slice(0, 40))} series={[{ name: "rows", values: analysis.missing.patterns.map(p => p.count) }]} palette="violet" height={Math.max(160, analysis.missing.patterns.length * 26 + 20)} />
    </ChartFrame>
    <ChartFrame title="Gap concentration" subtitle="Share of total missing cells" palette={palette}>
      <PieChart labels={density.filter(d => d.value > 0).slice(0, 6).map(d => d.label)} values={density.filter(d => d.value > 0).slice(0, 6).map(d => d.value)} palette="sunset" height={220} />
    </ChartFrame>
  </div>;
}

/* ----------------------------------------------------------------- Outliers -- */
function OutliersView({ analysis, palette }: { analysis: Analysis; palette: string }) {
  const cols = analysis.outliers.columns.filter(c => c.count > 0);
  const [selected, setSelected] = useState<string>(cols[0]?.column ?? "");
  const cc = analysis.outliers.columns.find(c => c.column === selected) ?? cols[0];
  return <div className="chart-grid three">
    <ChartFrame title="Flagged observations" subtitle={`${analysis.outliers.method === "zscore" ? "Z-score" : "IQR"} · threshold ${analysis.outliers.threshold}`} palette={palette}>
      <MetricBarList items={cols.slice(0, 10).map(c => ({ label: c.column, value: c.outliers }))} palette="sunset" format={v => v.toLocaleString()} />
    </ChartFrame>
    <ChartFrame title="Risk share by column" subtitle="Outlier % of non-null values" palette={palette}>
      <PieChart labels={cols.slice(0, 6).map(c => c.column)} values={cols.slice(0, 6).map(c => c.outlier_pct)} donut palette="sunset" height={220} />
    </ChartFrame>
    <ChartFrame title="Fence overview" subtitle="Min · fence · max per numeric column">
      <BarChart labels={cols.slice(0, 8).map(c => c.column)} series={[
        { name: "min", values: cols.slice(0, 8).map(c => c.min ?? 0) },
        { name: "max", values: cols.slice(0, 8).map(c => c.max ?? 0) },
      ]} grouped palette="forest" height={220} />
    </ChartFrame>
    <ChartFrame title={`Tail values — ${cc?.column ?? "n/a"}`} subtitle="Flagged observations plotted against the median" className="span-2"
      action={<select className="control-select small" value={selected} onChange={e => setSelected(e.target.value)}>{cols.map(c => <option key={c.column} value={c.column}>{c.column}</option>)}</select>}>
      {cc && cc.values.length ? <BoxPlot boxes={[{ label: cc.column, low: cc.min ?? 0, q1: cc.median ?? 0, median: cc.median ?? 0, q3: cc.max ?? 0, high: cc.max ?? 0, count: cc.count, outliers: cc.values }]} height={200} palette="sunset" /> : <EmptyChart height={200} message="No outliers for this column at the current threshold." />}
    </ChartFrame>
    <ChartFrame title="Columns at risk" subtitle="Highest outlier rates first">
      <DataTable columns={["column", "outliers", "outlier_pct", "lower", "upper"]} rows={cols.slice(0, 8).map(c => ({ column: c.column, outliers: c.outliers, outlier_pct: `${c.outlier_pct}%`, lower: c.lower, upper: c.upper }))} maxHeight={210} empty="No outliers detected." />
    </ChartFrame>
  </div>;
}

/* -------------------------------------------------------------- Correlation -- */
function CorrelationView({ analysis, palette }: { analysis: Analysis; palette: string }) {
  const assoc = analysis.association;
  const [selectedPair, setSelectedPair] = useState(0);
  const pair = assoc.scatter[selectedPair];
  return <div className="chart-grid three">
    <ChartFrame title={`${assoc.method === "spearman" ? "Spearman" : "Pearson"} correlation matrix`} subtitle="Blue positive · red negative" className="span-2">
      {assoc.columns.length > 1 ? <Heatmap rows={assoc.columns} cols={assoc.columns} matrix={assoc.matrix} diverging height={Math.max(260, assoc.columns.length * 26 + 40)} formatValue={v => v.toFixed(2)} /> : <EmptyChart message="At least two numeric columns are required for a correlation matrix." />}
    </ChartFrame>
    <ChartFrame title="Strongest pairs" subtitle="Absolute correlation, top 8">
      <MetricBarList items={assoc.pairs.slice(0, 8).map(p => ({ label: `${p.a} ↔ ${p.b}`, value: p.value }))} palette="violet" format={v => v.toFixed(3)} />
    </ChartFrame>
    <ChartFrame title="Pair scatter" subtitle={pair ? `${pair.y} vs ${pair.x}` : "Top correlated pair"} className="span-2"
      action={assoc.scatter.length > 1 ? <select className="control-select small" value={selectedPair} onChange={e => setSelectedPair(Number(e.target.value))}>{assoc.scatter.map((s, i) => <option key={i} value={i}>{s.x} ↔ {s.y} ({s.r.toFixed(2)})</option>)}</select> : undefined}>
      {pair ? <ScatterChart points={pair.points} xLabel={pair.x} yLabel={pair.y} correlation={pair.r} palette={palette} height={260} /> : <EmptyChart height={200} message="No numeric pairs available." />}
    </ChartFrame>
    <ChartFrame title="Categorical association (Cramér's V)" subtitle="Strength between categorical fields">
      <MetricBarList items={(assoc.categorical.length ? assoc.categorical : assoc.mixed).slice(0, 8).map(p => ({ label: `${p.a} ↔ ${p.b}`, value: p.value }))} palette="candy" format={v => v.toFixed(3)} />
    </ChartFrame>
  </div>;
}

/* ------------------------------------------------------------ Distributions -- */
function DistributionsView({ analysis, palette }: { analysis: Analysis; palette: string }) {
  const numeric = analysis.distributions.numeric;
  const categorical = analysis.distributions.categorical;
  const [field, setField] = useState(numeric[0]?.column ?? "");
  const hist = numeric.find(n => n.column === field) ?? numeric[0];
  const desc = analysis.descriptive.columns.find(c => c.column === field);
  return <div className="chart-grid three">
    {numeric[0] && <ChartFrame title="Distribution of a numeric field" subtitle={hist ? `mean ${fmt(hist.mean)} · median ${fmt(hist.median)}` : ""} className="span-2"
      action={<select className="control-select small" value={field} onChange={e => setField(e.target.value)}>{numeric.map(n => <option key={n.column} value={n.column}>{n.column}</option>)}</select>}>
      {hist ? <Histogram labels={hist.labels} values={hist.values} palette={palette} height={230} /> : <EmptyChart message="No numeric columns." />}
    </ChartFrame>}
    <ChartFrame title="Shape profile" subtitle="Skew & spread of every numeric field">
      {numeric.length ? <MetricBarList items={numeric.slice(0, 8).map(n => ({ label: `${n.column} · skew`, value: n.skew ?? 0 }))} palette="forest" format={v => v.toFixed(2)} /> : <EmptyChart message="No numeric columns." />}
    </ChartFrame>
    {desc && <ChartFrame title="Five-number summary" subtitle={desc.column}>
      <BoxPlot boxes={[{ label: desc.column, low: desc.box.low, q1: desc.box.q25, median: desc.box.median, q3: desc.box.q75, high: desc.box.high, count: desc.count, outliers: [] }]} palette={palette} height={220} />
    </ChartFrame>}
    {categorical[0] && <ChartFrame title="Category balance" subtitle="Top values of a categorical field"
      action={<span className="muted small-note">{categorical[0].column} · {categorical[0].distinct} distinct</span>}>
      <BarChart horizontal labels={categorical[0].labels.slice(0, 8)} series={[{ name: "count", values: categorical[0].values.slice(0, 8) }]} palette="candy" height={Math.max(170, categorical[0].labels.slice(0, 8).length * 24 + 20)} />
    </ChartFrame>}
    {categorical[1] && <ChartFrame title={`${categorical[1].column} share`} subtitle="Proportional composition">
      <PieChart labels={categorical[1].labels.slice(0, 6)} values={categorical[1].values.slice(0, 6)} donut palette="violet" height={220} />
    </ChartFrame>}
    <ChartFrame title="Field statistics" subtitle="Descriptive summary" className="span-2">
      <DataTable columns={["column", "count", "mean", "median", "std", "min", "max", "skew", "outliers"]} rows={analysis.descriptive.columns.slice(0, 10).map(c => ({ ...c }))} maxHeight={220} />
    </ChartFrame>
    <ChartFrame title="Field inventory" subtitle="Numeric vs categorical">
      <PieChart labels={["Numeric", "Categorical"]} values={[numeric.length, categorical.length]} palette="forest" height={220} />
    </ChartFrame>
  </div>;
}

function paletteColor(palette: string, i: number) {
  const sets: Record<string, string[]> = { ocean: ["#0ea5e9", "#6366f1", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6"], sunset: ["#f97316", "#ef4444", "#f59e0b", "#db2777"], forest: ["#10b981", "#059669", "#65a30d", "#0d9488"], violet: ["#8b5cf6", "#6366f1", "#a855f7", "#d946ef"], mono: ["#0f172a", "#475569", "#94a3b8"], candy: ["#ec4899", "#8b5cf6", "#22d3ee", "#facc15"] };
  const set = sets[palette] || sets.ocean;
  return set[i % set.length];
}
