import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, Download, FileText, Filter, Eye } from 'lucide-react';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/layout/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import RowActions from '../components/ui/RowActions';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { usePermissions } from '../contexts/PermissionContext';
import { api } from '../lib/api';
import { downloadCsv } from '../lib/csv';
import { useToast } from '../components/ui/Toast';
import type { AuditLog } from '../types';

function DataPreview({ data }: { data: any }) {
  if (!data) return <span className="text-muted-fg italic">None</span>;
  return (
    <pre className="text-[11px] font-mono bg-surface-2 p-2 rounded-md border border-app overflow-x-auto text-base-fg max-h-32">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function AuditLogs() {
  const { can } = usePermissions();
  const { toast } = useToast();
  
  // We manage our own page because useAuditLogs does server-side pagination, but DataTable handles client-side.
  // Actually, DataTable supports client-side pagination, but we are passing all data we get from useAuditLogs.
  // Wait, useAuditLogs uses server-side pagination. DataTable is designed for client-side pagination where `data` is all data.
  // Oh, wait! The current useAuditLogs hook handles server-side pagination via `page`.
  // Let me adjust this. If useAuditLogs does server-side pagination, DataTable's client-side pagination might conflict,
  // but looking at `DataTable.tsx`, it always paginates the array passed in. If we pass server-paginated data,
  // we might just want to fetch all or increase pageSize on the server and let DataTable paginate, OR we can
  // modify DataTable, but let's just use it as is and fetch a large pageSize if we want, or rely on DataTable's pagination.
  // Wait, let's keep the hook's page size at 500, and let DataTable handle 10/25/50 per page.
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  useMemo(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [status, setStatus] = useState('');
  
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // We fetch a larger chunk to allow DataTable to do client side pagination, or we use standard 1000.
  const { data: logsData, isLoading } = useAuditLogs({
    page: 1,
    pageSize: 1000,
    search: debouncedSearch,
    user_id: '',
    action,
    module,
    status,
    start_date: '',
    end_date: ''
  });

  const logs = logsData?.data || [];

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams({
        export: 'true',
        search: debouncedSearch,
        module,
        action,
        status
      });
      const csvStr = await api.get<string>(`/api/audit-logs?${params.toString()}`);
      downloadCsv(`audit-logs-${new Date().toISOString().slice(0, 10)}.csv`, csvStr);
      toast('Audit logs exported successfully', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to export logs', 'error');
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'date', header: 'Date', sortValue: (r) => r.created_at,
      className: 'whitespace-nowrap',
      render: (r) => <span className="text-[13px] text-subtle-fg">{format(new Date(r.created_at), 'dd-MM-yy HH:mm:ss')}</span>
    },
    {
      key: 'user', header: 'User', sortValue: (r) => r.username || '',
      render: (r) => (
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-medium text-base-fg truncate">{r.username || 'System'}</span>
          {r.user_email && <span className="text-[11px] text-muted-fg truncate">{r.user_email}</span>}
        </div>
      )
    },
    {
      key: 'action', header: 'Action', sortValue: (r) => r.action,
      render: (r) => {
        const isFailed = r.status === 'FAILED';
        const color = isFailed ? 'red' : 
                      r.action.includes('DELETE') ? 'red' : 
                      r.action.includes('CREATE') || r.action.includes('LOGIN') ? 'green' : 
                      r.action.includes('UPDATE') || r.action.includes('CONVERT') ? 'blue' : 'gray';
        return <Badge label={r.action} color={color as any} />
      }
    },
    {
      key: 'module', header: 'Module', sortValue: (r) => r.module,
      render: (r) => {
        const displayModule = r.module === 'Masters' && r.entity && r.entity !== 'MasterItem' 
          ? `${r.entity} (Masters)` 
          : r.module;
        return <span className="text-[13px] text-base-fg font-medium">{displayModule}</span>;
      }
    },
    {
      key: 'description', header: 'Description', sortValue: (r) => r.description || '',
      className: 'max-w-md truncate',
      render: (r) => <span className="text-[13px] text-subtle-fg">{r.description}</span>
    },
    {
      key: 'status', header: 'Status', sortValue: (r) => r.status,
      render: (r) => (
        <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold ${r.status === 'SUCCESS' ? 'text-emerald-600' : 'text-rose-600'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${r.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          {r.status}
        </span>
      )
    },
    {
      key: 'actions', header: '', headerClassName: 'w-12', className: 'text-right',
      render: (r) => (
        <RowActions actions={[
          { label: 'View details', icon: <Eye className="h-4 w-4" />, onClick: () => setSelectedLog(r) }
        ]} />
      ),
    },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-[1500px] mx-auto">
      <PageHeader
        title="Audit Logs"
        subtitle="Track user activities, authentication events, and data modifications across the system."
        actions={
          <>
            {can('audit_logs.export') && (
              <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={handleExport} disabled={logs.length === 0 || exporting} loading={exporting}>
                Export CSV
              </Button>
            )}
          </>
        }
      />

      <div className="bg-surface border border-app rounded-2xl card-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-app">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-fg z-10" />
            <Input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search users, descriptions..." 
              className="pl-10" 
            />
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Filter className="h-4 w-4 text-subtle-fg hidden sm:block" />
            <div className="w-40">
              <SearchableSelect 
                value={module} 
                onChange={setModule}
                options={[
                  { value: '', label: 'All Modules' },
                  { value: 'Authentication', label: 'Authentication' },
                  { value: 'Leads', label: 'Leads' },
                  { value: 'Projects', label: 'Projects' },
                  { value: 'Employees', label: 'Employees' },
                  { value: 'Masters', label: 'Masters' },
                  { value: 'Roles', label: 'Roles' },
                  { value: 'Templates', label: 'Templates' }
                ]}
              />
            </div>
            <div className="w-40">
              <SearchableSelect 
                value={action} 
                onChange={setAction}
                options={[
                  { value: '', label: 'All Actions' },
                  { value: 'CREATE', label: 'CREATE' },
                  { value: 'UPDATE', label: 'UPDATE' },
                  { value: 'DELETE', label: 'DELETE' },
                  { value: 'LOGIN', label: 'LOGIN' },
                  { value: 'LOGIN_FAILED', label: 'LOGIN FAILED' },
                  { value: 'IMPORT', label: 'IMPORT' },
                  { value: 'CONVERT', label: 'CONVERT' },
                  { value: 'ACCESS_DENIED', label: 'ACCESS DENIED' },
                  { value: 'EXPORT', label: 'EXPORT' }
                ]}
              />
            </div>
            <div className="w-36">
              <SearchableSelect 
                value={status} 
                onChange={setStatus}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'SUCCESS', label: 'SUCCESS' },
                  { value: 'FAILED', label: 'FAILED' }
                ]}
                align="right"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <DataTable
            data={logs} 
            columns={columns} 
            rowKey={(r) => r.id} 
            onRowClick={(r) => setSelectedLog(r)}
            stickyHeader 
            maxBodyHeight="600px"
            emptyState={
              <EmptyState 
                icon={<FileText className="h-6 w-6" />}
                title="No audit logs found"
                description="No logs matching your current filters and search criteria."
              />
            } 
          />
        )}
      </div>

      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Log Details"
        size="max-w-2xl"
      >
        {selectedLog && (
          <div className="space-y-6 pb-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-fg mb-1">Timestamp</div>
                <div className="text-[13px] font-medium text-base-fg">{format(new Date(selectedLog.created_at), 'dd-MM-yy HH:mm:ss')}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-fg mb-1">User</div>
                <div className="text-[13px] font-medium text-base-fg">
                  {selectedLog.username || 'System'} {selectedLog.user_role ? `(${selectedLog.user_role})` : ''}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-fg mb-1">Action & Module</div>
                <div className="text-[13px] font-medium text-base-fg">
                  {selectedLog.action} &bull; {selectedLog.module === 'Masters' && selectedLog.entity && selectedLog.entity !== 'MasterItem' ? `${selectedLog.entity} (Masters)` : selectedLog.module}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-fg mb-1">Status</div>
                <div className={`text-[13px] font-bold ${selectedLog.status === 'SUCCESS' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {selectedLog.status}
                </div>
              </div>
            </div>

            {selectedLog.error_message && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-fg mb-1">Error Message</div>
                <div className="text-[13px] font-medium text-rose-500 bg-rose-500/10 p-3 rounded-lg">
                  {selectedLog.error_message}
                </div>
              </div>
            )}

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-fg mb-1">Description</div>
              <div className="text-[14px] text-base-fg bg-surface-2 p-3 rounded-lg border border-app">
                {selectedLog.description || 'No description provided.'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-app">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-fg mb-2">Previous Values</div>
                <DataPreview data={selectedLog.old_values} />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-fg mb-2">New Values</div>
                <DataPreview data={selectedLog.new_values} />
              </div>
            </div>

            {(selectedLog.ip_address || selectedLog.user_agent) && (
              <div className="pt-4 border-t border-app">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-fg mb-2">Request Details</div>
                <div className="text-[12px] text-subtle-fg space-y-1">
                  {selectedLog.ip_address && <div><span className="font-semibold text-base-fg">IP:</span> {selectedLog.ip_address}</div>}
                  {selectedLog.http_method && selectedLog.endpoint && <div><span className="font-semibold text-base-fg">Request:</span> {selectedLog.http_method} {selectedLog.endpoint}</div>}
                  {selectedLog.user_agent && <div><span className="font-semibold text-base-fg">Agent:</span> {selectedLog.user_agent}</div>}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
