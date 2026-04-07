import * as XLSX from "xlsx";

export const EXCEL_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function buildExcelBuffer(
  rows: Record<string, unknown>[],
  columns?: string[],
  sheetName = "Import",
) {
  const header = columns ?? Object.keys(rows[0] ?? {});
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header,
    skipHeader: false,
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  });
}

export function buildExcelBlob(
  rows: Record<string, unknown>[],
  columns?: string[],
  sheetName?: string,
) {
  return new Blob([buildExcelBuffer(rows, columns, sheetName)], { type: EXCEL_MIME });
}

export function readFirstSheetRows(bytes: Uint8Array) {
  const workbook = XLSX.read(bytes, { type: "array", raw: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Workbook tidak memiliki sheet");
  }

  return XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(workbook.Sheets[firstSheetName], {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
}
