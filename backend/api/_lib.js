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
  str(value, options = {}) {
    const fieldName = options.field || options.name || 'Field';
    if (value === undefined || value === null || value === '') {
      if (options.required) throw new Error(`${fieldName} is required`);
      return options.default !== undefined ? options.default : null;
    }
    const s = String(value).trim();
    const min = options.min || 0;
    const max = options.max || 10000;
    if (options.required && s.length < Math.max(1, min)) throw new Error(`${fieldName} must be at least ${Math.max(1, min)} characters`);
    if (s.length > max) throw new Error(`${fieldName} is too long`);
    return s;
  },
  email(value, options = {}) {
    const fieldName = options.field || options.name || 'Email';
    if (!value) {
      if (options.required) throw new Error(`${fieldName} is required`);
      return null;
    }
    const s = String(value).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error(`${fieldName} is not a valid email address`);
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

import crypto from 'crypto';

export function generateTrackingToken() {
  return crypto.randomBytes(12).toString('hex');
}

export function sanitizeUrls(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const row of input) {
    const type = (row?.type ?? '').toString().trim();
    const url = (row?.url ?? '').toString().trim();
    if (!type && !url) continue; // skip empty rows
    if (!type) throw new Error('Each URL row must have a URL type/label');
    if (!url) throw new Error('Each URL row must have a URL');
    if (!/^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(url)) throw new Error(`"${url}" is not a valid URL (must start with http:// or https://)`);
    
    const id = row?.id ? String(row.id) : `url_${crypto.randomBytes(6).toString('hex')}`;
    const tracking_enabled = Boolean(row?.tracking_enabled);
    let tracking_token = row?.tracking_token ? String(row.tracking_token).trim() : null;

    if (tracking_enabled && !tracking_token) {
      tracking_token = generateTrackingToken();
    }

    out.push({
      id,
      type,
      url,
      tracking_enabled,
      tracking_token: tracking_token || null,
      first_opened_at: row?.first_opened_at || null,
      last_opened_at: row?.last_opened_at || null,
      total_visits: typeof row?.total_visits === 'number' ? row.total_visits : 0,
      unique_visitors: typeof row?.unique_visitors === 'number' ? row.unique_visitors : 0,
      unique_pages: typeof row?.unique_pages === 'number' ? row.unique_pages : 0,
    });
  }
  return out;
}

export { supabase };
