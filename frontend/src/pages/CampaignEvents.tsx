import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import FilterBar from '../components/ui/FilterBar';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { fetchCampaignAnalytics, type CampaignAnalyticsSession } from '../lib/campaignAnalyticsRepo';
import { formatDateTime } from '../lib/utils';
import Badge from '../components/ui/Badge';
import { MultiSelect } from '../components/ui/SearchableSelect';

export default function CampaignEvents() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['campaign-analytics'],
    queryFn: fetchCampaignAnalytics,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const filtered = useMemo(() => {
    return (sessions || []).filter((s) => {
      let status = 'Active';
      if (s.ended_at) {
        status = 'Completed';
      } else {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (new Date(s.started_at) < oneHourAgo) {
          status = 'Abandoned';
        }
      }

      if (statusFilter.length > 0 && !statusFilter.includes(status)) return false;

      const q = search.toLowerCase();
      if (!q) return true;
      return [
        s.domain,
        s.setup_name,
        s.template_name,
        s.visitor_id,
        s.session_id
      ].some((val) => val?.toLowerCase().includes(q));
    });
  }, [sessions, search, statusFilter]);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const renderDateTime = (val: string | null | undefined) => {
    if (!val) return <span className="text-[13px] text-muted-fg">—</span>;
    const str = formatDateTime(val);
    if (str === '—') return <span className="text-[13px] text-muted-fg">—</span>;
    const [date, ...timeArr] = str.split(' ');
    const time = timeArr.join(' ');
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[13px] text-base-fg font-medium">{date}</span>
        <span className="text-[12px] text-muted-fg">{time}</span>
      </div>
    );
  };

  const columns: Column<CampaignAnalyticsSession>[] = [
    {
      key: 'domain', header: 'Domain', sortValue: (s) => s.domain || '',
      render: (s) => <span className="text-[13px] font-medium text-base-fg">{s.domain || '—'}</span>
    },
    {
      key: 'setup_name', header: 'Campaign Setup', sortValue: (s) => s.setup_name || '',
      render: (s) => <span className="text-[13px] text-base-fg truncate">{s.setup_name || '—'}</span>
    },
    {
      key: 'template_name', header: 'Template', sortValue: (s) => s.template_name || '',
      render: (s) => <span className="text-[13px] text-muted-fg truncate">{s.template_name || '—'}</span>
    },
    {
      key: 'visitor_id', header: 'Visitor', sortValue: (s) => s.visitor_id || '',
      render: (s) => (
        <span className="text-[13px] font-mono text-muted-fg" title={s.visitor_id}>
          {s.visitor_id.split('-')[0]}...
        </span>
      )
    },
    {
      key: 'ip_address', header: 'IP Address', sortValue: (s) => s.ip_address || '',
      render: (s) => (
        <span className="text-[13px] font-mono text-base-fg">
          {s.ip_address || '—'}
        </span>
      )
    },
    {
      key: 'location', header: 'Location', sortValue: (s) => [s.location?.city, s.location?.country].filter(Boolean).join(', '),
      render: (s) => {
        if (!s.location || (!s.location.city && !s.location.country)) {
          return <span className="text-[13px] text-muted-fg">—</span>;
        }
        const parts = [s.location.city, s.location.country].filter(Boolean);
        return (
          <span className="text-[13px] text-base-fg truncate max-w-[150px] inline-block" title={parts.join(', ')}>
            {parts.join(', ')}
          </span>
        );
      }
    },
    {
      key: 'duration', header: 'Active Time', sortValue: (s) => s.duration_seconds,
      render: (s) => (
        <span className="text-[13px] font-semibold text-base-fg">
          {formatDuration(s.duration_seconds)}
        </span>
      )
    },
    {
      key: 'status', header: 'Status', sortValue: (s) => {
        if (s.ended_at) return 'Completed';
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (new Date(s.started_at) < oneHourAgo) return 'Abandoned';
        return 'Active';
      },
      render: (s) => {
        let status = 'Active';
        let color = '#10b981'; // Green

        if (s.ended_at) {
          status = 'Completed';
          color = '#64748b'; // Grey
        } else {
          // If it has been more than 1 hour without an ended_at signal
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          if (new Date(s.started_at) < oneHourAgo) {
            status = 'Abandoned';
            color = '#f59e0b'; // Amber/Orange
          }
        }

        return (
          <Badge
            label={status}
            color={color}
          />
        );
      }
    },
    {
      key: 'started_at', header: 'Started At', sortValue: (s) => new Date(s.started_at || s.created_at).getTime(),
      render: (s) => renderDateTime(s.started_at || s.created_at)
    },
    {
      key: 'ended_at', header: 'Ended At', sortValue: (s) => s.ended_at ? new Date(s.ended_at).getTime() : 0,
      render: (s) => renderDateTime(s.ended_at)
    },
    {
      key: 'created_at', header: 'Created At', sortValue: (s) => new Date(s.created_at).getTime(),
      render: (s) => renderDateTime(s.created_at)
    },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Campaign Session"
        subtitle="View detailed visitor session analytics across your active campaigns."
      />

      <div className="bg-surface border border-app rounded-2xl card-shadow">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search domain, visitor, or setup..."
          className="p-4 border-b border-app"
          filters={
            <div className="w-48">
              <MultiSelect
                values={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filter by Status"
                align="right"
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Completed', label: 'Completed' },
                  { value: 'Abandoned', label: 'Abandoned' }
                ]}
              />
            </div>
          }
        />

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            rowKey={(s) => s.id}
            emptyState={
              <EmptyState
                icon={<BarChart3 className="h-6 w-6" />}
                title={search ? 'No matching sessions' : 'No sessions recorded yet'}
                description={search ? 'Try adjusting your search terms.' : 'Live analytics data will appear here once visitors interact with your campaigns.'}
              />
            }
          />
        )}
      </div>
    </div>
  );
}
