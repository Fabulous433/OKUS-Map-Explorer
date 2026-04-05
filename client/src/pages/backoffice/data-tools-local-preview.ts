import type { DataToolsEntity } from "./data-tools-config";

export type LocalCsvPreviewState = {
  entity: DataToolsEntity;
  file: File;
  fileName: string;
  columns: string[];
  rows: Record<string, string>[];
  totalRows: number;
};

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export function buildLocalCsvPreview(entity: DataToolsEntity, file: File, content: string): LocalCsvPreviewState {
  const normalized = content.replace(/^\uFEFF/, "");
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error("File CSV kosong");
  }

  const columns = parseCsvLine(lines[0]).filter((column) => column.length > 0);
  if (columns.length === 0) {
    throw new Error("Header CSV tidak ditemukan");
  }

  const rows = lines.slice(1, 6).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""]));
  });

  return {
    entity,
    file,
    fileName: file.name,
    columns,
    rows,
    totalRows: Math.max(lines.length - 1, 0),
  };
}
