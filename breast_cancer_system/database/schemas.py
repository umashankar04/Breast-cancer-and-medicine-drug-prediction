"""Pydantic schemas for authentication, patient reports, and predictions."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


FEATURE_COLUMNS = [
    "radius_mean",
    "texture_mean",
    "perimeter_mean",
    "area_mean",
    "smoothness_mean",
    "compactness_mean",
    "concavity_mean",
    "concave_points_mean",
    "symmetry_mean",
    "fractal_dimension_mean",
    "radius_se",
    "texture_se",
    "perimeter_se",
    "area_se",
    "smoothness_se",
    "compactness_se",
    "concavity_se",
    "concave_points_se",
    "symmetry_se",
    "fractal_dimension_se",
    "radius_worst",
    "texture_worst",
    "perimeter_worst",
    "area_worst",
    "smoothness_worst",
    "compactness_worst",
    "concavity_worst",
    "concave_points_worst",
    "symmetry_worst",
    "fractal_dimension_worst",
]


class FeatureVectorBase(BaseModel):
    """Base schema with the 30 features used by the model."""

    model_config = ConfigDict(extra="forbid")

    radius_mean: float = Field(..., ge=0)
    texture_mean: float = Field(..., ge=0)
    perimeter_mean: float = Field(..., ge=0)
    area_mean: float = Field(..., ge=0)
    smoothness_mean: float = Field(..., ge=0)
    compactness_mean: float = Field(..., ge=0)
    concavity_mean: float = Field(..., ge=0)
    concave_points_mean: float = Field(..., ge=0)
    symmetry_mean: float = Field(..., ge=0)
    fractal_dimension_mean: float = Field(..., ge=0)
    radius_se: float = Field(..., ge=0)
    texture_se: float = Field(..., ge=0)
    perimeter_se: float = Field(..., ge=0)
    area_se: float = Field(..., ge=0)
    smoothness_se: float = Field(..., ge=0)
    compactness_se: float = Field(..., ge=0)
    concavity_se: float = Field(..., ge=0)
    concave_points_se: float = Field(..., ge=0)
    symmetry_se: float = Field(..., ge=0)
    fractal_dimension_se: float = Field(..., ge=0)
    radius_worst: float = Field(..., ge=0)
    texture_worst: float = Field(..., ge=0)
    perimeter_worst: float = Field(..., ge=0)
    area_worst: float = Field(..., ge=0)
    smoothness_worst: float = Field(..., ge=0)
    compactness_worst: float = Field(..., ge=0)
    concavity_worst: float = Field(..., ge=0)
    concave_points_worst: float = Field(..., ge=0)
    symmetry_worst: float = Field(..., ge=0)
    fractal_dimension_worst: float = Field(..., ge=0)


class PatientReportCreate(FeatureVectorBase):
    """Schema used for manual report submission."""


class RegisterRequest(BaseModel):
    """Schema used for user registration."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=2, max_length=150)
    phone: str = Field(..., min_length=7, max_length=20)


class LoginRequest(BaseModel):
    """Schema used for login."""

    model_config = ConfigDict(extra="forbid")

    phone: str = Field(..., min_length=7, max_length=20)


class TokenResponse(BaseModel):
    """Schema for JWT login responses."""

    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    """Schema for returning user details safely."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str


class MedicineRecommendation(BaseModel):
    """Schema describing the recommendation returned with a prediction."""

    recommended_medicines: list[str]
    drug_name: str
    dose: str
    when_to_take: str
    supporting_actions: list[str]
    disclaimer: str
    data_sources: list[str] = Field(default_factory=list)


class PredictionResponse(BaseModel):
    """Schema for the prediction API response."""

    prediction: str
    probability: float
    medicine: MedicineRecommendation
    stage_assessment: str
    drug_name: Optional[str] = None
    dose: Optional[str] = None
    when_to_take: Optional[str] = None


class ReportResponse(BaseModel):
    """Schema returned after a report is stored."""

    id: int
    user_id: int
    prediction: str
    probability: float
    medicine: MedicineRecommendation
    stage_assessment: str
    drug_name: Optional[str] = None
    dose: Optional[str] = None
    when_to_take: Optional[str] = None
    created_at: datetime
    features: dict[str, Any]
    csv_report_path: Optional[str] = None
    csv_download_url: Optional[str] = None
