import { describe, expect, it } from "vitest";
import {
  createEmptyFeatureMap,
  extractFeaturesFromCsv,
  mapFeatureValuesFromText,
  parseCsvLine,
  validateAuthInputs,
  validateFeatureInputs,
} from "./reportTools";

describe("reportTools", () => {
  it("parses CSV lines with quoted values", () => {
    expect(parseCsvLine('name,"value,with,comma",3')).toEqual([
      "name",
      "value,with,comma",
      "3",
    ]);
  });

  it("extracts features from a CSV header row", () => {
    const csv = [
      "radius_mean,texture_mean,perimeter_mean,area_mean,smoothness_mean,compactness_mean,concavity_mean,concave_points_mean,symmetry_mean,fractal_dimension_mean,radius_se,texture_se,perimeter_se,area_se,smoothness_se,compactness_se,concavity_se,concave_points_se,symmetry_se,fractal_dimension_se,radius_worst,texture_worst,perimeter_worst,area_worst,smoothness_worst,compactness_worst,concavity_worst,concave_points_worst,symmetry_worst,fractal_dimension_worst",
      "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30",
    ].join("\n");

    const features = extractFeaturesFromCsv(csv);
    expect(features.radius_mean).toBe("1");
    expect(features.fractal_dimension_worst).toBe("30");
  });

  it("maps values from OCR-like text", () => {
    const text =
      "Radius mean: 17.99 Texture mean 10.38 Perimeter mean = 122.8 Area mean 1001";
    const features = mapFeatureValuesFromText(text);

    expect(features.radius_mean).toBe("17.99");
    expect(features.texture_mean).toBe("10.38");
    expect(features.perimeter_mean).toBe("122.8");
    expect(features.area_mean).toBe("1001");
  });

  it("validates feature inputs", () => {
    const features = createEmptyFeatureMap();
    const errors = validateFeatureInputs(features);
    expect(errors.radius_mean).toBe("Required");

    features.radius_mean = "-1";
    const negativeErrors = validateFeatureInputs(features);
    expect(negativeErrors.radius_mean).toBe("Value must be 0 or greater");
  });

  it("validates auth inputs", () => {
    expect(validateAuthInputs("", "123", true)).toMatchObject({
      name: "Enter at least 2 characters",
      phone: "Enter 7 to 20 digits",
    });
    expect(validateAuthInputs("John Doe", "1234567", true)).toEqual({});
  });
});
