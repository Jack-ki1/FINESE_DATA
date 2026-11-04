"""Descriptive analysis used by the Overview dashboard.

Every result here is a deterministic computation over the active dataset so the
Overview plots never depend on an external AI provider.
"""
import math
from typing import Any
import numpy as np
import pandas as pd
from backend.app.services.datasets import DatasetService, json_safe


def _f(value: Any, digits: int = 4):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return round(number, digits) if math.isfinite(number) else None


def _series(df: pd.DataFrame, column: str) -> pd.Series:
    if column not in df.columns:
        return pd.Series(dtype="float64")
    return pd.to_numeric(df[column], errors="coerce").dropna().astype(float)


def _quantile(values: pd.Series, q: float):
    return _f(values.quantile(q)) if len(values) else None


def descriptive(df: pd.DataFrame, columns: list[str] | None = None, hist_bins: int = 16) -> dict[str, Any]:
    numeric = df.select_dtypes(include="number")
    chosen = [c for c in (columns or list(numeric.columns)) if c in numeric.columns][:24]
    rows = []
    for name in chosen:
        s = numeric[name].dropna().astype(float)
        if not len(s):
            continue
        q1 = s.quantile(.25); q3 = s.quantile(.75); iqr = q3 - q1
        low_fence = q1 - 1.5 * iqr; high_fence = q3 + 1.5 * iqr
        flagged = int(((s < low_fence) | (s > high_fence)).sum()) if iqr else 0
        hist, edges = np.histogram(s.values, bins=min(max(hist_bins, 4), 40))
        skew = s.skew() if len(s) > 2 else 0
        rows.append({
            "column": str(name), "count": int(s.count()), "missing": int(df[name].isna().sum()),
            "mean": _f(s.mean()), "median": _f(s.median()), "std": _f(s.std()), "min": _f(s.min()),
            "max": _f(s.max()), "q05": _f(s.quantile(.05)), "q25": _f(q1), "q75": _f(q3),
            "q95": _f(s.quantile(.95)), "iqr": _f(iqr), "skew": _f(skew), "kurtosis": _f(s.kurtosis()),
            "outliers": flagged, "outlier_pct": round(100 * flagged / max(len(s), 1), 2),
            "unique": int(numeric[name].nunique(dropna=True)),
            "histogram": {"labels": [f"{edges[i]:.3g}–{edges[i + 1]:.3g}" for i in range(len(hist))], "values": hist.astype(int).tolist()},
            "box": {"low": _f(low_fence), "q05": _f(s.quantile(.05)), "q25": _f(q1), "median": _f(s.median()),
                    "q75": _f(q3), "q95": _f(s.quantile(.95)), "high": _f(high_fence)},
        })
    return {"columns": rows, "numeric_columns": [str(c) for c in numeric.columns],
            "hist_bins": hist_bins}


def missing_map(df: pd.DataFrame, columns: list[str] | None = None) -> dict[str, Any]:
    chosen = [c for c in (columns or list(df.columns)) if c in df.columns][:60]
    sample_size = min(len(df), 240)
    if sample_size:
        positions = np.linspace(0, len(df) - 1, sample_size).astype(int)
        sample = df.iloc[positions]
    else:
        sample = df
    cells = []
    for name in chosen:
        cells.append([1 if bool(pd.isna(v)) else 0 for v in sample[name].tolist()])
    per_column = []
    rows_with_missing = int(df[chosen].isna().any(axis=1).sum()) if chosen else 0
    complete_rows = int(len(df) - rows_with_missing)
    for name in chosen:
        miss = int(df[name].isna().sum())
        per_column.append({"column": str(name), "missing": miss, "missing_pct": round(100 * miss / max(len(df), 1), 2)})
    patterns = pd.Series(
        ["|".join(c for c in chosen if pd.isna(row[c])) for _, row in df[chosen].head(5000).iterrows()]
    ).value_counts().head(8)
    pattern_rows = [{"pattern": ("No missing values" if k == "" else k.replace("|", " + ")), "count": int(v),
                     "pct": round(100 * int(v) / max(min(len(df), 5000), 1), 2)} for k, v in patterns.items()]
    return {"columns": [str(c) for c in chosen], "sample_rows": sample_size, "cells": cells,
            "per_column": sorted(per_column, key=lambda x: x["missing"], reverse=True),
            "rows_with_missing": rows_with_missing, "complete_rows": complete_rows,
            "complete_pct": round(100 * complete_rows / max(len(df), 1), 2), "patterns": pattern_rows}


def outliers(df: pd.DataFrame, columns: list[str] | None = None, method: str = "iqr", threshold: float = 1.5, max_points: int = 400) -> dict[str, Any]:
    numeric = df.select_dtypes(include="number")
    chosen = [c for c in (columns or list(numeric.columns)) if c in numeric.columns][:24]
    per_column = []
    for name in chosen:
        s = numeric[name].dropna().astype(float)
        if len(s) < 4:
            per_column.append({"column": str(name), "method": method, "outliers": 0, "outlier_pct": 0, "lower": None, "upper": None, "values": [], "count": int(len(s))})
            continue
        if method == "zscore":
            mu = s.mean(); sd = s.std()
            sd = sd if sd and math.isfinite(sd) else 1.0
            mask = (s - mu).abs() > threshold * sd
            lower, upper = mu - threshold * sd, mu + threshold * sd
        else:
            q1 = s.quantile(.25); q3 = s.quantile(.75); iqr = q3 - q1
            lower, upper = q1 - threshold * iqr, q3 + threshold * iqr
            mask = (s < lower) | (s > upper) if iqr else pd.Series(False, index=s.index)
        flagged = s[mask]
        values = [_f(v) for v in flagged.head(max_points).tolist()]
        per_column.append({"column": str(name), "method": method, "outliers": int(len(flagged)),
                           "outlier_pct": round(100 * len(flagged) / len(s), 2), "lower": _f(lower), "upper": _f(upper),
                           "values": values, "count": int(len(s)), "min": _f(s.min()), "max": _f(s.max()),
                           "median": _f(s.median())})
    per_column.sort(key=lambda x: x["outliers"], reverse=True)
    return {"method": method, "threshold": threshold, "columns": per_column,
            "total_outliers": sum(x["outliers"] for x in per_column),
            "numeric_columns": [str(c) for c in numeric.columns]}


def association(df: pd.DataFrame, columns: list[str] | None = None, method: str = "pearson", top_n: int = 12) -> dict[str, Any]:
    numeric = df.select_dtypes(include="number")
    chosen = [c for c in (columns or list(numeric.columns)) if c in numeric.columns][:16]
    if len(chosen) < 2:
        return {"columns": [], "matrix": [], "pairs": [], "method": method, "categorical": [], "mixed": []}
    corr = numeric[chosen].corr(method="spearman" if method == "spearman" else "pearson", numeric_only=True)
    corr = corr.replace([np.inf, -np.inf], np.nan).fillna(0)
    pairs = []
    for i in range(len(chosen)):
        for j in range(i + 1, len(chosen)):
            value = float(corr.iloc[i, j])
            pairs.append({"a": chosen[i], "b": chosen[j], "value": round(value, 4), "abs": abs(value)})
    pairs.sort(key=lambda x: x["abs"], reverse=True)
    scatter = []
    for pair in pairs[:6]:
        sub = df[[pair["a"], pair["b"]]].apply(pd.to_numeric, errors="coerce").dropna()
        if len(sub) > 800:
            sub = sub.sample(800, random_state=7)
        scatter.append({"x": pair["a"], "y": pair["b"], "r": pair["value"],
                        "points": [[_f(a, 6), _f(b, 6)] for a, b in sub.values.tolist()]})
    # Categorical association via Cramér's V (lightweight for small cardinality).
    cat_cols = [c for c in df.columns if c not in numeric.columns and 2 <= df[c].nunique(dropna=True) <= 40][:8]
    categorical = []
    for i, a in enumerate(cat_cols):
        for b in cat_cols[i + 1:]:
            try:
                table = pd.crosstab(df[a], df[b])
                if table.size < 4:
                    continue
                chi2 = float(((table - np.outer(table.sum(axis=1), table.sum(axis=0)) / table.values.sum()) ** 2 /
                              (np.outer(table.sum(axis=1), table.sum(axis=0)) / table.values.sum())).values.sum())
                n = table.values.sum(); k = min(table.shape) - 1
                v = math.sqrt(chi2 / (n * k)) if n and k else 0
                categorical.append({"a": str(a), "b": str(b), "value": round(v, 4)})
            except Exception:
                continue
    categorical.sort(key=lambda x: x["value"], reverse=True)
    # Mixed association: normalized mutual information between numeric bins and categories.
    mixed = []
    for num in chosen[:6]:
        for cat in cat_cols[:4]:
            try:
                binned = pd.qcut(pd.to_numeric(df[num], errors="coerce"), 5, duplicates="drop")
                table = pd.crosstab(binned, df[cat])
                if table.size < 4:
                    continue
                p = table.values / table.values.sum()
                px = p.sum(axis=1); py = p.sum(axis=0)
                with np.errstate(divide="ignore", invalid="ignore"):
                    expected = np.outer(px, py)
                    mi = np.nansum(p * np.log(p / expected))
                h = min(-np.nansum(px * np.log(px)), -np.nansum(py * np.log(py)))
                mixed.append({"a": str(num), "b": str(cat), "value": round(float(mi / h), 4) if h else 0})
            except Exception:
                continue
    mixed.sort(key=lambda x: x["value"], reverse=True)
    return {"columns": chosen, "matrix": corr.round(3).values.tolist(), "pairs": [{k: v for k, v in p.items() if k != "abs"} for p in pairs[:top_n]],
            "method": method, "scatter": scatter, "categorical": categorical[:top_n], "mixed": mixed[:top_n]}


def distributions(df: pd.DataFrame, columns: list[str] | None = None, bins: int = 20, top_n: int = 5) -> dict[str, Any]:
    chosen = [c for c in (columns or list(df.columns)) if c in df.columns][:24]
    numeric, categorical = [], []
    for name in chosen:
        s = df[name]
        if pd.api.types.is_numeric_dtype(s):
            vals = pd.to_numeric(s, errors="coerce").dropna().astype(float)
            if len(vals) < 3:
                continue
            hist, edges = np.histogram(vals.values, bins=min(max(bins, 4), 60))
            numeric.append({"column": str(name), "labels": [f"{edges[i]:.3g}–{edges[i + 1]:.3g}" for i in range(len(hist))],
                            "values": hist.astype(int).tolist(), "mean": _f(vals.mean()), "median": _f(vals.median()),
                            "skew": _f(vals.skew()), "kind": "histogram"})
        else:
            vc = s.astype("string").fillna("(Missing)").value_counts().head(top_n * 2)
            if not len(vc):
                continue
            categorical.append({"column": str(name), "labels": [str(x)[:40] for x in vc.index.tolist()],
                                "values": [int(x) for x in vc.values.tolist()], "distinct": int(s.nunique(dropna=True)),
                                "kind": "bar"})
    return {"numeric": numeric, "categorical": categorical, "bins": bins}


def eda_summary(df: pd.DataFrame) -> dict[str, Any]:
    """Model-studio EDA helpers: frequency tables and class balance."""
    frequency = []
    for name in df.columns:
        if pd.api.types.is_numeric_dtype(df[name]) and df[name].nunique() > 40:
            continue
        vc = df[name].astype("string").fillna("(Missing)").value_counts().head(12)
        if len(vc):
            frequency.append({"column": str(name), "labels": [str(x)[:40] for x in vc.index.tolist()],
                              "values": [int(x) for x in vc.values.tolist()]})
    return {"frequency": frequency}


class InsightsService:
    @staticmethod
    def overview(df: pd.DataFrame, columns: list[str] | None = None, bins: int = 16, max_points: int = 2000) -> dict[str, Any]:
        sample = df.head(max_points)
        return {
            "rows": int(len(df)),
            "columns": int(df.shape[1]),
            "column_names": [str(c) for c in df.columns],
            "kinds": {str(c): ("numeric" if pd.api.types.is_numeric_dtype(df[c]) else "categorical") for c in df.columns},
            "descriptive": descriptive(df, columns, bins),
            "missing": missing_map(df, columns),
            "outliers": outliers(df, columns),
            "association": association(df, columns),
            "distributions": distributions(df, columns, max(bins, 20)),
            "eda": eda_summary(sample),
        }
