const EXCEL_SAFE_PATTERNS = [
  /(^|_)npwpd$/i,
  /(^|_)nik($|_)/i,
  /(^|_)nopd$/i,
  /(^|_)no_rek_pajak$/i,
  /(^|_)rek_pajak_id$/i,
  /(^|_)wp_id$/i,
] as const;

export function shouldForceExcelText(column: string) {
  return EXCEL_SAFE_PATTERNS.some((pattern) => pattern.test(column));
}

export function toExcelSafeCell(column: string, value: string) {
  if (!shouldForceExcelText(column)) {
    return value;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return value;
  }

  const escaped = trimmed.replace(/"/g, "\"\"");
  return `="${escaped}"`;
}
