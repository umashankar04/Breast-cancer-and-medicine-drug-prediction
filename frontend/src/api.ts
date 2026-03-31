export type MedicineRecommendation = {
  recommended_medicines: string[];
  drug_name: string;
  dose: string;
  when_to_take: string;
  supporting_actions: string[];
  disclaimer: string;
  data_sources: string[];
};

export type PredictionResponse = {
  prediction: string;
  probability: number;
  medicine: MedicineRecommendation;
  stage_assessment: string;
  drug_name?: string | null;
  dose?: string | null;
  when_to_take?: string | null;
};

export type ReportResponse = {
  id: number;
  user_id: number;
  prediction: string;
  probability: number;
  medicine: MedicineRecommendation;
  stage_assessment: string;
  drug_name?: string | null;
  dose?: string | null;
  when_to_take?: string | null;
  created_at: string;
  features: Record<string, number>;
  csv_report_path?: string | null;
  csv_download_url?: string | null;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

export type UserResponse = {
  id: number;
  name: string;
  phone: string;
};

function getApiBaseUrls() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredBaseUrl) {
    return [configuredBaseUrl.replace(/\/$/, "")];
  }

  return ["/api", "http://127.0.0.1:8000"];
}

const API_BASE_URLS = getApiBaseUrls();

async function readResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    let message = "Request failed";

    if (typeof payload === "string") {
      message = payload || message;
    } else if (payload && typeof payload === "object") {
      const detail = (payload as { detail?: unknown }).detail;
      if (typeof detail === "string") {
        message = detail;
      } else if (
        detail &&
        typeof detail === "object" &&
        "missing_features" in (detail as Record<string, unknown>)
      ) {
        const missingFeatures = (detail as { missing_features?: unknown })
          .missing_features;
        if (Array.isArray(missingFeatures) && missingFeatures.length > 0) {
          message = `Missing report fields: ${missingFeatures.join(", ")}`;
        }
      }
    }

    throw new Error(message);
  }

  return payload as T;
}

async function request<T>(
  path: string,
  init: RequestInit,
  actionLabel: string,
): Promise<T> {
  for (const apiBaseUrl of API_BASE_URLS) {
    try {
      const response = await fetch(`${apiBaseUrl}${path}`, init);
      return readResponse<T>(response);
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  throw new Error(
    `Unable to ${actionLabel}. Start the API server or set VITE_API_BASE_URL.`,
  );
}

export async function registerUser(
  name: string,
  phone: string,
): Promise<UserResponse> {
  return request<UserResponse>(
    `/register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    },
    "register",
  );
}

export async function loginUser(phone: string): Promise<LoginResponse> {
  return request<LoginResponse>(
    `/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    },
    "login",
  );
}

export async function predictReport(
  features: Record<string, number>,
  token: string,
): Promise<PredictionResponse> {
  return request<PredictionResponse>(
    `/predict`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(features),
    },
    "predict",
  );
}

export async function submitReport(
  features: Record<string, number>,
  token: string,
): Promise<ReportResponse> {
  return request<ReportResponse>(
    `/submit-report`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(features),
    },
    "submit-report",
  );
}

export async function submitReportWithCsv(
  csvFile: File,
  token: string,
): Promise<ReportResponse> {
  const formData = new FormData();
  formData.append("csv_file", csvFile, csvFile.name);

  return request<ReportResponse>(
    `/submit-report`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
    "submit-report",
  );
}

export async function downloadReportCsv(
  reportId: number,
  token: string,
): Promise<Blob> {
  for (const apiBaseUrl of API_BASE_URLS) {
    try {
      const response = await fetch(`${apiBaseUrl}/reports/${reportId}/csv`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.text();
        throw new Error(payload || "Request failed");
      }

      return response.blob();
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  throw new Error(
    "Unable to download the report CSV. Start the API server or set VITE_API_BASE_URL.",
  );
}
