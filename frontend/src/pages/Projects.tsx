import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, FolderKanban, Filter, LayoutGrid, List, Pencil, Trash2, Eye, Download, Upload, CalendarClock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/layout/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import RowActions from '../components/ui/RowActions';
import ImportDialog from '../components/ImportDialog';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import ProjectForm, { type ProjectFormValues } from '../components/projects/ProjectForm';
import ProjectDetail from '../components/projects/ProjectDetail';
import NextFollowUpModal from '../components/ui/NextFollowUpModal';
import { useProjects } from '../hooks/useProjects';
import { usePermissions } from '../contexts/PermissionContext';
import { useEmployees } from '../hooks/useEmployees';

import { useLeads } from '../hooks/useLeads';
import { useMasters, makeLookup, makeResolver, toOptions } from '../hooks/useMasters';
import { useCrud } from '../hooks/useCrud';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';
import { downloadCsv } from '../lib/csv';
import { getProjectImportColumns, makeProjectRowMapper, buildProjectsCsv, employeeIndex } from '../lib/importConfig';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import type { Project } from '../types';

export default function Projects() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { data: projects, isLoading } = useProjects();
  const { data: employees } = useEmployees();

  const { data: leads } = useLeads();
  const { data: masters } = useMasters();
  const lookup = makeLookup(masters);
  const resolve = makeResolver(masters);
  const { create, update, remove } = useCrud('projects', ['projects']);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [view, setView] = useState<'grid' | 'table'>('table');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [detail, setDetail] = useState<Project | null>(null);
  const [toFollowUp, setToFollowUp] = useState<Project | null>(null);
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const urlTypes = useMemo(() => (masters || []).filter(m => m.category === 'url_type').map(m => m.value), [masters]);

  const resolveEmp = useMemo(() => employeeIndex(employees), [employees]);
  const mapProjectRow = useMemo(() => makeProjectRowMapper(resolve, resolveEmp, lookup.label, urlTypes), [masters, resolveEmp, urlTypes]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = () => {
    const rows = filtered.length ? filtered : (projects || []);
    if (!rows.length) { toast('No projects to export.', 'info'); return; }
    // Export uses the same schema as import, so the file is re-importable.
    downloadCsv(`projects-${new Date().toISOString().slice(0, 10)}.csv`, buildProjectsCsv(rows, lookup.label, resolve, resolveEmp, urlTypes));
    toast(`Exported ${rows.length} projects`, 'success');
  };

  const importProjects = (rows: Record<string, unknown>[], mode: string) =>
    api.post<{ insertedCount: number; updatedCount: number; skippedCount: number; failedCount: number; failed: { row: number; error: string }[]; skipped: { row: number; reason: string }[] }>('/api/projects-import', { rows, mode });

  // Keys of existing projects so the import preview can flag would-be duplicates
  // (server matches by Project No, else project name + client).
  const existingProjectKeys = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects || []) {
      if (p.project_no) set.add(p.project_no.trim().toLowerCase());
      set.add(`${(p.project_name || '').trim().toLowerCase()}|${(p.client || '').trim().toLowerCase()}`);
    }
    return set;
  }, [projects]);

  useEffect(() => {
    if (params.get('new') === '1') { setEditing(null); setFormOpen(true); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const filtered = useMemo(() => {
    return (projects || []).filter((p) => {
      const q = search.toLowerCase();
      const matchQ = !q || [p.project_name, p.client, p.project_no ?? '', p.lead_no ?? ''].some((x) => x.toLowerCase().includes(q));
      const matchStatus = !statusFilter || p.status === statusFilter;
      const matchType = !typeFilter || p.project_type === typeFilter;
      return matchQ && matchStatus && matchType;
    });
  }, [projects, search, statusFilter, typeFilter]);

  const totalBudget = filtered.reduce((s, p) => s + Number(p.project_cost || 0), 0);

  const toPayload = (v: ProjectFormValues) => ({
    ...(v.id ? { id: v.id } : {}),
    project_no: v.project_no || null, project_name: v.project_name, client: v.client,
    lead_id: v.lead_id || null, lead_no: (leads || []).find((l) => l.id === v.lead_id)?.lead_no || null,
    project_type: v.project_type || null, industry: v.industry || null, project_manager_id: v.project_manager_id || null,
    assigned_employee_id: v.assigned_employee_id || null, technology_stack: v.technology_stack, urls: v.urls,
    project_cost: v.project_cost ? Number(v.project_cost) : 0, status: v.status, priority: v.priority,
    progress: v.progress ? Number(v.progress) : 0, start_date: v.start_date || null, expected_delivery: v.expected_delivery || null,
    remarks: v.remarks || null,
  });

  const handleSubmit = async (v: ProjectFormValues) => {
    const payload = toPayload(v);
    if (v.id) await update.mutateAsync(payload); else await create.mutateAsync(payload);
    setFormOpen(false); setEditing(null);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    await remove.mutateAsync(toDelete.id);
    setToDelete(null); setDetail(null);
  };

  const handleNextFollowUp = async ({ next_follow_up, remarks }: { next_follow_up: string; remarks: string }) => {
    if (!toFollowUp) return;
    await update.mutateAsync({ ...toFollowUp, next_follow_up, remarks });
    setToFollowUp(null);
    if (detail?.id === toFollowUp.id) setDetail({ ...detail, next_follow_up, remarks });
  };

  const columns: Column<Project>[] = [
    { key: 'project_no', header: 'Project No', sortValue: (r) => r.project_no ?? '', className: 'font-semibold tabular text-brand-600', render: (r) => r.project_no || '—' },
    {
      key: 'name', header: 'Project', sortValue: (r) => r.project_name.toLowerCase(),
      render: (r) => <div className="min-w-0"><p className="font-semibold text-base-fg truncate">{r.project_name}</p><p className="text-[12px] text-muted-fg truncate">{r.client}</p></div>,
    },
    { key: 'lead_no', header: 'Lead Ref', sortValue: (r) => r.lead_no ?? '', render: (r) => <span className="text-muted-fg text-[12.5px] tabular">{r.lead_no || '—'}</span> },
    { key: 'type', header: 'Type', sortValue: (r) => r.project_type ?? '', render: (r) => <span className="text-muted-fg">{lookup.label('project_type', r.project_type)}</span> },
    { key: 'industry', header: 'Industry', sortValue: (r) => r.industry ?? '', render: (r) => <span className="text-muted-fg">{lookup.label('industry', r.industry)}</span> },
    {
      key: 'manager', header: 'Project Manager', sortValue: (r) => r.manager?.employee_name ?? '',
      render: (r) => r.manager ? <div className="flex items-center gap-2"><Avatar name={r.manager.employee_name} size={26} /><span className="text-[12.5px] text-muted-fg truncate">{r.manager.employee_name}</span></div> : <span className="text-subtle-fg text-[12.5px]">—</span>,
    },
    {
      key: 'assigned', header: 'Assigned Employee', sortValue: (r) => r.assigned_employee?.employee_name ?? '',
      render: (r) => r.assigned_employee ? <div className="flex items-center gap-2"><Avatar name={r.assigned_employee.employee_name} size={26} /><span className="text-[12.5px] text-muted-fg truncate">{r.assigned_employee.employee_name}</span></div> : <span className="text-subtle-fg text-[12.5px]">—</span>,
    },
    // {
    //   key: 'stack', header: 'Tech Stack',
    //   render: (r) => {
    //     const stack = Array.isArray(r.technology_stack) ? r.technology_stack : [];
    //     return stack.length ? (
    //       <div className="flex items-center gap-1">
    //         {stack.slice(0, 3).map((s) => <Badge key={s} label={lookup.label('technology_stack', s)} color={lookup.color('technology_stack', s)} />)}
    //         {stack.length > 3 && <span className="text-[11px] font-semibold text-subtle-fg">+{stack.length - 3}</span>}
    //       </div>
    //     ) : <span className="text-subtle-fg text-[12.5px]">—</span>;
    //   },
    // },
    ...(can('projects.view_cost') ? [{ key: 'budget', header: 'Budget', sortValue: (r) => Number(r.project_cost), className: 'tabular font-semibold', render: (r) => formatCurrency(r.project_cost) } as Column<Project>] : []),
    { key: 'status', header: 'Status', sortValue: (r) => r.status, render: (r) => <Badge label={lookup.label('project_status', r.status)} color={lookup.color('project_status', r.status)} dot /> },
    { key: 'delivery', header: 'Delivery', sortValue: (r) => r.expected_delivery ?? '', render: (r) => <span className="text-muted-fg text-[12.5px] tabular">{formatDate(r.expected_delivery)}</span> },
    { key: 'followup', header: 'Follow-up', sortValue: (r) => r.next_follow_up ?? '', render: (r) => <span className="text-muted-fg text-[12.5px] tabular">{formatDate(r.next_follow_up)}</span> },
    {
      key: 'actions', header: '', headerClassName: 'w-12', className: 'text-right',
      render: (r) => (
        <RowActions actions={[
          { label: 'View details', icon: <Eye className="h-4 w-4" />, onClick: () => setDetail(r) },
          ...(can('projects.edit') ? [{ label: 'Edit project', icon: <Pencil className="h-4 w-4" />, onClick: () => { setEditing(r); setFormOpen(true); } }] : []),
          ...(can('projects.edit') && r.status !== 'completed' && r.status !== 'cancelled' ? [{ label: 'Set follow-up', icon: <CalendarClock className="h-4 w-4" />, onClick: () => setToFollowUp(r) }] : []),
          ...(can('projects.delete') ? [{ label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => setToDelete(r), danger: true }] : []),
        ]} />
      ),
    },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-[1500px] mx-auto">
      <PageHeader
        title="Projects"
        subtitle="Track delivery across all active and upcoming engagements."
        actions={
          <>
            {can('projects.export') && <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={handleExport}>Export</Button>}
            {can('projects.import') && <Button variant="secondary" icon={<Upload className="h-4 w-4" />} onClick={() => setImportOpen(true)}>Import</Button>}
            {can('projects.create') && <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>New project</Button>}
          </>
        }
      />

      <div className="grid grid-cols-2 sm:flex gap-4 mb-6">
        {[
          { label: 'Total projects', value: (projects?.length ?? 0).toString() },
          { label: 'Active', value: (projects?.filter((p) => p.status === 'active').length ?? 0).toString() },
          ...(can('projects.view_cost') ? [{ label: 'Total budget', value: formatCurrency(totalBudget) }] : []),
          { label: 'Completed', value: (projects?.filter((p) => p.status === 'completed').length ?? 0).toString() },
        ].map((s) => (
          <div key={s.label} className="flex-1 min-w-[140px] bg-surface border border-app rounded-xl card-shadow px-4 py-3.5">
            <p className="text-[12px] font-semibold text-muted-fg">{s.label}</p>
            <p className="text-[20px] font-extrabold text-base-fg mt-0.5 tabular">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-fg z-10" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects…" className="pl-10" />
        </div>
        <div className="flex items-center gap-2.5">
          <Filter className="h-4 w-4 text-subtle-fg hidden sm:block" />
          <div className="w-40"><SearchableSelect value={statusFilter} onChange={setStatusFilter} options={[{ value: '', label: 'All statuses' }, ...toOptions(masters, 'project_status')]} placeholder="All statuses" /></div>
          <div className="w-40"><SearchableSelect value={typeFilter} onChange={setTypeFilter} options={[{ value: '', label: 'All types' }, ...toOptions(masters, 'project_type')]} placeholder="All types" align="right" /></div>
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-2 border border-app">
            <button onClick={() => setView('grid')} className={cn('h-8 w-8 rounded-md flex items-center justify-center transition-colors', view === 'grid' ? 'bg-surface text-brand-600 card-shadow' : 'text-muted-fg')}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setView('table')} className={cn('h-8 w-8 rounded-md flex items-center justify-center transition-colors', view === 'table' ? 'bg-surface text-brand-600 card-shadow' : 'text-muted-fg')}><List className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-app rounded-2xl card-shadow">
          <EmptyState icon={<FolderKanban className="h-6 w-6" />}
            title={search || statusFilter || typeFilter ? 'No matching projects' : 'No projects yet'}
            description={search || statusFilter || typeFilter ? 'Try adjusting your search or filters.' : 'Create a project or convert a won lead to get started.'}
            action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>New project</Button>} />
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const color = lookup.color('project_status', p.status);
            const stack = Array.isArray(p.technology_stack) ? p.technology_stack : [];
            return (
              <button key={p.id} onClick={() => setDetail(p)} className="text-left bg-surface border border-app rounded-2xl card-shadow p-5 hover:card-shadow-lg hover:border-strong transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-subtle-fg tabular">{p.project_no || 'No code'}{p.lead_no && <span className="ml-1.5 text-brand-500">· {p.lead_no}</span>}</p>
                    <p className="text-[15px] font-bold text-base-fg truncate mt-0.5 group-hover:text-brand-600 transition-colors">{p.project_name}</p>
                    <p className="text-[12.5px] text-muted-fg truncate">{p.client}</p>
                  </div>
                  <Badge label={lookup.label('project_status', p.status)} color={color} dot />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-4 mb-3">
                  <Badge label={lookup.label('project_type', p.project_type)} color="#64748b" />
                  {stack.slice(0, 3).map((s) => <Badge key={s} label={lookup.label('technology_stack', s)} color={lookup.color('technology_stack', s)} />)}
                  {stack.length > 3 && <span className="text-[11px] font-semibold text-subtle-fg">+{stack.length - 3}</span>}
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11.5px] font-semibold text-muted-fg">Progress</span>
                    <span className="text-[11.5px] font-bold text-base-fg tabular">{p.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${p.progress}%`, backgroundColor: color }} /></div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-app">
                  {can('projects.view_cost') ? (
                    <span className="text-[15px] font-extrabold text-base-fg tabular">{formatCurrency(p.project_cost)}</span>
                  ) : <div />}
                  {p.manager ? (
                    <div className="flex items-center gap-1.5"><Avatar name={p.manager.employee_name} size={24} /><span className="text-[11.5px] text-muted-fg">{p.manager.employee_name.split(' ')[0]}</span></div>
                  ) : <span className="text-[11.5px] text-subtle-fg">{formatDate(p.expected_delivery)}</span>}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-surface border border-app rounded-2xl card-shadow">
          <DataTable data={filtered} columns={columns} rowKey={(r) => r.id} onRowClick={(r) => setDetail(r)} stickyHeader maxBodyHeight="560px" />
        </div>
      )}

      <ProjectForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }}
        initial={editing} masters={masters} employees={employees} managers={employees} leads={leads}
        onSubmit={handleSubmit} saving={create.isPending || update.isPending} />

      <ProjectDetail open={!!detail && !formOpen} onClose={() => setDetail(null)} project={detail} masters={masters}
        onEdit={() => { setEditing(detail); setFormOpen(true); }} onDelete={() => setToDelete(detail)} onNextFollowUp={() => setToFollowUp(detail)} />

      <NextFollowUpModal open={!!toFollowUp} onClose={() => setToFollowUp(null)} entity={toFollowUp ? { id: toFollowUp.id, name: toFollowUp.project_name, next_follow_up: toFollowUp.next_follow_up, remarks: toFollowUp.remarks, created_at: toFollowUp.created_at } : null} saving={update.isPending} onConfirm={handleNextFollowUp} />

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete}
        title="Delete project" message={`Are you sure you want to delete ${toDelete?.project_name}? This action can be reverted by an administrator.`} loading={remove.isPending} />

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import projects"
        entity="projects"
        columns={getProjectImportColumns(urlTypes)}
        templateName="projects-import-template.csv"
        duplicateKeyHint="project name + client"
        dedupeKeys={(v) => {
          const keys: string[] = [];
          const no = ((v.project_no as string) || '').trim().toLowerCase();
          const name = ((v.project_name as string) || '').trim().toLowerCase();
          const client = ((v.client as string) || '').trim().toLowerCase();
          if (no) keys.push(no);
          if (name || client) keys.push(`${name}|${client}`);
          return keys;
        }}
        existingKeys={existingProjectKeys}
        mapRow={mapProjectRow}
        onImport={importProjects}
        onDone={() => { qc.invalidateQueries({ queryKey: ['projects'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); }}
      />
    </div>
  );
}
