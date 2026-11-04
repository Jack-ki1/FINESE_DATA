"""Chart and pivot builders for the Plot Studio.

The frontend sends a declarative spec and receives a ready-to-render dataset
(labels + numeric series) plus a tidy row sample. The same response shape feeds
the SVG renderer, CSV/JSON downloads and the AI assistant context.
"""
import math
from typing import Any
import numpy as np
import pandas as pd
from fastapi import HTTPException
from backend.app.services.datasets import DatasetService, json_safe

AGGREGATIONS = ("count", "sum", "mean", "median", "min", "max", "nunique", "std")
CHART_TYPES = ("bar", "line", "area", "scatter", "bubble", "histogram", "box", "heatmap",
               "pie", "donut", "stacked_bar", "grouped_bar", "treemap", "funnel", "pareto", "kpi")


def _clean_label(value: Any) -> str:
    if isinstance(value, (list, tuple)):
        return " / ".join(_clean_label(v) for v in value)[:64]
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return "(Missing)"
    text = str(value)
    return text[:48]


def _num(value: Any):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return round(number, 4) if math.isfinite(number) else None


class PlotService:
    @staticmethod
    def catalog() -> list[dict[str, Any]]:
        return [
            {"id": "bar", "label": "Bar", "needs": ["x", "y"], "description": "Compare one aggregated measure across categories."},
            {"id": "grouped_bar", "label": "Grouped bar", "needs": ["x", "y", "series"], "description": "Compare a measure across categories split by a second dimension."},
            {"id": "stacked_bar", "label": "Stacked bar", "needs": ["x", "y", "series"], "description": "Show composition of totals across categories."},
            {"id": "line", "label": "Line", "needs": ["x", "y"], "description": "Track a measure over time or ordered values."},
            {"id": "area", "label": "Area", "needs": ["x", "y"], "description": "Emphasise volume change over an ordered axis."},
            {"id": "scatter", "label": "Scatter", "needs": ["x", "y"], "description": "Relationship between two numeric fields."},
            {"id": "bubble", "label": "Bubble", "needs": ["x", "y", "size"], "description": "Scatter with a third numeric magnitude."},
            {"id": "histogram", "label": "Histogram", "needs": ["x"], "description": "Distribution of a numeric field."},
            {"id": "box", "label": "Box plot", "needs": ["x", "y"], "description": "Distribution and outliers by category."},
            {"id": "heatmap", "label": "Heatmap", "needs": ["x", "y"], "description": "Cross-tabulated intensity matrix."},
            {"id": "pie", "label": "Pie", "needs": ["x", "y"], "description": "Share of total across categories."},
            {"id": "donut", "label": "Donut", "needs": ["x", "y"], "description": "Part-to-whole with a central total."},
            {"id": "treemap", "label": "Treemap", "needs": ["x", "y"], "description": "Proportional area for hierarchical magnitudes."},
            {"id": "funnel", "label": "Funnel", "needs": ["x", "y"], "description": "Stage-to-stage conversion."},
            {"id": "pareto", "label": "Pareto", "needs": ["x", "y"], "description": "Sorted bars with cumulative contribution."},
            {"id": "kpi", "label": "KPI card", "needs": ["y"], "description": "A single headline number."},
        ]

    @staticmethod
    def build(df: pd.DataFrame, spec: dict[str, Any]) -> dict[str, Any]:
        chart = str(spec.get("type") or "bar").lower()
        if chart not in CHART_TYPES:
            raise HTTPException(422, f"Unknown plot type '{chart}'. Choose from {', '.join(CHART_TYPES)}.")
        x = spec.get("x") or None
        y = spec.get("y") or None
        series = spec.get("series") or None
        size = spec.get("size") or None
        agg = str(spec.get("aggregation") or "sum").lower()
        if agg not in AGGREGATIONS:
            raise HTTPException(422, f"Aggregation must be one of {', '.join(AGGREGATIONS)}.")
        limit = max(1, min(int(spec.get("limit") or 20), 100))
        bins = max(3, min(int(spec.get("bins") or 20), 60))
        sort = str(spec.get("sort") or "value_desc")
        filters = spec.get("filters") or []
        frame = df
        for rule in filters:
            column = rule.get("column")
            if not column or column not in frame.columns:
                continue
            op = str(rule.get("operator") or "eq")
            value = rule.get("value")
            col = frame[column]
            try:
                if op in ("gt", "lt", "gte", "lte", "between"):
                    numeric = pd.to_numeric(col, errors="coerce")
                    if op == "between":
                        bounds = [float(v) for v in str(value).split(",")[:2]]
                        mask = numeric.between(bounds[0], bounds[1]) if len(bounds) == 2 else numeric.notna()
                    else:
                        target = float(value)
                        mask = {"gt": numeric > target, "lt": numeric < target, "gte": numeric >= target, "lte": numeric <= target}[op]
                elif op == "contains":
                    mask = col.astype("string").str.contains(str(value), case=False, na=False, regex=False)
                elif op == "neq":
                    mask = col.astype("string") != str(value)
                else:
                    mask = col.astype("string") == str(value)
                frame = frame[mask.fillna(False)]
            except (TypeError, ValueError):
                raise HTTPException(422, f"Invalid filter value for '{column}'.")
        if frame.empty:
            raise HTTPException(422, "Filters removed every row.")

        for name, field, label in ((x, "x", "X axis"), (y, "y", "Y axis"), (series, "series", "Series"), (size, "size", "Size")):
            if name and name not in frame.columns:
                raise HTTPException(422, f"{label} column '{name}' is not in this dataset.")

        def numeric(column: str) -> pd.Series:
            return pd.to_numeric(frame[column], errors="coerce")

        def aggregate(group: pd.DataFrame, column: str | None) -> float:
            if agg == "count" or not column:
                return float(len(group))
            values = pd.to_numeric(group[column], errors="coerce")
            if values.dropna().empty:
                return 0.0
            if agg == "nunique":
                return float(group[column].nunique(dropna=True))
            return float(getattr(values, agg)())

        result: dict[str, Any] = {"type": chart, "x": x, "y": y, "series": series, "aggregation": agg,
                                  "rows": int(len(frame)), "labels": [], "series_data": [], "meta": {}}

        if chart == "kpi":
            if not y:
                raise HTTPException(422, "Choose a numeric measure for the KPI card.")
            value = aggregate(frame, y)
            result["kpi"] = {"label": y, "value": round(value, 4), "aggregation": agg,
                             "rows": int(len(frame)), "min": _num(numeric(y).min()), "max": _num(numeric(y).max()),
                             "mean": _num(numeric(y).mean()), "median": _num(numeric(y).median())}
            result["labels"] = [y]; result["series_data"] = [{"name": y, "values": [round(value, 4)]}]
            result["table"] = [{"metric": k, "value": v} for k, v in result["kpi"].items() if k != "label"]
            return result

        if chart == "histogram":
            if not x:
                raise HTTPException(422, "Choose a numeric column for the histogram.")
            values = numeric(x).dropna()
            if values.empty:
                raise HTTPException(422, "That column has no numeric values.")
            hist, edges = np.histogram(values.values, bins=bins)
            result["labels"] = [f"{edges[i]:.3g}–{edges[i + 1]:.3g}" for i in range(len(hist))]
            result["series_data"] = [{"name": f"Count of {x}", "values": hist.astype(int).tolist()}]
            result["meta"] = {"x": x, "count": int(values.count()), "mean": _num(values.mean()), "median": _num(values.median()), "std": _num(values.std())}
            result["table"] = [{"bin": l, "count": int(v)} for l, v in zip(result["labels"], result["series_data"][0]["values"])]
            return result

        if chart == "scatter" or chart == "bubble":
            if not x or not y:
                raise HTTPException(422, "Scatter plots need numeric X and Y columns.")
            needed = [c for c in (x, y, size, series) if c]
            sub = frame[needed].copy()
            sub[x] = numeric(x); sub[y] = numeric(y)
            if size:
                sub[size] = numeric(size)
            sub = sub.dropna(subset=[x, y])
            if len(sub) > 1500:
                sub = sub.sample(1500, random_state=11)
            groups = [(None, sub)]
            if series:
                groups = [(str(k), g) for k, g in sub.groupby(series, dropna=False, observed=True)][:12]
            result["series_data"] = [{
                "name": str(name) if name is not None else f"{y} vs {x}",
                "points": [[_num(r[x]), _num(r[y]), _num(r[size]) if size else None] for _, r in g.iterrows()],
            } for name, g in groups]
            result["meta"] = {"x": x, "y": y, "size": size, "correlation": _num(sub[x].corr(sub[y]))}
            result["table"] = [{k: json_safe(v) for k, v in row.items()} for row in sub.head(200).to_dict(orient="records")]
            return result

        if chart == "box":
            if not x or not y:
                raise HTTPException(422, "Box plots need a category (X) and a numeric measure (Y).")
            groups = frame[[x, y]].copy(); groups[y] = numeric(y); groups = groups.dropna(subset=[y])
            stats = []
            for key, g in groups.groupby(x, dropna=False, observed=True):
                s = g[y]
                if s.empty:
                    continue
                q1, med, q3 = s.quantile(.25), s.median(), s.quantile(.75)
                iqr = q3 - q1
                inside = s[(s >= q1 - 1.5 * iqr) & (s <= q3 + 1.5 * iqr)]
                stats.append({"label": _clean_label(key), "low": _num(inside.min() if len(inside) else s.min()), "q1": _num(q1), "median": _num(med),
                              "q3": _num(q3), "high": _num(inside.max() if len(inside) else s.max()), "count": int(len(s)),
                              "outliers": [_num(v) for v in s[(s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)].head(60).tolist()]})
            order = lambda item: item["median"] if sort.startswith("value") else item["label"]  # noqa: E731
            stats.sort(key=lambda s: (s["median"] is None, s["median"]), reverse=sort == "value_desc")
            result["boxes"] = stats[:limit]
            result["labels"] = [b["label"] for b in result["boxes"]]
            result["meta"] = {"x": x, "y": y, "groups": len(stats)}
            result["table"] = result["boxes"]
            return result

        if chart == "heatmap":
            if not x or not y:
                raise HTTPException(422, "Heatmaps need a row dimension (X) and a column dimension (Y).")
            metric = spec.get("metric") or None
            if agg != "count" and not metric:
                agg = "count"
            if agg != "count" and metric not in frame.columns:
                raise HTTPException(422, "Metric column is not in this dataset.")
            pivot = pd.pivot_table(frame, index=y, columns=x, values=metric if agg != "count" else None,
                                   aggfunc=agg if agg != "count" else "count", fill_value=0, dropna=False)
            pivot = pivot.iloc[:min(limit, 25), :min(limit, 25)]
            result["heatmap"] = {"rows": [_clean_label(i) for i in pivot.index], "cols": [_clean_label(c) for c in pivot.columns],
                                 "matrix": [[_num(v) or 0 for v in row] for row in pivot.values.tolist()], "metric": metric or "count"}
            result["labels"] = result["heatmap"]["cols"]
            result["meta"] = {"x": x, "y": y, "aggregation": agg}
            result["table"] = [{"row": r, **{c: v for c, v in zip(result["heatmap"]["cols"], vals)}}
                               for r, vals in zip(result["heatmap"]["rows"], result["heatmap"]["matrix"])]
            return result

        # Categorical aggregations: bar/line/area/pie/donut/treemap/funnel/pareto/grouped/stacked
        if not x:
            raise HTTPException(422, "Choose a category (X axis) for this chart.")
        if agg != "count" and not y:
            raise HTTPException(422, "Choose a numeric measure (Y axis) or use count aggregation.")
        value_col = y if (y and agg != "count") else "__count__"
        work = frame.copy()
        if value_col == "__count__":
            work["__count__"] = 1.0
        else:
            work[value_col] = numeric(y)
        key = x
        if pd.api.types.is_datetime64_any_dtype(work[x]):
            work["__x__"] = pd.to_datetime(work[x], errors="coerce").dt.strftime("%Y-%m-%d")
            key = "__x__"
        else:
            work["__x__"] = work[x].map(_clean_label)
            key = "__x__"
        if series:
            if agg == "count":
                grouped = work.groupby(["__x__", series], dropna=False, observed=True).size().reset_index(name="value")
            else:
                grouped = work.groupby(["__x__", series], dropna=False, observed=True)[value_col].agg(agg if agg != "count" else "size").reset_index(name="value")
            totals = grouped.groupby("__x__")["value"].sum()
            order = totals.sort_values(ascending=sort != "value_asc").index.tolist()
            if sort.startswith("label"):
                order = sorted(order)
            order = order[:limit]
            grouped = grouped[grouped["__x__"].isin(order)]
            pivoted = grouped.pivot_table(index="__x__", columns=series, values="value", aggfunc="sum", fill_value=0)
            pivoted = pivoted.reindex(order)
            result["labels"] = [_clean_label(v) for v in pivoted.index]
            result["series_data"] = [{"name": _clean_label(c), "values": [round(float(v), 4) for v in pivoted[c].tolist()]} for c in pivoted.columns[:12]]
            result["meta"] = {"x": x, "y": y, "aggregation": agg, "series": series, "stacked": chart == "stacked_bar"}
        else:
            if agg == "count":
                grouped = work.groupby("__x__", dropna=False, observed=True).size().reset_index(name="value")
            else:
                grouped = work.groupby("__x__", dropna=False, observed=True)[value_col].agg(agg).reset_index(name="value")
            grouped["value"] = grouped["value"].fillna(0)
            if agg not in ("count",):
                grouped = grouped[pd.to_numeric(grouped["value"], errors="coerce").notna()]
            if sort.startswith("value"):
                grouped = grouped.sort_values("value", ascending=sort == "value_asc")
            elif sort == "label":
                grouped = grouped.sort_values("__x__")
            grouped = grouped.head(limit)
            result["labels"] = [_clean_label(v) for v in grouped["__x__"].tolist()]
            values = [round(float(v), 4) for v in grouped["value"].tolist()]
            result["series_data"] = [{"name": f"{agg} of {y}" if y and agg != "count" else "records", "values": values}]
            if chart == "pareto":
                total = sum(values) or 1
                cumulative, running = [], 0.0
                for v in values:
                    running += v
                    cumulative.append(round(100 * running / total, 2))
                result["series_data"].append({"name": "Cumulative %", "values": cumulative})
                result["meta"]["cumulative"] = cumulative
            result["meta"].update({"x": x, "y": y, "aggregation": agg, "total": round(sum(values), 4)})
            result["table"] = [{"category": l, "value": v} for l, v in zip(result["labels"], values)]
        return result

    @staticmethod
    def pivot(df: pd.DataFrame, spec: dict[str, Any]) -> dict[str, Any]:
        rows = [c for c in (spec.get("rows") or []) if c in df.columns][:4]
        cols = [c for c in (spec.get("columns") or []) if c in df.columns][:3]
        values = [c for c in (spec.get("values") or []) if c in df.columns][:4]
        aggs = spec.get("aggregations") or []
        if not rows:
            raise HTTPException(422, "Choose at least one row field for the pivot table.")
        if isinstance(aggs, str):
            aggs = [aggs]
        aggs = [a for a in aggs if a in AGGREGATIONS] or ["count"]
        filters = spec.get("filters") or []
        frame = df
        for rule in filters:
            column = rule.get("column")
            if column in frame.columns and rule.get("operator", "eq") == "eq":
                frame = frame[frame[column].astype("string") == str(rule.get("value"))]
        if frame.empty:
            raise HTTPException(422, "Filters removed every row.")
        limit = max(1, min(int(spec.get("limit") or 40), 200))
        if not values:
            values = ["__rows__"]
            frame = frame.copy(); frame["__rows__"] = 1
        tables = []
        for agg in aggs:
            for value in values:
                if agg != "count" and value == "__rows__":
                    continue
                try:
                    if agg != "count" and not pd.api.types.is_numeric_dtype(frame[value]):
                        continue
                    work = frame.copy() if agg == "count" else frame
                    target = "__count__" if agg == "count" else value
                    function = "sum" if agg == "count" else agg
                    if agg == "count":
                        work = work.copy(); work["__count__"] = 1
                    table = pd.pivot_table(work, index=rows, columns=cols or None, values=target, aggfunc=function,
                                           fill_value=0, observed=True).assign(Total=lambda d: d.sum(axis=1))
                    total_idx = list(table.index.names) if isinstance(table.index, pd.MultiIndex) else [table.index.name]
                    total_row = pd.DataFrame([table.sum(axis=0).values], index=pd.MultiIndex.from_tuples([tuple(["Total"] * len(rows))], names=[n or f"row{i}" for i, n in enumerate(total_idx)]), columns=table.columns)
                    table = pd.concat([table, total_row])
                except Exception:
                    continue
                if table.empty:
                    continue
                cols_display = [" / ".join(map(_clean_label, c)) if isinstance(c, (tuple, list)) else _clean_label(c) for c in (table.columns.tolist() if hasattr(table.columns, "tolist") else [])]
                if not cols:
                    cols_display = [f"{agg}({value if value != '__rows__' else 'rows'})"]
                body = []
                for idx, row in zip(table.index.tolist(), table.values.tolist()):
                    idx_list = list(idx) if isinstance(idx, tuple) else [idx]
                    body.append({"__row__": [_clean_label(v) for v in idx_list],
                                 "cells": [_num(v) or 0 for v in row]})
                row_totals = ["Total" in [str(v) for v in r["__row__"]] for r in body]
                tables.append({
                    "aggregation": agg, "value": None if value == "__rows__" else value,
                    "row_fields": rows, "column_fields": cols, "columns": [str(c) for c in cols_display], "rows": body[:limit],
                    "row_totals": row_totals[:limit],
                    "column_totals": [round(sum(r["cells"][i] for r in body), 4) for i in range(len(cols_display))] if body and cols else [],
                    "grand_total": sum(sum(r["cells"]) for r in body),
                })
        if not tables:
            raise HTTPException(422, "No valid pivot combination. Avoid repeating a field in both rows and columns, and pair sum/mean/median with a numeric value field (count works with any field).")
        return {"tables": tables, "row_fields": rows, "column_fields": cols, "values": values, "aggregations": aggs}
