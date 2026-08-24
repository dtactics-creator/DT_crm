import { supabase, preflight, fail, V } from './_lib.js';
import { requirePermission, methodPermission } from './_permissions.js';
import { logAudit } from './_audit.js';

function formatCategory(cat) {
  if (!cat) return 'Master Item';
  return cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const user = await requirePermission(req, res, methodPermission('masters', req.method));
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const category = req.query?.category;
      let q = supabase.from('masters').select('*').is('deleted_at', null);
      if (category) q = q.eq('category', category);
      const { data, error } = await q.order('category', { ascending: true }).order('sort_order', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const payload = validate(req.body);
      
      const { count } = await supabase.from('masters').select('*', { count: 'exact', head: true })
        .eq('category', payload.category)
        .eq('sort_order', payload.sort_order)
        .is('deleted_at', null);
      if (count > 0) return fail(res, 400, 'Sort order must be unique within this category');

      const { data, error } = await supabase.from('masters').insert(payload).select().single();
      if (error) throw error;
      await logAudit({ req, user, action: 'CREATE', module: 'Masters', entity: formatCategory(data.category), entityId: data.id, description: `Created ${formatCategory(data.category)}: ${data.label}`, newValues: data });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Master id is required');
      const payload = validate(req.body);
      
      const { count } = await supabase.from('masters').select('*', { count: 'exact', head: true })
        .eq('category', payload.category)
        .eq('sort_order', payload.sort_order)
        .neq('id', id)
        .is('deleted_at', null);
      if (count > 0) return fail(res, 400, 'Sort order must be unique within this category');

      const { data: oldData } = await supabase.from('masters').select('*').eq('id', id).single();
      payload.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from('masters').update(payload).eq('id', id).select().single();
      if (error) throw error;
      if (oldData) await logAudit({ req, user, action: 'UPDATE', module: 'Masters', entity: formatCategory(data.category), entityId: id, description: `Updated ${formatCategory(data.category)}: ${data.label}`, oldValues: oldData, newValues: data });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Master id is required');
      const { data: oldData } = await supabase.from('masters').select('*').eq('id', id).single();
      const { error } = await supabase.from('masters')
        .update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      if (oldData) await logAudit({ req, user, action: 'DELETE', module: 'Masters', entity: formatCategory(oldData.category), entityId: id, description: `Deleted ${formatCategory(oldData.category)}: ${oldData.label}`, oldValues: oldData });
      return res.status(200).json({ ok: true });
    }

    return fail(res, 405, 'Method not allowed');
  } catch (err) {
    const isValidation = /required|valid|must|too long/i.test(err.message || '');
    return fail(res, isValidation ? 400 : 500, err.message);
  }
}

function validate(body) {
  const label = V.str(body.label, { field: 'Label', required: true, min: 1 });
  return {
    category: V.str(body.category, { field: 'Category', required: true }),
    label,
    value: (V.str(body.value, { field: 'Value' }) || label).toLowerCase().replace(/\s+/g, '_'),
    color: V.str(body.color, { field: 'Color', max: 20 }),
    sort_order: V.num(body.sort_order, { field: 'Sort order', def: 0 }),
    is_active: body.is_active === undefined ? true : Boolean(body.is_active),
    description: V.str(body.description, { field: 'Description', max: 1000 }) || null,
  };
}
