import { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import Field from '../ui/Field';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import { SearchableSelect } from '../ui/SearchableSelect';
import { Plus, Trash2, Link2 } from 'lucide-react';
import { toOptions } from '../../hooks/useMasters';
import { useNextNo } from '../../hooks/useNextNo';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployees } from '../../hooks/useEmployees';
import { collect, required, minLen, maxLen, email, phone, nonNegativeNumber, notFutureDate, isBlank, url as urlValid } from '../../lib/validators';
import type { Lead, MasterItem, Employee, ProjectUrl } from '../../types';

export interface LeadFormValues {
  id?: string;
  lead_no: string; customer_name: string; company: string;
  sales_manager_id: string; assigned_employee_id: string; source_person: string;
  primary_phone: string; secondary_phone: string; tertiary_phone: string; primary_email: string; secondary_email: string;
  project_type: string; industry: string; source: string; budget: string;
  status: string; priority: string; lead_received_date: string; address: string; remarks: string;
  next_follow_up?: string | null;
  urls: ProjectUrl[];
}

const empty: LeadFormValues = {
  lead_no: '', customer_name: '', company: '', sales_manager_id: '', assigned_employee_id: '', source_person: '',
  primary_phone: '', secondary_phone: '', tertiary_phone: '', primary_email: '', secondary_email: '',
  project_type: '', industry: '', source: '', budget: '', status: '', priority: 'medium',
  lead_received_date: '', address: '', remarks: '', next_follow_up: null,
  urls: [],
};

const toDateInput = (v: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : '');
const today = () => new Date().toISOString().slice(0, 10);

export default function LeadForm({ open, onClose, onSubmit, initial, masters, employees, saving }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: LeadFormValues) => void;
  initial?: Lead | null;
  masters: MasterItem[] | undefined;
  employees: Employee[] | undefined;
  saving: boolean;
}) {
  const [v, setV] = useState<LeadFormValues>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user } = useAuth();
  const emailStr = user?.email ?? '';
  const fallbackName = user?.user_metadata?.full_name || user?.user_metadata?.name || emailStr.split('@')[0];
  const { data: allEmployees } = useEmployees();
  const actualEmployee = (allEmployees || []).find((e) => e.email === emailStr);
  const displayUserName = actualEmployee?.employee_name || fallbackName;

  // Preview the next auto-generated lead number for new leads.
  const { data: nextNo } = useNextNo('lead', open && !initial);
  const displayLeadNo = initial ? (v.lead_no || '—') : (nextNo?.next ?? 'Generating…');

  const statusOpts = toOptions(masters, 'lead_status');
  const sourceOpts = toOptions(masters, 'lead_source');
  const typeOpts = toOptions(masters, 'project_type');
  const industryOpts = toOptions(masters, 'industry');
  const priorityOpts = toOptions(masters, 'priority');
  const empOpts = (employees || []).filter((e) => e.status === 'active').map((e) => ({ value: e.id, label: e.employee_name, hint: e.role }));

  useEffect(() => {
    if (open) {
      setErrors({});
      if (initial) {
        setV({
          id: initial.id, lead_no: initial.lead_no ?? '', customer_name: initial.customer_name,
          company: initial.company ?? '', sales_manager_id: initial.sales_manager_id ?? '',
          assigned_employee_id: initial.assigned_employee_id ?? '', source_person: initial.source_person ?? '',
          primary_phone: initial.primary_phone ?? '', secondary_phone: initial.secondary_phone ?? '',
          tertiary_phone: initial.tertiary_phone ?? '',
          primary_email: initial.primary_email ?? '', secondary_email: initial.secondary_email ?? '',
          project_type: initial.project_type ?? '', industry: initial.industry ?? '', source: initial.source, budget: String(initial.budget ?? ''),
          status: initial.status, priority: initial.priority,
          lead_received_date: toDateInput(initial.lead_received_date),
          next_follow_up: initial.next_follow_up ?? null,
          urls: Array.isArray(initial.urls) ? initial.urls : [],
          address: initial.address ?? '',
          remarks: initial.remarks ?? '',
        });
      } else {
        setV({ ...empty, source: sourceOpts[0]?.value ?? '', status: statusOpts[0]?.value ?? '', lead_received_date: today(), sales_manager_id: actualEmployee?.id ?? '' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const set = (k: keyof LeadFormValues, val: string | ProjectUrl[]) => setV((p) => ({ ...p, [k]: val }));

  // Dynamic URL row helpers
  const urlTypeOpts = toOptions(masters, 'url_type');
  const addUrl = () => setV((p) => ({ ...p, urls: [...p.urls, { type: urlTypeOpts[0]?.value ?? '', url: '' }] }));
  const removeUrl = (i: number) => setV((p) => ({ ...p, urls: p.urls.filter((_, idx) => idx !== i) }));
  const updateUrl = (i: number, patch: Partial<ProjectUrl>) =>
    setV((p) => ({ ...p, urls: p.urls.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) }));

  const validate = () => {
    const e = collect({
      customer_name: required(v.customer_name, 'Customer name') || minLen(v.customer_name, 2, 'Customer name') || maxLen(v.customer_name, 120, 'Customer name'),
      company: maxLen(v.company, 200, 'Company'),
      source: required(v.source, 'Lead source'),
      status: required(v.status, 'Status'),
      primary_phone: phone(v.primary_phone, 'Phone number'),
      tertiary_phone: phone(v.tertiary_phone, 'Alternate phone'),
      secondary_phone: phone(v.secondary_phone, 'Telephone number'),
      primary_email: email(v.primary_email, 'Email'),
      secondary_email: email(v.secondary_email, 'Secondary email'),
      budget: nonNegativeNumber(v.budget, 'Budget'),
      source_person: maxLen(v.source_person, 120, 'Source person'),
      lead_received_date: notFutureDate(v.lead_received_date, 'Received date'),
      address: maxLen(v.address, 1000, 'Address'),
      remarks: maxLen(v.remarks, 4000, 'Remarks'),
    });

    v.urls.forEach((row, i) => {
      if (!row.type && !row.url.trim()) return; // ignore fully-empty row
      if (!row.type) e[`url_type_${i}`] = 'Select a type.';
      const urlErr = required(row.url, 'URL') || urlValid(row.url, 'URL');
      if (urlErr) e[`url_${i}`] = urlErr;
    });

    // At least one contact method helps qualify a lead.
    if (isBlank(v.primary_phone) && isBlank(v.primary_email)) {
      e.primary_phone = 'Provide at least a phone number or an email.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    onSubmit({ ...v, urls: v.urls.filter((r) => r.type || r.url.trim()) });
  };

  return (
    <Drawer
      open={open} onClose={onClose}
      width="max-w-[70%]"
      title={initial ? 'Edit lead' : 'New lead'}
      subtitle={initial ? `${initial.lead_no} · ${initial.company || initial.customer_name}` : 'Add a new opportunity to your pipeline'}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{initial ? 'Update lead' : 'Save lead'}</Button>
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg mb-3">Lead details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Lead No" hint={initial ? undefined : 'Auto-generated (YY-LD-001)'}>
              <Input value={displayLeadNo} readOnly disabled className="opacity-80 cursor-not-allowed font-semibold" />
            </Field>
            <Field label="Lead Received Date" error={errors.lead_received_date}>
              <Input type="date" value={v.lead_received_date} onChange={(e) => set('lead_received_date', e.target.value)} invalid={!!errors.lead_received_date} />
            </Field>
            <Field label="Customer name" required error={errors.customer_name}>
              <Input value={v.customer_name} onChange={(e) => set('customer_name', e.target.value)} invalid={!!errors.customer_name} placeholder="Jane Cooper" />
            </Field>
            <Field label="Company" error={errors.company}>
              <Input value={v.company} onChange={(e) => set('company', e.target.value)} invalid={!!errors.company} placeholder="Acme Inc." />
            </Field>
            <Field label="Lead coordinator">
              <Input
                value={initial ? ((allEmployees || []).find(e => e.id === v.sales_manager_id)?.employee_name || displayUserName) : displayUserName}
                readOnly
                disabled
                className="opacity-80 cursor-not-allowed font-semibold"
              />
            </Field>
            <Field label="Assigned Employee">
              <SearchableSelect value={v.assigned_employee_id} onChange={(x) => set('assigned_employee_id', x)} options={empOpts} placeholder="Unassigned" clearable />
            </Field>
            <Field label="Source Person" hint="Who brought / referred this lead" error={errors.source_person}>
              <Input value={v.source_person} onChange={(e) => set('source_person', e.target.value)} invalid={!!errors.source_person} placeholder="e.g. Priya" />
            </Field>
          </div>
        </section>

        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg mb-3">Contact information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone Number" error={errors.primary_phone}>
              <Input value={v.primary_phone} onChange={(e) => set('primary_phone', e.target.value)} invalid={!!errors.primary_phone} placeholder="+91 98765 43210" />
            </Field>
            <Field label="Alternate Phone Number" error={errors.tertiary_phone}>
              <Input value={v.tertiary_phone} onChange={(e) => set('tertiary_phone', e.target.value)} invalid={!!errors.tertiary_phone} placeholder="+91 99887 76655" />
            </Field>
            <Field label="Telephone Number" error={errors.secondary_phone}>
              <Input value={v.secondary_phone} onChange={(e) => set('secondary_phone', e.target.value)} invalid={!!errors.secondary_phone} placeholder="+91 80 1234 5678" />
            </Field>
            <Field label="Primary Email" error={errors.primary_email}>
              <Input type="email" value={v.primary_email} onChange={(e) => set('primary_email', e.target.value)} invalid={!!errors.primary_email} placeholder="jane@acme.com" />
            </Field>
            <Field label="Secondary Email" error={errors.secondary_email}>
              <Input type="email" value={v.secondary_email} onChange={(e) => set('secondary_email', e.target.value)} invalid={!!errors.secondary_email} placeholder="hello@acme.com" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address" error={errors.address}>
                <Textarea value={v.address} onChange={(e) => set('address', e.target.value)} invalid={!!errors.address} placeholder="Enter full address…" />
              </Field>
            </div>
          </div>
        </section>

        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg mb-3">Opportunity</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Project type">
              <SearchableSelect value={v.project_type} onChange={(x) => set('project_type', x)} options={typeOpts} placeholder="Select type" clearable />
            </Field>
            <Field label="Industry">
              <SearchableSelect value={v.industry} onChange={(x) => set('industry', x)} options={industryOpts} placeholder="Select industry" clearable />
            </Field>
            <Field label="Lead source" required error={errors.source}>
              <SearchableSelect value={v.source} onChange={(x) => set('source', x)} options={sourceOpts} placeholder="Select source" invalid={!!errors.source} />
            </Field>
            <Field label="Status" required error={errors.status}>
              <SearchableSelect value={v.status} onChange={(x) => set('status', x)} options={statusOpts} placeholder="Select status" invalid={!!errors.status} />
            </Field>
            <Field label="Priority">
              <SearchableSelect value={v.priority} onChange={(x) => set('priority', x)} options={priorityOpts} placeholder="Select priority" />
            </Field>
            <Field label="Budget (₹)" error={errors.budget}>
              <Input type="number" min="0" value={v.budget} onChange={(e) => set('budget', e.target.value)} invalid={!!errors.budget} placeholder="500000" />
            </Field>
          </div>
        </section>

        {/* Dynamic Project URLs */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Project URLs</p>
            <Button type="button" variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addUrl}>Add URL</Button>
          </div>

          {v.urls.length === 0 ? (
            <button type="button" onClick={addUrl}
              className="w-full rounded-xl border border-dashed border-strong px-4 py-5 flex flex-col items-center gap-1.5 text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors">
              <Link2 className="h-5 w-5" />
              <span className="text-[13px] font-medium">Add demo, live, GitHub and other links</span>
            </button>
          ) : (
            <div className="space-y-2.5">
              {v.urls.map((row, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-40 shrink-0">
                    <SearchableSelect
                      value={row.type}
                      onChange={(val) => updateUrl(i, { type: val })}
                      options={urlTypeOpts}
                      placeholder="Type"
                      invalid={!!errors[`url_type_${i}`]}
                    />
                    {errors[`url_type_${i}`] && <p className="text-[11.5px] font-medium text-red-500 mt-1">{errors[`url_type_${i}`]}</p>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Input
                      value={row.url}
                      onChange={(e) => updateUrl(i, { url: e.target.value })}
                      invalid={!!errors[`url_${i}`]}
                      placeholder="https://example.com"
                    />
                    {errors[`url_${i}`] && <p className="text-[11.5px] font-medium text-red-500 mt-1">{errors[`url_${i}`]}</p>}
                  </div>
                  <button type="button" onClick={() => removeUrl(i)}
                    className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center text-muted-fg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <Field label="Remarks" error={errors.remarks}>
          <Textarea value={v.remarks} onChange={(e) => set('remarks', e.target.value)} invalid={!!errors.remarks} placeholder="Add context about this lead…" />
        </Field>
      </div>
    </Drawer>
  );
}
