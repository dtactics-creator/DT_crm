import { supabase } from './_lib.js';

/**
 * CENTRALIZED PERMISSION CATALOG (single source of truth).
 *
 * Naming convention: `<module>.<action>`  e.g. `leads.create`.
 * To add a new module or action later, just extend this array — no other
 * code changes are needed. The frontend fetches this catalog via
 * GET /api/permissions so nothing is hard-coded inside components.
 *
 * The special permission '*' grants full access (super admin).
 */
export const PERMISSION_CATALOG = [
  // Dashboard is available to every authenticated user, so it is intentionally
  // NOT listed here as a grantable permission.
  { module: 'leads', label: 'Leads', actions: ['view', 'create', 'edit', 'delete', 'convert', 'import', 'export', 'view_budget'] },
  { module: 'projects', label: 'Projects', actions: ['view', 'create', 'edit', 'delete', 'import', 'export', 'view_cost'] },
  { module: 'masters', label: 'Masters', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'employees', label: 'Employees', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'roles', label: 'Roles & Permissions', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'templates', label: 'Templates', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'reports', label: 'Reports', actions: ['view'] },
];

const ACTION_LABELS = {
  view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', convert: 'Convert',
  import: 'Import', export: 'Export', view_budget: 'View Budget', view_cost: 'View Cost',
};

export function actionLabel(a) { return ACTION_LABELS[a] || a; }

// Flat list of every valid permission key.
export const ALL_PERMISSIONS = PERMISSION_CATALOG.flatMap((m) => m.actions.map((a) => `${m.module}.${a}`));

/**
 * Resolve the authenticated user's effective permissions from the DATABASE.
 * Never trusts anything from the client.
 *
 * Link chain: auth user email -> crm_employees.email -> role name ->
 * dt_roles2 -> dt_role_permissions.
 *
 * Rules:
 *  - Role permission '*' (or an unlinked/owner account) => super admin (all).
 *  - Otherwise the exact set stored for the role.
 */
export async function getEffectivePermissions(user) {
  const email = (user?.email || '').toLowerCase();

  // Find the employee linked to this auth account (by email).
  const { data: emp } = await supabase
    .from('crm_employees')
    .select('id, role, status')
    .ilike('email', email)
    .is('deleted_at', null)
    .maybeSingle();

  // Owner / bootstrap accounts that aren't tied to an employee are admins.
  if (!emp) {
    return { isAdmin: true, permissions: ALL_PERMISSIONS, employee: null, role: null };
  }

  // Inactive employees get nothing.
  if (emp.status && emp.status !== 'active') {
    return { isAdmin: false, permissions: [], employee: emp, role: null };
  }

  // Resolve the role record from the employee's role name.
  const { data: role } = await supabase
    .from('dt_roles2')
    .select('id, name, type, status')
    .ilike('name', emp.role)
    .is('deleted_at', null)
    .maybeSingle();

  if (!role) return { isAdmin: false, permissions: [], employee: emp, role: null };

  const { data: rps } = await supabase
    .from('dt_role_permissions')
    .select('permission')
    .eq('role_id', role.id);

  const perms = (rps || []).map((r) => r.permission);
  if (perms.includes('*')) {
    return { isAdmin: true, permissions: ALL_PERMISSIONS, employee: emp, role };
  }
  return { isAdmin: false, permissions: perms, employee: emp, role };
}

/**
 * Guard an endpoint. Verifies JWT + checks the required permission.
 * Returns the user on success, or null after having sent 401/403.
 *
 *   const user = await requirePermission(req, res, 'leads.create');
 *   if (!user) return;
 */
export async function requirePermission(req, res, permission) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Unauthorized — please sign in.' }); return null; }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) { res.status(401).json({ error: 'Unauthorized — please sign in.' }); return null; }

  const { isAdmin, permissions } = await getEffectivePermissions(data.user);
  if (isAdmin || permissions.includes(permission) || permissions.includes('*')) {
    return data.user;
  }
  res.status(403).json({ error: `Forbidden — you do not have permission to ${permission.replace('.', ' ')}.` });
  return null;
}

// Map an HTTP method to a CRUD action for a given module.
export function methodPermission(module, method) {
  switch (method) {
    case 'GET': return `${module}.view`;
    case 'POST': return `${module}.create`;
    case 'PUT': return `${module}.edit`;
    case 'PATCH': return `${module}.edit`;
    case 'DELETE': return `${module}.delete`;
    default: return `${module}.view`;
  }
}
