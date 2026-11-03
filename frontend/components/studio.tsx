"use client";

import Link from "next/link";
import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Layout,
  FileText,
  Scissors,
  BarChart3,
  Sliders,
  HelpCircle,
  Settings,
  Send,
  Database,
  RefreshCw,
  Moon,
  Sun,
  ChevronRight,
  Download,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  ExternalLink,
  Shield,
  FileSpreadsheet,
} from "lucide-react";
import {
  cleanDataset,
  DataRow,
  Dataset,
  formatNumber,
  getSampleDataset,
  localInsight,
  parseCSV,
  profileDataset,
  runSafeQuery,
  STORAGE_KEY,
  THEME_KEY,
  toCSV,
} from "@/lib/data";

export type StudioTool =
  | "overview"
  | "data"
  | "clean"
  | "charts"
  | "sql"
  | "assistant"
  | "export"
  | "settings"
  | "help";

const toolMeta: Record<
  StudioTool,
  { title: string; eyebrow: string; description: string }
> = {
  overview: {
    title: "Studio Overview",
    eyebrow: "WORKSPACE DASHBOARD",
    description:
      "A complete high-level health audit, summary metrics and exploratory distribution of your local dataset.",
  },
  data: {
    title: "Data Review",
    eyebrow: "SCHEMA & ROW INSPECTOR",
    description:
      "Review column types, missingness ratios, unique values and explore rows with live keyword search.",
  },
  clean: {
    title: "Smart Cleaning",
    eyebrow: "DETERMINISTIC SANITIZATION",
    description:
      "Trim whitespace, eliminate duplicate tuples, and handle null cells with immediate undo protection.",
  },
  charts: {
    title: "Chart Builder",
    eyebrow: "VISUAL EXPLORATION",
    description:
      "Generate client-side frequency distributions and histograms for any numeric or categorical column.",
  },
  sql: {
    title: "SQL Workbench",
    eyebrow: "IN-MEMORY QUERY ENGINE",
    description:
      "Execute safe, sandboxed read-only SQL queries with instant grouping, counting and filtering.",
  },
  assistant: {
    title: "Local Insights",
    eyebrow: "DATA INTELLIGENCE ASSISTANT",
    description:
      "Deterministic summaries and anomaly checks calculated directly in this browser. 100% private.",
  },
  export: {
    title: "Export Center",
    eyebrow: "STANDARDIZED ARTIFACTS",
    description:
      "Download sanitized RFC 4180 CSV files and verifiable JSON data quality audit reports.",
  },
  settings: {
    title: "Workspace Settings",
    eyebrow: "STORAGE & APPEARANCE",
    description:
      "Manage this device's workspace preferences, theme mode and browser storage capacity.",
  },
  help: {
    title: "Help & Shortcuts",
    eyebrow: "REFERENCE & LIMITATIONS",
    description:
      "Capabilities, supported SQL clauses, data isolation guarantees, and DuckDB-WASM roadmap.",
  },
};

const iconByTool: Record<StudioTool, React.ElementType> = {
  overview: Layout,
  data: FileText,
  clean: Scissors,
  charts: BarChart3,
  sql: Sliders,
  assistant: Database,
  export: Upload,
  settings: Settings,
  help: HelpCircle,
};

const navGroups: {
  label: string;
  items: { tool: StudioTool; label: string }[];
}[] = [
  {
    label: "WORKSPACE",
    items: [
      { tool: "overview", label: "Overview" },
      { tool: "data", label: "Data Review" },
      { tool: "clean", label: "Smart Cleaning" },
      { tool: "charts", label: "Chart Builder" },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { tool: "assistant", label: "Local Insights" },
      { tool: "sql", label: "SQL Workbench" },
    ],
  },
  {
    label: "SHARE & MANAGE",
    items: [
      { tool: "export", label: "Export Center" },
      { tool: "settings", label: "Settings" },
      { tool: "help", label: "Help & Guides" },
    ],
  },
];

function Brand() {
  return (
    <Link href="/" className="brand" aria-label="FINESE DATA home">
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-dot" />
        <span className="brand-dot" />
        <span className="brand-dot" />
      </span>
      <span className="brand-word">
        <strong>FINESE</strong>
        <strong>DATA</strong>
      </span>
    </Link>
  );
}

function EmptyDataset({
  onUpload,
  onLoadSample,
}: {
  onUpload: () => void;
  onLoadSample: (type: "sales" | "churn") => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragover") setDragOver(true);
    if (e.type === "dragleave" || e.type === "drop") setDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files?.[0]) {
      const input = document.getElementById("studio-file-input") as HTMLInputElement;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(files[0]);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 860, margin: "20px auto" }}>
      {/* Upload Drop Zone */}
      <div
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? "var(--color-accent)" : "var(--color-border)"}`,
          background: dragOver ? "var(--color-accent-subtle)" : "var(--color-surface)",
          borderRadius: "var(--radius-xl)",
          padding: "54px 24px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          boxShadow: "var(--shadow-sm)",
          transition: "all var(--transition-fast)",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "var(--radius-xl)",
            background: "var(--color-accent-subtle)",
            color: "var(--color-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px var(--color-accent-glow)",
          }}
        >
          <Upload size={28} />
        </div>
        <div style={{ maxWidth: 480 }}>
          <h2 style={{ fontSize: "1.375rem", marginBottom: 6 }}>Import your CSV dataset</h2>
          <p style={{ margin: 0, fontSize: "0.875rem" }}>
            Drag and drop a file here, or browse from your device. Data is processed locally in your
            browser RAM and never transmitted across the network.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="studio-button primary" onClick={onUpload} style={{ padding: "10px 20px" }}>
            <FileSpreadsheet size={16} /> Choose CSV File
          </button>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--color-text-subtle)", marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
          <span>● Max 10 MB</span>
          <span>● Up to 50,000 rows</span>
          <span>● 150 columns</span>
          <span>● 100% Client-Side</span>
        </div>
      </div>

      {/* Or Load Sample Datasets */}
      <div className="studio-card">
        <div className="studio-card-header" style={{ marginBottom: 16 }}>
          <div>
            <span className="eyebrow" style={{ marginBottom: 4 }}>NO FILE READY?</span>
            <h3 style={{ margin: 0 }}>Try an instant demo dataset</h3>
          </div>
        </div>
        <div className="grid grid-cols-2">
          <div
            style={{
              padding: 16,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-subtle)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="type-chip">SALES &amp; REVENUE</span>
                <span style={{ fontSize: 11, color: "var(--color-text-subtle)" }}>24 records</span>
              </div>
              <strong style={{ fontSize: "1rem", color: "var(--color-text)", display: "block" }}>
                Regional Sales Performance
              </strong>
              <p style={{ fontSize: "0.8125rem", margin: "4px 0 0 0" }}>
                Multi-quarter commercial performance with regions, units sold, revenue, segments and satisfaction scores.
              </p>
            </div>
            <button
              className="studio-button"
              style={{ width: "fit-content" }}
              onClick={() => onLoadSample("sales")}
            >
              <Sparkles size={14} color="var(--color-accent)" /> Load Sales Dataset
            </button>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-subtle)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="type-chip">SAAS METRICS</span>
                <span style={{ fontSize: 11, color: "var(--color-text-subtle)" }}>16 records</span>
              </div>
              <strong style={{ fontSize: "1rem", color: "var(--color-text)", display: "block" }}>
                Customer Churn &amp; MRR
              </strong>
              <p style={{ fontSize: "0.8125rem", margin: "4px 0 0 0" }}>
                SaaS accounts across East Africa with pricing tiers, monthly recurring revenue, tenure and support tickets.
              </p>
            </div>
            <button
              className="studio-button"
              style={{ width: "fit-content" }}
              onClick={() => onLoadSample("churn")}
            >
              <Sparkles size={14} color="var(--color-cyan)" /> Load Churn Dataset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  color,
}: {
  label: string;
  value: string;
  note: string;
  color?: string;
}) {
  return (
    <div className="studio-metric">
      <div className="studio-metric-head">
        <span>{label}</span>
      </div>
      <strong style={{ color: color || "var(--color-text)" }}>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function DatasetTableWithFilter({
  dataset,
  initialRows = 12,
}: {
  dataset: Dataset;
  initialRows?: number;
}) {
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState(initialRows);
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    if (!filter.trim()) return dataset.rows;
    const term = filter.toLowerCase();
    return dataset.rows.filter((row) =>
      dataset.columns.some((col) => String(row[col] ?? "").toLowerCase().includes(term))
    );
  }, [dataset, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / limit));
  const currentPage = Math.min(page, totalPages);
  const displayedRows = filteredRows.slice((currentPage - 1) * limit, currentPage * limit);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Search & Pagination Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 220, maxWidth: 400 }}>
          <div style={{ position: "relative", width: "100%" }}>
            <Search
              size={14}
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-subtle)" }}
            />
            <input
              type="text"
              placeholder="Search across all fields…"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              className="studio-controls"
              style={{ width: "100%", paddingLeft: 32, fontSize: 12 }}
            />
          </div>
          {filter && (
            <button
              onClick={() => setFilter("")}
              style={{ fontSize: 11, color: "var(--color-text-subtle)", whiteSpace: "nowrap" }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
          <span style={{ color: "var(--color-text-muted)" }}>
            Showing <b>{displayedRows.length}</b> of <b>{filteredRows.length.toLocaleString()}</b> rows
            {filter && " (filtered)"}
          </span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="studio-controls"
            style={{ fontSize: 11, padding: "4px 8px" }}
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                className="studio-button"
                style={{ padding: "4px 8px", fontSize: 11 }}
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span style={{ padding: "0 4px" }}>
                {currentPage} / {totalPages}
              </span>
              <button
                className="studio-button"
                style={{ padding: "4px 8px", fontSize: 11 }}
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="studio-table-wrap">
        <table className="studio-table">
          <thead>
            <tr>
              <th className="row-number" scope="col">#</th>
              {dataset.columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedRows.length === 0 ? (
              <tr>
                <td colSpan={dataset.columns.length + 1} style={{ textAlign: "center", padding: 24, color: "var(--color-text-subtle)" }}>
                  No matching records found for &quot;{filter}&quot;
                </td>
              </tr>
            ) : (
              displayedRows.map((row, i) => (
                <tr key={`${i}-${JSON.stringify(row)}`}>
                  <td className="row-number">{(currentPage - 1) * limit + i + 1}</td>
                  {dataset.columns.map((c) => (
                    <td key={c}>
                      {row[c] === null || row[c] === undefined || row[c] === "" ? (
                        <span className="null-pill">Missing</span>
                      ) : typeof row[c] === "number" ? (
                        <span style={{ fontFamily: "var(--font-mono)" }}>
                          {formatNumber(row[c] as number)}
                        </span>
                      ) : (
                        String(row[c])
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfileRows({ dataset }: { dataset: Dataset }) {
  const p = profileDataset(dataset);
  return (
    <div className="column-list">
      {p.columnProfiles.map((c) => (
        <div key={c.name} className="column-item">
          <div>
            <b style={{ color: "var(--color-text)" }}>{c.name}</b>
            <small style={{ display: "block", marginTop: 2, color: "var(--color-text-muted)" }}>
              {c.unique} distinct &middot;{" "}
              {c.missing > 0 ? (
                <span style={{ color: "var(--color-danger)" }}>{c.missing} missing</span>
              ) : (
                <span style={{ color: "var(--color-success)" }}>0 missing</span>
              )}
            </small>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="type-chip">{c.type}</span>
            <small style={{ display: "block", marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 11 }}>
              {c.type === "Number"
                ? `avg ${formatNumber(c.mean ?? 0)}`
                : `${c.nonNull} values`}
            </small>
          </div>
        </div>
      ))}
    </div>
  );
}

function getChartGroups(dataset: Dataset, column: string) {
  const numeric = dataset.rows
    .map((row) => row[column])
    .filter((value): value is number => typeof value === "number");
  if (numeric.length) {
    const min = Math.min(...numeric);
    const max = Math.max(...numeric);
    if (min === max) return [{ label: String(min), value: numeric.length }];
    const groups = Array.from({ length: 10 }, (_, index) => ({
      label: formatNumber(min + ((max - min) * index) / 10),
      value: 0,
    }));
    for (const value of numeric) {
      groups[Math.min(9, Math.floor(((value - min) / (max - min)) * 10))].value++;
    }
    return groups;
  }
  const counts = new Map<string, number>();
  dataset.rows.forEach((row) => {
    const key = String(row[column] ?? "Missing");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, value]) => ({ label, value }));
}

function BarChart({ dataset, column }: { dataset: Dataset; column: string }) {
  const groups = getChartGroups(dataset, column);
  const max = Math.max(1, ...groups.map((g) => g.value));
  return (
    <div className="chart-preview">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div>
          <b>{column} distribution</b>
          <p>
            {groups.length} categories/bins &middot; {dataset.rows.length} rows &middot;
            local calculation
          </p>
        </div>
        <span className="type-chip">BAR FREQUENCY</span>
      </div>
      <div className="bar-display">
        {groups.map((g, i) => (
          <i
            key={`${g.label}-${i}`}
            title={`${g.label}: ${g.value}`}
            style={{ height: `${Math.max(4, (g.value / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="bar-labels">
        {groups.map((g, i) => (
          <span key={i} title={g.label}>
            {g.label.length > 9 ? `${g.label.slice(0, 8)}…` : g.label}
          </span>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 11,
          color: "var(--color-text-muted)",
          marginTop: 12,
          borderTop: "1px solid var(--color-border-subtle)",
          paddingTop: 8,
        }}
      >
        <span>Max frequency: <b>{formatNumber(max)}</b></span>
        <span>Categories shown: <b>{groups.length}</b></span>
      </div>
    </div>
  );
}

export function StudioClient({ initialTool }: { initialTool: StudioTool }) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [history, setHistory] = useState<Dataset[]>([]);
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [toast, setToast] = useState("");
  const [fileError, setFileError] = useState("");
  const [cleanChoice, setCleanChoice] = useState<
    "trim" | "drop-duplicates" | "drop-missing" | "fill-missing"
  >("drop-duplicates");
  const [sql, setSql] = useState("SELECT * FROM dataset LIMIT 10");
  const [sqlRows, setSqlRows] = useState<{
    columns: string[];
    rows: DataRow[];
    message: string;
  } | null>(null);
  const [sqlError, setSqlError] = useState("");
  const [sqlExecutionTime, setSqlExecutionTime] = useState<number | null>(null);
  const [chartColumn, setChartColumn] = useState("");
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<{
    role: "assistant" | "user";
    text: string;
  }[]>([
    {
      role: "assistant",
      text:
        "Welcome to FINESE DATA. I compute summaries and checks directly inside your browser memory. Try asking about missing values, column types, quality health, or numeric patterns.",
    },
  ]);

  const meta = toolMeta[initialTool];

  // Storage and hydration initialization
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        // Check URL parameters for demo auto-load (?sample=sales or ?sample=churn)
        const params = new URLSearchParams(window.location.search);
        const sampleParam = params.get("sample") || params.get("demo");

        if (sampleParam === "sales" || sampleParam === "churn") {
          const sample = getSampleDataset(sampleParam as "sales" | "churn");
          setDataset(sample);
        } else {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            setDataset(
              parsed?.cleared || parsed?.source === "sample" ? null : (parsed as Dataset)
            );
          }
        }

        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme === "dark" || savedTheme === "light") {
          setTheme(savedTheme);
          document.documentElement.setAttribute("data-theme", savedTheme);
        } else {
          document.documentElement.setAttribute("data-theme", "dark");
        }
      } catch {
        // Browser storage can be disabled
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset ?? { cleared: true }));
    } catch {
      window.setTimeout(
        () =>
          setToast(
            "Browser storage is full or unavailable. Changes remain active in this tab's memory."
          ),
        0
      );
    }
  }, [dataset, ready]);

  // Sync theme
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(THEME_KEY, theme);
        document.documentElement.setAttribute("data-theme", theme);
      } catch {
        // ignore
      }
    }
  }, [theme, ready]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = window.setTimeout(() => setToast(""), 4200);
      return () => window.clearTimeout(t);
    }
  }, [toast]);

  const profile = useMemo(() => (dataset ? profileDataset(dataset) : null), [dataset]);

  const defaultChartColumn =
    dataset?.columns.find(
      (column) =>
        profile?.columnProfiles.find((item) => item.name === column)?.type === "Number"
    ) ?? dataset?.columns[0] ?? "";

  const selectedChartColumn =
    dataset?.columns.includes(chartColumn) ? chartColumn : defaultChartColumn;

  const showToast = (message: string) => setToast(message);

  const openFilePicker = () => document.getElementById("studio-file-input")?.click();

  const loadSample = (type: "sales" | "churn") => {
    try {
      const sample = getSampleDataset(type);
      setHistory(dataset ? [dataset] : []);
      setDataset(sample);
      setFileError("");
      setSqlRows(null);
      setSqlError("");
      setAssistantMessages([
        {
          role: "assistant",
          text: `Loaded ${sample.name} into your browser memory. Computed profile for ${sample.rows.length} rows and ${sample.columns.length} columns.`,
        },
      ]);
      showToast(`Loaded ${sample.name} (${sample.rows.length} rows).`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load sample");
    }
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
        throw new Error("This starter currently accepts CSV files only.");
      }
      const next = parseCSV(await file.text(), file.name);
      setHistory(dataset ? [dataset] : []);
      setDataset(next);
      setFileError("");
      setSqlRows(null);
      setSqlError("");
      setAssistantMessages([
        {
          role: "assistant",
          text: `Imported ${next.name} locally. I can compute deterministic summaries for its ${next.rows.length} rows and ${next.columns.length} columns.`,
        },
      ]);
      showToast(
        `Imported ${next.rows.length.toLocaleString()} rows. Processed 100% in this browser.`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import failed.";
      setFileError(msg);
      showToast(msg);
    }
  };

  const updateDataset = (next: Dataset & { affected?: number }, label: string) => {
    if (dataset) setHistory((prev) => [dataset, ...prev].slice(0, 5));
    setDataset({
      name: next.name,
      columns: next.columns,
      rows: next.rows,
      updatedAt: next.updatedAt,
      source: "local-change",
    });
    showToast(`${label} applied. ${next.affected ?? 0} value(s) or row(s) updated.`);
  };

  const undoLastClean = () => {
    if (history.length === 0) return;
    const previous = history[0];
    setHistory((prev) => prev.slice(1));
    setDataset(previous);
    showToast("Reverted to previous dataset state.");
  };

  const downloadBlob = (name: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!dataset) return;
    downloadBlob(
      dataset.name.toLowerCase().endsWith(".csv") ? dataset.name : `${dataset.name}.csv`,
      toCSV(dataset),
      "text/csv;charset=utf-8"
    );
    showToast("CSV export prepared on this device.");
  };

  const exportQuality = () => {
    if (!dataset || !profile) return;
    const report = {
      dataset: dataset.name,
      generated_at: new Date().toISOString(),
      mode: "browser-local",
      formula:
        "score = max(0, round(100 - missing_cell_percent*0.7 - exact_duplicate_row_percent*0.3))",
      profile,
      columns: profile.columnProfiles,
    };
    downloadBlob(
      `${dataset.name.replace(/\.csv$/i, "")}_quality_report.json`,
      JSON.stringify(report, null, 2),
      "application/json"
    );
    showToast("Quality audit report saved.");
  };

  const runQuery = () => {
    if (!dataset) return;
    const start = performance.now();
    try {
      const result = runSafeQuery(dataset, sql);
      const elapsed = performance.now() - start;
      setSqlRows(result);
      setSqlExecutionTime(Number(elapsed.toFixed(2)));
      setSqlError("");
    } catch (e) {
      setSqlRows(null);
      setSqlExecutionTime(null);
      setSqlError(e instanceof Error ? e.message : "Query execution failed.");
    }
  };

  const askAssistant = (e?: FormEvent) => {
    e?.preventDefault();
    if (!dataset || !assistantPrompt.trim()) return;
    const prompt = assistantPrompt.trim();
    const answer = localInsight(dataset, prompt);
    setAssistantMessages((prev) => [
      ...prev,
      { role: "user", text: prompt },
      { role: "assistant", text: answer },
    ]);
    setAssistantPrompt("");
  };

  const clearLocalData = () => {
    if (
      !window.confirm(
        "Delete the current local dataset from this browser? This cannot be undone."
      )
    )
      return;
    setDataset(null);
    setHistory([]);
    setAssistantMessages([
      {
        role: "assistant",
        text: "Workspace data was cleared. Import a CSV to start a fresh analysis.",
      },
    ]);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cleared: true }));
    } catch {
      // state clears in memory
    }
    showToast("Workspace dataset deleted from this browser.");
  };

  // Render view by tool
  const renderContent = () => {
    if (initialTool === "overview") {
      return (
        <>
          {dataset ? (
            <div className="sample-notice">
              <span className="notice-icon">
                <Database size={18} />
              </span>
              <div>
                <strong>Active dataset: {dataset.name}</strong>
                <div style={{ color: "var(--color-text-muted)" }}>
                  Processed 100% inside your browser RAM. Zero external network transfer.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="studio-button" onClick={() => loadSample("sales")}>
                  <Sparkles size={14} color="var(--color-accent)" /> Sample Data
                </button>
                <button className="studio-button" onClick={openFilePicker}>
                  <RefreshCw size={14} /> Replace File
                </button>
              </div>
            </div>
          ) : (
            <EmptyDataset onUpload={openFilePicker} onLoadSample={loadSample} />
          )}

          {dataset && (
            <>
              {/* 4 Key Metrics */}
              <div className="studio-metrics">
                <Metric
                  label="Total Records"
                  value={formatNumber(profile?.rows ?? 0)}
                  note="Rows in in-memory dataset"
                />
                <Metric
                  label="Data Fields"
                  value={String(profile?.columns ?? 0)}
                  note="Detected columns"
                />
                <Metric
                  label="Quality Score"
                  value={`${profile?.quality ?? 0}/100`}
                  note="Heuristic integrity score"
                  color={
                    (profile?.quality ?? 0) >= 80
                      ? "var(--color-success)"
                      : (profile?.quality ?? 0) >= 50
                      ? "var(--color-warning)"
                      : "var(--color-danger)"
                  }
                />
                <Metric
                  label="Missing Cells"
                  value={`${(profile?.missingPct ?? 0).toFixed(1)}%`}
                  note={`${profile?.missing ?? 0} empty cells`}
                  color={
                    (profile?.missingPct ?? 0) > 10 ? "var(--color-danger)" : undefined
                  }
                />
              </div>

              {/* Grid 2: Quality breakdown + Numeric distribution */}
              <div className="studio-grid-two">
                <section className="studio-card">
                  <div className="studio-card-header">
                    <div>
                      <h2>Data Quality Breakdown</h2>
                      <p>Calculated deterministically from the imported rows.</p>
                    </div>
                    <Link className="text-link" href="/studio/data" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                      Full review <ChevronRight size={14} />
                    </Link>
                  </div>
                  <div className="quality-row">
                    <div className="quality-item">
                      <span>Missing cells</span>
                      <strong>{formatNumber(profile?.missing ?? 0)}</strong>
                      <small>{(profile?.missingPct ?? 0).toFixed(1)}% of all cells</small>
                    </div>
                    <div className="quality-item">
                      <span>Exact duplicates</span>
                      <strong>{formatNumber(profile?.duplicates ?? 0)}</strong>
                      <small>{(profile?.duplicatePct ?? 0).toFixed(1)}% duplicate rows</small>
                    </div>
                    <div className="quality-item">
                      <span>Detected columns</span>
                      <strong>{profile?.columns ?? 0}</strong>
                      <small>In current schema</small>
                    </div>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <div className="studio-card-header" style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 8 }}>
                      <div>
                        <h3>Field Profile Summary</h3>
                        <p>Types inferred from values (validate mixed/date fields).</p>
                      </div>
                    </div>
                    <ProfileRows dataset={dataset} />
                  </div>
                </section>

                <section className="studio-card">
                  <div className="studio-card-header">
                    <div>
                      <h2>Column Distribution</h2>
                      <p>Inspect distribution for any detected field.</p>
                    </div>
                    <span className="type-chip">IN-MEMORY</span>
                  </div>
                  {dataset.columns.length > 0 ? (
                    <>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          display: "block",
                          color: "var(--color-text-muted)",
                          marginBottom: 6,
                        }}
                        htmlFor="overview-chart-col"
                      >
                        Select field to plot
                      </label>
                      <select
                        id="overview-chart-col"
                        className="studio-controls"
                        style={{ width: "100%", marginBottom: 14 }}
                        value={selectedChartColumn}
                        onChange={(e) => setChartColumn(e.target.value)}
                      >
                        {dataset.columns.map((c) => (
                          <option value={c} key={c}>
                            {c} (
                            {profile?.columnProfiles.find((p) => p.name === c)?.type ?? "Text"})
                          </option>
                        ))}
                      </select>
                      <BarChart dataset={dataset} column={selectedChartColumn} />
                    </>
                  ) : (
                    <p>No fields detected yet.</p>
                  )}
                </section>

                {/* Table Preview spanning full width */}
                <section className="studio-card" style={{ gridColumn: "1 / -1" }}>
                  <div className="studio-card-header">
                    <div>
                      <h2>In-Memory Dataset Grid</h2>
                      <p>
                        <b>{dataset.name}</b> &middot; {dataset.rows.length.toLocaleString()} total
                        rows
                      </p>
                    </div>
                    <div className="studio-control-actions">
                      <Link className="studio-button" href="/studio/clean">
                        <Scissors size={14} /> Clean Data
                      </Link>
                      <button className="studio-button primary" onClick={exportCSV}>
                        <Download size={14} /> Export CSV
                      </button>
                    </div>
                  </div>
                  <DatasetTableWithFilter dataset={dataset} initialRows={8} />
                </section>
              </div>
            </>
          )}
        </>
      );
    }

    if (!dataset) return <EmptyDataset onUpload={openFilePicker} onLoadSample={loadSample} />;

    if (initialTool === "data") {
      return (
        <>
          <div className="studio-grid-two">
            <section className="studio-card">
              <div className="studio-card-header">
                <div>
                  <h2>Dataset Details</h2>
                  <p>Current active file specifications.</p>
                </div>
                <span className="type-chip">{dataset.source}</span>
              </div>
              <div className="column-list">
                <div className="column-item">
                  <span>File name</span>
                  <small style={{ fontFamily: "var(--font-mono)" }}>{dataset.name}</small>
                </div>
                <div className="column-item">
                  <span>Dimensions</span>
                  <small>
                    {profile?.rows.toLocaleString()} rows × {profile?.columns} columns
                  </small>
                </div>
                <div className="column-item">
                  <span>Estimated memory size</span>
                  <small style={{ fontFamily: "var(--font-mono)" }}>
                    ~{Math.round((JSON.stringify(dataset.rows).length / 1024) * 10) / 10} KB
                  </small>
                </div>
                <div className="column-item">
                  <span>Last modified</span>
                  <small>{new Date(dataset.updatedAt).toLocaleTimeString()}</small>
                </div>
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <button className="studio-button" onClick={openFilePicker}>
                  <Upload size={14} /> Import Another CSV
                </button>
                <button className="studio-button" onClick={() => loadSample("churn")}>
                  <Sparkles size={14} /> Load Churn Sample
                </button>
              </div>
            </section>

            <section className="studio-card">
              <div className="studio-card-header">
                <div>
                  <h2>Quality Signals</h2>
                  <p>Evaluated against completeness and uniqueness.</p>
                </div>
                <span
                  className="type-chip"
                  style={{
                    color:
                      (profile?.quality ?? 0) >= 80
                        ? "var(--color-success)"
                        : "var(--color-warning)",
                  }}
                >
                  Score: {profile?.quality}/100
                </span>
              </div>
              <div className="quality-row">
                <div className="quality-item">
                  <span>Missing cells</span>
                  <strong>{profile?.missing}</strong>
                  <small>{(profile?.missingPct ?? 0).toFixed(1)}% of all cells</small>
                </div>
                <div className="quality-item">
                  <span>Exact duplicates</span>
                  <strong>{profile?.duplicates}</strong>
                  <small>{(profile?.duplicatePct ?? 0).toFixed(1)}% duplicate rows</small>
                </div>
                <div className="quality-item">
                  <span>Quality status</span>
                  <strong style={{ fontSize: "1rem" }}>
                    {(profile?.quality ?? 0) >= 80 ? "Healthy" : "Needs Review"}
                  </strong>
                  <small>Rule formula</small>
                </div>
              </div>
              <div className="studio-status" style={{ marginTop: 14 }}>
                <Shield size={14} color="#10b981" />
                <span>Zero records leave this browser. Verified client-side execution.</span>
              </div>
            </section>
          </div>

          <div className="studio-grid-two">
            <section className="studio-card">
              <div className="studio-card-header">
                <div>
                  <h2>Column Schemas &amp; Heuristics</h2>
                  <p>Inferred data types, fill rates and numerical averages.</p>
                </div>
              </div>
              <ProfileRows dataset={dataset} />
            </section>

            <section className="studio-card">
              <div className="studio-card-header">
                <div>
                  <h2>Interactive Data Browser</h2>
                  <p>Search, filter and inspect rows.</p>
                </div>
              </div>
              <DatasetTableWithFilter dataset={dataset} initialRows={10} />
            </section>
          </div>
        </>
      );
    }

    if (initialTool === "clean") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="studio-grid-two">
            <section className="studio-card">
              <div className="studio-card-header">
                <div>
                  <h2>Select Cleaning Transformation</h2>
                  <p>Deterministic operations executed directly over current dataset.</p>
                </div>
                {history.length > 0 && (
                  <button
                    className="studio-button"
                    onClick={undoLastClean}
                    title="Undo last cleaning operation"
                  >
                    <RotateCcw size={14} /> Undo Last ({history.length})
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 }}>
                  Transformation Rule
                  <select
                    className="studio-controls"
                    value={cleanChoice}
                    onChange={(e) => setCleanChoice(e.target.value as typeof cleanChoice)}
                  >
                    <option value="trim">✂️ Trim leading &amp; trailing whitespace on all strings</option>
                    <option value="drop-duplicates">👥 Remove exact duplicate rows</option>
                    <option value="drop-missing">🗑️ Drop rows with any missing value</option>
                    <option value="fill-missing">🏷️ Fill empty cells with &quot;Unknown&quot;</option>
                  </select>
                </label>

                <div className="studio-status warn">
                  <AlertTriangle size={15} />
                  <span>
                    Transformations modify the live in-memory dataset immediately. You can use Undo
                    or export before making major changes.
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="studio-button primary"
                    onClick={() => {
                      const next = cleanDataset(dataset, cleanChoice);
                      updateDataset(next, cleanChoice.replaceAll("-", " "));
                    }}
                  >
                    <Scissors size={14} /> Apply Transformation
                  </button>
                  {history.length > 0 && (
                    <button className="studio-button" onClick={undoLastClean}>
                      <RotateCcw size={14} /> Revert Change
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="studio-card">
              <div className="studio-card-header">
                <div>
                  <h2>Current Integrity State</h2>
                  <p>Live metrics reflect current in-memory rows.</p>
                </div>
              </div>
              <div className="quality-row">
                <div className="quality-item">
                  <span>Current rows</span>
                  <strong>{profile?.rows.toLocaleString()}</strong>
                </div>
                <div className="quality-item">
                  <span>Missing cells</span>
                  <strong>{profile?.missing}</strong>
                </div>
                <div className="quality-item">
                  <span>Exact duplicates</span>
                  <strong>{profile?.duplicates}</strong>
                </div>
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: "var(--color-text-muted)" }}>
                💡 <b>Tip:</b> If your CSV contains formula injection strings (like <code>=SUM</code>),
                FINESE will automatically escape them upon export to protect spreadsheet users.
              </div>
            </section>
          </div>

          <section className="studio-card">
            <div className="studio-card-header">
              <div>
                <h2>Live Dataset Preview (After Cleaning)</h2>
                <p>Showing sanitized in-memory rows.</p>
              </div>
              <button className="studio-button primary" onClick={exportCSV}>
                <Download size={14} /> Export Cleaned CSV
              </button>
            </div>
            <DatasetTableWithFilter dataset={dataset} initialRows={10} />
          </section>
        </div>
      );
    }

    if (initialTool === "charts") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="studio-grid-two">
            <section className="studio-card">
              <div className="studio-card-header">
                <div>
                  <h2>Chart Controls</h2>
                  <p>Select any field to generate a frequency distribution.</p>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 }}>
                  Column to Analyze
                  <select
                    className="studio-controls"
                    value={selectedChartColumn}
                    onChange={(e) => setChartColumn(e.target.value)}
                  >
                    {dataset.columns.map((c) => (
                      <option key={c} value={c}>
                        {c} (
                        {profile?.columnProfiles.find((p) => p.name === c)?.type ?? "Text"})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="studio-status">
                  Numeric columns are automatically partitioned into 10 normalized bins. String
                  columns show top frequency counts.
                </div>
                <button
                  className="studio-button"
                  style={{ width: "fit-content" }}
                  onClick={() => {
                    downloadBlob(
                      `${selectedChartColumn}_distribution.json`,
                      JSON.stringify(getChartGroups(dataset, selectedChartColumn), null, 2),
                      "application/json"
                    );
                    showToast("Chart distribution values downloaded.");
                  }}
                >
                  <Download size={14} /> Export Chart JSON
                </button>
              </div>
            </section>

            <section className="studio-card">
              <div className="studio-card-header">
                <div>
                  <h2>Distribution Histogram</h2>
                  <p>In-browser rendering for {selectedChartColumn}</p>
                </div>
                <span className="type-chip">HISTOGRAM</span>
              </div>
              <BarChart dataset={dataset} column={selectedChartColumn} />
            </section>
          </div>

          <section className="studio-card">
            <div className="studio-card-header">
              <div>
                <h2>Raw Values for {selectedChartColumn}</h2>
                <p>Verify values plotted in the chart above.</p>
              </div>
            </div>
            <DatasetTableWithFilter
              dataset={{
                ...dataset,
                columns: [selectedChartColumn],
                rows: dataset.rows.map((r) => ({
                  [selectedChartColumn]: r[selectedChartColumn],
                })),
              }}
              initialRows={8}
            />
          </section>
        </div>
      );
    }

    if (initialTool === "sql") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="studio-grid-two">
            <section className="studio-card">
              <div className="studio-card-header">
                <div>
                  <h2>In-Memory SQL Workbench</h2>
                  <p>Fast read-only query engine executing over browser memory.</p>
                </div>
                <span className="type-chip">READ-ONLY SELECT</span>
              </div>

              {/* Quick Query Presets */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-subtle)", alignSelf: "center", marginRight: 4 }}>
                  PRESETS:
                </span>
                <button
                  className="studio-button"
                  style={{ fontSize: 11, padding: "4px 8px" }}
                  onClick={() => setSql("SELECT * FROM dataset LIMIT 10")}
                >
                  SELECT * (First 10)
                </button>
                {dataset.columns[0] && (
                  <button
                    className="studio-button"
                    style={{ fontSize: 11, padding: "4px 8px" }}
                    onClick={() =>
                      setSql(
                        `SELECT ${dataset.columns[0]}, COUNT(*) AS total FROM dataset GROUP BY ${dataset.columns[0]}`
                      )
                    }
                  >
                    GROUP BY {dataset.columns[0]}
                  </button>
                )}
                <button
                  className="studio-button"
                  style={{ fontSize: 11, padding: "4px 8px" }}
                  onClick={() => setSql("SELECT COUNT(*) AS total_rows FROM dataset")}
                >
                  COUNT(*) Total
                </button>
              </div>

              <textarea
                id="sql-editor"
                className="sql-editor"
                rows={5}
                spellCheck={false}
                value={sql}
                onChange={(e) => setSql(e.target.value)}
              />

              <div className="studio-control-actions" style={{ marginTop: 12 }}>
                <button className="studio-button primary" onClick={runQuery}>
                  <Sliders size={14} /> Execute Query
                </button>
                <button
                  className="studio-button"
                  onClick={() => {
                    setSql("SELECT * FROM dataset LIMIT 10");
                    setSqlRows(null);
                    setSqlError("");
                  }}
                >
                  Reset
                </button>
                {sqlExecutionTime !== null && (
                  <span style={{ fontSize: 11, color: "var(--color-success)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle2 size={13} /> {sqlExecutionTime} ms
                  </span>
                )}
              </div>

              {sqlError && (
                <div className="studio-status error" style={{ marginTop: 12 }}>
                  <AlertTriangle size={15} />
                  <span>{sqlError}</span>
                </div>
              )}
            </section>

            <section className="studio-card">
              <div className="studio-card-header">
                <div>
                  <h2>Schema &amp; Field Names</h2>
                  <p>Reference field names for your SQL queries.</p>
                </div>
              </div>
              <ProfileRows dataset={dataset} />
            </section>
          </div>

          {/* Results table */}
          {sqlRows && (
            <section className="studio-card">
              <div className="studio-card-header">
                <div>
                  <h2>Query Results</h2>
                  <p>{sqlRows.message}</p>
                </div>
                <button
                  className="studio-button primary"
                  onClick={() =>
                    downloadBlob(
                      "query_results.csv",
                      toCSV({
                        name: "query_results.csv",
                        columns: sqlRows.columns,
                        rows: sqlRows.rows,
                        updatedAt: new Date().toISOString(),
                        source: "local-change",
                      }),
                      "text/csv;charset=utf-8"
                    )
                  }
                >
                  <Download size={14} /> Export Results CSV
                </button>
              </div>
              <DatasetTableWithFilter
                dataset={{
                  name: "query_results.csv",
                  columns: sqlRows.columns,
                  rows: sqlRows.rows,
                  updatedAt: new Date().toISOString(),
                  source: "local-change",
                }}
                initialRows={15}
              />
            </section>
          )}
        </div>
      );
    }

    if (initialTool === "assistant") {
      return (
        <div className="studio-grid-two">
          <section className="studio-card">
            <div className="studio-card-header">
              <div>
                <h2>Local Insights Assistant</h2>
                <p>Deterministic computations computed inside your browser.</p>
              </div>
              <span className="type-chip">100% PRIVATE</span>
            </div>

            <div className="assistant-thread">
              {assistantMessages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "var(--radius-lg)",
                    background:
                      m.role === "user"
                        ? "var(--color-accent-subtle)"
                        : "var(--color-bg-subtle)",
                    border: `1px solid ${
                      m.role === "user" ? "var(--color-accent-glow)" : "var(--color-border)"
                    }`,
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "92%",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color:
                        m.role === "user" ? "var(--color-accent)" : "var(--color-text-subtle)",
                      marginBottom: 4,
                    }}
                  >
                    {m.role === "user" ? "You" : "FINESE Local Analyst"}
                  </strong>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text)" }}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <form className="assistant-composer" onSubmit={askAssistant}>
              <input
                className="studio-controls"
                aria-label="Ask about the dataset"
                value={assistantPrompt}
                onChange={(e) => setAssistantPrompt(e.target.value)}
                placeholder="Ask about missing values, quality score, numeric summaries…"
              />
              <button
                className="studio-button primary"
                type="submit"
                disabled={!assistantPrompt.trim()}
              >
                Ask <Send size={14} />
              </button>
            </form>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-subtle)", alignSelf: "center" }}>
                SUGGESTIONS:
              </span>
              {[
                "Summarize data quality",
                "What numeric fields are here?",
                "Show missing values",
                "Show column schema types",
              ].map((p) => (
                <button
                  key={p}
                  className="studio-button"
                  style={{ fontSize: 11, padding: "4px 10px" }}
                  onClick={() => {
                    setAssistantPrompt(p);
                    setAssistantMessages((prev) => [
                      ...prev,
                      { role: "user", text: p },
                      { role: "assistant", text: localInsight(dataset, p) },
                    ]);
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </section>

          <section className="studio-card">
            <div className="studio-card-header">
              <div>
                <h2>Verified Local Metrics</h2>
                <p>Deterministic calculations run without an external AI key.</p>
              </div>
            </div>
            <div className="quality-row">
              <div className="quality-item">
                <span>Total records</span>
                <strong>{profile?.rows.toLocaleString()}</strong>
                <small>Local memory</small>
              </div>
              <div className="quality-item">
                <span>Missing cells</span>
                <strong>{profile?.missing}</strong>
                <small>{(profile?.missingPct ?? 0).toFixed(1)}%</small>
              </div>
              <div className="quality-item">
                <span>Quality rating</span>
                <strong>{profile?.quality}/100</strong>
                <small>Integrity formula</small>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <ProfileRows dataset={dataset} />
            </div>
          </section>
        </div>
      );
    }

    if (initialTool === "export") {
      return (
        <div className="studio-grid-two">
          <section className="studio-card">
            <div className="studio-card-header">
              <div>
                <h2>Download Artifacts</h2>
                <p>Export your sanitized data and quality audits in standard formats.</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  padding: 18,
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg-subtle)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className="type-chip" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                      CSV FORMAT
                    </span>
                    <span style={{ fontSize: 11, color: "var(--color-text-subtle)" }}>RFC 4180</span>
                  </div>
                  <strong style={{ fontSize: "1.05rem", color: "var(--color-text)", display: "block" }}>
                    Sanitized CSV Dataset
                  </strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.8125rem" }}>
                    Full rows with formula-leading escape sanitization and preserved UTF-8 encoding.
                  </p>
                </div>
                <button className="studio-button primary" onClick={exportCSV}>
                  <Download size={14} /> Download CSV
                </button>
              </div>

              <div
                style={{
                  padding: 18,
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg-subtle)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className="type-chip" style={{ background: "rgba(56,189,248,0.15)", color: "#38bdf8" }}>
                      JSON AUDIT
                    </span>
                    <span style={{ fontSize: 11, color: "var(--color-text-subtle)" }}>Verifiable</span>
                  </div>
                  <strong style={{ fontSize: "1.05rem", color: "var(--color-text)", display: "block" }}>
                    Data Quality Audit Report
                  </strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.8125rem" }}>
                    Complete schema breakdown, missing value tallies, duplicate counts and formula specs.
                  </p>
                </div>
                <button className="studio-button" onClick={exportQuality}>
                  <Download size={14} /> Download JSON
                </button>
              </div>
            </div>

            <div className="studio-status" style={{ marginTop: 16 }}>
              <Shield size={14} color="#10b981" />
              <span>All files are assembled directly on this machine. No cloud uploads.</span>
            </div>
          </section>

          <section className="studio-card">
            <div className="studio-card-header">
              <div>
                <h2>Export Manifest</h2>
                <p>Summary of records included in current export bundle.</p>
              </div>
            </div>
            <div className="quality-row">
              <div className="quality-item">
                <span>Row count</span>
                <strong>{profile?.rows.toLocaleString()}</strong>
                <small>Ready for export</small>
              </div>
              <div className="quality-item">
                <span>Columns</span>
                <strong>{profile?.columns}</strong>
                <small>Verified headers</small>
              </div>
              <div className="quality-item">
                <span>Integrity</span>
                <strong>{profile?.quality}/100</strong>
                <small>Audit score</small>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <ProfileRows dataset={dataset} />
            </div>
          </section>
        </div>
      );
    }

    if (initialTool === "settings") {
      let storageUsageKB = 0;
      try {
        storageUsageKB = Math.round((localStorage.getItem(STORAGE_KEY)?.length ?? 0) / 1024);
      } catch {
        // ignore
      }

      return (
        <div className="studio-grid-two">
          <section className="studio-card">
            <div className="studio-card-header">
              <div>
                <h2>Appearance &amp; Preferences</h2>
                <p>Device-specific workspace customization.</p>
              </div>
            </div>

            <div className="setting-row">
              <div>
                <strong>Theme mode</strong>
                <p>Toggle between high-contrast dark and clean light mode.</p>
              </div>
              <button
                className="studio-button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
              </button>
            </div>

            <div className="setting-row">
              <div>
                <strong>Client Memory Sandbox</strong>
                <p>All parsing, profiling and querying run inside browser sandbox.</p>
              </div>
              <span className="type-chip" style={{ color: "var(--color-success)" }}>
                ENFORCED
              </span>
            </div>

            <div className="setting-row">
              <div>
                <strong>Cloud Storage Sync</strong>
                <p>No remote databases or third-party tracking configured.</p>
              </div>
              <span className="type-chip">OFFLINE</span>
            </div>
          </section>

          <section className="studio-card">
            <div className="studio-card-header">
              <div>
                <h2>Browser Storage Manager</h2>
                <p>Manage data persisted in localStorage on this device.</p>
              </div>
            </div>

            <div className="column-list">
              <div className="column-item">
                <div>
                  <b style={{ display: "block" }}>Active In-Memory Dataset</b>
                  <small style={{ color: "var(--color-text-muted)" }}>
                    {dataset.name} &middot; {dataset.rows.length.toLocaleString()} rows
                  </small>
                </div>
                <button className="studio-button" onClick={exportCSV}>
                  <Download size={14} /> Export Backup
                </button>
              </div>

              <div className="column-item">
                <div>
                  <b style={{ display: "block" }}>LocalStorage Storage Used</b>
                  <small style={{ color: "var(--color-text-muted)" }}>
                    {storageUsageKB} KB of browser quota used
                  </small>
                </div>
                <span className="type-chip">{storageUsageKB} KB</span>
              </div>

              <div className="column-item">
                <div>
                  <b style={{ display: "block", color: "var(--color-danger)" }}>Clear Workspace</b>
                  <small style={{ color: "var(--color-text-muted)" }}>
                    Purges active dataset and stored session from this browser.
                  </small>
                </div>
                <button
                  className="studio-button"
                  style={{ color: "var(--color-danger)", borderColor: "var(--color-danger)" }}
                  onClick={clearLocalData}
                >
                  Clear Dataset
                </button>
              </div>
            </div>

            <div className="studio-status warn" style={{ marginTop: 14 }}>
              <AlertTriangle size={15} />
              <span>
                Browser storage is subject to quota eviction. Export your critical files to CSV
                regularly.
              </span>
            </div>
          </section>
        </div>
      );
    }

    if (initialTool === "help") {
      return (
        <div className="studio-grid-two">
          <section className="studio-card">
            <div className="studio-card-header">
              <div>
                <h2>Built-in Capabilities</h2>
                <p>Features ready in this browser-local starter.</p>
              </div>
            </div>
            <div className="column-list">
              {[
                "CSV parsing up to 10 MB and 50,000 rows",
                "Automated column type inference (Number, Date, Text)",
                "Deterministic data quality score (0 to 100)",
                "Safe transformations: trim, deduplicate, drop/fill nulls",
                "Realtime frequency histograms with auto-binning",
                "Restricted read-only SQL SELECT subset",
                "RFC 4180 CSV export with formula injection escaping",
                "JSON quality audit reports with complete formula metadata",
                "Dark and light appearance modes with persistence",
              ].map((s) => (
                <div key={s} className="column-item">
                  <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle2 size={14} color="#10b981" /> {s}
                  </span>
                  <span className="type-chip" style={{ color: "#10b981" }}>READY</span>
                </div>
              ))}
            </div>
          </section>

          <section className="studio-card">
            <div className="studio-card-header">
              <div>
                <h2>Architecture &amp; Roadmap</h2>
                <p>Designed boundaries and planned milestones.</p>
              </div>
            </div>
            <div className="column-list">
              {[
                { title: "DuckDB-WASM Full SQL Engine", tag: "PLANNED" },
                { title: "Parquet and Apache Arrow Import", tag: "PLANNED" },
                { title: "Multi-Chart Dashboard Layouts", tag: "PLANNED" },
                { title: "Opt-in Cloud Sync & Shared Teams", tag: "FUTURE" },
              ].map((item) => (
                <div key={item.title} className="column-item">
                  <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                    <ChevronRight size={14} color="var(--color-accent)" /> {item.title}
                  </span>
                  <span className="type-chip">{item.tag}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, fontSize: 12, color: "var(--color-text-muted)" }}>
              Need custom workflows or enterprise deployment? Visit our{" "}
              <Link href="/services" className="text-link" style={{ color: "var(--color-accent)" }}>
                Services
              </Link>{" "}
              or{" "}
              <Link href="/contact" className="text-link" style={{ color: "var(--color-accent)" }}>
                Contact us
              </Link>.
            </div>
          </section>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`studio-layout ${theme === "dark" ? "theme-dark" : ""}`}>
      {/* Sidebar Navigation */}
      <aside className="studio-sidebar" aria-label="Studio navigation">
        <Brand />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 10px",
            borderRadius: "var(--radius-md)",
            background: "var(--color-bg-subtle)",
            border: "1px solid var(--color-border-subtle)",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "var(--radius-sm)",
              background: "linear-gradient(135deg, var(--color-accent) 0%, var(--color-cyan) 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            F
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <b style={{ fontSize: 12, color: "var(--color-text)" }}>Local Workspace</b>
            <small style={{ fontSize: 10, color: "var(--color-text-subtle)" }}>In-memory RAM</small>
          </div>
        </div>

        {navGroups.map((group) => (
          <div key={group.label} className="studio-nav-group">
            <span className="studio-nav-label">{group.label}</span>
            <nav className="studio-nav">
              {group.items.map((item) => {
                const Icon = iconByTool[item.tool];
                const active = initialTool === item.tool;
                return (
                  <Link
                    key={item.tool}
                    href={item.tool === "overview" ? "/studio" : `/studio/${item.tool}`}
                    className={active ? "active" : ""}
                    title={item.label}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}

        <div className="studio-sidebar-bottom">
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              background: "var(--color-bg-subtle)",
              border: "1px solid var(--color-border-subtle)",
              fontSize: 11,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--color-success)" }}>
              <span>●</span> Client-Side Sandbox
            </div>
            <span style={{ color: "var(--color-text-muted)" }}>
              Data remains exclusively in this browser.
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4, fontSize: 11 }}>
            <Link href="/" style={{ color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <ExternalLink size={12} /> Home
            </Link>
            <Link href="/contact" style={{ color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <HelpCircle size={12} /> Contact
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Workspace Canvas */}
      <div className="studio-main">
        {/* Top Header Bar */}
        <header className="studio-topbar">
          <div className="studio-breadcrumb">
            <Link href="/studio">Studio</Link> &nbsp;/&nbsp; <b>{meta.title}</b>
            {dataset && (
              <span
                style={{
                  marginLeft: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  background: "var(--color-bg-subtle)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-muted)",
                }}
              >
                <FileSpreadsheet size={12} />
                <b>{dataset.name}</b> &middot; {dataset.rows.length.toLocaleString()} rows
              </span>
            )}
          </div>

          <div className="studio-top-actions">
            {dataset && (
              <button
                className="studio-button"
                style={{ padding: "6px 10px", fontSize: 11 }}
                onClick={() => loadSample("sales")}
                title="Reload demo sales dataset"
              >
                <Sparkles size={12} color="var(--color-accent)" /> Sample Data
              </button>
            )}

            <button
              className="theme-toggle"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label="Toggle theme"
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            <Link href="/resources" className="studio-button" style={{ padding: "6px 10px", fontSize: 11 }}>
              Help <ChevronRight size={12} />
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <main className="studio-content">
          <div className="studio-page-heading">
            <div>
              <span className="eyebrow">{meta.eyebrow}</span>
              <h1>{meta.title}</h1>
              <p>{meta.description}</p>
            </div>
            <div className="studio-heading-actions">
              <button className="studio-button primary" onClick={openFilePicker}>
                <Upload size={14} /> Upload CSV
              </button>
              {dataset && (
                <button className="studio-button" onClick={exportCSV}>
                  <Download size={14} /> Export CSV
                </button>
              )}
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            id="studio-file-input"
            className="visually-hidden"
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
          />

          {!ready && (
            <div className="studio-status">
              <span>Preparing local workspace environment…</span>
            </div>
          )}

          {fileError && (
            <div className="studio-status error">
              <AlertTriangle size={15} />
              <span>{fileError}</span>
            </div>
          )}

          {ready && renderContent()}

          <div
            style={{
              marginTop: "auto",
              paddingTop: 24,
              borderTop: "1px solid var(--color-border-subtle)",
              fontSize: 12,
              color: "var(--color-text-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span>FINESE DATA Studio &middot; Browser-local memory processing &middot; No tracking</span>
            <span>Version 0.2.0</span>
          </div>
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <CheckCircle2 size={16} color="var(--color-accent)" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
