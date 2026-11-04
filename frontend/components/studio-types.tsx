"use client";
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

export type Dataset = { id: string; name: string; format: string; rows: number; columns: number; column_names: string[]; size_bytes: number; created_at: string };
export type ColumnProfile = { name: string; dtype: string; kind: string; non_null: number; missing: number; missing_pct: number; unique: number; unique_pct: number; mean?: number; median?: number; std?: number; min?: number; max?: number; q1?: number; q3?: number; outliers?: number; top_values?: { value: string; count: number }[] };
export type Profile = { rows: number; columns: number; missing_count: number; missing_pct: number; duplicate_count: number; memory_mb: number; quality_score: number; dimensions: { completeness: number; uniqueness: number; consistency: number | null; validity: number | null; timeliness: number | null; accuracy: number | null }; column_profiles: ColumnProfile[]; distributions: Record<string, { kind: string; labels: string[]; values: number[] }>; recommendations: { severity: string; title: string; detail: string }[]; correlation: { columns: string[]; matrix: number[][] } };
export type Preview = { columns: string[]; top: Record<string, unknown>[]; bottom: Record<string, unknown>[]; sample: Record<string, unknown>[] };
export type User = { id: string; email: string; full_name: string; workspace_id: string; workspace_name: string };
export type View = "upload" | "overview" | "cleaning" | "chat" | "models" | "export" | "settings";

export type Settings = {
  theme: string; density: string; accent: string; timezone: string; number_format: string; date_format: string; language: string;
  auto_save: boolean; confirm_destructive: boolean; show_tooltips: boolean; animate_charts: boolean;
  sections: Record<View, boolean>;
  overview: { kpi_row: string[]; preview_rows: number; preview_columns: number; column_summary_rows: number; histogram_bins: number; outlier_method: string; outlier_threshold: number; correlation_method: string; scatter_sample: number; auto_expand: string };
  cleaning: { default_strategy: string; constant_value: string; outlier_threshold: number; duplicate_keep: string; auto_preview: boolean; max_versions: number; category_threshold: number };
  plots: { palette: string; default_type: string; default_aggregation: string; default_limit: number; bins: number; show_grid: boolean; show_legend: boolean; smooth_lines: boolean; dashboard_columns: number };
  models: { default_task: string; default_estimator: string; cv_folds: number; test_size: number; random_seed: number; tune: boolean; sweep_estimators: string[]; max_candidates: number; show_learning_curve: boolean };
  ai: { provider: string; model: string; temperature: number; max_tokens: number; share_context: boolean; include_sample_rows: boolean; system_style: string; custom_base_url: string; monthly_token_budget: number };
};

export type AIModel = { id: string; label: string; context: string; tier: string };
export type AIProvider = { id: string; label: string; kind: string; env_var: string | null; configured: boolean; docs: string; models: AIModel[] };
export type AICatalog = { providers: AIProvider[]; total_models: number; total_providers: number };

type Ctx = {
  settings: Settings | null;
  catalog: AICatalog | null;
  saving: boolean;
  update: (patch: Partial<Settings> | Record<string, unknown>) => Promise<Settings | null>;
  reset: () => Promise<Settings | null>;
  reload: () => Promise<void>;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [catalog, setCatalog] = useState<AICatalog | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await api<{ settings: Settings; ai_catalog: AICatalog }>("api/settings");
      setSettings(data.settings); setCatalog(data.ai_catalog);
    } catch { /* session errors surface elsewhere */ }
  }, []);
  // Load once on mount; the callback guards against a second invocation.
  useEffect(() => {
    let cancelled = false;
    api<{ settings: Settings; ai_catalog: AICatalog }>("api/settings")
      .then(data => { if (!cancelled) { setSettings(data.settings); setCatalog(data.ai_catalog); } })
      .catch(() => { /* session errors surface elsewhere */ });
    return () => { cancelled = true; };
  }, []);

  const update = useCallback(async (patch: Partial<Settings> | Record<string, unknown>) => {
    setSettings(prev => prev ? deepMerge(prev, patch) : prev);
    setSaving(true);
    try {
      const data = await api<{ settings: Settings }>("api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      setSettings(data.settings); return data.settings;
    } catch { await reload(); return null; } finally { setSaving(false); }
  }, [reload]);

  const reset = useCallback(async () => {
    setSaving(true);
    try { const data = await api<{ settings: Settings }>("api/settings/reset", { method: "POST" }); setSettings(data.settings); return data.settings; }
    catch { return null; } finally { setSaving(false); }
  }, []);

  const value = useMemo(() => ({ settings, catalog, saving, update, reset, reload }), [settings, catalog, saving, update, reset, reload]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

export function deepMerge<T>(base: T, patch: unknown): T {
  if (Array.isArray(base) || typeof base !== "object" || base === null) return (patch === undefined ? base : patch) as T;
  if (typeof patch !== "object" || patch === null) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    if (k in out) out[k] = deepMerge((out as Record<string, unknown>)[k], v);
    else out[k] = v;
  }
  return out as T;
}

export const DEFAULT_KPIS = ["rows", "columns", "missing", "duplicates", "memory"];
export const KPI_LABELS: Record<string, string> = { rows: "ROWS", columns: "COLUMNS", missing: "MISSING", duplicates: "DUPLICATES", memory: "MEMORY", quality: "HEALTH", outliers: "OUTLIERS" };
