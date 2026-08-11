import { preflight, fail, supabase } from './_lib.js';
import { getEffectivePermissions } from './_permissions.js';

// Returns the authenticated user's authoritative effective permissions.
// The frontend uses this to gate menus, routes and buttons.
export default async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'GET') return fail(res, 405, 'Method not allowed');

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return fail(res, 401, 'Unauthorized — please sign in.');
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return fail(res, 401, 'Unauthorized — please sign in.');

  try {
    const { isAdmin, permissions, employee, role } = await getEffectivePermissions(data.user);
    return res.status(200).json({
      user: { id: data.user.id, email: data.user.email },
      isAdmin,
      permissions,
      employee: employee ? { id: employee.id, role: employee.role } : null,
      role: role ? { id: role.id, name: role.name, type: role.type } : null,
    });
  } catch (err) {
    return fail(res, 500, err.message);
  }
}
