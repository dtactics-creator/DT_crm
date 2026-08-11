import { formatDMY, formatDMYTime } from './date';

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(value: number | null | undefined, currency = 'INR'): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  }).format(n);
}

export function formatCompact(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  // Indian compact notation (lakh / crore) with a rupee prefix.
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}\u20B9${(abs / 1e7).toFixed(abs % 1e7 === 0 ? 0 : 1)}Cr`;
  if (abs >= 1e5) return `${sign}\u20B9${(abs / 1e5).toFixed(abs % 1e5 === 0 ? 0 : 1)}L`;
  if (abs >= 1e3) return `${sign}\u20B9${(abs / 1e3).toFixed(abs % 1e3 === 0 ? 0 : 1)}K`;
  return `${sign}\u20B9${abs}`;
}

// User-facing date display uses the global DD/MM/YY standard (see lib/date.ts).
export function formatDate(value: string | null | undefined): string {
  return formatDMY(value) || '—';
}

export function formatDateTime(value: string | null | undefined): string {
  return formatDMYTime(value) || '—';
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value).getTime();
  if (Number.isNaN(d)) return '—';
  const diff = Date.now() - d;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

const AVATAR_COLORS = [
  '#1f4ef0', '#0ea5e9', '#8b5cf6', '#ec4899', '#f97316',
  '#10b981', '#14b8a6', '#f59e0b', '#ef4444', '#6366f1',
];
export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
