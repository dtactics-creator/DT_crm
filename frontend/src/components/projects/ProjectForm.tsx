import { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import Field from '../ui/Field';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import { SearchableSelect, MultiSelect } from '../ui/SearchableSelect';
import { Plus, Trash2, Link2 } from 'lucide-react';
import { toOptions } from '../../hooks/useMasters';
import { useNextNo } from '../../hooks/useNextNo';
import { collect, required, minLen, maxLen, nonNegativeNumber, integerInRange, dateOrder, url as urlValid } from '../../lib/validators';
import type { Project, MasterItem, Employee, Lead, ProjectUrl } from '../../types';

export interface ProjectFormValues {
  id?: string;
  project_no: string; project_name: string; client: string; lead_id: string;
  project_type: string; project_manager_id: string; assigned_employee_id: string;
  technology_stack: string[]; urls: ProjectUrl[]; project_cost: string; status: string; priority: string;
  progress: string; start_date: string; expected_delivery: string; remarks: string;
}

const empty: ProjectFormValues = {
  project_no: '', project_name: '', client: '', lead_id: '', project_type: '', project_manager_id: '',
  assigned_employee_id: '', technology_stack: [], urls: [], project_cost: '', status: '', priority: 'medium',
  progress: '0', start_date: '', expected_delivery: '', remarks: '',
};


const toDateInput = (v: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : '');

export default function ProjectForm({ open, onClose, onSubmit, initial, masters, employees, managers, leads, saving }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ProjectFormValues) => void;
  initial?: Project | null;
  masters: MasterItem[] | undefined;
  employees: Employee[] | undefined;
  managers: Employee[] | undefined;
  leads: Lead[] | undefined;
  saving: boolean;
}) {
  const [v, setV] = useState<ProjectFormValues>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Preview the next auto-generated project number for new projects.
  const { data: nextNo } = useNextNo('project', open && !initial);
  const displayProjectNo = initial ? (v.project_no || '—') : (nextNo?.next ?? 'Generating…');

  const typeOpts = toOptions(masters, 'project_type');
  const statusOpts = toOptions(masters, 'project_status');
  const priorityOpts = toOptions(masters, 'priority');
  const stackOpts = toOptions(masters, 'technology_stack');
  const managerOpts = (managers || []).map((m) => ({ value: m.id, label: m.employee_name, hint: m.role }));
  const empOpts = (employees || []).filter((e) => e.status === 'active').map((e) => ({ value: e.id, label: e.employee_name, hint: e.role }));
  const leadOpts = (leads || []).map((l) => ({ value: l.id, label: `${l.lead_no ?? ''} · ${l.company || l.customer_name}`.trim() }));

  useEffect(() => {
    if (open) {
      setErrors({});
      if (initial) {
        setV({
          id: initial.id, project_no: initial.project_no ?? '', project_name: initial.project_name,
          client: initial.client, lead_id: initial.lead_id ?? '', project_type: initial.project_type ?? '',
          project_manager_id: initial.project_manager_id ?? '', assigned_employee_id: initial.assigned_employee_id ?? '',
          technology_stack: Array.isArray(initial.technology_stack) ? initial.technology_stack : [],
          urls: Array.isArray(initial.urls) ? initial.urls : [],
          project_cost: String(initial.project_cost ?? ''), status: initial.status, priority: initial.priority,
          progress: String(initial.progress ?? 0), start_date: toDateInput(initial.start_date),
          expected_delivery: toDateInput(initial.expected_delivery), remarks: initial.remarks ?? '',
        });
      } else {
        setV({ ...empty, project_type: typeOpts[0]?.value ?? '', status: statusOpts[0]?.value ?? '' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const set = (k: keyof ProjectFormValues, val: string | string[] | ProjectUrl[]) => setV((p) => ({ ...p, [k]: val }));

  // Dynamic URL row helpers
  const urlTypeOpts = toOptions(masters, 'url_type');
  const addUrl = () => setV((p) => ({ ...p, urls: [...p.urls, { type: urlTypeOpts[0]?.value ?? '', url: '' }] }));
  const removeUrl = (i: number) => setV((p) => ({ ...p, urls: p.urls.filter((_, idx) => idx !== i) }));
  const updateUrl = (i: number, patch: Partial<ProjectUrl>) =>
    setV((p) => ({ ...p, urls: p.urls.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) }));

  const validate = () => {
    const e = collect({
      project_name: required(v.project_name, 'Project name') || minLen(v.project_name, 2, 'Project name') || maxLen(v.project_name, 150, 'Project name'),
      client: required(v.client, 'Client') || maxLen(v.client, 150, 'Client'),
      project_type: required(v.project_type, 'Project type'),
      status: required(v.status, 'Status'),
      project_cost: nonNegativeNumber(v.project_cost, 'Project cost'),
      progress: integerInRange(v.progress, 0, 100, 'Progress'),
      expected_delivery: dateOrder(v.start_date, v.expected_delivery, 'Expected delivery'),
      remarks: maxLen(v.remarks, 4000, 'Remarks'),
    });
    v.urls.forEach((row, i) => {
      if (!row.type && !row.url.trim()) return; // ignore fully-empty row
      if (!row.type) e[`url_type_${i}`] = 'Select a type.';
      const urlErr = required(row.url, 'URL') || urlValid(row.url, 'URL');
      if (urlErr) e[`url_${i}`] = urlErr;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    // Drop fully-empty URL rows before submitting.
    onSubmit({ ...v, urls: v.urls.filter((r) => r.type || r.url.trim()) });
  };

  return (
    <Drawer
      open={open} onClose={onClose}
      width="max-w-[70%]"
      title={initial ? 'Edit project' : 'New project'}
      subtitle={initial ? `${initial.project_no} · ${initial.client}` : 'Set up a new client project'}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{initial ? 'Update project' : 'Save project'}</Button>
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg mb-3">Overview</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Project No" hint={initial ? undefined : 'Auto-generated (PRJ-2001)'}>
              <Input value={displayProjectNo} readOnly disabled className="opacity-80 cursor-not-allowed font-semibold" />
            </Field>
            <Field label="Project name" required error={errors.project_name}>
              <Input value={v.project_name} onChange={(e) => set('project_name', e.target.value)} invalid={!!errors.project_name} placeholder="Acme CRM Platform" />
            </Field>
            <Field label="Client" required error={errors.client}>
              <Input value={v.client} onChange={(e) => set('client', e.target.value)} invalid={!!errors.client} placeholder="Acme Corp" />
            </Field>
            <Field label="Lead reference" hint="Link the originating lead">
              <SearchableSelect value={v.lead_id} onChange={(x) => set('lead_id', x)} options={leadOpts} placeholder="None" clearable />
            </Field>
            <Field label="Project type" required error={errors.project_type}>
              <SearchableSelect value={v.project_type} onChange={(x) => set('project_type', x)} options={typeOpts} placeholder="Select type" invalid={!!errors.project_type} />
            </Field>
            <Field label="Status" required error={errors.status}>
              <SearchableSelect value={v.status} onChange={(x) => set('status', x)} options={statusOpts} placeholder="Select status" invalid={!!errors.status} />
            </Field>
          </div>
        </section>

        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg mb-3">Team &amp; delivery</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Project manager">
              <SearchableSelect value={v.project_manager_id} onChange={(x) => set('project_manager_id', x)} options={managerOpts} placeholder="Assign manager" clearable />
            </Field>
            <Field label="Assigned employee">
              <SearchableSelect value={v.assigned_employee_id} onChange={(x) => set('assigned_employee_id', x)} options={empOpts} placeholder="Assign employee" clearable />
            </Field>
            <Field label="Priority">
              <SearchableSelect value={v.priority} onChange={(x) => set('priority', x)} options={priorityOpts} placeholder="Select priority" />
            </Field>
            <Field label="Start date">
              <Input type="date" value={v.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </Field>
            <Field label="Expected delivery" error={errors.expected_delivery}>
              <Input type="date" value={v.expected_delivery} onChange={(e) => set('expected_delivery', e.target.value)} invalid={!!errors.expected_delivery} />
            </Field>
          </div>
        </section>

        <Field label="Technology stack">
          <MultiSelect values={v.technology_stack} onChange={(x) => set('technology_stack', x)} options={stackOpts} placeholder="Select technologies" />
        </Field>

        {/* Dynamic project URLs */}
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

        <Field label={`Progress — ${v.progress || 0}%`}>
          <input type="range" min="0" max="100" value={v.progress || 0} onChange={(e) => set('progress', e.target.value)} className="w-full accent-brand-600 h-2 cursor-pointer" />
        </Field>

        <Field label="Remarks">
          <Textarea value={v.remarks} onChange={(e) => set('remarks', e.target.value)} placeholder="Describe the project scope and objectives…" />
        </Field>
      </div>
    </Drawer>
  );
}
