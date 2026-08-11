import { preflight, fail } from './_lib.js';
import { requirePermission } from './_permissions.js';
import { nextLeadNo, nextProjectNo } from './_join.js';

// Returns the next auto-generated document numbers for previewing in forms.
// GET /api/next-no?type=lead | project
export default async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'GET') return fail(res, 405, 'Method not allowed');

  const type = req.query?.type;
  // Previewing a number is part of creating that record.
  const perm = type === 'project' ? 'projects.create' : 'leads.create';
  const user = await requirePermission(req, res, perm);
  if (!user) return;

  try {
    if (type === 'lead') return res.status(200).json({ next: await nextLeadNo() });
    if (type === 'project') return res.status(200).json({ next: await nextProjectNo() });
    return fail(res, 400, 'Unknown type');
  } catch (err) {
    return fail(res, 500, err.message);
  }
}
