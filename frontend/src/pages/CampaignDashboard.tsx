import { useState } from 'react';
import { RefreshCw, Target, Activity, Copy, MonitorPlay, Play, Filter, X } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { useCampaignDashboard, type CampaignFilters } from '../hooks/useCampaignDashboard';
import { formatNumber, cn, timeAgo } from '../lib/utils';
import { SectionError } from '../components/dashboard/DashboardSkeleton';
import DashboardKpiCard from '../components/dashboard/DashboardKpiCard';
import { DistributionChart, PieChartWidget, RadarWidget, RadialBarWidget, TimelineWidget, ExpiringWidget, SetupComposition, DataList } from '../components/campaigns/CampaignWidgets';

const BTN = 'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[12.5px] font-semibold transition-colors';

const formatDuration = (start?: string | null, end?: string | null) => {
  if (!start || !end) return '-';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return '-';
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  if (days === 0 && hours === 0) return '< 1h';
  if (days === 0) return `${hours}h`;
  if (hours === 0) return `${days}d`;
  return `${days}d ${hours}h`;
};

export default function CampaignDashboard() {
  const [filters, setFilters] = useState<CampaignFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const { data, isLoading, isError, error, refetch } = useCampaignDashboard(filters);

  const k = data?.kpis;

  const kpiCards = [
    { label: 'Total Campaigns', value: formatNumber(k?.totalCampaigns), icon: Target, tone: '#3366ff', href: '/campaigns' },
    { label: 'Active Campaigns', value: formatNumber(k?.activeCampaigns), icon: Activity, tone: '#10b981', href: '/campaigns' },
    { label: 'Total Templates', value: formatNumber(k?.totalTemplates), icon: Copy, tone: '#8b5cf6', href: '/campaign-templates' },
    { label: 'Active Templates', value: formatNumber(k?.activeTemplates), icon: Copy, tone: '#f59e0b', href: '/campaign-templates' },
    { label: 'Total Setups', value: formatNumber(k?.totalSetups), icon: MonitorPlay, tone: '#0ea5e9', href: '/campaign-setup' },
    { label: 'Active Setups', value: formatNumber(k?.activeSetups), icon: Play, tone: '#14b8a6', href: '/campaign-setup' },
  ];

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const clearFilters = () => setFilters({});
  const hasFilters = Object.values(filters).some(v => !!v);

  return (
    <div className="mx-auto min-w-0 max-w-[1500px] p-5 sm:p-8 space-y-6">
      <PageHeader
        title="Campaign Dashboard"
        subtitle="Comprehensive analytics, timelines, and distributions for all campaign modules."
        actions={
          <div className="flex items-center gap-3">
            <button onClick={() => refetch()} className={cn(BTN, 'border-app bg-surface text-muted-fg hover:text-base-fg')} disabled={isLoading}>
              <RefreshCw size={16} className={cn(isLoading && 'animate-spin')} /> Refresh
            </button>
          </div>
        }
      />



      {isError && (
        <SectionError message={`Failed to load dashboard: ${(error as Error)?.message}`} onRetry={() => refetch()} />
      )}

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 2xl:grid-cols-6">
        {kpiCards.map((card, i) => <DashboardKpiCard key={card.label} {...card} loading={isLoading} index={i} />)}
      </div>

      {isLoading && <div className="text-center text-muted-fg text-[13px] py-10 animate-pulse">Loading analytics...</div>}

      {!isLoading && data && (
        <>
          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PieChartWidget title="Campaign Status Distribution" data={data.campaignStatusDistribution} />
            <RadarWidget title="Campaigns by Type" data={data.typeSlices} />
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RadialBarWidget title="Template Status Distribution" data={data.templateStatusDistribution} />
            <div className="space-y-6">
              <DistributionChart title="Setup Status" data={data.setupStatusDistribution} />
              <DistributionChart title="Setup Play Mode" data={data.setupPlayModeDistribution} />
            </div>
          </div>

          {/* Timelines & Expiring */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TimelineWidget title="Campaign Timeline" events={data.campaignTimeline} />
            <TimelineWidget title="Setup Timeline" events={data.setupTimeline} />
            <div className="space-y-6">
              <ExpiringWidget campaigns={data.expiringSoonCampaigns} />
              <SetupComposition compositions={data.setupTemplateComposition} />
            </div>
          </div>

          {/* Data Tables */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <DataList 
              title="Active Campaigns" 
              data={data.activeCampaignsList} 
              columns={[
                { header: 'Title', accessor: (r) => <span className="font-semibold">{r.title}</span> },
                { header: 'Type', accessor: (r) => <span className="capitalize">{r.type}</span> },
                { header: 'Template', accessor: (r) => r.template || '-' },
                { header: 'End Date', accessor: (r) => r.end ? new Date(r.end).toLocaleDateString() : '-' },
              ]}
            />
            <DataList 
              title="Upcoming Campaigns" 
              data={data.upcomingCampaignsList} 
              columns={[
                { header: 'Title', accessor: (r) => <span className="font-semibold">{r.title}</span> },
                { header: 'Type', accessor: (r) => <span className="capitalize">{r.type}</span> },
                { header: 'Start Date', accessor: (r) => r.start ? new Date(r.start).toLocaleDateString() : '-' },
              ]}
            />
          </div>

          <DataList 
             title="Campaign Setup Overview" 
             data={data.setupOverview} 
             columns={[
               { header: 'Setup Name', accessor: (r) => <span className="font-semibold">{r.name}</span> },
               { header: 'Status', accessor: (r) => <span className="capitalize">{r.status}</span> },
               { header: 'Play Mode', accessor: (r) => <span className="capitalize">{r.playMode}</span> },
               { header: 'Templates', accessor: (r) => <span className="font-bold">{r.templateCount}</span> },
               { header: 'Duration', accessor: (r) => (
                 <div className="flex flex-col">
                   <span className="font-semibold text-base-fg">{formatDuration(r.start, r.end)}</span>
                   <span className="text-[10px] text-muted-fg">{r.start ? new Date(r.start).toLocaleDateString() : '-'} to {r.end ? new Date(r.end).toLocaleDateString() : '-'}</span>
                 </div>
               ) },
             ]}
          />
        </>
      )}
    </div>
  );
}
