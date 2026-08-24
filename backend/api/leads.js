import { supabase, preflight, fail, V, sanitizeUrls } from './_lib.js';
import { requirePermission, methodPermission, getEffectivePermissions } from './_permissions.js';
import { employeeMap, nextLeadNo } from './_join.js';
import { logAudit } from './_audit.js';

function attach(lead, emps) {
  return {
    ...lead,
    sales_manager: lead.sales_manager_id ? emps[lead.sales_manager_id] || null : null,
    assigned_employee: lead.assigned_employee_id ? emps[lead.assigned_employee_id] || null : null,
  };
}

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const user = await requirePermission(req, res, methodPermission('leads', req.method));
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { isAdmin, employee } = await getEffectivePermissions(user);
      const [{ data, error }, emps] = await Promise.all([
        supabase.from('dt_leads3').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
        employeeMap(),
      ]);
      if (error) throw error;
      let rows = data || [];
      if (!isAdmin && employee) {
        rows = rows.filter((l) => l.sales_manager_id === employee.id || l.assigned_employee_id === employee.id);
      }
      return res.status(200).json(rows.map((l) => attach(l, emps)));
    }

    if (req.method === 'POST') {
      const payload = validate(req.body);
      if (!payload.lead_no) payload.lead_no = await nextLeadNo();
      const { data, error } = await supabase.from('dt_leads3').insert(payload).select().single();
      if (error) throw error;
      const emps = await employeeMap();
      const attached = attach(data, emps);
      await logAudit({ req, user, action: 'CREATE', module: 'Leads', entity: 'Lead', entityId: data.id, description: `Created lead: ${data.customer_name}`, newValues: data });
      return res.status(201).json(attached);
    }

    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Lead id is required');
      const payload = validate(req.body);
      payload.updated_at = new Date().toISOString();
      const { data: oldData } = await supabase.from('dt_leads3').select('*').eq('id', id).single();
      const { data, error } = await supabase.from('dt_leads3').update(payload).eq('id', id).select().single();
      if (error) throw error;
      const emps = await employeeMap();
      const attached = attach(data, emps);
      if (oldData) await logAudit({ req, user, action: 'UPDATE', module: 'Leads', entity: 'Lead', entityId: id, description: `Updated lead: ${data.customer_name}`, oldValues: oldData, newValues: data });
      return res.status(200).json(attached);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Lead id is required');
      const { data: oldData } = await supabase.from('dt_leads3').select('*').eq('id', id).single();
      const { error } = await supabase.from('dt_leads3')
        .update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      if (oldData) await logAudit({ req, user, action: 'DELETE', module: 'Leads', entity: 'Lead', entityId: id, description: `Deleted lead: ${oldData.customer_name}`, oldValues: oldData });
      return res.status(200).json({ ok: true });
    }

    return fail(res, 405, 'Method not allowed');
  } catch (err) {
    const isValidation = /required|valid|must|too long/i.test(err.message || '');
    return fail(res, isValidation ? 400 : 500, err.message);
  }
}



function validate(body) {
  return {
    lead_no: V.str(body.lead_no, { field: 'Lead No', max: 40 }),
    customer_name: V.str(body.customer_name, { field: 'Customer name', required: true, min: 2 }),
    company: V.str(body.company, { field: 'Company', max: 200 }),
    sales_manager_id: V.uuid(body.sales_manager_id),
    assigned_employee_id: V.uuid(body.assigned_employee_id),
    source_person: V.str(body.source_person, { field: 'Source person', max: 200 }),
    primary_phone: V.str(body.primary_phone, { field: 'Primary phone', max: 40 }),
    secondary_phone: V.str(body.secondary_phone, { field: 'Secondary telephone', max: 40 }),
    tertiary_phone: V.str(body.tertiary_phone, { field: 'Alternate phone', max: 40 }),
    primary_email: V.email(body.primary_email, { field: 'Primary email' }),
    secondary_email: V.email(body.secondary_email, { field: 'Secondary email' }),
    project_type: V.str(body.project_type, { field: 'Project type' }),
    industry: V.str(body.industry, { field: 'Industry' }),
    source: V.str(body.source, { field: 'Source', required: true }),
    budget: V.num(body.budget, { field: 'Budget', min: 0, def: 0 }),
    status: V.str(body.status, { field: 'Status', required: true }),
    priority: V.str(body.priority, { field: 'Priority' }) || 'medium',
    lead_received_date: V.date(body.lead_received_date, { field: 'Lead received date' }),
    next_follow_up: V.date(body.next_follow_up, { field: 'Follow-up date' }),
    urls: sanitizeUrls(body.urls),
    address: V.str(body.address, { field: 'Address', max: 1000 }),
    remarks: V.str(body.remarks, { field: 'Remarks', max: 4000 }),
  };
}
