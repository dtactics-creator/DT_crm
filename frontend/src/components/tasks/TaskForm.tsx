import { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import Field from '../ui/Field';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import { SearchableSelect } from '../ui/SearchableSelect';
import { toOptions } from '../../hooks/useMasters';
import { useNextNo } from '../../hooks/useNextNo';
import { collect, required, minLen, maxLen } from '../../lib/validators';
import type { Task, Project, Employee, MasterItem } from '../../types';

export interface TaskFormValues {
  id?: string;
  task_no: string;
  project_id: string;
  title: string;
  description: string;
  module: string;
  assigned_employee_id: string;
  status: string;
  priority: string;
  start_date: string;
  due_date: string;
  estimated_hours: string;
  additional_notes: string;
}

const empty: TaskFormValues = {
  task_no: '',
  project_id: '',
  title: '',
  description: '',
  module: '',
  assigned_employee_id: '',
  status: 'assigned',
  priority: 'medium',
  start_date: '',
  due_date: '',
  estimated_hours: '',
  additional_notes: '',
};

const toDateInput = (v: string | null | undefined) => (v ? new Date(v).toISOString().slice(0, 10) : '');

export default function TaskForm({
  open,
  onClose,
  onSubmit,
  initial,
  projectContext,
  projects,
  employees,
  masters,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
  initial?: Task | null;
  projectContext?: Partial<Project> | null;
  projects?: Project[];
  employees?: Employee[];
  masters?: MasterItem[];
  saving: boolean;
}) {
  const [v, setV] = useState<TaskFormValues>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: nextNo } = useNextNo('task', open && !initial);
  const displayTaskNo = initial ? (v.task_no || '—') : (nextNo?.next ?? 'Generating…');

  const moduleOpts = toOptions(masters, 'task_module');
  const statusOpts = toOptions(masters, 'task_status');
  const priorityOpts = toOptions(masters, 'task_priority');
  const empOpts = (employees || [])
    .filter((e) => e.status === 'active')
    .map((e) => ({ value: e.id, label: e.employee_name, hint: e.role }));
  const projectOpts = (projects || []).map((p) => ({
    value: p.id,
    label: p.project_name,
    hint: p.client,
  }));

  useEffect(() => {
    if (open) {
      setErrors({});
      if (initial) {
        setV({
          id: initial.id,
          task_no: initial.task_no ?? '',
          project_id: initial.project_id ?? projectContext?.id ?? '',
          title: initial.title,
          description: initial.description ?? '',
          module: initial.module ?? '',
          assigned_employee_id: initial.assigned_employee_id ?? '',
          status: initial.status || 'assigned',
          priority: initial.priority || 'medium',
          start_date: toDateInput(initial.start_date),
          due_date: toDateInput(initial.due_date),
          estimated_hours: String(initial.estimated_hours ?? ''),
          additional_notes: initial.additional_notes ?? '',
        });
      } else {
        setV({
          ...empty,
          project_id: projectContext?.id ?? (projectOpts[0]?.value || ''),
          module: moduleOpts[0]?.value || '',
          status: statusOpts[0]?.value || 'assigned',
          priority: priorityOpts[1]?.value || 'medium',
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, projectContext]);

  const set = (k: keyof TaskFormValues, val: string) => setV((p) => ({ ...p, [k]: val }));

  const boundProjectName = projectContext?.project_name || (projects || []).find((p) => p.id === v.project_id)?.project_name;

  const validate = () => {
    const e = collect({
      project_id: required(v.project_id, 'Project'),
      title: required(v.title, 'Task Title') || minLen(v.title, 2, 'Task Title') || maxLen(v.title, 200, 'Task Title'),
      description: maxLen(v.description, 4000, 'Description'),
      additional_notes: maxLen(v.additional_notes, 4000, 'Additional Notes'),
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    onSubmit(v);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={initial ? 'Edit Task' : 'Create Task'}
      subtitle={boundProjectName ? `Project: ${boundProjectName}` : 'Assign work items to project team members'}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>
            {initial ? 'Save Task' : 'Create Task'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg mb-3">Project & Identification</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Task No" hint={initial ? undefined : 'Auto-generated (TK-2001)'}>
              <Input value={displayTaskNo} readOnly disabled className="opacity-80 cursor-not-allowed font-semibold" />
            </Field>

            {projectContext ? (
              <Field label="Project" hint="Auto-filled from project context">
                <Input value={projectContext.project_name || ''} readOnly disabled className="opacity-80 cursor-not-allowed font-semibold text-brand-600" />
              </Field>
            ) : (
              <Field label="Project" required error={errors.project_id}>
                <SearchableSelect
                  value={v.project_id}
                  onChange={(val) => set('project_id', val)}
                  options={projectOpts}
                  placeholder="Select Project"
                  invalid={!!errors.project_id}
                />
              </Field>
            )}
          </div>
        </section>

        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg mb-3">Task Details</p>
          <div className="space-y-4">
            <Field label="Task Title" required error={errors.title}>
              <Input
                value={v.title}
                onChange={(e) => set('title', e.target.value)}
                invalid={!!errors.title}
                placeholder="e.g. Build User Authentication API"
              />
            </Field>

            <Field label="Description" error={errors.description}>
              <Textarea
                value={v.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Detailed explanation of the work required…"
                rows={3}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Module">
                <SearchableSelect
                  value={v.module}
                  onChange={(val) => set('module', val)}
                  options={moduleOpts}
                  placeholder="Select Module"
                />
              </Field>

              <Field label="Assigned To">
                <SearchableSelect
                  value={v.assigned_employee_id}
                  onChange={(val) => set('assigned_employee_id', val)}
                  options={empOpts}
                  placeholder="Select Team Member"
                  clearable
                />
              </Field>

              <Field label="Priority">
                <SearchableSelect
                  value={v.priority}
                  onChange={(val) => set('priority', val)}
                  options={priorityOpts}
                  placeholder="Select Priority"
                />
              </Field>

              <Field label="Status">
                <SearchableSelect
                  value={v.status}
                  onChange={(val) => set('status', val)}
                  options={statusOpts}
                  placeholder="Select Status"
                />
              </Field>
            </div>
          </div>
        </section>

        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg mb-3">Schedule & Estimate</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Start Date">
              <Input
                type="date"
                value={v.start_date}
                onChange={(e) => set('start_date', e.target.value)}
              />
            </Field>

            <Field label="Due Date">
              <Input
                type="date"
                value={v.due_date}
                onChange={(e) => set('due_date', e.target.value)}
              />
            </Field>

            <Field label="Est. Hours">
              <Input
                type="number"
                min="0"
                step="0.5"
                value={v.estimated_hours}
                onChange={(e) => set('estimated_hours', e.target.value)}
                placeholder="e.g. 16"
              />
            </Field>
          </div>
        </section>

        <Field label="Additional Notes" error={errors.additional_notes}>
          <Textarea
            value={v.additional_notes}
            onChange={(e) => set('additional_notes', e.target.value)}
            placeholder="Special instructions or link references…"
            rows={2}
          />
        </Field>
      </div>
    </Drawer>
  );
}
