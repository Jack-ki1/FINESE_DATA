"use client";
import { useState } from "react";
import { Bot, CheckCircle, Database, Eye, EyeOff, Gauge, Info, Layers, Palette, RefreshCw, RotateCcw, Save, Search, Settings as Cog, ShieldCheck, SlidersHorizontal, Table2, WandSparkles } from "lucide-react";
import { BarChart, EmptyChart } from "./charts";
import { PageTitle, Panel, Slider, Tabs, Toggle } from "./ui";
import { View, useSettings } from "./studio-types";

const SECTIONS: { id: View; label: string }[] = [
  { id: "upload", label: "Upload & Connect" }, { id: "overview", label: "Overview" }, { id: "cleaning", label: "Cleaning Studio" },
  { id: "chat", label: "Plot Studio" }, { id: "models", label: "Model Studio" }, { id: "export", label: "Export Center" }, { id: "settings", label: "Settings" },
];

export function SettingsSection({ user }: { user: { full_name: string; email: string; workspace_name: string } | null }) {
  const { settings, catalog, saving, update, reset } = useSettings();
  const [tab, setTab] = useState<"project" | "overview" | "cleaning" | "plots" | "models" | "ai">("ai");
  const [providerFilter, setProviderFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  if (!settings) return <section><PageTitle eyebrow="CONFIGURATION" title="Settings" desc="Tune every part of your project." color="#64748b" /><Panel color="#64748b"><EmptyChart height={120} message="Loading settings…" /></Panel></section>;

  const save = (patch: Record<string, unknown>) => void update(patch);
  const provider = catalog?.providers.find(p => p.id === settings.ai.provider) ?? catalog?.providers.find(p => p.id === "auto");
  const visibleProviders = (catalog?.providers ?? []).filter(p => p.id !== "auto" && (!providerFilter || p.label.toLowerCase().includes(providerFilter.toLowerCase())));
  const visibleModels = (provider?.models ?? []).filter(m => !modelFilter || `${m.label} ${m.id} ${m.tier}`.toLowerCase().includes(modelFilter.toLowerCase()));

  return <section>
    <PageTitle eyebrow="CONFIGURATION" title="Settings" desc="Project defaults, section visibility, chart behaviour, model defaults and the AI provider/model used everywhere." color="#64748b"
      actions={<div className="inline-controls">{saving && <span className="muted small-note"><RefreshCw size={12} className="spin" /> Saving…</span>}<button className="btn-quiet" onClick={() => { if (window.confirm("Reset every setting to the project defaults?")) { void reset(); setConfirmed(true); } }}><RotateCcw size={13} /> Reset all</button></div>} />

    {confirmed && <div className="inline-alert" style={{ background: "#f0fdf4", borderColor: "#86efac", color: "#166534" }}><CheckCircle size={13} /> Defaults restored.</div>}

    <div className="kpi-row">
      {[{ label: "AI PROVIDERS", value: String(catalog?.total_providers ?? 0), color: "#8b5cf6", sub: "catalogued" }, { label: "AI MODELS", value: String(catalog?.total_models ?? 0), color: "#0ea5e9", sub: "selectable" }, { label: "ACTIVE PROVIDER", value: provider?.label ?? "—", color: "#10b981", sub: provider?.configured ? "key configured" : "key missing" }, { label: "ACTIVE MODEL", value: settings.ai.model || "auto", color: "#f59e0b", sub: "used by the assistant" }, { label: "SECTIONS ON", value: String(Object.values(settings.sections).filter(Boolean).length), color: "#6366f1", sub: "visible in navigation" }].map(k =>
        <div className="kpi-tile" key={k.label} style={{ borderColor: `${k.color}40` }}><div><small style={{ color: k.color }}>{k.label}</small><strong style={{ color: k.color, fontSize: 15 }}>{k.value}</strong><em>{k.sub}</em></div></div>)}
    </div>

    <Tabs color="#64748b" value={tab} onChange={setTab} tabs={[
      { id: "ai", label: <><Bot size={13} /> AI & Assistant</> },
      { id: "project", label: <><Cog size={13} /> Project</> },
      { id: "overview", label: <><Gauge size={13} /> Overview</> },
      { id: "cleaning", label: <><WandSparkles size={13} /> Cleaning</> },
      { id: "plots", label: <><Palette size={13} /> Plots</> },
      { id: "models", label: <><SlidersHorizontal size={13} /> Models</> },
    ]} />

    {tab === "ai" && <div className="two-column">
      <Panel title="Assistant provider" subtitle={`${catalog?.total_providers ?? 0} providers · ${catalog?.total_models ?? 0} models`} color="#8b5cf6">
        <div className="inline-controls" style={{ marginBottom: 10 }}><label className="search-box"><Search size={13} /><input value={providerFilter} onChange={e => setProviderFilter(e.target.value)} placeholder="Filter providers" /></label></div>
        <div className="provider-grid">
          <button className={`provider-card ${settings.ai.provider === "auto" ? "on" : ""}`} onClick={() => save({ ai: { provider: "auto", model: "" } })}>
            <b>Auto</b><small>Pick the best provider with a configured key</small><span className="env-pill">recommended</span>
          </button>
          {visibleProviders.map(p => <button key={p.id} className={`provider-card ${settings.ai.provider === p.id ? "on" : ""}`} onClick={() => save({ ai: { provider: p.id, model: p.models[0]?.id ?? "" } })}>
            <b>{p.label}</b><small>{p.kind.replaceAll("_", " ")} · {p.models.length} models</small>
            <span className={`env-pill ${p.configured ? "ok" : "warn"}`}>{p.configured ? <><ShieldCheck size={10} /> ready</> : <><Info size={10} /> set {p.env_var ?? "base url"}</>}</span>
          </button>)}
        </div>
        {provider && provider.id !== "auto" && <div className="model-picker">
          <div className="inline-controls" style={{ justifyContent: "space-between" }}><b>{provider.label} models</b><label className="search-box"><Search size={13} /><input value={modelFilter} onChange={e => setModelFilter(e.target.value)} placeholder="Filter models" /></label></div>
          <div className="model-grid">{visibleModels.map(m => <button key={m.id} className={`model-card ${settings.ai.model === m.id ? "on" : ""}`} onClick={() => save({ ai: { model: m.id } })}>
            <b>{m.label}</b><small>{m.id}</small><span className="tier-pill">{m.tier} · {m.context}</span>
          </button>)}</div>
          {!visibleModels.length && <div className="muted">No models match. Custom endpoints accept any model name — type it below.</div>}
          {(provider.id === "custom" || provider.id === "ollama" || provider.id === "azure") && <label className="field">Exact model name<input className="control-input" value={settings.ai.model} onChange={e => save({ ai: { model: e.target.value } })} placeholder="e.g. my-finetuned-model" /></label>}
        </div>}
      </Panel>
      <div>
        <Panel title="Assistant behaviour" subtitle="Applies to every chat surface (Plot Studio assistant & floating widget)" color="#0ea5e9">
          <div className="settings-grid">
            <label className="field">Provider ID (advanced)<input className="control-input" value={settings.ai.provider} onChange={e => save({ ai: { provider: e.target.value } })} /></label>
            <label className="field">Model<input className="control-input" value={settings.ai.model} onChange={e => save({ ai: { model: e.target.value } })} /></label>
            <label className="field wide">Custom base URL<input className="control-input" value={settings.ai.custom_base_url} onChange={e => save({ ai: { custom_base_url: e.target.value } })} placeholder="https://your-gateway/v1" /></label>
          </div>
          <label className="field">Response style<select className="control-select" value={settings.ai.system_style} onChange={e => save({ ai: { system_style: e.target.value } })}><option value="analyst">Concise analyst</option><option value="storyteller">Narrative explainer</option><option value="engineer">Technical engineer</option><option value="executive">Executive summary</option></select></label>
          <div className="slider-row">
            <Slider label="Temperature" value={settings.ai.temperature} min={0} max={1.5} step={0.05} onChange={v => save({ ai: { temperature: v } })} format={v => v.toFixed(2)} />
            <Slider label="Max tokens" value={settings.ai.max_tokens} min={128} max={4000} step={64} onChange={v => save({ ai: { max_tokens: v } })} />
          </div>
          <Toggle checked={settings.ai.share_context} onChange={v => save({ ai: { share_context: v } })} label="Share dataset profile context" hint="Send column names, types and quality summary" />
          <Toggle checked={settings.ai.include_sample_rows} onChange={v => save({ ai: { include_sample_rows: v } })} label="Include sample rows" hint="Only when you explicitly allow external sharing" />
          <div className="inline-rec">The assistant only computes figures from the deterministic profile; the model explains them. Without a key it falls back to the local engine.</div>
        </Panel>
        <Panel title="Provider coverage" subtitle="How many models each provider exposes" color="#10b981">
          <BarChart horizontal labels={(catalog?.providers ?? []).filter(p => p.models.length).map(p => p.label)} series={[{ name: "models", values: (catalog?.providers ?? []).filter(p => p.models.length).map(p => p.models.length) }]} palette="violet" height={Math.max(180, (catalog?.providers ?? []).filter(p => p.models.length).length * 24 + 20)} />
        </Panel>
      </div>
    </div>}

    {tab === "project" && <div className="two-column">
      <Panel title="Appearance & locale" subtitle="Affects the whole studio" color="#6366f1">
        <div className="settings-grid">
          <label className="field">Theme<select className="control-select" value={settings.theme} onChange={e => save({ theme: e.target.value })}><option value="light">Light</option><option value="dark">Dark (experimental)</option><option value="auto">Follow system</option></select></label>
          <label className="field">Density<select className="control-select" value={settings.density} onChange={e => save({ density: e.target.value })}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>
          <label className="field">Accent colour<input type="color" className="color-input" value={settings.accent} onChange={e => save({ accent: e.target.value })} /></label>
          <label className="field">Language<select className="control-select" value={settings.language} onChange={e => save({ language: e.target.value })}>{["English", "Swahili", "French", "Portuguese", "Arabic", "Hindi"].map(l => <option key={l}>{l}</option>)}</select></label>
          <label className="field">Date format<select className="control-select" value={settings.date_format} onChange={e => save({ date_format: e.target.value })}>{["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY", "DD MMM YYYY"].map(l => <option key={l}>{l}</option>)}</select></label>
          <label className="field">Number format<select className="control-select" value={settings.number_format} onChange={e => save({ number_format: e.target.value })}>{["en-US", "en-GB", "de-DE", "fr-FR", "ja-JP"].map(l => <option key={l}>{l}</option>)}</select></label>
          <label className="field">Timezone<input className="control-input" value={settings.timezone} onChange={e => save({ timezone: e.target.value })} /></label>
        </div>
      </Panel>
      <Panel title="Behaviour" subtitle="Safety and workflow preferences" color="#10b981">
        <Toggle checked={settings.auto_save} onChange={v => save({ auto_save: v })} label="Auto-save transformations" hint="Commit cleaning actions without a confirmation" />
        <Toggle checked={settings.confirm_destructive} onChange={v => save({ confirm_destructive: v })} label="Confirm destructive actions" hint="Ask before dropping columns or rows" />
        <Toggle checked={settings.show_tooltips} onChange={v => save({ show_tooltips: v })} label="Show tooltips" hint="Hover hints on charts and buttons" />
        <Toggle checked={settings.animate_charts} onChange={v => save({ animate_charts: v })} label="Animate charts" hint="Entrance animations for plots" />
        <div className="mini-stats">
          <div><small>Signed in as</small><b>{user?.full_name ?? "Analyst"}</b></div>
          <div><small>Email</small><b>{user?.email ?? "—"}</b></div>
          <div><small>Workspace</small><b>{user?.workspace_name ?? "—"}</b></div>
        </div>
      </Panel>
      <Panel title="Sections & navigation" subtitle="Hide any part of the studio you do not use" color="#f59e0b" className="span-2">
        <div className="section-toggles">{SECTIONS.map(s => <div key={s.id} className="section-toggle">
          <button className="icon-button" title={settings.sections[s.id] ? "Hide" : "Show"} onClick={() => save({ sections: { [s.id]: !settings.sections[s.id] } })} disabled={s.id === "settings"}>{settings.sections[s.id] ? <Eye size={14} /> : <EyeOff size={14} />}</button>
          <div><b>{s.label}</b><small>{settings.sections[s.id] ? "visible in the sidebar" : "hidden"}</small></div>
          <Toggle checked={settings.sections[s.id]} onChange={v => save({ sections: { [s.id]: v } })} label="" />
        </div>)}</div>
      </Panel>
    </div>}

    {tab === "overview" && <Panel title="Overview defaults" subtitle="KPI selection, preview sizes and analysis methods" color="#6366f1">
      <div className="settings-grid">
        <label className="field wide">KPI tiles (order matters)<select multiple className="control-select multi" value={settings.overview.kpi_row} onChange={e => save({ overview: { kpi_row: Array.from(e.target.selectedOptions).map(o => o.value) } })}>{["rows", "columns", "missing", "duplicates", "memory", "quality", "outliers"].map(k => <option key={k} value={k}>{k}</option>)}</select></label>
        <Slider label="Snapshot rows" value={settings.overview.preview_rows} min={3} max={100} onChange={v => save({ overview: { preview_rows: v } })} />
        <Slider label="Snapshot columns" value={settings.overview.preview_columns} min={2} max={40} onChange={v => save({ overview: { preview_columns: v } })} />
        <Slider label="Column summary rows" value={settings.overview.column_summary_rows} min={5} max={60} onChange={v => save({ overview: { column_summary_rows: v } })} />
        <Slider label="Histogram bins" value={settings.overview.histogram_bins} min={4} max={60} onChange={v => save({ overview: { histogram_bins: v } })} />
        <Slider label="Outlier threshold" value={settings.overview.outlier_threshold} min={0.5} max={5} step={0.1} onChange={v => save({ overview: { outlier_threshold: v } })} format={v => v.toFixed(1)} />
        <label className="field">Outlier method<select className="control-select" value={settings.overview.outlier_method} onChange={e => save({ overview: { outlier_method: e.target.value } })}><option value="iqr">IQR</option><option value="zscore">Z-score</option></select></label>
        <label className="field">Correlation method<select className="control-select" value={settings.overview.correlation_method} onChange={e => save({ overview: { correlation_method: e.target.value } })}><option value="pearson">Pearson</option><option value="spearman">Spearman</option></select></label>
        <label className="field">Auto-expanded section<select className="control-select" value={settings.overview.auto_expand} onChange={e => save({ overview: { auto_expand: e.target.value } })}>{["", "Completeness", "Missing Heatmap", "Outliers", "Correlation", "Distributions"].map(o => <option key={o} value={o}>{o || "None"}</option>)}</select></label>
      </div>
    </Panel>}

    {tab === "cleaning" && <Panel title="Cleaning defaults" subtitle="Pre-filled parameters for every operation" color="#10b981">
      <div className="settings-grid">
        <label className="field">Imputation strategy<select className="control-select" value={settings.cleaning.default_strategy} onChange={e => save({ cleaning: { default_strategy: e.target.value } })}>{["median", "mean", "mode", "constant", "ffill", "bfill", "zero"].map(o => <option key={o}>{o}</option>)}</select></label>
        <label className="field">Constant fallback<input className="control-input" value={settings.cleaning.constant_value} onChange={e => save({ cleaning: { constant_value: e.target.value } })} /></label>
        <label className="field">Duplicate keep<select className="control-select" value={settings.cleaning.duplicate_keep} onChange={e => save({ cleaning: { duplicate_keep: e.target.value } })}><option value="first">First</option><option value="last">Last</option></select></label>
        <Slider label="Outlier threshold" value={settings.cleaning.outlier_threshold} min={0.5} max={5} step={0.1} onChange={v => save({ cleaning: { outlier_threshold: v } })} format={v => v.toFixed(1)} />
        <Slider label="Category similarity" value={settings.cleaning.category_threshold} min={0.5} max={1} step={0.01} onChange={v => save({ cleaning: { category_threshold: v } })} format={v => v.toFixed(2)} />
        <Slider label="Version history limit" value={settings.cleaning.max_versions} min={10} max={200} step={10} onChange={v => save({ cleaning: { max_versions: v } })} />
      </div>
      <Toggle checked={settings.cleaning.auto_preview} onChange={v => save({ cleaning: { auto_preview: v } })} label="Preview operations before saving" hint="Show the dry-run before/after table by default" />
    </Panel>}

    {tab === "plots" && <div className="two-column">
      <Panel title="Chart defaults" subtitle="Applied to every new plot" color="#f59e0b">
        <div className="settings-grid">
          <label className="field">Palette<select className="control-select" value={settings.plots.palette} onChange={e => save({ plots: { palette: e.target.value } })}>{["ocean", "sunset", "forest", "violet", "mono", "candy"].map(o => <option key={o}>{o}</option>)}</select></label>
          <label className="field">Default chart<select className="control-select" value={settings.plots.default_type} onChange={e => save({ plots: { default_type: e.target.value } })}>{["bar", "line", "area", "scatter", "pie", "donut", "histogram", "box", "heatmap", "kpi"].map(o => <option key={o}>{o}</option>)}</select></label>
          <label className="field">Default aggregation<select className="control-select" value={settings.plots.default_aggregation} onChange={e => save({ plots: { default_aggregation: e.target.value } })}>{["sum", "mean", "median", "count", "min", "max", "nunique"].map(o => <option key={o}>{o}</option>)}</select></label>
          <Slider label="Categories shown" value={settings.plots.default_limit} min={3} max={100} onChange={v => save({ plots: { default_limit: v } })} />
          <Slider label="Histogram bins" value={settings.plots.bins} min={3} max={60} onChange={v => save({ plots: { bins: v } })} />
          <Slider label="Dashboard columns" value={settings.plots.dashboard_columns} min={1} max={4} onChange={v => save({ plots: { dashboard_columns: v } })} />
        </div>
        <Toggle checked={settings.plots.show_grid} onChange={v => save({ plots: { show_grid: v } })} label="Show grid lines" />
        <Toggle checked={settings.plots.show_legend} onChange={v => save({ plots: { show_legend: v } })} label="Show legends" />
        <Toggle checked={settings.plots.smooth_lines} onChange={v => save({ plots: { smooth_lines: v } })} label="Smooth line charts" />
      </Panel>
      <Panel title="Palette preview" subtitle="Sample data rendered with the active palette" color="#0ea5e9">
        <BarChart labels={["Alpha", "Beta", "Gamma", "Delta", "Epsilon"]} series={[{ name: "series 1", values: [42, 68, 31, 90, 54] }, { name: "series 2", values: [28, 45, 62, 38, 71] }]} grouped palette={settings.plots.palette} height={220} />
        <div className="palette-swatches">{["ocean", "sunset", "forest", "violet", "mono", "candy"].map(p => <button key={p} className={`palette-swatch ${settings.plots.palette === p ? "on" : ""}`} onClick={() => save({ plots: { palette: p } })}>{p}</button>)}</div>
      </Panel>
    </div>}

    {tab === "models" && <Panel title="Model defaults" subtitle="Pre-filled training configuration" color="#ef4444">
      <div className="settings-grid">
        <label className="field">Default task<select className="control-select" value={settings.models.default_task} onChange={e => save({ models: { default_task: e.target.value } })}>{["classification", "regression", "clustering", "anomaly"].map(o => <option key={o}>{o}</option>)}</select></label>
        <label className="field">Default algorithm<input className="control-input" value={settings.models.default_estimator} onChange={e => save({ models: { default_estimator: e.target.value } })} /></label>
        <Slider label="CV folds" value={settings.models.cv_folds} min={2} max={10} onChange={v => save({ models: { cv_folds: v } })} />
        <Slider label="Test size" value={settings.models.test_size} min={0.05} max={0.5} step={0.05} onChange={v => save({ models: { test_size: v } })} format={v => `${Math.round(v * 100)}%`} />
        <Slider label="Random seed" value={settings.models.random_seed} min={1} max={9999} onChange={v => save({ models: { random_seed: v } })} />
        <Slider label="Sweep candidates" value={settings.models.max_candidates} min={2} max={8} onChange={v => save({ models: { max_candidates: v } })} />
      </div>
      <label className="field">Sweep algorithms<select multiple className="control-select multi" value={settings.models.sweep_estimators} onChange={e => save({ models: { sweep_estimators: Array.from(e.target.selectedOptions).map(o => o.value) } })}>{["logistic_regression", "random_forest", "extra_trees", "gradient_boosting", "knn", "svm", "ridge", "linear_regression"].map(o => <option key={o} value={o}>{o.replaceAll("_", " ")}</option>)}</select></label>
      <Toggle checked={settings.models.tune} onChange={v => save({ models: { tune: v } })} label="Enable tuning by default" />
      <Toggle checked={settings.models.show_learning_curve} onChange={v => save({ models: { show_learning_curve: v } })} label="Compute learning curves" hint="Train-vs-validation curves on every run (slower)" />
    </Panel>}

    <Panel title="Saved configuration summary" subtitle="What the project will use next time" color="#64748b">
      <pre className="config-preview">{JSON.stringify(settings, null, 2)}</pre>
      <div className="inline-controls"><button className="btn-quiet" onClick={() => void update({})}><Save size={13} /> Re-sync from server</button><span className="muted small-note"><Database size={12} /> Stored per workspace on the API server.</span><span className="muted small-note"><Table2 size={12} /> {catalog?.total_models ?? 0} AI models · {catalog?.total_providers ?? 0} providers</span><span className="muted small-note"><Layers size={12} /> fallback: {provider?.id === "auto" ? "auto-selected" : provider?.id ?? "auto"}</span></div>
    </Panel>
  </section>;
}
