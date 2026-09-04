import { supabase, preflight, fail, V } from './_lib.js';
import { requirePermission } from './_permissions.js';
import { nextProjectNo, nextClientNo } from './_join.js';
import { logAudit } from './_audit.js';

// Converts a lead into a project:
//  - copies customer info
//  - stores the lead reference (id + lead_no) on the project
//  - marks the lead as Won and links converted_project_id
export default async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');

  // Converting a lead creates a project, so require both capabilities.
  const user = await requirePermission(req, res, 'leads.convert');
  if (!user) return;

  try {
    const { lead_id } = req.body;
    if (!lead_id) return fail(res, 400, 'lead_id is required');

    const { data: lead, error: leadErr } = await supabase
      .from('dt_leads3').select('*').eq('id', lead_id).is('deleted_at', null).single();
    if (leadErr || !lead) return fail(res, 404, 'Lead not found');

    if (lead.converted_project_id) return fail(res, 400, 'This lead has already been converted to a project.');

    const projectNo = await nextProjectNo();
    const companyName = lead.company || lead.customer_name;
    
    // Find or create Client
    let clientId = null;
    const { data: existingClient, error: clientErr } = await supabase
      .from('dt_clients')
      .select('id, lead_id')
      .ilike('company_name', companyName)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();
      
    if (existingClient && !clientErr) {
      clientId = existingClient.id;
      // If the manually created client doesn't have an origin lead attached yet, attach this one.
      if (!existingClient.lead_id) {
        await supabase.from('dt_clients').update({ lead_id: lead.id, updated_at: new Date().toISOString() }).eq('id', clientId);
      }
    } else {
      const clientNo = await nextClientNo();
      const clientPayload = {
        client_no: clientNo,
        company_name: companyName,
        contact_person: lead.customer_name,
        email: lead.primary_email,
        phone: lead.primary_phone,
        address: lead.address,
        lead_id: lead.id,
        status: 'active'
      };
      const { data: newClient, error: newClientErr } = await supabase
        .from('dt_clients')
        .insert(clientPayload)
        .select()
        .single();
        
      if (!newClientErr && newClient) {
        clientId = newClient.id;
        await logAudit({ req, user, action: 'CREATE', module: 'Clients', entity: 'Client', entityId: newClient.id, description: `Created client ${newClient.client_no} during lead conversion`, newValues: newClient });
      }
    }

    const projectPayload = {
      project_no: projectNo,
      project_name: V.str(req.body.project_name, { field: 'Project name' }) || `${companyName} Project`,
      client: companyName,
      client_id: clientId,
      lead_id: lead.id,
      lead_no: lead.lead_no,
      project_type: lead.project_type || null,
      industry: lead.industry || null,
      project_manager_id: V.uuid(req.body.project_manager_id),
      assigned_employee_id: lead.assigned_employee_id || lead.sales_manager_id || V.uuid(req.body.assigned_employee_id),
      technology_stack: Array.isArray(req.body.technology_stack) ? req.body.technology_stack : [],
      urls: Array.isArray(lead.urls) ? lead.urls : [],
      project_cost: V.num(req.body.project_cost ?? lead.budget, { field: 'Project cost', min: 0, def: 0 }),
      status: 'active',
      priority: lead.priority || 'medium',
      progress: 0,
      start_date: V.date(req.body.start_date, { field: 'Start date' }) || new Date().toISOString(),
      expected_delivery: V.date(req.body.expected_delivery, { field: 'Expected delivery' }),
      remarks: `Converted from lead ${lead.lead_no}. ${lead.remarks || ''}`.trim(),
    };

    const { data: project, error: projErr } = await supabase
      .from('dt_projects').insert(projectPayload).select().single();
    if (projErr) throw projErr;

    const { error: updErr } = await supabase.from('dt_leads3')
      .update({ converted_project_id: project.id, converted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', lead.id);
    if (updErr) throw updErr;

    await logAudit({ req, user, action: 'CONVERT', module: 'Leads', entity: 'Lead', entityId: lead.id, description: `Converted lead ${lead.lead_no} to project ${project.project_no}`, newValues: { converted_project_id: project.id } });
    await logAudit({ req, user, action: 'CREATE', module: 'Projects', entity: 'Project', entityId: project.id, description: `Created project ${project.project_no} from lead ${lead.lead_no}`, newValues: project });

    return res.status(201).json({ project, lead_id: lead.id });
  } catch (err) {
    const isValidation = /required|valid|must|too long/i.test(err.message || '');
    return fail(res, isValidation ? 400 : 500, err.message);
  }
}
