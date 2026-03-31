"""Prediction routes for model inference without database storage."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from breast_cancer_system.database.schemas import PatientReportCreate, PredictionResponse
from breast_cancer_system.services.medicine_recommendation import get_medicine_recommendation
from breast_cancer_system.services.ml_model import predict_breast_cancer
from breast_cancer_system.utils.security import get_current_user
from breast_cancer_system.database.models import User


router = APIRouter(tags=["Prediction"])
STAGE_ASSESSMENT = "Stage cannot be determined from this model alone."


@router.post("/predict", response_model=PredictionResponse, response_model_by_alias=False)
def predict_report(payload: PatientReportCreate, current_user: User = Depends(get_current_user)) -> PredictionResponse:
    """Predict a single report and return the result without writing to the database."""

    features = payload.model_dump()
    prediction, probability = predict_breast_cancer(features)
    medicine = get_medicine_recommendation(prediction)
    return PredictionResponse(
        prediction=prediction,
        probability=probability,
        medicine=medicine,
        stage_assessment=STAGE_ASSESSMENT,
        drug_name=medicine.drug_name,
        dose=medicine.dose,
        when_to_take=medicine.when_to_take,
    )
