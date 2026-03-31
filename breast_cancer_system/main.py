"""FastAPI application entry point for the Breast Cancer Detection System."""

from __future__ import annotations

import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from breast_cancer_system.database.connection import BASE_DIR, init_db
from breast_cancer_system.routes.auth import router as auth_router
from breast_cancer_system.routes.patient import router as patient_router
from breast_cancer_system.routes.prediction import router as prediction_router
from breast_cancer_system.services.ml_model import load_model_artifact


load_dotenv(BASE_DIR / ".env")


def configure_logging() -> None:
    """Configure application logging with console and rotating file output."""

    log_level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    log_file = Path(os.getenv("LOG_FILE", str(BASE_DIR / "logs" / "app.log")))
    max_mb = int(os.getenv("LOG_MAX_MB", "5"))
    backup_count = int(os.getenv("LOG_BACKUP_COUNT", "3"))

    log_file.parent.mkdir(parents=True, exist_ok=True)

    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level_name, logging.INFO))

    formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=max_mb * 1024 * 1024,
        backupCount=backup_count,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)

    root_logger.handlers.clear()
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)


app = FastAPI(
    title="Breast Cancer Detection System",
    version="1.0.0",
    description="FastAPI + MySQL backend for breast cancer screening, prediction, and recommendation.",
)

configure_logging()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(prediction_router)
app.include_router(patient_router)


@app.on_event("startup")
def startup_event() -> None:
    """Initialize tables and ensure a usable model artifact exists."""

    init_db()
    load_model_artifact()


@app.get("/")
def health_check() -> dict[str, str]:
    """Return a simple health response for uptime checks."""

    return {"status": "ok", "message": "Breast Cancer Detection System is running."}
