import { preflight, fail } from './_lib.js';
import { requirePermission, PERMISSION_CATALOG, actionLabel } from './_permissions.js';

// Returns the full permission catalog (grouped by module) for the
// role-permission assignment UI. Requires roles.view.
export default async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'GET') return fail(res, 405, 'Method not allowed');

  const user = await requirePermission(req, res, 'roles.view');
  if (!user) return;

  const catalog = PERMISSION_CATALOG.map((m) => ({
    module: m.module,
    label: m.label,
    actions: m.actions.map((a) => ({ key: `${m.module}.${a}`, action: a, label: actionLabel(a) })),
  }));
  return res.status(200).json({ catalog });
}
