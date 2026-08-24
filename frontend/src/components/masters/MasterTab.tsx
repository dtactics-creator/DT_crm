import { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, Database } from 'lucide-react';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Field from '../ui/Field';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import ConfirmDialog from '../ui/ConfirmDialog';
import DataTable, { type Column } from '../DataTable';
import { useCrud } from '../../hooks/useCrud';
import { groupMasters, useMasters } from '../../hooks/useMasters';
import { cn } from '../../lib/utils';
import type { MasterItem } from '../../types';

const PRESET_COLORS = ['#3366ff', '#0ea5e9', '#8b5cf6', '#ec4899', '#f97316', '#f59e0b', '#10b981', '#14b8a6', '#ef4444', '#64748b'];

interface FormState { id?: string; label: string; color: string; sort_order: number; description?: string; }

import { usePermissions } from '../../contexts/PermissionContext';
import { required, maxLen } from '../../lib/validators';

export default function MasterTab({ category, singular }: { category: string; singular: string }) {
  const { can } = usePermissions();
  const { data: masters, isLoading } = useMasters();
  const { create, update, remove } = useCrud('masters', ['masters']);
  const items = useMemo(() => groupMasters(masters)[category] ?? [], [masters, category]);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ label: '', color: PRESET_COLORS[0], sort_order: 0, description: '' });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState<MasterItem | null>(null);

  const filtered = useMemo(() => items.filter((m) => m.label.toLowerCase().includes(search.toLowerCase())), [items, search]);

  const openNew = () => { setForm({ label: '', color: PRESET_COLORS[0], sort_order: (items[items.length - 1]?.sort_order ?? 0) + 1, description: '' }); setEditing(false); setError(''); setModalOpen(true); };
  const openEdit = (m: MasterItem) => { setForm({ id: m.id, label: m.label, color: m.color || PRESET_COLORS[0], sort_order: m.sort_order, description: m.description || '' }); setEditing(true); setError(''); setModalOpen(true); };

  const submit = async () => {
    const labelErr = required(form.label, 'Label') || maxLen(form.label, 80, 'Label');
    if (labelErr) { setError(labelErr); return; }
    // Prevent duplicate labels within the same category.
    const dupe = items.some((m) => m.label.trim().toLowerCase() === form.label.trim().toLowerCase() && m.id !== form.id);
    if (dupe) { setError('A value with this label already exists.'); return; }
    const order = Number.isFinite(form.sort_order) ? Math.max(0, Math.min(9999, form.sort_order)) : 0;
    const payload = { ...(form.id ? { id: form.id } : {}), category, label: form.label.trim(), color: form.color, sort_order: order, is_active: true, description: form.description || null };
    try {
      if (form.id) await update.mutateAsync(payload); else await create.mutateAsync(payload);
      setModalOpen(false);
    } catch { /* toast handled by useCrud */ }
  };

  const handleDelete = async () => { if (!toDelete) return; await remove.mutateAsync(toDelete.id); setToDelete(null); };

  const columns: Column<MasterItem>[] = [
    { key: 'label', header: 'Label', sortValue: (r) => r.label.toLowerCase(), render: (r) => (
      <div className="flex items-center gap-3">
        <span className="h-7 w-7 rounded-lg shrink-0 border border-app" style={{ backgroundColor: r.color || '#64748b' }} />
        <div><p className="font-semibold text-base-fg">{r.label}</p><p className="text-[11.5px] text-subtle-fg font-mono">{r.value}</p></div>
      </div>
    ) },
    ...(category === 'project_type' ? [{
      key: 'description', header: 'Description', render: (r) => (
        <p className="text-[13px] text-muted-fg max-w-[250px] truncate" title={r.description || ''}>
          {r.description || <span className="text-subtle-fg/50 italic">No description</span>}
        </p>
      )
    } as Column<MasterItem>] : []),
    { key: 'sort', header: 'Order', sortValue: (r) => r.sort_order, render: (r) => <Badge label={`#${r.sort_order}`} color={r.color} /> },
    { key: 'status', header: 'Status', render: () => <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</span> },
    { key: 'actions', header: '', headerClassName: 'w-24', className: 'text-right', render: (r) => (
      <div className="flex items-center justify-end gap-1">
        {can('masters.edit') && <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors"><Pencil className="h-4 w-4" /></button>}
        {can('masters.delete') && <button onClick={(e) => { e.stopPropagation(); setToDelete(r); }} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>}
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
        {can('masters.create') && <Button icon={<Plus className="h-4 w-4" />} onClick={openNew} className="sm:ml-auto">Add {singular.toLowerCase()}</Button>}
      </div>

      <div className="bg-surface border border-app rounded-2xl card-shadow">
        {isLoading ? (
          <div className="p-5 space-y-2.5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <DataTable data={filtered} columns={columns} rowKey={(r) => r.id} pageSize={8}
            emptyState={<EmptyState icon={<Database className="h-6 w-6" />} title={search ? 'No matches' : `No ${singular.toLowerCase()} yet`}
              description={search ? 'Try a different search.' : `Add your first ${singular.toLowerCase()} value.`}
              action={can('masters.create') ? <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>Add {singular.toLowerCase()}</Button> : null} />} />
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${singular}` : `Add ${singular}`}
        footer={<div className="flex items-center justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={submit} loading={create.isPending || update.isPending}>{editing ? 'Save' : 'Add'}</Button></div>}>
        <div className="space-y-4">
          <Field label="Label" required error={error}>
            <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} invalid={!!error} placeholder={`e.g. ${singular}`} autoFocus />
          </Field>
          {category === 'project_type' && (
            <Field label="Description">
              <Textarea value={form.description || ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Enter a brief description..." rows={3} />
            </Field>
          )}
          <Field label="Color">
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={cn('h-8 w-8 rounded-lg transition-transform hover:scale-110', form.color === c && 'ring-2 ring-offset-2 ring-offset-[color:var(--surface)]')}
                  style={{ backgroundColor: c, ...(form.color === c ? { '--tw-ring-color': c } as React.CSSProperties : {}) }} />
              ))}
            </div>
          </Field>
          <Field label="Sort order">
            <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete}
        title={`Delete ${singular}`} message={`Delete "${toDelete?.label}"? Records using this value will keep their raw value.`} loading={remove.isPending} />
    </div>
  );
}
