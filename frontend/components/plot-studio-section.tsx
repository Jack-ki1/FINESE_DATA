"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { BarChart3, Bot, Filter, Grid3x3, Layers, LineChart as LineIcon, ListTree, PieChart as PieIcon, Plus, RefreshCw, ScatterChart as ScatterIcon, Send, Settings2, Sparkles, Table2, Target, Trash2, TrendingUp, X } from "lucide-react";
import { BarChart, BoxPlot, ChartFrame, EmptyChart, Funnel, Heatmap, Histogram, LineChart, PieChart, ScatterChart, StatTile, Treemap, fmt } from "./charts";
import { ChipPicker, PageTitle, Panel, Slider, Tabs } from "./ui";
import { Dataset, useSettings } from "./studio-types";
import { api } from "@/lib/api";

export type PlotSpec = {
  id: string; title: string; type: string; x: string; y: string; series: string; size: string; aggregation: string; limit: number; bins: number; sort: string;
  filters: { column: string; operator: string; value: string }[]; metric?: string;
};
export type PlotResult = { type: string; labels: string[]; series_data: { name: string; values: number[]; points?: (number | null)[][] }[]; meta: Record<string, unknown>; table?: Record<string, unknown>[]; boxes?: Parameters<typeof BoxPlot>[0]["boxes"]; heatmap?: { rows: string[]; cols: string[]; matrix: number[][] }; kpi?: Record<string, unknown> };

const TYPES = [
  { id: "bar", label: "Bar", icon: BarChart3, needs: ["x", "y"] },
  { id: "grouped_bar", label: "Grouped", icon: BarChart3, needs: ["x", "y", "series"] },
  { id: "stacked_bar", label: "Stacked", icon: Layers, needs: ["x", "y", "series"] },
  { id: "line", label: "Line", icon: LineIcon, needs: ["x", "y"] },
  { id: "area", label: "Area", icon: TrendingUp, needs: ["x", "y"] },
  { id: "scatter", label: "Scatter", icon: ScatterIcon, needs: ["x", "y"] },
  { id: "bubble", label: "Bubble", icon: Target, needs: ["x", "y", "size"] },
  { id: "histogram", label: "Histogram", icon: BarChart3, needs: ["x"] },
  { id: "box", label: "Box", icon: ListTree, needs: ["x", "y"] },
  { id: "heatmap", label: "Heatmap", icon: Grid3x3, needs: ["x", "y"] },
  { id: "pie", label: "Pie", icon: PieIcon, needs: ["x", "y"] },
  { id: "donut", label: "Donut", icon: PieIcon, needs: ["x", "y"] },
  { id: "treemap", label: "Treemap", icon: Layers, needs: ["x", "y"] },
  { id: "funnel", label: "Funnel", icon: TrendingUp, needs: ["x", "y"] },
  { id: "pareto", label: "Pareto", icon: BarChart3, needs: ["x", "y"] },
  { id: "kpi", label: "KPI card", icon: Table2, needs: ["y"] },
] as const;

const AGGREGATIONS = ["count", "sum", "mean", "median", "min", "max", "nunique", "std"];

export function newPlot(spec?: Partial<PlotSpec>): PlotSpec {
  return { id: crypto.randomUUID(), title: "", type: "bar", x: "", y: "", series: "", size: "", aggregation: "sum", limit: 20, bins: 20, sort: "value_desc", filters: [], metric: "", ...spec };
}

export function PlotStudioSection({ active, spec, setSpec, plotSpecs, setPlotSpecs, drafts, setDrafts, onAsk, onSaveTemplate, widgets, setWidgets }: {
  active: Dataset | null; spec: PlotSpec | null; setSpec: (s: PlotSpec | null) => void;
  plotSpecs: PlotSpec[]; setPlotSpecs: React.Dispatch<React.SetStateAction<PlotSpec[]>>;
  drafts: Record<string, PlotResult | { error: string }>; setDrafts: React.Dispatch<React.SetStateAction<Record<string, PlotResult | { error: string }>>>;
  onAsk: (prompt: string) => Promise<string>; onSaveTemplate?: () => void;
  widgets: { id: string; title: string; spec: PlotSpec }[]; setWidgets: React.Dispatch<React.SetStateAction<{ id: string; title: string; spec: PlotSpec }[]>>;
}) {
  const { settings, update } = useSettings();
  const cfg = settings?.plots;
  const defaultAgg = cfg?.default_aggregation || "sum";
  const [tab, setTab] = useState<"plots" | "pivots" | "dashboard">("plots");
  const [pivotRows, setPivotRows] = useState<string[]>([]);
  const [pivotCols, setPivotCols] = useState<string[]>([]);
  const [pivotValues, setPivotValues] = useState<string[]>([]);
  const [pivotAggs, setPivotAggs] = useState<string[]>(["sum"]);
  const [pivot, setPivot] = useState<{ tables: { aggregation: string; value: string | null; row_fields: string[]; column_fields: string[]; columns: string[]; rows: { __row__: string[]; cells: number[] }[]; column_totals: number[]; grand_total: number }[] } | null>(null);
  const [pivotError, setPivotError] = useState("");
  const [busy, setBusy] = useState(false);
  const columns = active?.column_names ?? [];
  const [prompt, setPrompt] = useState("");
  const [helper, setHelper] = useState<{ answer: string; loading: boolean }>({ answer: "", loading: false });
  const palette = cfg?.palette ?? "ocean";

  const buildPlot = useCallback(async (s: PlotSpec) => {
    if (!active) return;
    try {
      const result = await api<PlotResult>(`api/datasets/${active.id}/plot`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec: s }) });
      setDrafts(prev => ({ ...prev, [s.id]: result }));
    } catch (e) { setDrafts(prev => ({ ...prev, [s.id]: { error: e instanceof Error ? e.message : "Could not build this plot." } })); }
  }, [active, setDrafts]);

  useEffect(() => {
    (async () => { if (spec && !drafts[spec.id]) await buildPlot(spec); })();
    // Render the editor's plot the first time it appears in the list.
  }, [spec, drafts, buildPlot]);

  const updateSpec = (patch: Partial<PlotSpec>) => { if (!spec) return; setSpec({ ...spec, ...patch }); };
  const runCurrent = async () => { if (!spec) return; setBusy(true); await buildPlot(spec); setBusy(false); };

  const addPlot = () => {
    const next = newPlot({ type: cfg?.default_type || "bar", aggregation: defaultAgg, limit: cfg?.default_limit || 20, bins: cfg?.bins || 20, x: columns[0] || "", y: "" });
    setPlotSpecs(prev => [...prev, next]); setSpec(next); setTab("plots");
  };
  const removePlot = (id: string) => { setPlotSpecs(prev => prev.filter(p => p.id !== id)); setDrafts(prev => { const n = { ...prev }; delete n[id]; return n; }); };

  const runPivot = async () => {
    if (!active) return; setBusy(true); setPivotError("");
    try {
      const r = await api<NonNullable<typeof pivot>>(`api/datasets/${active.id}/pivot`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec: { rows: pivotRows, columns: pivotCols, values: pivotValues, aggregations: pivotAggs, limit: 60 } }) });
      setPivot(r);
    } catch (e) { setPivotError(e instanceof Error ? e.message : "Pivot failed."); setPivot(null); } finally { setBusy(false); }
  };

  const ask = async (e: FormEvent) => {
    e.preventDefault(); if (!prompt.trim()) return;
    const question = prompt.trim(); setPrompt(""); setHelper({ answer: "", loading: true });
    const answer = await onAsk(question);
    setHelper({ answer, loading: false });
    // Best-effort: translate a natural-language request into a plot spec.
    const guess = parseIntent(question, columns);
    if (guess) { const s = newPlot(guess); setPlotSpecs(prev => [...prev, s]); setSpec(s); setTab("plots"); await buildPlot(s); }
  };

  const allColumns = columns; void active;
  if (!active) return <section><PageTitle eyebrow="VISUALIZATION" title="Plot Studio" desc="Build plots and pivots with full control." color="#f59e0b" /><Panel color="#f59e0b"><EmptyChart height={140} message="Select or upload a dataset to start plotting." /></Panel></section>;

  return <section className="plot-studio">
    <PageTitle eyebrow="VISUALIZATION" title="Plot Studio" desc="Compose plots and pivots, stack them into a live dashboard, and ask the assistant for ideas — you stay in control of every axis, aggregation and filter." color="#f59e0b"
      actions={<div className="inline-controls"><button className="btn-quiet" onClick={() => { setDrafts({}); plotSpecs.forEach(p => void buildPlot(p)); }} disabled={busy || !plotSpecs.length}><RefreshCw size={13} className={busy ? "spin" : ""} /> Rebuild all</button><button className="btn-studio" onClick={addPlot} style={{ background: "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)" }}><Plus size={14} /> Add plot</button></div>} />

    <div className="section-toolbar">
      <Tabs tabs={[{ id: "plots", label: <><BarChart3 size={13} /> Plots</>, count: plotSpecs.length }, { id: "pivots", label: <><Table2 size={13} /> Pivots</>, count: pivot?.tables.length ?? 0 }, { id: "dashboard", label: <><Grid3x3 size={13} /> Dashboard</>, count: widgets.length }]} value={tab} onChange={setTab} color="#f59e0b" />
      <div className="inline-controls">
        <label className="field inline">Palette<select className="control-select small" value={cfg?.palette ?? "ocean"} onChange={e => void update({ plots: { palette: e.target.value } })}>{["ocean", "sunset", "forest", "violet", "mono", "candy"].map(p => <option key={p}>{p}</option>)}</select></label>
      </div>
    </div>

    {tab === "plots" && <>
      <div className="plot-workspace">
        <Panel title="New plot" subtitle="Pick a type, choose columns, tune the aggregation" color="#f59e0b" className="plot-builder">
          <div className="type-picker">{TYPES.map(t => <button key={t.id} className={`type-tile ${spec?.type === t.id ? "on" : ""}`} onClick={() => { if (spec) updateSpec({ type: t.id }); else { const s = newPlot({ type: t.id, x: allColumns[0] || "", y: "" }); setPlotSpecs(prev => [...prev, s]); setSpec(s); } }}>
            <t.icon size={16} /><span>{t.label}</span><small>{t.needs.map(n => n.toUpperCase()).join(" · ")}</small>
          </button>)}</div>
          {spec && <div className="builder-form">
            <label className="field">Title<input className="control-input" placeholder="Optional chart title" value={spec.title} onChange={e => updateSpec({ title: e.target.value })} /></label>
            <div className="settings-grid">
              <label className="field">X / category<select className="control-select" value={spec.x} onChange={e => updateSpec({ x: e.target.value })}><option value="">—</option>{allColumns.map(c => <option key={c}>{c}</option>)}</select></label>
              <label className="field">Y / measure<select className="control-select" value={spec.y} onChange={e => updateSpec({ y: e.target.value })}><option value="">—</option>{allColumns.map(c => <option key={c}>{c}</option>)}</select></label>
              <label className="field">Split by (series)<select className="control-select" value={spec.series} onChange={e => updateSpec({ series: e.target.value })}><option value="">None</option>{allColumns.map(c => <option key={c}>{c}</option>)}</select></label>
              <label className="field">Bubble size<select className="control-select" value={spec.size} onChange={e => updateSpec({ size: e.target.value })}><option value="">None</option>{allColumns.map(c => <option key={c}>{c}</option>)}</select></label>
              <label className="field">Aggregation<select className="control-select" value={spec.aggregation} onChange={e => updateSpec({ aggregation: e.target.value })}>{AGGREGATIONS.map(a => <option key={a}>{a}</option>)}</select></label>
              <label className="field">Sort<select className="control-select" value={spec.sort} onChange={e => updateSpec({ sort: e.target.value })}><option value="value_desc">Value ↓</option><option value="value_asc">Value ↑</option><option value="label">Label A→Z</option><option value="none">Original order</option></select></label>
            </div>
            <div className="slider-row"><Slider label="Categories shown" value={spec.limit} min={3} max={100} onChange={v => updateSpec({ limit: v })} /><Slider label="Histogram bins" value={spec.bins} min={3} max={60} onChange={v => updateSpec({ bins: v })} /></div>
            <div className="filter-list">
              <div className="filter-head"><Filter size={13} /><b>Filters</b><button className="btn-quiet small" onClick={() => updateSpec({ filters: [...spec.filters, { column: allColumns[0] || "", operator: "eq", value: "" }] })}><Plus size={12} /> Add filter</button></div>
              {spec.filters.map((f, i) => <div className="filter-row" key={i}>
                <select className="control-select" value={f.column} onChange={e => updateSpec({ filters: spec.filters.map((x, j) => j === i ? { ...x, column: e.target.value } : x) })}>{allColumns.map(c => <option key={c}>{c}</option>)}</select>
                <select className="control-select" value={f.operator} onChange={e => updateSpec({ filters: spec.filters.map((x, j) => j === i ? { ...x, operator: e.target.value } : x) })}>{["eq", "neq", "gt", "lt", "gte", "lte", "between", "contains"].map(o => <option key={o} value={o}>{OPERATOR_LABEL[o]}</option>)}</select>
                <input className="control-input" placeholder="value" value={f.value} onChange={e => updateSpec({ filters: spec.filters.map((x, j) => j === i ? { ...x, value: e.target.value } : x) })} />
                <button className="icon-button" onClick={() => updateSpec({ filters: spec.filters.filter((_, j) => j !== i) })}><X size={13} /></button>
              </div>)}
            </div>
            <div className="inline-controls builder-actions">
              <button className="btn-studio" disabled={busy} onClick={runCurrent} style={{ background: "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)" }}><Sparkles size={13} /> {busy ? "Plotting…" : "Plot"}</button>
              <button className="btn-quiet" onClick={addPlot}><Plus size={13} /> Add another plot</button>
              <button className="btn-quiet" onClick={onSaveTemplate}><Settings2 size={13} /> Save as default</button>
              <button className="btn-quiet" onClick={() => setSpec(null)}>Clear editor</button>
            </div>
          </div>}
        </Panel>
        <div className="plot-preview">
          {spec ? <PlotCard spec={spec} result={drafts[spec.id]} palette={palette} onRemove={() => removePlot(spec.id)} onEdit={() => setSpec(spec)} onPin={() => setWidgets(prev => [...prev, { id: crypto.randomUUID(), title: spec.title || `${spec.type} · ${spec.x}`, spec }])} big /> : <Panel color="#f59e0b"><EmptyChart height={260} message="Choose a plot type and click Plot to see the live preview here." /></Panel>}
        </div>
      </div>

      <Panel title={`Your plots (${plotSpecs.length})`} subtitle="Each tile is independent — add as many as you need and pin the best ones to the dashboard" color="#0ea5e9">
        {!plotSpecs.length && <EmptyChart height={110} message="No plots yet." />}
        <div className="plot-grid">
          {plotSpecs.map(p => <PlotCard key={p.id} spec={p} result={drafts[p.id]} palette={palette} onRemove={() => removePlot(p.id)} onEdit={() => setSpec(p)} onRebuild={() => void buildPlot(p)} onPin={() => setWidgets(prev => [...prev, { id: crypto.randomUUID(), title: p.title || `${p.type} · ${p.x}`, spec: p }])} />)}
        </div>
      </Panel>

      <Panel title="Plot assistant" subtitle="Describe what you want; the assistant proposes a plot and adds it to your list. You can then tweak every setting." color="#8b5cf6">
        <form className="assistant-bar" onSubmit={ask}>
          <Bot size={16} />
          <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g. Show mean monthly charges by contract split by churn" />
          <button className="btn-studio" disabled={helper.loading} style={{ background: "linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)" }}><Send size={13} /> Ask</button>
        </form>
        <div className="suggestion-chips">{["Compare mean charges by contract", "Show churn share as a donut", "Distribution of tenure", "Top categories by count", "Correlation of usage vs charges"].map(s => <button key={s} className="chip" onClick={() => setPrompt(s)}>{s}</button>)}</div>
        {helper.loading && <div className="skeleton-block"><RefreshCw size={14} className="spin" /> Thinking…</div>}
        {helper.answer && <div className="assistant-answer"><Sparkles size={13} /><div>{helper.answer}</div></div>}
      </Panel>
    </>}

    {tab === "pivots" && <div className="pivot-layout">
      <Panel title="Pivot builder" subtitle="Rows × columns × values — multi-aggregation supported" color="#8b5cf6">
        <label className="field">Row fields<ChipPicker options={columns} value={pivotRows} onChange={setPivotRows} max={4} /></label>
        <label className="field">Column fields<ChipPicker options={columns} value={pivotCols} onChange={setPivotCols} max={3} /></label>
        <label className="field">Value fields<ChipPicker options={columns} value={pivotValues} onChange={setPivotValues} max={4} /></label>
        <label className="field">Aggregations<ChipPicker options={AGGREGATIONS} value={pivotAggs} onChange={setPivotAggs} max={4} /></label>
        <div className="inline-controls"><button className="btn-studio" onClick={runPivot} disabled={busy || !pivotRows.length} style={{ background: "linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)" }}><Table2 size={13} /> {busy ? "Building…" : "Build pivot"}</button></div>
        {pivotError && <div className="inline-alert">{pivotError}</div>}
      </Panel>
      <Panel title="Pivot result" subtitle={pivot ? `${pivot.tables.length} table${pivot.tables.length === 1 ? "" : "s"}` : "Build a pivot to see results"} color="#8b5cf6">
        {!pivot && <EmptyChart height={180} message="Pick at least one row field and an aggregation, then build." />}
        {pivot?.tables.map((t, ti) => <div key={ti} className="pivot-table">
          <h4>{t.aggregation}{t.value ? ` of ${t.value}` : " of rows"} <small>· rows: {t.row_fields.join(", ")}{t.column_fields.length ? ` · cols: ${t.column_fields.join(", ")}` : ""} · grand total {fmt(t.grand_total)}</small></h4>
          <div className="table-wrap"><table className="data-table compact"><thead><tr>{t.row_fields.map(f => <th key={f}>{f}</th>)}{t.columns.map(c => <th key={c} className="num">{c}</th>)}</tr></thead>
            <tbody>{t.rows.map((r, ri) => <tr key={ri}>{r.__row__.map((x, xi) => <td key={xi} className="file-name">{x}</td>)}{r.cells.map((c, ci) => <td key={ci} className="num">{fmt(c)}</td>)}</tr>)}
              {t.column_totals.length > 0 && <tr className="total-row"><td colSpan={t.row_fields.length}>Column totals</td>{t.column_totals.map((c, ci) => <td key={ci} className="num">{fmt(c)}</td>)}</tr>}</tbody></table></div>
        </div>)}
        {pivot && <div className="chart-grid two" style={{ marginTop: 12 }}>
          <ChartFrame title="Top magnitudes" subtitle="First measure, first aggregation">
            <BarChart labels={pivot.tables[0].rows.slice(0, 10).map(r => r.__row__.join(" · "))} series={[{ name: "value", values: pivot.tables[0].rows.slice(0, 10).map(r => r.cells[0] ?? 0) }]} palette={palette} height={200} />
          </ChartFrame>
          <ChartFrame title="Share of total" subtitle="Composition of the pivot">
            <Treemap labels={pivot.tables[0].rows.slice(0, 8).map(r => r.__row__.join(" · "))} values={pivot.tables[0].rows.slice(0, 8).map(r => Math.abs(r.cells[0] ?? 0))} palette={palette} height={200} />
          </ChartFrame>
        </div>}
      </Panel>
    </div>}

    {tab === "dashboard" && <Panel title={`Dashboard (${widgets.length} widgets)`} subtitle="Pinned plots, all rendered live" color="#10b981" action={<button className="btn-quiet small" onClick={() => setWidgets(prev => [...prev, { id: crypto.randomUUID(), title: "KPI", spec: newPlot({ type: "kpi", y: allColumns[1] || allColumns[0], aggregation: "sum" }) }])}><Plus size={12} /> Add KPI card</button>}>
      {!widgets.length && <EmptyChart height={140} message="Pin plots from the Plots tab (≡ button on a chart) to compose a dashboard." />}
      <div className={`dash-grid cols-${cfg?.dashboard_columns ?? 2}`}>{widgets.map(w => <PlotCard key={w.id} spec={w.spec} result={drafts[w.spec.id]} palette={palette} onRemove={() => setWidgets(prev => prev.filter(x => x.id !== w.id))} onRebuild={() => void buildPlot(w.spec)} />)}</div>
    </Panel>}
  </section>;
}

const OPERATOR_LABEL: Record<string, string> = { eq: "=", neq: "≠", gt: ">", lt: "<", gte: "≥", lte: "≤", between: "between", contains: "contains" };

export function PlotCard({ spec, result, palette, onRemove, onEdit, onRebuild, onPin, big }: { spec: PlotSpec; result?: PlotResult | { error: string } | undefined; palette: string; onRemove?: () => void; onEdit?: () => void; onRebuild?: () => void; onPin?: () => void; big?: boolean }) {
  const height = big ? 320 : 220;
  const err = result && "error" in result ? result.error : null;
  const r = result && !("error" in result) ? result : null;
  const title = spec.title || `${TYPES.find(t => t.id === spec.type)?.label ?? spec.type} · ${spec.x || spec.y || "all"}`;
  return <div className="chart-frame plot-card">
    <div className="chart-frame-head"><div><b>{title}</b><small>{[spec.x && `x: ${spec.x}`, spec.y && `y: ${spec.y}`, spec.series && `split: ${spec.series}`, spec.aggregation !== "count" && `agg: ${spec.aggregation}`].filter(Boolean).join(" · ") || "summary"}</small></div>
      <div className="chart-card-actions">
        {onRebuild && <button className="icon-button" title="Rebuild" onClick={onRebuild}><RefreshCw size={12} /></button>}
        {onEdit && <button className="icon-button" title="Edit" onClick={onEdit}><Settings2 size={12} /></button>}
        {onPin && <button className="icon-button" title="Pin to dashboard" onClick={onPin}><Grid3x3 size={12} /></button>}
        {onRemove && <button className="icon-button" title="Remove" onClick={onRemove}><Trash2 size={12} /></button>}
      </div>
    </div>
    <div className="chart-frame-body" style={{ minHeight: height }}>
      {err && <div className="chart-error">{err}</div>}
      {!result && <div className="chart-empty" style={{ minHeight: height }}>Click Plot to render.</div>}
      {r && <RenderPlot spec={spec} result={r} palette={palette} height={height} />}
    </div>
  </div>;
}

export function RenderPlot({ spec, result, palette, height = 240 }: { spec: PlotSpec; result: PlotResult; palette: string; height?: number }) {
  const series = (result.series_data || []).map(s => ({ name: s.name, values: s.values || [] }));
  switch (result.type) {
    case "kpi": {
      const k = result.kpi || {};
      return <div className="kpi-hero"><StatTile label={String(spec.y || "value")} value={fmt(Number(k.value ?? 0))} hint={`${spec.aggregation} · ${Number(k.rows ?? 0).toLocaleString()} rows`} color="#0ea5e9" /><div className="kpi-hero-mini">{["min", "max", "mean", "median"].map(m => <div key={m}><small>{m}</small><b>{fmt(Number(k[m] ?? 0))}</b></div>)}</div></div>;
    }
    case "pie": case "donut":
      return <PieChart labels={result.labels} values={series[0]?.values ?? []} palette={palette} donut={result.type === "donut"} height={height} />;
    case "treemap": return <Treemap labels={result.labels} values={series[0]?.values ?? []} palette={palette} height={height} />;
    case "funnel": return <Funnel labels={result.labels} values={series[0]?.values ?? []} palette={palette} height={height} />;
    case "heatmap": return result.heatmap ? <Heatmap rows={result.heatmap.rows} cols={result.heatmap.cols} matrix={result.heatmap.matrix} height={height} /> : <EmptyChart height={height} />;
    case "box": return result.boxes ? <BoxPlot boxes={result.boxes} height={height} palette={palette} /> : <EmptyChart height={height} />;
    case "scatter": case "bubble":
      return <ScatterChart points={result.series_data.map(s => ({ name: s.name, points: (s.points || []).map(p => [p[0] ?? NaN, p[1] ?? NaN, p[2] ?? 0]) }))} xLabel={spec.x} yLabel={spec.y} bubble={result.type === "bubble"} correlation={typeof result.meta.correlation === "number" ? result.meta.correlation : null} palette={palette} height={height} />;
    case "histogram": return <Histogram labels={result.labels} values={series[0]?.values ?? []} palette={palette} height={height} />;
    case "line": case "area":
      return <LineChart labels={result.labels} series={series} palette={palette} area={result.type === "area"} smooth height={height} />;
    case "pareto":
      return <LineChart labels={result.labels} series={[{ ...series[0], values: series[0]?.values ?? [] }, { name: "cumulative %", values: series[1]?.values ?? [] }]} palette={palette} height={height} />;
    case "grouped_bar": case "stacked_bar":
      return <BarChart labels={result.labels} series={series} palette={palette} grouped={result.type === "grouped_bar"} stacked={result.type === "stacked_bar"} height={height} />;
    default:
      return <BarChart labels={result.labels} series={series} palette={palette} horizontal={result.labels.length > 8} height={height} />;
  }
}

const NUMERIC_HINTS = ["mean", "average", "sum", "total", "median", "count", "distribution", "histogram", "spread", "trend", "over time", "correlat", "scatter", "outlier", "share", "proportion", "compare", "by "];

/** Deterministic NL → plot spec heuristic so the assistant always produces something editable. */
export function parseIntent(prompt: string, columns: string[]): Partial<PlotSpec> | null {
  if (!columns.length) return null;
  const q = prompt.toLowerCase();
  const mentioned = columns.filter(c => q.includes(c.toLowerCase().replaceAll("_", " ")) || q.includes(c.toLowerCase()));
  const agg = /median/.test(q) ? "median" : /mean|average/.test(q) ? "mean" : /count|how many|frequency/.test(q) ? "count" : /sum|total/.test(q) ? "sum" : /max/.test(q) ? "max" : /min/.test(q) ? "min" : "sum";
  const type = /pie|share|proportion|composition/.test(q) ? "pie" : /donut/.test(q) ? "donut" : /distribution|histogram/.test(q) ? "histogram" : /scatter|correlat|relationship/.test(q) ? "scatter" : /line|trend|over time/.test(q) ? "line" : /box|spread/.test(q) ? "box" : /treemap/.test(q) ? "treemap" : "bar";
  const numeric = columns.filter(c => !/^(id|customer_id)$/i.test(c));
  const x = mentioned[0] ?? numeric[0];
  const y = mentioned[1] ?? numeric.find(c => c !== x && NUMERIC_HINTS.some(h => q.includes(h.slice(0, 4)) && c.toLowerCase().includes(h.slice(0, 3)))) ?? numeric.find(c => c !== x) ?? "";
  const series = type === "scatter" ? "" : mentioned[2] ?? "";
  return { type, x, y, aggregation: type === "histogram" || type === "scatter" ? "count" : agg, series, title: prompt.slice(0, 70) };
}
