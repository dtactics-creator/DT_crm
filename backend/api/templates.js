import { supabase, preflight, fail, V } from './_lib.js';
import { requirePermission, methodPermission } from './_permissions.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  // POST is used for single-create AND the bulk "Save Templates" (edit) action.
  const perm = req.method === 'POST'
    ? (Array.isArray(req.body?.templates) ? 'templates.edit' : 'templates.create')
    : methodPermission('templates', req.method);
  const user = await requirePermission(req, res, perm);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('dt_templates').select('*').is('deleted_at', null)
        .order('sort_order', { ascending: true }).order('created_at', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      // Batch save: accept { templates: [{id?, title, body, ...}] } to persist many at once.
      if (Array.isArray(req.body?.templates)) {
        const results = [];
        for (const t of req.body.templates) {
          const payload = validate(t);
          if (t.id) {
            payload.updated_at = new Date().toISOString();
            const { data, error } = await supabase.from('dt_templates').update(payload).eq('id', t.id).select().single();
            if (error) throw error;
            results.push(data);
          } else {
            const { data, error } = await supabase.from('dt_templates').insert(payload).select().single();
            if (error) throw error;
            results.push(data);
          }
        }
        return res.status(200).json(results);
      }

      const payload = validate(req.body);
      const { data, error } = await supabase.from('dt_templates').insert(payload).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Template id is required');
      const payload = validate(req.body);
      payload.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from('dt_templates').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Template id is required');
      const { error } = await supabase.from('dt_templates')
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

function validate(body) {
  return {
    title: V.str(body.title, { field: 'Title', required: true, min: 2, max: 120 }),
    category: V.str(body.category, { field: 'Category' }) || 'general',
    channel: V.str(body.channel, { field: 'Channel' }) || 'whatsapp',
    body: V.str(body.body, { field: 'Message', required: true, min: 1, max: 6000 }),
    status: V.str(body.status, { field: 'Status' }) || 'active',
    sort_order: V.num(body.sort_order, { field: 'Sort order', def: 0 }),
  };
}
