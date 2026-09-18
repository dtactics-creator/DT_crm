import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Sparkles, CheckCircle2, Copy, Power, PowerOff } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { fetchAllTemplates, deleteTemplate, toggleTemplateStatus, saveTemplate, type CampaignTemplateRow } from '../lib/templatesRepo';
import { useToast } from '../components/ui/Toast';
import { formatDate, formatDateTime } from '../lib/utils';
import TemplateEditor from './TemplateEditor';
import { usePermissions } from '../contexts/PermissionContext';
import DataTable, { type Column } from '../components/DataTable';
import FilterBar from '../components/ui/FilterBar';
import { MultiSelect } from '../components/ui/SearchableSelect';

export default function CampaignTemplates() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { can } = usePermissions();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['campaign-templates'],
    queryFn: fetchAllTemplates,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CampaignTemplateRow | null>(null);
  const [toDelete, setToDelete] = useState<CampaignTemplateRow | null>(null);

  const filtered = useMemo(() => (templates || []).filter((t) => {
    const q = search.toLowerCase();
    const matchQ = !q || t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
    const matchStatus = statusFilter.length === 0 || statusFilter.includes(t.status);
    return matchQ && matchStatus;
  }), [templates, search, statusFilter]);

  const openNew = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const openEdit = (t: CampaignTemplateRow) => {
    setEditingTemplate(t);
    setEditorOpen(true);
  };

  const toggleStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => toggleTemplateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-templates'] }),
    onError: (e: Error) => toast(`Error updating status: ${e.message}`, 'error'),
  });

  const setAsDefaultMut = useMutation({
    mutationFn: (t: CampaignTemplateRow) => saveTemplate({ ...t, is_default: true }),
    onSuccess: () => {
      toast('Set as default template', 'success');
      qc.invalidateQueries({ queryKey: ['campaign-templates'] });
    },
    onError: (e: Error) => toast(`Error setting default: ${e.message}`, 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const template = templates?.find((t) => t.id === id);
      if (template) {
        const urlsToClean: string[] = [];
        if (template.thumbnail) urlsToClean.push(template.thumbnail);
        const imageProps = template.schema?.sections?.flatMap((s: any) => s.properties)?.filter((p: any) => p.type === 'image') || [];
        imageProps.forEach((prop: any) => {
          if (template.default_config && template.default_config[prop.id]) {
            urlsToClean.push(template.default_config[prop.id]);
          }
        });
        if (urlsToClean.length > 0) {
          import('../lib/utils').then(({ deleteStorageImages }) => deleteStorageImages(urlsToClean));
        }
      }
      return deleteTemplate(id);
    },
    onSuccess: () => {
      toast('Template deleted successfully', 'success');
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ['campaign-templates'] });
    },
    onError: (e: Error) => toast(`Error deleting template: ${e.message}`, 'error'),
  });

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

  const columns: Column<CampaignTemplateRow>[] = [
    {
      key: 'name', header: 'Template', sortValue: (c) => c.name.toLowerCase(),
      render: (c) => {
        let displayImage = c.thumbnail;
        if (!displayImage) {
          const assetProps = c.schema?.sections?.find((s: any) => s.id === 'assets' || s.title === 'Visual Assets')?.properties?.filter((p: any) => p.type === 'image') || [];
          const imageProps = assetProps.length > 0 ? assetProps : c.schema?.sections?.flatMap((s: any) => s.properties)?.filter((p: any) => p.type === 'image') || [];
          if (imageProps.length > 0 && c.default_config) {
            displayImage = c.default_config[imageProps[0].id];
          }
        }
        return (
          <div className="flex items-center gap-4 min-w-[200px]">
            {displayImage ? (
              <img src={displayImage} alt={c.name} className="h-10 w-10 rounded-lg object-cover border border-app shrink-0 bg-surface-2" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-brand-50 dark:bg-brand-600/12 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-300" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-base-fg flex items-center gap-2 truncate" title="Default Template">
                {c.name}
                {c.is_default && <CheckCircle2 className="h-3.5 w-3.5 text-brand-600 shrink-0" />}
              </p>
              {c.description && <p className="text-[12px] text-muted-fg mt-0.5 truncate max-w-[200px]">{c.description}</p>}
            </div>
          </div>
        );
      },
    },
    // {
    //   key: 'component_name', header: 'Component Type', sortValue: (c) => c.component_name,
    //   render: (c) => (
    //     <span className="text-[13px] font-medium text-base-fg bg-surface-2 px-2.5 py-1 rounded-md border border-app">
    //       {c.component_name}
    //     </span>
    //   )
    // },
    {
      key: 'created_at', header: 'Created On', sortValue: (c) => c.created_at || '',
      render: (c) => renderDateTime(c.created_at || '')
    },
    {
      key: 'status', header: 'Status', sortValue: (c) => c.status,
      render: (c) => {
        return (
          <Badge
            label={c.status === 'active' ? 'Active' : 'Inactive'}
            color={c.status === 'active' ? '#10b981' : '#64748b'}
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
            {can('campaign_templates.edit') && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleStatusMut.mutate({ id: c.id, status: isActive ? 'inactive' : 'active' }); }}
                title={isActive ? 'Deactivate' : 'Activate'}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'}`}
              >
                {isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
              </button>
            )}
            {!c.is_default && can('campaign_templates.edit') && (
              <button onClick={(e) => { e.stopPropagation(); setAsDefaultMut.mutate(c); }} title="Set Default" className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 transition-colors">
                <CheckCircle2 className="h-4 w-4" />
              </button>
            )}
            {can('campaign_templates.edit') && (
              <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} title="Edit" className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors">
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {can('campaign_templates.delete') && (
              <button onClick={(e) => { e.stopPropagation(); setToDelete(c); }} title="Delete" className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Campaign Templates"
        subtitle="Manage reusable designs for your marketing campaigns."
        actions={can('campaign_templates.create') ? <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>Create Template</Button> : null}
      />

      <div className="bg-surface border border-app rounded-2xl card-shadow">
        <FilterBar 
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search templates…"
          className="p-4 border-b border-app"
          filters={
            <div className="w-48">
              <MultiSelect 
                values={statusFilter} 
                onChange={setStatusFilter} 
                placeholder="All statuses"
                options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} 
              />
            </div>
          }
        />

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
                icon={<Sparkles className="h-6 w-6" />}
                title={search ? 'No matching templates' : 'No templates yet'}
                description={search ? 'Try adjusting your search terms.' : 'Create your first campaign template to get started.'}
                action={can('campaign_templates.create') ? <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>Create Template</Button> : null}
              />
            }
          />
        )}
      </div>

      <TemplateEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        template={editingTemplate}
        onSaved={() => {
          setEditorOpen(false);
          qc.invalidateQueries({ queryKey: ['campaign-templates'] });
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteMut.mutateAsync(toDelete.id)}
        title="Delete template"
        message={`Are you sure you want to delete "${toDelete?.name}"? This cannot be undone.`}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
