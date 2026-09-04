import { supabase, preflight, fail, V } from './_lib.js';
import { requirePermission, methodPermission } from './_permissions.js';
import { logAudit } from './_audit.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const user = await requirePermission(req, res, methodPermission('clients', req.method));
  if (!user) return;

  try {
    if (req.method === 'POST') {
      const payload = validate(req.body);
      
      const { data, error } = await supabase
        .from('dt_client_amc')
        .insert(payload)
        .select()
        .single();
        
      if (error) throw error;
      
      await logAudit({ req, user, action: 'CREATE', module: 'Clients', entity: 'AMC', entityId: data.id, description: `Created AMC: ${data.amc_name} for client ${data.client_id}`, newValues: data });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'AMC id is required');
      
      const payload = validate(req.body);
      payload.updated_at = new Date().toISOString();
      
      const { data: oldData } = await supabase.from('dt_client_amc').select('*').eq('id', id).single();
      const { data, error } = await supabase.from('dt_client_amc').update(payload).eq('id', id).select().single();
      
      if (error) throw error;
      if (oldData) await logAudit({ req, user, action: 'UPDATE', module: 'Clients', entity: 'AMC', entityId: id, description: `Updated AMC: ${data.amc_name}`, oldValues: oldData, newValues: data });
      
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'AMC id is required');
      
      const { data: oldData } = await supabase.from('dt_client_amc').select('*').eq('id', id).single();
      const { error } = await supabase.from('dt_client_amc').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      
      if (error) throw error;
      if (oldData) await logAudit({ req, user, action: 'DELETE', module: 'Clients', entity: 'AMC', entityId: id, description: `Deleted AMC: ${oldData.amc_name}`, oldValues: oldData });
      
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
    client_id: V.uuid(body.client_id, { required: true }),
    project_id: V.uuid(body.project_id) || null,
    amc_name: V.str(body.amc_name, { field: 'AMC Name', required: true, min: 2 }),
    description: V.str(body.description, { field: 'Description' }),
    amc_amount: V.num(body.amc_amount, { field: 'AMC Amount', min: 0, def: 0 }),
    start_date: V.date(body.start_date, { field: 'Start date' }),
    end_date: V.date(body.end_date, { field: 'End date' }),
    renewal_date: V.date(body.renewal_date, { field: 'Renewal date' }),
    status: V.str(body.status, { field: 'Status' }) || 'active',
    notes: V.str(body.notes, { field: 'Notes', max: 4000 })
  };
}
