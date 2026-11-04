import hashlib, json, math, sqlite3
from pathlib import Path
from typing import Any
import numpy as np
import pandas as pd
from backend.app.config import settings
from backend.app.models import Dataset, DatasetVersion
from backend.app.security import safe_filename
from fastapi import HTTPException

SUPPORTED = {".csv", ".tsv", ".xlsx", ".xls", ".json", ".jsonl", ".ndjson", ".parquet", ".db", ".sqlite", ".sqlite3"}

def json_safe(value: Any):
    if value is None: return None
    if isinstance(value, (np.integer,)): return int(value)
    if isinstance(value, (np.floating,)): return float(value) if np.isfinite(value) else None
    if isinstance(value, (np.bool_,)): return bool(value)
    if isinstance(value, (pd.Timestamp,)): return value.isoformat()
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)): return None
    try:
        if pd.isna(value): return None
    except (TypeError, ValueError): pass
    return value.item() if hasattr(value, "item") else value

class DatasetService:
    @staticmethod
    def read_file(path: Path, max_rows: int | None = None) -> pd.DataFrame:
        ext = path.suffix.lower(); n = (max_rows or settings.MAX_ROWS) + 1
        try:
            if ext == ".csv": df = pd.read_csv(path, nrows=n)
            elif ext == ".tsv": df = pd.read_csv(path, sep="\t", nrows=n)
            elif ext in (".xlsx", ".xls"): df = pd.read_excel(path, nrows=n)
            elif ext == ".json":
                try: df = pd.read_json(path, orient="records")
                except ValueError: df = pd.read_json(path, lines=True)
            elif ext in (".jsonl", ".ndjson"): df = pd.read_json(path, lines=True)
            elif ext == ".parquet": df = pd.read_parquet(path)
            elif ext in (".db", ".sqlite", ".sqlite3"):
                con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
                try:
                    tables = pd.read_sql("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", con)
                    if tables.empty: raise ValueError("SQLite file contains no tables.")
                    table = str(tables.iloc[0, 0]).replace('"', '""')
                    df = pd.read_sql(f'SELECT * FROM "{table}" LIMIT {n}', con)
                finally: con.close()
            else: raise HTTPException(415, f"Unsupported format: {ext}")
        except HTTPException: raise
        except ImportError as exc: raise HTTPException(422, "This file format needs an optional reader dependency. Install the documented backend requirements.") from exc
        except Exception as exc: raise HTTPException(422, f"Could not read this dataset: {str(exc)[:240]}") from exc
        if len(df) > (max_rows or settings.MAX_ROWS): raise HTTPException(413, f"Dataset exceeds the {settings.MAX_ROWS:,} row processing limit.")
        if len(df.columns) < 1 or len(df.columns) > settings.MAX_COLUMNS: raise HTTPException(413, f"Dataset must contain between 1 and {settings.MAX_COLUMNS} columns.")
        if df.empty: raise HTTPException(422, "Dataset contains no data rows.")
        df.columns = DatasetService.unique_columns([str(c) for c in df.columns])
        return df

    @staticmethod
    def unique_columns(columns: list[str]) -> list[str]:
        seen: dict[str,int] = {}; result=[]
        for i, raw in enumerate(columns):
            name = raw.strip() or f"column_{i+1}"
            name = name[:160]; seen[name] = seen.get(name,0)+1
            result.append(name if seen[name] == 1 else f"{name}_{seen[name]}")
        return result

    @staticmethod
    def persist_frame(df: pd.DataFrame, owner_id: str, dataset_id: str, version: int) -> Path:
        folder = settings.STORAGE_DIR / owner_id / dataset_id; folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"version_{version}.csv"
        df.to_csv(path, index=False)
        return path

    @staticmethod
    def checksum(path: Path) -> str:
        h = hashlib.sha256()
        with path.open("rb") as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b""): h.update(chunk)
        return h.hexdigest()

    @staticmethod
    def profile(df: pd.DataFrame, dataset: Dataset | None = None) -> dict[str, Any]:
        rows, cols = df.shape; total = max(rows * cols, 1)
        missing_total = int(df.isna().sum().sum()); duplicate_rows = int(df.duplicated().sum())
        column_profiles=[]; invalid_cells=0; type_issues=[]; distributions={}
        for name in df.columns:
            s=df[name]; miss=int(s.isna().sum()); non=s.dropna(); unique=int(s.nunique(dropna=True))
            inferred=str(s.dtype); kind="text"
            if pd.api.types.is_bool_dtype(s): kind="boolean"
            elif pd.api.types.is_numeric_dtype(s): kind="numeric"
            elif pd.api.types.is_datetime64_any_dtype(s): kind="datetime"
            elif unique and unique <= min(30, max(5, int(rows*.1))): kind="categorical"
            elif len(non):
                sample=non.astype(str).head(50)
                if sample.str.match(r"^\d{4}-\d{2}(-\d{2})?$").mean() > .9: kind="date-like"
            numeric=pd.to_numeric(s, errors="coerce") if kind != "numeric" else s
            numeric_values=numeric.dropna()
            base={"name":str(name),"dtype":inferred,"kind":kind,"non_null":int(s.count()),"missing":miss,"missing_pct":round(100*miss/max(rows,1),2),"unique":unique,"unique_pct":round(100*unique/max(int(s.count()),1),2)}
            if kind == "numeric" and len(numeric_values):
                q1=float(numeric_values.quantile(.25)); q3=float(numeric_values.quantile(.75)); iqr=q3-q1
                outliers=int(((numeric_values < q1-1.5*iqr)|(numeric_values > q3+1.5*iqr)).sum()) if iqr else 0
                base.update({"mean":round(float(numeric_values.mean()),4),"median":round(float(numeric_values.median()),4),"std":round(float(numeric_values.std()),4) if len(numeric_values)>1 else 0,"min":json_safe(numeric_values.min()),"max":json_safe(numeric_values.max()),"q1":round(q1,4),"q3":round(q3,4),"outliers":outliers})
                hist, edges=np.histogram(numeric_values.astype(float), bins=min(12, max(5, int(np.sqrt(len(numeric_values))))))
                distributions[str(name)]={"kind":"histogram","labels":[f"{edges[i]:.3g}–{edges[i+1]:.3g}" for i in range(len(hist))],"values":hist.astype(int).tolist()}
            else:
                vc=s.astype("string").fillna("(Missing)").value_counts().head(10)
                distributions[str(name)]={"kind":"bar","labels":[str(x) for x in vc.index.tolist()],"values":[int(x) for x in vc.values.tolist()]}
                base["top_values"]=[{"value":str(k),"count":int(v)} for k,v in vc.items()]
            column_profiles.append(base)
        complete=max(0,100*(1-missing_total/total)); uniqueness=max(0,100*(1-duplicate_rows/max(rows,1)))
        type_consistency=100.0
        # Validity checks are reported as a heuristic: empty column names/types and non-finite numeric values.
        valid=100.0
        for p in column_profiles:
            if p["kind"] == "numeric" and p.get("outliers",0):
                pass  # outliers are diagnostic signals, not automatically invalid records
        consistency=None  # Requires domain rules or cross-source checks; not inferred from column names.
        valid=None  # Requires explicit field constraints or reference data.
        score=round(.65*complete+.35*uniqueness,1)
        recommendations=[]
        if missing_total: recommendations.append({"severity":"warning","title":"Investigate missing values","detail":f"{missing_total:,} cells ({100*missing_total/total:.1f}%) are empty. Review missingness by column before choosing an imputation strategy."})
        if duplicate_rows: recommendations.append({"severity":"warning","title":"Review duplicate records","detail":f"{duplicate_rows:,} exact duplicate rows were found."})
        outlier_total=sum(int(p.get("outliers",0)) for p in column_profiles)
        if outlier_total: recommendations.append({"severity":"info","title":"Inspect potential outliers","detail":f"{outlier_total:,} numeric observations fall outside the 1.5×IQR fences. These are flags, not automatic errors."})
        if not recommendations: recommendations.append({"severity":"success","title":"No major structural issues detected","detail":"The initial automated checks did not flag missing cells or exact duplicate rows. Validate business rules separately."})
        return {"id":dataset.id if dataset else None,"name":dataset.name if dataset else "Dataset","rows":rows,"columns":cols,"missing_count":missing_total,"missing_pct":round(100*missing_total/total,2),"duplicate_count":duplicate_rows,"memory_mb":round(float(df.memory_usage(deep=True).sum())/1024/1024,2),"quality_score":score,"dimensions":{"completeness":round(complete,1),"uniqueness":round(uniqueness,1),"consistency":consistency,"validity":valid,"timeliness":None,"accuracy":None},"column_profiles":column_profiles,"distributions":distributions,"recommendations":recommendations,"correlation":DatasetService.correlation(df)}

    @staticmethod
    def correlation(df: pd.DataFrame) -> dict[str, Any]:
        num=df.select_dtypes(include="number").iloc[:,:12]
        if num.shape[1] < 2: return {"columns":[],"matrix":[]}
        corr=num.corr(numeric_only=True).replace([np.inf,-np.inf],np.nan).fillna(0)
        return {"columns":[str(c) for c in corr.columns],"matrix":corr.round(3).values.tolist()}

    @staticmethod
    def preview(df: pd.DataFrame, limit: int=10) -> dict[str, Any]:
        def rows(part): return [{str(k):json_safe(v) for k,v in r.items()} for r in part.to_dict(orient="records")]
        return {"columns":[str(c) for c in df.columns],"top":rows(df.head(limit)),"bottom":rows(df.tail(limit)),"sample":rows(df.head(min(limit,50)))}

    @staticmethod
    def clean(df: pd.DataFrame, operation: str, column: str | None=None, strategy: str="median", value: Any=None, columns: list[str] | None=None) -> tuple[pd.DataFrame,int,str]:
        out=df.copy(deep=True); affected=0
        selected=columns or ([column] if column else list(out.columns))
        if any(c not in out.columns for c in selected): raise HTTPException(422,"One or more selected columns do not exist.")
        if operation == "trim":
            for c in selected:
                if pd.api.types.is_object_dtype(out[c]) or pd.api.types.is_string_dtype(out[c]):
                    new=out[c].map(lambda x: x.strip() if isinstance(x,str) else x); affected += int((new != out[c]).sum()); out[c]=new
        elif operation == "drop_duplicates":
            before=len(out); out=out.drop_duplicates(subset=selected); affected=before-len(out)
        elif operation == "drop_missing":
            before=len(out); out=out.dropna(subset=selected); affected=before-len(out)
        elif operation == "fill_missing":
            for c in selected:
                missing=int(out[c].isna().sum()); affected += missing
                if not missing: continue
                s=out[c]
                if strategy in ("mean","median") and pd.api.types.is_numeric_dtype(s): fill=s.mean() if strategy=="mean" else s.median()
                elif strategy=="mode": fill=s.mode(dropna=True).iloc[0] if not s.mode(dropna=True).empty else (value if value is not None else "Unknown")
                elif strategy=="constant": fill=value if value is not None else "Unknown"
                else: raise HTTPException(422,"Choose mean/median for numeric columns, or mode/constant for other columns.")
                out[c]=s.fillna(fill)
        elif operation == "standardize_text":
            for c in selected:
                if pd.api.types.is_object_dtype(out[c]) or pd.api.types.is_string_dtype(out[c]):
                    new=out[c].map(lambda x: " ".join(x.split()).casefold() if isinstance(x,str) else x); affected += int((new != out[c]).sum()); out[c]=new
        elif operation == "convert_numeric":
            if not column: raise HTTPException(422,"Choose a column to convert.")
            converted=pd.to_numeric(out[column],errors="coerce"); affected=int((out[column].notna() & converted.isna()).sum()); out[column]=converted
        elif operation == "convert_datetime":
            if not column: raise HTTPException(422,"Choose a column to convert.")
            converted=pd.to_datetime(out[column],errors="coerce",utc=True); affected=int((out[column].notna() & converted.isna()).sum()); out[column]=converted
        elif operation == "remove_outliers_iqr":
            if not column: raise HTTPException(422,"Choose a numeric column.")
            if not pd.api.types.is_numeric_dtype(out[column]): raise HTTPException(422,"IQR outlier removal requires a numeric column.")
            q1=out[column].quantile(.25); q3=out[column].quantile(.75); iqr=q3-q1
            keep=out[column].between(q1-1.5*iqr,q3+1.5*iqr) | out[column].isna(); before=len(out); out=out[keep]; affected=before-len(out)
        else: raise HTTPException(422,"Unsupported operation.")
        if out.empty: raise HTTPException(422,"This operation would leave no rows; no changes were saved.")
        return out,affected,operation


def _normalize_kind(kind: str) -> str:
    kind = (kind or "numeric").lower()
    return kind if kind in ("numeric", "datetime", "text") else "numeric"


class CleaningEngine:
    """Configurable, deterministic cleaning operations.

    Every operation accepts validation settings so the analyst keeps control of
    the thresholds instead of relying on hard-coded defaults. Each call returns a
    fresh frame plus an operation report for the UI.
    """

    OPERATIONS: dict[str, dict[str, Any]] = {
        "trim": {"label": "Trim whitespace", "category": "Text", "columns_mode": "multi", "params": []},
        "standardize_text": {"label": "Case & spacing normalization", "category": "Text", "columns_mode": "multi",
                             "params": [{"id": "case", "label": "Case handling", "type": "select", "default": "lower", "options": ["lower", "upper", "title", "preserve"]},
                                        {"id": "squash_spaces", "label": "Collapse repeated spaces", "type": "toggle", "default": True},
                                        {"id": "remove_punctuation", "label": "Remove punctuation", "type": "toggle", "default": False}]},
        "drop_duplicates": {"label": "Remove duplicate rows", "category": "Duplicates", "columns_mode": "subset",
                            "params": [{"id": "keep", "label": "Keep which record", "type": "select", "default": "first", "options": ["first", "last"]}]},
        "drop_missing": {"label": "Drop rows with missing values", "category": "Missing", "columns_mode": "multi",
                         "params": [{"id": "threshold", "label": "Max allowed missing per row (%)", "type": "number", "default": 0, "min": 0, "max": 100}]},
        "fill_missing": {"label": "Impute missing values", "category": "Missing", "columns_mode": "multi",
                         "params": [{"id": "strategy", "label": "Strategy", "type": "select", "default": "median", "options": ["mean", "median", "mode", "constant", "ffill", "bfill", "zero"]},
                                    {"id": "constant", "label": "Constant value", "type": "text", "default": "Unknown"},
                                    {"id": "group_by", "label": "Group-aware imputation column (optional)", "type": "column", "default": ""}]},
        "convert_numeric": {"label": "Convert to numeric", "category": "Types", "columns_mode": "multi",
                            "params": [{"id": "thousands", "label": "Strip thousands separators", "type": "toggle", "default": True},
                                       {"id": "strip_currency", "label": "Strip currency symbols", "type": "toggle", "default": False}]},
        "convert_datetime": {"label": "Parse dates", "category": "Date/Time", "columns_mode": "multi",
                             "params": [{"id": "errors", "label": "Unparseable values", "type": "select", "default": "coerce", "options": ["coerce", "ignore"]}]},
        "remove_outliers_iqr": {"label": "Treat numeric outliers", "category": "Outliers", "columns_mode": "multi",
                                "params": [{"id": "method", "label": "Detection method", "type": "select", "default": "iqr", "options": ["iqr", "zscore", "quantile"]},
                                           {"id": "threshold", "label": "Fence / z-score threshold", "type": "number", "default": 1.5, "min": 0.1, "max": 10, "step": 0.1},
                                           {"id": "action", "label": "Action", "type": "select", "default": "remove", "options": ["remove", "clip", "null"]}]},
        "clip_values": {"label": "Clip / cap values", "category": "Outliers", "columns_mode": "multi",
                        "params": [{"id": "lower", "label": "Lower bound", "type": "number", "default": None},
                                   {"id": "upper", "label": "Upper bound", "type": "number", "default": None},
                                   {"id": "use_quantiles", "label": "Derive bounds from quantiles", "type": "toggle", "default": False},
                                   {"id": "lower_q", "label": "Lower quantile", "type": "number", "default": 0.01, "min": 0, "max": 1, "step": 0.01},
                                   {"id": "upper_q", "label": "Upper quantile", "type": "number", "default": 0.99, "min": 0, "max": 1, "step": 0.01}]},
        "replace_values": {"label": "Find & replace", "category": "Transform", "columns_mode": "multi",
                           "params": [{"id": "find", "label": "Find", "type": "text", "default": ""},
                                      {"id": "replace", "label": "Replace with", "type": "text", "default": ""},
                                      {"id": "regex", "label": "Treat find as regular expression", "type": "toggle", "default": False},
                                      {"id": "case_sensitive", "label": "Case sensitive", "type": "toggle", "default": True}]},
        "extract_regex": {"label": "Extract pattern", "category": "Transform", "columns_mode": "single",
                          "params": [{"id": "pattern", "label": "Regular expression", "type": "text", "default": "[A-Za-z]+"},
                                     {"id": "new_column", "label": "New column name (optional)", "type": "text", "default": ""}]},
        "filter_rows": {"label": "Filter rows", "category": "Filter", "columns_mode": "single",
                        "params": [{"id": "operator", "label": "Condition", "type": "select", "default": "contains", "options": ["contains", "not_contains", "equals", "not_equals", "greater_than", "less_than", "between", "is_in"]},
                                   {"id": "value", "label": "Value (use comma list for is_in / between)", "type": "text", "default": ""},
                                   {"id": "drop", "label": "Drop matching rows instead of keeping", "type": "toggle", "default": False}]},
        "drop_columns": {"label": "Drop columns", "category": "Structure", "columns_mode": "multi_required", "params": []},
        "rename_column": {"label": "Rename column", "category": "Structure", "columns_mode": "single",
                          "params": [{"id": "new_name", "label": "New name", "type": "text", "default": ""}]},
        "split_column": {"label": "Split column", "category": "Transform", "columns_mode": "single",
                         "params": [{"id": "delimiter", "label": "Delimiter", "type": "text", "default": " "},
                                    {"id": "parts", "label": "Number of parts", "type": "number", "default": 2, "min": 1, "max": 8},
                                    {"id": "prefix", "label": "New column prefix", "type": "text", "default": ""}]},
        "merge_columns": {"label": "Merge columns", "category": "Transform", "columns_mode": "multi_required",
                          "params": [{"id": "separator", "label": "Separator", "type": "text", "default": " "},
                                     {"id": "new_column", "label": "New column name", "type": "text", "default": "merged"},
                                     {"id": "drop_sources", "label": "Drop source columns", "type": "toggle", "default": False}]},
        "category_standardize": {"label": "Standardize categories", "category": "Categorical", "columns_mode": "multi",
                                 "params": [{"id": "threshold", "label": "Similarity threshold (0–1)", "type": "number", "default": 0.9, "min": 0.5, "max": 1, "step": 0.01},
                                            {"id": "max_values", "label": "Only process columns with ≤ values", "type": "number", "default": 60, "min": 2, "max": 500}]},
        "clip_text_length": {"label": "Trim long text", "category": "Text", "columns_mode": "multi",
                              "params": [{"id": "max_length", "label": "Max characters", "type": "number", "default": 120, "min": 4}]},
        "scale_numeric": {"label": "Scale numeric column", "category": "Transform", "columns_mode": "multi",
                          "params": [{"id": "method", "label": "Method", "type": "select", "default": "standard", "options": ["standard", "minmax", "log1p"]}]},
        "add_row_id": {"label": "Add row id", "category": "Structure", "columns_mode": "none",
                       "params": [{"id": "new_column", "label": "Column name", "type": "text", "default": "row_id"}]},
        "remove_empty_columns": {"label": "Remove empty columns", "category": "Structure", "columns_mode": "none", "params": []},
        "drop_constant_columns": {"label": "Remove constant columns", "category": "Structure", "columns_mode": "none", "params": []},
        "schema_validate": {"label": "Validate schema", "category": "Validation", "columns_mode": "none",
                            "params": [{"id": "max_missing_pct", "label": "Max missing % per column", "type": "number", "default": 50, "min": 0, "max": 100},
                                       {"id": "max_duplicate_pct", "label": "Max duplicate %", "type": "number", "default": 5, "min": 0, "max": 100}]},
    }

    DEFAULTS = {
        "trim": {}, "drop_duplicates": {"keep": "first"},
        "drop_missing": {"threshold": 0}, "fill_missing": {"strategy": "median", "constant": "Unknown"},
        "convert_numeric": {"thousands": True, "strip_currency": False}, "convert_datetime": {"errors": "coerce"},
        "remove_outliers_iqr": {"method": "iqr", "threshold": 1.5, "action": "remove"},
        "category_standardize": {"threshold": 0.9, "max_values": 60},
        "schema_validate": {"max_missing_pct": 50, "max_duplicate_pct": 5},
        "standardize_text": {"case": "lower", "squash_spaces": True, "remove_punctuation": False},
    }

    @staticmethod
    def columns_mode(operation: str) -> str:
        return CleaningEngine.OPERATIONS.get(operation, {}).get("columns_mode", "multi")

    @staticmethod
    def catalog() -> list[dict[str, Any]]:
        return [{"id": key, **value} for key, value in CleaningEngine.OPERATIONS.items()]

    @staticmethod
    def apply(df: pd.DataFrame, operation: str, column: str | None = None, columns: list[str] | None = None,
              options: dict[str, Any] | None = None) -> tuple[pd.DataFrame, int, dict[str, Any]]:
        if operation not in CleaningEngine.OPERATIONS:
            raise HTTPException(422, f"Unknown cleaning operation '{operation}'.")
        spec = CleaningEngine.OPERATIONS[operation]
        opts = {**CleaningEngine.DEFAULTS.get(operation, {}), **(options or {})}
        out = df.copy(deep=True)
        selected = [c for c in (columns or ([column] if column else [])) if c is not None]
        missing = [c for c in selected if c not in out.columns]
        if missing:
            raise HTTPException(422, f"Unknown column(s): {', '.join(missing)}")
        mode = spec["columns_mode"]
        if mode == "multi_required" and not selected:
            raise HTTPException(422, "Select at least one column for this operation.")
        if mode in ("single", "subset") and not column:
            raise HTTPException(422, "Choose a column for this operation.")
        if mode in ("multi", "subset") and not selected and column:
            selected = [column]
        if mode == "multi" and not selected:
            selected = [str(c) for c in out.columns]
        for name in selected:
            if name not in out.columns:
                raise HTTPException(422, f"Column '{name}' does not exist.")

        def num(key: str, default: float) -> float:
            try:
                value = opts.get(key)
                return float(value) if value not in (None, "") else default
            except (TypeError, ValueError):
                return default

        detail: dict[str, Any] = {}
        affected = 0
        if operation == "trim":
            for c in selected:
                new = out[c].map(lambda x: x.strip() if isinstance(x, str) else x)
                affected += int((new != out[c]).sum()); out[c] = new
        elif operation == "standardize_text":
            case = str(opts.get("case", "lower")); squash = bool(opts.get("squash_spaces", True)); punct = bool(opts.get("remove_punctuation", False))
            for c in selected:
                if not (pd.api.types.is_object_dtype(out[c]) or pd.api.types.is_string_dtype(out[c])):
                    continue
                def norm(value):
                    if not isinstance(value, str):
                        return value
                    text = " ".join(value.split()) if squash else value
                    if punct:
                        text = "".join(ch for ch in text if ch.isalnum() or ch.isspace() or ch in "-_'")
                    if case == "lower": text = text.lower()
                    elif case == "upper": text = text.upper()
                    elif case == "title": text = text.title()
                    return text
                new = out[c].map(norm); affected += int((new != out[c]).sum()); out[c] = new
        elif operation == "drop_duplicates":
            before = len(out); keep = str(opts.get("keep", "first"))
            out = out.drop_duplicates(subset=selected or None, keep=keep if keep in ("first", "last") else "first")
            affected = before - len(out)
        elif operation == "drop_missing":
            threshold = num("threshold", 0)
            cols = selected or list(out.columns)
            allowed = int(len(cols) * threshold / 100)
            before = len(out)
            out = out[out[cols].isna().sum(axis=1) <= allowed]
            affected = before - len(out)
        elif operation == "fill_missing":
            strategy = str(opts.get("strategy", "median")); constant = opts.get("constant", "Unknown")
            group_by = opts.get("group_by") or None
            for c in selected:
                miss_mask = out[c].isna()
                miss = int(miss_mask.sum())
                if not miss:
                    continue
                s = out[c]
                if strategy in ("mean", "median") and pd.api.types.is_numeric_dtype(s):
                    if group_by and group_by in out.columns:
                        fill = s.groupby(out[group_by]).transform(strategy)
                    else:
                        fill = s.mean() if strategy == "mean" else s.median()
                elif strategy == "mode":
                    mode_series = s.mode(dropna=True)
                    fill = mode_series.iloc[0] if not mode_series.empty else constant
                elif strategy == "constant":
                    fill = constant
                elif strategy == "zero":
                    fill = 0
                elif strategy == "ffill":
                    fill = s.ffill()
                elif strategy == "bfill":
                    fill = s.bfill()
                else:
                    raise HTTPException(422, "mean/median need numeric columns; use mode, constant, ffill, bfill or zero otherwise.")
                out[c] = s.fillna(fill); affected += miss
        elif operation == "convert_numeric":
            for c in selected:
                s = out[c]
                if opts.get("thousands", True) and (pd.api.types.is_object_dtype(s) or pd.api.types.is_string_dtype(s)):
                    s = s.astype("string").str.replace(",", "", regex=False)
                if opts.get("strip_currency"):
                    s = s.astype("string").str.replace(r"[^\d.\-+eE]", "", regex=True)
                converted = pd.to_numeric(s, errors="coerce")
                affected += int((pd.Series(out[c]).notna() & converted.isna()).sum())
                out[c] = converted
        elif operation == "convert_datetime":
            for c in out[selected].columns:
                converted = pd.to_datetime(out[c], errors=str(opts.get("errors", "coerce")), utc=True)
                affected += int((out[c].notna() & converted.isna()).sum()); out[c] = converted
        elif operation == "remove_outliers_iqr":
            method = str(opts.get("method", "iqr")); threshold = num("threshold", 1.5); action = str(opts.get("action", "remove"))
            target = selected or [c for c in out.select_dtypes(include="number").columns]
            mask = pd.Series(False, index=out.index)
            for c in target:
                if not pd.api.types.is_numeric_dtype(out[c]):
                    continue
                s = out[c].astype(float)
                if method == "zscore":
                    sd = s.std(); sd = sd if sd and np.isfinite(sd) else 1.0
                    col_mask = ((s - s.mean()).abs() > threshold * sd) & s.notna()
                elif method == "quantile":
                    col_mask = ((s < s.quantile(.25 - 0.1 * threshold)) | (s > s.quantile(.75 + 0.1 * threshold))) & s.notna()
                else:
                    q1, q3 = s.quantile(.25), s.quantile(.75); iqr = q3 - q1
                    col_mask = ((s < q1 - threshold * iqr) | (s > q3 + threshold * iqr)) & s.notna() if iqr else mask
                if action == "clip" and method == "iqr":
                    out[c] = s.clip(q1 - threshold * iqr, q3 + threshold * iqr)
                elif action == "null":
                    out.loc[col_mask, c] = np.nan
                mask |= col_mask.fillna(False)
            if action == "remove":
                before = len(out); out = out[~mask]; affected = before - len(out)
            else:
                affected = int(mask.sum())
            detail = {"action": action, "method": method, "threshold": threshold}
        elif operation == "clip_values":
            for c in selected:
                if not pd.api.types.is_numeric_dtype(out[c]):
                    continue
                s = out[c].astype(float)
                if opts.get("use_quantiles"):
                    lower = s.quantile(num("lower_q", .01)); upper = s.quantile(num("upper_q", .99))
                else:
                    lower = opts.get("lower") if opts.get("lower") not in (None, "") else None
                    upper = opts.get("upper") if opts.get("upper") not in (None, "") else None
                new = s.clip(lower=float(lower) if lower is not None else None, upper=float(upper) if upper is not None else None)
                affected += int((new != s).sum()); out[c] = new
        elif operation == "replace_values":
            find = str(opts.get("find", "")); repl = opts.get("replace", ""); regex = bool(opts.get("regex", False)); sensitive = bool(opts.get("case_sensitive", True))
            if not find:
                raise HTTPException(422, "Enter a value to find.")
            for c in selected:
                if regex:
                    new = out[c].astype("string").str.replace(find, "" if repl is None else str(repl), regex=True)
                    new = new.where(out[c].notna(), out[c])
                else:
                    s = out[c].astype("string")
                    if sensitive:
                        new = s.where(s != find, None if repl is None else str(repl))
                    else:
                        new = s.where(s.str.casefold() != find.casefold(), None if repl is None else str(repl))
                    new = new.where(out[c].notna(), out[c])
                affected += int((new.astype(object).fillna("__na__") != out[c].astype(object).fillna("__na__")).sum())
                out[c] = new
        elif operation == "extract_regex":
            pattern = str(opts.get("pattern", "")) or "(.+)"
            name = str(opts.get("new_column") or f"{column}_extracted")
            if name in out.columns:
                raise HTTPException(422, f"Column '{name}' already exists.")
            extracted = out[column].astype("string").str.extract(pattern, expand=False)
            out[name] = extracted
            affected = int(extracted.notna().sum()); detail = {"new_column": name, "pattern": pattern}
        elif operation == "filter_rows":
            op = str(opts.get("operator", "contains")); raw = str(opts.get("value", ""))
            s = out[column]
            if op in ("greater_than", "less_than", "between"):
                numeric = pd.to_numeric(s, errors="coerce")
                try:
                    if op == "between":
                        parts = [float(x) for x in raw.split(",")[:2]]
                        if len(parts) != 2: raise ValueError
                        mask = numeric.between(parts[0], parts[1])
                    elif op == "greater_than": mask = numeric > float(raw)
                    else: mask = numeric < float(raw)
                except ValueError as exc:
                    raise HTTPException(422, "Enter numeric values (two comma-separated bounds for between).") from exc
            elif op == "is_in":
                values = [x.strip() for x in raw.split(",") if x.strip()]
                mask = s.astype("string").isin(values)
            else:
                text = s.astype("string")
                if op == "contains": mask = text.str.contains(raw, case=False, na=False, regex=False)
                elif op == "not_contains": mask = ~text.str.contains(raw, case=False, na=False, regex=False)
                elif op == "equals": mask = text.str.casefold() == raw.casefold()
                else: mask = text.str.casefold() != raw.casefold()
            mask = mask.fillna(False)
            if opts.get("drop"):
                mask = ~mask
            before = len(out); out = out[mask]; affected = before - len(out)
        elif operation == "drop_columns":
            out = out.drop(columns=selected[:max(0, len(out.columns) - 1)]); affected = len(selected)
        elif operation == "rename_column":
            new_name = str(opts.get("new_name") or "").strip()
            if not new_name:
                raise HTTPException(422, "Enter the new column name.")
            if new_name in out.columns and new_name != column:
                raise HTTPException(422, f"Column '{new_name}' already exists.")
            out = out.rename(columns={column: new_name[:160]}); affected = 1
        elif operation == "split_column":
            delimiter = str(opts.get("delimiter", " ")) or " "
            parts = max(1, min(8, int(num("parts", 2))))
            prefix = str(opts.get("prefix") or column)
            split = out[column].astype("string").str.split(delimiter, n=parts - 1, expand=True)
            for i in range(min(parts, split.shape[1] if split.ndim > 1 else 1)):
                name = f"{prefix}_{i + 1}"
                if name not in out.columns:
                    out[name] = split[i] if split.ndim > 1 else split
                    affected += int(out[name].notna().sum())
            detail = {"new_columns": [f"{prefix}_{i + 1}" for i in range(parts)]}
        elif operation == "merge_columns":
            separator = str(opts.get("separator", " ")); name = str(opts.get("new_column") or "merged")
            if not selected:
                raise HTTPException(422, "Select columns to merge.")
            out[name] = out[selected].astype("string").agg(lambda row: separator.join([v for v in row if pd.notna(v)]), axis=1)
            affected = int(out[name].notna().sum())
            if opts.get("drop_sources"):
                out = out.drop(columns=[c for c in selected if c != name])
            detail = {"new_column": name}
        elif operation == "category_standardize":
            import difflib
            threshold = num("threshold", 0.9); max_values = int(num("max_values", 60))
            for c in selected:
                s = out[c].astype("string")
                values = [str(v) for v in s.dropna().unique()]
                if len(values) > max_values or len(values) < 2:
                    continue
                canonical: dict[str, str] = {}
                clusters: list[str] = []
                for value in sorted(values):
                    match = difflib.get_close_matches(value, clusters, n=1, cutoff=threshold)
                    if match:
                        canonical[value] = match[0]
                    else:
                        clusters.append(value); canonical[value] = value
                new = s.map(lambda x: canonical.get(str(x), x) if pd.notna(x) else x)
                affected += int((new.astype(object) != s.astype(object)).sum())
                out[c] = new
                detail.setdefault("clusters", {})[c] = {k: v for k, v in canonical.items() if k != v}
        elif operation == "clip_text_length":
            limit = max(4, int(num("max_length", 120)))
            for c in selected:
                new = out[c].map(lambda x: x[:limit] if isinstance(x, str) and len(x) > limit else x)
                affected += int((new != out[c]).sum()); out[c] = new
        elif operation == "scale_numeric":
            method = str(opts.get("method", "standard"))
            for c in selected:
                if not pd.api.types.is_numeric_dtype(out[c]):
                    raise HTTPException(422, "Scaling requires numeric columns.")
                s = out[c].astype(float)
                if method == "minmax":
                    span = s.max() - s.min()
                    out[c] = (s - s.min()) / span if span else 0.0
                elif method == "log1p":
                    if (s.dropna() < 0).any():
                        raise HTTPException(422, "log1p scaling requires non-negative values.")
                    out[c] = np.log1p(s)
                else:
                    sd = s.std(); sd = sd if sd and np.isfinite(sd) and sd > 0 else 1.0
                    out[c] = (s - s.mean()) / sd
                affected += int(out[c].notna().sum())
        elif operation == "add_row_id":
            name = str(opts.get("new_column") or "row_id")
            if name in out.columns:
                raise HTTPException(422, f"Column '{name}' already exists.")
            out.insert(0, name, np.arange(1, len(out) + 1)); affected = len(out)
        elif operation == "remove_empty_columns":
            empties = [c for c in out.columns if out[c].isna().all() or (out[c].astype("string").str.strip() == "").all()]
            if len(empties) >= len(out.columns):
                raise HTTPException(422, "All columns are empty; nothing would remain.")
            out = out.drop(columns=empties); affected = len(empties); detail = {"dropped": empties}
        elif operation == "drop_constant_columns":
            constant = [c for c in out.columns if out[c].nunique(dropna=False) <= 1]
            if len(constant) >= len(out.columns):
                raise HTTPException(422, "All columns are constant; nothing would remain.")
            out = out.drop(columns=constant); affected = len(constant); detail = {"dropped": constant}
        elif operation == "schema_validate":
            max_missing = num("max_missing_pct", 50); max_dup = num("max_duplicate_pct", 5)
            issues = []
            for c in out.columns:
                pct = 100 * out[c].isna().mean()
                if pct > max_missing:
                    issues.append(f"'{c}' is {pct:.1f}% missing (limit {max_missing:g}%).")
            dup_pct = 100 * out.duplicated().mean()
            if dup_pct > max_dup:
                issues.append(f"{dup_pct:.1f}% duplicate rows (limit {max_dup:g}%).")
            detail = {"issues": issues, "passed": not issues}
            affected = len(issues)
        else:
            raise HTTPException(422, "Unsupported operation.")
        if out.empty:
            raise HTTPException(422, "This operation would leave no rows; no changes were saved.")
        return out, int(affected), detail

    @staticmethod
    def preview(df: pd.DataFrame, operation: str, column: str | None = None, columns: list[str] | None = None,
                options: dict[str, Any] | None = None, limit: int = 8) -> dict[str, Any]:
        """Dry-run an operation and describe what would change without persisting."""
        out, affected, detail = CleaningEngine.apply(df, operation, column, columns, options)
        def head(frame):
            return [{str(k): json_safe(v) for k, v in row.items()} for row in frame.head(limit).to_dict(orient="records")]
        info = {
            "operation": operation, "affected": affected,
            "rows_before": int(len(df)), "rows_after": int(len(out)),
            "columns_before": int(df.shape[1]), "columns_after": int(out.shape[1]),
            "added_columns": [c for c in out.columns if c not in df.columns],
            "removed_columns": [c for c in df.columns if c not in out.columns],
            "missing_before": int(df.isna().sum().sum()), "missing_after": int(out.isna().sum().sum()),
            "detail": detail,
            "before": head(df), "after": head(out), "sample_columns": [str(c) for c in out.columns[:12]],
        }
        return {"ok": True, "preview": info}

    @staticmethod
    def recipe(df: pd.DataFrame, steps: list[dict[str, Any]]) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
        """Apply a saved sequence of operations (a reproducible cleaning recipe)."""
        current = df
        log: list[dict[str, Any]] = []
        for index, step in enumerate(steps):
            operation = str(step.get("operation", ""))
            if operation not in CleaningEngine.OPERATIONS:
                raise HTTPException(422, f"Step {index + 1}: unknown operation '{operation}'.")
            current, affected, detail = CleaningEngine.apply(current, operation, step.get("column"),
                                                             step.get("columns"), step.get("options") or {})
            log.append({"step": index + 1, "operation": operation, "affected": affected, "detail": detail})
        if not log:
            raise HTTPException(422, "Add at least one step to the recipe.")
        return current, log
