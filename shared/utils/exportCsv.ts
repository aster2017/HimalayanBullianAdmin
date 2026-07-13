// Lightweight client-side CSV export. Builds a CSV from already-loaded rows and
// triggers a browser download — no backend endpoint needed. Suitable for the
// admin-sized datasets the report pages hold in memory.

export type CsvColumn<T> = {
  /** Column header shown in the first CSV row. */
  header: string;
  /** Pull the cell value out of a row. Return string | number | null/undefined. */
  value: (row: T) => string | number | null | undefined;
};

/** RFC-4180 escaping: wrap in quotes when the value contains a comma, quote, or newline. */
function escapeCell(raw: string | number | null | undefined): string {
  const s = raw === null || raw === undefined ? '' : String(raw);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Convert rows + column defs into a CSV string and download it as `<filename>.csv`.
 * No-op (returns false) when there are no rows, so callers can disable the button.
 */
export function exportCsv<T>(rows: T[], columns: CsvColumn<T>[], filename: string): boolean {
  if (!rows || rows.length === 0) return false;

  const headerLine = columns.map(c => escapeCell(c.header)).join(',');
  const bodyLines = rows.map(row => columns.map(c => escapeCell(c.value(row))).join(','));
  // Prepend a UTF-8 BOM so Excel renders non-ASCII (e.g. Rs., names) correctly.
  const csv = '﻿' + [headerLine, ...bodyLines].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

/** `customers-2026-06-26` style suffix for export filenames (date only, local). */
export function csvDateStamp(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
