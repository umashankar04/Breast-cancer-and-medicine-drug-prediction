export const FEATURE_COLUMNS = [
  "radius_mean",
  "texture_mean",
  "perimeter_mean",
  "area_mean",
  "smoothness_mean",
  "compactness_mean",
  "concavity_mean",
  "concave_points_mean",
  "symmetry_mean",
  "fractal_dimension_mean",
  "radius_se",
  "texture_se",
  "perimeter_se",
  "area_se",
  "smoothness_se",
  "compactness_se",
  "concavity_se",
  "concave_points_se",
  "symmetry_se",
  "fractal_dimension_se",
  "radius_worst",
  "texture_worst",
  "perimeter_worst",
  "area_worst",
  "smoothness_worst",
  "compactness_worst",
  "concavity_worst",
  "concave_points_worst",
  "symmetry_worst",
  "fractal_dimension_worst",
] as const;

export const FIELD_LABELS: Record<string, string> = {
  radius_mean: "Radius mean",
  texture_mean: "Texture mean",
  perimeter_mean: "Perimeter mean",
  area_mean: "Area mean",
  smoothness_mean: "Smoothness mean",
  compactness_mean: "Compactness mean",
  concavity_mean: "Concavity mean",
  concave_points_mean: "Concave points mean",
  symmetry_mean: "Symmetry mean",
  fractal_dimension_mean: "Fractal dimension mean",
  radius_se: "Radius SE",
  texture_se: "Texture SE",
  perimeter_se: "Perimeter SE",
  area_se: "Area SE",
  smoothness_se: "Smoothness SE",
  compactness_se: "Compactness SE",
  concavity_se: "Concavity SE",
  concave_points_se: "Concave points SE",
  symmetry_se: "Symmetry SE",
  fractal_dimension_se: "Fractal dimension SE",
  radius_worst: "Radius worst",
  texture_worst: "Texture worst",
  perimeter_worst: "Perimeter worst",
  area_worst: "Area worst",
  smoothness_worst: "Smoothness worst",
  compactness_worst: "Compactness worst",
  concavity_worst: "Concavity worst",
  concave_points_worst: "Concave points worst",
  symmetry_worst: "Symmetry worst",
  fractal_dimension_worst: "Fractal dimension worst",
};

export type FeatureMap = Record<string, string>;
export type FeatureErrors = Record<string, string>;

export function createEmptyFeatureMap(): FeatureMap {
  return FEATURE_COLUMNS.reduce<FeatureMap>((accumulator, column) => {
    accumulator[column] = "";
    return accumulator;
  }, {});
}

export function normalizeColumnName(columnName: string) {
  let normalized = columnName.trim().toLowerCase().replace(/[()]/g, "");
  normalized = normalized.replace(/[\s-]+/g, "_");

  while (normalized.includes("__")) {
    normalized = normalized.replace(/__+/g, "_");
  }

  return normalized;
}

export function parseCsvLine(line: string) {
  const values: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        currentValue += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue.trim());
  return values;
}

function labelToPattern(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[\s_\-]+/g, "[\\s_\\-]*");
}

function createNumberPattern() {
  return "([-+]?(?:\\d*\\.\\d+|\\d+)(?:[eE][-+]?\\d+)?)";
}

export function validateFeatureInputs(features: FeatureMap): FeatureErrors {
  const errors: FeatureErrors = {};

  FEATURE_COLUMNS.forEach((column) => {
    const rawValue = features[column]?.trim();

    if (!rawValue) {
      errors[column] = "Required";
      return;
    }

    const parsedValue = Number(rawValue);
    if (Number.isNaN(parsedValue)) {
      errors[column] = "Enter a valid number";
      return;
    }

    if (parsedValue < 0) {
      errors[column] = "Value must be 0 or greater";
    }
  });

  return errors;
}

export function validateAuthInputs(
  name: string,
  phone: string,
  isRegisterMode: boolean,
) {
  const errors: { name?: string; phone?: string } = {};

  if (isRegisterMode && name.trim().length < 2) {
    errors.name = "Enter at least 2 characters";
  }

  if (!/^\d{7,20}$/.test(phone.trim())) {
    errors.phone = "Enter 7 to 20 digits";
  }

  return errors;
}

export function mapFeatureValuesFromText(text: string): FeatureMap {
  const valueByFeature = createEmptyFeatureMap();
  const lowerText = text.replace(/\r/g, "\n");
  const numberPattern = createNumberPattern();
  const seenLabels = new Set<string>();

  FEATURE_COLUMNS.forEach((feature) => {
    const labelVariants = [feature, FIELD_LABELS[feature]];

    for (const label of labelVariants) {
      const pattern = labelToPattern(label);
      const regex = new RegExp(
        `${pattern}\\s*[:=\-]?\\s*${numberPattern}`,
        "i",
      );
      const match = lowerText.match(regex);

      if (match?.[1] !== undefined) {
        valueByFeature[feature] = match[1];
        seenLabels.add(feature);
        break;
      }
    }
  });

  const missingFeatures = FEATURE_COLUMNS.filter(
    (feature) => valueByFeature[feature] === "",
  );

  if (missingFeatures.length > 0) {
    const numericValues = Array.from(
      lowerText.matchAll(new RegExp(numberPattern, "g")),
      (match) => match[1],
    );
    let numericIndex = 0;

    missingFeatures.forEach((feature) => {
      while (
        numericIndex < numericValues.length &&
        valueByFeature[feature] === ""
      ) {
        const candidate = numericValues[numericIndex];
        numericIndex += 1;
        if (candidate !== undefined) {
          valueByFeature[feature] = candidate;
        }
      }
    });
  }

  return valueByFeature;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read file contents."));
    reader.readAsText(file);
  });
}

export function extractFeaturesFromCsv(csvText: string): FeatureMap {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error(
      "The CSV report must contain a header row and at least one data row.",
    );
  }

  const headers = parseCsvLine(lines[0]).map(normalizeColumnName);
  const values = parseCsvLine(lines[1]);
  const matchedValues = createEmptyFeatureMap();

  headers.forEach((header, index) => {
    const value = values[index];
    const feature = FEATURE_COLUMNS.find((column) => column === header);

    if (feature && value !== undefined) {
      matchedValues[feature] = value;
    }
  });

  return matchedValues;
}

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfModule = (await import("pdfjs-dist")) as any;
  const { getDocument, GlobalWorkerOptions } = pdfModule;

  GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loadingTask = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  const pdfDocument = await loadingTask.promise;
  const extractedPages: string[] = [];

  for (
    let pageNumber = 1;
    pageNumber <= pdfDocument.numPages;
    pageNumber += 1
  ) {
    const page = await pdfDocument.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ")
      .trim();

    extractedPages.push(pageText);
  }

  return extractedPages.join("\n");
}

async function extractTextFromImage(file: File): Promise<string> {
  const { recognize } = (await import("tesseract.js")) as any;
  const result = await recognize(file, "eng");
  return String(result?.data?.text ?? "");
}

async function renderPdfToText(file: File): Promise<string> {
  const pdfModule = (await import("pdfjs-dist")) as any;
  const { getDocument, GlobalWorkerOptions } = pdfModule;

  GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loadingTask = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  const pdfDocument = await loadingTask.promise;
  const ocrPages: string[] = [];

  for (
    let pageNumber = 1;
    pageNumber <= pdfDocument.numPages;
    pageNumber += 1
  ) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      continue;
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
    const { recognize } = (await import("tesseract.js")) as any;
    const result = await recognize(canvas.toDataURL("image/png"), "eng");
    ocrPages.push(String(result?.data?.text ?? ""));
  }

  return ocrPages.join("\n");
}

export async function extractFeaturesFromFile(
  file: File,
): Promise<{ features: FeatureMap; sourceLabel: string }> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".csv")) {
    return {
      features: extractFeaturesFromCsv(await readFileAsText(file)),
      sourceLabel: file.name,
    };
  }

  if (fileName.endsWith(".pdf")) {
    const text = await extractTextFromPdf(file);
    let features = mapFeatureValuesFromText(text);
    const filledCount = FEATURE_COLUMNS.filter(
      (column) => features[column].trim() !== "",
    ).length;

    if (filledCount < 10) {
      const ocrText = await renderPdfToText(file);
      const mergedText = [text, ocrText].filter(Boolean).join("\n");
      features = mapFeatureValuesFromText(mergedText);
    }

    return { features, sourceLabel: file.name };
  }

  if (file.type.startsWith("image/")) {
    const text = await extractTextFromImage(file);
    return { features: mapFeatureValuesFromText(text), sourceLabel: file.name };
  }

  throw new Error("Upload a CSV, PDF, or image file.");
}
