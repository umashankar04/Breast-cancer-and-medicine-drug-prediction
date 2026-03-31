"""Compatibility entrypoint so the app can be started with `uvicorn main:app --reload`."""

from breast_cancer_system.main import app
