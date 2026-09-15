'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { ChartCard, ChartTooltip, useChartColors } from '../../components/charts/ChartKit';
import Badge from '../../components/ui/Badge';
import { ChartSkeleton, SectionBody } from './DashboardSkeleton';
import type { TrendData, TrendRange } from '../../types/dashboard';
import { cn, formatCurrency, formatNumber, pctChange } from '../../lib/utils';

const RANGES: { value: TrendRange; label: string }[] = [
  { value: '7d', label: '7D' }, { value: '30d', label: '30D' }, { value: '90d', label: '90D' }, { value: '12m', label: '12M' },
];

function RangeTabs({ value, onChange }: { value: TrendRange; onChange: (r: TrendRange) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-app bg-surface-2 p-0.5">
      {RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={cn(
            'rounded-lg px-2.5 py-1 text-[11.5px] font-bold transition-colors',
            value === r.value ? 'bg-surface text-base-fg shadow-sm' : 'text-muted-fg hover:text-base-fg',
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

interface LeadTrendProps { trend: TrendData | null; loading: boolean; error?: string; onRetry: () => void; range: TrendRange; onRangeChange: (r: TrendRange) => void; className?: string }

export default function LeadTrend({ trend, loading, error, onRetry, range, onRangeChange, className }: LeadTrendProps) {
  const c = useChartColors();
  const points = trend?.points ?? [];
  const hasData = points.some((p) => p.leads > 0 || p.won > 0 || p.lost > 0);
  // Only show a change badge when a previous period actually has data.
  const change = trend?.hasPrevious ? pctChange(trend.totals.leads, trend.previous.leads) : null;

  return (
    <ChartCard
      title="Lead acquisition"
      subtitle="New leads vs. won and lost · by lead received date"
      className={cn("flex flex-col h-full", className)}
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {change !== null && (
            <Badge label={`${change >= 0 ? '+' : ''}${change.toFixed(0)}% leads vs. previous period`} color={change >= 0 ? '#10b981' : '#ef4444'} dot />
          )}
          <RangeTabs value={range} onChange={onRangeChange} />
        </div>
      }
    >
      <SectionBody
        loading={loading && !trend} error={error} onRetry={onRetry}
        empty={!hasData} emptyIcon={TrendingUp} emptyMessage="No leads were received in this period."
        skeleton={<ChartSkeleton height={280} />}
      >
        <div className={cn('transition-opacity flex flex-col flex-1', loading && 'opacity-50')}>
          <div className="flex-1 min-h-[250px] -ml-2.5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ left: -18, right: 8, top: 6 }}>
                <defs>
                  <linearGradient id="trendLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3366ff" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3366ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="trendWon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} minTickGap={18} />
                <YAxis tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="#3366ff" strokeWidth={2.5} fill="url(#trendLeads)" />
                <Area type="monotone" dataKey="won" name="Won" stroke="#10b981" strokeWidth={2.5} fill="url(#trendWon)" />
                <Area type="monotone" dataKey="lost" name="Lost" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
            <TotalStat label="Leads" value={formatNumber(trend?.totals.leads)} color="#3366ff" />
            <TotalStat label="Won" value={formatNumber(trend?.totals.won)} color="#10b981" />
            <TotalStat label="Lost" value={formatNumber(trend?.totals.lost)} color="#ef4444" />
            <TotalStat label="Won value" value={formatCurrency(trend?.totals.wonValue)} color="#10b981" />
          </div>
        </div>
      </SectionBody>
    </ChartCard>
  );
}

function TotalStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[11.5px] font-semibold text-muted-fg">{label}</span>
      <span className="ml-auto text-[13px] font-extrabold tabular text-base-fg">{value}</span>
    </div>
  );
}

