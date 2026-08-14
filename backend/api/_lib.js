import supabase from './db-client.js';

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function preflight(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

// Verify the incoming JWT and return the user (or null).
export async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function requireAuth(req, res) {
  const user = await getUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized — please sign in.' });
    return null;
  }
  return user;
}

export function fail(res, status, message) {
  res.status(status).json({ error: message });
}

// Minimal validator helpers (server-side validation, no external deps).
export const V = {
  str(value, { field, required = false, min = 0, max = 10000 } = {}) {
    if (value === undefined || value === null || value === '') {
      if (required) throw new Error(`${field} is required`);
      return null;
    }
    const s = String(value).trim();
    if (required && s.length < Math.max(1, min)) throw new Error(`${field} must be at least ${Math.max(1, min)} characters`);
    if (s.length > max) throw new Error(`${field} is too long`);
    return s;
  },
  email(value, { field = 'Email', required = false } = {}) {
    if (!value) {
      if (required) throw new Error(`${field} is required`);
      return null;
    }
    const s = String(value).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error(`${field} is not a valid email address`);
    return s;
  },
  num(value, { field, required = false, min = -Infinity, max = Infinity, def = 0 } = {}) {
    if (value === undefined || value === null || value === '') {
      if (required) throw new Error(`${field} is required`);
      return def;
    }
    const n = Number(value);
    if (Number.isNaN(n)) throw new Error(`${field} must be a number`);
    if (n < min) throw new Error(`${field} must be at least ${min}`);
    if (n > max) throw new Error(`${field} must be at most ${max}`);
    return n;
  },
  date(value, { field } = {}) {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new Error(`${field} is not a valid date`);
    return d.toISOString();
  },
  uuid(value) {
    if (!value) return null;
    return String(value);
  },
};

export function sanitizeUrls(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const row of input) {
    const type = (row?.type ?? '').toString().trim();
    const url = (row?.url ?? '').toString().trim();
    if (!type && !url) continue; // skip empty rows
    if (!type) throw new Error('Each URL row must have a URL type');
    if (!url) throw new Error('Each URL row must have a URL');
    if (!/^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(url)) throw new Error(`"${url}" is not a valid URL (must start with http:// or https://)`);
    out.push({ type, url });
  }
  return out;
}

export { supabase };
