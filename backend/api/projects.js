import { supabase, preflight, fail, V } from './_lib.js';
import { requirePermission, methodPermission } from './_permissions.js';
import { employeeMap, leadMap, nextProjectNo } from './_join.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const user = await requirePermission(req, res, methodPermission('projects', req.method));
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const [{ data, error }, emps, leads] = await Promise.all([
        supabase.from('dt_projects').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
        employeeMap(),
        leadMap(),
      ]);
      if (error) throw error;
      const rows = (data || []).map((p) => enrichRow(p, emps, leads));
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const payload = validate(req.body);
      if (!payload.project_no) payload.project_no = await nextProjectNo();
      const { data, error } = await supabase.from('dt_projects').insert(payload).select().single();
      if (error) throw error;
      return res.status(201).json(await enrich(data));
    }

    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Project id is required');
      const payload = validate(req.body);
      payload.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from('dt_projects').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(await enrich(data));
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Project id is required');
      const { error } = await supabase.from('dt_projects')
        .update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return fail(res, 405, 'Method not allowed');
  } catch (err) {
    const isValidation = /required|valid|must|too long/i.test(err.message || '');
    return fail(res, isValidation ? 400 : 500, err.message);
  }
}

function enrichRow(p, emps, leads) {
  return {
    ...p,
    manager: p.project_manager_id ? emps[p.project_manager_id] || null : null,
    assigned_employee: p.assigned_employee_id ? emps[p.assigned_employee_id] || null : null,
    lead: p.lead_id ? leads[p.lead_id] || null : null,
  };
}

async function enrich(p) {
  const [emps, leads] = await Promise.all([employeeMap(), leadMap()]);
  return enrichRow(p, emps, leads);
}

// Validate and clean the dynamic URL rows. Each must have a type and a valid URL.
function sanitizeUrls(input) {
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

function validate(body) {
  return {
    project_no: V.str(body.project_no, { field: 'Project No', max: 40 }),
    project_name: V.str(body.project_name, { field: 'Project name', required: true, min: 2 }),
    client: V.str(body.client, { field: 'Client', required: true, min: 1 }),
    lead_id: V.uuid(body.lead_id),
    lead_no: V.str(body.lead_no, { field: 'Lead reference', max: 40 }),
    project_type: V.str(body.project_type, { field: 'Project type' }),
    project_manager_id: V.uuid(body.project_manager_id),
    assigned_employee_id: V.uuid(body.assigned_employee_id),
    technology_stack: Array.isArray(body.technology_stack) ? body.technology_stack : [],
    urls: sanitizeUrls(body.urls),
    project_cost: V.num(body.project_cost, { field: 'Project cost', min: 0, def: 0 }),
    status: V.str(body.status, { field: 'Status', required: true }),
    priority: V.str(body.priority, { field: 'Priority' }) || 'medium',
    progress: V.num(body.progress, { field: 'Progress', min: 0, max: 100, def: 0 }),
    start_date: V.date(body.start_date, { field: 'Start date' }),
    expected_delivery: V.date(body.expected_delivery, { field: 'Expected delivery' }),
    remarks: V.str(body.remarks, { field: 'Remarks', max: 4000 }),
  };
}
