import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  loginUser,
  downloadReportCsv,
  predictReport,
  registerUser,
  submitReport,
  submitReportWithCsv,
  type MedicineRecommendation,
  type PredictionResponse,
  type ReportResponse,
} from "./api";
import {
  FEATURE_COLUMNS,
  FIELD_LABELS,
  extractFeaturesFromFile,
  validateAuthInputs,
  validateFeatureInputs,
} from "./reportTools";

type AuthMode = "register" | "login";

type OutputState = {
  error?: string;
  message?: string;
  prediction?: PredictionResponse;
  report?: ReportResponse;
  medicine?: MedicineRecommendation;
};

const initialFeatures = FEATURE_COLUMNS.reduce<Record<string, string>>(
  (accumulator, column) => {
    accumulator[column] = "";
    return accumulator;
  },
  {},
);

function createEmptyTouchedMap() {
  return FEATURE_COLUMNS.reduce<Record<string, boolean>>(
    (accumulator, column) => {
      accumulator[column] = false;
      return accumulator;
    },
    {},
  );
}

function App() {
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState(
    () => localStorage.getItem("bc_token") ?? "",
  );
  const [features, setFeatures] =
    useState<Record<string, string>>(initialFeatures);
  const [featureTouched, setFeatureTouched] = useState<Record<string, boolean>>(
    createEmptyTouchedMap,
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [reportFileName, setReportFileName] = useState("");
  const [uploadedCsvFile, setUploadedCsvFile] = useState<File | null>(null);
  const [output, setOutput] = useState<OutputState>({});
  const [busy, setBusy] = useState(false);

  const isAuthenticated = Boolean(token);
  const isWorking = busy;

  const featureErrors = useMemo(
    () => validateFeatureInputs(features),
    [features],
  );
  const authErrors = useMemo(
    () => validateAuthInputs(name, phone, authMode === "register"),
    [authMode, name, phone],
  );
  const hasFeatureErrors = FEATURE_COLUMNS.some(
    (column) => featureErrors[column],
  );
  const filledFeatures = FEATURE_COLUMNS.every(
    (column) => features[column].trim() !== "",
  );

  function resetFeatureInteraction() {
    setFeatureTouched(createEmptyTouchedMap());
    setSubmitAttempted(false);
  }

  function updateFeature(field: string, value: string) {
    setFeatures((current) => ({ ...current, [field]: value }));
    setFeatureTouched((current) => ({ ...current, [field]: true }));
  }

  function triggerCsvDownload(blob: Blob, reportId: number): boolean {
    if (typeof URL.createObjectURL !== "function") {
      return false;
    }

    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `report_${reportId}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    return true;
  }

  async function handleReportUpload(event: ChangeEvent<HTMLInputElement>) {
    const uploadedFile = event.target.files?.[0];

    if (!uploadedFile) {
      return;
    }

    setBusy(true);
    setOutput({});

    try {
      const { features: extractedFeatures } =
        await extractFeaturesFromFile(uploadedFile);
      setFeatures((current) => ({ ...current, ...extractedFeatures }));
      resetFeatureInteraction();
      setReportFileName(uploadedFile.name);
      setUploadedCsvFile(
        uploadedFile.name.toLowerCase().endsWith(".csv") ? uploadedFile : null,
      );
      setOutput({
        message: `Loaded ${uploadedFile.name} and auto-filled matching report fields.`,
      });
    } catch (error) {
      setReportFileName("");
      setUploadedCsvFile(null);
      setOutput({
        error:
          error instanceof Error
            ? error.message
            : "Could not read the uploaded report file.",
      });
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (Object.keys(authErrors).length > 0) {
      setOutput({
        error:
          authErrors.name ?? authErrors.phone ?? "Fix the sign-in form first.",
      });
      return;
    }

    setBusy(true);
    setOutput({});

    try {
      if (authMode === "register") {
        const user = await registerUser(name.trim(), phone.trim());
        const login = await loginUser(user.phone);
        localStorage.setItem("bc_token", login.access_token);
        setToken(login.access_token);
        setOutput({ message: `Registered ${user.name} and signed in.` });
      } else {
        const login = await loginUser(phone.trim());
        localStorage.setItem("bc_token", login.access_token);
        setToken(login.access_token);
        setOutput({ message: "Signed in successfully." });
      }
    } catch (error) {
      setOutput({
        error:
          error instanceof Error ? error.message : "Authentication failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handlePredict() {
    if (!token) {
      setOutput({ error: "Please sign in first." });
      return;
    }

    setSubmitAttempted(true);

    if (hasFeatureErrors) {
      setOutput({
        error: "Fix the highlighted report fields before predicting.",
      });
      return;
    }

    const payload = Object.fromEntries(
      FEATURE_COLUMNS.map((column) => [column, Number(features[column])]),
    );

    setBusy(true);
    setOutput({});

    try {
      const prediction = await predictReport(payload, token);
      setOutput({
        prediction,
        medicine: prediction.medicine,
        message: "Prediction completed.",
      });
    } catch (error) {
      setOutput({
        error: error instanceof Error ? error.message : "Prediction failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitReport() {
    if (!token) {
      setOutput({ error: "Please sign in first." });
      return;
    }

    setSubmitAttempted(true);

    const hasUploadedCsv =
      uploadedCsvFile !== null &&
      uploadedCsvFile.name.toLowerCase().endsWith(".csv");

    if (hasFeatureErrors && !hasUploadedCsv) {
      setOutput({
        error: "Fix the highlighted report fields before submitting.",
      });
      return;
    }

    const payload = Object.fromEntries(
      FEATURE_COLUMNS.map((column) => [column, Number(features[column])]),
    );

    setBusy(true);
    setOutput({});

    try {
      let report: ReportResponse;

      if (hasUploadedCsv) {
        try {
          report = await submitReportWithCsv(uploadedCsvFile, token);
        } catch (csvError) {
          if (hasFeatureErrors) {
            throw csvError;
          }
          report = await submitReport(payload, token);
        }
      } else {
        report = await submitReport(payload, token);
      }

      let message = hasUploadedCsv
        ? "Report submitted from CSV and CSV created."
        : "Report saved and CSV created.";

      try {
        const blob = await downloadReportCsv(report.id, token);
        const didStartDownload = triggerCsvDownload(blob, report.id);
        if (didStartDownload) {
          message = "Report saved, CSV created, and download started.";
        }
      } catch (downloadError) {
        message =
          downloadError instanceof Error
            ? `${message} Auto-download failed: ${downloadError.message}`
            : `${message} Auto-download failed.`;
      }

      setOutput({
        report,
        medicine: report.medicine,
        message,
      });
    } catch (error) {
      setOutput({
        error: error instanceof Error ? error.message : "Submit report failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadCsv() {
    if (!token || !output.report) {
      setOutput({ error: "Run submit report first to create a CSV file." });
      return;
    }

    setBusy(true);

    try {
      const blob = await downloadReportCsv(output.report.id, token);
      const didStartDownload = triggerCsvDownload(blob, output.report.id);
      setOutput((current) => ({
        ...current,
        message: didStartDownload
          ? "CSV download started."
          : "CSV is ready, but this browser did not start download automatically.",
      }));
    } catch (error) {
      setOutput({
        error: error instanceof Error ? error.message : "Download failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("bc_token");
    setToken("");
    setOutput({ message: "Signed out." });
  }

  return (
    <div className="app-shell">
      <div className="background-orb orb-one" />
      <div className="background-orb orb-two" />

      <main className="layout">
        <section className="hero card" data-busy={isWorking}>
          <div className="hero-copy">
            <p className="eyebrow">
              CV RAMAN GLOBAL UNIVERSITY MEDICAL COLLAGE
            </p>
            <h1>Breast Cancer Detection and Report Workflow</h1>
            <p className="lede">
              Register, sign in, enter the 30 screening features, and send them
              to the FastAPI backend for prediction, medicine guidance, and CSV
              report generation.
            </p>
            <div className="hero-pills">
              <span>Prediction</span>
              <span>Medicine guidance</span>
              <span>CSV export</span>
            </div>
          </div>
          <div className="hero-panel">
            <div className="status-row">
              <span
                className={isAuthenticated ? "status-dot online" : "status-dot"}
              />
              <strong>
                {isAuthenticated ? "Authenticated" : "Not signed in"}
              </strong>
            </div>
            <p className="busy-indicator">
              {isWorking
                ? "Processing upload or backend request. Please wait."
                : "Ready for upload, prediction, and report export."}
            </p>
            <p className="panel-text">Backend API: http://127.0.0.1:8000</p>
            <p className="panel-text">
              Connected actions: /register, /login, /predict, /submit-report
            </p>
            {token ? (
              <button
                className="secondary-button"
                type="button"
                onClick={handleLogout}
              >
                Sign out
              </button>
            ) : null}
          </div>
        </section>

        <section className="card auth-card" data-busy={isWorking}>
          <div className="section-header">
            <div>
              <p className="eyebrow">Access</p>
              <h2>Sign in to use the backend</h2>
            </div>
            <div className="toggle-group">
              <button
                type="button"
                className={authMode === "register" ? "toggle active" : "toggle"}
                onClick={() => setAuthMode("register")}
              >
                Register
              </button>
              <button
                type="button"
                className={authMode === "login" ? "toggle active" : "toggle"}
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === "register" ? (
              <label
                className={
                  authErrors.name ? "field field-error-state" : "field"
                }
              >
                Full name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onBlur={() => setName((current) => current.trim())}
                  placeholder="Enter your name"
                  disabled={isWorking}
                />
                {authErrors.name ? (
                  <span className="field-error">{authErrors.name}</span>
                ) : null}
              </label>
            ) : null}
            <label
              className={authErrors.phone ? "field field-error-state" : "field"}
            >
              Phone number
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Enter phone number"
                disabled={isWorking}
              />
              {authErrors.phone ? (
                <span className="field-error">{authErrors.phone}</span>
              ) : null}
            </label>
            <button className="primary-button" type="submit" disabled={busy}>
              {busy
                ? "Working..."
                : authMode === "register"
                  ? "Register and sign in"
                  : "Sign in"}
            </button>
          </form>
        </section>

        <section className="card form-card" data-busy={isWorking}>
          <div className="section-header">
            <div>
              <p className="eyebrow">Patient data</p>
              <h2>Enter or upload the report features</h2>
            </div>
            <div className="form-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={handlePredict}
                disabled={isWorking}
              >
                Predict
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={handleSubmitReport}
                disabled={isWorking}
              >
                Submit report and create CSV
              </button>
            </div>
          </div>
          {!isAuthenticated ? (
            <p className="panel-text">
              Sign in first to run a prediction or save a CSV report.
            </p>
          ) : null}

          <div className="upload-panel">
            <div>
              <p className="upload-title">Upload scanned report</p>
              <p className="panel-text">
                Upload a CSV, PDF, or image report to auto-fill the 30 feature
                fields. You can still review and edit the values before
                prediction or submit.
              </p>
            </div>
            <label className="upload-control">
              <span>Choose report file</span>
              <input
                type="file"
                accept=".csv,.pdf,image/*,text/csv,application/pdf"
                onChange={handleReportUpload}
                disabled={isWorking}
              />
            </label>
            {reportFileName ? (
              <div className="file-chip">Loaded file: {reportFileName}</div>
            ) : null}
            <p className="panel-text">
              {filledFeatures
                ? "All 30 report fields have values."
                : "Some report fields still need values or review."}
            </p>
          </div>

          <div className="feature-grid">
            {FEATURE_COLUMNS.map((column) => {
              const isDirty = featureTouched[column] || submitAttempted;
              const hasError = Boolean(featureErrors[column] && isDirty);

              return (
                <label
                  key={column}
                  className={hasError ? "field field-error-state" : "field"}
                >
                  {FIELD_LABELS[column]}
                  <input
                    type="number"
                    step="any"
                    value={features[column]}
                    onChange={(event) =>
                      updateFeature(column, event.target.value)
                    }
                    onBlur={() =>
                      setFeatureTouched((current) => ({
                        ...current,
                        [column]: true,
                      }))
                    }
                    placeholder="0.0"
                    disabled={isWorking}
                  />
                  {hasError ? (
                    <span className="field-error">{featureErrors[column]}</span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </section>

        <section className="results-grid">
          <article className="card result-card">
            <p className="eyebrow">Output</p>
            <h2>Status and results</h2>
            {output.error ? (
              <div className="alert error">{output.error}</div>
            ) : null}
            {output.message ? (
              <div className="alert success">{output.message}</div>
            ) : null}
            {output.prediction ? (
              <div className="result-summary">
                <div>
                  <span className="label">Prediction</span>
                  <strong>{output.prediction.prediction}</strong>
                </div>
                <div>
                  <span className="label">Probability</span>
                  <strong>
                    {(output.prediction.probability * 100).toFixed(2)}%
                  </strong>
                </div>
                <div>
                  <span className="label">Drug name</span>
                  <strong>{output.prediction.drug_name ?? "N/A"}</strong>
                </div>
                <div>
                  <span className="label">Dose</span>
                  <strong>{output.prediction.dose ?? "N/A"}</strong>
                </div>
                <div>
                  <span className="label">When to take</span>
                  <strong>{output.prediction.when_to_take ?? "N/A"}</strong>
                </div>
                <div className="result-summary-wide">
                  <span className="label">Stage assessment</span>
                  <strong>{output.prediction.stage_assessment}</strong>
                </div>
              </div>
            ) : null}
            {output.report ? (
              <div className="csv-box">
                <span className="label">CSV report</span>
                <strong>
                  {output.report.csv_report_path ?? "Not created"}
                </strong>
                <p className="panel-text">
                  Export includes your report ID, login details, prediction,
                  medicine guidance, and all 30 feature values.
                </p>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={handleDownloadCsv}
                  disabled={isWorking}
                >
                  Download CSV report
                </button>
              </div>
            ) : null}
            {output.report ? (
              <div className="csv-box">
                <span className="label">Stage assessment</span>
                <strong>{output.report.stage_assessment}</strong>
              </div>
            ) : null}
          </article>

          <article className="card medicine-card">
            <p className="eyebrow">Medicine guidance</p>
            <h2>What the backend recommends</h2>
            {output.medicine ? (
              <div className="medicine-stack">
                <div className="medicine-highlight">
                  <span className="label">Drug name</span>
                  <strong>{output.medicine.drug_name}</strong>
                </div>
                <div className="medicine-highlight">
                  <span className="label">Dose</span>
                  <strong>{output.medicine.dose}</strong>
                </div>
                <div className="medicine-highlight">
                  <span className="label">When to take</span>
                  <strong>{output.medicine.when_to_take}</strong>
                </div>
                <div>
                  <span className="label">Recommended medicines</span>
                  <ul>
                    {output.medicine.recommended_medicines.map(
                      (medicine: string) => (
                        <li key={medicine}>{medicine}</li>
                      ),
                    )}
                  </ul>
                </div>
                <div>
                  <span className="label">Supporting actions</span>
                  <ul>
                    {output.medicine.supporting_actions.map(
                      (action: string) => (
                        <li key={action}>{action}</li>
                      ),
                    )}
                  </ul>
                </div>
                <div>
                  <span className="label">Data sources</span>
                  <ul>
                    {output.medicine.data_sources.map((source: string) => (
                      <li key={source}>{source}</li>
                    ))}
                  </ul>
                </div>
                <p className="disclaimer">{output.medicine.disclaimer}</p>
              </div>
            ) : (
              <p className="panel-text">
                Run a prediction or submit a report to see the medicine output
                here.
              </p>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}

export default App;
