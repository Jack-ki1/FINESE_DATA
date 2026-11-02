export type Cell = string | number | null;
export type DataRow = Record<string, Cell>;
export type Dataset = { name: string; columns: string[]; rows: DataRow[]; updatedAt: string; source: "sample" | "local-upload" | "local-change" };

export const STORAGE_KEY = "finese.studio.dataset.v1";
export const THEME_KEY = "finese.studio.theme.v1";

export const sampleDataset = (): Dataset => {
  const raw = [
    ["2026-01", "Nairobi", "Laptop", 18, 745000, "Retail"], ["2026-01", "Mombasa", "Monitor", 24, 312000, "SME"],
    ["2026-02", "Nairobi", "Laptop", 21, 882000, "Retail"], ["2026-02", "Kisumu", "Keyboard", 47, 141000, "Education"],
    ["2026-02", "Nakuru", "Monitor", 16, 224000, "SME"], ["2026-03", "Nairobi", "Laptop", 26, 1092000, "Retail"],
    ["2026-03", "Mombasa", "Keyboard", 39, 117000, "Education"], ["2026-03", "Kisumu", "Monitor", 19, 266000, "SME"],
    ["2026-04", "Nairobi", "Laptop", 29, 1218000, "Retail"], ["2026-04", "Nakuru", "Keyboard", 33, 99000, "Education"],
    ["2026-04", "Mombasa", "Monitor", 17, 238000, "SME"], ["2026-05", "Nairobi", "Laptop", 32, 1344000, "Retail"],
    ["2026-05", "Kisumu", "Keyboard", 41, 123000, "Education"], ["2026-05", "Nakuru", "Monitor", 22, 308000, "SME"],
    ["2026-06", "Nairobi", "Laptop", 35, 1470000, "Retail"], ["2026-06", "Mombasa", "Monitor", 20, 280000, "SME"],
    ["2026-06", "Kisumu", "Keyboard", 45, 135000, "Education"], ["2026-07", "Nairobi", "Laptop", 38, 1596000, "Retail"],
    ["2026-07", "Nakuru", "Monitor", 23, 322000, "SME"], ["2026-07", "Mombasa", "Keyboard", 42, 126000, "Education"],
    ["2026-08", "Nairobi", "Laptop", 43, 1806000, "Retail"], ["2026-08", "Kisumu", "Monitor", 25, 350000, "SME"],
    ["2026-08", "Nakuru", "Keyboard", 46, 138000, "Education"], ["2026-09", "Nairobi", "Laptop", 48, 2016000, "Retail"],
    ["2026-09", "Mombasa", "Monitor", 27, 378000, "SME"], ["2026-09", "Kisumu", "Keyboard", 49, 147000, "Education"],
    ["2026-10", "Nairobi", "Laptop", 52, 2184000, "Retail"], ["2026-10", "Nakuru", "Monitor", 28, 392000, "SME"],
    ["2026-10", "Mombasa", "Keyboard", 53, 159000, "Education"], ["2026-10", "Kisumu", "Laptop", 15, 630000, "Retail"]
  ] as (string | number)[][];
  const columns = ["month", "region", "product", "units_sold", "sales_kes", "segment"];
  return { name: "sample_sales_kenya.csv", columns, rows: raw.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i] as Cell]))), updatedAt: "2026-10-19T00:00:00.000Z", source: "sample" };
};

function castCell(value: string): Cell {
  const v = value.trim();
  if (!v || /^(null|n\/a|na|undefined)$/i.test(v)) return null;
  if (/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(v)) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return v;
}

export function parseCSV(text: string, name = "uploaded.csv"): Dataset {
  text = text.replace(/^\uFEFF/, "");
  if (text.length > 10 * 1024 * 1024) throw new Error("For this starter, CSV imports are capped at 10 MB per file.");
  const grid: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell.length === 0) quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); if (row.some((v) => v.trim() !== "")) grid.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field. Check the file and try again.");
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, "")); if (row.some((v) => v.trim() !== "")) grid.push(row); }
  if (grid.length < 2) throw new Error("CSV needs a header row and at least one data row.");
  if (grid.length > 50001) throw new Error("This starter accepts up to 50,000 data rows per CSV.");
  const width = grid[0].length;
  if (width < 1 || width > 150) throw new Error("This starter accepts between 1 and 150 columns.");
  if (grid.slice(1).some((r) => r.length !== width)) throw new Error("CSV rows have inconsistent column counts. Check the delimiter and file formatting.");
  const headers = grid[0].map((h, i) => (h.trim() || `column_${i + 1}`).replace(/[\u0000-\u001f]/g, "").slice(0, 120));
  const seen = new Map<string, number>();
  const columns = headers.map((h) => {
    const count = (seen.get(h) ?? 0) + 1;
    seen.set(h, count);
    return count === 1 ? h : `${h}_${count}`;
  });
  const rows = grid.slice(1).map((values) => Object.fromEntries(columns.map((column, i) => [column, castCell(values[i] ?? "")])));
  return { name: name.replace(/[\r\n\\/]/g, "_").slice(0, 140), columns, rows, updatedAt: new Date().toISOString(), source: "local-upload" };
}

export function profileDataset(dataset: Dataset) {
  const totalCells = dataset.rows.length * Math.max(dataset.columns.length, 1);
  let missing = 0;
  const seenRows = new Set<string>();
  let duplicates = 0;
  for (const row of dataset.rows) {
    const signature = JSON.stringify(dataset.columns.map((c) => row[c] ?? null));
    if (seenRows.has(signature)) duplicates++;
    seenRows.add(signature);
  }
  const columns = dataset.columns.map((name) => {
    const values = dataset.rows.map((r) => r[name] ?? null);
    const nonNull = values.filter((v) => v !== null && v !== "");
    missing += values.length - nonNull.length;
    const numeric = nonNull.filter((v) => typeof v === "number") as number[];
    const unique = new Set(nonNull.map((v) => String(v))).size;
    let type = "Text";
    if (nonNull.length > 0 && numeric.length / nonNull.length >= 0.9) type = "Number";
    else if (nonNull.length > 0 && nonNull.every((v) => typeof v === "string" && /^\d{4}-\d{2}(-\d{2})?$/.test(v))) type = "Date-like text";
    const sum = numeric.reduce((a, b) => a + b, 0);
    const mean = numeric.length ? sum / numeric.length : null;
    const sorted = [...numeric].sort((a, b) => a - b);
    return { name, type, nonNull: nonNull.length, missing: values.length - nonNull.length, unique, mean, min: sorted[0] ?? null, max: sorted.at(-1) ?? null };
  });
  // This transparent starter score penalizes missing and exact duplicate rows equally by cell/row proportions.
  const missingPct = totalCells ? (missing / totalCells) * 100 : 0;
  const duplicatePct = dataset.rows.length ? (duplicates / dataset.rows.length) * 100 : 0;
  const quality = Math.max(0, Math.round(100 - missingPct * 0.7 - duplicatePct * 0.3));
  return { rows: dataset.rows.length, columns: dataset.columns.length, missing, missingPct, duplicates, duplicatePct, quality, columnProfiles: columns };
}

export function cleanDataset(dataset: Dataset, operation: "trim" | "drop-duplicates" | "drop-missing" | "fill-missing") {
  let rows = dataset.rows.map((r) => ({ ...r }));
  let affected = 0;
  if (operation === "trim") {
    for (const row of rows) for (const c of dataset.columns) if (typeof row[c] === "string") {
      const v = row[c] as string; const next = v.trim(); if (v !== next) { row[c] = next; affected++; }
    }
  } else if (operation === "drop-duplicates") {
    const seen = new Set<string>();
    rows = rows.filter((r) => { const k = JSON.stringify(dataset.columns.map((c) => r[c] ?? null)); if (seen.has(k)) { affected++; return false; } seen.add(k); return true; });
  } else if (operation === "drop-missing") {
    const before = rows.length; rows = rows.filter((r) => dataset.columns.every((c) => r[c] !== null && r[c] !== "")); affected = before - rows.length;
  } else if (operation === "fill-missing") {
    for (const row of rows) for (const c of dataset.columns) if (row[c] === null || row[c] === "") { row[c] = "Unknown"; affected++; }
  }
  return { ...dataset, rows, updatedAt: new Date().toISOString(), source: "local-change" as const, name: dataset.name.replace(/\.csv$/i, "_cleaned.csv") , affected };
}

export function toCSV(dataset: Dataset): string {
  const escape = (cell: Cell) => {
    let s = cell === null ? "" : String(cell);
    // Prevent untrusted text from becoming formulas when opened in spreadsheet apps; preserve real numeric values.
    if (typeof cell !== "number" && (/^[\s\u0000-\u001f]*[=+@]/.test(s) || /^[\s\u0000-\u001f]*-/.test(s))) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [dataset.columns.map(escape).join(","), ...dataset.rows.map((r) => dataset.columns.map((c) => escape(r[c] ?? null)).join(","))].join("\r\n");
}

export function runSafeQuery(dataset: Dataset, query: string): { columns: string[]; rows: DataRow[]; message: string } {
  const q = query.trim().replace(/;\s*$/, "");
  if (!q) throw new Error("Enter a read-only SELECT query first.");
  if (q.includes(";") || /\b(insert|update|delete|drop|alter|create|copy|attach|detach|install|load|pragma|call|export|import|httpfs|read_csv|read_parquet|read_json|glob)\b/i.test(q)) {
    throw new Error("Only one read-only SELECT query over the current in-memory dataset is supported here. File, network, extension and write operations are blocked.");
  }
  // Parse the complete supported statement. Unsupported clauses are rejected instead of silently ignored.
  const parsed = q.match(/^select\s+([\s\S]+?)\s+from\s+(?:dataset|data|sales|sample_sales_kenya)(?:\s+group\s+by\s+([\w"`]+))?(?:\s+limit\s+(\d+))?$/i);
  if (!parsed) {
    if (!/^select\s+/i.test(q)) throw new Error("This starter supports SELECT queries only.");
    throw new Error("Unsupported query shape. Supported forms are SELECT * FROM dataset [LIMIT n], SELECT column[, column] FROM dataset [LIMIT n], COUNT(*), and column + COUNT(*) GROUP BY column. WHERE, ORDER BY, joins and functions are not enabled here.");
  }
  const select = parsed[1].trim();
  const group = parsed[2]?.replace(/["`]/g, "");
  const limit = parsed[3] ? Math.min(Number(parsed[3]), 500) : 100;
  if (select === "*") return { columns: dataset.columns, rows: dataset.rows.slice(0, limit), message: `Returned ${Math.min(dataset.rows.length, limit)} row(s), capped at ${limit}.` };
  const countMatch = select.match(/^count\s*\(\s*\*\s*\)(?:\s+as\s+(\w+))?$/i);
  if (countMatch && !group) return { columns: [countMatch[1] || "count"], rows: [{ [countMatch[1] || "count"]: dataset.rows.length }], message: "Count computed from the current local dataset." };
  if (group) {
    const groupCol = group;
    if (!dataset.columns.includes(groupCol)) throw new Error(`Unknown GROUP BY column: ${groupCol}`);
    const agg = select.match(/^(?:([\w"`]+)\s*,\s*)?count\s*\(\s*\*\s*\)(?:\s+as\s+(\w+))?$/i);
    if (!agg) throw new Error("Grouped queries currently support: SELECT column, COUNT(*) AS count FROM dataset GROUP BY column.");
    if (agg[1] && agg[1].replace(/["`]/g, "") !== groupCol) throw new Error("The selected column must match the GROUP BY column in this starter.");
    const countName = agg[2] || "count"; const counts = new Map<string, { value: Cell; count: number }>();
    for (const row of dataset.rows) { const value = row[groupCol] ?? null; const k = String(value); const current = counts.get(k); counts.set(k, { value, count: (current?.count ?? 0) + 1 }); }
    const rows = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit).map((v) => ({ [groupCol]: v.value, [countName]: v.count }));
    return { columns: [groupCol, countName], rows, message: `Grouped into ${rows.length} result(s) from local data.` };
  }
  const selected = select.split(",").map((s) => s.trim().replace(/^"|"$|^`|`$/g, ""));
  if (selected.some((s) => !/^[\w -]+$/.test(s))) throw new Error("Use plain column names in the SELECT list.");
  const unknown = selected.find((s) => !dataset.columns.includes(s));
  if (unknown) throw new Error(`Unknown column: ${unknown}`);
  const rows = dataset.rows.slice(0, limit).map((r) => Object.fromEntries(selected.map((c) => [c, r[c] ?? null])));
  return { columns: selected, rows, message: `Returned ${rows.length} row(s) from the current local dataset.` };
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value);
}

export function localInsight(dataset: Dataset, prompt: string) {
  const p = profileDataset(dataset);
  const lower = prompt.toLowerCase();
  if (/missing|null|quality|clean/.test(lower)) return `I checked ${formatNumber(p.rows)} rows and ${p.columns} columns locally. ${formatNumber(p.missing)} cells are missing (${p.missingPct.toFixed(1)}% of all cells), and ${p.duplicates} exact duplicate rows were found. The starter quality score is ${p.quality}/100 using the documented formula in the profile panel.`;
  if (/column|field|schema|type/.test(lower)) return `The dataset has ${p.columns} columns: ${p.columnProfiles.map((c) => `${c.name} (${c.type})`).join(", ")}. These types are heuristics based on imported values, so review date-like text before treating it as a date.`;
  if (/sales|revenue|sum|total|average|mean|units|numeric/.test(lower)) {
    const numeric = p.columnProfiles.filter((c) => c.type === "Number" && c.mean !== null);
    return numeric.length ? `Local numeric summary: ${numeric.map((c) => `${c.name} mean ${formatNumber(c.mean)}, min ${formatNumber(c.min)}, max ${formatNumber(c.max)}`).join("; ")}. These are computed from the current dataset in this browser.` : "I couldn't identify numeric columns in this dataset. Import a CSV with numeric values to compute numeric summaries.";
  }
  return `I can help you explore this dataset locally. It contains ${p.rows} rows and ${p.columns} columns. Try asking about missing values, column types, quality, average values or a suggested chart. This response uses deterministic browser calculations; a generative provider is not connected in this starter.`;
}
