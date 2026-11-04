"use client";
/* Lightweight, dependency-free SVG chart set for the FINESE studio.
 * All components are responsive (viewBox based), keyboard/hover friendly and
 * honour the analyst's palette, grid and animation settings. */
import { ReactNode, useMemo } from "react";

export type Palette = "ocean" | "sunset" | "forest" | "violet" | "mono" | "candy";

export const PALETTES: Record<Palette, string[]> = {
  ocean: ["#0ea5e9", "#6366f1", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#22c55e", "#ec4899"],
  sunset: ["#f97316", "#ef4444", "#f59e0b", "#db2777", "#7c3aed", "#0891b2", "#65a30d", "#b45309"],
  forest: ["#10b981", "#059669", "#65a30d", "#0d9488", "#84cc16", "#047857", "#a3e635", "#0369a1"],
  violet: ["#8b5cf6", "#6366f1", "#a855f7", "#d946ef", "#3b82f6", "#7c3aed", "#ec4899", "#06b6d4"],
  mono: ["#0f172a", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#1e293b", "#334155", "#e2e8f0"],
  candy: ["#ec4899", "#f472b6", "#8b5cf6", "#22d3ee", "#facc15", "#fb7185", "#a78bfa", "#34d399"],
};

export function paletteColors(palette: string | undefined, count: number): string[] {
  const base = PALETTES[(palette as Palette) || "ocean"] || PALETTES.ocean;
  return Array.from({ length: count }, (_, i) => base[i % base.length]);
}

export interface ChartFrameProps {
  title?: string;
  subtitle?: ReactNode;
  height?: number;
  action?: ReactNode;
  footer?: ReactNode;
  palette?: string;
  animate?: boolean;
  className?: string;
  testId?: string;
  children?: ReactNode;
}

/** Card frame shared by every chart so spacing/typography stays consistent. */
export function ChartFrame({ title, subtitle, height = 240, action, footer, children, className, testId }: ChartFrameProps) {
  return (
    <div className={`chart-frame ${className || ""}`} data-testid={testId}>
      {(title || action) && (
        <div className="chart-frame-head">
          <div><b>{title}</b>{subtitle && <small>{subtitle}</small>}</div>
          {action}
        </div>
      )}
      <div className="chart-frame-body" style={{ minHeight: height }}>{children}</div>
      {footer && <div className="chart-frame-foot">{footer}</div>}
    </div>
  );
}

/** Entrance animations are CSS-driven; charts always render their final state. */
const ready = true;

const fmt = (v: number | null | undefined, digits = 1) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(digits)}M`;
  if (abs >= 1e4) return `${(v / 1e3).toFixed(digits)}K`;
  if (abs >= 100) return v.toFixed(0);
  if (abs >= 1) return v.toFixed(digits);
  return v.toPrecision(2);
};

function niceTicks(min: number, max: number, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) return [min - 1, min, min + 1];
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = (span / count) / step;
  const mult = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  const nice = step * mult;
  const start = Math.floor(min / nice) * nice;
  const ticks: number[] = [];
  for (let t = start; t <= max + nice / 2; t += nice) ticks.push(Number(t.toFixed(10)));
  return ticks;
}

const W = 640;

/* ---------------------------------------------------------------- Bars ---- */
export interface SeriesDatum { name: string; values: number[] }

export function BarChart({ labels, series, palette = "ocean", horizontal = false, stacked = false, grouped = false,
  height = 240, valueFormatter = (v: number) => fmt(v) }: {
  labels: string[]; series: SeriesDatum[]; palette?: string; horizontal?: boolean; stacked?: boolean; grouped?: boolean;
  height?: number; valueFormatter?: (v: number) => string;
}) {
  const colors = paletteColors(palette, Math.max(series.length, 1));
  const H = height;
  const maxValue = Math.max(1e-9, ...(stacked
    ? labels.map((_, i) => series.reduce((s, d) => s + (d.values[i] || 0), 0))
    : series.flatMap(d => d.values.map(v => Math.abs(v)))));
  if (!labels.length) return <EmptyChart height={H} />;
  if (horizontal) {
    const rowH = Math.max(16, Math.min(34, (H - 24) / labels.length));
    const totalH = labels.length * rowH + 24;
    const left = 110; const right = W - 20;
    return (
      <svg viewBox={`0 0 ${W} ${totalH}`} className="chart-svg" role="img" aria-label="horizontal bar chart">
        {labels.slice(0, 40).map((label, i) => {
          const value = series[0]?.values[i] || 0;
          const width = Math.max(1, (Math.abs(value) / maxValue) * (right - left));
          const y = 14 + i * rowH;
          return <g key={`${label}-${i}`}>
            <title>{`${label}: ${valueFormatter(value)}`}</title>
            <text x={left - 8} y={y + rowH / 2 + 3} textAnchor="end" className="chart-axis-text">{label.length > 16 ? `${label.slice(0, 15)}…` : label}</text>
            <rect x={left} y={y + 3} width={ready ? width : 0} height={rowH - 8} rx={3} fill={colors[i % colors.length]} style={{ transition: "width .6s ease" }} />
            <text x={left + width + 6} y={y + rowH / 2 + 3} className="chart-value-text">{valueFormatter(value)}</text>
          </g>;
        })}
      </svg>
    );
  }
  const top = 12; const bottom = H - 30; const left = 42; const right = W - 10;
  const ticks = niceTicks(0, maxValue, 4);
  const tickMax = Math.max(...ticks, maxValue);
  const slot = (right - left) / labels.length;
  const barWidth = stacked || !grouped ? slot * 0.62 : slot * 0.72 / Math.max(series.length, 1);
  const yOf = (v: number) => bottom - (v / tickMax) * (bottom - top);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="bar chart">
      {ticks.map(t => <g key={t}>
        <line x1={left} x2={right} y1={yOf(t)} y2={yOf(t)} className="chart-grid-line" />
        <text x={left - 6} y={yOf(t) + 3} textAnchor="end" className="chart-axis-text">{fmt(t)}</text>
      </g>)}
      {labels.map((label, i) => {
        const x0 = left + i * slot;
        if (stacked || (!grouped && series.length === 1)) {
          let acc = 0;
          return <g key={`${label}-${i}`}>
            <title>{`${label}\n${series.map(s => `${s.name}: ${valueFormatter(s.values[i] || 0)}`).join("\n")}`}</title>
            {series.map((s, si) => {
              const v = s.values[i] || 0; const y1 = yOf(acc); acc += v; const y2 = yOf(acc);
              return <rect key={si} x={x0 + slot * 0.19} y={ready ? y2 : bottom} width={barWidth} height={Math.max(0, y1 - y2)} fill={colors[si % colors.length]} rx={2} style={{ transition: "y .5s ease, height .5s ease" }} />;
            })}
            <text x={x0 + slot / 2} y={bottom + 14} textAnchor="middle" className="chart-axis-text">{label.length > 10 ? `${label.slice(0, 9)}…` : label}</text>
          </g>;
        }
        return <g key={`${label}-${i}`}>
          {series.map((s, si) => {
            const v = s.values[i] || 0; const h = bottom - yOf(v);
            return <g key={si}>
              <title>{`${label} · ${s.name}: ${valueFormatter(v)}`}</title>
              <rect x={x0 + slot * 0.14 + si * barWidth} y={ready ? yOf(v) : bottom} width={barWidth * 0.92} height={Math.max(1, h)} fill={colors[si % colors.length]} rx={2} style={{ transition: "y .5s ease, height .5s ease" }} />
            </g>;
          })}
          <text x={x0 + slot / 2} y={bottom + 14} textAnchor="middle" className="chart-axis-text">{label.length > 10 ? `${label.slice(0, 9)}…` : label}</text>
        </g>;
      })}
      <line x1={left} x2={right} y1={bottom} y2={bottom} className="chart-axis-line" />
    </svg>
  );
}

/* ---------------------------------------------------------------- Line ---- */
export function LineChart({ labels, series, palette = "ocean", area = false, smooth = false, height = 240, yLabel,
  markers = false }: {
  labels: string[]; series: SeriesDatum[]; palette?: string; area?: boolean; smooth?: boolean; height?: number; yLabel?: string; markers?: boolean;
}) {
  const colors = paletteColors(palette, Math.max(series.length, 1));
  const H = height; const top = 12; const bottom = H - 28; const left = 44; const right = W - 12;
  const values = series.flatMap(s => s.values).filter(v => Number.isFinite(v));
  if (!labels.length || !values.length) return <EmptyChart height={H} />;
  const ticks = niceTicks(Math.min(0, ...values), Math.max(...values), 4);
  const lo = Math.min(...ticks); const hi = Math.max(...ticks);
  const xOf = (i: number) => left + (labels.length === 1 ? (right - left) / 2 : (i / (labels.length - 1)) * (right - left));
  const yOf = (v: number) => bottom - ((v - lo) / (hi - lo || 1)) * (bottom - top);
  const pathFor = (vals: number[]) => {
    const pts = vals.map((v, i) => [xOf(i), yOf(v)]);
    if (!smooth || pts.length < 3) return pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="line chart">
      {ticks.map(t => <g key={t}>
        <line x1={left} x2={right} y1={yOf(t)} y2={yOf(t)} className="chart-grid-line" />
        <text x={left - 6} y={yOf(t) + 3} textAnchor="end" className="chart-axis-text">{fmt(t)}</text>
      </g>)}
      {series.map((s, si) => {
        const d = pathFor(s.values);
        return <g key={s.name}>
          <title>{s.name}</title>
          {area && <path d={`${d} L${xOf(labels.length - 1)},${bottom} L${xOf(0)},${bottom} Z`} fill={colors[si % colors.length]} opacity={0.12} />}
          <path d={d} fill="none" stroke={colors[si % colors.length]} strokeWidth={2.2} strokeLinecap="round"
            style={{ strokeDasharray: 2000, strokeDashoffset: ready ? 0 : 2000, transition: "stroke-dashoffset 1.1s ease" }} />
          {markers && s.values.map((v, i) => <circle key={i} cx={xOf(i)} cy={yOf(v)} r={2.6} fill={colors[si % colors.length]}><title>{`${labels[i]}: ${fmt(v)}`}</title></circle>)}
        </g>;
      })}
      <line x1={left} x2={right} y1={bottom} y2={bottom} className="chart-axis-line" />
      {labels.map((label, i) => (labels.length <= 14 || i % Math.ceil(labels.length / 10) === 0) &&
        <text key={`${label}-${i}`} x={xOf(i)} y={bottom + 14} textAnchor="middle" className="chart-axis-text">{label.length > 10 ? `${label.slice(0, 9)}…` : label}</text>)}
      {yLabel && <text x={6} y={12} className="chart-axis-text">{yLabel}</text>}
    </svg>
  );
}

/* ------------------------------------------------------------- Scatter ---- */
export function ScatterChart({ points, xLabel, yLabel, palette = "ocean", height = 260, bubble = false, correlation,
  series }: { points: number[][] | { name: string; points: number[][] }[]; xLabel?: string; yLabel?: string; palette?: string;
    height?: number; bubble?: boolean; correlation?: number | null; series?: string }) {
  const groups: { name: string; points: number[][] }[] = Array.isArray(points) && points.length && Array.isArray(points[0])
    ? [{ name: "data", points: points as number[][] }] : (points as { name: string; points: number[][] }[]);
  const flat = groups.flatMap(g => g.points).filter(p => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  const H = height; const left = 46; const bottom = H - 26; const right = W - 12; const top = 12;
  if (!flat.length) return <EmptyChart height={H} />;
  const xs = flat.map(p => p[0]); const ys = flat.map(p => p[1]);
  const xt = niceTicks(Math.min(...xs), Math.max(...xs), 4); const yt = niceTicks(Math.min(...ys), Math.max(...ys), 4);
  const xOf = (v: number) => left + ((v - xt[0]) / ((xt[xt.length - 1] - xt[0]) || 1)) * (right - left);
  const yOf = (v: number) => bottom - ((v - yt[0]) / ((yt[yt.length - 1] - yt[0]) || 1)) * (bottom - top);
  const colors = paletteColors(palette, Math.max(groups.length, 1));
  const sizes = bubble ? flat.map(p => p[2] || 0) : [];
  const maxSize = Math.max(1, ...sizes);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="scatter chart">
      {yt.map(t => <g key={`y${t}`}><line x1={left} x2={right} y1={yOf(t)} y2={yOf(t)} className="chart-grid-line" /><text x={left - 6} y={yOf(t) + 3} textAnchor="end" className="chart-axis-text">{fmt(t)}</text></g>)}
      {xt.map(t => <g key={`x${t}`}><line x1={xOf(t)} x2={xOf(t)} y1={top} y2={bottom} className="chart-grid-line" /><text x={xOf(t)} y={bottom + 14} textAnchor="middle" className="chart-axis-text">{fmt(t)}</text></g>)}
      {groups.map((g, gi) => <g key={g.name}>
        <title>{g.name}</title>
        {g.points.map((p, i) => (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) &&
          <circle key={i} cx={xOf(p[0])} cy={yOf(p[1])} r={bubble ? 2.5 + 6 * Math.sqrt((p[2] || 0) / maxSize) : 3}
            fill={colors[gi % colors.length]} opacity={0.62}><title>{`${xLabel || "x"}: ${fmt(p[0], 2)}\n${yLabel || "y"}: ${fmt(p[1], 2)}`}</title></circle>)}
      </g>)}
      <line x1={left} x2={right} y1={bottom} y2={bottom} className="chart-axis-line" />
      {xLabel && <text x={(left + right) / 2} y={H - 4} textAnchor="middle" className="chart-axis-text">{xLabel}</text>}
      {yLabel && <text x={6} y={10} className="chart-axis-text">{yLabel}</text>}
      {typeof correlation === "number" && Number.isFinite(correlation) && <text x={right} y={14} textAnchor="end" className="chart-corr">r = {correlation.toFixed(3)}</text>}
      {series && <text x={right} y={H - 6} textAnchor="end" className="chart-axis-text">colour: {series}</text>}
    </svg>
  );
}

/* ----------------------------------------------------------- Histogram ---- */
export function Histogram({ labels, values, palette = "ocean", height = 220 }: { labels: string[]; values: number[]; palette?: string; height?: number }) {
  return <BarChart labels={labels} series={[{ name: "count", values }]} palette={palette} height={height} valueFormatter={(v) => v.toLocaleString()} />;
}

/* ----------------------------------------------------------- Heatmap ---- */
export function Heatmap({ rows, cols, matrix, height = 300, diverging = false, formatValue = (v: number) => fmt(v) }: {
  rows: string[]; cols: string[]; matrix: number[][]; height?: number; diverging?: boolean; formatValue?: (v: number) => string;
}) {
  if (!rows.length || !cols.length) return <EmptyChart height={height} />;
  const left = Math.min(140, Math.max(...rows.map(r => r.length)) * 6.2 + 12);
  const cellW = (W - left - 12) / cols.length;
  const cellH = Math.max(16, Math.min(34, (height - 40) / rows.length));
  const H = rows.length * cellH + 34;
  const flat = matrix.flat().filter(Number.isFinite);
  const lo = Math.min(...flat); const hi = Math.max(...flat);
  const scale = (v: number) => {
    if (diverging) {
      if (v >= 0) return `rgba(239,68,68,${0.15 + 0.85 * (v / (hi || 1))})`;
      return `rgba(14,165,233,${0.15 + 0.85 * (v / (lo || -1))})`;
    }
    return `rgba(14,165,233,${0.10 + 0.85 * ((v - lo) / ((hi - lo) || 1))})`;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="heatmap">
      {cols.map((c, ci) => ci % Math.ceil(cols.length / 10) === 0 && <text key={c + ci} x={left + ci * cellW + cellW / 2} y={12} textAnchor="middle" className="chart-axis-text">{c.length > 9 ? `${c.slice(0, 8)}…` : c}</text>)}
      {rows.map((r, ri) => <g key={r + ri}>
        <text x={left - 6} y={24 + ri * cellH + cellH / 2 + 3} textAnchor="end" className="chart-axis-text">{r.length > 18 ? `${r.slice(0, 17)}…` : r}</text>
        {cols.map((c, ci) => {
          const v = matrix[ri]?.[ci] ?? 0;
          return <rect key={c + ci} x={left + ci * cellW} y={22 + ri * cellH} width={cellW - 1.5} height={cellH - 1.5} rx={2} fill={scale(v)}>
            <title>{`${r} × ${c}: ${formatValue(v)}`}</title>
          </rect>;
        })}
      </g>)}
    </svg>
  );
}

/* ------------------------------------------------------- Confusion ---- */
export function ConfusionMatrix({ labels, matrix }: { labels: string[]; matrix: number[][] }) {
  if (!labels.length || !matrix.length) return <EmptyChart height={220} />;
  const left = 84; const top = 24; const size = Math.min((W - left - 20) / labels.length, 64);
  const max = Math.max(1, ...matrix.flat());
  return (
    <svg viewBox={`0 0 ${W} ${Math.max(220, top + labels.length * size + 30)}`} className="chart-svg" role="img" aria-label="confusion matrix">
      {labels.map((l, ci) => <text key={l + ci} x={left + ci * size + size / 2} y={16} textAnchor="middle" className="chart-axis-text">{l.length > 8 ? `${l.slice(0, 7)}…` : l}</text>)}
      {matrix.map((row, ri) => <g key={ri}>
        <text x={left - 6} y={top + ri * size + size / 2 + 3} textAnchor="end" className="chart-axis-text">{labels[ri]?.length > 10 ? `${labels[ri].slice(0, 9)}…` : labels[ri]}</text>
        {row.map((v, ci) => <g key={ci}>
          <rect x={left + ci * size} y={top + ri * size} width={size - 2} height={size - 2} rx={4} fill={ri === ci ? `rgba(16,163,107,${0.18 + 0.7 * (v / max)})` : `rgba(239,68,68,${0.10 + 0.6 * (v / max)})`}>
            <title>{`actual ${labels[ri]} → predicted ${labels[ci]}: ${v}`}</title>
          </rect>
          <text x={left + ci * size + size / 2 - 1} y={top + ri * size + size / 2 + 4} textAnchor="middle" className="chart-cell-text">{v.toLocaleString()}</text>
        </g>)}
      </g>)}
      <text x={left} y={top + labels.length * size + 18} className="chart-axis-text">rows = actual · columns = predicted</text>
    </svg>
  );
}

/* --------------------------------------------------------------- Box ---- */
export function BoxPlot({ boxes, height = 260, palette = "ocean" }: {
  boxes: { label: string; low: number; q1: number; median: number; q3: number; high: number; count: number; outliers: number[] }[];
  height?: number; palette?: string;
}) {
  if (!boxes.length) return <EmptyChart height={height} />;
  const colors = paletteColors(palette, Math.max(boxes.length, 1));
  const all = boxes.flatMap(b => [b.low, b.high, ...b.outliers]).filter(Number.isFinite);
  const ticks = niceTicks(Math.min(...all), Math.max(...all), 4);
  const lo = ticks[0]; const hi = ticks[ticks.length - 1];
  const yOf = (v: number) => 10 + (1 - (v - lo) / ((hi - lo) || 1)) * (height - 46);
  const slot = (W - 44) / boxes.length;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="chart-svg" role="img" aria-label="box plot">
      {ticks.map(t => <g key={t}><line x1={40} x2={W - 8} y1={yOf(t)} y2={yOf(t)} className="chart-grid-line" /><text x={34} y={yOf(t) + 3} textAnchor="end" className="chart-axis-text">{fmt(t)}</text></g>)}
      {boxes.map((b, i) => {
        const x = 44 + i * slot + slot / 2; const bw = Math.min(38, slot * 0.5);
        return <g key={b.label + i}>
          <title>{`${b.label}\nmedian ${fmt(b.median)} · n=${b.count}`}</title>
          <line x1={x} x2={x} y1={yOf(b.high)} y2={yOf(b.low)} stroke={colors[i % colors.length]} strokeWidth={1.4} />
          <line x1={x - bw / 3} x2={x + bw / 3} y1={yOf(b.high)} y2={yOf(b.high)} stroke={colors[i % colors.length]} strokeWidth={1.4} />
          <line x1={x - bw / 3} x2={x + bw / 3} y1={yOf(b.low)} y2={yOf(b.low)} stroke={colors[i % colors.length]} strokeWidth={1.4} />
          <rect x={x - bw / 2} y={yOf(b.q3)} width={bw} height={Math.max(1, yOf(b.q1) - yOf(b.q3))} fill={colors[i % colors.length]} opacity={0.35} stroke={colors[i % colors.length]} rx={2} />
          <line x1={x - bw / 2} x2={x + bw / 2} y1={yOf(b.median)} y2={yOf(b.median)} stroke={colors[i % colors.length]} strokeWidth={2.4} />
          {b.outliers.slice(0, 25).map((o, oi) => <circle key={oi} cx={x + ((oi % 3) - 1) * 3} cy={yOf(o)} r={2} fill={colors[i % colors.length]} opacity={0.55} />)}
          <text x={x} y={height - 14} textAnchor="middle" className="chart-axis-text">{b.label.length > 9 ? `${b.label.slice(0, 8)}…` : b.label}</text>
        </g>;
      })}
    </svg>
  );
}

/* ------------------------------------------------- Pie / Donut / Treemap ---- */
function arcPath(cx: number, cy: number, r: number, start: number, end: number, inner = 0) {
  const p = (angle: number, radius: number) => [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  const [x1, y1] = p(start, r); const [x2, y2] = p(end, r);
  const large = end - start > Math.PI ? 1 : 0;
  if (!inner) return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
  const [x3, y3] = p(end, inner); const [x4, y4] = p(start, inner);
  return `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${inner},${inner} 0 ${large} 0 ${x4},${y4} Z`;
}

export function PieChart({ labels, values, palette = "ocean", donut = false, height = 240 }: { labels: string[]; values: number[]; palette?: string; donut?: boolean; height?: number }) {
  const total = values.reduce((s, v) => s + Math.max(0, v), 0);
  const empty = !labels.length || total <= 0;
  const colors = paletteColors(palette, Math.max(labels.length, 1));
  const cx = 150; const cy = height / 2; const r = Math.min(height / 2 - 12, 104); const inner = donut ? r * 0.58 : 0;
  const slices = useMemo(() => {
    const sweeps = labels.map((label, i) => ({ label, value: values[i] ?? 0, sweep: (Math.max(0, values[i] ?? 0) / (total || 1)) * Math.PI * 2 }));
    return sweeps.reduce<{ label: string; value: number; start: number; end: number }[]>((acc, s, i) => {
      const start = i === 0 ? -Math.PI / 2 : acc[i - 1].end;
      acc.push({ label: s.label, value: s.value, start, end: start + s.sweep });
      return acc;
    }, []);
  }, [labels, values, total]);
  if (empty) return <EmptyChart height={height} />;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="chart-svg" role="img" aria-label="pie chart">
      {slices.map((slice, i) => <path key={slice.label + i} d={arcPath(cx, cy, r, slice.start, slice.end, inner)} fill={colors[i % colors.length]} stroke="white" strokeWidth={1.5}>
        <title>{`${slice.label}: ${fmt(slice.value)} (${((slice.value / total) * 100).toFixed(1)}%)`}</title>
        </path>)}
      {donut && <><text x={cx} y={cy - 2} textAnchor="middle" className="chart-kpi-text">{fmt(total)}</text><text x={cx} y={cy + 14} textAnchor="middle" className="chart-axis-text">total</text></>}
      {labels.slice(0, 8).map((label, i) => <g key={`l${label}${i}`}>
        <rect x={310} y={30 + i * 20} width={10} height={10} rx={2} fill={colors[i % colors.length]} />
        <text x={326} y={38 + i * 20} className="chart-axis-text">{label.length > 22 ? `${label.slice(0, 21)}…` : label}</text>
        <text x={W - 12} y={38 + i * 20} textAnchor="end" className="chart-axis-text">{((values[i] / total) * 100).toFixed(1)}%</text>
      </g>)}
    </svg>
  );
}

export function Treemap({ labels, values, palette = "ocean", height = 240 }: { labels: string[]; values: number[]; palette?: string; height?: number }) {
  const total = values.reduce((s, v) => s + Math.max(v, 0), 0);
  const colors = paletteColors(palette, Math.max(labels.length, 1));
  // Simple squarified-ish layout along rows of decreasing area (pure reduce).
  const rects = useMemo(() => {
    const items = labels.map((l, i) => ({ label: l, value: Math.max(values[i], 0) })).sort((a, b) => b.value - a.value);
    return items.reduce<{ x: number; y: number; w: number; h: number; label: string; value: number; i: number }[]>((acc, item) => {
    const prev = acc[acc.length - 1];
    const x = prev ? prev.x - 1 + prev.w + 2 : 0;
    const y = prev ? prev.y - 1 : 0;
    const area = item.value * (W * height) / total;
    const rowH = prev ? Math.max(prev.h + 2, 1) : Math.min(height, Math.max(28, Math.sqrt(area) * 1.2));
    let w = area / rowH;
    let drawX = x; let drawY = y;
    if (drawX + w > W && prev) { drawY = y + rowH; drawX = 0; w = area / rowH; }
    acc.push({ x: drawX + 1, y: drawY + 1, w: Math.max(2, w - 2), h: Math.max(2, Math.min(rowH, height - drawY) - 2), label: item.label, value: item.value, i: acc.length });
    return acc;
    }, []);
  }, [labels, values, total, height]);
  if (!labels.length || total <= 0) return <EmptyChart height={height} />;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="chart-svg" role="img" aria-label="treemap">
      {rects.map(r => <g key={r.label + r.i}>
        <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={3} fill={colors[r.i % colors.length]} opacity={0.82}>
          <title>{`${r.label}: ${fmt(r.value)} (${((r.value / total) * 100).toFixed(1)}%)`}</title>
        </rect>
        {r.w > 60 && r.h > 22 && <text x={r.x + 6} y={r.y + 15} className="chart-cell-text" fill="white">{r.label.slice(0, Math.floor(r.w / 7))}</text>}
        {r.w > 60 && r.h > 36 && <text x={r.x + 6} y={r.y + 29} className="chart-cell-text" fill="white" opacity={0.85}>{fmt(r.value)}</text>}
      </g>)}
    </svg>
  );
}

export function Funnel({ labels, values, palette = "ocean", height = 240 }: { labels: string[]; values: number[]; palette?: string; height?: number }) {
  if (!labels.length) return <EmptyChart height={height} />;
  const colors = paletteColors(palette, labels.length);
  const max = Math.max(...values, 1);
  const rowH = Math.min(38, (height - 10) / labels.length);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="chart-svg" role="img" aria-label="funnel">
      {labels.map((label, i) => {
        const w = (Math.max(values[i], 0) / max) * (W - 180);
        const y = 6 + i * rowH;
        return <g key={label + i}>
          <title>{`${label}: ${fmt(values[i])}`}</title>
          <rect x={(W - w) / 2} y={y} width={w} height={rowH - 6} rx={3} fill={colors[i % colors.length]} opacity={0.9} />
          <text x={W / 2} y={y + rowH / 2 + 2} textAnchor="middle" className="chart-cell-text" fill="white">{label.length > 26 ? `${label.slice(0, 25)}…` : label} · {fmt(values[i])}</text>
        </g>;
      })}
    </svg>
  );
}

export function Sparkline({ values, color = "#0ea5e9", width = 110, height = 30 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (!values.length) return null;
  const min = Math.min(...values); const max = Math.max(...values);
  const pts = values.map((v, i) => [i * (width / Math.max(1, values.length - 1)), height - ((v - min) / ((max - min) || 1)) * (height - 4) - 2]);
  return <svg viewBox={`0 0 ${width} ${height}`} className="sparkline" aria-hidden><path d={pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")} fill="none" stroke={color} strokeWidth={1.8} /></svg>;
}

export function GaugeRing({ value, max = 100, color = "#10b981", size = 130, label }: { value: number; max?: number; color?: string; size?: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return <div className="gauge-ring" style={{ width: size, height: size, background: `conic-gradient(${color} 0 ${pct}%, #e8eef5 ${pct}% 100%)` }}>
    <div className="gauge-ring-inner">
      <b style={{ color }}>{Number.isFinite(value) ? Math.round(value * 10) / 10 : "—"}</b>
      {label && <small>{label}</small>}
    </div>
  </div>;
}

/* --------------------------------------------------------- Helpers ---- */
export function EmptyChart({ height = 200, message = "No data available for this view yet." }: { height?: number; message?: string }) {
  return <div className="chart-empty-n" style={{ minHeight: height }}>{message}</div>;
}

export function Legend({ items, palette = "ocean" }: { items: string[]; palette?: string }) {
  const colors = useMemo(() => paletteColors(palette, items.length), [palette, items.length]);
  return <div className="chart-legend-x">{items.map((it, i) => <span key={it + i}><i style={{ background: colors[i % colors.length] }} />{it}</span>)}</div>;
}

export function MetricBarList({ items, palette = "ocean", format = (v: number) => fmt(v) }: { items: { label: string; value: number }[]; palette?: string; format?: (v: number) => string }) {
  const colors = paletteColors(palette, Math.max(items.length, 1));
  const max = Math.max(1e-9, ...items.map(i => Math.abs(i.value)));
  if (!items.length) return <EmptyChart height={120} message="Nothing to rank yet." />;
  return <div className="metric-bar-list">{items.map((it, i) => <div key={it.label + i} className="metric-bar-row">
    <span className="metric-bar-label" title={it.label}>{it.label}</span>
    <span className="metric-bar-track"><i style={{ width: `${(Math.abs(it.value) / max) * 100}%`, background: colors[i % colors.length] }} /></span>
    <b>{format(it.value)}</b>
  </div>)}</div>;
}

export function StatTile({ label, value, hint, color = "#0ea5e9", icon }: { label: string; value: ReactNode; hint?: string; color?: string; icon?: ReactNode }) {
  return <div className="stat-tile" style={{ borderColor: `${color}33`, background: `linear-gradient(135deg, white 0%, ${color}0d 100%)` }}>
    <div className="stat-tile-top"><span style={{ color }}>{label}</span>{icon}</div>
    <strong style={{ color }}>{value}</strong>
    {hint && <small>{hint}</small>}
  </div>;
}

export { fmt };
