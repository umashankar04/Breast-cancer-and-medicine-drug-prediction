"""Medical recommendation logic for model predictions."""

from __future__ import annotations

import csv
import json
import os
from pathlib import Path
from functools import lru_cache

from breast_cancer_system.database.schemas import MedicineRecommendation


WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
MEDICINE_DATA_DIR = Path(os.getenv("MEDICINE_DATA_DIR", str(WORKSPACE_ROOT / "medicines & drugs")))
CATALOG_PATH = MEDICINE_DATA_DIR / "medicine_catalog.json"

BENIGN_DISCLAIMER = (
    "This system is for screening support only and is not a medical diagnosis. "
    "Please consult a licensed clinician for any symptoms or follow-up questions."
)

MALIGNANT_DISCLAIMER = (
    "This is a high-risk screening result and requires urgent clinical review. "
    "Do not self-medicate; consult an oncologist immediately."
)


def _load_catalog() -> dict[str, dict[str, object]]:
    """Load the drug catalog from JSON assets in the medicine data folder."""

    catalog_bundle = _load_catalog_bundle()
    if not catalog_bundle["catalog"]:
        raise FileNotFoundError(
            f"No supported medicine catalog JSON files were found under {MEDICINE_DATA_DIR}."
        )

    return catalog_bundle["catalog"]


def _looks_like_catalog(payload: object) -> bool:
    """Check whether a JSON payload matches the expected benign/malignant catalog structure."""

    return isinstance(payload, dict) and "benign" in payload and "malignant" in payload


def _normalize_catalog_entry(entry: dict[str, object]) -> dict[str, object]:
    """Ensure catalog entries always expose the expected keys."""

    return {
        "recommended_medicines": list(entry.get("recommended_medicines", [])),
        "drug_name": entry.get("drug_name", entry.get("medicine_name", "")),
        "dose": entry.get("dose", entry.get("dosage", "N/A")),
        "when_to_take": entry.get("when_to_take", entry.get("time_of_day", "N/A")),
        "supporting_actions": list(entry.get("supporting_actions", [])),
        "disclaimer": entry.get("disclaimer", BENIGN_DISCLAIMER),
    }


def _relative_source_path(path: Path) -> str:
    """Render a source path relative to the medicine data directory when possible."""

    try:
        return str(path.relative_to(MEDICINE_DATA_DIR))
    except ValueError:
        return str(path)


@lru_cache(maxsize=1)
def _load_catalog_bundle() -> dict[str, object]:
    """Load all recognized medicine assets from the configured folder."""

    if not MEDICINE_DATA_DIR.exists():
        raise FileNotFoundError(
            f"Medicine data directory not found at {MEDICINE_DATA_DIR}. Set MEDICINE_DATA_DIR to a valid folder."
        )

    catalog: dict[str, dict[str, object]] = {}
    source_files: list[str] = []

    for source_path in sorted(MEDICINE_DATA_DIR.rglob("*")):
        if not source_path.is_file():
            continue

        if source_path.suffix.lower() == ".json":
            with source_path.open("r", encoding="utf-8") as source_file:
                payload = json.load(source_file)

            if _looks_like_catalog(payload):
                catalog.update({key: _normalize_catalog_entry(value) for key, value in payload.items()})
                source_files.append(_relative_source_path(source_path))
            continue

        if source_path.suffix.lower() == ".csv":
            with source_path.open("r", encoding="utf-8-sig", errors="replace", newline="") as csv_file:
                reader = csv.reader(csv_file)
                next(reader, None)

            source_files.append(_relative_source_path(source_path))
            continue

    if CATALOG_PATH.exists() and _relative_source_path(CATALOG_PATH) not in source_files:
        source_files.insert(0, _relative_source_path(CATALOG_PATH))

    return {"catalog": catalog, "source_files": source_files}


def get_medicine_data_sources() -> list[str]:
    """Expose the medicine assets that were loaded from disk."""

    return list(_load_catalog_bundle()["source_files"])


def get_medicine_recommendation(prediction_label: str) -> MedicineRecommendation:
    """Return a structured recommendation based on the model output."""

    normalized = prediction_label.strip().lower()
    bundle = _load_catalog_bundle()
    catalog = bundle["catalog"]
    source_files = list(bundle["source_files"])

    if normalized == "benign":
        benign = catalog["benign"]
        return MedicineRecommendation(
            recommended_medicines=list(benign["recommended_medicines"]),
            drug_name=str(benign["drug_name"]),
            dose=str(benign["dose"]),
            when_to_take=str(benign["when_to_take"]),
            supporting_actions=list(benign["supporting_actions"]),
            disclaimer=str(benign["disclaimer"]),
            data_sources=source_files,
        )

    malignant = catalog["malignant"]
    return MedicineRecommendation(
        recommended_medicines=list(malignant["recommended_medicines"]),
        drug_name=str(malignant["drug_name"]),
        dose=str(malignant["dose"]),
        when_to_take=str(malignant["when_to_take"]),
        supporting_actions=list(malignant["supporting_actions"]),
        disclaimer=str(malignant["disclaimer"]),
        data_sources=source_files,
    )
