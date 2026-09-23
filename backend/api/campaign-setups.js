import { supabase, preflight, fail, V } from './_lib.js';
import { requirePermission, methodPermission } from './_permissions.js';
import { logAudit } from './_audit.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const user = await requirePermission(req, res, methodPermission('campaign_setups', req.method));
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { id } = req.query || {};

      if (id) {
        const { data, error } = await supabase
          .from('dt_campaign_setups')
          .select('*, templates:dt_campaign_setup_templates(*)')
          .eq('id', id)
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      } else {
        const { data, error } = await supabase
          .from('dt_campaign_setups')
          .select('*, templates:dt_campaign_setup_templates(template_id, sort_order, start_datetime, end_datetime)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data || []);
      }
    }

      if (req.method === 'POST') {
      const payload = validate(req.body);
      const reqTemplates = req.body.templates || [];

      if ((!Array.isArray(reqTemplates) || reqTemplates.length === 0) && payload.status === 'active') {
        return fail(res, 400, 'At least one template is required to activate this setup');
      }

      const templateIds = reqTemplates.map(t => t.template_id);

      // Check if templates exist and are active
      const { data: activeTemplates, error: tErr } = await supabase
        .from('dt_campaign_templates')
        .select('id, status')
        .in('id', templateIds);

      if (tErr) throw tErr;
      const validIds = new Set(activeTemplates.filter(t => t.status === 'active').map(t => t.id));
      const invalidIds = templateIds.filter(id => !validIds.has(id));

      if (invalidIds.length > 0) {
        return fail(res, 400, 'One or more selected templates are invalid or not active');
      }

      // 1. Create setup
      payload.created_by = user.id;
      payload.updated_by = user.id;
      const { data: setupData, error: sErr } = await supabase
        .from('dt_campaign_setups')
        .insert(payload)
        .select()
        .single();
      
      if (sErr) throw sErr;

      // 2. Create template relationships
      const relationships = reqTemplates.map((t, idx) => ({
        campaign_setup_id: setupData.id,
        template_id: t.template_id,
        sort_order: idx,
        start_datetime: t.start_datetime ? new Date(t.start_datetime).toISOString() : null,
        end_datetime: t.end_datetime ? new Date(t.end_datetime).toISOString() : null
      }));

      const { error: relErr } = await supabase
        .from('dt_campaign_setup_templates')
        .insert(relationships);

      if (relErr) {
        // Rollback setup if relationships fail
        await supabase.from('dt_campaign_setups').delete().eq('id', setupData.id);
        throw relErr;
      }

      await logAudit({ req, user, action: 'CREATE', module: 'Campaign Setups', entity: 'Campaign Setup', entityId: setupData.id, description: `Created setup: ${setupData.name}`, newValues: setupData });
      return res.status(201).json(setupData);
    }

    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Setup id is required');
      
      const payload = validate(req.body);
      payload.updated_by = user.id;
      payload.updated_at = new Date().toISOString();
      const reqTemplates = req.body.templates || [];

      if ((!Array.isArray(reqTemplates) || reqTemplates.length === 0) && payload.status === 'active') {
        return fail(res, 400, 'At least one template is required to activate this setup');
      }

      const templateIds = reqTemplates.map(t => t.template_id);

      // Check if templates exist and are active
      const { data: activeTemplates, error: tErr } = await supabase
        .from('dt_campaign_templates')
        .select('id, status')
        .in('id', templateIds);

      if (tErr) throw tErr;
      const validIds = new Set(activeTemplates.filter(t => t.status === 'active').map(t => t.id));
      const invalidIds = templateIds.filter(id => !validIds.has(id));

      if (invalidIds.length > 0) {
        return fail(res, 400, 'One or more selected templates are invalid or not active');
      }

      const { data: oldData } = await supabase.from('dt_campaign_setups').select('*').eq('id', id).single();

      // Update setup
      const { data: setupData, error: updateErr } = await supabase
        .from('dt_campaign_setups')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      
      if (updateErr) throw updateErr;

      // Replace relationships
      await supabase.from('dt_campaign_setup_templates').delete().eq('campaign_setup_id', id);

      const relationships = reqTemplates.map((t, idx) => ({
        campaign_setup_id: id,
        template_id: t.template_id,
        sort_order: idx,
        start_datetime: t.start_datetime ? new Date(t.start_datetime).toISOString() : null,
        end_datetime: t.end_datetime ? new Date(t.end_datetime).toISOString() : null
      }));

      const { error: relErr } = await supabase
        .from('dt_campaign_setup_templates')
        .insert(relationships);
      
      if (relErr) throw relErr;

      if (oldData) await logAudit({ req, user, action: 'UPDATE', module: 'Campaign Setups', entity: 'Campaign Setup', entityId: id, description: `Updated setup: ${setupData.name}`, oldValues: oldData, newValues: setupData });
      return res.status(200).json(setupData);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Setup id is required');
      
      const { data: oldData } = await supabase.from('dt_campaign_setups').select('*').eq('id', id).single();
      
      // Delete relationships first (or rely on ON DELETE CASCADE)
      await supabase.from('dt_campaign_setup_templates').delete().eq('campaign_setup_id', id);
      
      const { error } = await supabase.from('dt_campaign_setups').delete().eq('id', id);
      if (error) throw error;
      
      if (oldData) await logAudit({ req, user, action: 'DELETE', module: 'Campaign Setups', entity: 'Campaign Setup', entityId: id, description: `Deleted setup: ${oldData.name}`, oldValues: oldData });
      return res.status(200).json({ ok: true });
    }

    return fail(res, 405, 'Method not allowed');
  } catch (err) {
    const isDuplicateDomain = err.code === '23505' || /unique constraint|dt_campaign_setups_domain_key/i.test(err.message || '');
    if (isDuplicateDomain) {
      return fail(res, 400, 'Domain is already assigned to another Campaign Setup');
    }
    const isValidation = /required|valid|must|too long/i.test(err.message || '');
    return fail(res, isValidation ? 400 : 500, err.message);
  }
}

function validate(body) {
  let cleanDomain = null;
  if (body.domain && typeof body.domain === 'string') {
    let d = body.domain.trim().toLowerCase();
    d = d.replace(/^[a-z0-9+\-.]+:\/\//i, '');
    d = d.split('/')[0].split('?')[0].split('#')[0];
    d = d.replace(/:\d+$/, '');
    d = d.replace(/\.$/, '');
    if (d.length > 0) cleanDomain = d;
  }

  const payload = {
    name: V.str(body.name, { field: 'Name', required: true, min: 2, max: 200 }),
    description: V.str(body.description, { field: 'Description', max: 2000 }),
<<<<<<< HEAD
    domain: V.str(body.domain, { field: 'Domain', max: 200 }),
=======
    domain: cleanDomain,
>>>>>>> a7a5c63 (domain config fixed)
    play_mode: V.str(body.play_mode, { field: 'Play Mode' }) || 'loop',
    status: V.str(body.status, { field: 'Status', required: true }) || 'inactive',
    campaign_products: Array.isArray(body.campaign_products) ? body.campaign_products : [],
    start_datetime: null,
    end_datetime: null,
  };


  const reqTemplates = body.templates || [];
  if (Array.isArray(reqTemplates) && reqTemplates.length > 0) {
    // 1. Validate sequence
    for (let i = 1; i < reqTemplates.length; i++) {
      const prevEnd = reqTemplates[i - 1].end_datetime;
      const currStart = reqTemplates[i].start_datetime;
      if (prevEnd && currStart) {
        if (new Date(prevEnd).getTime() > new Date(currStart).getTime()) {
          throw new Error(`Template sequence invalid: Template ${i+1} starts before Template ${i} ends.`);
        }
      }
    }

    // 2. Derive Setup Start/End Dates
    const firstStart = reqTemplates[0].start_datetime;
    const lastEnd = reqTemplates[reqTemplates.length - 1].end_datetime;
    
    if (firstStart) payload.start_datetime = V.date(firstStart, { field: 'Start Date' });
    if (lastEnd) payload.end_datetime = V.date(lastEnd, { field: 'End Date' });
  }

  if (payload.start_datetime && payload.end_datetime) {
    if (new Date(payload.start_datetime) > new Date(payload.end_datetime)) {
      throw new Error('Setup start datetime cannot be after end datetime');
    }
  }

  return payload;
}
