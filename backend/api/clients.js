import { supabase, preflight, fail, V } from './_lib.js';
import { requirePermission, methodPermission } from './_permissions.js';
import { logAudit } from './_audit.js';
import { nextClientNo } from './_join.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const user = await requirePermission(req, res, methodPermission('clients', req.method));
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { id } = req.query || {};
      
      if (id) {
        // Fetch single client with their projects, AMCs, and origin Lead
        const { data: client, error } = await supabase
          .from('dt_clients')
          .select('*, projects:dt_projects(*, lead:lead_id(lead_no, source, budget, converted_at)), amcs:dt_client_amc(*, project:project_id(project_name)), lead:lead_id(*)')
          .eq('id', id)
          .is('deleted_at', null)
          .single();
          
        if (error) throw error;

        // Fetch quotations linked to this client (either via lead_id or client_id)
        let query = supabase
          .from('dt_quotations')
          .select('*, project:project_id(project_name), versions:dt_quotation_versions(version_number, grand_total)')
          .is('deleted_at', null);
        
        if (client.lead_id) {
          query = query.or(`lead_id.eq.${client.lead_id},client_id.eq.${client.id}`);
        } else {
          query = query.eq('client_id', client.id);
        }
        
        const { data: qData } = await query;
        client.quotations = qData || [];

        // Fetch audit logs for this client
        const { data: logs } = await supabase
          .from('audit_logs')
          .select('action, description, created_at, username')
          .eq('entity_id', client.id)
          .order('created_at', { ascending: false });
        client.audit_logs = logs || [];

        return res.status(200).json(client);
      } else {
        // Fetch list of clients
        const { data, error } = await supabase
          .from('dt_clients')
          .select('*, projects:dt_projects(id)')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Return clients with a project count
        const rows = data.map(c => ({
          ...c,
          project_count: c.projects ? c.projects.length : 0
        }));
        
        return res.status(200).json(rows);
      }
    }

    if (req.method === 'POST') {
      const payload = validate(req.body);
      if (!payload.client_no) payload.client_no = await nextClientNo();
      
      const { data, error } = await supabase
        .from('dt_clients')
        .insert(payload)
        .select()
        .single();
        
      if (error) throw error;
      
      await logAudit({ req, user, action: 'CREATE', module: 'Clients', entity: 'Client', entityId: data.id, description: `Created client: ${data.company_name}`, newValues: data });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Client id is required');
      
      const payload = validate(req.body);
      payload.updated_at = new Date().toISOString();
      
      const { data: oldData } = await supabase.from('dt_clients').select('*').eq('id', id).single();
      const { data, error } = await supabase.from('dt_clients').update(payload).eq('id', id).select().single();
      
      if (error) throw error;
      if (oldData) await logAudit({ req, user, action: 'UPDATE', module: 'Clients', entity: 'Client', entityId: id, description: `Updated client: ${data.company_name}`, oldValues: oldData, newValues: data });
      
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'Client id is required');
      
      const { data: oldData } = await supabase.from('dt_clients').select('*').eq('id', id).single();
      const { error } = await supabase.from('dt_clients').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      
      if (error) throw error;
      if (oldData) await logAudit({ req, user, action: 'DELETE', module: 'Clients', entity: 'Client', entityId: id, description: `Deleted client: ${oldData.company_name}`, oldValues: oldData });
      
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
    company_name: V.str(body.company_name, { field: 'Company name', required: true, min: 2 }),
    contact_person: V.str(body.contact_person, { field: 'Contact person' }),
    email: V.str(body.email, { field: 'Email' }),
    phone: V.str(body.phone, { field: 'Phone' }),
    address: V.str(body.address, { field: 'Address' }),
    website: V.str(body.website, { field: 'Website' }),
    status: V.str(body.status, { field: 'Status' }) || 'active',
    notes: V.str(body.notes, { field: 'Notes', max: 4000 })
  };
}
