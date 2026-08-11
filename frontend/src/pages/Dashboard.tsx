import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  Users, UserPlus, Trophy, XCircle, FolderKanban, Activity, CheckCircle2, TrendingUp, Wallet,
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { useDashboard } from '../hooks/useDashboard';
import { useMasters, makeLookup } from '../hooks/useMasters';
import { ChartCard, ChartTooltip, useChartColors } from '../components/charts/ChartKit';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Skeleton from '../components/ui/Skeleton';
import { formatCompact, formatCurrency, timeAgo } from '../lib/utils';
import type { DashboardStats } from '../types';

const STAT_CARDS = (s: DashboardStats) => [
  { label: 'Total Leads', value: s.totalLeads, icon: Users, tone: '#3366ff' },
  { label: 'New Leads', value: s.newLeads, icon: UserPlus, tone: '#0ea5e9' },
  { label: 'Won Leads', value: s.wonLeads, icon: Trophy, tone: '#10b981' },
  { label: 'Lost Leads', value: s.lostLeads, icon: XCircle, tone: '#ef4444' },
  { label: 'Total Projects', value: s.totalProjects, icon: FolderKanban, tone: '#8b5cf6' },
  { label: 'Active Projects', value: s.activeProjects, icon: Activity, tone: '#f59e0b' },
  { label: 'Completed', value: s.completedProjects, icon: CheckCircle2, tone: '#14b8a6' },
];

export default function Dashboard() {
  const { data: stats, isLoading, isError, error } = useDashboard();
  const { data: masters } = useMasters();
  const lookup = makeLookup(masters);
  const c = useChartColors();

  return (
    <div className="p-5 sm:p-8 max-w-[1500px] mx-auto">
      <PageHeader title="Dashboard" subtitle="Your lead pipeline and project delivery at a glance." />

      {isError && (
        <div className="mb-6 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-[13px] font-medium text-red-600">
          Failed to load dashboard: {(error as Error)?.message}
        </div>
      )}

      {/* Statistics cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3.5 mb-6">
        {isLoading || !stats
          ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)
          : (STAT_CARDS(stats) || []).map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-surface border border-app rounded-2xl card-shadow p-4">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${k.tone}18` }}>
                <k.icon className="h-4.5 w-4.5" style={{ color: k.tone }} />
              </div>
              <p className="text-[24px] font-extrabold text-base-fg tracking-tight tabular leading-none">{k.value}</p>
              <p className="text-[12px] font-semibold text-muted-fg mt-1.5">{k.label}</p>
            </motion.div>
          ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <ChartCard title="Lead acquisition" subtitle="New leads vs. won deals · last 6 months" className="lg:col-span-2"
          action={<Badge label="Trending up" color="#10b981" dot />}>
          {isLoading || !stats ? <Skeleton className="h-[260px]" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={stats.monthlyTrend || []} margin={{ left: -18, right: 8, top: 6 }}>
                <defs>
                  <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3366ff" stopOpacity={0.3} /><stop offset="100%" stopColor="#3366ff" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gWon" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.25} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: c.axis }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: c.axis }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="leads" stroke="#3366ff" strokeWidth={2.5} fill="url(#gLeads)" />
                <Area type="monotone" dataKey="won" stroke="#10b981" strokeWidth={2.5} fill="url(#gWon)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Lead status" subtitle="Current pipeline distribution">
          {isLoading || !stats ? <Skeleton className="h-[260px]" /> : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={stats.leadsByStatus || []} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} strokeWidth={0}>
                    {(stats.leadsByStatus || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full mt-2">
                {(stats.leadsByStatus || []).map((e) => (
                  <div key={e.status} className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                    <span className="text-[12px] text-muted-fg truncate flex-1">{e.status}</span>
                    <span className="text-[12px] font-bold text-base-fg tabular">{e.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <ChartCard title="Project status" subtitle="Delivery workload distribution" className="lg:col-span-2">
          {isLoading || !stats ? <Skeleton className="h-[220px]" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.projectsByStatus || []} margin={{ left: -18, right: 8, top: 6 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: c.axis }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: c.grid, opacity: 0.4 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                  {(stats.projectsByStatus || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Quick statistics widget */}
        <div className="bg-surface border border-app rounded-2xl card-shadow p-5">
          <h3 className="text-[15px] font-bold text-base-fg mb-4">Quick statistics</h3>
          {isLoading || !stats ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="space-y-3.5">
              <QuickStat icon={TrendingUp} tone="#10b981" label="Conversion rate" value={`${stats.conversionRate || 0}%`} />
              <QuickStat icon={Wallet} tone="#f59e0b" label="Pipeline value" value={formatCurrency(stats.pipelineValue || 0)} />
              <QuickStat icon={FolderKanban} tone="#8b5cf6" label="Total project budget" value={formatCurrency(stats.totalProjectBudget || 0)} />
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12.5px] font-semibold text-muted-fg">Avg. project progress</span>
                  <span className="text-[12.5px] font-bold text-base-fg tabular">{stats.avgProjectProgress || 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-2 overflow-hidden"><div className="h-full rounded-full bg-violet-500" style={{ width: `${stats.avgProjectProgress || 0}%` }} /></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface border border-app rounded-2xl card-shadow overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-app">
            <div className="flex items-center gap-2"><TrendingUp className="h-4.5 w-4.5 text-brand-600" /><h3 className="text-[15px] font-bold text-base-fg">Recent leads</h3></div>
            <Link to="/leads" className="text-[12.5px] font-semibold text-brand-600 hover:text-brand-700">View all</Link>
          </div>
          <div className="divide-y divide-[color:var(--border)]">
            {isLoading || !stats ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[60px] rounded-none" />)
              : (stats.recentLeads || []).map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2 transition-colors">
                  <Avatar name={l.customer_name} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-base-fg truncate">{l.customer_name}</p>
                    <p className="text-[12px] text-muted-fg truncate">{l.lead_no} · {l.company || '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge label={lookup.label('lead_status', l.status)} color={lookup.color('lead_status', l.status)} dot />
                    <p className="text-[11px] text-subtle-fg mt-1">{formatCurrency(l.budget)}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-surface border border-app rounded-2xl card-shadow overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-app">
            <div className="flex items-center gap-2"><FolderKanban className="h-4.5 w-4.5 text-violet-600" /><h3 className="text-[15px] font-bold text-base-fg">Recent projects</h3></div>
            <Link to="/projects" className="text-[12.5px] font-semibold text-brand-600 hover:text-brand-700">View all</Link>
          </div>
          <div className="divide-y divide-[color:var(--border)]">
            {isLoading || !stats ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[60px] rounded-none" />)
              : (stats.recentProjects || []).map((p) => (
                <div key={p.id} className="px-5 py-3 hover:bg-surface-2 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-base-fg truncate">{p.project_name}</p>
                      <p className="text-[12px] text-muted-fg truncate">{p.project_no} · {p.client} · {formatCompact(p.project_cost)}</p>
                    </div>
                    <Badge label={lookup.label('project_status', p.status)} color={lookup.color('project_status', p.status)} dot />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${p.progress}%`, backgroundColor: lookup.color('project_status', p.status) }} /></div>
                    <span className="text-[11px] font-semibold text-muted-fg tabular w-9 text-right">{p.progress}%</span>
                  </div>
                  <p className="text-[11px] text-subtle-fg mt-1.5">Updated {timeAgo(p.updated_at)}</p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStat({ icon: Icon, tone, label, value }: { icon: typeof TrendingUp; tone: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${tone}18` }}>
        <Icon className="h-4.5 w-4.5" style={{ color: tone }} />
      </div>
      <span className="text-[12.5px] font-semibold text-muted-fg flex-1">{label}</span>
      <span className="text-[14px] font-extrabold text-base-fg tabular">{value}</span>
    </div>
  );
}
