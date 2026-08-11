import { supabase, preflight, fail } from './_lib.js';
import { requirePermission, ALL_PERMISSIONS } from './_permissions.js';

// GET  /api/role-permissions?role_id=...  -> { permissions: [...] }
// PUT  /api/role-permissions { role_id, permissions: [...] } -> replaces the set
export default async function handler(req, res) {
  if (preflight(req, res)) return;

  try {
    if (req.method === 'GET') {
      const user = await requirePermission(req, res, 'roles.view');
      if (!user) return;
      const roleId = req.query?.role_id;
      if (!roleId) return fail(res, 400, 'role_id is required');
      const { data, error } = await supabase
        .from('dt_role_permissions').select('permission').eq('role_id', roleId);
      if (error) throw error;
      return res.status(200).json({ permissions: (data || []).map((r) => r.permission) });
    }

    if (req.method === 'PUT') {
      // Assigning/removing permissions is an edit on the Roles module.
      const user = await requirePermission(req, res, 'roles.edit');
      if (!user) return;
      const { role_id, permissions } = req.body || {};
      if (!role_id) return fail(res, 400, 'role_id is required');
      if (!Array.isArray(permissions)) return fail(res, 400, 'permissions must be an array');

      // Only accept known permission keys (plus wildcard).
      const valid = permissions.filter((p) => p === '*' || ALL_PERMISSIONS.includes(p));

      // Replace the full set atomically-ish: delete then insert.
      const { error: delErr } = await supabase.from('dt_role_permissions').delete().eq('role_id', role_id);
      if (delErr) throw delErr;
      if (valid.length) {
        const rows = valid.map((permission) => ({ role_id, permission }));
        const { error: insErr } = await supabase.from('dt_role_permissions').insert(rows);
        if (insErr) throw insErr;
      }
      return res.status(200).json({ ok: true, permissions: valid });
    }

    return fail(res, 405, 'Method not allowed');
  } catch (err) {
    return fail(res, 500, err.message);
  }
}
