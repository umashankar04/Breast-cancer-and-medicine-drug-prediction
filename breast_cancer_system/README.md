# Breast Cancer Detection System

## Run

```bash
uvicorn main:app --reload
```

## API Behavior

- `POST /submit-report` validates the patient feature set, runs prediction, returns the medicine recommendation, stores the report in the database, and writes a CSV export.
- CSV exports are written to `logs/report_exports/` as `report_<id>.csv`.
- The submit-report response now includes `csv_report_path` so you can locate the generated report file.

## Environment Variables

- `DATABASE_URL` = `mysql+pymysql://user:password@host:3306/database`
- `SECRET_KEY` = JWT secret
- `JWT_ALGORITHM` = `HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES` = `60`
- `MEDICINE_DATA_DIR` = folder containing `medicine_catalog.json` and other medicine/drug assets. Defaults to `medicines & drugs` in the workspace root.

## Notes

- Place `data.csv` in the workspace root or project root if you want the app to auto-train a fallback `model.pkl`.
- If MySQL is unavailable, the app falls back to local SQLite at `breast_cancer_system/breast_cancer_local.db`.
- Replace `model.pkl` with your own trained Random Forest artifact for production use.
- Medicine recommendations are loaded from every supported JSON catalog under `medicines & drugs`, and the API returns the friendlier field names `drug_name`, `dose`, and `when_to_take`.
