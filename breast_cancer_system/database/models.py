"""SQLAlchemy models for users and patient reports."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from breast_cancer_system.database.connection import Base
from breast_cancer_system.database.schemas import FEATURE_COLUMNS


class User(Base):
    """Authenticated user who can submit breast cancer reports."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    password: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    reports: Mapped[list["Report"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class Report(Base):
    """Stored report with raw features, model output, and recommendation metadata."""

    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    radius_mean: Mapped[float] = mapped_column(Float, nullable=False)
    texture_mean: Mapped[float] = mapped_column(Float, nullable=False)
    perimeter_mean: Mapped[float] = mapped_column(Float, nullable=False)
    area_mean: Mapped[float] = mapped_column(Float, nullable=False)
    smoothness_mean: Mapped[float] = mapped_column(Float, nullable=False)
    compactness_mean: Mapped[float] = mapped_column(Float, nullable=False)
    concavity_mean: Mapped[float] = mapped_column(Float, nullable=False)
    concave_points_mean: Mapped[float] = mapped_column(Float, nullable=False)
    symmetry_mean: Mapped[float] = mapped_column(Float, nullable=False)
    fractal_dimension_mean: Mapped[float] = mapped_column(Float, nullable=False)
    radius_se: Mapped[float] = mapped_column(Float, nullable=False)
    texture_se: Mapped[float] = mapped_column(Float, nullable=False)
    perimeter_se: Mapped[float] = mapped_column(Float, nullable=False)
    area_se: Mapped[float] = mapped_column(Float, nullable=False)
    smoothness_se: Mapped[float] = mapped_column(Float, nullable=False)
    compactness_se: Mapped[float] = mapped_column(Float, nullable=False)
    concavity_se: Mapped[float] = mapped_column(Float, nullable=False)
    concave_points_se: Mapped[float] = mapped_column(Float, nullable=False)
    symmetry_se: Mapped[float] = mapped_column(Float, nullable=False)
    fractal_dimension_se: Mapped[float] = mapped_column(Float, nullable=False)
    radius_worst: Mapped[float] = mapped_column(Float, nullable=False)
    texture_worst: Mapped[float] = mapped_column(Float, nullable=False)
    perimeter_worst: Mapped[float] = mapped_column(Float, nullable=False)
    area_worst: Mapped[float] = mapped_column(Float, nullable=False)
    smoothness_worst: Mapped[float] = mapped_column(Float, nullable=False)
    compactness_worst: Mapped[float] = mapped_column(Float, nullable=False)
    concavity_worst: Mapped[float] = mapped_column(Float, nullable=False)
    concave_points_worst: Mapped[float] = mapped_column(Float, nullable=False)
    symmetry_worst: Mapped[float] = mapped_column(Float, nullable=False)
    fractal_dimension_worst: Mapped[float] = mapped_column(Float, nullable=False)

    prediction: Mapped[str] = mapped_column(String(20), nullable=False)
    probability: Mapped[float] = mapped_column(Float, nullable=False)
    recommendation_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="reports", lazy="selectin")


def report_to_feature_dict(report: Report) -> dict[str, float]:
    """Convert a report row into a model-friendly feature dictionary."""

    return {column: getattr(report, column) for column in FEATURE_COLUMNS}
