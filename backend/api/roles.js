import { supabase, preflight, fail, V } from './_lib.js';
import { requirePermission, methodPermission } from './_permissions.js';
import { logAudit } from './_audit.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const user = await requirePermission(req, res, methodPermission('roles', req.method));
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const type = req.query?.type;
      let q = supabase.from('dt_roles2').select('*').is('deleted_at', null);
      if (type) q = q.eq('type', type);
      const { data, error } = await q.order('name', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const payload = validate(req.body);
      await ensureUnique(payload.name, null);
      const { data, error } = await supabase.from('dt_roles2').insert(payload).select().single();
      if (error) throw error;
      await logAudit({ req, user, action: 'CREATE', module: 'Roles', entity: 'Role', entityId: data.id, description: `Created role: ${data.name}`, newValues: data });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Role id is required');
      const payload = validate(req.body);
      await ensureUnique(payload.name, id);
      payload.updated_at = new Date().toISOString();
      const { data: oldData } = await supabase.from('dt_roles2').select('*').eq('id', id).single();
      const { data, error } = await supabase.from('dt_roles2').update(payload).eq('id', id).select().single();
      if (error) throw error;
      if (oldData) await logAudit({ req, user, action: 'UPDATE', module: 'Roles', entity: 'Role', entityId: id, description: `Updated role: ${data.name}`, oldValues: oldData, newValues: data });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Role id is required');
      const { data: oldData } = await supabase.from('dt_roles2').select('*').eq('id', id).single();
      const { error } = await supabase.from('dt_roles2')
        .update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      if (oldData) await logAudit({ req, user, action: 'DELETE', module: 'Roles', entity: 'Role', entityId: id, description: `Deleted role: ${oldData.name}`, oldValues: oldData });
      return res.status(200).json({ ok: true });
    }

    return fail(res, 405, 'Method not allowed');
  } catch (err) {
    const isValidation = /required|valid|must|too long|already exists/i.test(err.message || '');
    return fail(res, isValidation ? 400 : 500, err.message);
  }
}

// Prevent duplicate role names (case-insensitive), ignoring the row being edited.
async function ensureUnique(name, excludeId) {
  const { data, error } = await supabase
    .from('dt_roles2').select('id, name').is('deleted_at', null).ilike('name', name);
  if (error) throw error;
  const clash = (data || []).some((r) => r.id !== excludeId);
  if (clash) throw new Error('A role with this name already exists');
}

function validate(body) {
  const type = (V.str(body.type, { field: 'Type' }) || 'sales').toLowerCase();
  return {
    name: V.str(body.name, { field: 'Role name', required: true, min: 2, max: 80 }),
    type: type === 'developer' ? 'developer' : 'sales',
    description: V.str(body.description, { field: 'Description', max: 500 }),
    status: V.str(body.status, { field: 'Status' }) || 'active',
  };
}
