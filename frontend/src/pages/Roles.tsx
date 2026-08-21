import { useState, useMemo } from 'react';
import { Plus, Search, ShieldCheck, Pencil, Trash2, KeyRound } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Field from '../components/ui/Field';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import PermissionMatrix from '../components/roles/PermissionMatrix';
import { useRoles } from '../hooks/useRoles';
import { useMasters, makeLookup } from '../hooks/useMasters';
import { useCrud } from '../hooks/useCrud';
import { usePermissions } from '../contexts/PermissionContext';
import { collect, required, minLen, maxLen } from '../lib/validators';
import { cn, formatDate } from '../lib/utils';
import type { Role } from '../types';

interface FormState { id?: string; name: string; type: string; description: string; status: string; }
const empty: FormState = { name: '', type: 'sales', description: '', status: 'active' };

export default function Roles() {
  const { can } = usePermissions();
  const { data: roles, isLoading } = useRoles();
  const { data: masters } = useMasters();
  const lookup = makeLookup(masters);
  const { create, update, remove } = useCrud('roles', ['roles', 'employees']);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<Role | null>(null);
  const [permRole, setPermRole] = useState<Role | null>(null);

  const filtered = useMemo(() => (roles || []).filter((r) => {
    const q = search.toLowerCase();
    const matchQ = !q || [r.name, r.description ?? ''].some((x) => x.toLowerCase().includes(q));
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchQ && matchStatus;
  }), [roles, search, statusFilter]);

  const openNew = () => { setForm(empty); setEditing(false); setErrors({}); setModalOpen(true); };
  const openEdit = (r: Role) => { setForm({ id: r.id, name: r.name, type: r.type ?? 'sales', description: r.description ?? '', status: r.status }); setEditing(true); setErrors({}); setModalOpen(true); };

  const validate = () => {
    const er = collect({
      name: required(form.name, 'Role name') || minLen(form.name, 2, 'Role name') || maxLen(form.name, 80, 'Role name'),
      description: maxLen(form.description, 500, 'Description'),
    });
    const dupe = (roles || []).some((r) => r.name.trim().toLowerCase() === form.name.trim().toLowerCase() && r.id !== form.id);
    if (dupe) er.name = 'A role with this name already exists.';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const payload = { ...(form.id ? { id: form.id } : {}), name: form.name.trim(), type: form.type, description: form.description || null, status: form.status };
    try {
      if (form.id) await update.mutateAsync(payload); else await create.mutateAsync(payload);
      setModalOpen(false);
    } catch { /* toast handled in hook */ }
  };

  const handleDelete = async () => { if (!toDelete) return; await remove.mutateAsync(toDelete.id); setToDelete(null); };
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const columns: Column<Role>[] = [
    {
      key: 'name', header: 'Role', sortValue: (r) => r.name.toLowerCase(),
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-brand-50 dark:bg-brand-600/12 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4.5 w-4.5 text-brand-600 dark:text-brand-300" />
          </div>
          <span className="font-semibold text-base-fg">{r.name}</span>
        </div>
      ),
    },

    { key: 'description', header: 'Description', sortValue: (r) => r.description ?? '', render: (r) => <span className="text-muted-fg text-[13px]">{r.description || '—'}</span> },
    {
      key: 'status', header: 'Status', sortValue: (r) => r.status,
      render: (r) => (
        <span className={cn('inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2 py-0.5 rounded-full',
          r.status === 'active' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : 'text-slate-500 bg-slate-100 dark:bg-slate-500/10')}>
          <span className={cn('h-1.5 w-1.5 rounded-full', r.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400')} />
          {r.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    { key: 'created', header: 'Created', sortValue: (r) => r.created_at, render: (r) => <span className="text-muted-fg text-[12.5px]">{formatDate(r.created_at)}</span> },
    {
      key: 'actions', header: '', headerClassName: 'w-32', className: 'text-right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); setPermRole(r); }} title="Manage permissions" className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-brand-50 dark:hover:bg-brand-600/12 hover:text-brand-600 transition-colors"><KeyRound className="h-4 w-4" /></button>
          {can('roles.edit') && <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors"><Pencil className="h-4 w-4" /></button>}
          {can('roles.delete') && <button onClick={(e) => { e.stopPropagation(); setToDelete(r); }} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>}
        </div>
      ),
    },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Roles" subtitle="Define roles and assign granular module permissions."
        actions={can('roles.create') ? <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>New role</Button> : null} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total roles', value: (roles?.length ?? 0).toString() },
          { label: 'Active', value: (roles?.filter((r) => r.status === 'active').length ?? 0).toString() },
          { label: 'Inactive', value: (roles?.filter((r) => r.status !== 'active').length ?? 0).toString() },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-app rounded-xl card-shadow px-4 py-3.5">
            <p className="text-[12px] font-semibold text-muted-fg">{s.label}</p>
            <p className="text-[20px] font-extrabold text-base-fg mt-0.5 tabular">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-app rounded-2xl card-shadow">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-app">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-fg z-10" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search roles…" className="pl-10" />
          </div>

          <div className="w-40">
            <SearchableSelect value={statusFilter} onChange={setStatusFilter} placeholder="All statuses"
              options={[{ value: '', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <DataTable data={filtered} columns={columns} rowKey={(r) => r.id} onRowClick={(r) => setPermRole(r)}
            emptyState={<EmptyState icon={<ShieldCheck className="h-6 w-6" />}
              title={search || statusFilter ? 'No matching roles' : 'No roles yet'}
              description={search || statusFilter ? 'Try adjusting your search or filters.' : 'Create your first role to start assigning them to employees.'}
              action={can('roles.create') ? <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>New role</Button> : null} />} />
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit role' : 'New role'} size="max-w-md"
        footer={<div className="flex items-center justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={submit} loading={create.isPending || update.isPending}>{editing ? 'Save changes' : 'Create role'}</Button></div>}>
        <div className="space-y-4">
          <Field label="Role name" required error={errors.name}>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} placeholder="e.g. Sales Executive" autoFocus />
          </Field>

          <Field label="Description" hint="Optional — describe what this role does" error={errors.description}>
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} invalid={!!errors.description} placeholder="Short description of responsibilities…" />
          </Field>
          <Field label="Status">
            <SearchableSelect value={form.status} onChange={(v) => set('status', v)} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete}
        title="Delete role" message={`Delete the "${toDelete?.name}" role? Employees currently assigned to it will keep the label but it won't be selectable for new assignments.`} loading={remove.isPending} />

      <PermissionMatrix open={!!permRole} onClose={() => setPermRole(null)} role={permRole} canEdit={can('roles.edit')} />
    </div>
  );
}
