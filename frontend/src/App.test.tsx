import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";

const mockMedicine = {
  recommended_medicines: ["Tamoxifen"],
  drug_name: "Oncology consultation required",
  dose: "Dose depends on protocol",
  when_to_take: "As prescribed",
  supporting_actions: ["Consult a doctor"],
  disclaimer: "Use medical supervision only",
  data_sources: ["medicine_catalog.json"],
};

const mockApi = vi.hoisted(() => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  predictReport: vi.fn(),
  submitReport: vi.fn(),
  submitReportWithCsv: vi.fn(),
  downloadReportCsv: vi.fn(),
}));

vi.mock("./api", () => mockApi);

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockApi.registerUser.mockResolvedValue({
      id: 1,
      name: "Test User",
      phone: "1234567890",
    });
    mockApi.loginUser.mockResolvedValue({
      access_token: "token",
      token_type: "bearer",
    });
    mockApi.predictReport.mockResolvedValue({
      prediction: "Malignant",
      probability: 0.91,
      medicine: mockMedicine,
      stage_assessment: "Stage cannot be determined from this model alone.",
      drug_name: mockMedicine.drug_name,
      dose: mockMedicine.dose,
      when_to_take: mockMedicine.when_to_take,
    });
    mockApi.submitReport.mockResolvedValue({
      id: 1,
      user_id: 1,
      prediction: "Malignant",
      probability: 0.91,
      medicine: mockMedicine,
      stage_assessment: "Stage cannot be determined from this model alone.",
      drug_name: mockMedicine.drug_name,
      dose: mockMedicine.dose,
      when_to_take: mockMedicine.when_to_take,
      created_at: "2026-03-25T00:00:00.000Z",
      features: {},
      csv_report_path: "/tmp/report.csv",
    });
    mockApi.submitReportWithCsv.mockResolvedValue({
      id: 2,
      user_id: 1,
      prediction: "Malignant",
      probability: 0.91,
      medicine: mockMedicine,
      stage_assessment: "Stage cannot be determined from this model alone.",
      drug_name: mockMedicine.drug_name,
      dose: mockMedicine.dose,
      when_to_take: mockMedicine.when_to_take,
      created_at: "2026-03-25T00:00:00.000Z",
      features: {},
      csv_report_path: "/tmp/report_2.csv",
    });
    mockApi.downloadReportCsv.mockResolvedValue(new Blob(["test"]));

    const urlMock = URL as unknown as {
      createObjectURL?: (blob: Blob) => string;
      revokeObjectURL?: (url: string) => void;
    };
    if (typeof urlMock.createObjectURL !== "function") {
      urlMock.createObjectURL = vi.fn(() => "blob:test");
    }
    if (typeof urlMock.revokeObjectURL !== "function") {
      urlMock.revokeObjectURL = vi.fn();
    }

    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      // Avoid jsdom navigation errors when simulating download links.
    });
  });

  it("shows validation errors for empty report fields", async () => {
    render(<App />);

    const registerButton = screen.getByRole("button", {
      name: /register and sign in/i,
    });
    await userEvent.click(registerButton);

    await userEvent.type(
      screen.getByPlaceholderText("Enter your name"),
      "Test User",
    );
    await userEvent.type(
      screen.getByPlaceholderText("Enter phone number"),
      "1234567890",
    );
    await userEvent.click(registerButton);

    await waitFor(() =>
      expect(screen.getByText(/authenticated/i)).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: /predict/i }));
    expect(await screen.findAllByText(/required/i)).not.toHaveLength(0);
  });

  it("auto-fills report values from uploaded csv data", async () => {
    render(<App />);

    await userEvent.type(
      screen.getByPlaceholderText("Enter your name"),
      "Test User",
    );
    await userEvent.type(
      screen.getByPlaceholderText("Enter phone number"),
      "1234567890",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /register and sign in/i }),
    );

    await waitFor(() =>
      expect(screen.getByText(/authenticated/i)).toBeInTheDocument(),
    );

    const csv = [
      "radius_mean,texture_mean,perimeter_mean,area_mean,smoothness_mean,compactness_mean,concavity_mean,concave_points_mean,symmetry_mean,fractal_dimension_mean,radius_se,texture_se,perimeter_se,area_se,smoothness_se,compactness_se,concavity_se,concave_points_se,symmetry_se,fractal_dimension_se,radius_worst,texture_worst,perimeter_worst,area_worst,smoothness_worst,compactness_worst,concavity_worst,concave_points_worst,symmetry_worst,fractal_dimension_worst",
      "17.99,10.38,122.8,1001,0.1184,0.2776,0.3001,0.1471,0.2419,0.07871,1.095,0.9053,8.589,153.4,0.006399,0.04904,0.05373,0.01587,0.03003,0.006193,25.38,17.33,184.6,2019,0.1622,0.6656,0.7119,0.2654,0.4601,0.1189",
    ].join("\n");

    const fileInput = screen.getByLabelText(/choose report file/i);
    const file = new File([csv], "report.csv", { type: "text/csv" });
    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByDisplayValue("17.99")).toBeInTheDocument();
      expect(screen.getByDisplayValue("0.1184")).toBeInTheDocument();
    });
  });

  it("submits uploaded csv through submit report button", async () => {
    render(<App />);

    await userEvent.type(
      screen.getByPlaceholderText("Enter your name"),
      "Test User",
    );
    await userEvent.type(
      screen.getByPlaceholderText("Enter phone number"),
      "1234567890",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /register and sign in/i }),
    );

    await waitFor(() =>
      expect(screen.getByText(/authenticated/i)).toBeInTheDocument(),
    );

    const csv = [
      "radius_mean,texture_mean,perimeter_mean,area_mean,smoothness_mean,compactness_mean,concavity_mean,concave_points_mean,symmetry_mean,fractal_dimension_mean,radius_se,texture_se,perimeter_se,area_se,smoothness_se,compactness_se,concavity_se,concave_points_se,symmetry_se,fractal_dimension_se,radius_worst,texture_worst,perimeter_worst,area_worst,smoothness_worst,compactness_worst,concavity_worst,concave_points_worst,symmetry_worst,fractal_dimension_worst",
      "17.99,10.38,122.8,1001,0.1184,0.2776,0.3001,0.1471,0.2419,0.07871,1.095,0.9053,8.589,153.4,0.006399,0.04904,0.05373,0.01587,0.03003,0.006193,25.38,17.33,184.6,2019,0.1622,0.6656,0.7119,0.2654,0.4601,0.1189",
    ].join("\n");

    const fileInput = screen.getByLabelText(/choose report file/i);
    const file = new File([csv], "report.csv", { type: "text/csv" });
    await userEvent.upload(fileInput, file);

    await userEvent.click(
      screen.getByRole("button", { name: /submit report and create csv/i }),
    );

    await waitFor(() => {
      expect(mockApi.submitReportWithCsv).toHaveBeenCalledTimes(1);
      expect(mockApi.submitReport).not.toHaveBeenCalled();
      expect(mockApi.downloadReportCsv).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText(/report saved, csv created, and download started/i),
      ).toBeInTheDocument();
    });
  });
});
