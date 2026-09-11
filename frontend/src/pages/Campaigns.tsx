import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Megaphone, Pencil, Trash2, Link as LinkIcon, Power, PowerOff, UploadCloud, Loader2 } from 'lucide-react';
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
import { cn, formatDate, formatDateTime } from '../lib/utils';
import { collect, required, minLen } from '../lib/validators';
import { useMasters, toOptions } from '../hooks/useMasters';
import { useClients } from '../hooks/useClients';
import { fetchAllTemplates } from '../lib/templatesRepo';
import { usePermissions } from '../contexts/PermissionContext';

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
  start_datetime: '',
  end_datetime: '',
  template_id: '',
  template_config: null,
};

export default function Campaigns() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { can } = usePermissions();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: fetchAllCampaigns,
  });

  const { data: masters } = useMasters();
  const { data: clients } = useClients();

  const campaignTypeOpts = useMemo(() => toOptions(masters, 'campaign_type'), [masters]);
  const brandOpts = useMemo(() => {
    const opts = (clients || []).map(c => ({ value: c.company_name, label: c.company_name }));
    // Remove duplicates just in case there are clients with the same company name
    return Array.from(new Map(opts.map(item => [item.value, item])).values());
  }, [clients]);

  const { data: templates } = useQuery({
    queryKey: ['campaign-templates'],
    queryFn: fetchAllTemplates,
  });

  const templateOpts = useMemo(() => {
    return (templates || []).map(t => ({ value: t.id, label: t.name }));
  }, [templates]);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CampaignFormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<CampaignRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const filtered = useMemo(() => (campaigns || []).filter((c) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return [c.title, c.description, c.type, c.brand].some((x) => x?.toLowerCase().includes(q));
  }), [campaigns, search]);

  const openNew = () => {
    setForm({ ...emptyForm, sort_order: (campaigns?.length || 0) + 1 });
    setEditing(false);
    setErrors({});
    setSelectedFile(null);
    setPreviewUrl(null);
    setModalOpen(true);
  };

  const openEdit = (campaign: CampaignRow) => {
    setErrors({});
    setForm({
      id: campaign.id,
      type: campaign.type,
      title: campaign.title,
      description: campaign.description,
      image: campaign.image || '',
      cta_label: campaign.cta_label || '',
      cta_url: campaign.cta_url || '',
      coupon_code: campaign.coupon_code || '',
      expiry: campaign.expiry || '',
      brand: campaign.brand || '',
      qr: campaign.qr,
      is_active: campaign.is_active,
      sort_order: campaign.sort_order,
      start_datetime: campaign.start_datetime ? new Date(campaign.start_datetime).toISOString().slice(0, 16) : '',
      end_datetime: campaign.end_datetime ? new Date(campaign.end_datetime).toISOString().slice(0, 16) : '',
      template_id: campaign.template_id || '',
      template_config: campaign.template_config,
    });
    setEditing(true);
    setSelectedFile(null);
    setPreviewUrl(null);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      toast('File is too large. Maximum size is 1MB.', 'error');
      if (e.target) e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setF('image', '');
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
    mutationFn: async (id: string) => {
      const c = campaigns?.find((camp) => camp.id === id);
      if (c) {
        const urlsToClean: string[] = [];
        if (c.image) urlsToClean.push(c.image);
        const template = templates?.find((t) => t.id === c.template_id);
        const imageProps = template?.schema?.sections?.flatMap((s: any) => s.properties)?.filter((p: any) => p.type === 'image') || [];
        imageProps.forEach((prop: any) => {
          if (c.template_config && c.template_config[prop.id]) {
            urlsToClean.push(c.template_config[prop.id]);
          }
        });
        if (urlsToClean.length > 0) {
          import('../lib/utils').then(({ deleteStorageImages }) => deleteStorageImages(urlsToClean));
        }
      }
      return deleteCampaign(id);
    },
    onSuccess: () => {
      toast('Campaign deleted successfully', 'success');
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (e: Error) => toast(`Error deleting campaign: ${e.message}`, 'error'),
  });

  const submit = async () => {
    if (!validate()) return;

    let finalForm = { ...form };

    if (selectedFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', selectedFile);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');

        finalForm.image = data.url;
      } catch (err: any) {
        toast(err.message || 'Error uploading image', 'error');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const dataToSave = { ...finalForm };
    const oldUrlsToClean: string[] = [];

    // Auto-fill template config if template_id changes for a new selection
    if (dataToSave.template_id) {
      const selectedTpl = templates?.find(t => t.id === dataToSave.template_id);
      if (selectedTpl && !editing) {
        dataToSave.template_config = selectedTpl.default_config;
      }
    }

    const originalCampaign = editing ? campaigns?.find(c => c.id === form.id) : null;
    if (originalCampaign && originalCampaign.image && originalCampaign.image !== dataToSave.image) {
      oldUrlsToClean.push(originalCampaign.image);
    }

    if (oldUrlsToClean.length > 0) {
      import('../lib/utils').then(({ deleteStorageImages }) => deleteStorageImages(oldUrlsToClean));
    }

    saveMut.mutate(dataToSave);
  };

  const setF = (k: keyof CampaignFormState, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  const formatDiff = (diff: number) => {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const renderDateTime = (val: string | null | undefined) => {
    if (!val) return <span className="text-[13px] text-muted-fg">—</span>;
    const str = formatDateTime(val);
    if (str === '—') return <span className="text-[13px] text-muted-fg">—</span>;
    const [date, time] = str.split(' ');
    return (
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] text-base-fg font-medium">{date}</span>
        <span className="text-[12px] text-muted-fg mt-0.5">{time}</span>
      </div>
    );
  };

  const columns: Column<CampaignRow>[] = [
    {
      key: 'title', header: 'Campaign', sortValue: (c) => c.title.toLowerCase(),
      render: (c) => (
        <div className="flex items-center gap-4 min-w-[200px]">
          {c.image ? (
            <img src={c.image} alt={c.title} className="h-10 w-10 rounded-lg object-cover border border-app shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-brand-50 dark:bg-brand-600/12 flex items-center justify-center shrink-0">
              <Megaphone className="h-5 w-5 text-brand-600 dark:text-brand-300" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-base-fg truncate">{c.title}</p>
            {c.description && <p className="text-[12px] text-muted-fg truncate mt-0.5 max-w-[200px]">{c.description}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'brand', header: 'Client',
      render: (c) => <span className="text-[13px] text-muted-fg whitespace-nowrap">{c.brand || '—'}</span>
    },
    {
      key: 'start_datetime', header: 'Start Date',
      render: (c) => renderDateTime(c.start_datetime)
    },
    {
      key: 'end_datetime', header: 'End Date',
      render: (c) => renderDateTime(c.end_datetime)
    },
    {
      key: 'type', header: 'Type',
      render: (c) => <span className="text-[13px] font-medium text-base-fg">{c.type}</span>
    },
    {
      key: 'due', header: 'due',
      render: (c) => {
        if (!c.start_datetime || !c.end_datetime) return <span className="text-[13px] text-muted-fg">—</span>;
        const now = Date.now();
        const start = new Date(c.start_datetime).getTime();
        const end = new Date(c.end_datetime).getTime();

        if (now < start) {
          return <span className="text-[13px] font-medium text-brand-600">Starts in {formatDiff(start - now)}</span>;
        }

        const diff = end - now;
        if (diff <= 0) return <span className="text-[13px] text-red-500 font-medium">Expired</span>;
        return <span className="text-[13px] font-medium text-amber-600">{formatDiff(diff)} left</span>;
      }
    },
    {
      key: 'expiry', header: 'Expiry',
      render: (c) => {
        if (!c.start_datetime || !c.end_datetime) return <span className="text-[13px] text-muted-fg whitespace-nowrap">{c.expiry || '—'}</span>;
        const diff = new Date(c.end_datetime).getTime() - new Date(c.start_datetime).getTime();
        if (diff <= 0) return <span className="text-[13px] text-muted-fg whitespace-nowrap">{c.expiry || '—'}</span>;
        return <span className="text-[13px] text-muted-fg whitespace-nowrap">{formatDiff(diff)}</span>;
      }
    },
    {
      key: 'status', header: 'Status', sortValue: (c) => c.is_active ? 1 : 0,
      render: (c) => {
        const isExpired = c.end_datetime && new Date(c.end_datetime) <= new Date();
        return (
          <Badge
            label={c.is_active ? 'Live' : (isExpired ? 'Expired' : 'Inactive')}
            color={c.is_active ? '#10b981' : (isExpired ? '#ef4444' : '#64748b')}
          />
        );
      },
    },
    {
      key: 'actions', header: '', headerClassName: 'w-32', className: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          {can('campaigns.edit') && <button onClick={(e) => { e.stopPropagation(); toggleMut.mutate({ id: c.id, is_active: !c.is_active }); }} title={c.is_active ? 'Deactivate' : 'Activate'} className={cn('h-8 w-8 rounded-lg flex items-center justify-center transition-colors', c.is_active ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10')}>
            {c.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          </button>}
          {can('campaigns.edit') && <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors"><Pencil className="h-4 w-4" /></button>}
          {can('campaigns.delete') && <button onClick={(e) => { e.stopPropagation(); setToDelete(c); }} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>}
        </div>
      ),
    },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Campaigns"
        subtitle="Manage marketing reveals, offers, and surprises."
        actions={can('campaigns.create') ? <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>New campaign</Button> : null}
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
                action={can('campaigns.create') ? <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>New campaign</Button> : null}
              />
            }
          />
        )}
      </div>

      <Drawer open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit campaign' : 'New campaign'}
        footer={<div className="flex items-center justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={submit} loading={saveMut.isPending}>{editing ? 'Save changes' : 'Create campaign'}</Button></div>}>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" required error={errors.type}>
              <SearchableSelect
                value={form.type}
                onChange={(v) => setF('type', v)}
                options={campaignTypeOpts}
                placeholder="Select Type..."
                invalid={!!errors.type}
              />
            </Field>
            <Field label="Client">
              <SearchableSelect
                value={form.brand ?? ''}
                onChange={(v) => setF('brand', v)}
                options={brandOpts}
                placeholder="Select Brand..."
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Title" required error={errors.title}>
              <Input value={form.title} onChange={(e) => setF('title', e.target.value)} placeholder="Campaign title" invalid={!!errors.title} />
            </Field>
            <Field label="Promo Code">
              <Input value={form.coupon_code ?? ''} onChange={(e) => setF('coupon_code', e.target.value)} placeholder="e.g., SUMMER50" />
            </Field>
          </div>

          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setF('description', e.target.value)} placeholder="Campaign description" rows={3} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Button Text">
              <Input value={form.cta_label ?? ''} onChange={(e) => setF('cta_label', e.target.value)} placeholder="e.g. Shop Now" />
            </Field>
            <Field label="Button URL">
              <Input value={form.cta_url ?? ''} onChange={(e) => setF('cta_url', e.target.value)} placeholder="https://..." />
            </Field>
          </div>

          <Field label="Campaign Image">
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <Input value={form.image ?? ''} onChange={(e) => setF('image', e.target.value)} placeholder="https://example.com/image.png or upload..." />
              </div>
              <div>
                <Button type="button" variant="secondary" onClick={() => document.getElementById('img-upload')?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
                <input type="file" id="img-upload" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>
            </div>
            {(previewUrl || form.image) && (
              <div className="mt-3 rounded-xl border border-app overflow-hidden h-40 bg-surface-2 flex items-center justify-center">
                <img src={previewUrl || form.image || undefined} alt="Campaign preview" className="max-h-full max-w-full object-contain" />
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date & Time">
              <Input type="datetime-local" value={form.start_datetime ? new Date(new Date(form.start_datetime).getTime() - new Date(form.start_datetime).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={(e) => setF('start_datetime', e.target.value ? new Date(e.target.value).toISOString() : '')} />
            </Field>
            <Field label="Expire Date & Time">
              <Input type="datetime-local" value={form.end_datetime ? new Date(new Date(form.end_datetime).getTime() - new Date(form.end_datetime).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={(e) => setF('end_datetime', e.target.value ? new Date(e.target.value).toISOString() : '')} />
            </Field>
            <Field label="Expiry Text">
              <Input value={form.expiry ?? ''} onChange={(e) => setF('expiry', e.target.value)} placeholder="e.g., Valid until Dec 31" />
            </Field>
            <Field label="Sort Order">
              <Input type="number" value={form.sort_order.toString()} onChange={(e) => setF('sort_order', Number(e.target.value))} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-2">
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
