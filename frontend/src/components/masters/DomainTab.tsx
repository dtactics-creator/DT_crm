import { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, Globe } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Field from '../ui/Field';
import Modal from '../ui/Modal';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import ConfirmDialog from '../ui/ConfirmDialog';
import DataTable, { type Column } from '../DataTable';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useCrud } from '../../hooks/useCrud';
import { groupMasters, useMasters } from '../../hooks/useMasters';
import { cn } from '../../lib/utils';
import type { MasterItem } from '../../types';
import { usePermissions } from '../../contexts/PermissionContext';
import { required, maxLen } from '../../lib/validators';

interface FormState { 
  id?: string; 
  name: string; 
  domain: string; 
  is_active: boolean; 
}

export default function DomainTab() {
  const permPrefix = 'campaign_masters';

  const extractHostname = (url: string) => {
    const match = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/im);
    return match ? match[1] : url;
  };
  const category = 'campaign_domain';
  const { can } = usePermissions();
  const { data: masters, isLoading } = useMasters();
  const { create, update, remove } = useCrud('masters', ['masters']);
  const items = useMemo(() => groupMasters(masters)[category] ?? [], [masters]);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ name: '', domain: '', is_active: true });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState<MasterItem | null>(null);

  const filtered = useMemo(() => items.filter((m) => 
    m.label.toLowerCase().includes(search.toLowerCase()) || 
    (m.value && m.value.toLowerCase().includes(search.toLowerCase()))
  ), [items, search]);

  const openNew = () => { 
    setForm({ name: '', domain: '', is_active: true }); 
    setEditing(false); 
    setError(''); 
    setModalOpen(true); 
  };
  
  const openEdit = (m: MasterItem) => { 
    setForm({ 
      id: m.id, 
      name: m.label, 
      domain: m.value || '', 
      is_active: m.is_active 
    }); 
    setEditing(true); 
    setError(''); 
    setModalOpen(true); 
  };

  const submit = async () => {
    const nameErr = required(form.name, 'Name') || maxLen(form.name, 80, 'Name');
    if (nameErr) { setError(nameErr); return; }
    
    const domainErr = required(form.domain, 'Domain') || maxLen(form.domain, 100, 'Domain');
    if (domainErr) { setError(domainErr); return; }

    const dupe = items.some((m) => m.label.trim().toLowerCase() === form.name.trim().toLowerCase() && m.id !== form.id);
    if (dupe) { setError('A domain with this name already exists.'); return; }
    
    const dupeDomain = items.some((m) => m.value?.trim().toLowerCase() === form.domain.trim().toLowerCase() && m.id !== form.id);
    if (dupeDomain) { setError('This domain URL already exists.'); return; }

    const payload = { 
      ...(form.id ? { id: form.id } : {}), 
      category, 
      label: form.name.trim(), 
      value: form.domain.trim(), 
      is_active: form.is_active,
      color: '#3b82f6',
      sort_order: form.id ? items.find(i => i.id === form.id)?.sort_order ?? 0 : (items[items.length - 1]?.sort_order ?? 0) + 1,
    };
    try {
      if (form.id) await update.mutateAsync(payload); else await create.mutateAsync(payload);
      setModalOpen(false);
    } catch { /* toast handled by useCrud */ }
  };

  const handleDelete = async () => { if (!toDelete) return; await remove.mutateAsync(toDelete.id); setToDelete(null); };

  const columns: Column<MasterItem>[] = [
    { key: 'label', header: 'Name', sortValue: (r) => r.label.toLowerCase(), render: (r) => (
      <span className="font-medium text-base-fg">{r.label}</span>
    ) },
    { key: 'domain', header: 'Domain', render: (r) => (
      <span className="text-[13px] text-muted-fg">{r.value}</span>
    ) },
    { key: 'status', header: 'Status', render: (r) => (
        <span className={cn('inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2 py-0.5 rounded-full',
          r.is_active ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : 'text-slate-500 bg-slate-100 dark:bg-slate-500/10')}>
          <span className={cn('h-1.5 w-1.5 rounded-full', r.is_active ? 'bg-emerald-500' : 'bg-slate-400')} />
          {r.is_active ? 'Active' : 'Inactive'}
        </span>
    )},
    { key: 'actions', header: '', headerClassName: 'w-24', className: 'text-right', render: (r) => (
      <div className="flex items-center justify-end gap-1">
        {can(`${permPrefix}.edit`) && <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors"><Pencil className="h-4 w-4" /></button>}
        {can(`${permPrefix}.delete`) && <button onClick={(e) => { e.stopPropagation(); setToDelete(r); }} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>}
      </div>
    ) },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-fg z-10" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search domains..." className="pl-10" />
        </div>
        {can(`${permPrefix}.create`) && <Button icon={<Plus className="h-4 w-4" />} onClick={openNew} className="sm:ml-auto">Add Domain</Button>}
      </div>

      <div className="bg-surface border border-app rounded-2xl card-shadow">
        {isLoading ? (
          <div className="p-5 space-y-2.5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <DataTable data={filtered} columns={columns} rowKey={(r) => r.id} pageSize={8}
            emptyState={<EmptyState icon={<Globe className="h-6 w-6" />} title={search ? 'No matches' : 'No domains yet'}
              description={search ? 'Try a different search.' : 'Add your first campaign domain.'}
              action={can(`${permPrefix}.create`) ? <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>Add Domain</Button> : null} />} />
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Domain' : 'Add Domain'}
        footer={<div className="flex items-center justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={submit} loading={create.isPending || update.isPending}>{editing ? 'Save' : 'Add'}</Button></div>}>
        <div className="space-y-4">
          <Field label="Name" required error={error}>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} invalid={!!error} placeholder="e.g. Primary Website" autoFocus />
          </Field>
          <Field label="Domain" required error={error}>
            <Input value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: extractHostname(e.target.value) }))} invalid={!!error} placeholder="e.g. example.com" />
          </Field>
          <Field label="Status">
            <SearchableSelect 
              value={form.is_active ? 'active' : 'inactive'} 
              onChange={(v) => setForm((f) => ({ ...f, is_active: v === 'active' }))} 
              options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} 
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete}
        title="Delete Domain" message={`Delete "${toDelete?.label}"? Records using this value will keep their raw value.`} loading={remove.isPending} />
    </div>
  );
}
