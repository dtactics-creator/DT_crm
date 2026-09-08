import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Sparkles, CheckCircle2, Copy } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { fetchAllTemplates, deleteTemplate, toggleTemplateStatus, saveTemplate, type CampaignTemplateRow } from '../lib/templatesRepo';
import { useToast } from '../components/ui/Toast';
import { formatDate } from '../lib/utils';
import TemplateEditor from './TemplateEditor';
import { usePermissions } from '../contexts/PermissionContext';
import DataTable, { type Column } from '../components/DataTable';

export default function CampaignTemplates() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { can } = usePermissions();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['campaign-templates'],
    queryFn: fetchAllTemplates,
  });

  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CampaignTemplateRow | null>(null);
  const [toDelete, setToDelete] = useState<CampaignTemplateRow | null>(null);

  const filtered = useMemo(() => (templates || []).filter((t) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
  }), [templates, search]);

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
    mutationFn: deleteTemplate,
    onSuccess: () => {
      toast('Template deleted successfully', 'success');
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ['campaign-templates'] });
    },
    onError: (e: Error) => toast(`Error deleting template: ${e.message}`, 'error'),
  });

  const columns: Column<CampaignTemplateRow>[] = [
    {
      key: 'name', header: 'Template', sortValue: (c) => c.name.toLowerCase(),
      render: (c) => (
        <div className="flex items-center gap-4 min-w-[200px]">
          {c.thumbnail ? (
            <img src={c.thumbnail} alt={c.name} className="h-10 w-10 rounded-lg object-cover border border-app shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-brand-50 dark:bg-brand-600/12 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-300" />
            </div>
          )}
          <div>
            <p className="font-semibold text-base-fg flex items-center gap-2" title="Default Template">
              {c.name}
              {c.is_default && <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" />}
            </p>
            <p className="text-[12px] text-muted-fg mt-0.5 truncate max-w-[250px]">{c.description || 'No description'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'component', header: 'Component',
      render: (c) => <span className="text-[13px] font-medium text-muted-fg">{c.component_name}</span>
    },
    {
      key: 'status', header: 'Status', sortValue: (c) => c.status,
      render: (c) => (
        <Badge
          label={c.status === 'active' ? 'Active' : 'Draft'}
          color={c.status === 'active' ? '#10b981' : '#64748b'}
        />
      ),
    },
    {
      key: 'updated', header: 'Updated', sortValue: (c) => c.updated_at || '',
      render: (c) => <span className="text-[13px] text-muted-fg whitespace-nowrap">{formatDate(c.updated_at)}</span>
    },
    {
      key: 'actions', header: '', headerClassName: 'w-40', className: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
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
      ),
    },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto h-[calc(100vh-64px)] flex flex-col">
      <PageHeader
        title="Campaign Templates"
        subtitle="Manage reusable designs for your marketing campaigns."
        actions={can('campaign_templates.create') ? <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>Create Template</Button> : null}
      />

      <div className="flex p-4 bg-surface border-x border-t border-app rounded-t-2xl shadow-sm shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-fg z-10" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates…" className="pl-10" />
        </div>
      </div>

      <div className="flex-1 bg-surface border border-app rounded-b-2xl overflow-hidden shadow-sm flex flex-col">
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
