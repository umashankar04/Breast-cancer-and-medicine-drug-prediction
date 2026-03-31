# Breast Cancer Frontend

React + Vite frontend connected to the FastAPI backend.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure the API base URL:

```bash
copy .env.example .env
```

3. Run the app:

```bash
npm run dev
```

## Connected Backend Endpoints

- `POST /register`
- `POST /login`
- `POST /predict`
- `POST /submit-report`

## Notes

- The UI uses the friendlier medicine field names: `drug_name`, `dose`, and `when_to_take`.
- The submit report flow also returns the CSV report path.
- Upload a CSV report to auto-fill the 30 feature fields before running prediction or submit.
