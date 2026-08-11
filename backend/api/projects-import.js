import { supabase, preflight, fail, V } from './_lib.js';
import { requirePermission } from './_permissions.js';
import { nextProjectNo } from './_join.js';

// Bulk import of projects. Body: { rows: [...], mode?: 'update' | 'skip' | 'create' }
//   update (default): rows matching an existing project (by Project No, else
//                     project name + client) UPDATE instead of duplicating.
//   skip:             matching rows are skipped; only new ones inserted.
//   create:           always insert new rows.
// In-file duplicates are also detected.
export default async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');

  const user = await requirePermission(req, res, 'projects.import');
  if (!user) return;

  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
    const mode = ['update', 'skip', 'create'].includes(req.body?.mode) ? req.body.mode : 'update';
    if (!rows) return fail(res, 400, 'Expected a "rows" array.');
    if (rows.length === 0) return fail(res, 400, 'No rows to import.');
    if (rows.length > 2000) return fail(res, 400, 'Too many rows (max 2000 per import).');

    const [{ data: masters }, { data: emps }, { data: existing }] = await Promise.all([
      supabase.from('masters').select('category, value').is('deleted_at', null),
      supabase.from('crm_employees').select('id').is('deleted_at', null),
      supabase.from('dt_projects').select('id, project_no, project_name, client').is('deleted_at', null),
    ]);
    const valuesFor = (cat) => new Set((masters || []).filter((m) => m.category === cat).map((m) => m.value));
    const ctx = {
      projectStatus: valuesFor('project_status'),
      projectType: valuesFor('project_type'),
      priority: valuesFor('priority'),
      techStack: valuesFor('technology_stack'),
      empIds: new Set((emps || []).map((e) => e.id)),
    };

    const nameClientKey = (name, client) => `${(name || '').trim().toLowerCase()}|${(client || '').trim().toLowerCase()}`;
    const byProjectNo = new Map();
    const byNameClient = new Map();
    for (const p of existing || []) {
      if (p.project_no) byProjectNo.set(p.project_no.trim().toLowerCase(), p.id);
      byNameClient.set(nameClientKey(p.project_name, p.client), p.id);
    }

    const inserted = [];
    const updated = [];
    const skipped = [];
    const failed = [];
    const seenInFile = new Set();

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i] || {};
      try {
        const payload = validateRow(raw, ctx);

        const noKey = payload.project_no ? payload.project_no.trim().toLowerCase() : null;
        const ncKey = nameClientKey(payload.project_name, payload.client);
        const fileKey = noKey || ncKey;

        if (fileKey && seenInFile.has(fileKey)) {
          skipped.push({ row: i + 1, reason: 'Duplicate within file', project_no: payload.project_no || '' });
          continue;
        }
        if (fileKey) seenInFile.add(fileKey);

        const existingId = (noKey && byProjectNo.get(noKey)) || byNameClient.get(ncKey) || null;

        if (existingId && mode === 'skip') {
          skipped.push({ row: i + 1, reason: 'Already exists', project_no: payload.project_no || '' });
          continue;
        }

        if (existingId && mode === 'update') {
          const patch = { ...payload, updated_at: new Date().toISOString() };
          if (!patch.project_no) delete patch.project_no;
          const { data, error } = await supabase.from('dt_projects').update(patch).eq('id', existingId).select('id, project_no').single();
          if (error) throw new Error(error.message);
          updated.push({ row: i + 1, id: data.id, project_no: data.project_no });
          continue;
        }

        if (!payload.project_no) payload.project_no = await nextProjectNo();
        const { data, error } = await supabase.from('dt_projects').insert(payload).select('id, project_no').single();
        if (error) throw new Error(error.message);
        inserted.push({ row: i + 1, id: data.id, project_no: data.project_no });
        if (data.project_no) byProjectNo.set(data.project_no.trim().toLowerCase(), data.id);
        byNameClient.set(ncKey, data.id);
      } catch (err) {
        failed.push({ row: i + 1, error: err.message });
      }
    }

    return res.status(200).json({
      mode,
      insertedCount: inserted.length,
      updatedCount: updated.length,
      skippedCount: skipped.length,
      failedCount: failed.length,
      inserted, updated, skipped, failed,
    });
  } catch (err) {
    return fail(res, 500, err.message);
  }
}

function validateRow(body, ctx) {
  const status = V.str(body.status, { field: 'Status', required: true });
  if (!ctx.projectStatus.has(status)) throw new Error(`Unknown status "${status}"`);

  const projType = V.str(body.project_type, { field: 'Project type' });
  if (projType && !ctx.projectType.has(projType)) throw new Error(`Unknown project type "${projType}"`);
  const prio = V.str(body.priority, { field: 'Priority' }) || 'medium';
  if (!ctx.priority.has(prio)) throw new Error(`Unknown priority "${prio}"`);

  const mgr = V.uuid(body.project_manager_id);
  if (mgr && !ctx.empIds.has(mgr)) throw new Error('Project manager not found');
  const assigned = V.uuid(body.assigned_employee_id);
  if (assigned && !ctx.empIds.has(assigned)) throw new Error('Assigned employee not found');

  let stack = [];
  if (Array.isArray(body.technology_stack)) stack = body.technology_stack;
  if (stack.length) {
    for (const t of stack) if (!ctx.techStack.has(t)) throw new Error(`Unknown technology "${t}"`);
  }

  return {
    project_no: V.str(body.project_no, { field: 'Project No', max: 40 }),
    project_name: V.str(body.project_name, { field: 'Project name', required: true, min: 2 }),
    client: V.str(body.client, { field: 'Client', required: true, min: 1 }),
    lead_no: V.str(body.lead_no, { field: 'Lead reference', max: 40 }),
    project_type: projType,
    project_manager_id: mgr,
    assigned_employee_id: assigned,
    technology_stack: stack,
    urls: [],
    project_cost: V.num(body.project_cost, { field: 'Project cost', min: 0, def: 0 }),
    status,
    priority: prio,
    progress: V.num(body.progress, { field: 'Progress', min: 0, max: 100, def: 0 }),
    start_date: V.date(body.start_date, { field: 'Start date' }),
    expected_delivery: V.date(body.expected_delivery, { field: 'Expected delivery' }),
    remarks: V.str(body.remarks, { field: 'Remarks', max: 4000 }),
  };
}
