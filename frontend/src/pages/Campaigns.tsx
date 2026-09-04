import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Megaphone, Pencil, Trash2, Link as LinkIcon, Power, PowerOff } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Field from '../components/ui/Field';
import Drawer from '../components/ui/Drawer';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { fetchAllCampaigns, saveCampaign, toggleCampaignActive, deleteCampaign, type CampaignRow, type CampaignFormState } from '../lib/campaignsRepo';
import { useToast } from '../components/ui/Toast';
import { cn, formatDate } from '../lib/utils';
import { collect, required, minLen } from '../lib/validators';

const emptyForm: CampaignFormState = {
  type: 'Discount Coupon',
  title: '',
  description: '',
  image: '',
  cta_label: '',
  cta_url: '',
  coupon_code: '',
  expiry: '',
  brand: '',
  qr: false,
  is_active: true,
  sort_order: 0,
};

export default function Campaigns() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: fetchAllCampaigns,
  });

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CampaignFormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<CampaignRow | null>(null);

  const filtered = useMemo(() => (campaigns || []).filter((c) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return [c.title, c.description, c.type, c.brand].some((x) => x?.toLowerCase().includes(q));
  }), [campaigns, search]);

  const openNew = () => {
    setForm({ ...emptyForm, sort_order: (campaigns?.length || 0) + 1 });
    setEditing(false);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (c: CampaignRow) => {
    setForm({ ...c });
    setEditing(true);
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const er = collect({
      title: required(form.title, 'Title') || minLen(form.title, 2, 'Title'),
      type: required(form.type, 'Type'),
    });
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const saveMut = useMutation({
    mutationFn: saveCampaign,
    onSuccess: () => {
      toast('Campaign saved successfully', 'success');
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (e: Error) => toast(`Error saving campaign: ${e.message}`, 'error'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string, is_active: boolean }) => toggleCampaignActive(id, is_active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (e: Error) => toast(`Error toggling campaign: ${e.message}`, 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      toast('Campaign deleted successfully', 'success');
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (e: Error) => toast(`Error deleting campaign: ${e.message}`, 'error'),
  });

  const submit = async () => {
    if (!validate()) return;
    await saveMut.mutateAsync(form);
  };

  const setF = (k: keyof CampaignFormState, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  const columns: Column<CampaignRow>[] = [
    {
      key: 'title', header: 'Campaign / Reveal', sortValue: (c) => c.title.toLowerCase(),
      render: (c) => (
        <div className="flex items-center gap-4">
          {c.image ? (
            <img src={c.image} alt={c.title} className="h-10 w-10 rounded-lg object-cover border border-app shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-brand-50 dark:bg-brand-600/12 flex items-center justify-center shrink-0">
              <Megaphone className="h-5 w-5 text-brand-600 dark:text-brand-300" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-base-fg truncate">{c.title}</p>
            <p className="text-[12px] text-muted-fg truncate">{c.type}{c.brand ? ` · ${c.brand}` : ''}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'description', header: 'Description',
      render: (c) => <span className="text-[13px] text-muted-fg line-clamp-1 max-w-[200px]" title={c.description}>{c.description || '—'}</span>
    },
    {
      key: 'status', header: 'Status', sortValue: (c) => c.is_active ? 1 : 0,
      render: (c) => (
        <Badge
          label={c.is_active ? 'Live' : 'Inactive'}
          color={c.is_active ? '#10b981' : '#64748b'}
        />
      ),
    },
    {
      key: 'actions', header: '', headerClassName: 'w-32', className: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); toggleMut.mutate({ id: c.id, is_active: !c.is_active }); }} title={c.is_active ? 'Deactivate' : 'Activate'} className={cn('h-8 w-8 rounded-lg flex items-center justify-center transition-colors', c.is_active ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10')}>
            {c.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors"><Pencil className="h-4 w-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setToDelete(c); }} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Campaigns"
        subtitle="Manage marketing reveals, offers, and surprises."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>New campaign</Button>}
      />

      <div className="bg-surface border border-app rounded-2xl card-shadow">
        <div className="flex p-4 border-b border-app">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-fg z-10" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search campaigns…" className="pl-10" />
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            rowKey={(c) => c.id}
            onRowClick={openEdit}
            emptyState={
              <EmptyState
                icon={<Megaphone className="h-6 w-6" />}
                title={search ? 'No matching campaigns' : 'No campaigns yet'}
                description={search ? 'Try adjusting your search terms.' : 'Create your first campaign reveal to get started.'}
                action={<Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>New campaign</Button>}
              />
            }
          />
        )}
      </div>

      <Drawer open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit campaign' : 'New campaign'} width="w-[80%] max-w-[80%]"
        footer={<div className="flex items-center justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={submit} loading={saveMut.isPending}>{editing ? 'Save changes' : 'Create campaign'}</Button></div>}>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" required error={errors.type}>
              <Input value={form.type} onChange={(e) => setF('type', e.target.value)} placeholder="e.g. Discount Coupon" invalid={!!errors.type} />
            </Field>
            <Field label="Brand">
              <Input value={form.brand ?? ''} onChange={(e) => setF('brand', e.target.value)} placeholder="e.g. Nike" />
            </Field>
          </div>

          <Field label="Title" required error={errors.title}>
            <Input value={form.title} onChange={(e) => setF('title', e.target.value)} placeholder="Campaign title" invalid={!!errors.title} />
          </Field>

          <Field label="Description">
            <Textarea value={form.description ?? ''} onChange={(e) => setF('description', e.target.value)} placeholder="Describe the offer or reveal..." />
          </Field>

          <Field label="Image URL">
            <Input value={form.image ?? ''} onChange={(e) => setF('image', e.target.value)} placeholder="https://example.com/image.png" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Button Label">
              <Input value={form.cta_label ?? ''} onChange={(e) => setF('cta_label', e.target.value)} placeholder="e.g. Claim Offer" />
            </Field>
            <Field label="Button URL">
              <Input value={form.cta_url ?? ''} onChange={(e) => setF('cta_url', e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Coupon Code">
              <Input value={form.coupon_code ?? ''} onChange={(e) => setF('coupon_code', e.target.value)} placeholder="e.g. SUMMER24" />
            </Field>
            <Field label="Expiry Text">
              <Input value={form.expiry ?? ''} onChange={(e) => setF('expiry', e.target.value)} placeholder="e.g. Valid for 7 days" />
            </Field>
            <Field label="Sort Order">
              <Input type="number" value={form.sort_order.toString()} onChange={(e) => setF('sort_order', Number(e.target.value))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
             <Field label="Show QR Code">
               <SearchableSelect value={form.qr ? 'yes' : 'no'} onChange={(v) => setF('qr', v === 'yes')} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
             </Field>
             <Field label="Status">
               <SearchableSelect value={form.is_active ? 'active' : 'inactive'} onChange={(v) => setF('is_active', v === 'active')} options={[{ value: 'active', label: 'Live (Active)' }, { value: 'inactive', label: 'Draft (Inactive)' }]} />
             </Field>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteMut.mutateAsync(toDelete.id)}
        title="Delete campaign"
        message={`Are you sure you want to delete "${toDelete?.title}"? This cannot be undone.`}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
