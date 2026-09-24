import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, MousePointerClick, MapPin } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import FilterBar from '../components/ui/FilterBar';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { fetchCampaignEvents, type CampaignAnalyticsEvent } from '../lib/campaignAnalyticsRepo';
import { formatDateTime } from '../lib/utils';
import Badge from '../components/ui/Badge';
import { MultiSelect } from '../components/ui/SearchableSelect';

export default function CampaignReports() {
  const { data: records, isLoading } = useQuery({
    queryKey: ['campaign-reports'],
    queryFn: fetchCampaignEvents,
  });

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return (records || []).filter((r: any) => {
      const q = search.toLowerCase();
      if (!q) return true;
      return [
        r.visitor_id,
        r.session_id,
        r.domain,
        ...(r.actions || []).map((a: any) => a.action_name || a.target_value || a.event_type)
      ].some((val) => typeof val === 'string' && val.toLowerCase().includes(q));
    });
  }, [records, search]);

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

  const columns: Column<any>[] = [
    {
      key: 'visitor', header: 'Visitor', sortValue: (r) => r.visitor_id || '',
      render: (r) => (
        <span className="text-[13px] font-mono text-base-fg" title={r.visitor_id}>
          {r.visitor_id?.split('-')[0] || 'Unknown'}...
        </span>
      )
    },
    {
      key: 'domain', header: 'Domain', sortValue: (r) => r.domain || '',
      render: (r) => <span className="text-[13px] text-base-fg">{r.domain || '—'}</span>
    },
    {
      key: 'created_at', header: 'Started At', sortValue: (r) => new Date(r.created_at).getTime(),
      render: (r) => renderDateTime(r.created_at)
    },
    {
      key: 'actions', header: 'User Actions Timeline', sortValue: (r) => (r.actions || []).length,
      render: (r) => {
        let actions = r.actions || [];
        
        // Filter out route changes and rubbing actions from historical data
        actions = actions.filter((a: any) => {
          if (a.event_type === 'route_change') return false;
          const name = (a.action_name || a.target_value || a.event_type || '').toLowerCase();
          // Hide 'rub the magic lamp' but keep 'rub again'
          if (name === 'rub the magic lamp') return false;
          return true;
        });

        if (actions.length === 0) return <span className="text-[12px] text-muted-fg">No actions</span>;
        
        // Sort chronologically
        const sorted = [...actions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        // Group ALL identical actions across the entire session
        const groupedMap = new Map<string, any>();
        sorted.forEach(a => {
          const name = a.action_name || a.target_value || a.event_type;
          if (groupedMap.has(name)) {
            const last = groupedMap.get(name);
            last.count += 1;
            last.end_time = a.created_at; // update to the latest timestamp
          } else {
            groupedMap.set(name, { ...a, name, count: 1, end_time: a.created_at });
          }
        });
        const grouped = Array.from(groupedMap.values());
        
        return (
          <div className="flex items-center gap-4">
            <span className="text-[12px] font-semibold text-muted-fg whitespace-nowrap min-w-[70px]">
              {actions.length} action{actions.length !== 1 ? 's' : ''}
            </span>
            <div 
              className="flex flex-nowrap items-center gap-2 max-w-[400px] lg:max-w-[500px] xl:max-w-[700px] overflow-x-auto pb-1 -mb-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {grouped.map((a: any, i: number) => {
                let Icon = Activity;
                let bg = 'bg-surface';
                let text = 'text-muted-fg';
                
                if (a.event_type === 'button_click') {
                  Icon = MousePointerClick;
                  bg = 'bg-blue-500/10 border-blue-500/20';
                  text = 'text-blue-500';
                } else if (a.event_type === 'route_change') {
                  Icon = MapPin;
                  bg = 'bg-purple-500/10 border-purple-500/20';
                  text = 'text-purple-500';
                }

                const title = a.count > 1 
                  ? `First: ${formatDateTime(a.created_at)}\nLast: ${formatDateTime(a.end_time)}`
                  : formatDateTime(a.created_at);

                return (
                  <div key={i} className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md border ${bg} ${text}`} title={title}>
                    <Icon className="h-3 w-3" />
                    <span className="text-[11.5px] font-medium whitespace-nowrap max-w-[200px] truncate">
                      {a.name}
                      {a.product_name ? ` (${a.product_name})` : ''}
                    </span>
                    {a.count > 1 && (
                      <span className="text-[10px] font-bold bg-black/10 dark:bg-white/10 px-1 rounded-sm ml-0.5">
                        ×{a.count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
    }
  ];

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Campaign Reports"
        subtitle="Track every user action including button clicks and route changes in one unified timeline."
      />

      <div className="bg-surface border border-app rounded-2xl card-shadow mt-6">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search visitor, domain, or actions..."
          className="p-4 border-b border-app"
        />

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            rowKey={(r) => r.id}
            emptyState={
              <EmptyState
                icon={<Activity className="h-6 w-6" />}
                title={search ? 'No matching reports' : 'No event timelines recorded yet'}
                description={search ? 'Try adjusting your search terms.' : 'Live event data timelines will appear here once visitors interact with your campaigns.'}
              />
            }
          />
        )}
      </div>
    </div>
  );
}
