// ---------------------------------------------------------------------------
// CENTRALIZED DATE HANDLING
//
// Single source of truth for the user-facing date format across the entire app:
// forms, tables, filters, reports, imports and exports.
//
//   User-facing format: DD/MM/YY   (e.g. 10/08/26 = 10 August 2026)
//   Internal storage:   ISO 8601   (yyyy-mm-ddTHH:MM:SSZ)
//
// Never show MM/DD/YYYY, YYYY-MM-DD or locale-dependent formats to users.
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');

/** Format any date-ish value as DD/MM/YY for display and export. Returns '' for empty. */
export function formatDMY(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
}

/** Format as DD/MM/YY HH:mm for timestamps. */
export function formatDMYTime(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${formatDMY(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Parse a user-supplied date string. Accepts (in priority order):
 *   - DD/MM/YY or DD/MM/YYYY         (canonical user format, also DD-MM-YY / DD.MM.YY)
 *   - ISO yyyy-mm-dd / full ISO      (native <input type="date"> values, DB values)
 * Returns an ISO string, or null for empty input, or 'INVALID' if unparseable.
 *
 * IMPORTANT: `10/08/26` is always interpreted as 10 August 2026 (day-first),
 * never October 8 — matching the app's DD/MM/YY standard.
 */
export function parseDMY(input: string | null | undefined): string | null | 'INVALID' {
  const s = (input ?? '').trim();
  if (!s) return null;

  // Day-first: DD/MM/YY(YY) with / - or . separators.
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/);
  if (dmy) {
    let [, dd, mm, yy] = dmy;
    const day = Number(dd);
    const month = Number(mm);
    let year = Number(yy);
    if (yy.length === 2) year = 2000 + year; // 26 -> 2026
    if (month < 1 || month > 12 || day < 1 || day > 31) return 'INVALID';
    const d = new Date(Date.UTC(year, month - 1, day));
    // Guard against overflow (e.g. 31/02).
    if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return 'INVALID';
    return d.toISOString();
  }

  // ISO yyyy-mm-dd or full ISO timestamp.
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? 'INVALID' : d.toISOString();
  }

  // Last resort: let the engine try, but reject the ambiguous MM/DD default.
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? 'INVALID' : d.toISOString();
}

/** Convert any stored/ISO value to a yyyy-mm-dd string for native <input type="date">. */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today's date as a yyyy-mm-dd string (for date inputs). */
export function todayInputValue(): string {
  return toDateInputValue(new Date().toISOString());
}
