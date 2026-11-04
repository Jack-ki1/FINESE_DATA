export const PLOT_TYPES: { id: string; label: string; icon: string; group: string }[] = [
  { id: "bar", label: "Bar", icon: "▮", group: "Compare" },
  { id: "grouped_bar", label: "Grouped bar", icon: "▮▮", group: "Compare" },
  { id: "stacked_bar", label: "Stacked bar", icon: "▤", group: "Compare" },
  { id: "pareto", label: "Pareto", icon: "▥", group: "Compare" },
  { id: "line", label: "Line", icon: "⟋", group: "Trend" },
  { id: "area", label: "Area", icon: "◪", group: "Trend" },
  { id: "scatter", label: "Scatter", icon: "⠿", group: "Relationship" },
  { id: "bubble", label: "Bubble", icon: "◍", group: "Relationship" },
  { id: "heatmap", label: "Heatmap", icon: "▦", group: "Relationship" },
  { id: "histogram", label: "Histogram", icon: "▁▄▂", group: "Distribution" },
  { id: "box", label: "Box plot", icon: "⟺", group: "Distribution" },
  { id: "pie", label: "Pie", icon: "◔", group: "Composition" },
  { id: "donut", label: "Donut", icon: "◌", group: "Composition" },
  { id: "treemap", label: "Treemap", icon: "▩", group: "Composition" },
  { id: "funnel", label: "Funnel", icon: "▼", group: "Composition" },
  { id: "kpi", label: "KPI", icon: "№", group: "Summary" },
];
export const AGGREGATIONS = ["count", "sum", "mean", "median", "min", "max", "nunique", "std"];
export const SORTS = [
  { id: "value_desc", label: "Value ↓" },
  { id: "value_asc", label: "Value ↑" },
  { id: "label", label: "Label A–Z" },
  { id: "none", label: "Dataset order" },
];
export const OPERATORS = [
  { id: "eq", label: "=" },
  { id: "neq", label: "≠" },
  { id: "contains", label: "contains" },
  { id: "gt", label: ">" },
  { id: "lt", label: "<" },
  { id: "between", label: "between" },
];
export const PALETTE_NAMES = ["ocean", "sunset", "forest", "mono", "candy"];
export const KPI_OPTIONS = [
  { id: "rows", label: "Rows" },
  { id: "columns", label: "Columns" },
  { id: "missing", label: "Missing" },
  { id: "duplicates", label: "Duplicates" },
  { id: "memory", label: "Memory" },
  { id: "quality", label: "Health score" },
  { id: "numeric", label: "Numeric fields" },
  { id: "categorical", label: "Categorical fields" },
  { id: "size", label: "File size" },
];
