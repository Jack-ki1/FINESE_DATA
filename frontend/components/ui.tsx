"use client";
/* Shared primitives for the FINESE studio: page chrome, panels, and
 * analyst-facing controls (settings-driven where possible). */
import type { CSSProperties, ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export function PageTitle({ eyebrow, title, desc, actions, color = "#6366f1" }: { eyebrow: string; title: string; desc: string; actions?: ReactNode; color?: string }) {
  return (
    <div className="page-title-row">
      <div>
        <small style={{ color }}>{eyebrow}</small>
        <h1 style={{ background: `linear-gradient(90deg, ${color} 0%, #6366f1 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{title}</h1>
        <p>{desc}</p>
      </div>
      {actions}
    </div>
  );
}

export function Panel({ title, subtitle, action, children, color = "#0ea5e9", className, style, id }: { title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; color?: string; className?: string; style?: CSSProperties; id?: string }) {
  return (
    <div className={`panel ${className || ""}`} id={id} style={{ marginBottom: 13, background: `linear-gradient(135deg,#fff,${color}0b)`, border: `2px solid ${color}44`, ...style }}>
      {(title || action) && (
        <div className="panel-head">
          <div>{title && <h3 style={{ color }}>{title}</h3>}{subtitle && <small>{subtitle}</small>}</div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="field-n">
      <span className="field-n-label">{label}{hint && <em>{hint}</em>}</span>
      {children}
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" className={`toggle-n ${checked ? "on" : ""}`} onClick={() => onChange(!checked)} aria-pressed={checked}>
      <span className="sw"><i /></span>
      <span><b>{label}</b>{hint && <small>{hint}</small>}</span>
    </button>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, format = (v: number) => String(v), suffix }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string; suffix?: string }) {
  return (
    <label className="range-n">
      <span>{label}<b>{format(value)}{suffix}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
    </label>
  );
}

export function ChipPicker({ options, value, onChange, placeholder = "Choose fields…", max = 60, emptyText }: { options: string[]; value: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number; emptyText?: string }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter(v => v !== o) : [...value, o].slice(-max));
  if (!options.length && emptyText) return <div className="muted small-note">{emptyText}</div>;
  return (
    <div className="multiselect-n">
      <div className="chips-n">
        {value.length === 0 && <em className="muted small">{placeholder}</em>}
        {value.map(v => <span key={v} className="chip-n">{v}<button type="button" aria-label={`Remove ${v}`} onClick={() => toggle(v)}>×</button></span>)}
      </div>
      <select value="" onChange={e => { if (e.target.value) toggle(e.target.value); }}>
        <option value="">+ Add field…</option>
        {options.filter(o => !value.includes(o)).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/** Inline editable parameter rendered from a cleaning-operation spec. */
export type ParamSpec = { id: string; label: string; type: "select" | "toggle" | "number" | "text" | "column"; default?: unknown; options?: string[]; min?: number; max?: number; step?: number };

export function ParamField({ spec, value, onChange, columns = [] }: { spec: ParamSpec; value: unknown; onChange: (v: unknown) => void; columns?: string[] }) {
  if (spec.type === "toggle") {
    return <button type="button" className={`toggle-n ${value ? "on" : ""}`} onClick={() => onChange(!value)} aria-pressed={Boolean(value)}><span className="sw"><i /></span><span><b>{spec.label}</b></span></button>;
  }
  if (spec.type === "select") {
    return <label className="field">{spec.label}<select className="control-select" value={String(value ?? spec.default ?? "")} onChange={e => onChange(e.target.value)}>{spec.options?.map(o => <option key={o} value={o}>{o.replaceAll("_", " ")}</option>)}</select></label>;
  }
  if (spec.type === "column") {
    return <label className="field">{spec.label}<select className="control-select" value={String(value ?? "")} onChange={e => onChange(e.target.value)}><option value="">None</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select></label>;
  }
  if (spec.type === "number") {
    return <label className="field">{spec.label}<input className="control-input" type="number" min={spec.min} max={spec.max} step={spec.step ?? 1} value={value === null || value === undefined || value === "" ? "" : String(value)} onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))} /></label>;
  }
  return <label className="field">{spec.label}<input className="control-input" type="text" value={String(value ?? "")} onChange={e => onChange(e.target.value)} /></label>;
}

export function Segmented<T extends string>({ options, value, onChange, color = "#0ea5e9" }: { options: { id: T; label: ReactNode; icon?: ReactNode }[]; value: T; onChange: (v: T) => void; color?: string }) {
  return (
    <div className="segmented-n" role="tablist">
      {options.map(o => (
        <button key={o.id} type="button" role="tab" aria-selected={o.id === value} className={o.id === value ? "selected" : ""} onClick={() => onChange(o.id)}
          style={o.id === value ? { background: `linear-gradient(90deg,${color},${color}cc)` } : undefined}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

export function Accordion({ title, icon, meta, open, onToggle, color = "#0ea5e9", children, testId }: { title: string; icon?: ReactNode; meta?: ReactNode; open: boolean; onToggle: () => void; color?: string; children: ReactNode; testId?: string }) {
  return (
    <div className="analysis-body" style={{ borderColor: open ? color : `${color}55` }} data-testid={testId}>
      <button type="button" onClick={onToggle} aria-expanded={open} style={{ width: "100%", background: "transparent", border: 0, display: "flex", alignItems: "center", gap: 10, padding: 0, textAlign: "left" }}>
        <span style={{ fontSize: 17 }}>{icon}</span>
        <b style={{ color, fontSize: 13, flex: 1 }}>{title}</b>
        {meta && <span className="muted small">{meta}</span>}
        <ChevronRight size={15} color={color} style={{ transform: open ? "rotate(90deg)" : "none", transition: ".15s" }} />
      </button>
      {open && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, color = "#0ea5e9" }: { tabs: { id: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; color?: string }) {
  return (
    <div className="studio-tabs" role="tablist">
      {tabs.map(t => (
        <button key={t.id} type="button" role="tab" aria-selected={t.id === value} className={`studio-tab ${t.id === value ? "active" : ""}`} onClick={() => onChange(t.id)}
          style={t.id === value ? { background: `linear-gradient(90deg,${color},${color}cc)`, borderColor: color } : undefined}>
          {t.label}{t.count !== undefined && <span style={{ font: "700 8px 'DM Mono',monospace", opacity: .8 }}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function DataTable({ columns, rows, empty = "No rows", maxHeight }: { columns: string[]; rows: Record<string, unknown>[]; empty?: string; maxHeight?: number }) {
  if (!rows.length) return <div className="chart-empty-n">{empty}</div>;
  return (
    <div className="table-wrap" style={{ maxHeight }}>
      <table className="data-table">
        <thead><tr>{columns.map(c => <th key={c}>{c.replaceAll("_", " ")}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{columns.map(c => {
          const v = r[c];
          return <td key={c} className={c === columns[0] ? "file-name" : undefined}>{v === null || v === undefined ? <span className="muted">—</span> : typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 3 }) : String(v)}</td>;
        })}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function EmptyState({ title, desc, action, icon }: { title: string; desc: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="panel empty-state">
      {icon && <div className="drop-icon" style={{ margin: "0 auto", background: "linear-gradient(135deg,#e0f2fe,#bae6fd)", color: "#0284c7" }}>{icon}</div>}
      <h3>{title}</h3><p>{desc}</p>{action}
    </div>
  );
}

export const fmt = (v: number | null | undefined, digits = 2) => (v === null || v === undefined || Number.isNaN(v) ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: digits }));
