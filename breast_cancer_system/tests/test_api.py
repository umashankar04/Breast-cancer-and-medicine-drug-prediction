from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient


def normalize_column_name(column_name: str) -> str:
    normalized = column_name.strip().lower().replace("(", "").replace(")", "")
    normalized = normalized.replace(" ", "_").replace("-", "_")

    while "__" in normalized:
        normalized = normalized.replace("__", "_")

    return normalized


@pytest.fixture()
def client(tmp_path, monkeypatch):
    database_url = f"sqlite:///{(tmp_path / 'test.db').as_posix()}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    monkeypatch.setenv("MEDICINE_DATA_DIR", str(Path(__file__).resolve().parents[2] / "medicines & drugs"))

    for module_name in [name for name in sys.modules if name == "main" or name.startswith("breast_cancer_system")]:
        del sys.modules[module_name]

    app_module = importlib.import_module("breast_cancer_system.main")

    with TestClient(app_module.app) as test_client:
        yield test_client


def _build_feature_payload() -> dict[str, float]:
    frame = pd.read_csv(Path(__file__).resolve().parents[2] / "data.csv")
    frame = frame.rename(columns={column: normalize_column_name(column) for column in frame.columns})
    row = frame.iloc[0]
    from breast_cancer_system.database.schemas import FEATURE_COLUMNS

    return {column: float(row[column]) for column in FEATURE_COLUMNS}


def _register_and_login(client: TestClient, phone: str = "1234567890") -> str:
    register_response = client.post("/register", json={"name": "Test User", "phone": phone})
    assert register_response.status_code == 201

    login_response = client.post("/login", json={"phone": phone})
    assert login_response.status_code == 200
    return login_response.json()["access_token"]


def test_health_endpoint(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_predict_and_submit_report_flow(client: TestClient):
    payload = _build_feature_payload()
    token = _register_and_login(client, "1234567891")

    predict_response = client.post(
        "/predict",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert predict_response.status_code == 200
    predict_body = predict_response.json()
    assert predict_body["prediction"] in {"Benign", "Malignant"}
    assert predict_body["drug_name"]
    assert predict_body["dose"]
    assert predict_body["when_to_take"]

    submit_response = client.post(
        "/submit-report",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert submit_response.status_code == 200
    submit_body = submit_response.json()
    assert submit_body["csv_report_path"]
    assert submit_body["drug_name"]
    assert submit_body["dose"]
    assert submit_body["when_to_take"]


def test_submit_report_accepts_csv_upload_and_exports_report(client: TestClient):
    payload = _build_feature_payload()
    token = _register_and_login(client, "1234567892")

    csv_header = ",".join(payload.keys())
    csv_row = ",".join(str(value) for value in payload.values())
    csv_text = f"{csv_header}\n{csv_row}\n"

    response = client.post(
        "/submit-report",
        headers={"Authorization": f"Bearer {token}"},
        files={"csv_file": ("report.csv", csv_text, "text/csv")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["prediction"] in {"Benign", "Malignant"}
    assert body["csv_report_path"]
    assert Path(body["csv_report_path"]).exists()
    assert body["drug_name"]
    assert body["dose"]
    assert body["when_to_take"]
