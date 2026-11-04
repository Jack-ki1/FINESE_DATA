"""Extra model-studio capabilities: diagnostics, sweeps, leaderboards and summaries.

These functions work on the training result dictionary produced by MLService so
the Model Studio can visualise behaviour (not just headline metrics) and compare
many runs side by side.
"""
from typing import Any
import numpy as np
import pandas as pd
from sklearn.metrics import roc_curve, auc, precision_recall_curve, average_precision_score
from sklearn.model_selection import learning_curve


def _f(value: Any, digits: int = 4):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return round(number, digits) if np.isfinite(number) else None


def calibrate(probs: list[float], hits: list[int], bins: int = 10) -> list[dict[str, Any]]:
    frame = pd.DataFrame({"p": probs, "hit": hits}).dropna()
    if frame.empty:
        return []
    frame["bin"] = pd.cut(frame["p"], bins=np.linspace(0, 1, bins + 1), include_lowest=True)
    out = []
    for key, group in frame.groupby("bin", observed=True):
        if len(group) == 0:
            continue
        out.append({"bin": f"{key.left:.2f}–{key.right:.2f}", "predicted": _f(group["p"].mean()), "observed": _f(group["hit"].mean()), "count": int(len(group))})
    return out


def probability_bins(probs: list[float], bins: int = 20) -> dict[str, Any]:
    values = np.asarray([p for p in probs if p is not None], dtype=float)
    if values.size == 0:
        return {"labels": [], "values": []}
    hist, edges = np.histogram(values, bins=bins, range=(0, 1))
    return {"labels": [f"{edges[i]:.2f}" for i in range(len(hist))], "values": hist.astype(int).tolist()}


def endpoints(curve: tuple, max_points: int = 60) -> list[list[float]]:
    x, y = curve[0], curve[1]
    if len(x) > max_points:
        idx = np.linspace(0, len(x) - 1, max_points).astype(int)
        x, y = x[idx], y[idx]
    return [[_f(float(a), 5), _f(float(b), 5)] for a, b in zip(np.asarray(x).tolist(), np.asarray(y).tolist())]


def diagnostics(result: dict[str, Any]) -> dict[str, Any]:
    """Turn stored run details into chart-ready series."""
    metrics = result.get("metrics") or {}
    detail = result.get("details") or result.get("diagnostics") or {}
    task = str(result.get("task_type") or result.get("task") or "")
    out: dict[str, Any] = {"task": task}

    importance = result.get("feature_importances") or detail.get("feature_importances") or []
    if not importance and detail.get("coefficients"):
        importance = detail["coefficients"]
    out["importance"] = [{"feature": x.get("feature"), "value": abs(float(x.get("importance") or x.get("coefficient") or 0)),
                          "signed": float(x.get("coefficient") or x.get("importance") or 0)} for x in importance][:20]

    cv = result.get("cross_validation") or detail.get("cross_validation") or {}
    score_keys = [k for k in cv if isinstance(cv.get(k), dict) and "mean" in cv[k]]
    out["cv"] = {"folds": [{"metric": k.replace("test_", ""), "mean": cv[k].get("mean"), "std": cv[k].get("std")} for k in score_keys]}

    out["roc"] = detail.get("roc") or []
    out["pr_curve"] = detail.get("pr_curve") or []
    out["confusion"] = metrics.get("confusion_matrix") or []
    out["labels"] = metrics.get("class_labels") or []
    out["calibration"] = detail.get("calibration") or []
    out["probability_histogram"] = detail.get("probability_histogram") or {"labels": [], "values": []}
    out["residuals"] = detail.get("residuals") or {}
    out["pred_vs_actual"] = detail.get("pred_vs_actual") or []
    out["learning_curve"] = detail.get("learning_curve") or None
    out["learning_curve_by_iteration"] = detail.get("learning_curve_by_iteration") or {}
    out["loss_history"] = detail.get("loss_history") or []
    out["dataset"] = detail.get("dataset") or {}
    out["estimator_params"] = detail.get("estimator_params") or {}
    out["baseline"] = detail.get("baseline") or {}
    out["training_seconds"] = detail.get("training_seconds")
    out["positive_class"] = detail.get("positive_class")
    out["per_class"] = detail.get("per_class") or []

    # Derived: metric bar list, threshold sweep, permutation-free feature share
    numeric_metrics = [(k, v) for k, v in metrics.items() if isinstance(v, (int, float)) and not isinstance(v, bool)]
    out["metric_bars"] = [{"metric": k.replace("_", " "), "value": _f(v)} for k, v in numeric_metrics]
    out["feature_share"] = _share(out["importance"])
    return out


def _share(importance: list[dict[str, Any]]) -> list[dict[str, Any]]:
    total = sum(abs(x["value"]) for x in importance) or 1
    return [{"feature": x["feature"], "pct": round(100 * abs(x["value"]) / total, 2)} for x in importance[:12]]


def elbow_curve(result: dict[str, Any]) -> dict[str, Any]:
    detail = result.get("details") or {}
    return detail.get("elbow") or {"labels": [], "values": []}


def summarize(experiments: list[dict[str, Any]]) -> dict[str, Any]:
    """Leaderboard with a composite ranking score per task type."""
    rows = []
    for exp in experiments:
        metrics = exp.get("metrics") or {}
        task = str(exp.get("task_type") or "")
        if task == "classification":
            primary = metrics.get("f1_macro") or metrics.get("accuracy")
            score = (0.6 * float(metrics.get("f1_macro") or 0) + 0.4 * float(metrics.get("accuracy") or 0)) * 100 if primary is not None else None
        elif task == "regression":
            score = max(0.0, min(100.0, 100 * float(metrics.get("r2") or 0))) if metrics.get("r2") is not None else None
        elif task == "clustering":
            score = max(0.0, min(100.0, (float(metrics.get("silhouette") or 0) + 1) / 2 * 100)) if metrics.get("silhouette") is not None else None
        elif task == "anomaly":
            score = max(0.0, 100 - 100 * float(metrics.get("anomaly_rate") or 0)) if metrics.get("anomaly_rate") is not None else None
        else:
            score = None
        rows.append({"id": exp.get("id"), "name": exp.get("name"), "task_type": task, "estimator": exp.get("estimator"),
                     "status": exp.get("status"), "created_at": exp.get("created_at"), "metrics": metrics,
                     "score": _f(score, 2) if score is not None else None})
    ranked = sorted([r for r in rows if r["score"] is not None], key=lambda r: r["score"], reverse=True)
    for index, row in enumerate(ranked):
        row["rank"] = index + 1
    by_estimator: dict[str, list[float]] = {}
    for row in ranked:
        by_estimator.setdefault(row["estimator"], []).append(row["score"])
    leaderboard = [{"estimator": k, "runs": len(v), "best": max(v), "average": _f(sum(v) / len(v), 2)} for k, v in by_estimator.items()]
    leaderboard.sort(key=lambda x: x["best"], reverse=True)
    timeline = [{"date": r["created_at"], "score": r["score"], "estimator": r["estimator"]} for r in sorted(ranked, key=lambda r: str(r["created_at"]))]
    return {"rows": ranked, "leaderboard": leaderboard, "timeline": timeline,
            "deployed": len([r for r in rows if r["status"] == "deployed"]), "total": len(rows)}


def compare(results: list[dict[str, Any]]) -> dict[str, Any]:
    keys = sorted({k for r in results for k, v in (r.get("metrics") or {}).items()
                   if isinstance(v, (int, float)) and not isinstance(v, bool)})
    rows = []
    for r in results:
        metrics = r.get("metrics") or {}
        rows.append({"name": r.get("name") or r.get("estimator"), "estimator": r.get("estimator"),
                     "task_type": r.get("task_type"), "metrics": {k: _f(metrics.get(k)) for k in keys}})
    return {"metrics": keys, "rows": rows}


def _roc(estimator, x_test, y_test) -> tuple[list, float]:
    if not hasattr(estimator, "predict_proba"):
        return [], None
    try:
        probs = estimator.predict_proba(x_test)
    except Exception:
        return [], None
    classes = list(getattr(estimator, "classes_", []))
    if probs.shape[1] == 2:
        positive = 1
        y_bin = (pd.Series(y_test).astype(str) == str(classes[1])).astype(int)
    else:
        positive = int(len(classes) - 1)
        y_bin = (pd.Series(y_test).astype(str) == str(classes[positive])).astype(int)
    if y_bin.nunique() < 2:
        return [], None
    fpr, tpr, _ = roc_curve(y_bin, probs[:, positive])
    return endpoints((fpr, tpr)), _f(auc(fpr, tpr))


def _pr(estimator, x_test, y_test) -> tuple[list, float | None]:
    if not hasattr(estimator, "predict_proba"):
        return [], None
    try:
        probs = estimator.predict_proba(x_test)
    except Exception:
        return [], None
    classes = list(getattr(estimator, "classes_", []))
    positive = 1 if probs.shape[1] == 2 else int(len(classes) - 1)
    y_bin = (pd.Series(y_test).astype(str) == str(classes[positive])).astype(int)
    if y_bin.nunique() < 2:
        return [], None
    precision, recall, _ = precision_recall_curve(y_bin, probs[:, positive])
    return endpoints((recall, precision)), _f(average_precision_score(y_bin, probs[:, positive]))


def _regression_detail(pred, actual, x_test) -> dict[str, Any]:
    pred = np.asarray(pred, dtype=float); actual = np.asarray(actual, dtype=float)
    residuals = actual - pred
    abs_res = np.abs(residuals)
    residual_points = [[_f(p, 5), _f(r, 5)] for p, r in zip(pred.tolist(), residuals.tolist())][:600]
    hist, edges = np.histogram(residuals, bins=min(24, max(6, int(np.sqrt(len(residuals))))))
    pairs = [[_f(a, 5), _f(p, 5)] for a, p in zip(actual.tolist(), pred.tolist())][:600]
    return {
        "residuals": {"points": residual_points, "labels": [f"{edges[i]:.3g}–{edges[i + 1]:.3g}" for i in range(len(hist))],
                      "values": hist.astype(int).tolist(), "mean": _f(residuals.mean()), "std": _f(residuals.std()),
                      "max_abs": _f(abs_res.max()) if abs_res.size else None},
        "pred_vs_actual": pairs,
    }


def classify_detail(pipeline, x_test, y_test, trainer=None) -> dict[str, Any]:
    detail: dict[str, Any] = {}
    roc, roc_auc = _roc(pipeline, x_test, y_test)
    pr, ap = _pr(pipeline, x_test, y_test)
    detail["roc"] = roc; detail["roc_auc"] = roc_auc
    detail["pr_curve"] = pr; detail["average_precision"] = ap
    try:
        probs = pipeline.predict_proba(x_test)
        classes = list(getattr(pipeline, "classes_", []))
        positive = 1 if probs.shape[1] == 2 else int(len(classes) - 1)
        top = probs[:, positive]
        predicted = pipeline.predict(x_test)
        pos_label = classes[positive]
        hits = (pd.Series(predicted).astype(str) == str(pos_label)).astype(int).tolist()
        detail["calibration"] = calibrate(top.tolist(), hits)
        detail["probability_histogram"] = probability_bins(top.tolist())
        detail["positive_class"] = str(pos_label)
        per_class = []
        y_array = pd.Series(y_test).astype(str)
        predicted_s = pd.Series(predicted).astype(str)
        for label in classes:
            mask = (y_array == str(label)).to_numpy()
            support = int(mask.sum())
            if not support:
                continue
            predicted_for_label = predicted_s[mask]
            precision = round(float((predicted_for_label == str(label)).mean()), 4)
            predicted_count = int((predicted_s == str(label)).sum())
            recall = round(float((predicted_for_label == str(label)).sum() / support), 4)
            avg_prob = round(float(probs[mask, classes.index(label)].mean()), 4)
            per_class.append({"class": str(label), "support": int(support), "precision": precision, "recall": recall,
                              "predicted": predicted_count, "avg_probability": avg_prob})
        detail["per_class"] = per_class
    except Exception:
        pass
    return detail


def learning(pipeline, x, y, cv_folds: int, task: str, seed: int = 42) -> dict[str, Any]:
    try:
        sizes, train_scores, test_scores = learning_curve(
            pipeline, x, y, cv=min(max(cv_folds, 2), 5), scoring="f1_macro" if task == "classification" else "r2",
            train_sizes=np.linspace(0.1, 1.0, 6), n_jobs=1, random_state=seed, shuffle=True)
        return {"labels": [int(s) for s in sizes], "train": [_f(np.mean(t)) for t in train_scores],
                "test": [_f(np.mean(t)) for t in test_scores],
                "train_std": [_f(np.std(t)) for t in train_scores], "test_std": [_f(np.std(t)) for t in test_scores],
                "scoring": "f1_macro" if task == "classification" else "r2"}
    except Exception as exc:
        return {"error": str(exc)[:200], "labels": []}
