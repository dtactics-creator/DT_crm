'use client';

import { Link } from 'react-router-dom';
import { CalendarClock, ShieldCheck } from 'lucide-react';
import { ChartCard } from '../../components/charts/ChartKit';
import { ListSkeleton, SectionBody, TileSkeleton } from './DashboardSkeleton';
import type { AmcSummary } from '../../types/dashboard';
import { cn, formatCurrency, formatDateShort } from '../../lib/utils';

interface Props { data: AmcSummary | null; loading: boolean; error?: string; onRetry: () => void; className?: string }

function daysTone(days: number | null): string {
  if (days === null) return 'text-subtle-fg';
  if (days < 0) return 'text-red-500';
  if (days <= 30) return 'text-amber-500';
  if (days <= 60) return 'text-orange-400';
  return 'text-muted-fg';
}

/** AMC renewals use renewal_date, falling back to end_date when renewal_date is not set. */
export default function AmcAnalytics({ data, loading, error, onRetry, className }: Props) {
  const windows = data
    ? [
        { label: '0–30 days', count: data.renew30, color: '#f59e0b' },
        { label: '31–60 days', count: Math.max(data.renew60 - data.renew30, 0), color: '#fb923c' },
        { label: '61–90 days', count: Math.max(data.renew90 - data.renew60, 0), color: '#0ea5e9' },
      ]
    : [];

  return (
    <ChartCard
      title="AMC / renewals"
      subtitle="Annual maintenance contracts"
      className={className}
      action={<Link to="/clients?tab=amc" className="text-[12.5px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">View all</Link>}
    >
      <SectionBody
        loading={loading} error={error} onRetry={onRetry}
        empty={!data || data.total === 0} emptyIcon={ShieldCheck} emptyMessage="No AMC contracts recorded yet."
        skeleton={<><TileSkeleton count={2} /><ListSkeleton rows={5} height={40} /></>}
      >
        {data && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Tile label="Active AMC" value={String(data.active)} hint={`${data.total} total`} />
              <Tile label="Annual value" value={formatCurrency(data.annualValue)} tone="#f59e0b" hint="active contracts" />
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Renewals ahead</p>
                <p className="text-[11px] text-subtle-fg">{data.renew90} in 90 days · {formatCurrency(data.renew90Value)}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {windows.map((w) => (
                  <div key={w.label} className="rounded-xl border border-app p-2.5 text-center">
                    <p className="text-[18px] font-extrabold leading-none tabular" style={{ color: w.count > 0 ? w.color : 'var(--text)' }}>{w.count}</p>
                    <p className="mt-1 text-[10.5px] font-semibold text-muted-fg">{w.label}</p>
                  </div>
                ))}
              </div>
              {data.expired > 0 && (
                <Link to="/clients?tab=amc&status=expired" className="mt-2 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] hover:bg-red-500/15">
                  <span className="font-semibold text-red-600 dark:text-red-300">Expired · still marked active</span>
                  <span className="font-extrabold tabular text-red-600 dark:text-red-300">{data.expired}</span>
                </Link>
              )}
            </div>

            <div className="mt-4 border-t border-app pt-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Upcoming renewals</p>
              {data.upcoming.length === 0 ? (
                <p className="text-[12px] text-muted-fg">No renewal dates recorded.</p>
              ) : (
                <ul className="space-y-1">
                  {data.upcoming.map((a) => (
                    <li key={a.id}>
                      <Link to={`/clients?tab=amc&id=${a.id}`} className="flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-surface-2">
                        <CalendarClock size={14} className={cn('shrink-0', daysTone(a.daysLeft))} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-base-fg">{a.name}</p>
                          <p className="truncate text-[10.5px] text-subtle-fg">{a.client} · {formatDateShort(a.renewalDate)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[12px] font-bold tabular text-base-fg">{formatCurrency(a.amount)}</p>
                          <p className={cn('text-[10.5px] font-semibold tabular', daysTone(a.daysLeft))}>
                            {a.daysLeft === null ? '—' : a.daysLeft < 0 ? `${Math.abs(a.daysLeft)}d overdue` : `${a.daysLeft}d left`}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </SectionBody>
    </ChartCard>
  );
}

function Tile({ label, value, tone, hint }: { label: string; value: string; tone?: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="truncate text-[18px] font-extrabold leading-none tabular" style={{ color: tone ?? 'var(--text)' }}>{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-muted-fg">{label}</p>
      {hint && <p className="text-[10.5px] text-subtle-fg">{hint}</p>}
    </div>
  );
}

