// Reusable client-side validators. Each returns an error string or '' if valid.
// Kept intentionally small and dependency-free; mirrors the server-side checks.

export const isBlank = (v: string | null | undefined) => !v || !String(v).trim();

export function required(value: string | null | undefined, label = 'This field'): string {
  return isBlank(value) ? `${label} is required.` : '';
}

export function minLen(value: string, n: number, label = 'This field'): string {
  if (isBlank(value)) return '';
  return value.trim().length < n ? `${label} must be at least ${n} characters.` : '';
}

export function maxLen(value: string, n: number, label = 'This field'): string {
  if (!value) return '';
  return value.length > n ? `${label} must be under ${n} characters.` : '';
}

export function email(value: string, label = 'Email'): string {
  if (isBlank(value)) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? '' : `Enter a valid ${label.toLowerCase()} address.`;
}

// Phone: allow digits, spaces, +, -, (), min 7 / max 20 digits.
export function phone(value: string, label = 'Phone number'): string {
  if (isBlank(value)) return '';
  const cleaned = value.replace(/[\s\-()]/g, '');
  if (!/^\+?\d+$/.test(cleaned)) return `${label} may only contain digits, spaces, +, -, ( ).`;
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 7) return `${label} looks too short.`;
  if (digits.length > 15) return `${label} looks too long.`;
  return '';
}

export function password(value: string, { min = 6, requiredField = true } = {}): string {
  if (isBlank(value)) return requiredField ? 'Password is required (min 6 characters).' : '';
  if (value.length < min) return `Password must be at least ${min} characters.`;
  if (value.length > 72) return 'Password is too long.';
  return '';
}

export function nonNegativeNumber(value: string, label = 'Value'): string {
  if (isBlank(value)) return '';
  const n = Number(value);
  if (Number.isNaN(n)) return `${label} must be a number.`;
  if (n < 0) return `${label} cannot be negative.`;
  if (n > 1_000_000_000) return `${label} is unrealistically large.`;
  return '';
}

export function integerInRange(value: string, min: number, max: number, label = 'Value'): string {
  if (isBlank(value)) return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return `${label} must be a number.`;
  if (n < min || n > max) return `${label} must be between ${min} and ${max}.`;
  return '';
}

export function url(value: string, label = 'URL'): string {
  if (isBlank(value)) return '';
  return /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(value.trim()) ? '' : `${label} must be a valid link (http:// or https://).`;
}

// Ensures end date is not before start date. Both are yyyy-mm-dd strings.
export function dateOrder(start: string, end: string, label = 'End date'): string {
  if (!start || !end) return '';
  return end < start ? `${label} must be after the start date.` : '';
}

export function notFutureDate(value: string, label = 'Date'): string {
  if (!value) return '';
  const today = new Date(); today.setHours(23, 59, 59, 999);
  return new Date(value) > today ? `${label} cannot be in the future.` : '';
}

// Runs a map of field -> error and returns only the non-empty ones.
export function collect(map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) if (v) out[k] = v;
  return out;
}
