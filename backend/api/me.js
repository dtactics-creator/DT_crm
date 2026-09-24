import { preflight, fail, supabase, getUser } from './_lib.js';
import { getEffectivePermissions } from './_permissions.js';

// Returns the authenticated user's authoritative effective permissions.
// The frontend uses this to gate menus, routes and buttons.
export default async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'GET') return fail(res, 405, 'Method not allowed');

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return fail(res, 401, 'Unauthorized — please sign in.');

  const user = await getUser(req);
  if (!user) {
    console.error('[me.js] getUser returned null for token');
    return fail(res, 401, 'Unauthorized — please sign in.');
  }

  try {
    const { isAdmin, permissions, employee, role } = await getEffectivePermissions(user);
    return res.status(200).json({
      user: { id: user.id, email: user.email },
      isAdmin,
      permissions,
      employee: employee ? { id: employee.id, role: employee.role } : null,
      role: role ? { id: role.id, name: role.name, type: role.type } : null,
    });
  } catch (err) {
    return fail(res, 500, err.message);
  }
}
