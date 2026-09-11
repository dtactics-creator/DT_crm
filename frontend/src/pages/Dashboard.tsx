import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Trophy, XCircle, Target, Wallet, CircleDollarSign, Activity, RefreshCw } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { useDashboard } from '../hooks/useDashboard';
import { formatNumber, formatPercent, formatCurrency, timeAgo, cn } from '../lib/utils';
import { SectionError } from '../components/dashboard/DashboardSkeleton';

import DashboardKpiCard from '../components/dashboard/DashboardKpiCard';
import SalesFunnel from '../components/dashboard/SalesFunnel';
import LeadTrend from '../components/dashboard/LeadTrend';
import { PipelineByStage, HighValueOpportunities } from '../components/dashboard/PipelineChart';
import LeadSourcePerformance from '../components/dashboard/LeadSourcePerformance';
import SalesPerformance from '../components/dashboard/SalesPerformance';
import NeedsAttention from '../components/dashboard/NeedsAttention';
import ProjectHealth from '../components/dashboard/ProjectHealth';
import QuotationAnalytics from '../components/dashboard/QuotationAnalytics';
import ClientHealth from '../components/dashboard/ClientHealth';
import AmcAnalytics from '../components/dashboard/AmcAnalytics';
import WebsiteAnalytics from '../components/dashboard/WebsiteAnalytics';
import { ActivityFeed, RecentLeads, RecentProjects } from '../components/dashboard/RecentActivity';
import type { TrendRange } from '../types/dashboard';

const BTN = 'inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[13px] font-semibold transition-colors';

export default function Dashboard() {
  const { data, isLoading, isError, error, refetch } = useDashboard();
  const [range, setRange] = useState<TrendRange>('12m');

  const masters = data?.masters ?? {};
  const k = data?.kpis;
  const p = data?.projects;

  const kpiCards = [
    { label: 'Total Leads', value: formatNumber(k?.totalLeads), icon: Users, tone: '#3366ff', href: '/leads', hint: k ? `${k.newThisMonth} received this month` : undefined },
    { label: 'New Leads', value: formatNumber(k?.newLeads), icon: UserPlus, tone: '#0ea5e9', href: '/leads?status=new', hint: k?.unassignedLeads ? `${k.unassignedLeads} open leads unassigned` : 'All open leads assigned' },
    { label: 'Won Leads', value: formatNumber(k?.wonLeads), icon: Trophy, tone: '#10b981', href: '/leads?status=won', hint: k ? `${formatPercent(k.winRate, 0)} win rate · won ÷ closed` : undefined },
    { label: 'Lost Leads', value: formatNumber(k?.lostLeads), icon: XCircle, tone: '#ef4444', href: '/leads?status=lost', hint: k ? `${formatCurrency(k.lostValue)} lost value` : undefined },
    { label: 'Conversion Rate', value: formatPercent(k?.conversionRate), icon: Target, tone: '#8b5cf6', href: '/leads', hint: 'won ÷ total leads' },
    { label: 'Open Pipeline', value: formatCurrency(k?.openPipelineValue), icon: Wallet, tone: '#f59e0b', href: '/leads?stage=open', hint: k ? `${k.openLeads} open leads` : undefined },
    { label: 'Won Value', value: formatCurrency(k?.wonValue), icon: CircleDollarSign, tone: '#10b981', href: '/leads?status=won', hint: k?.wonLeads ? `avg ${formatCurrency(k.avgWonValue)} per win` : undefined },
    { label: 'Active Projects', value: formatNumber(p?.active), icon: Activity, tone: '#14b8a6', href: '/projects?status=active', hint: p ? `${p.total} total · ${p.completed} completed` : undefined },
  ];

  return (
    <div className="mx-auto min-w-0 max-w-[1500px] p-5 sm:p-8">
      <PageHeader
        title="Dashboard"
        subtitle="Your lead pipeline and project delivery at a glance."
        actions={
          <>
            {data && <span className="hidden text-[11.5px] text-subtle-fg sm:inline">Updated {timeAgo(data.generatedAt)}</span>}
            <button onClick={() => refetch()} className={cn(BTN, 'border-app bg-surface text-muted-fg hover:text-base-fg')} disabled={isLoading}>
              <RefreshCw size={16} className={cn(isLoading && 'animate-spin')} /> Refresh
            </button>
          </>
        }
      />

      {isError && (
        <div className="mb-6">
          <SectionError message={`Failed to load dashboard: ${(error as Error)?.message}`} onRetry={() => refetch()} />
        </div>
      )}

      {/* Row 1 — Primary KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3.5 md:grid-cols-4 2xl:grid-cols-8">
        {kpiCards.map((card, i) => <DashboardKpiCard key={card.label} {...card} loading={isLoading} index={i} />)}
      </div>

      {/* Row 2 — Funnel + Trend */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SalesFunnel slices={data?.leadStatus ?? []} stages={masters.lead_status ?? []} loading={isLoading} onRetry={() => refetch()} />
        <LeadTrend trend={data?.trend ?? null} loading={isLoading} onRetry={() => refetch()} range={range} onRangeChange={setRange} className="lg:col-span-2" />
      </div>

      {/* Row 3 — Pipeline value + opportunities */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PipelineByStage slices={data?.leadStatus ?? []} priorities={data?.priorityPipeline ?? []} loading={isLoading} onRetry={() => refetch()} className="lg:col-span-2" />
        <HighValueOpportunities rows={data?.opportunities ?? []} loading={isLoading} onRetry={() => refetch()} />
      </div>

      {/* Row 4 — Source + employee performance */}
      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <LeadSourcePerformance rows={data?.sources ?? []} loading={isLoading} onRetry={() => refetch()} />
        <SalesPerformance rows={data?.employees ?? []} unassigned={k?.unassignedLeads ?? 0} loading={isLoading} onRetry={() => refetch()} />
      </div>

      {/* Row 5 — Project health */}
      <ProjectHealth summary={p ?? null} slices={data?.projectHealth?.slices ?? []} rows={data?.projectHealth?.rows ?? []} loading={isLoading} onRetry={() => refetch()} />

      {/* Row 6 — Recent */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecentLeads rows={data?.recentLeads ?? []} loading={isLoading} onRetry={() => refetch()} />
        <RecentProjects rows={data?.recentProjects ?? []} loading={isLoading} onRetry={() => refetch()} />
        <ActivityFeed rows={data?.activity ?? []} loading={isLoading} onRetry={() => refetch()} />
      </div>
    </div>
  );
}
