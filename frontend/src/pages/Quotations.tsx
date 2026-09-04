import { useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import Badge from '../components/ui/Badge';
import { useQuotations, useCreateQuotation, useUpdateQuotationVersion, useCreateQuotationVersion } from '../hooks/useQuotations';
import QuotationPreview from '../components/quotations/QuotationPreview';
import QuotationForm, { type QuotationFormValues } from '../components/quotations/QuotationForm';
import type { Quotation, QuotationVersion } from '../types';
import { formatDate } from '../lib/utils';
import { Eye, Receipt, FileText } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import RowActions from '../components/ui/RowActions';
import Skeleton from '../components/ui/Skeleton';
import Button from '../components/ui/Button';
import { Plus, Users } from 'lucide-react';
import { useLeads } from '../hooks/useLeads';
import type { Lead } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useEmployees } from '../hooks/useEmployees';

export default function Quotations() {
  const { data: quotations, isLoading } = useQuotations();
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const createQuotation = useCreateQuotation();
  const updateVersion = useUpdateQuotationVersion();
  const createVersion = useCreateQuotationVersion();
  const [previewData, setPreviewData] = useState<{ q: Quotation, v: QuotationVersion } | null>(null);
  const [editingData, setEditingData] = useState<{ q: Quotation, v: QuotationVersion } | null>(null);
  const [versionSelectionData, setVersionSelectionData] = useState<Quotation | null>(null);
  const [activeTab, setActiveTab] = useState<'quotations' | 'leads'>('quotations');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const { user } = useAuth();
  const { data: allEmployees } = useEmployees();
  const email = user?.email ?? 'user@dtactics.io';
  const fallbackName = user?.user_metadata?.full_name || user?.user_metadata?.name || email.split('@')[0];
  const actualEmployee = (allEmployees || []).find((e) => e.email === email);
  const userName = actualEmployee?.employee_name || fallbackName;

  const handleSubmit = async (values: QuotationFormValues) => {
    if (!selectedLead) return;
    await createQuotation.mutateAsync({
      ...values as any,
      lead_id: selectedLead.id,
    });
    setSelectedLead(null);
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Draft': return '#64748b';
      case 'Sent': return '#3366ff';
      case 'Viewed': return '#f59e0b';
      case 'Accepted': return '#10b981';
      case 'Rejected': return '#ef4444';
      case 'Expired': return '#ef4444';
      case 'Cancelled': return '#64748b';
      default: return '#64748b';
    }
  };

  const columns: Column<Quotation>[] = [
    {
      key: 'quotation_no', header: 'Quotation No', sortValue: (r) => r.quotation_no,
      className: 'font-semibold tabular text-brand-600', render: (r) => r.quotation_no,
    },
    {
      key: 'customer', header: 'Customer', sortValue: (r) => r.lead?.customer_name || r.client?.company_name || '',
      render: (r) => (
        <div className="min-w-0">
          <p className="font-semibold text-base-fg truncate">{r.lead?.customer_name || r.client?.company_name || '—'}</p>
          <p className="text-[12px] text-muted-fg truncate">
            {r.lead?.lead_no ? `${r.lead.lead_no} · ` : ''}{r.lead?.company || r.client?.contact_person || ''}
          </p>
        </div>
      ),
    },
    {
      key: 'version', header: 'Latest Version', sortValue: (r) => r.versions?.[0]?.version_number || 0,
      render: (r) => r.versions?.[0] ? `V${r.versions[0].version_number}` : '—',
    },
    {
      key: 'date', header: 'Date', sortValue: (r) => r.created_at || '',
      render: (r) => {
        const dateObj = new Date(r.created_at || r.versions?.[0]?.created_at || r.versions?.[0]?.date || Date.now());
        const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return (
          <div className="min-w-0">
            <p className="font-medium text-base-fg">{dateStr}</p>
            <p className="text-[12px] text-muted-fg">{timeStr}</p>
          </div>
        );
      },
    },
    {
      key: 'total', header: 'Grand Total', className: 'tabular-nums font-semibold',
      sortValue: (r) => Number(r.versions?.[0]?.grand_total || 0),
      render: (r) => {
        const v = r.versions?.[0];
        if (!v) return '—';
        return `${v.currency} ${Number(v.grand_total).toFixed(2)}`;
      }
    },
    {
      key: 'created_by', header: 'Created By', sortValue: (r) => r.versions?.[0]?.source_person || '',
      render: (r) => (
        <div className="min-w-0">
          <p className="font-medium text-base-fg truncate">{r.versions?.[0]?.source_person || userName}</p>
          <p className="text-[12px] text-muted-fg truncate">ID: {r.id.split('-')[0]}</p>
        </div>
      ),
    },
    { 
      key: 'status', header: 'Status', sortValue: (r) => r.status, 
      render: (r) => <Badge label={r.status} color={getStatusColor(r.status)} dot /> 
    },
    {
      key: 'actions', header: '', headerClassName: 'w-12', className: 'text-right',
      render: (r) => (
        <RowActions actions={[
          { label: 'View PDF', icon: <Eye className="h-4 w-4" />, onClick: () => {
              if (r.versions && r.versions.length > 1) {
                setVersionSelectionData(r);
              } else if (r.versions?.[0]) {
                setPreviewData({ q: r, v: r.versions[0] });
              }
            } 
          },
        ]} />
      ),
    },
  ];

  const leadColumns: Column<Lead>[] = [
    {
      key: 'name', header: 'Lead Name',
      render: (r) => (
        <div>
          <p className="font-semibold text-base-fg">{r.customer_name}</p>
          {r.company && <p className="text-xs text-muted-fg">{r.company}</p>}
        </div>
      )
    },
    {
      key: 'contact', header: 'Contact',
      render: (r) => (
        <div>
          <p className="text-sm">{r.primary_email || '—'}</p>
          <p className="text-xs text-muted-fg">{r.primary_phone || '—'}</p>
        </div>
      )
    },
    {
      key: 'version', header: 'Latest Version',
      render: (r) => {
        const leadQs = quotations?.filter(q => q.lead_id === r.id) || [];
        if (leadQs.length === 0) return <span className="text-muted-fg">—</span>;
        
        const latestQ = [...leadQs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        return latestQ.versions?.[0] ? `V${latestQ.versions[0].version_number}` : <span className="text-muted-fg">—</span>;
      }
    },
    {
      key: 'action', header: '', className: 'text-right',
      render: (r) => (
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={(e) => {
          e.stopPropagation();
          setSelectedLead(r);
        }}>Create Quotation</Button>
      )
    }
  ];

  return (
    <div className="p-5 sm:p-8 max-w-[1500px] mx-auto">
      <PageHeader
        title="Quotations"
        subtitle="Manage generated quotations or select a lead to create a new one."
      />

      <div className="flex space-x-1 mt-6 border-b border-app">
        <button
          onClick={() => setActiveTab('quotations')}
          className={`px-4 py-2.5 text-[13px] font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'quotations' ? 'border-brand-600 text-brand-600' : 'border-transparent text-muted-fg hover:text-base-fg'
          }`}
        >
          <Receipt className="h-4 w-4" />
          All Quotations
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2.5 text-[13px] font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'leads' ? 'border-brand-600 text-brand-600' : 'border-transparent text-muted-fg hover:text-base-fg'
          }`}
        >
          <Users className="h-4 w-4" />
          Select Lead
        </button>
      </div>

      <div className="bg-surface border border-app rounded-2xl rounded-tl-none card-shadow mt-4">
        {activeTab === 'quotations' ? (
          isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <DataTable
            data={quotations || []} columns={columns} rowKey={(r) => r.id}
            onRowClick={(r) => {
              if (r.versions && r.versions.length > 1) {
                setVersionSelectionData(r);
              } else if (r.versions?.[0]) {
                setPreviewData({ q: r, v: r.versions[0] });
              }
            }}
            stickyHeader maxBodyHeight="560px"
            emptyState={
              <EmptyState icon={<Receipt className="h-6 w-6" />}
                title="No quotations found"
                description="Select a lead from the Leads tab to create one."
              />
            } />
          )
        ) : (
          leadsLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <DataTable
              data={leads || []} columns={leadColumns} rowKey={(r) => r.id}
              onRowClick={(r) => setSelectedLead(r)}
              stickyHeader maxBodyHeight="560px"
              emptyState={
                <EmptyState icon={<Users className="h-6 w-6" />}
                  title="No leads found"
                  description="Add leads in the Leads module to create quotations for them."
                />
              } />
          )
        )}
      </div>

      {previewData && (
        <QuotationPreview
          quotation={previewData.q}
          version={previewData.v}
          onClose={() => setPreviewData(null)}
          onEdit={() => {
            setEditingData(previewData);
            setPreviewData(null);
          }}
        />
      )}

      {!!editingData && (
        <QuotationForm
          open={!!editingData}
          onClose={() => setEditingData(null)}
          saving={updateVersion.isPending || createVersion.isPending}
          onSubmit={async (values: any) => {
             if (values.version_number && editingData.v.version_number && values.version_number !== editingData.v.version_number) {
                 await createVersion.mutateAsync({
                   ...values,
                   quotation_id: editingData.v.quotation_id
                 });
             } else {
                 await updateVersion.mutateAsync({
                   ...values,
                   id: editingData.v.id
                 });
             }
             setEditingData(null);
          }}
          title="Edit Quotation"
          initial={{ ...editingData.v, quotation: editingData.q }}
        />
      )}

      {!!versionSelectionData && (
        <Modal
          open={!!versionSelectionData}
          onClose={() => setVersionSelectionData(null)}
          title={`Select Version - ${versionSelectionData.quotation_no}`}
        >
          <div className="space-y-2">
            {versionSelectionData.versions?.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setPreviewData({ q: versionSelectionData, v });
                  setVersionSelectionData(null);
                }}
                className="w-full text-left flex items-center justify-between p-4 rounded-xl border border-app hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-500/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-surface-2 flex items-center justify-center text-muted-fg group-hover:text-brand-600 group-hover:bg-brand-100 dark:group-hover:bg-brand-500/20 transition-colors">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base-fg group-hover:text-brand-600 transition-colors">Version {v.version_number}</h3>
                    <p className="text-sm text-muted-fg">
                      Created: {new Date(v.created_at || v.date || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-base-fg tabular-nums">{v.currency?.toUpperCase()} {Number(v.grand_total).toFixed(2)}</p>
                  <p className="text-xs text-muted-fg">Total</p>
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {!!selectedLead && (
        <QuotationForm
          open={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          saving={createQuotation.isPending}
          onSubmit={handleSubmit}
          title="New Quotation"
          lead={selectedLead}
        />
      )}
    </div>
  );
}
