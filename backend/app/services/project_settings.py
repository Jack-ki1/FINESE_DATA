"""Per-workspace project settings.

Settings are stored as JSON on the workspace so every section of the Studio can
read the analyst's tuning choices (KPI layout, chart palettes, defaults, AI model
and provider, section visibility, thresholds...) without redeploying.
"""
import copy
from typing import Any
from backend.app.models import Workspace
from backend.app.services.ai_catalog import DEFAULT_PROJECT_SETTINGS

SECTION_KEYS = ("upload", "overview", "cleaning", "chat", "models", "export", "settings")


def _merge(base: dict[str, Any], incoming: dict[str, Any], strict: bool = True, sanitize: bool = True) -> dict[str, Any]:
    out = copy.deepcopy(base)
    for key, value in (incoming or {}).items():
        if strict and key not in out:
            continue
        if isinstance(out.get(key), dict) and isinstance(value, dict):
            out[key] = _merge(out[key], value, strict=False, sanitize=False)
        elif isinstance(out.get(key), bool):
            out[key] = bool(value)
        elif isinstance(out[key], list):
            if isinstance(value, list):
                out[key] = value
            elif isinstance(value, str) and value.strip():
                out[key] = [v.strip() for v in value.split(",") if v.strip()]
        elif isinstance(out[key], int) and not isinstance(out[key], bool):
            try:
                out[key] = int(value)
            except (TypeError, ValueError):
                pass
        elif isinstance(out[key], float):
            try:
                out[key] = float(value)
            except (TypeError, ValueError):
                pass
        elif isinstance(out[key], str):
            out[key] = str(value)
    if not sanitize:
        return out
    # Guardrails so user tuning can never break the pipeline.
    out["overview"]["preview_rows"] = max(1, min(100, int(out["overview"].get("preview_rows", 10))))
    out["overview"]["preview_columns"] = max(2, min(60, int(out["overview"].get("preview_columns", 12))))
    out["overview"]["histogram_bins"] = max(4, min(60, int(out["overview"].get("histogram_bins", 16))))
    out["overview"]["outlier_threshold"] = max(0.5, min(6.0, float(out["overview"].get("outlier_threshold", 1.5))))
    out["plots"]["bins"] = max(3, min(60, int(out["plots"].get("bins", 20))))
    out["plots"]["default_limit"] = max(3, min(100, int(out["plots"].get("default_limit", 20))))
    out["plots"]["dashboard_columns"] = max(1, min(4, int(out["plots"].get("dashboard_columns", 2))))
    out["models"]["cv_folds"] = max(2, min(10, int(out["models"].get("cv_folds", 5))))
    out["models"]["test_size"] = max(0.05, min(0.5, float(out["models"].get("test_size", 0.2))))
    out["cleaning"]["outlier_threshold"] = max(0.5, min(6.0, float(out["cleaning"].get("outlier_threshold", 1.5))))
    out["cleaning"]["category_threshold"] = max(0.5, min(1.0, float(out["cleaning"].get("category_threshold", 0.9))))
    out["ai"]["temperature"] = max(0.0, min(1.5, float(out["ai"].get("temperature", 0.2))))
    out["ai"]["max_tokens"] = max(64, min(8000, int(out["ai"].get("max_tokens", 900))))
    sections = out.get("sections") or {}
    out["sections"] = {**{k: bool(sections.get(k, True)) for k in SECTION_KEYS}}
    return out


class SettingsService:
    @staticmethod
    def get(workspace: Workspace) -> dict[str, Any]:
        import json
        try:
            stored = json.loads(getattr(workspace, "settings_json", None) or "{}")
        except ValueError:
            stored = {}
        return _merge(DEFAULT_PROJECT_SETTINGS, stored)

    @staticmethod
    def update(workspace: Workspace, patch: dict[str, Any]) -> dict[str, Any]:
        import json
        current = SettingsService.get(workspace)
        merged = _merge(current, patch or {})
        workspace.settings_json = json.dumps(merged)
        return merged

    @staticmethod
    def reset(workspace: Workspace) -> dict[str, Any]:
        import json
        workspace.settings_json = json.dumps({})
        return copy.deepcopy(DEFAULT_PROJECT_SETTINGS)
