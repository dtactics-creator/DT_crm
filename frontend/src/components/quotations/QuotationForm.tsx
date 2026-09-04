import { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import Field from '../ui/Field';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import { Plus, Trash2, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { collect, required } from '../../lib/validators';
import type { QuotationVersion, ServiceArea, QuotationCharge, Lead, QuotationMilestone, Quotation, QuotationCommercialItem, Client } from '../../types';
import QuotationPreview from './QuotationPreview';
import { useMasters, toOptions } from '../../hooks/useMasters';
import { useNextNo } from '../../hooks/useNextNo';
import { SearchableSelect } from '../ui/SearchableSelect';

export interface FormQuotationCharge extends Omit<QuotationCharge, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'service_area_id'> { }
export interface FormQuotationMilestone extends Omit<QuotationMilestone, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version_id'> { }
export interface FormQuotationCommercialItem extends Omit<QuotationCommercialItem, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version_id'> { }

export interface FormServiceArea extends Omit<ServiceArea, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version_id' | 'charges'> {
  charges?: FormQuotationCharge[];
}

export interface QuotationFormValues {
  template: string;
  date: string;
  valid_until: string;
  enquiry_no: string;
  department: string;
  service_type: string;
  project_type_description: string;
  from_location: string;
  to_location: string;
  customer_name: string;
  company: string;
  lead_source: string;
  lead_status: string;
  primary_phone: string;
  secondary_phone: string;
  tertiary_phone: string;
  primary_email: string;
  secondary_email: string;
  budget: number;
  source_person: string;
  lead_received_date: string;
  address: string;
  lead_remarks: string;
  currency: string;
  payment_terms: string;
  notes: string;
  terms: string;
  discount: number;
  tax: number;
  service_areas: FormServiceArea[];
  commercial_items: FormQuotationCommercialItem[];
  milestones: FormQuotationMilestone[];
  subtotal?: number;
  grand_total?: number;
  version_number?: number;
  project_id?: string;
}

const empty: QuotationFormValues = {
  template: 'aurora',
  date: new Date().toISOString().slice(0, 10),
  valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  enquiry_no: '',
  department: '',
  service_type: '',
  project_type_description: '',
  from_location: '',
  to_location: '',
  customer_name: '',
  company: '',
  lead_source: '',
  lead_status: '',
  primary_phone: '',
  secondary_phone: '',
  tertiary_phone: '',
  primary_email: '',
  secondary_email: '',
  budget: 0,
  source_person: '',
  lead_received_date: '',
  address: '',
  lead_remarks: '',
  currency: 'inr',
  payment_terms: '',
  notes: '',
  terms: '1. This quotation is valid for 15 days.\n2. Payment is due as per milestone schedule.\n3. Taxes calculated at invoicing.',
  discount: 0,
  tax: 0,
  service_areas: [],
  commercial_items: [
    { project_type: '', description: '', base_amount: 0, gst_percent: 0, gst_amount: 0, amount_inc_gst: 0, sort_order: 0, exclude_from_milestone: false }
  ],
  milestones: [
    { label: '', description: '', percent: 0, base_amount: 0, gst_percent: 18, gst_amount: 0, amount: 0, sort_order: 0 }
  ],
  project_id: '',
};

const toDateInput = (v: string | null | undefined) => (v ? new Date(v).toISOString().slice(0, 10) : '');

export default function QuotationForm({ open, onClose, onSubmit, initial, saving, title, subtitle, lead, client, projectId }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: QuotationFormValues) => void;
  initial?: QuotationVersion | null;
  saving: boolean;
  title: string;
  subtitle?: string;
  lead?: Lead | null;
  client?: Client | null;
  projectId?: string | null;
}) {
  const [v, setV] = useState<QuotationFormValues>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [snapshotOpen, setSnapshotOpen] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  const { data: masters } = useMasters();
  const { data: nextNo } = useNextNo('quotation', open && !initial);
  const displayQuotationNo = initial?.quotation?.quotation_no ? initial.quotation.quotation_no : (nextNo?.next ?? 'Generating...');

  const typeOpts = toOptions(masters, 'project_type');
  const serviceOpts = toOptions(masters, 'project_service');
  const currencyOpts = toOptions(masters, 'currency');
  const milestoneOpts = toOptions(masters, 'payment_milestone');

  useEffect(() => {
    if (open) {
      setErrors({});
      if (initial) {
        setV({
          version_number: initial.version_number || 1,
          template: initial.template || 'logistics',
          date: toDateInput(initial.date) || empty.date,
          valid_until: toDateInput(initial.valid_until) || empty.valid_until,
          enquiry_no: initial.enquiry_no || '',
          department: initial.department || '',
          service_type: initial.service_type || '',
          project_type_description: initial.project_type_description || '',
          from_location: initial.from_location || '',
          to_location: initial.to_location || '',
          customer_name: initial.customer_name || '',
          company: initial.company || '',
          lead_source: initial.lead_source || '',
          lead_status: initial.lead_status || '',
          primary_phone: initial.primary_phone || '',
          secondary_phone: initial.secondary_phone || '',
          tertiary_phone: initial.tertiary_phone || '',
          primary_email: initial.primary_email || '',
          secondary_email: initial.secondary_email || '',
          budget: Number(initial.budget) || 0,
          source_person: initial.source_person || '',
          lead_received_date: toDateInput(initial.lead_received_date) || '',
          address: initial.address || '',
          lead_remarks: initial.lead_remarks || '',
          currency: initial.currency || 'USD',
          payment_terms: initial.payment_terms || '',
          notes: initial.notes || '',
          terms: initial.terms || '',
          discount: Number(initial.discount) || 0,
          tax: Number(initial.tax) || 0,
          milestones: initial.milestones?.map(m => ({
            label: m.label,
            description: m.description || '',
            percent: Number(m.percent),
            base_amount: Number(m.base_amount) || 0,
            gst_percent: Number(m.gst_percent) || 18,
            gst_amount: Number(m.gst_amount) || 0,
            amount: Number(m.amount),
            sort_order: m.sort_order
          })) || empty.milestones,
          commercial_items: initial.commercial_items?.map(c => ({
            project_type: c.project_type,
            description: c.description,
            base_amount: Number(c.base_amount),
            gst_percent: Number(c.gst_percent),
            gst_amount: Number(c.gst_amount),
            amount_inc_gst: Number(c.amount_inc_gst),
            sort_order: c.sort_order,
            exclude_from_milestone: c.exclude_from_milestone || false
          })) || empty.commercial_items,
          service_areas: initial.service_areas?.map(sa => ({
            name: sa.name,
            location: sa.location || '',
            remarks: sa.remarks || '',
            sort_order: sa.sort_order,
            charges: sa.charges?.map(c => ({
              charge_name: c.charge_name,
              basis: c.basis || '',
              currency: c.currency || 'USD',
              rate: Number(c.rate),
              sort_order: c.sort_order,
            })) || []
          })) || []
        });
      } else {
        setV({
          ...empty,
          customer_name: lead?.customer_name || client?.company_name || '',
          company: lead?.company || client?.company_name || '',
          lead_source: lead?.source || '',
          lead_status: lead?.status || '',
          primary_phone: lead?.primary_phone || client?.phone || '',
          secondary_phone: lead?.secondary_phone || '',
          tertiary_phone: lead?.tertiary_phone || '',
          primary_email: lead?.primary_email || client?.email || '',
          secondary_email: lead?.secondary_email || '',
          budget: Number(lead?.budget) || 0,
          source_person: lead?.source_person || client?.contact_person || '',
          lead_received_date: toDateInput(lead?.lead_received_date) || '',
          address: lead?.address || client?.address || '',
          lead_remarks: lead?.remarks || client?.notes || '',
          service_areas: [{
            name: 'Transport at Origin',
            location: '',
            remarks: '',
            sort_order: 0,
            charges: [{ charge_name: 'Pickup', basis: 'Flat', currency: 'USD', rate: 0, sort_order: 0 }]
          }],
          project_id: projectId || ''
        });
      }
    }
  }, [open, initial, lead, client, projectId]);

  const set = (k: keyof QuotationFormValues, val: any) => {
    setV(p => {
      const next = { ...p, [k]: val };
      if (k === 'budget' || k === 'milestones') {
        let currentBudget = k === 'budget' ? Number(val) : Number(p.budget);
        
        let milestone_basis = 0;
        if (next.template === 'aurora') {
           next.commercial_items.forEach(c => {
             if (!c.exclude_from_milestone) milestone_basis += Number(c.base_amount) || 0;
           });
        } else {
           milestone_basis = currentBudget;
        }

        if (next.template === 'aurora' && milestone_basis >= 0 && next.milestones.length > 0) {
          next.milestones = next.milestones.map(m => {
            const base_amount = Number(((milestone_basis * m.percent) / 100).toFixed(2));
            const gst_amount = Number(((base_amount * (m.gst_percent || 18)) / 100).toFixed(2));
            return {
              ...m,
              base_amount,
              gst_amount,
              amount: Number((base_amount + gst_amount).toFixed(2))
            };
          });
        }
      }
      return next;
    });
  };

  const updateAuroraTotals = (next: QuotationFormValues) => {
    if (next.template === 'aurora') {
      let subtotal = 0;
      let tax = 0;
      let milestone_basis = 0;
      next.commercial_items.forEach((c) => {
        const base = Number(c.base_amount) || 0;
        subtotal += base;
        tax += Number(c.gst_amount) || 0;
        if (!c.exclude_from_milestone) {
          milestone_basis += base;
        }
      });
      next.budget = Number(subtotal.toFixed(2));
      next.tax = Number(tax.toFixed(2));

      if (milestone_basis >= 0 && next.milestones.length > 0) {
        next.milestones = next.milestones.map((m) => {
          const base_amount = Number(((milestone_basis * m.percent) / 100).toFixed(2));
          const gst_amount = Number(((base_amount * (m.gst_percent || 18)) / 100).toFixed(2));
          return {
            ...m,
            base_amount,
            gst_amount,
            amount: Number((base_amount + gst_amount).toFixed(2)),
          };
        });
      }
    }
    return next;
  };

  const addCommercialItem = () => setV(p => updateAuroraTotals({ ...p, commercial_items: [...p.commercial_items, { project_type: '', description: '', base_amount: 0, gst_percent: 18, gst_amount: 0, amount_inc_gst: 0, sort_order: p.commercial_items.length, exclude_from_milestone: false }] }));

  const removeCommercialItem = (i: number) => setV(p => updateAuroraTotals({ ...p, commercial_items: p.commercial_items.filter((_, idx) => idx !== i) }));

  const updateCommercialItem = (i: number, patch: Partial<FormQuotationCommercialItem>) => {
    setV(p => {
      const items = [...p.commercial_items];
      items[i] = { ...items[i], ...patch };
      if (patch.base_amount !== undefined || patch.gst_percent !== undefined) {
        const base = Number(items[i].base_amount) || 0;
        const gst = Number(items[i].gst_percent) || 0;
        items[i].gst_amount = Number(((base * gst) / 100).toFixed(2));
        items[i].amount_inc_gst = Number((base + items[i].gst_amount).toFixed(2));
      }
      return updateAuroraTotals({ ...p, commercial_items: items });
    });
  };

  const addMilestone = () => setV(p => updateAuroraTotals({ ...p, milestones: [...p.milestones, { label: '', description: '', percent: 0, base_amount: 0, gst_percent: 18, gst_amount: 0, amount: 0, sort_order: p.milestones.length }] }));
  const removeMilestone = (i: number) => setV(p => ({ ...p, milestones: p.milestones.filter((_, idx) => idx !== i) }));
  const updateMilestone = (i: number, patch: Partial<FormQuotationMilestone>) => {
    setV(p => {
      const ms = p.milestones.map((m, idx) => idx === i ? { ...m, ...patch } : m);
      
      let milestone_basis = 0;
      p.commercial_items.forEach(c => {
        if (!c.exclude_from_milestone) milestone_basis += Number(c.base_amount) || 0;
      });

      if (patch.percent !== undefined) {
        const base_amount = Number(((milestone_basis * Number(ms[i].percent)) / 100).toFixed(2));
        const gst_amount = Number(((base_amount * Number(ms[i].gst_percent || 18)) / 100).toFixed(2));
        ms[i].base_amount = base_amount;
        ms[i].gst_amount = gst_amount;
        ms[i].amount = Number((base_amount + gst_amount).toFixed(2));
      } else if (patch.base_amount !== undefined) {
        const base_amount = Number(ms[i].base_amount) || 0;
        const percent = milestone_basis > 0 ? Number(((base_amount / milestone_basis) * 100).toFixed(2)) : 0;
        const gst_amount = Number(((base_amount * Number(ms[i].gst_percent || 18)) / 100).toFixed(2));
        ms[i].percent = percent;
        ms[i].gst_amount = gst_amount;
        ms[i].amount = Number((base_amount + gst_amount).toFixed(2));
      } else if (patch.gst_percent !== undefined) {
        const base_amount = Number(ms[i].base_amount) || 0;
        const gst_amount = Number(((base_amount * Number(ms[i].gst_percent || 18)) / 100).toFixed(2));
        ms[i].gst_amount = gst_amount;
        ms[i].amount = Number((base_amount + gst_amount).toFixed(2));
      }
      return { ...p, milestones: ms };
    });
  };

  const addArea = () => setV(p => ({ ...p, service_areas: [...p.service_areas, { name: '', location: '', remarks: '', sort_order: p.service_areas.length, charges: [] }] }));
  const removeArea = (i: number) => setV(p => ({ ...p, service_areas: p.service_areas.filter((_, idx) => idx !== i) }));
  const updateArea = (i: number, patch: Partial<QuotationFormValues['service_areas'][0]>) => {
    setV(p => ({ ...p, service_areas: p.service_areas.map((sa, idx) => idx === i ? { ...sa, ...patch } : sa) }));
  };
  const addCharge = (areaIdx: number) => setV(p => ({ ...p, service_areas: p.service_areas.map((sa, i) => i === areaIdx ? { ...sa, charges: [...(sa.charges || []), { charge_name: '', basis: 'Flat', currency: p.currency, rate: 0, sort_order: (sa.charges || []).length }] } : sa) }));
  const removeCharge = (areaIdx: number, chargeIdx: number) => setV(p => ({ ...p, service_areas: p.service_areas.map((sa, i) => i === areaIdx ? { ...sa, charges: (sa.charges || []).filter((_, cIdx) => cIdx !== chargeIdx) } : sa) }));
  const updateCharge = (areaIdx: number, chargeIdx: number, patch: Partial<FormQuotationCharge>) => setV(p => ({ ...p, service_areas: p.service_areas.map((sa, i) => i === areaIdx ? { ...sa, charges: (sa.charges || []).map((c, cIdx) => cIdx === chargeIdx ? { ...c, ...patch } : c) } : sa) }));

  const validate = () => {
    const e = collect({
      date: required(v.date, 'Date'),
      valid_until: required(v.valid_until, 'Valid Until'),
      currency: required(v.currency, 'Currency'),
      customer_name: required(v.customer_name, 'Customer Name'),
    });

    if (v.template === 'logistics') {
      if (v.service_areas.length === 0) e.service_areas = 'At least one Service Area is required for Logistics templates';
      v.service_areas.forEach((sa, i) => {
        if (!sa.name) e[`area_${i}_name`] = 'Required';
        if (!sa.charges || sa.charges.length === 0) e[`area_${i}_charges`] = 'Required';
        (sa.charges || []).forEach((c, cIdx) => {
          if (!c.charge_name) e[`charge_${i}_${cIdx}_name`] = 'Required';
        });
      });
    }

    if (v.template === 'aurora') {
      const totalPct = v.milestones.reduce((acc, m) => acc + Number(m.percent), 0);
      if (v.milestones.length > 0 && totalPct !== 100) e.milestones = `Milestone percentages must equal 100% (currently ${totalPct}%)`;
      v.milestones.forEach((m, i) => { if (!m.label) e[`ms_${i}_label`] = 'Required'; });
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;

    let currentSubtotal = 0;
    if (v.template === 'logistics') {
      v.service_areas.forEach(sa => { (sa.charges || []).forEach(c => { currentSubtotal += Number(c.rate) || 0; }); });
    } else {
      currentSubtotal = Number(v.budget) || 0;
    }
    const currentGrandTotal = currentSubtotal - (Number(v.discount) || 0) + (Number(v.tax) || 0);

    onSubmit({ ...v, subtotal: currentSubtotal, grand_total: currentGrandTotal });
  };

  let subtotal = 0;
  if (v.template === 'logistics') {
    v.service_areas.forEach(sa => { (sa.charges || []).forEach(c => { subtotal += Number(c.rate) || 0; }); });
  } else {
    subtotal = Number(v.budget) || 0;
  }

  const grandTotal = subtotal - (Number(v.discount) || 0) + (Number(v.tax) || 0);

  // Generate mocks for live preview modal
  const mockQuotation: Quotation = {
    id: 'draft',
    quotation_no: initial?.quotation?.quotation_no || 'DRAFT',
    status: 'Draft',
    lead_id: lead?.id || 'draft',
    client_id: client?.id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  const mockVersion: QuotationVersion = {
    id: 'draft',
    quotation_id: 'draft',
    version_number: initial?.version_number || 1,
    template: v.template,
    date: v.date,
    valid_until: v.valid_until,
    enquiry_no: v.enquiry_no,
    department: v.department,
    service_type: v.service_type,
    project_type_description: v.project_type_description,
    from_location: v.from_location,
    to_location: v.to_location,
    customer_name: v.customer_name,
    company: v.company,
    lead_source: v.lead_source,
    lead_status: v.lead_status,
    primary_phone: v.primary_phone,
    secondary_phone: v.secondary_phone,
    tertiary_phone: v.tertiary_phone,
    primary_email: v.primary_email,
    secondary_email: v.secondary_email,
    budget: v.budget,
    source_person: v.source_person,
    lead_received_date: v.lead_received_date,
    address: v.address,
    lead_remarks: v.lead_remarks,
    currency: v.currency,
    payment_terms: v.payment_terms,
    notes: v.notes,
    terms: v.terms,
    discount: v.discount,
    tax: v.tax,
    subtotal,
    grand_total: grandTotal,
    is_accepted: false,
    service_areas: v.service_areas.map((sa, i) => ({
      ...sa,
      id: `sa-${i}`,
      version_id: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      charges: sa.charges?.map((c, j) => ({
        ...c,
        id: `c-${i}-${j}`,
        service_area_id: `sa-${i}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      })) || []
    })),
    commercial_items: v.commercial_items.map((c, i) => ({
      ...c,
      id: `ci-${i}`,
      version_id: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    })),
    milestones: v.milestones.map((m, i) => ({
      ...m,
      id: `m-${i}`,
      version_id: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    })),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null
  };

  return (
    <>
      <Drawer
        open={open} onClose={onClose} width="max-w-[85%]"
        title={title} subtitle={subtitle}
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-sm font-semibold">
              Grand Total: <span className="text-xl tabular-nums ml-2 text-brand-600">{v.currency?.toUpperCase()} {grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" icon={<Eye className="h-4 w-4" />} onClick={() => setShowPreview(true)}>Preview PDF</Button>
              <div className="w-px h-6 bg-strong mx-2" />
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={submit} loading={saving}>Save Quotation</Button>
            </div>
          </div>
        }
      >
        <div className="space-y-8 pb-10">
          <div className="pb-2 border-b border-app">
            <h2 className="text-2xl font-bold text-base-fg">
              {v.customer_name || 'New Customer'}
              {v.company && v.company !== v.customer_name ? ` - ${v.company}` : ''}
            </h2>
          </div>

          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg mb-4">General Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Field label="Quotation No">
                <Input value={displayQuotationNo} disabled className="bg-subtle/30" />
              </Field>
              <Field label="Version">
                {initial ? (
                  <SearchableSelect
                    options={[
                      { label: `Current Version (V${initial.version_number || 1})`, value: String(initial.version_number || 1) },
                      { label: `Next Version (V${(initial.version_number || 1) + 1})`, value: String((initial.version_number || 1) + 1) }
                    ]}
                    value={String(v.version_number || initial.version_number || 1)}
                    onChange={(val) => set('version_number', parseInt(val) || initial.version_number || 1)}
                  />
                ) : (
                  <Input value="V1" disabled className="bg-subtle/30" />
                )}
              </Field>
              {client?.projects && client.projects.length > 0 && (
                <Field label="Project">
                  <SearchableSelect
                    options={client.projects.map((p: any) => ({ label: p.project_name || p.project_no, value: p.id }))}
                    value={v.project_id || ''}
                    onChange={(val) => set('project_id', val)}
                    placeholder="Select a project..."
                  />
                </Field>
              )}
              <Field label="Quotation Date" required error={errors.date}><Input type="date" value={v.date} onChange={(e) => set('date', e.target.value)} invalid={!!errors.date} /></Field>
              <Field label="Valid Until" required error={errors.valid_until}><Input type="date" value={v.valid_until} onChange={(e) => set('valid_until', e.target.value)} invalid={!!errors.valid_until} /></Field>
              {v.template === 'logistics' && <Field label="Enquiry No"><Input value={v.enquiry_no} onChange={(e) => set('enquiry_no', e.target.value)} placeholder="ENQ-2026-..." /></Field>}
              <Field label="Currency" required error={errors.currency}>
                <SearchableSelect
                  options={currencyOpts}
                  value={v.currency || ''}
                  onChange={(val) => set('currency', val)}
                  placeholder="Select currency..."
                />
              </Field>

              {v.template === 'logistics' && (
                <>
                  <Field label="Department"><Input value={v.department} onChange={(e) => set('department', e.target.value)} placeholder="e.g. Export" /></Field>
                  <Field label="Service Type"><Input value={v.service_type} onChange={(e) => set('service_type', e.target.value)} placeholder="e.g. Air Freight" /></Field>
                  <Field label="From Location"><Input value={v.from_location} onChange={(e) => set('from_location', e.target.value)} placeholder="Origin Port" /></Field>
                  <Field label="To Location"><Input value={v.to_location} onChange={(e) => set('to_location', e.target.value)} placeholder="Destination Port" /></Field>
                </>
              )}
            </div>
          </section>

          <section>
            <button type="button" className="flex items-center justify-between w-full text-left mb-4" onClick={() => setSnapshotOpen(!snapshotOpen)}>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Customer Snapshot (Auto-filled)</p>
              </div>
              {snapshotOpen ? <ChevronUp className="h-5 w-5 text-subtle-fg" /> : <ChevronDown className="h-5 w-5 text-subtle-fg" />}
            </button>

            {snapshotOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Customer Name" required error={errors.customer_name}>
                  <Input value={v.customer_name} onChange={(e) => set('customer_name', e.target.value)} invalid={!!errors.customer_name} />
                </Field>
                <Field label="Company"><Input value={v.company} onChange={(e) => set('company', e.target.value)} /></Field>
                <Field label="Primary Email"><Input value={v.primary_email} onChange={(e) => set('primary_email', e.target.value)} /></Field>
                <Field label="Primary Phone"><Input value={v.primary_phone} onChange={(e) => set('primary_phone', e.target.value)} /></Field>
                <div className="sm:col-span-2"><Field label="Address"><Input value={v.address} onChange={(e) => set('address', e.target.value)} /></Field></div>
              </div>
            )}
          </section>

          {v.template === 'aurora' && (
            <>
              <section>
                <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg mb-4">Project Scope</p>
                <div className="grid grid-cols-1 gap-4">
                  <Field label="Scope of Work (Used for Bullets)"><Textarea value={v.lead_remarks} onChange={(e) => set('lead_remarks', e.target.value)} rows={4} placeholder="Enter each scope item on a new line..." /></Field>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Commercial Summary</p>
                </div>

                <div className="flex gap-4 items-start w-full flex-wrap">
                  <div className="w-full sm:w-48">
                    <Field label="Project Type">
                      <SearchableSelect
                        options={typeOpts}
                        value={v.service_type || ''}
                        onChange={(val) => {
                          const opt = typeOpts.find((o) => o.value === val);
                          const newDesc = (opt as any)?.description || opt?.label || v.project_type_description;
                          setV(p => ({ ...p, service_type: val, project_type_description: newDesc }));
                        }}
                        placeholder="Select type..."
                      />
                    </Field>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Field label="Description">
                      <Input value={v.project_type_description || ''} onChange={(e) => set('project_type_description', e.target.value)} placeholder="e.g. Web Development" />
                    </Field>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Project Services</p>
                  <Button type="button" variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addCommercialItem}>Add Service</Button>
                </div>

                <div className="space-y-4">
                  {v.commercial_items.map((c, i) => (
                    <div key={i} className="flex gap-4 items-start w-full flex-wrap">
                      <div className="flex-[1.5] min-w-[150px]">
                        <Field label="Project Service">
                          <SearchableSelect
                            options={serviceOpts}
                            value={c.project_type || ''}
                            onChange={(val) => {
                              const opt = serviceOpts.find((o) => o.value === val);
                              const newGst = (opt as any)?.gst_percent !== undefined ? (opt as any).gst_percent : c.gst_percent;
                              const newDesc = (opt as any)?.description !== undefined ? (opt as any).description : c.description;
                              updateCommercialItem(i, { project_type: val, gst_percent: newGst, description: newDesc });
                            }}
                            placeholder="Select service..."
                          />
                        </Field>
                      </div>
                      <div className="flex-[2] min-w-[200px]">
                        <Field label="Description">
                          <Input value={c.description || ''} onChange={(e) => updateCommercialItem(i, { description: e.target.value })} placeholder="Service description..." />
                        </Field>
                      </div>
                      <div className="flex-1 min-w-[100px]">
                        <Field label="Base Amount">
                          <Input type="number" min="0" value={c.base_amount} onChange={(e) => updateCommercialItem(i, { base_amount: Number(e.target.value) })} placeholder="Amount" />
                        </Field>
                      </div>
                      <div className="flex-1 min-w-[80px]">
                        <Field label="GST %">
                          <div className="relative">
                            <Input type="number" min="0" max="100" value={c.gst_percent} onChange={(e) => updateCommercialItem(i, { gst_percent: Number(e.target.value) })} className="pr-6" />
                            <span className="absolute right-3 top-2.5 text-xs text-muted-fg">%</span>
                          </div>
                        </Field>
                      </div>
                      <div className="flex-1 min-w-[100px]">
                        <Field label="GST Amt">
                          <Input type="number" value={c.gst_amount} disabled className="bg-surface-3 cursor-not-allowed text-right tabular-nums text-subtle-fg" placeholder="GST" />
                        </Field>
                      </div>
                      <div className="flex-1 min-w-[100px]">
                        <Field label="Total">
                          <Input type="number" value={c.amount_inc_gst} disabled className="bg-surface-3 cursor-not-allowed text-right tabular-nums font-bold text-base-fg" placeholder="Total" />
                        </Field>
                      </div>
                      <div className="pt-7 shrink-0 flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id={`exclude-${i}`}
                          checked={c.exclude_from_milestone || false}
                          onChange={(e) => updateCommercialItem(i, { exclude_from_milestone: e.target.checked })}
                          className="rounded border-app text-brand-600 focus:ring-brand-500 h-4 w-4"
                          title="Exclude from Milestones Calculation"
                        />
                        <button type="button" onClick={() => removeCommercialItem(i)} className="h-10 w-10 shrink-0 rounded text-subtle-fg hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {v.template === 'aurora' && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Payment Milestones</p>
                <Button type="button" variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addMilestone}>Add Milestone</Button>
              </div>
              {errors.milestones && <p className="text-sm text-red-500 mb-2">{errors.milestones}</p>}

              <div className="space-y-4">
                {v.milestones.map((m, i) => (
                  <div key={i} className="flex gap-4 items-start w-full flex-wrap">
                    <div className="flex-1 min-w-[150px]">
                      <Field label="Milestone Label">
                        <SearchableSelect
                          options={milestoneOpts}
                          value={m.label}
                          onChange={(val) => {
                            const opt = milestoneOpts.find((o) => o.value === val);
                            const newPercent = (opt as any)?.percent !== undefined ? (opt as any).percent : m.percent;
                            updateMilestone(i, { label: val, percent: newPercent });
                          }}
                          placeholder="Select..."
                        />
                      </Field>
                    </div>
                    <div className="flex-[2] min-w-[200px]">
                      <Field label="Description">
                        <Input value={m.description || ''} onChange={(e) => updateMilestone(i, { description: e.target.value })} placeholder="Details..." />
                      </Field>
                    </div>
                    <div className="w-20">
                      <Field label="Percent">
                        <div className="relative">
                          <Input type="number" min="0" max="100" value={m.percent} onChange={(e) => updateMilestone(i, { percent: Number(e.target.value) })} className="pr-6" />
                          <span className="absolute right-3 top-2.5 text-xs text-muted-fg">%</span>
                        </div>
                      </Field>
                    </div>
                    <div className="flex-1 min-w-[100px]">
                      <Field label="Base Amount">
                        <Input type="number" min="0" value={m.base_amount || 0} onChange={(e) => updateMilestone(i, { base_amount: Number(e.target.value) })} className="pr-6" placeholder="Base" />
                      </Field>
                    </div>
                    <div className="w-20">
                      <Field label="GST %">
                        <div className="relative">
                          <Input type="number" min="0" max="100" value={m.gst_percent ?? 18} onChange={(e) => updateMilestone(i, { gst_percent: Number(e.target.value) })} className="pr-6" />
                          <span className="absolute right-3 top-2.5 text-xs text-muted-fg">%</span>
                        </div>
                      </Field>
                    </div>
                    <div className="flex-1 min-w-[100px]">
                      <Field label="GST Amt">
                        <Input type="number" value={m.gst_amount || 0} disabled className="bg-surface-3 cursor-not-allowed text-right tabular-nums text-subtle-fg" placeholder="GST" />
                      </Field>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <Field label="Total Amount">
                        <Input type="number" value={m.amount} disabled className="bg-surface-3 cursor-not-allowed text-right tabular-nums font-bold text-base-fg" placeholder="Total" />
                      </Field>
                    </div>
                    <div className="pt-7 shrink-0">
                      <button type="button" onClick={() => removeMilestone(i)} className="h-10 w-10 shrink-0 rounded text-subtle-fg hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {v.template === 'logistics' && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Service Areas & Charges</p>
                <Button type="button" variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addArea}>Add Service Area</Button>
              </div>
              {errors.service_areas && <p className="text-sm text-red-500 mb-2">{errors.service_areas}</p>}

              <div className="space-y-6">
                {v.service_areas.map((area, aIdx) => (
                  <div key={aIdx} className="bg-surface-2 rounded-xl border border-app relative flex flex-col overflow-hidden">
                    <div className="bg-surface border-b border-app p-4 flex gap-4 items-start">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Service Area Name" required error={errors[`area_${aIdx}_name`]}>
                          <Input value={area.name} onChange={(e) => updateArea(aIdx, { name: e.target.value })} invalid={!!errors[`area_${aIdx}_name`]} placeholder="e.g. Transport at Origin" />
                        </Field>
                        <Field label="Location"><Input value={area.location || ''} onChange={(e) => updateArea(aIdx, { location: e.target.value })} placeholder="e.g. New York Port" /></Field>
                        <div className="sm:col-span-2"><Field label="Remarks"><Input value={area.remarks || ''} onChange={(e) => updateArea(aIdx, { remarks: e.target.value })} placeholder="Area specific remarks..." /></Field></div>
                      </div>
                      <button type="button" onClick={() => removeArea(aIdx)} className="mt-6 h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shadow hover:scale-105 shrink-0"><Trash2 className="h-4 w-4" /></button>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-base-fg">Charges</p>
                        <Button type="button" variant="secondary" size="sm" onClick={() => addCharge(aIdx)}>+ Add Charge</Button>
                      </div>
                      {errors[`area_${aIdx}_charges`] && <p className="text-xs text-red-500 mb-2">{errors[`area_${aIdx}_charges`]}</p>}

                      <div className="space-y-4">
                        {(area.charges || []).map((charge, cIdx) => (
                          <div key={cIdx} className="flex gap-4 items-start w-full flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                              <Field label="Charge Name">
                                <Input value={charge.charge_name} onChange={(e) => updateCharge(aIdx, cIdx, { charge_name: e.target.value })} invalid={!!errors[`charge_${aIdx}_${cIdx}_name`]} placeholder="Charge Name" />
                              </Field>
                            </div>
                            <div className="w-32">
                              <Field label="Basis / Unit">
                                <Input value={charge.basis || ''} onChange={(e) => updateCharge(aIdx, cIdx, { basis: e.target.value })} placeholder="Basis" />
                              </Field>
                            </div>
                            <div className="w-24">
                              <Field label="Currency">
                                <Input value={charge.currency || ''} onChange={(e) => updateCharge(aIdx, cIdx, { currency: e.target.value })} placeholder="Currency" />
                              </Field>
                            </div>
                            <div className="w-32">
                              <Field label="Rate">
                                <Input type="number" min="0" value={charge.rate} onChange={(e) => updateCharge(aIdx, cIdx, { rate: Number(e.target.value) })} invalid={!!errors[`charge_${aIdx}_${cIdx}_rate`]} placeholder="Rate" />
                              </Field>
                            </div>
                            <div className="pt-7 shrink-0">
                              <button type="button" onClick={() => removeCharge(aIdx, cIdx)} className="h-10 w-10 shrink-0 rounded text-subtle-fg hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex justify-end mb-6">
              <div className="w-80 bg-surface-2 rounded-xl p-4 border border-app space-y-3">
                <div className="flex justify-between items-center text-sm"><span className="text-muted-fg">Subtotal:</span><span className="tabular-nums font-medium">{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-muted-fg">Discount:</span><Input type="number" min="0" className="w-24 h-8 text-right" placeholder="0" value={v.discount || ''} onChange={(e) => set('discount', Number(e.target.value))} /></div>
                <div className="flex justify-between items-center text-sm"><span className="text-muted-fg">Gst:</span><Input type="number" min="0" className="w-24 h-8 text-right" placeholder="0" value={v.tax || ''} onChange={(e) => set('tax', Number(e.target.value))} /></div>
                <div className="pt-2 border-t border-strong flex justify-between"><span className="font-semibold text-base-fg">Total:</span><span className="font-bold tabular-nums text-brand-600">{grandTotal.toFixed(2)}</span></div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Notes"><Textarea value={v.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any special notes..." rows={3} /></Field>
              <Field label="Terms & Conditions"><Textarea value={v.terms} onChange={(e) => set('terms', e.target.value)} placeholder="1. ...\n2. ..." rows={3} /></Field>
            </div>
          </section>
        </div>
      </Drawer>

      {showPreview && (
        <QuotationPreview
          quotation={mockQuotation}
          version={mockVersion}
          onClose={() => setShowPreview(false)}
          onEdit={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
