import { useState, useMemo } from 'react';
import { Plus, Search, UserCog, Mail, Phone, Pencil, Trash2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Field from '../components/ui/Field';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { useEmployees } from '../hooks/useEmployees';
import { useRoles } from '../hooks/useRoles';
import { useCrud } from '../hooks/useCrud';
import { usePermissions } from '../contexts/PermissionContext';
import { collect, required, minLen, maxLen, email, phone, password } from '../lib/validators';
import { cn } from '../lib/utils';
import type { Employee } from '../types';

interface FormState { id?: string; employee_name: string; role: string; phone: string; email: string; password: string; status: string; is_manager: boolean; }
const empty: FormState = { employee_name: '', role: '', phone: '', email: '', password: '', status: 'active', is_manager: false };

export default function Employees() {
  const { can } = usePermissions();
  const { data: employees, isLoading } = useEmployees();
  const { data: roles } = useRoles();
  const { create, update, remove } = useCrud('employees', ['employees', 'managers']);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<Employee | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Role options come from the Roles module (active roles + the current value if it's inactive).
  const roleOptions = (roles || [])
    .filter((r) => r.status === 'active' || r.name === form.role)
    .map((r) => ({ value: r.name, label: r.name }));

  const filtered = useMemo(() => (employees || []).filter((e) => {
    const q = search.toLowerCase();
    const matchQ = !q || [e.employee_name, e.email, e.role].some((x) => x.toLowerCase().includes(q));
    const matchRole = !roleFilter || (roleFilter === 'manager' ? e.is_manager : !e.is_manager);
    return matchQ && matchRole;
  }), [employees, search, roleFilter]);

  const openNew = () => { setForm(empty); setEditing(false); setErrors({}); setModalOpen(true); };
  const openEdit = (e: Employee) => {
    setForm({ id: e.id, employee_name: e.employee_name, role: e.role, phone: e.phone ?? '', email: e.email, password: '', status: e.status, is_manager: e.is_manager });
    setEditing(true); setErrors({}); setModalOpen(true);
  };

  const validate = () => {
    const er = collect({
      employee_name: required(form.employee_name, 'Employee name') || minLen(form.employee_name, 2, 'Employee name') || maxLen(form.employee_name, 120, 'Employee name'),
      role: required(form.role, 'Role'),
      email: required(form.email, 'Email') || email(form.email, 'Email'),
      phone: phone(form.phone, 'Phone'),
      // Password required when creating; optional when editing (blank = keep current).
      password: password(form.password, { requiredField: !form.id }),
    });
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const payload = {
      ...(form.id ? { id: form.id } : {}),
      employee_name: form.employee_name, role: form.role, phone: form.phone || null,
      email: form.email, status: form.status, is_manager: form.is_manager,
      ...(form.password ? { password: form.password } : {}),
    };
    try {
      if (form.id) await update.mutateAsync(payload); else await create.mutateAsync(payload);
      setModalOpen(false);
    } catch { /* toast handled by useCrud */ }
  };

  const handleDelete = async () => { if (!toDelete) return; await remove.mutateAsync(toDelete.id); setToDelete(null); };
  const set = (k: keyof FormState, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Employees" subtitle="Your team directory — owners and project managers across the CRM."
        actions={can('employees.create') ? <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>Add employee</Button> : null} />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-fg z-10" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search team members…" className="pl-10" />
        </div>
        <div className="w-48">
          <SearchableSelect value={roleFilter} onChange={setRoleFilter} placeholder="All roles"
            options={[{ value: '', label: 'All roles' }, { value: 'manager', label: 'Project Managers' }, { value: 'employee', label: 'Employees' }]} />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-app rounded-2xl card-shadow">
          <EmptyState icon={<UserCog className="h-6 w-6" />} title="No employees found" description="Add your first team member to assign leads and projects."
            action={can('employees.create') ? <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>Add employee</Button> : null} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((e) => (
            <div key={e.id} className="bg-surface border border-app rounded-2xl card-shadow p-5 hover:card-shadow-lg hover:border-strong transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={e.employee_name} size={48} />
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-base-fg truncate">{e.employee_name}</p>
                    <p className="text-[12.5px] text-muted-fg truncate">{e.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {can('employees.edit') && <button onClick={() => openEdit(e)} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors"><Pencil className="h-4 w-4" /></button>}
                  {can('employees.delete') && <button onClick={() => setToDelete(e)} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                {e.is_manager && (
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-0.5 rounded-full text-brand-700 bg-brand-50 dark:bg-brand-600/12 dark:text-brand-300">
                    <ShieldCheck className="h-3 w-3" /> Manager
                  </span>
                )}
                <span className={cn('inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2 py-0.5 rounded-full',
                  e.status === 'active' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : 'text-slate-500 bg-slate-100 dark:bg-slate-500/10')}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', e.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400')} />
                  {e.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-app space-y-2">
                <div className="flex items-center gap-2.5 text-[12.5px] text-muted-fg"><Mail className="h-3.5 w-3.5 text-subtle-fg shrink-0" /><span className="truncate">{e.email}</span></div>
                <div className="flex items-center gap-2.5 text-[12.5px] text-muted-fg"><Phone className="h-3.5 w-3.5 text-subtle-fg shrink-0" /><span className="truncate">{e.phone || '—'}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit employee' : 'Add employee'} size="max-w-lg"
        footer={<div className="flex items-center justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={submit} loading={create.isPending || update.isPending}>{editing ? 'Save changes' : 'Add employee'}</Button></div>}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Employee name" required error={errors.employee_name}>
              <Input value={form.employee_name} onChange={(e) => set('employee_name', e.target.value)} invalid={!!errors.employee_name} placeholder="Jane Cooper" />
            </Field>
            <Field label="Role" required error={errors.role} hint={roleOptions.length === 0 ? 'Create roles in the Roles module first' : undefined}>
              <SearchableSelect value={form.role} onChange={(v) => set('role', v)} options={roleOptions} placeholder="Select role" invalid={!!errors.role} />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} invalid={!!errors.phone} placeholder="+1 555 000 0000" />
            </Field>
            <Field label="Email" required error={errors.email}>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} invalid={!!errors.email} placeholder="jane@dtactics.io" />
            </Field>
            <Field label={editing ? 'Password' : 'Password'} required={!editing} error={errors.password}
              hint={editing ? 'Leave blank to keep current password' : 'Employee uses this to sign in'}>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => set('password', e.target.value)} invalid={!!errors.password} placeholder={editing ? '••••••••' : 'Min 6 characters'} className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle-fg hover:text-base-fg transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field label="Status">
              <SearchableSelect value={form.status} onChange={(v) => set('status', v)} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
            </Field>
            <Field label="Type">
              <SearchableSelect value={form.is_manager ? 'manager' : 'employee'} onChange={(v) => set('is_manager', v === 'manager')} options={[{ value: 'employee', label: 'Employee' }, { value: 'manager', label: 'Project Manager' }]} />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete}
        title="Remove employee" message={`Remove ${toDelete?.employee_name} from the directory? Their assigned records will be unaffected.`} confirmLabel="Remove" loading={remove.isPending} />
    </div>
  );
}
