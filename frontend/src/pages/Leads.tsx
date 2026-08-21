import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Users, Filter, Pencil, Trash2, Eye, ArrowRightLeft, Download, Upload } from 'lucide-react';
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
import LeadForm, { type LeadFormValues } from '../components/leads/LeadForm';
import LeadDetail from '../components/leads/LeadDetail';
import ConvertLeadModal from '../components/leads/ConvertLeadModal';
import NextFollowUpModal from '../components/ui/NextFollowUpModal';
import { useLeads } from '../hooks/useLeads';
import { useEmployees } from '../hooks/useEmployees';

import { useMasters, makeLookup, makeResolver, toOptions } from '../hooks/useMasters';
import { useCrud } from '../hooks/useCrud';
import { useConvertLead } from '../hooks/useConvertLead';
import { usePermissions } from '../contexts/PermissionContext';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';
import { downloadCsv } from '../lib/csv';
import { getLeadImportColumns, makeLeadRowMapper, buildLeadsCsv, employeeIndex } from '../lib/importConfig';
import { formatCurrency, formatDate } from '../lib/utils';
import type { Lead } from '../types';

export default function Leads() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { data: leads, isLoading } = useLeads();
  const { data: employees } = useEmployees();

  const { data: masters } = useMasters();
  const lookup = makeLookup(masters);
  const resolve = makeResolver(masters);
  const { create, update, remove } = useCrud('leads', ['leads']);
  const convert = useConvertLead();



  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [detail, setDetail] = useState<Lead | null>(null);
  const [toDelete, setToDelete] = useState<Lead | null>(null);
  const [toConvert, setToConvert] = useState<Lead | null>(null);
  const [toFollowUp, setToFollowUp] = useState<Lead | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const urlTypes = useMemo(() => (masters || []).filter(m => m.category === 'url_type').map(m => m.value), [masters]);

  // Import mapper resolves master labels/values and employee names -> ids.
  const resolveEmp = useMemo(() => employeeIndex(employees), [employees]);
  const mapLeadRow = useMemo(() => makeLeadRowMapper(resolve, resolveEmp, lookup.label, urlTypes), [masters, resolveEmp, urlTypes]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = () => {
    const rows = filtered.length ? filtered : (leads || []);
    if (!rows.length) { toast('No leads to export.', 'info'); return; }
    // Export uses the same schema as import, so the file is re-importable.
    downloadCsv(`leads-${new Date().toISOString().slice(0, 10)}.csv`, buildLeadsCsv(rows, lookup.label, resolve, resolveEmp, urlTypes));
    toast(`Exported ${rows.length} leads`, 'success');
  };

  const importLeads = (rows: Record<string, unknown>[], mode: string) =>
    api.post<{ insertedCount: number; updatedCount: number; skippedCount: number; failedCount: number; failed: { row: number; error: string }[]; skipped: { row: number; reason: string }[] }>('/api/leads-import', { rows, mode });

  // Keys of existing leads so the import preview can flag would-be duplicates
  // (server matches by Lead No, else email).
  const existingLeadKeys = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads || []) {
      if (l.lead_no) set.add(l.lead_no.trim().toLowerCase());
      if (l.primary_email) set.add(l.primary_email.trim().toLowerCase());
    }
    return set;
  }, [leads]);

  useEffect(() => {
    if (params.get('new') === '1') { setEditing(null); setFormOpen(true); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const filtered = useMemo(() => {
    return (leads || []).filter((l) => {
      const q = search.toLowerCase();
      const matchQ = !q || [l.customer_name, l.company, l.primary_email, l.secondary_email, l.primary_phone, l.secondary_phone, l.tertiary_phone, l.source_person, l.lead_no].some((x) => (x ?? '').toLowerCase().includes(q));
      const matchStatus = !statusFilter || l.status === statusFilter;
      const matchSource = !sourceFilter || l.source === sourceFilter;
      return matchQ && matchStatus && matchSource;
    });
  }, [leads, search, statusFilter, sourceFilter]);

  const totalValue = filtered.reduce((s, l) => s + Number(l.budget || 0), 0);

  const toPayload = (v: LeadFormValues) => ({
    ...(v.id ? { id: v.id } : {}),
    lead_no: v.lead_no || null, customer_name: v.customer_name, company: v.company || null,
    sales_manager_id: v.sales_manager_id || null, assigned_employee_id: v.assigned_employee_id || null, source_person: v.source_person || null,
    primary_phone: v.primary_phone || null, secondary_phone: v.secondary_phone || null,
    tertiary_phone: v.tertiary_phone || null,
    primary_email: v.primary_email || null, secondary_email: v.secondary_email || null,
    project_type: v.project_type || null, industry: v.industry || null, source: v.source,
    budget: v.budget ? Number(v.budget) : 0, status: v.status, priority: v.priority,
    lead_received_date: v.lead_received_date || null, urls: v.urls || [],
    next_follow_up: v.next_follow_up || null, address: v.address || null, remarks: v.remarks || null,
  });

  const handleSubmit = async (v: LeadFormValues) => {
    const payload = toPayload(v);
    if (v.id) await update.mutateAsync(payload); else await create.mutateAsync(payload);
    setFormOpen(false); setEditing(null);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    await remove.mutateAsync(toDelete.id);
    setToDelete(null); setDetail(null);
  };

  const handleConvert = async (data: Parameters<typeof convert.mutateAsync>[0]) => {
    await convert.mutateAsync(data);
    setToConvert(null); setDetail(null);
  };

  const handleNextFollowUp = async (data: { next_follow_up: string; remarks: string }) => {
    if (!toFollowUp) return;
    await update.mutateAsync({
      id: toFollowUp.id,
      lead_no: toFollowUp.lead_no,
      customer_name: toFollowUp.customer_name,
      company: toFollowUp.company,
      sales_manager_id: toFollowUp.sales_manager_id,
      assigned_employee_id: toFollowUp.assigned_employee_id,
      source_person: toFollowUp.source_person,
      primary_phone: toFollowUp.primary_phone,
      secondary_phone: toFollowUp.secondary_phone,
      tertiary_phone: toFollowUp.tertiary_phone,
      primary_email: toFollowUp.primary_email,
      secondary_email: toFollowUp.secondary_email,
      project_type: toFollowUp.project_type,
      industry: toFollowUp.industry,
      source: toFollowUp.source,
      budget: toFollowUp.budget,
      status: toFollowUp.status,
      priority: toFollowUp.priority,
      lead_received_date: toFollowUp.lead_received_date,
      urls: toFollowUp.urls || [],
      address: toFollowUp.address,
      next_follow_up: data.next_follow_up || null,
      remarks: data.remarks || null,
    });
    setToFollowUp(null);
  };

  const columns: Column<Lead>[] = [
    {
      key: 'lead_no', header: 'Lead No', sortValue: (r) => r.lead_no ?? '',
      className: 'font-semibold tabular text-brand-600', render: (r) => r.lead_no || '—',
    },
    {
      key: 'customer', header: 'Customer', sortValue: (r) => r.customer_name.toLowerCase(),
      render: (r) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={r.customer_name} size={34} />
          <div className="min-w-0">
            <p className="font-semibold text-base-fg truncate">{r.customer_name}</p>
            <p className="text-[12px] text-muted-fg truncate">{r.company || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone', header: 'Phone & Email',
      render: (r) => {
        const phones = [r.primary_phone, r.secondary_phone, r.tertiary_phone].filter(Boolean) as string[];
        const emails = [r.primary_email, r.secondary_email].filter(Boolean) as string[];
        if (phones.length === 0 && emails.length === 0) return <span className="text-subtle-fg text-[12.5px]">—</span>;
        
        return (
          <div className="min-w-0 max-w-[220px]">
            {phones.length > 0 && <p className="text-[12.5px] text-base-fg truncate">{phones[0]}</p>}
            {phones.length > 1 && <p className="text-[11.5px] text-subtle-fg truncate">{phones.slice(1).join(' · ')}</p>}
            {emails.length > 0 && <p className={`text-[12px] truncate ${phones.length > 0 ? 'mt-0.5 text-muted-fg' : 'text-base-fg'}`}>{emails[0]}</p>}
            {emails.length > 1 && <p className="text-[11.5px] text-subtle-fg truncate">{emails[1]}</p>}
          </div>
        );
      },
    },
    { key: 'type', header: 'Project Type', sortValue: (r) => r.project_type ?? '', render: (r) => <span className="text-muted-fg">{lookup.label('project_type', r.project_type)}</span> },
    { key: 'industry', header: 'Industry', sortValue: (r) => r.industry ?? '', render: (r) => <span className="text-muted-fg">{lookup.label('industry', r.industry)}</span> },
    { key: 'source', header: 'Source', sortValue: (r) => r.source, render: (r) => <Badge label={lookup.label('lead_source', r.source)} color={lookup.color('lead_source', r.source)} /> },
    {
      key: 'manager', header: 'Lead coordinator', sortValue: (r) => r.sales_manager?.employee_name ?? '',
      render: (r) => r.sales_manager ? (
        <div className="flex items-center gap-2"><Avatar name={r.sales_manager.employee_name} size={26} /><span className="text-[12.5px] text-muted-fg truncate">{r.sales_manager.employee_name}</span></div>
      ) : <span className="text-subtle-fg text-[12.5px]">Unassigned</span>,
    },
    {
      key: 'assigned', header: 'Assigned Employee', sortValue: (r) => r.assigned_employee?.employee_name ?? '',
      render: (r) => r.assigned_employee ? (
        <div className="flex items-center gap-2"><Avatar name={r.assigned_employee.employee_name} size={26} /><span className="text-[12.5px] text-muted-fg truncate">{r.assigned_employee.employee_name}</span></div>
      ) : <span className="text-subtle-fg text-[12.5px]">Unassigned</span>,
    },
    { key: 'source_person', header: 'Source Person', sortValue: (r) => r.source_person ?? '', render: (r) => <span className="text-muted-fg text-[12.5px]">{r.source_person || '—'}</span> },
    ...(can('leads.view_budget') ? [{ key: 'budget', header: 'Budget', sortValue: (r) => Number(r.budget), className: 'tabular font-semibold', render: (r) => formatCurrency(r.budget) } as Column<Lead>] : []),
    { key: 'status', header: 'Status', sortValue: (r) => r.status, render: (r) => <Badge label={lookup.label('lead_status', r.status)} color={lookup.color('lead_status', r.status)} dot /> },
    { key: 'received', header: 'Received', sortValue: (r) => r.lead_received_date ?? '', render: (r) => <span className="text-muted-fg text-[12.5px]">{formatDate(r.lead_received_date)}</span> },
    { key: 'follow', header: 'Follow-up', sortValue: (r) => r.next_follow_up ?? '', render: (r) => <span className="text-muted-fg text-[12.5px]">{formatDate(r.next_follow_up)}</span> },
    {
      key: 'actions', header: '', headerClassName: 'w-12', className: 'text-right',
      render: (r) => (
        <RowActions actions={[
          { label: 'View details', icon: <Eye className="h-4 w-4" />, onClick: () => setDetail(r) },
          ...(can('leads.edit') ? [{ label: 'Edit lead', icon: <Pencil className="h-4 w-4" />, onClick: () => { setEditing(r); setFormOpen(true); } }] : []),
          ...(can('leads.convert') && !r.converted_project_id && r.status !== 'lost' ? [{ label: 'Convert to project', icon: <ArrowRightLeft className="h-4 w-4" />, onClick: () => setToConvert(r) }] : []),
          ...(can('leads.delete') ? [{ label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => setToDelete(r), danger: true }] : []),
        ]} />
      ),
    },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-[1500px] mx-auto">
      <PageHeader
        title="Leads"
        subtitle="Manage and track every opportunity in your pipeline."
        actions={
          <>
            {can('leads.export') && <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={handleExport}>Export</Button>}
            {can('leads.import') && <Button variant="secondary" icon={<Upload className="h-4 w-4" />} onClick={() => setImportOpen(true)}>Import</Button>}
            {can('leads.create') && <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>New lead</Button>}
          </>
        }
      />

      <div className="grid grid-cols-2 sm:flex gap-4 mb-6">
        {[
          { label: 'Total leads', value: (leads?.length ?? 0).toString() },
          ...(can('leads.view_budget') ? [{ label: 'Pipeline value', value: formatCurrency(totalValue) }] : []),
          { label: 'Won', value: (leads?.filter((l) => l.status === 'won').length ?? 0).toString() },
          { label: 'Lost', value: (leads?.filter((l) => l.status === 'lost').length ?? 0).toString() },
        ].map((s) => (
          <div key={s.label} className="flex-1 min-w-[140px] bg-surface border border-app rounded-xl card-shadow px-4 py-3.5">
            <p className="text-[12px] font-semibold text-muted-fg">{s.label}</p>
            <p className="text-[20px] font-extrabold text-base-fg mt-0.5 tabular">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-app rounded-2xl card-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-app">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-fg z-10" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, company, email, lead no…" className="pl-10" />
          </div>
          <div className="flex items-center gap-2.5">
            <Filter className="h-4 w-4 text-subtle-fg hidden sm:block" />
            <div className="w-40"><SearchableSelect value={statusFilter} onChange={setStatusFilter} options={[{ value: '', label: 'All statuses' }, ...toOptions(masters, 'lead_status')]} placeholder="All statuses" /></div>
            <div className="w-40"><SearchableSelect value={sourceFilter} onChange={setSourceFilter} options={[{ value: '', label: 'All sources' }, ...toOptions(masters, 'lead_source')]} placeholder="All sources" align="right" /></div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <DataTable
            data={filtered} columns={columns} rowKey={(r) => r.id} onRowClick={(r) => setDetail(r)}
            stickyHeader maxBodyHeight="560px"
            emptyState={
              <EmptyState icon={<Users className="h-6 w-6" />}
                title={search || statusFilter || sourceFilter ? 'No matching leads' : 'No leads yet'}
                description={search || statusFilter || sourceFilter ? 'Try adjusting your search or filters.' : 'Create your first lead to start building your pipeline.'}
                action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>New lead</Button>} />
            } />
        )}
      </div>

      <LeadForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} onSubmit={handleSubmit}
        initial={editing} masters={masters} employees={employees} saving={create.isPending || update.isPending} />

      <LeadDetail open={!!detail && !formOpen} onClose={() => setDetail(null)} lead={detail ? leads?.find(l => l.id === detail.id) || detail : null} masters={masters}
        onEdit={() => { setEditing(detail); setFormOpen(true); }} onDelete={() => setToDelete(detail)}
        onConvert={() => setToConvert(detail)} onNextFollowUp={() => setToFollowUp(detail)} />

      <ConvertLeadModal open={!!toConvert} onClose={() => setToConvert(null)} lead={toConvert} masters={masters} managers={employees}
        saving={convert.isPending} onConfirm={(data) => handleConvert({ lead_id: toConvert!.id, ...data })} />

      <NextFollowUpModal open={!!toFollowUp} onClose={() => setToFollowUp(null)} entity={toFollowUp ? { id: toFollowUp.id, name: toFollowUp.customer_name, next_follow_up: toFollowUp.next_follow_up, remarks: toFollowUp.remarks, created_at: toFollowUp.created_at } : null} saving={update.isPending} onConfirm={handleNextFollowUp} />

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete}
        title="Delete lead" message={`Are you sure you want to delete ${toDelete?.customer_name}? This action can be reverted by an administrator.`}
        loading={remove.isPending} />

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import leads"
        entity="leads"
        columns={getLeadImportColumns(urlTypes)}
        templateName="leads-import-template.csv"
        duplicateKeyHint="email"
        dedupeKeys={(v) => {
          const keys: string[] = [];
          const no = ((v.lead_no as string) || '').trim().toLowerCase();
          const email = ((v.primary_email as string) || '').trim().toLowerCase();
          if (no) keys.push(no);
          if (email) keys.push(email);
          return keys;
        }}
        existingKeys={existingLeadKeys}
        mapRow={mapLeadRow}
        onImport={importLeads}
        onDone={() => { qc.invalidateQueries({ queryKey: ['leads'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); }}
      />
    </div>
  );
}
