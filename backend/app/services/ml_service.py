import hashlib
import json
from pathlib import Path
from typing import Any
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.models.schema import Artifact, Dataset, Experiment
from backend.app.schemas.ml import MLTrainRequest, MLTrainResponse
from backend.app.security import APIException

class MLService:
    @staticmethod
    def get_estimator(task_type: str, estimator_name: str, random_seed: int):
        estimator_name = estimator_name.lower().replace("-", "_")
        if task_type == "classification":
            if estimator_name in ("logistic_regression", "logistic"):
                return LogisticRegression(max_iter=500, random_state=random_seed)
            elif estimator_name in ("random_forest_classifier", "random_forest", "rf"):
                return RandomForestClassifier(n_estimators=100, max_depth=12, random_state=random_seed, n_jobs=2)
            elif estimator_name in ("gradient_boosting_classifier", "gradient_boosting", "gb"):
                return GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=random_seed)
            else:
                raise APIException(400, "INVALID_ESTIMATOR", f"Unsupported classification estimator '{estimator_name}'. Allowed: logistic_regression, random_forest_classifier, gradient_boosting_classifier.")
        elif task_type == "regression":
            if estimator_name in ("linear_regression", "linear"):
                return LinearRegression()
            elif estimator_name in ("ridge", "ridge_regression"):
                return Ridge(random_state=random_seed)
            elif estimator_name in ("random_forest_regressor", "random_forest", "rf"):
                return RandomForestRegressor(n_estimators=100, max_depth=12, random_state=random_seed, n_jobs=2)
            elif estimator_name in ("gradient_boosting_regressor", "gradient_boosting", "gb"):
                return GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=random_seed)
            else:
                raise APIException(400, "INVALID_ESTIMATOR", f"Unsupported regression estimator '{estimator_name}'. Allowed: linear_regression, ridge, random_forest_regressor, gradient_boosting_regressor.")
        else:
            raise APIException(400, "INVALID_TASK_TYPE", f"Task type '{task_type}' is invalid. Allowed: 'classification', 'regression'.")

    @staticmethod
    def train_model(db: Session, req: MLTrainRequest) -> MLTrainResponse:
        # 1. Fetch dataset
        ds = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.is_deleted == False).first()
        if not ds:
            raise APIException(404, "DATASET_NOT_FOUND", f"Dataset '{req.dataset_id}' not found.")

        file_path = Path(ds.storage_path)
        if not file_path.exists():
            raise APIException(404, "FILE_NOT_FOUND", "Dataset file missing from storage.")

        df = pd.read_csv(file_path, nrows=settings.MAX_DATA_ROWS + 1)
        if len(df) > settings.MAX_DATA_ROWS:
            raise APIException(400, "DATASET_TOO_LARGE", f"Dataset exceeds {settings.MAX_DATA_ROWS} rows cap for training.")

        if req.target_column not in df.columns:
            raise APIException(400, "TARGET_COLUMN_NOT_FOUND", f"Target column '{req.target_column}' is not in the dataset.")

        # Clean null targets
        df = df.dropna(subset=[req.target_column])
        if len(df) < 10:
            raise APIException(400, "INSUFFICIENT_DATA", "Dataset must have at least 10 non-empty rows for the target column.")

        # Feature selection
        features = req.features or [c for c in df.columns if c != req.target_column]
        features = [f for f in features if f in df.columns and f != req.target_column]
        if not features:
            raise APIException(400, "NO_VALID_FEATURES", "At least one valid feature column is required.")
        if len(features) > settings.MAX_DATA_COLUMNS:
            raise APIException(400, "TOO_MANY_FEATURES", f"Selected features exceed the {settings.MAX_DATA_COLUMNS} columns cap.")

        X = df[features]
        y = df[req.target_column]

        # 2. Leakage-free preprocessing definition
        numeric_cols = [c for c in features if pd.api.types.is_numeric_dtype(X[c])]
        categorical_cols = [c for c in features if c not in numeric_cols]

        numeric_transformer = Pipeline(steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ])

        categorical_transformer = Pipeline(steps=[
            ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ])

        transformers = []
        if numeric_cols:
            transformers.append(("num", numeric_transformer, numeric_cols))
        if categorical_cols:
            transformers.append(("cat", categorical_transformer, categorical_cols))

        preprocessor = ColumnTransformer(transformers=transformers)

        # 3. Train/test split with deterministic seed
        stratify = None
        if req.task_type == "classification":
            val_counts = y.value_counts()
            if (val_counts >= 2).all() and len(val_counts) > 1:
                stratify = y

        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=req.test_size,
            random_state=req.random_seed,
            stratify=stratify,
        )

        # 4. Estimator & Baseline Setup
        estimator = MLService.get_estimator(req.task_type, req.estimator, req.random_seed)
        model_pipeline = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("classifier" if req.task_type == "classification" else "regressor", estimator),
        ])

        # Baseline: Dummy predictor on identical data split
        baseline = (
            DummyClassifier(strategy="most_frequent")
            if req.task_type == "classification"
            else DummyRegressor(strategy="mean")
        )

        # 5. Fit strictly on train data only
        model_pipeline.fit(X_train, y_train)
        baseline.fit(X_train, y_train)

        # 6. Evaluate on test set
        y_pred = model_pipeline.predict(X_test)
        y_baseline_pred = baseline.predict(X_test)

        metrics: dict[str, Any] = {}
        baseline_metrics: dict[str, Any] = {}

        if req.task_type == "classification":
            acc = float(accuracy_score(y_test, y_pred))
            prec = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
            rec = float(recall_score(y_test, y_pred, average="macro", zero_division=0))
            f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
            cm = confusion_matrix(y_test, y_pred).tolist()

            metrics = {
                "accuracy": round(acc, 4),
                "precision_macro": round(prec, 4),
                "recall_macro": round(rec, 4),
                "f1_macro": round(f1, 4),
                "confusion_matrix": cm,
            }
            baseline_metrics = {
                "accuracy": round(float(accuracy_score(y_test, y_baseline_pred)), 4),
                "f1_macro": round(float(f1_score(y_test, y_baseline_pred, average="macro", zero_division=0)), 4),
            }
        else:
            mse = float(mean_squared_error(y_test, y_pred))
            rmse = float(np.sqrt(mse))
            mae = float(mean_absolute_error(y_test, y_pred))
            r2 = float(r2_score(y_test, y_pred))

            metrics = {
                "mse": round(mse, 4),
                "rmse": round(rmse, 4),
                "mae": round(mae, 4),
                "r2": round(r2, 4),
            }
            base_mse = float(mean_squared_error(y_test, y_baseline_pred))
            baseline_metrics = {
                "mse": round(base_mse, 4),
                "rmse": round(float(np.sqrt(base_mse)), 4),
                "mae": round(float(mean_absolute_error(y_test, y_baseline_pred)), 4),
                "r2": round(float(r2_score(y_test, y_baseline_pred)), 4),
            }

        # 7. Extract Feature Importances if available
        importances: dict[str, float] | None = None
        fitted_estimator = model_pipeline.named_steps["classifier" if req.task_type == "classification" else "regressor"]
        if hasattr(fitted_estimator, "feature_importances_"):
            raw_imp = fitted_estimator.feature_importances_
            # Map top features
            if len(raw_imp) >= len(numeric_cols):
                importances = {col: round(float(imp), 4) for col, imp in zip(numeric_cols, raw_imp[:len(numeric_cols)])}

        # 8. Save artifact
        artifact_filename = f"model_{ds.id[:8]}_{req.estimator}_{req.random_seed}.json"
        artifact_path = settings.ARTIFACTS_DIR / artifact_filename
        metadata = {
            "task_type": req.task_type,
            "estimator": req.estimator,
            "target_column": req.target_column,
            "features": features,
            "metrics": metrics,
            "baseline_metrics": baseline_metrics,
            "train_rows": len(X_train),
            "test_rows": len(X_test),
        }
        with open(artifact_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        artifact = Artifact(
            name=artifact_filename,
            storage_path=str(artifact_path),
            format="json",
            byte_size=artifact_path.stat().st_size,
            checksum=hashlib.sha256(artifact_path.read_bytes()).hexdigest(),
        )
        db.add(artifact)
        db.commit()
        db.refresh(artifact)

        # 9. Register Experiment in database
        experiment = Experiment(
            workspace_id=req.workspace_id or "default-workspace",
            dataset_id=req.dataset_id,
            name=f"{req.estimator} on {ds.name}",
            task_type=req.task_type,
            estimator=req.estimator,
            target_column=req.target_column,
            parameters_json=json.dumps({"test_size": req.test_size, "random_seed": req.random_seed}),
            metrics_json=json.dumps(metrics),
            random_seed=req.random_seed,
        )
        db.add(experiment)
        db.commit()
        db.refresh(experiment)

        return MLTrainResponse(
            experiment_id=experiment.id,
            dataset_id=ds.id,
            task_type=req.task_type,
            estimator=req.estimator,
            target_column=req.target_column,
            features_used=features,
            train_rows=len(X_train),
            test_rows=len(X_test),
            metrics=metrics,
            baseline_metrics=baseline_metrics,
            feature_importances=importances,
            model_artifact_id=artifact.id,
        )
