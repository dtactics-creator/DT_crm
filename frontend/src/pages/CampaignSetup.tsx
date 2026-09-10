import { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, LayoutList, Calendar, Power, PowerOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import DataTable, { type Column } from '../components/DataTable';
import Drawer from '../components/ui/Drawer';
import Field from '../components/ui/Field';
import Textarea from '../components/ui/Textarea';
import { SearchableSelect, MultiSelect, Option } from '../components/ui/SearchableSelect';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { usePermissions } from '../contexts/PermissionContext';
import { useToast } from '../components/ui/Toast';
import { fetchAllCampaignSetups, saveCampaignSetup, deleteCampaignSetup, CampaignSetupRow, CampaignSetupFormState } from '../lib/campaignSetupsRepo';
import { fetchAllTemplates, CampaignTemplateRow } from '../lib/templatesRepo';
import { formatDateTime } from '../lib/utils';

const toLocalInputFormat = (utcStr: string | null | undefined) => {
  if (!utcStr) return '';
  const d = new Date(utcStr);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
};

export default function CampaignSetup() {
  const { toast } = useToast();
  const { can } = usePermissions();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSetup, setEditingSetup] = useState<CampaignSetupRow | null>(null);
  const [toDelete, setToDelete] = useState<CampaignSetupRow | null>(null);

  const { data: setups, isLoading } = useQuery({
    queryKey: ['campaign-setups'],
    queryFn: fetchAllCampaignSetups,
    enabled: can('campaign_setups.view' as any)
  });

  const { data: allTemplates } = useQuery({
    queryKey: ['campaign-templates'],
    queryFn: fetchAllTemplates,
    enabled: modalOpen
  });

  const activeTemplates = useMemo(() => {
    return (allTemplates || []).filter(t => t.status === 'active').map(t => ({ value: t.id, label: t.name }));
  }, [allTemplates]);

  const [form, setForm] = useState<CampaignSetupFormState>({
    name: '',
    description: '',
    status: 'inactive',
    play_mode: 'loop',
    start_datetime: '',
    end_datetime: '',
    templates: []
  });

  const filtered = useMemo(() => {
    if (!setups) return [];
    return setups.filter((s) => {
      const q = search.toLowerCase();
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q);
    });
  }, [setups, search]);

  const saveMut = useMutation({
    mutationFn: saveCampaignSetup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-setups'] });
      toast(editingSetup ? 'Campaign setup updated' : 'Campaign setup created', 'success');
      setModalOpen(false);
    },
    onError: (err: any) => toast(err.message, 'error')
  });

  const delMut = useMutation({
    mutationFn: deleteCampaignSetup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-setups'] });
      toast('Campaign setup deleted', 'success');
      setToDelete(null);
    },
    onError: (err: any) => toast(err.message, 'error')
  });

  const openNew = () => {
    setForm({ name: '', description: '', status: 'inactive', play_mode: 'loop', start_datetime: '', end_datetime: '', templates: [] });
    setEditingSetup(null);
    setModalOpen(true);
  };

  const toggleStatusMut = useMutation({
    mutationFn: (setup: CampaignSetupRow) => {
      const newStatus = setup.status === 'active' ? 'inactive' : 'active';
      const validTemplates = (setup.templates || []).filter(t => t.template_id).map(t => ({
        template_id: t.template_id,
        start_datetime: t.start_datetime ? new Date(t.start_datetime).toISOString() : '',
        end_datetime: t.end_datetime ? new Date(t.end_datetime).toISOString() : ''
      }));
      
      const formPayload: CampaignSetupFormState = {
        id: setup.id,
        name: setup.name,
        description: setup.description || '',
        status: newStatus,
        play_mode: setup.play_mode || 'loop',
        start_datetime: setup.start_datetime ? new Date(setup.start_datetime).toISOString() : null,
        end_datetime: setup.end_datetime ? new Date(setup.end_datetime).toISOString() : null,
        templates: validTemplates
      };
      
      return saveCampaignSetup(formPayload);
    },
    onMutate: async (c) => {
      await queryClient.cancelQueries({ queryKey: ['campaign-setups'] });
      const previousSetups = queryClient.getQueryData(['campaign-setups']);
      
      queryClient.setQueryData(['campaign-setups'], (old: CampaignSetupRow[] | undefined) => {
        if (!old) return old;
        return old.map(row => {
          if (row.id === c.id) {
            return { ...row, status: c.status === 'active' ? 'inactive' : 'active' };
          }
          return row;
        });
      });
      
      return { previousSetups };
    },
    onSuccess: () => {
      toast('Status updated successfully', 'success');
    },
    onError: (err: any, newC, context: any) => {
      if (context?.previousSetups) {
        queryClient.setQueryData(['campaign-setups'], context.previousSetups);
      }
      toast(err.message || 'Failed to update status', 'error');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-setups'] });
    }
  });

  const openEdit = (s: CampaignSetupRow) => {
    setForm({
      id: s.id,
      name: s.name,
      description: s.description || '',
      status: s.status,
      play_mode: s.play_mode || 'loop',
      start_datetime: toLocalInputFormat(s.start_datetime),
      end_datetime: toLocalInputFormat(s.end_datetime),
      templates: (s.templates || [])
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(t => ({
          template_id: t.template_id,
          start_datetime: toLocalInputFormat(t.start_datetime),
          end_datetime: toLocalInputFormat(t.end_datetime)
      }))
    });
    setEditingSetup(s);
    setModalOpen(true);
  };

  const handleTemplatesChange = (newTemplates: any[]) => {
    const recalculated = newTemplates.map(t => ({ ...t }));
    for (let i = 1; i < recalculated.length; i++) {
      if (recalculated[i - 1].end_datetime) {
        recalculated[i].start_datetime = recalculated[i - 1].end_datetime;
        if (recalculated[i].end_datetime && new Date(recalculated[i].end_datetime) < new Date(recalculated[i].start_datetime)) {
          recalculated[i].end_datetime = recalculated[i].start_datetime;
        }
      }
    }
    
    setForm(prev => ({
      ...prev,
      templates: recalculated,
      start_datetime: recalculated.length > 0 ? (recalculated[0].start_datetime || '') : '',
      end_datetime: recalculated.length > 0 ? (recalculated[recalculated.length - 1].end_datetime || '') : ''
    }));
  };

  const submit = () => {
    if (!form.name.trim()) return toast('Name is required', 'error');
    
    // Filter out rows where no template was selected
    const validTemplates = form.templates.filter(t => t.template_id);
    if (validTemplates.length === 0) return toast('At least one template is required', 'error');
    
    if (form.start_datetime && form.end_datetime && new Date(form.start_datetime) > new Date(form.end_datetime)) {
      return toast('Start date must be before end date', 'error');
    }
    
    for (const t of validTemplates) {
      if (t.start_datetime && t.end_datetime && new Date(t.start_datetime) > new Date(t.end_datetime)) {
        return toast('Template start date must be before end date', 'error');
      }
    }

    const payloadTemplates = validTemplates.map(t => ({
      ...t,
      start_datetime: t.start_datetime ? new Date(t.start_datetime).toISOString() : '',
      end_datetime: t.end_datetime ? new Date(t.end_datetime).toISOString() : ''
    }));

    const finalStart = form.start_datetime ? new Date(form.start_datetime).toISOString() : null;
    const finalEnd = form.end_datetime ? new Date(form.end_datetime).toISOString() : null;

    saveMut.mutate({ 
      ...form, 
      start_datetime: finalStart,
      end_datetime: finalEnd,
      templates: payloadTemplates 
    });
  };

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

  const columns: Column<CampaignSetupRow>[] = [
    {
      key: 'name', header: 'Campaign Setup', sortValue: (c) => c.name.toLowerCase(),
      render: (c) => (
        <div className="flex items-center gap-4 min-w-[200px]">
          <div className="h-10 w-10 rounded-lg bg-brand-50 dark:bg-brand-600/12 flex items-center justify-center shrink-0">
            <LayoutList className="h-5 w-5 text-brand-600 dark:text-brand-300" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-base-fg truncate">{c.name}</p>
            {c.description && <p className="text-[12px] text-muted-fg mt-0.5 truncate max-w-[250px]">{c.description}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'templates', header: 'Templates',
      render: (c) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge label={`${(c.templates || []).length} Selected`} color="#8b5cf6" />
        </div>
      ),
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
      key: 'due', header: 'Due',
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
        if (!c.start_datetime || !c.end_datetime) return <span className="text-[13px] text-muted-fg whitespace-nowrap">—</span>;
        const diff = new Date(c.end_datetime).getTime() - new Date(c.start_datetime).getTime();
        if (diff <= 0) return <span className="text-[13px] text-muted-fg whitespace-nowrap">—</span>;
        return <span className="text-[13px] text-muted-fg whitespace-nowrap">{formatDiff(diff)}</span>;
      }
    },
    {
      key: 'play_mode', header: 'Play Mode', sortValue: (c) => c.play_mode,
      render: (c) => (
        <span className="text-[13px] font-medium text-base-fg flex items-center gap-1.5 bg-surface-2 px-2 py-1 rounded-md border border-app w-fit">
          {c.play_mode === 'loop' ? '🔄 Loop' : '▶️ Play Once'}
        </span>
      ),
    },
    {
      key: 'status', header: 'Status', sortValue: (c) => c.status,
      render: (c) => {
        const isExpired = c.end_datetime && new Date(c.end_datetime) <= new Date();
        const isActive = c.status === 'active';
        return (
          <Badge
            label={isActive ? 'Live' : (isExpired ? 'Expired' : 'Inactive')}
            color={isActive ? '#10b981' : (isExpired ? '#ef4444' : '#64748b')}
          />
        );
      },
    },
    {
      key: 'actions', header: '', headerClassName: 'w-40', className: 'text-right',
      render: (c) => {
        const isActive = c.status === 'active';
        return (
          <div className="flex items-center justify-end gap-1">
            {can('campaign_setups.edit' as any) && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleStatusMut.mutate(c); }}
                title={isActive ? 'Deactivate' : 'Activate'}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'}`}
              >
                {isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
              </button>
            )}
            {can('campaign_setups.edit' as any) && (
              <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} title="Edit" className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors">
                <Pencil className="h-4 w-4" />
              </button>
            )}
          {can('campaign_setups.delete' as any) && (
            <button onClick={(e) => { e.stopPropagation(); setToDelete(c); }} title="Delete" className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      );
      },
    },
  ];

  if (!can('campaign_setups.view' as any)) return null;

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Campaign Setup"
        subtitle="Manage and configure your marketing campaign setups."
        actions={can('campaign_setups.create' as any) ? <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>Create Setup</Button> : null}
      />

      <div className="bg-surface border border-app rounded-2xl card-shadow">
        <div className="flex p-4 border-b border-app">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-fg z-10" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search campaign setup…" className="pl-10" />
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          rowKey={(c) => c.id}
          onRowClick={openEdit}
          emptyState={
            <EmptyState
              icon={<LayoutList className="h-6 w-6" />}
              title={search ? 'No matching setups' : 'No campaign setups yet'}
              description={search ? 'Try adjusting your search terms.' : 'Create your first campaign setup to get started.'}
              action={can('campaign_setups.create' as any) ? <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>Create Setup</Button> : null}
            />
          }
        />
      </div>

      <Drawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSetup ? 'Edit Campaign Setup' : 'New Campaign Setup'}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saveMut.isPending}>{saveMut.isPending ? 'Saving...' : editingSetup ? 'Save changes' : 'Create setup'}</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <Field label="Setup Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Football Campaign 2026"
            />
          </Field>

          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the purpose of this campaign setup..."
              className="h-24"
            />
          </Field>

          {/* Dynamic Campaign Templates */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Campaign Templates</p>
              <Button 
                type="button" 
                variant="secondary" 
                size="sm" 
                icon={<Plus className="h-3.5 w-3.5" />} 
                onClick={() => {
                  let start = '';
                  let end = '';
                  if (form.templates.length > 0) {
                    start = form.templates[form.templates.length - 1].end_datetime || '';
                  }
                  if (start) {
                    const nextDay = new Date(start);
                    nextDay.setHours(nextDay.getHours() + 24);
                    const y = nextDay.getFullYear();
                    const m = String(nextDay.getMonth() + 1).padStart(2, '0');
                    const d = String(nextDay.getDate()).padStart(2, '0');
                    const h = String(nextDay.getHours()).padStart(2, '0');
                    const min = String(nextDay.getMinutes()).padStart(2, '0');
                    end = `${y}-${m}-${d}T${h}:${min}`;
                  }
                  handleTemplatesChange([...form.templates, { template_id: '', start_datetime: start, end_datetime: end }]);
                }}
              >
                Add Template
              </Button>
            </div>

            {form.templates.length === 0 ? (
              <button 
                type="button" 
                onClick={() => {
                  let start = '';
                  let end = '';
                  if (form.templates.length > 0) {
                    start = form.templates[form.templates.length - 1].end_datetime || '';
                  }
                  if (start) {
                    const nextDay = new Date(start);
                    nextDay.setHours(nextDay.getHours() + 24);
                    const y = nextDay.getFullYear();
                    const m = String(nextDay.getMonth() + 1).padStart(2, '0');
                    const d = String(nextDay.getDate()).padStart(2, '0');
                    const h = String(nextDay.getHours()).padStart(2, '0');
                    const min = String(nextDay.getMinutes()).padStart(2, '0');
                    end = `${y}-${m}-${d}T${h}:${min}`;
                  }
                  handleTemplatesChange([...form.templates, { template_id: '', start_datetime: start, end_datetime: end }]);
                }}
                className="w-full rounded-xl border border-dashed border-strong px-4 py-5 flex flex-col items-center gap-1.5 text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span className="text-[13px] font-medium">Add a campaign template</span>
              </button>
            ) : (
              <div className="space-y-3">
                {form.templates.map((t, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-surface-2 p-3 rounded-xl border border-app relative group">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <SearchableSelect
                          value={t.template_id}
                          onChange={(val) => {
                            const newT = form.templates.map((temp, i) => i === idx ? { ...temp, template_id: val } : { ...temp });
                            handleTemplatesChange(newT);
                          }}
                          options={activeTemplates}
                          placeholder="Select template..."
                        />
                      </div>
                      <div>
                        <Input 
                          type="datetime-local" 
                          value={t.start_datetime} 
                          readOnly={idx > 0}
                          className={idx > 0 ? "bg-surface-2 text-muted-fg cursor-not-allowed opacity-60" : ""}
                          onChange={(e) => {
                            if (idx > 0) return;
                            const newT = form.templates.map((temp, i) => i === idx ? { ...temp, start_datetime: e.target.value } : { ...temp });
                            handleTemplatesChange(newT);
                          }} 
                        />
                      </div>
                      <div>
                        <Input 
                          type="datetime-local" 
                          value={t.end_datetime} 
                          onChange={(e) => {
                            const newT = form.templates.map((temp, i) => i === idx ? { ...temp, end_datetime: e.target.value } : { ...temp });
                            handleTemplatesChange(newT);
                          }} 
                        />
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        handleTemplatesChange(form.templates.filter((_, i) => i !== idx));
                      }}
                      className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center text-muted-fg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Setup Start Date (Auto)">
              <Input type="datetime-local" value={form.start_datetime || ''} readOnly className="bg-surface-2 text-muted-fg cursor-not-allowed" />
            </Field>
            <Field label="Setup End Date (Auto)">
              <Input type="datetime-local" value={form.end_datetime || ''} readOnly className="bg-surface-2 text-muted-fg cursor-not-allowed" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Play Mode">
              <SearchableSelect
                value={form.play_mode}
                onChange={(v) => setForm({ ...form, play_mode: v })}
                options={[
                  { value: 'loop', label: 'Loop (Cycle templates)' },
                  { value: 'once', label: 'Play Once' }
                ]}
                placeholder="Select Play Mode..."
              />
            </Field>

            <Field label="Status">
              <SearchableSelect
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
                placeholder="Select Status..."
              />
            </Field>
          </div>
        </div>
      </Drawer>

      {toDelete && (
        <ConfirmDialog
          open={!!toDelete}
          onClose={() => setToDelete(null)}
          onConfirm={() => delMut.mutate(toDelete.id)}
          title="Delete Campaign Setup"
          message={`Are you sure you want to delete "${toDelete.name}"? This action cannot be undone, but associated templates will remain intact.`}
          confirmLabel="Delete"
          loading={delMut.isPending}
        />
      )}
    </div>
  );
}
