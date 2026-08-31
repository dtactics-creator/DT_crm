import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Target, Award, Users2, Users, Trophy, XCircle, FolderKanban, Activity, CheckCircle2 } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { ChartCard, ChartTooltip, useChartColors } from '../components/charts/ChartKit';
import Skeleton from '../components/ui/Skeleton';
import { useReports } from '../hooks/useDashboard';
import { useAuth } from '../contexts/AuthContext';
import { formatCompact, formatCurrency, formatDate } from '../lib/utils';
import type { ReportData } from '../types';

const SUMMARY = (s: ReportData['summary']) => [
  { label: 'Lead Count', value: s.leadCount, icon: Users, tone: '#3366ff' },
  { label: 'Won Leads', value: s.wonLeads, icon: Trophy, tone: '#10b981' },
  { label: 'Lost Leads', value: s.lostLeads, icon: XCircle, tone: '#ef4444' },
  { label: 'Project Count', value: s.projectCount, icon: FolderKanban, tone: '#8b5cf6' },
  { label: 'Active Projects', value: s.activeProjects, icon: Activity, tone: '#f59e0b' },
  { label: 'Completed Projects', value: s.completedProjects, icon: CheckCircle2, tone: '#14b8a6' },
];

export default function Reports() {
  const { data, isLoading } = useReports();
  const c = useChartColors();

  const wonRate = (s: { total: number; won: number }) => (s.total ? Math.round((s.won / s.total) * 100) : 0);

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Reports" subtitle="Analytics across your leads pipeline and project delivery." />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 mb-6">
        {isLoading || !data
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)
          : SUMMARY(data.summary).map((k, i) => (
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

      {isLoading || !data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Conversion funnel */}
          <ChartCard title="Lead conversion funnel" subtitle="Volume at each pipeline stage"
            action={<Target className="h-4.5 w-4.5 text-brand-600" />}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.conversionFunnel} layout="vertical" margin={{ left: 12, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: c.axis }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 12, fill: c.axis }} axisLine={false} tickLine={false} width={82} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: c.grid, opacity: 0.4 }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={26}>
                  {data.conversionFunnel.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Revenue by type */}
          <ChartCard title="Project budget by type" subtitle="Total committed budget per engagement type"
            action={<DollarSign className="h-4.5 w-4.5 text-amber-500" />}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.revenueByType} margin={{ left: -6, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                <XAxis dataKey="type" tick={{ fontSize: 10.5, fill: c.axis }} axisLine={false} tickLine={false} interval={0} angle={-12} textAnchor="end" height={54} />
                <YAxis tick={{ fontSize: 12, fill: c.axis }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => formatCompact(v)} />
                <Tooltip content={<ChartTooltip prefix="₹" />} cursor={{ fill: c.grid, opacity: 0.4 }} />
                <Bar dataKey="budget" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={52} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Monthly revenue trend */}
          <ChartCard title="Monthly project budget" subtitle="Committed budget over the last 6 months"
            action={<TrendingUp className="h-4.5 w-4.5 text-emerald-500" />}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.monthlyRevenue} margin={{ left: -2, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: c.axis }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: c.axis }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => formatCompact(v)} />
                <Tooltip content={<ChartTooltip prefix="₹" />} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Lead value by status */}
          <ChartCard title="Pipeline value by status" subtitle="Estimated value distribution"
            action={<Award className="h-4.5 w-4.5 text-violet-500" />}>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={260}>
                <PieChart>
                  <Pie data={data.leadValueByStatus} dataKey="value" nameKey="status" cx="50%" cy="50%" innerRadius={54} outerRadius={92} paddingAngle={3} strokeWidth={0}>
                    {data.leadValueByStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip prefix="₹" />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {data.leadValueByStatus.map((e) => (
                  <div key={e.status} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                    <span className="text-[12px] text-muted-fg flex-1 truncate">{e.status}</span>
                    <span className="text-[12px] font-bold text-base-fg tabular">{formatCompact(e.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          {/* Source performance table */}
          <ChartCard title="Lead source performance" subtitle="Volume, wins and value by channel" className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="border-b border-app">
                    {['Source', 'Total leads', 'Won', 'Win rate', 'Est. value'].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-subtle-fg first:pl-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.sourcePerformance || []).map((s) => {
                    const rate = wonRate(s);
                    return (
                      <tr key={s.source} className="border-b border-app last:border-0">
                        <td className="px-3 py-3 first:pl-0 text-[13.5px] font-semibold text-base-fg">{s.source}</td>
                        <td className="px-3 py-3 text-[13.5px] text-muted-fg tabular">{s.total}</td>
                        <td className="px-3 py-3 text-[13.5px] text-muted-fg tabular">{s.won}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2 w-32">
                            <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} />
                            </div>
                            <span className="text-[12px] font-semibold text-muted-fg tabular w-8 text-right">{rate}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[13.5px] font-semibold text-base-fg tabular">{formatCurrency(s.value)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ChartCard>

          {/* Employee load */}
          <ChartCard title="Team workload" subtitle="Leads owned and projects managed per person" className="lg:col-span-2"
            action={<Users2 className="h-4.5 w-4.5 text-brand-600" />}>
            {data.employeeLoad.length === 0 ? (
              <p className="text-[13px] text-muted-fg text-center py-8">No assignments yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.employeeLoad} margin={{ left: -6, right: 8 }} barCategoryGap="24%">
                  <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: c.axis }} axisLine={false} tickLine={false} interval={0} angle={-14} textAnchor="end" height={64} />
                  <YAxis tick={{ fontSize: 12, fill: c.axis }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: c.grid, opacity: 0.4 }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="leads" name="Leads" fill="#3366ff" radius={[5, 5, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="projects" name="Projects" fill="#8b5cf6" radius={[5, 5, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Website Visitor Analytics */}
          <VisitorAnalyticsCard />
        </div>
      )}
    </div>
  );
}

function VisitorAnalyticsCard() {
  const { session } = useAuth();
  const [data, setData] = useState<{
    summary: { totalTrackedUrls: number; openedUrls: number; unopenedUrls: number; totalVisits: number; engagementRate: number };
    labelBreakdown: { label: string; tracked: number; opened: number; visits: number }[];
    trackedUrls: { lead_id: string; customer_name: string; company: string; type: string; url: string; tracking_token: string; first_opened_at: string; last_opened_at: string; total_visits: number; unique_pages: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/lead-url-tracking?action=analytics', {
          headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // Ignore fetch error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session?.access_token]);

  if (loading) {
    return <ChartCard title="Website Visitor Analytics" subtitle="Lead URL opens and page navigation metrics" className="lg:col-span-2"><Skeleton className="h-48" /></ChartCard>;
  }

  const s = data?.summary || { totalTrackedUrls: 0, openedUrls: 0, unopenedUrls: 0, totalVisits: 0, engagementRate: 0 };
  const trackedUrls = data?.trackedUrls || [];

  return (
    <ChartCard title="Website Visitor Analytics" subtitle="Lead URL opens, visitor frequency, and website exploration depth" className="lg:col-span-2" action={<Activity className="h-4.5 w-4.5 text-emerald-500" />}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-app bg-surface-2 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Tracked URLs</p>
            <p className="text-[20px] font-extrabold text-base-fg mt-0.5 tabular">{s.totalTrackedUrls}</p>
          </div>
          <div className="rounded-xl border border-app bg-surface-2 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Opened URLs</p>
            <p className="text-[20px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular">
              {s.openedUrls} <span className="text-[12px] font-normal text-muted-fg">({s.engagementRate}%)</span>
            </p>
          </div>
          <div className="rounded-xl border border-app bg-surface-2 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Unopened</p>
            <p className="text-[20px] font-extrabold text-muted-fg mt-0.5 tabular">{s.unopenedUrls}</p>
          </div>
          <div className="rounded-xl border border-app bg-surface-2 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Total Visits</p>
            <p className="text-[20px] font-extrabold text-brand-600 dark:text-brand-400 mt-0.5 tabular">{s.totalVisits}</p>
          </div>
        </div>

        {trackedUrls.length === 0 ? (
          <p className="text-[12.5px] text-muted-fg text-center py-6">No tracked URLs added yet. Enable tracking on Lead URLs in the Lead Form to view analytics.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg mb-2">Tracked URL Engagement Summary</p>
              <div className="overflow-x-auto rounded-xl border border-app">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-surface-2 text-subtle-fg font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3.5 py-2.5">Lead</th>
                      <th className="px-3.5 py-2.5">Label</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5">First Opened</th>
                      <th className="px-3.5 py-2.5">Last Opened</th>
                      <th className="px-3.5 py-2.5 text-center">Visits</th>
                      <th className="px-3.5 py-2.5 text-center">Pages</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border)]">
                    {trackedUrls.slice(0, 10).map((u, i) => {
                      const visits = u.total_visits || 0;
                      const status = visits === 0 ? 'Not Opened' : visits >= 3 ? 'Highly Engaged' : 'Opened';
                      return (
                        <tr key={i} className="hover:bg-surface-2/50 transition-colors">
                          <td className="px-3.5 py-2.5">
                            <p className="font-semibold text-base-fg">{u.customer_name}</p>
                            <p className="text-[11px] text-muted-fg">{u.company || '—'}</p>
                          </td>
                          <td className="px-3.5 py-2.5 font-medium text-base-fg">{u.type}</td>
                          <td className="px-3.5 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold ${
                              status === 'Highly Engaged' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' :
                              status === 'Opened' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' :
                              'bg-surface-3 text-muted-fg'
                            }`}>
                              {status === 'Highly Engaged' ? '🔥 Highly Engaged' : status === 'Opened' ? '🟢 Opened' : '⚪ Not Opened'}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-muted-fg">{formatDate(u.first_opened_at) || 'Not yet'}</td>
                          <td className="px-3.5 py-2.5 text-muted-fg">{formatDate(u.last_opened_at) || '—'}</td>
                          <td className="px-3.5 py-2.5 text-center font-bold text-brand-600 dark:text-brand-400">{u.total_visits || 0}</td>
                          <td className="px-3.5 py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">{u.unique_pages || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
