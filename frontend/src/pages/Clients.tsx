import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Briefcase, ChevronLeft, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useClients, useClientDetails } from '../hooks/useClients';
import { usePermissions } from '../contexts/PermissionContext';
import ClientForm, { ClientFormValues } from '../components/clients/ClientForm';
import ProjectForm, { type ProjectFormValues } from '../components/projects/ProjectForm';
import { Link } from 'react-router-dom';
import type { Client, Project } from '../types';
import { formatCurrency } from '../lib/utils';
import { useMasters, makeLookup } from '../hooks/useMasters';
import { useEmployees } from '../hooks/useEmployees';
import { useLeads } from '../hooks/useLeads';
import { useCrud } from '../hooks/useCrud';
import { useCreateClient, useUpdateClient, useDeleteClient } from '../hooks/useClients';

// ClientProjectCard removed in favor of DataTable

export default function Clients() {
  const { can } = usePermissions();
  const qc = useQueryClient();
  const { data: clients, isLoading } = useClients();
  const { data: masters } = useMasters();
  const lookup = makeLookup(masters);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const { data: clientDetails, isLoading: isDetailsLoading } = useClientDetails(activeClient?.id);
  const detail = clientDetails || activeClient;
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const removeClient = useDeleteClient();

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  
  const { data: employees } = useEmployees();
  const { data: leads } = useLeads();
  const { create: createProj, update: updateProj, remove: removeProj } = useCrud('projects', ['projects', 'client', 'clients']);

  const handleSaveProject = async (v: ProjectFormValues) => {
    const payload = {
      ...(v.id ? { id: v.id } : {}),
      project_no: v.project_no || null, project_name: v.project_name, client: v.client, client_id: v.client_id || null,
      lead_id: v.lead_id || null, lead_no: (leads || []).find((l) => l.id === v.lead_id)?.lead_no || null,
      project_type: v.project_type || null, industry: v.industry || null, project_manager_id: v.project_manager_id || null,
      assigned_employee_id: v.assigned_employee_id || null, technology_stack: v.technology_stack, urls: v.urls,
      project_cost: v.project_cost ? Number(v.project_cost) : 0, status: v.status, priority: v.priority,
      progress: v.progress ? Number(v.progress) : 0, start_date: v.start_date || null, expected_delivery: v.expected_delivery || null,
      remarks: v.remarks || null,
    };
    if (v.id) await updateProj.mutateAsync(payload); else await createProj.mutateAsync(payload);
    
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['clients'] }),
      activeClient?.id ? qc.invalidateQueries({ queryKey: ['clients', activeClient.id] }) : Promise.resolve(),
    ]);

    setEditingProject(null);
    setIsProjectFormOpen(false);
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    await removeProj.mutateAsync(deletingProject.id);
    setDeletingProject(null);
  };

  const handleSaveClient = async (values: ClientFormValues) => {
    if (editingClient) {
      await updateClient.mutateAsync({ ...values, id: editingClient.id } as any);
    } else {
      await createClient.mutateAsync(values as any);
    }
    setIsFormOpen(false);
    setEditingClient(null);
  };

  const handleDeleteClient = async () => {
    if (!deletingClient) return;
    await removeClient.mutateAsync(deletingClient.id);
    setDeletingClient(null);
    if (activeClient?.id === deletingClient.id) {
      setActiveClient(null);
    }
  };

  const columns: Column<Client>[] = [
    { key: 'client_no', header: 'Client No', sortValue: (r) => r.client_no ?? '', render: (r) => r.client_no || '—', className: 'font-semibold text-brand-600' },
    { key: 'company', header: 'Company Name', sortValue: (r) => r.company_name, render: (r) => <span className="font-semibold">{r.company_name}</span> },
    { key: 'contact', header: 'Contact Person', sortValue: (r) => r.contact_person ?? '', render: (r) => r.contact_person || '—' },
    { key: 'projects', header: 'Projects', sortValue: (r) => r.project_count ?? 0, render: (r) => <Badge label={`${r.project_count} Projects`} color="#6366f1" /> },
    { key: 'status', header: 'Status', sortValue: (r) => r.status, render: (r) => <Badge label={r.status.toUpperCase()} color={r.status === 'active' ? '#10b981' : '#64748b'} dot /> },
    { key: 'actions', header: '', render: (r) => (
      <div className="flex gap-1 justify-end">
        {can('clients.edit') && <button onClick={(e) => { e.stopPropagation(); setEditingClient(r); setIsFormOpen(true); }} className="p-1.5 text-muted-fg hover:text-base-fg hover:bg-surface-3 rounded-md transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>}
        {can('clients.delete') && <button onClick={(e) => { e.stopPropagation(); setDeletingClient(r); }} className="p-1.5 text-muted-fg hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>}
      </div>
    )}
  ];

  const projectColumns: Column<any>[] = [
    { key: 'project_no', header: 'Project No', sortValue: (r) => r.project_no, render: (r) => <span className="text-muted-fg text-xs tabular-nums">{r.project_no}</span> },
    { key: 'project_name', header: 'Project Name', sortValue: (r) => r.project_name, render: (r) => <Link to="/projects" className="font-semibold text-brand-600 hover:underline">{r.project_name}</Link> },
    { key: 'type', header: 'Type', sortValue: (r) => r.project_type, render: (r) => r.project_type ? lookup.label('project_type', r.project_type) : '—' },
    { key: 'cost', header: 'Cost', sortValue: (r) => r.project_cost, render: (r) => formatCurrency(r.project_cost || 0) },
    { key: 'status', header: 'Status', sortValue: (r) => r.status, render: (r) => <Badge label={r.status} color="#3b82f6" /> },
    { key: 'lead', header: 'Origin Lead', render: (r) => r.lead ? <Link to="/leads" className="text-brand-600 hover:underline">{r.lead.lead_no}</Link> : (r.lead_no || '—') },
    { key: 'quotation', header: 'Latest Quotation', render: (r) => {
      const pQuotations = detail?.quotations?.filter((q: any) => q.project_id === r.id || (q.lead_id && q.lead_id === r.lead_id)) || [];
      if (!pQuotations.length) return <span className="text-muted-fg">—</span>;
      const latest = [...pQuotations].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      return <Link to={`/quotations?preview=${latest.id}`} className="text-brand-600 hover:underline font-medium">{latest.quotation_no}</Link>;
    }},
    { key: 'actions', header: '', render: (r) => (
      <div className="flex gap-1 justify-end">
        {can('projects.edit') && <button onClick={(e) => { e.stopPropagation(); setEditingProject(r); }} className="p-1.5 text-muted-fg hover:text-base-fg hover:bg-surface-3 rounded-md transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>}
        {can('projects.delete') && <button onClick={(e) => { e.stopPropagation(); setDeletingProject(r); }} className="p-1.5 text-muted-fg hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>}
      </div>
    )}
  ];

  if (detail) {
    return (
      <div className="p-5 sm:p-8 max-w-[1500px] mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="secondary" icon={<ChevronLeft className="h-4 w-4" />} onClick={() => setActiveClient(null)}>Back to Clients</Button>
          <div className="flex items-center gap-2">
            {can('clients.edit') && (
              <Button variant="secondary" onClick={() => { setEditingClient(detail); setIsFormOpen(true); }}>Edit Client</Button>
            )}
          </div>
        </div>
        <PageHeader title={detail.company_name} subtitle={`Client No: ${detail.client_no || '—'}`} />
        
        <div className="space-y-6 mt-6">
          
          {/* Top Row: Client Details & Activity Log side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client Details */}
            <div className="bg-surface border border-app rounded-2xl card-shadow p-6">
              <h3 className="font-bold text-lg mb-4">Client Details</h3>
              <div className="space-y-3 text-sm">
                {(() => {
                  const primaryContact = detail.contacts?.find((c: any) => c.is_primary) || detail.contacts?.[0];
                  return (
                    <>
                      <p><span className="text-muted-fg font-medium">Contact Person:</span> {primaryContact?.full_name || detail.contact_person || '—'}</p>
                      <p><span className="text-muted-fg font-medium">Email:</span> {primaryContact?.email || detail.email || '—'}</p>
                      <p><span className="text-muted-fg font-medium">Phone:</span> {primaryContact?.mobile || primaryContact?.landline || detail.phone || '—'}</p>
                      <p><span className="text-muted-fg font-medium">Website:</span> {detail.website || '—'}</p>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Audit Logs */}
            <div className="bg-surface border border-app rounded-2xl card-shadow p-6">
              <h3 className="font-bold text-lg mb-4">Activity Log</h3>
              {detail.audit_logs && detail.audit_logs.length > 0 ? (
                <ul className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {detail.audit_logs.map((log: any, i: number) => (
                    <li key={i} className="flex gap-3">
                      <div className="mt-1 w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-base-fg">{log.action}</p>
                        <p className="text-xs text-muted-fg mt-0.5">{log.description}</p>
                        <p className="text-[10px] text-subtle-fg mt-1">{new Date(log.created_at).toLocaleString()} by {log.username || 'System'}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-fg text-sm">No activity recorded.</p>
              )}
            </div>
          </div>

          {/* Bottom Section: Project Groups */}
          <div className="space-y-6">
            
            {!detail.projects?.length ? (
               <div className="bg-surface border border-app rounded-2xl card-shadow p-8 text-center">
                 <p className="text-muted-fg">No projects found for this client.</p>
                 {can('projects.create') && (
                   <div className="mt-4 flex justify-center">
                     <Button icon={<Plus className="h-4 w-4" />} onClick={() => setIsProjectFormOpen(true)}>Create Project</Button>
                   </div>
                 )}
               </div>
            ) : (
               <div className="bg-surface border border-app rounded-2xl card-shadow overflow-hidden">
                 <div className="p-4 border-b border-app bg-surface-2/30 flex items-center justify-between">
                   <h3 className="font-bold text-lg">Projects</h3>
                   {can('projects.create') && (
                     <Button size="sm" icon={<Plus className="h-3 w-3" />} onClick={() => setIsProjectFormOpen(true)}>Create Project</Button>
                   )}
                 </div>
                 <DataTable data={detail.projects} columns={projectColumns} rowKey={(r) => r.id} />
               </div>
            )}

            {/* Unassigned Quotations / AMCs */}
            {(() => {
               const unassignedQuotations = detail.quotations?.filter((q: any) => !q.project_id && (!q.lead_id || !detail.projects?.some((proj: any) => proj.lead_id === q.lead_id))) || [];
               const unassignedAmcs = detail.amcs?.filter((a: any) => !a.project_id) || [];
               if (!unassignedQuotations.length && !unassignedAmcs.length) return null;

               return (
                  <div className="bg-surface border border-app rounded-2xl card-shadow p-6 mt-6">
                    <h3 className="font-bold text-lg mb-4">General (Unassigned to a Project)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {unassignedQuotations.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-3">Quotations</h4>
                          <ul className="space-y-2">
                            {unassignedQuotations.map((q: any) => (
                              <li key={q.id} className="flex justify-between items-center p-2.5 bg-surface-2 rounded-lg border border-app">
                                <div>
                                  <p className="font-semibold text-xs text-brand-600 hover:underline"><Link to="/quotations">{q.quotation_no}</Link></p>
                                  <p className="text-[10px] text-muted-fg mt-0.5">{q.versions?.length || 0} Versions</p>
                                </div>
                                <Badge label={q.status} color="#f59e0b" />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {unassignedAmcs.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-3">AMCs</h4>
                          <ul className="space-y-2">
                            {unassignedAmcs.map((a: any) => (
                              <li key={a.id} className="flex justify-between items-center p-2.5 bg-surface-2 rounded-lg border border-app">
                                <div>
                                  <p className="font-semibold text-xs text-base-fg">{a.amc_name}</p>
                                  <p className="text-[10px] text-muted-fg mt-0.5">{a.start_date} to {a.end_date}</p>
                                </div>
                                <Badge label={a.status} color="#10b981" />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
               );
            })()}
          </div>
        </div>

        <ClientForm
          open={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingClient(null); }}
          saving={createClient.isPending || updateClient.isPending}
          onSubmit={handleSaveClient}
          title="Edit Client"
          initial={editingClient}
        />

        <ProjectForm open={isProjectFormOpen || !!editingProject} onClose={() => { setEditingProject(null); setIsProjectFormOpen(false); }}
          initial={editingProject} masters={masters} employees={employees} managers={employees} leads={leads} clients={clients}
          onSubmit={handleSaveProject} saving={createProj.isPending || updateProj.isPending} defaultClientName={detail.company_name} defaultClientId={detail.id} />

        <ConfirmDialog open={!!deletingProject} onClose={() => setDeletingProject(null)} onConfirm={handleDeleteProject}
          title="Delete project" message={`Are you sure you want to delete ${deletingProject?.project_name}?`} loading={removeProj.isPending} />
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-8 max-w-[1500px] mx-auto">
      <PageHeader
        title="Clients"
        subtitle="Manage your clients, their project history, and annual maintenance."
        actions={
          <>
            {can('clients.create') && (
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditingClient(null); setIsFormOpen(true); }}>
                New Client
              </Button>
            )}
          </>
        }
      />

      {isLoading ? (
         <div className="animate-pulse bg-surface-2 h-64 rounded-2xl mt-6"></div>
      ) : !clients?.length ? (
        <div className="bg-surface border border-app rounded-2xl card-shadow mt-6">
          <EmptyState icon={<Briefcase className="h-6 w-6" />}
            title="No clients yet"
            description="Clients will be automatically created when a lead is converted to a project."
             />
        </div>
      ) : (
        <div className="bg-surface border border-app rounded-2xl card-shadow mt-6">
          <DataTable data={clients} columns={columns} rowKey={(r) => r.id} onRowClick={(r) => setActiveClient(r)} stickyHeader />
        </div>
      )}
      
      <ClientForm
        open={isFormOpen && !activeClient}
        onClose={() => { setIsFormOpen(false); setEditingClient(null); }}
        saving={createClient.isPending || updateClient.isPending}
        onSubmit={handleSaveClient}
        title={editingClient ? "Edit Client" : "New Client"}
        initial={editingClient}
      />
      <ConfirmDialog open={!!deletingClient} onClose={() => setDeletingClient(null)} onConfirm={handleDeleteClient}
        title="Delete client" message={`Are you sure you want to delete ${deletingClient?.company_name}?`} loading={removeClient.isPending} />
    </div>
  );
}
