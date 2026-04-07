import type { DataToolsEntity } from "./data-tools-config";

export type LocalSpreadsheetPreviewState = {
  entity: DataToolsEntity;
  file: File;
  fileName: string;
  fileSignature: string;
  columns: string[];
  rows: Record<string, string>[];
  totalRows: number;
};

function isExcelFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");
}

export async function buildLocalSpreadsheetPreview(
  entity: DataToolsEntity,
  file: File,
): Promise<LocalSpreadsheetPreviewState> {
  if (!isExcelFile(file)) {
    throw new Error("File Excel (.xlsx atau .xls) diperlukan");
  }

  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", raw: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Sheet Excel tidak ditemukan");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const sheetRows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });

  if (sheetRows.length === 0) {
    throw new Error("File Excel kosong");
  }

  const columns = (sheetRows[0] ?? [])
    .map((value) => String(value ?? "").trim())
    .filter((column) => column.length > 0);
  if (columns.length === 0) {
    throw new Error("Header Excel tidak ditemukan");
  }

  const rows = sheetRows.slice(1, 6).map((row) =>
    Object.fromEntries(columns.map((column, index) => [column, String(row[index] ?? "").trim()])),
  );

  return {
    entity,
    file,
    fileName: file.name,
    fileSignature: `${file.name}:${file.size}:${file.lastModified}`,
    columns,
    rows,
    totalRows: Math.max(sheetRows.length - 1, 0),
  };
}
