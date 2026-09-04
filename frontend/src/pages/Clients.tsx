import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Briefcase, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { useClients, useClientDetails } from '../hooks/useClients';
import { usePermissions } from '../contexts/PermissionContext';
import { useCreateQuotation } from '../hooks/useQuotations';
import QuotationForm, { type QuotationFormValues } from '../components/quotations/QuotationForm';
import AmcForm from '../components/clients/AmcForm';
import { Link } from 'react-router-dom';
import type { Client } from '../types';
import { formatCurrency } from '../lib/utils';
import { useMasters, makeLookup } from '../hooks/useMasters';

function ClientProjectCard({ p, detail, lookup, can, setQuotationClient, setQuotationProject, setAmcClient, setAmcProject }: any) {
  const [isOpen, setIsOpen] = useState(true);
  const pQuotations = detail.quotations?.filter((q: any) => q.project_id === p.id || (q.lead_id && q.lead_id === p.lead_id)) || [];
  const pAmcs = detail.amcs?.filter((a: any) => a.project_id === p.id) || [];

  return (
    <div className="bg-surface border border-app rounded-2xl card-shadow overflow-hidden mb-6 transition-all">
      {/* Project Header */}
      <div 
        className="p-5 sm:p-6 border-b border-app bg-surface-2/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface-2 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <button className="text-muted-fg hover:text-base-fg p-1 -ml-1 rounded-md transition-colors">
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          <div>
            <h3 className="font-bold text-lg text-brand-600 hover:underline" onClick={(e) => e.stopPropagation()}><Link to="/projects">{p.project_name}</Link></h3>
            <p className="text-xs uppercase tracking-wider text-muted-fg tabular mt-1">{p.project_no}</p>
          </div>
        </div>
        <Badge label={p.status} color="#3b82f6" />
      </div>

      {isOpen && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Project Details */}
          <div className="bg-surface-2 rounded-xl p-4 border border-app">
            <h4 className="font-semibold text-sm mb-3">Project Details</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <p><span className="text-muted-fg font-medium">Type:</span> {p.project_type ? lookup.label('project_type', p.project_type) : '—'}</p>
              <p><span className="text-muted-fg font-medium">Cost:</span> {formatCurrency(p.project_cost || 0)}</p>
              <p><span className="text-muted-fg font-medium">Progress:</span> {p.progress || 0}%</p>
              <p><span className="text-muted-fg font-medium">Expected Delivery:</span> {p.expected_delivery ? new Date(p.expected_delivery).toLocaleDateString() : '—'}</p>
            </div>
          </div>

          {/* Origin Lead for this Project */}
          {p.lead ? (
            <div className="bg-surface-2 rounded-xl p-4 border border-app">
              <h4 className="font-semibold text-sm mb-3">Origin Lead</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <p><span className="text-muted-fg font-medium">Lead No:</span> <Link to="/leads" className="text-brand-600 hover:underline font-semibold" onClick={(e) => e.stopPropagation()}>{p.lead.lead_no || '—'}</Link></p>
                <p><span className="text-muted-fg font-medium">Source:</span> {p.lead.source || '—'}</p>
                <p><span className="text-muted-fg font-medium">Budget:</span> ${p.lead.budget || 0}</p>
                <p><span className="text-muted-fg font-medium">Converted On:</span> {p.lead.converted_at ? new Date(p.lead.converted_at).toLocaleDateString() : '—'}</p>
              </div>
            </div>
          ) : p.lead_no ? (
            <div className="bg-surface-2 rounded-xl p-4 border border-app">
               <h4 className="font-semibold text-sm mb-3">Origin Lead</h4>
               <p className="text-xs text-muted-fg">Lead Ref: <span className="font-semibold text-base-fg">{p.lead_no}</span></p>
            </div>
          ) : null}

          {/* Quotations & AMCs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quotations */}
            <div className="border border-app rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-sm">Quotations</h4>
                {can('quotations.create') && <Button size="sm" variant="secondary" icon={<Plus className="h-3 w-3" />} onClick={(e) => { e.stopPropagation(); setQuotationClient(detail); setQuotationProject(p.id); }}>Add</Button>}
              </div>
              {pQuotations.length > 0 ? (
                <ul className="space-y-2">
                  {pQuotations.map((q: any) => (
                    <li key={q.id} className="flex justify-between items-center p-2.5 bg-surface-2 rounded-lg border border-app hover:border-strong transition-colors">
                      <div>
                        <p className="font-semibold text-xs text-brand-600 hover:underline"><Link to="/quotations" onClick={(e) => e.stopPropagation()}>{q.quotation_no}</Link></p>
                        <p className="text-[10px] text-muted-fg mt-0.5">{q.versions?.length || 0} Versions</p>
                      </div>
                      <Badge label={q.status} color="#f59e0b" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-fg text-xs mt-2">No quotations.</p>
              )}
            </div>

            {/* AMCs */}
            <div className="border border-app rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-sm">AMCs</h4>
                {can('clients.create') && <Button size="sm" variant="secondary" icon={<Plus className="h-3 w-3" />} onClick={(e) => { e.stopPropagation(); setAmcClient(detail); setAmcProject(p.id); }}>Add</Button>}
              </div>
              {pAmcs.length > 0 ? (
                <ul className="space-y-2">
                  {pAmcs.map((a: any) => (
                    <li key={a.id} className="flex justify-between items-start p-2.5 bg-surface-2 rounded-lg border border-app hover:border-strong transition-colors">
                      <div>
                        <p className="font-semibold text-xs text-base-fg">{a.amc_name}</p>
                        <p className="text-[10px] text-muted-fg mt-0.5">{a.start_date} to {a.end_date}</p>
                      </div>
                      <Badge label={a.status} color="#10b981" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-fg text-xs mt-2">No AMCs.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Clients() {
  const { can } = usePermissions();
  const { data: clients, isLoading } = useClients();
  const { data: masters } = useMasters();
  const lookup = makeLookup(masters);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const { data: clientDetails, isLoading: isDetailsLoading } = useClientDetails(activeClient?.id);
  const detail = clientDetails || activeClient;
  
  const [quotationClient, setQuotationClient] = useState<Client | null>(null);
  const [quotationProject, setQuotationProject] = useState<string | null>(null);
  const [amcClient, setAmcClient] = useState<Client | null>(null);
  const [amcProject, setAmcProject] = useState<string | null>(null);
  const createQuotation = useCreateQuotation();

  const handleCreateQuotation = async (values: QuotationFormValues) => {
    if (!quotationClient) return;
    await createQuotation.mutateAsync({
      ...values as any,
      lead_id: quotationClient.lead_id || null,
      client_id: quotationClient.id,
      project_id: quotationProject || undefined,
    });
    setQuotationClient(null);
    setQuotationProject(null);
  };

  const columns: Column<Client>[] = [
    { key: 'client_no', header: 'Client No', sortValue: (r) => r.client_no ?? '', render: (r) => r.client_no || '—', className: 'font-semibold text-brand-600' },
    { key: 'company', header: 'Company Name', sortValue: (r) => r.company_name, render: (r) => <span className="font-semibold">{r.company_name}</span> },
    { key: 'contact', header: 'Contact Person', sortValue: (r) => r.contact_person ?? '', render: (r) => r.contact_person || '—' },
    { key: 'projects', header: 'Projects', sortValue: (r) => r.project_count ?? 0, render: (r) => <Badge label={`${r.project_count} Projects`} color="#6366f1" /> },
    { key: 'status', header: 'Status', sortValue: (r) => r.status, render: (r) => <Badge label={r.status.toUpperCase()} color={r.status === 'active' ? '#10b981' : '#64748b'} dot /> },
  ];

  if (detail) {
    return (
      <div className="p-5 sm:p-8 max-w-[1500px] mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="secondary" icon={<ChevronLeft className="h-4 w-4" />} onClick={() => setActiveClient(null)}>Back to Clients</Button>
        </div>
        <PageHeader title={detail.company_name} subtitle={`Client No: ${detail.client_no || '—'}`} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          
          {/* LEFT COLUMN: Common Details Group */}
          <div className="space-y-6">
            {/* Client Details */}
            <div className="bg-surface border border-app rounded-2xl card-shadow p-6">
              <h3 className="font-bold text-lg mb-4">Client Details</h3>
              <div className="space-y-3 text-sm">
                <p><span className="text-muted-fg font-medium">Contact Person:</span> {detail.contact_person}</p>
                <p><span className="text-muted-fg font-medium">Email:</span> {detail.email || '—'}</p>
                <p><span className="text-muted-fg font-medium">Phone:</span> {detail.phone || '—'}</p>
                <p><span className="text-muted-fg font-medium">Website:</span> {detail.website || '—'}</p>
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

          {/* RIGHT COLUMN: Project Groups */}
          <div className="lg:col-span-2 space-y-6">
            
            {!detail.projects?.length ? (
               <div className="bg-surface border border-app rounded-2xl card-shadow p-8 text-center">
                 <p className="text-muted-fg">No projects found for this client.</p>
               </div>
            ) : (
              detail.projects.map((p: any) => (
                <ClientProjectCard 
                  key={p.id} 
                  p={p} 
                  detail={detail} 
                  lookup={lookup} 
                  can={can} 
                  setQuotationClient={setQuotationClient} 
                  setQuotationProject={setQuotationProject} 
                  setAmcClient={setAmcClient} 
                  setAmcProject={setAmcProject} 
                />
              ))
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
            {can('clients.create') && <Button icon={<Plus className="h-4 w-4" />}>New Client</Button>}
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

      {!!quotationClient && (
        <QuotationForm
          open={!!quotationClient}
          onClose={() => { setQuotationClient(null); setQuotationProject(null); }}
          saving={createQuotation.isPending}
          onSubmit={handleCreateQuotation}
          title="New Quotation"
          client={quotationClient}
          projectId={quotationProject}
        />
      )}
      
      <AmcForm open={!!amcClient} onClose={() => { setAmcClient(null); setAmcProject(null); }} client={amcClient} projectId={amcProject} />
    </div>
  );
}
