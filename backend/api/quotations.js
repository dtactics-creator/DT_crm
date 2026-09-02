import { supabase, preflight, fail, V } from './_lib.js';
import { requirePermission, methodPermission } from './_permissions.js';
import { logAudit } from './_audit.js';
import { nextQuotationNo } from './_join.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const perm = methodPermission('quotations', req.method);
  const user = await requirePermission(req, res, perm);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { lead_id, quotation_id } = req.query || {};

        let query = supabase.from('dt_quotations').select(`
          *,
          lead:lead_id(customer_name, company),
          versions:dt_quotation_versions(
            *,
            service_areas:dt_quotation_service_areas(
              *,
              charges:dt_quotation_charges(*)
            ),
            milestones:dt_quotation_milestones(*),
            commercial_items:dt_quotation_commercial_items(*)
          )
        `).is('deleted_at', null).order('created_at', { ascending: false });

      if (lead_id) query = query.eq('lead_id', lead_id);
      if (quotation_id) query = query.eq('id', quotation_id);

      const { data, error } = await query;
      if (error) throw error;
      
      // Sort versions, service areas, and charges manually to ensure order
      for (const q of data) {
        if (q.versions) {
          q.versions.sort((a, b) => b.version_number - a.version_number);
          for (const v of q.versions) {
            if (v.commercial_items) v.commercial_items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            if (v.milestones) v.milestones.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            if (v.service_areas) {
              v.service_areas.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
              for (const sa of v.service_areas) {
                if (sa.charges) {
                  sa.charges.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                }
              }
            }
          }
        }
      }

      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { action, quotation_id } = req.body;

      // ACTION: CREATE NEW VERSION
      if (action === 'create_version') {
        if (!quotation_id) return fail(res, 400, 'quotation_id is required for new version');
        
        // Find existing quotation
        const { data: qData, error: qError } = await supabase.from('dt_quotations').select('*, versions:dt_quotation_versions(version_number)').eq('id', quotation_id).single();
        if (qError || !qData) return fail(res, 404, 'Quotation not found');

        const nextVersionNumber = (qData.versions?.length || 0) + 1;
        const vPayload = validateVersion(req.body);
        vPayload.quotation_id = quotation_id;
        vPayload.version_number = nextVersionNumber;

        // Insert new version
        const { data: vData, error: vError } = await supabase.from('dt_quotation_versions').insert(vPayload).select().single();
        if (vError) throw vError;

        // Insert service areas and charges
        if (Array.isArray(req.body.service_areas) && req.body.service_areas.length > 0) {
          let areaIdx = 0;
          for (const area of req.body.service_areas) {
            const aPayload = validateServiceArea(area, vData.id, areaIdx++);
            const { data: aData, error: aError } = await supabase.from('dt_quotation_service_areas').insert(aPayload).select().single();
            if (aError) throw aError;
            
            if (Array.isArray(area.charges) && area.charges.length > 0) {
               const cPayload = area.charges.map((c, cIdx) => validateCharge(c, aData.id, cIdx));
               const { error: cError } = await supabase.from('dt_quotation_charges').insert(cPayload);
               if (cError) throw cError;
            }
          }
        }

        if (Array.isArray(req.body.milestones) && req.body.milestones.length > 0) {
          const mPayload = req.body.milestones.map((m, mIdx) => validateMilestone(m, vData.id, mIdx));
          const { error: mError } = await supabase.from('dt_quotation_milestones').insert(mPayload);
          if (mError) throw mError;
        }

        if (Array.isArray(req.body.commercial_items) && req.body.commercial_items.length > 0) {
          const cPayload = req.body.commercial_items.map((c, idx) => validateCommercialItem(c, vData.id, idx));
          const { error: cError } = await supabase.from('dt_quotation_commercial_items').insert(cPayload);
          if (cError) throw cError;
        }

        // Audit log
        await logAudit({ req, user, action: 'CREATE_VERSION', module: 'Quotations', entity: 'QuotationVersion', entityId: vData.id, description: `Created version ${nextVersionNumber} for ${qData.quotation_no}` });
        
        // Touch parent quotation to trigger notifications
        await supabase.from('dt_quotations').update({ updated_at: new Date().toISOString() }).eq('id', quotation_id);

        return res.status(201).json({ id: vData.id, version_number: nextVersionNumber });
      }

      // DEFAULT: CREATE NEW QUOTATION
      let { lead_id, quotation_no } = req.body;
      if (!lead_id) return fail(res, 400, 'lead_id is required');
      
      if (!quotation_no) {
        quotation_no = await nextQuotationNo();
      }

      const qPayload = { lead_id, quotation_no, status: 'Draft' };
      const { data: qData, error: qError } = await supabase.from('dt_quotations').insert(qPayload).select().single();
      if (qError) throw qError;

      const vPayload = validateVersion(req.body);
      vPayload.quotation_id = qData.id;
      vPayload.version_number = 1;

      const { data: vData, error: vError } = await supabase.from('dt_quotation_versions').insert(vPayload).select().single();
      if (vError) throw vError;

      if (Array.isArray(req.body.service_areas) && req.body.service_areas.length > 0) {
        let areaIdx = 0;
        for (const area of req.body.service_areas) {
          const aPayload = validateServiceArea(area, vData.id, areaIdx++);
          const { data: aData, error: aError } = await supabase.from('dt_quotation_service_areas').insert(aPayload).select().single();
          if (aError) throw aError;
          
          if (Array.isArray(area.charges) && area.charges.length > 0) {
             const cPayload = area.charges.map((c, cIdx) => validateCharge(c, aData.id, cIdx));
             const { error: cError } = await supabase.from('dt_quotation_charges').insert(cPayload);
             if (cError) throw cError;
          }
        }
      }

      if (Array.isArray(req.body.milestones) && req.body.milestones.length > 0) {
        const mPayload = req.body.milestones.map((m, mIdx) => validateMilestone(m, vData.id, mIdx));
        const { error: mError } = await supabase.from('dt_quotation_milestones').insert(mPayload);
        if (mError) throw mError;
      }

      if (Array.isArray(req.body.commercial_items) && req.body.commercial_items.length > 0) {
        const cPayload = req.body.commercial_items.map((c, idx) => validateCommercialItem(c, vData.id, idx));
        const { error: cError } = await supabase.from('dt_quotation_commercial_items').insert(cPayload);
        if (cError) throw cError;
      }

      await logAudit({ req, user, action: 'CREATE', module: 'Quotations', entity: 'Quotation', entityId: qData.id, description: `Created quotation ${quotation_no}` });
      return res.status(201).json({ quotation: qData, version: vData });
    }

    if (req.method === 'PUT') {
      const { id, action, status } = req.body;

      // ACTION: CHANGE STATUS
      if (action === 'change_status') {
        if (!id || !status) return fail(res, 400, 'id and status required');
        const { data: oldData } = await supabase.from('dt_quotations').select('*').eq('id', id).single();
        if (!oldData) return fail(res, 404, 'Not found');
        
        const { data, error } = await supabase.from('dt_quotations').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) throw error;
        
        await logAudit({ req, user, action: 'UPDATE', module: 'Quotations', entity: 'Quotation', entityId: id, description: `Changed status of ${data.quotation_no} to ${status}` });
        return res.status(200).json(data);
      }

      // DEFAULT: UPDATE VERSION (Must be Draft)
      if (!id) return fail(res, 400, 'version id is required');
      
      const { data: oldVersion } = await supabase.from('dt_quotation_versions').select('*, quotation:quotation_id(status, quotation_no)').eq('id', id).single();
      if (!oldVersion) return fail(res, 404, 'Version not found');
      if (oldVersion.quotation?.status !== 'Draft') {
        return fail(res, 400, 'Can only edit Draft quotations. Create a new version instead.');
      }

      const vPayload = validateVersion(req.body);
      vPayload.updated_at = new Date().toISOString();

      const { data: vData, error: vError } = await supabase.from('dt_quotation_versions').update(vPayload).eq('id', id).select().single();
      if (vError) throw vError;

      // For simplicity, delete old service areas (charges cascade) and insert new ones
      await supabase.from('dt_quotation_service_areas').delete().eq('version_id', id);
      await supabase.from('dt_quotation_milestones').delete().eq('version_id', id);
      await supabase.from('dt_quotation_commercial_items').delete().eq('version_id', id);
      
      if (Array.isArray(req.body.service_areas) && req.body.service_areas.length > 0) {
        let areaIdx = 0;
        for (const area of req.body.service_areas) {
          const aPayload = validateServiceArea(area, vData.id, areaIdx++);
          const { data: aData, error: aError } = await supabase.from('dt_quotation_service_areas').insert(aPayload).select().single();
          if (aError) throw aError;
          
          if (Array.isArray(area.charges) && area.charges.length > 0) {
             const cPayload = area.charges.map((c, cIdx) => validateCharge(c, aData.id, cIdx));
             const { error: cError } = await supabase.from('dt_quotation_charges').insert(cPayload);
             if (cError) throw cError;
          }
        }
      }

      if (Array.isArray(req.body.milestones) && req.body.milestones.length > 0) {
        const mPayload = req.body.milestones.map((m, mIdx) => validateMilestone(m, vData.id, mIdx));
        const { error: mError } = await supabase.from('dt_quotation_milestones').insert(mPayload);
        if (mError) throw mError;
      }

      if (Array.isArray(req.body.commercial_items) && req.body.commercial_items.length > 0) {
        const cPayload = req.body.commercial_items.map((c, idx) => validateCommercialItem(c, vData.id, idx));
        const { error: cError } = await supabase.from('dt_quotation_commercial_items').insert(cPayload);
        if (cError) throw cError;
      }

      await logAudit({ req, user, action: 'UPDATE', module: 'Quotations', entity: 'QuotationVersion', entityId: id, description: `Updated version ${vData.version_number} of ${oldVersion.quotation?.quotation_no}` });
      
      // Touch parent quotation to trigger notifications
      await supabase.from('dt_quotations').update({ updated_at: new Date().toISOString() }).eq('id', oldVersion.quotation_id);

      return res.status(200).json(vData);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return fail(res, 400, 'id is required');
      const { data: oldData } = await supabase.from('dt_quotations').select('*').eq('id', id).single();
      if (!oldData) return fail(res, 404, 'Not found');
      const { error } = await supabase.from('dt_quotations').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      await logAudit({ req, user, action: 'DELETE', module: 'Quotations', entity: 'Quotation', entityId: id, description: `Deleted quotation ${oldData.quotation_no}` });
      return res.status(200).json({ ok: true });
    }

    return fail(res, 405, 'Method not allowed');
  } catch (err) {
    const isValidation = /required|valid|must|too long/i.test(err.message || '');
    return fail(res, isValidation ? 400 : 500, err.message);
  }
}

function validateVersion(body) {
  // Re-calculate totals to prevent tampering
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  if (Array.isArray(body.service_areas)) {
    body.service_areas.forEach(area => {
      if (Array.isArray(area.charges)) {
        area.charges.forEach(c => {
          subtotal += Number(c.rate) || 0;
        });
      }
    });
  }
  
  // Note: Since no item-level discount/tax was defined in the new spec, 
  // we assume discount and tax might come from the top level if they exist,
  // or they are 0.
  totalDiscount = Number(body.discount) || 0;
  totalTax = Number(body.tax) || 0;
  
  const grandTotal = subtotal - totalDiscount + totalTax;

  return {
    template: V.str(body.template, { field: 'Template' }) || 'logistics',
    date: V.date(body.date, { field: 'Date' }) || null,
    valid_until: V.date(body.valid_until, { field: 'Valid Until' }) || null,
    enquiry_no: V.str(body.enquiry_no, { field: 'Enquiry No' }),
    department: V.str(body.department, { field: 'Department' }),
    service_type: V.str(body.service_type, { field: 'Service Type' }),
    project_type_description: V.str(body.project_type_description, { field: 'Project Type Description' }),
    from_location: V.str(body.from_location, { field: 'From Location' }),
    to_location: V.str(body.to_location, { field: 'To Location' }),
    customer_name: V.str(body.customer_name, { field: 'Customer Name', max: 255 }),
    company: V.str(body.company, { field: 'Company', max: 255 }),
    lead_source: V.str(body.lead_source, { field: 'Source' }),
    lead_status: V.str(body.lead_status, { field: 'Status' }),
    primary_phone: V.str(body.primary_phone, { field: 'Primary Phone' }),
    secondary_phone: V.str(body.secondary_phone, { field: 'Secondary Phone' }),
    tertiary_phone: V.str(body.tertiary_phone, { field: 'Tertiary Phone' }),
    primary_email: V.str(body.primary_email, { field: 'Primary Email' }),
    secondary_email: V.str(body.secondary_email, { field: 'Secondary Email' }),
    budget: V.num(body.budget, { field: 'Budget', def: 0, min: 0 }),
    source_person: V.str(body.source_person, { field: 'Source Person' }),
    lead_received_date: V.date(body.lead_received_date, { field: 'Lead Received Date' }) || null,
    address: V.str(body.address, { field: 'Address' }),
    lead_remarks: V.str(body.lead_remarks, { field: 'Lead Remarks' }),
    currency: V.str(body.currency, { field: 'Currency' }) || 'USD',
    payment_terms: V.str(body.payment_terms, { field: 'Payment Terms' }),
    notes: V.str(body.notes, { field: 'Notes' }),
    terms: V.str(body.terms, { field: 'Terms' }),
    subtotal,
    discount: totalDiscount,
    tax: totalTax,
    grand_total: grandTotal
  };
}

function validateServiceArea(sa, versionId, idx) {
  return {
    version_id: versionId,
    name: V.str(sa.name, { field: 'Service Area Name', required: true, max: 250 }),
    location: V.str(sa.location, { field: 'Location' }),
    remarks: V.str(sa.remarks, { field: 'Remarks' }),
    sort_order: idx
  };
}

function validateCharge(charge, serviceAreaId, sortOrder) {
  return {
    service_area_id: serviceAreaId,
    charge_name: V.str(charge.charge_name, { field: 'Charge Name' }),
    basis: V.str(charge.basis) || 'Flat',
    currency: V.str(charge.currency) || 'USD',
    rate: Number(charge.rate) || 0,
    sort_order: sortOrder
  };
}

function validateCommercialItem(item, versionId, sortOrder) {
  return {
    version_id: versionId,
    project_type: V.str(item.project_type, { field: 'Project Service' }),
    description: V.str(item.description, { field: 'Description' }),
    base_amount: Number(item.base_amount) || 0,
    gst_percent: Number(item.gst_percent) || 0,
    gst_amount: Number(item.gst_amount) || 0,
    amount_inc_gst: Number(item.amount_inc_gst) || 0,
    sort_order: sortOrder
  };
}

function validateMilestone(body, versionId, sortOrder) {
  return {
    version_id: versionId,
    label: V.str(body.label, { field: 'Milestone Label', req: true }),
    description: V.str(body.description, { field: 'Milestone Description' }),
    percent: V.num(body.percent, { field: 'Percent', def: 0 }),
    base_amount: V.num(body.base_amount, { field: 'Base Amount', def: 0 }),
    gst_percent: V.num(body.gst_percent, { field: 'GST %', def: 0 }),
    gst_amount: V.num(body.gst_amount, { field: 'GST Amt', def: 0 }),
    amount: V.num(body.amount, { field: 'Amount', def: 0 }),
    sort_order: sortOrder
  };
}

