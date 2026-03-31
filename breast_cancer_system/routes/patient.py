"""Patient report submission routes."""

from __future__ import annotations

import json
from collections.abc import Mapping
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from breast_cancer_system.database.connection import BASE_DIR, get_db
from breast_cancer_system.database.models import Report, User
from breast_cancer_system.database.schemas import FEATURE_COLUMNS, PatientReportCreate, ReportResponse
from breast_cancer_system.services.medicine_recommendation import get_medicine_recommendation
from breast_cancer_system.services.ml_model import normalize_column_name, predict_breast_cancer
from breast_cancer_system.utils.security import get_current_user


router = APIRouter(tags=["Patient Reports"])
REPORT_EXPORT_DIR = BASE_DIR / "logs" / "report_exports"
STAGE_ASSESSMENT = "Stage cannot be determined from this model alone."


def _validate_and_order_features(payload: Mapping[Any, Any]) -> dict[str, float]:
    """Validate incoming feature data and return it in the model's expected order."""

    normalized = {normalize_column_name(str(key)): value for key, value in payload.items()}
    missing_features = [feature for feature in FEATURE_COLUMNS if feature not in normalized]
    if missing_features:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"missing_features": missing_features},
        )

    prepared = {feature: float(normalized[feature]) for feature in FEATURE_COLUMNS}

    return prepared


def _store_report(
    db: Session,
    user_id: int,
    features: dict[str, float],
    prediction: str,
    probability: float,
    medicine_payload: dict[str, Any],
) -> Report:
    """Persist a prediction result and its recommendation to the database."""

    report = Report(
        user_id=user_id,
        **features,
        prediction=prediction,
        probability=probability,
        recommendation_json=json.dumps(medicine_payload, ensure_ascii=False),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def _csv_report_path(report_id: int) -> Path:
    """Return the filesystem path for a stored CSV report."""

    return REPORT_EXPORT_DIR / f"report_{report_id}.csv"


def _write_csv_report(
    report: Report,
    user: User,
    features: dict[str, float],
    medicine_payload: dict[str, Any],
) -> Path:
    """Write a single-row CSV export for a stored report."""

    REPORT_EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    csv_path = _csv_report_path(report.id)

    csv_row: dict[str, Any] = {
        "report_id": report.id,
        "user_id": report.user_id,
        "user_name": user.name,
        "user_phone": user.phone,
        "prediction": report.prediction,
        "probability": report.probability,
        "created_at": report.created_at.isoformat(),
        "drug_name": medicine_payload.get("drug_name"),
        "dose": medicine_payload.get("dose"),
        "when_to_take": medicine_payload.get("when_to_take"),
        "disclaimer": medicine_payload.get("disclaimer"),
        "recommended_medicines": "; ".join(medicine_payload.get("recommended_medicines", [])),
        "supporting_actions": "; ".join(medicine_payload.get("supporting_actions", [])),
    }
    csv_row.update(features)

    pd.DataFrame([csv_row]).to_csv(csv_path, index=False)
    return csv_path


@router.post("/submit-report", response_model=ReportResponse, response_model_by_alias=False)
async def submit_report(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportResponse:
    """Accept manual JSON input or a CSV upload, predict the result, and store it."""

    content_type = request.headers.get("content-type", "").lower()

    if "multipart/form-data" in content_type:
        form_data = await request.form()
        uploaded_file = form_data.get("csv_file") or form_data.get("file")
        report_json = form_data.get("report_json")

        if uploaded_file is not None and hasattr(uploaded_file, "filename") and hasattr(uploaded_file, "file"):
            filename = str(getattr(uploaded_file, "filename", "") or "")
            if not filename.lower().endswith(".csv"):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only CSV files are supported.")

            data_frame = pd.read_csv(getattr(uploaded_file, "file"))
            if data_frame.empty:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded CSV file is empty.")

            normalized_frame = data_frame.rename(columns={column: normalize_column_name(column) for column in data_frame.columns})
            first_row = dict(normalized_frame.iloc[0].to_dict())
            features = _validate_and_order_features(first_row)
        elif report_json:
            try:
                parsed_payload = json.loads(str(report_json))
            except json.JSONDecodeError as exc:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="report_json must be valid JSON.") from exc

            validated = PatientReportCreate.model_validate(parsed_payload)
            features = validated.model_dump()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provide either csv_file or report_json in the multipart request.",
            )
    else:
        try:
            parsed_payload = await request.json()
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Send a valid JSON body for manual entry.") from exc

        validated = PatientReportCreate.model_validate(parsed_payload)
        features = validated.model_dump()

    prediction, probability = predict_breast_cancer(features)
    medicine = get_medicine_recommendation(prediction)
    stored_report = _store_report(db, current_user.id, features, prediction, probability, medicine.model_dump())
    csv_report_path = _write_csv_report(stored_report, current_user, features, medicine.model_dump())

    return ReportResponse(
        id=stored_report.id,
        user_id=stored_report.user_id,
        prediction=stored_report.prediction,
        probability=stored_report.probability,
        medicine=medicine,
        stage_assessment=STAGE_ASSESSMENT,
        drug_name=medicine.drug_name,
        dose=medicine.dose,
        when_to_take=medicine.when_to_take,
        created_at=stored_report.created_at,
        features=features,
        csv_report_path=str(csv_report_path),
        csv_download_url=f"/reports/{stored_report.id}/csv",
    )


@router.get("/reports/{report_id}/csv")
def download_report_csv(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    """Download the stored CSV report for the signed-in user."""

    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CSV report not found.")

    csv_path = _csv_report_path(report.id)
    if not csv_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CSV report file not found.")

    download_name = f"report_{report.id}_{current_user.phone}.csv"
    return FileResponse(csv_path, media_type="text/csv", filename=download_name)
