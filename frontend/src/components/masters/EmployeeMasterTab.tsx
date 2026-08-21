import { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, Users } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Field from '../ui/Field';
import Modal from '../ui/Modal';
import Avatar from '../ui/Avatar';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import ConfirmDialog from '../ui/ConfirmDialog';
import DataTable, { type Column } from '../DataTable';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useEmployees } from '../../hooks/useEmployees';
import { useRoles } from '../../hooks/useRoles';
import { useCrud } from '../../hooks/useCrud';
import { cn } from '../../lib/utils';
import type { Employee } from '../../types';

interface FormState { id?: string; employee_name: string; role: string; phone: string; email: string; password: string; status: string; }
const empty: FormState = { employee_name: '', role: '', phone: '', email: '', password: '', status: 'active' };
import { usePermissions } from '../../contexts/PermissionContext';
import { collect, required, minLen, maxLen, email, phone, password } from '../../lib/validators';

export default function EmployeeMasterTab({ singular }: { singular: string }) {
  const { can } = usePermissions();
  const { data: employees, isLoading } = useEmployees();
  const { data: roles } = useRoles();
  const { create, update, remove } = useCrud('employees', ['employees', 'managers']);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<Employee | null>(null);

  const roleOptions = (roles || [])
    .filter((r) => r.status === 'active' || r.name === form.role)
    .map((r) => ({ value: r.name, label: r.name }));

  const scoped = useMemo(() => employees || [], [employees]);
  const filtered = useMemo(() => scoped.filter((e) => [e.employee_name, e.email, e.role].some((x) => x.toLowerCase().includes(search.toLowerCase()))), [scoped, search]);

  const openNew = () => { setForm({ ...empty }); setEditing(false); setErrors({}); setModalOpen(true); };
  const openEdit = (e: Employee) => { setForm({ id: e.id, employee_name: e.employee_name, role: e.role, phone: e.phone ?? '', email: e.email, password: '', status: e.status }); setEditing(true); setErrors({}); setModalOpen(true); };

  const validate = () => {
    const er = collect({
      employee_name: required(form.employee_name, 'Name') || minLen(form.employee_name, 2, 'Name') || maxLen(form.employee_name, 120, 'Name'),
      role: required(form.role, 'Role'),
      email: required(form.email, 'Email') || email(form.email, 'Email'),
      phone: phone(form.phone, 'Phone'),
      password: password(form.password, { requiredField: !form.id }),
    });
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const payload = { ...(form.id ? { id: form.id } : {}), employee_name: form.employee_name, role: form.role, phone: form.phone || null, email: form.email, status: form.status, ...(form.password ? { password: form.password } : {}) };
    try {
      if (form.id) await update.mutateAsync(payload); else await create.mutateAsync(payload);
      setModalOpen(false);
    } catch { /* toast handled by useCrud */ }
  };

  const handleDelete = async () => { if (!toDelete) return; await remove.mutateAsync(toDelete.id); setToDelete(null); };
  const set = (k: keyof FormState, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const columns: Column<Employee>[] = [
    { key: 'name', header: 'Employee', sortValue: (r) => r.employee_name.toLowerCase(), render: (r) => (
      <div className="flex items-center gap-3"><Avatar name={r.employee_name} size={32} /><div><p className="font-semibold text-base-fg">{r.employee_name}</p><p className="text-[12px] text-muted-fg">{r.role}</p></div></div>
    ) },
    { key: 'email', header: 'Email', sortValue: (r) => r.email, render: (r) => <span className="text-muted-fg text-[12.5px]">{r.email}</span> },
    { key: 'phone', header: 'Phone', render: (r) => <span className="text-muted-fg text-[12.5px]">{r.phone || '—'}</span> },
    { key: 'status', header: 'Status', sortValue: (r) => r.status, render: (r) => (
      <span className={cn('inline-flex items-center gap-1.5 text-[11.5px] font-semibold', r.status === 'active' ? 'text-emerald-600' : 'text-slate-500')}>
        <span className={cn('h-1.5 w-1.5 rounded-full', r.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400')} />{r.status === 'active' ? 'Active' : 'Inactive'}
      </span>
    ) },
    { key: 'actions', header: '', headerClassName: 'w-24', className: 'text-right', render: (r) => (
      <div className="flex items-center justify-end gap-1">
        {can('employees.edit') && <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors"><Pencil className="h-4 w-4" /></button>}
        {can('employees.delete') && <button onClick={(e) => { e.stopPropagation(); setToDelete(r); }} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>}
      </div>
    ) },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-fg z-10" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${singular.toLowerCase()}…`} className="pl-10" />
        </div>
        {can('employees.create') && <Button icon={<Plus className="h-4 w-4" />} onClick={openNew} className="sm:ml-auto">Add {singular.toLowerCase()}</Button>}
      </div>

      <div className="bg-surface border border-app rounded-2xl card-shadow">
        {isLoading ? (
          <div className="p-5 space-y-2.5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <DataTable data={filtered} columns={columns} rowKey={(r) => r.id} pageSize={8}
            emptyState={<EmptyState icon={<Users className="h-6 w-6" />} title={search ? 'No matches' : `No ${singular.toLowerCase()} yet`}
              description={search ? 'Try a different search.' : `Add your first ${singular.toLowerCase()}.`}
              action={can('employees.create') ? <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>Add {singular.toLowerCase()}</Button> : null} />} />
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${singular}` : `Add ${singular}`} size="max-w-lg"
        footer={<div className="flex items-center justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={submit} loading={create.isPending || update.isPending}>{editing ? 'Save' : 'Add'}</Button></div>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Employee name" required error={errors.employee_name}><Input value={form.employee_name} onChange={(e) => set('employee_name', e.target.value)} invalid={!!errors.employee_name} placeholder="Jane Cooper" /></Field>
          <Field label="Role" required error={errors.role}><SearchableSelect value={form.role} onChange={(v) => set('role', v)} options={roleOptions} placeholder="Select role" invalid={!!errors.role} /></Field>
          <Field label="Phone" error={errors.phone}><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} invalid={!!errors.phone} placeholder="+1 555 000 0000" /></Field>
          <Field label="Email" required error={errors.email}><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} invalid={!!errors.email} placeholder="jane@dtactics.io" /></Field>
          <Field label="Password" required={!editing} error={errors.password} hint={editing ? 'Leave blank to keep current' : 'Used to sign in'}><Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} invalid={!!errors.password} placeholder={editing ? '••••••••' : 'Min 6 characters'} /></Field>
          <Field label="Status"><SearchableSelect value={form.status} onChange={(v) => set('status', v)} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete} title={`Remove ${singular}`} message={`Remove ${toDelete?.employee_name}?`} confirmLabel="Remove" loading={remove.isPending} />
    </div>
  );
}
