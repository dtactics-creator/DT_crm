import { supabase, preflight, fail, V, sanitizeUrls } from './_lib.js';
import { requirePermission } from './_permissions.js';
import { nextLeadNo } from './_join.js';

// Bulk import of leads. Body: { rows: [...], mode?: 'update' | 'skip' | 'create' }
//   update (default): rows matching an existing lead (by Lead No, else email)
//                     UPDATE that lead instead of creating a duplicate.
//   skip:             matching rows are skipped (reported), only new ones inserted.
//   create:           always insert new rows (legacy behaviour).
// Duplicates within the same file are also detected and skipped/merged.
export default async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');

  const user = await requirePermission(req, res, 'leads.import');
  if (!user) return;

  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
    const mode = ['update', 'skip', 'create'].includes(req.body?.mode) ? req.body.mode : 'update';
    if (!rows) return fail(res, 400, 'Expected a "rows" array.');
    if (rows.length === 0) return fail(res, 400, 'No rows to import.');
    if (rows.length > 2000) return fail(res, 400, 'Too many rows (max 2000 per import).');

    // Reference data + existing leads for duplicate matching.
    const [{ data: masters }, { data: emps }, { data: existing }] = await Promise.all([
      supabase.from('masters').select('category, value').is('deleted_at', null),
      supabase.from('crm_employees').select('id').is('deleted_at', null),
      supabase.from('dt_leads3').select('id, lead_no, primary_email').is('deleted_at', null),
    ]);
    const valuesFor = (cat) => new Set((masters || []).filter((m) => m.category === cat).map((m) => m.value));
    const ctx = {
      leadStatus: valuesFor('lead_status'),
      leadSource: valuesFor('lead_source'),
      projectType: valuesFor('project_type'),
      priority: valuesFor('priority'),
      empIds: new Set((emps || []).map((e) => e.id)),
    };

    // Existing lookups (case-insensitive keys).
    const byLeadNo = new Map();
    const byEmail = new Map();
    for (const l of existing || []) {
      if (l.lead_no) byLeadNo.set(l.lead_no.trim().toLowerCase(), l.id);
      if (l.primary_email) byEmail.set(l.primary_email.trim().toLowerCase(), l.id);
    }

    const inserted = [];
    const updated = [];
    const skipped = [];
    const failed = [];
    const seenInFile = new Set(); // keys already processed in this file

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i] || {};
      try {
        const payload = validateRow(raw, ctx);

        // Determine a dedup key: prefer lead_no, else email.
        const leadNoKey = payload.lead_no ? payload.lead_no.trim().toLowerCase() : null;
        const emailKey = payload.primary_email ? payload.primary_email.trim().toLowerCase() : null;
        const fileKey = leadNoKey || emailKey;

        // In-file duplicate: same key seen earlier in this upload.
        if (fileKey && seenInFile.has(fileKey)) {
          skipped.push({ row: i + 1, reason: 'Duplicate within file', lead_no: payload.lead_no || '' });
          continue;
        }
        if (fileKey) seenInFile.add(fileKey);

        // Match an existing DB record.
        const existingId = (leadNoKey && byLeadNo.get(leadNoKey)) || (emailKey && byEmail.get(emailKey)) || null;

        if (existingId && mode === 'skip') {
          skipped.push({ row: i + 1, reason: 'Already exists', lead_no: payload.lead_no || '' });
          continue;
        }

        if (existingId && mode === 'update') {
          const patch = { ...payload, updated_at: new Date().toISOString() };
          // Never blank an existing lead_no on update.
          if (!patch.lead_no) delete patch.lead_no;
          const { data, error } = await supabase.from('dt_leads3').update(patch).eq('id', existingId).select('id, lead_no').single();
          if (error) throw new Error(error.message);
          updated.push({ row: i + 1, id: data.id, lead_no: data.lead_no });
          continue;
        }

        // Insert new (create mode, or no match found).
        if (!payload.lead_no) payload.lead_no = await nextLeadNo();
        const { data, error } = await supabase.from('dt_leads3').insert(payload).select('id, lead_no').single();
        if (error) throw new Error(error.message);
        inserted.push({ row: i + 1, id: data.id, lead_no: data.lead_no });
        // Register the new record so later rows in this file dedupe against it.
        if (data.lead_no) byLeadNo.set(data.lead_no.trim().toLowerCase(), data.id);
        if (payload.primary_email) byEmail.set(payload.primary_email.trim().toLowerCase(), data.id);
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
  if (!ctx.leadStatus.has(status)) throw new Error(`Unknown status "${status}"`);
  const source = V.str(body.source, { field: 'Source', required: true });
  if (!ctx.leadSource.has(source)) throw new Error(`Unknown source "${source}"`);

  const projType = V.str(body.project_type, { field: 'Project type' });
  if (projType && !ctx.projectType.has(projType)) throw new Error(`Unknown project type "${projType}"`);
  const prio = V.str(body.priority, { field: 'Priority' }) || 'medium';
  if (!ctx.priority.has(prio)) throw new Error(`Unknown priority "${prio}"`);

  const salesMgr = V.uuid(body.sales_manager_id);
  if (salesMgr && !ctx.empIds.has(salesMgr)) throw new Error('Sales manager not found');
  const assigned = V.uuid(body.assigned_employee_id);
  if (assigned && !ctx.empIds.has(assigned)) throw new Error('Assigned employee not found');

  return {
    lead_no: V.str(body.lead_no, { field: 'Lead No', max: 40 }),
    customer_name: V.str(body.customer_name, { field: 'Customer name', required: true, min: 2 }),
    company: V.str(body.company, { field: 'Company', max: 200 }),
    sales_manager_id: salesMgr,
    assigned_employee_id: assigned,
    source_person: V.str(body.source_person, { field: 'Source person', max: 200 }),
    primary_phone: V.str(body.primary_phone, { field: 'Primary phone', max: 40 }),
    secondary_phone: V.str(body.secondary_phone, { field: 'Secondary telephone', max: 40 }),
    tertiary_phone: V.str(body.tertiary_phone, { field: 'Alternate phone', max: 40 }),
    primary_email: V.email(body.primary_email, { field: 'Primary email' }),
    secondary_email: V.email(body.secondary_email, { field: 'Secondary email' }),
    project_type: projType,
    source,
    budget: V.num(body.budget, { field: 'Budget', min: 0, def: 0 }),
    status,
    priority: prio,
    lead_received_date: V.date(body.lead_received_date, { field: 'Lead received date' }),
    next_follow_up: V.date(body.next_follow_up, { field: 'Follow-up date' }),
    urls: sanitizeUrls(body.urls),
    remarks: V.str(body.remarks, { field: 'Remarks', max: 4000 }),
  };
}
