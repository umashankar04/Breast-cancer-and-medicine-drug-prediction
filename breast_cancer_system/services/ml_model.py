"""Model loading, fallback training, and prediction helpers."""

from __future__ import annotations

import pickle
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

from breast_cancer_system.database.schemas import FEATURE_COLUMNS


PROJECT_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = PROJECT_ROOT.parent
MODEL_PATH = PROJECT_ROOT / "model.pkl"
DATASET_CANDIDATES = [WORKSPACE_ROOT / "data.csv", PROJECT_ROOT / "data.csv"]


@dataclass
class ModelArtifact:
    """Container for the persisted estimator and its feature ordering."""

    model: Any
    feature_columns: list[str]


def normalize_column_name(column_name: str) -> str:
    """Normalize a CSV column name to the snake_case format used by the app."""

    normalized = column_name.strip().lower().replace("(", "").replace(")", "")
    normalized = normalized.replace(" ", "_").replace("-", "_")
    while "__" in normalized:
        normalized = normalized.replace("__", "_")
    return normalized


def load_dataset(csv_path: Path) -> pd.DataFrame:
    """Load and normalize the breast cancer dataset used to train the fallback model."""

    frame = pd.read_csv(csv_path)
    frame.columns = [normalize_column_name(column) for column in frame.columns]
    return frame


def prepare_training_frame(frame: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Split the source frame into model features and binary target labels."""

    working = frame.copy()
    if "diagnosis" not in working.columns:
        raise ValueError("The training dataset must contain a 'diagnosis' column.")

    working = working.drop(columns=[column for column in ["id", "unnamed:_32", "unnamed_32", ""] if column in working.columns], errors="ignore")
    working = working.rename(columns={column: normalize_column_name(column) for column in working.columns})

    for feature in FEATURE_COLUMNS:
        if feature not in working.columns:
            raise ValueError(f"Missing required feature column: {feature}")

    features = working[FEATURE_COLUMNS].astype(float)
    targets = working["diagnosis"].astype(str).str.strip().str.lower().map(
        {"m": 1, "b": 0, "malignant": 1, "benign": 0}
    )

    if targets.isna().any():
        raise ValueError("Diagnosis column must contain only benign/malignant values.")

    return features, targets.astype(int)


def train_and_save_fallback_model() -> ModelArtifact:
    """Train a Random Forest model from the local dataset and persist it to disk."""

    dataset_path = next((candidate for candidate in DATASET_CANDIDATES if candidate.exists()), None)
    if dataset_path is None:
        raise FileNotFoundError(
            "model.pkl is missing and no data.csv file was found in the project or workspace root."
        )

    frame = load_dataset(dataset_path)
    features, targets = prepare_training_frame(frame)

    X_train, X_test, y_train, y_test = train_test_split(
        features,
        targets,
        test_size=0.30,
        stratify=targets,
        random_state=42,
    )

    model = RandomForestClassifier(
        n_estimators=300,
        random_state=42,
        class_weight="balanced",
    )
    model.fit(X_train, y_train)

    artifact = ModelArtifact(model=model, feature_columns=FEATURE_COLUMNS)
    with MODEL_PATH.open("wb") as model_file:
        pickle.dump(artifact, model_file)

    return artifact


def load_model_artifact() -> ModelArtifact:
    """Load the persisted model artifact or train a fallback model if necessary."""

    if MODEL_PATH.exists():
        try:
            with MODEL_PATH.open("rb") as model_file:
                artifact = pickle.load(model_file)
            if isinstance(artifact, ModelArtifact):
                if _artifact_is_usable(artifact):
                    return artifact
            if isinstance(artifact, dict) and "model" in artifact:
                feature_columns = artifact.get("feature_columns", FEATURE_COLUMNS)
                loaded_artifact = ModelArtifact(model=artifact["model"], feature_columns=list(feature_columns))
                if _artifact_is_usable(loaded_artifact):
                    return loaded_artifact
        except Exception:
            MODEL_PATH.unlink(missing_ok=True)

        MODEL_PATH.unlink(missing_ok=True)

    return train_and_save_fallback_model()


def _artifact_is_usable(artifact: ModelArtifact) -> bool:
    """Check that a loaded model can still score a simple input row."""

    try:
        probe_frame = pd.DataFrame(
            [[0.0 for _ in artifact.feature_columns]],
            columns=artifact.feature_columns,
        )
        artifact.model.predict(probe_frame)
        return True
    except Exception:
        return False


def predict_breast_cancer(features: dict[str, float]) -> tuple[str, float]:
    """Predict benign or malignant and return the malignant probability score."""

    artifact = load_model_artifact()
    input_frame = pd.DataFrame(
        [[features[column] for column in artifact.feature_columns]],
        columns=artifact.feature_columns,
    )

    try:
        prediction_index = int(artifact.model.predict(input_frame)[0])

        if hasattr(artifact.model, "predict_proba"):
            malignant_probability = float(artifact.model.predict_proba(input_frame)[0][1])
        else:
            malignant_probability = 0.0
    except Exception:
        MODEL_PATH.unlink(missing_ok=True)
        artifact = train_and_save_fallback_model()
        input_frame = pd.DataFrame(
            [[features[column] for column in artifact.feature_columns]],
            columns=artifact.feature_columns,
        )
        prediction_index = int(artifact.model.predict(input_frame)[0])
        if hasattr(artifact.model, "predict_proba"):
            malignant_probability = float(artifact.model.predict_proba(input_frame)[0][1])
        else:
            malignant_probability = 0.0

    label = "Malignant" if prediction_index == 1 else "Benign"
    return label, malignant_probability


def predict_many(records: List[Dict[str, float]]) -> List[Dict[str, Any]]:
    """Predict a batch of uploaded CSV report rows."""

    outputs: List[Dict[str, Any]] = []
    for record in records:
        label, probability = predict_breast_cancer(record)
        outputs.append({"prediction": label, "probability": probability})
    return outputs
