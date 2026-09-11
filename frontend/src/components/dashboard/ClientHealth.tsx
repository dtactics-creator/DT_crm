'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Repeat } from 'lucide-react';
import { ChartCard } from '../../components/charts/ChartKit';
import { ListSkeleton, SectionBody, TileSkeleton } from './DashboardSkeleton';
import type { ClientSummary } from '../../types/dashboard';
import { cn, formatCurrency, formatPercent } from '../../lib/utils';

interface Props { data: ClientSummary | null; loading: boolean; error?: string; onRetry: () => void; className?: string }

/** Clients are matched to projects by client_id (name match as fallback); each client counts once. */
export default function ClientHealth({ data, loading, error, onRetry, className }: Props) {
  const [sortBy, setSortBy] = useState<'value' | 'projects'>('value');
  const top = data
    ? [...data.topClients].sort((a, b) => (sortBy === 'value' ? b.totalValue - a.totalValue : b.projectCount - a.projectCount || b.totalValue - a.totalValue)).slice(0, 5)
    : [];
  const maxValue = Math.max(1, ...top.map((t) => (sortBy === 'value' ? t.totalValue : t.projectCount)));

  return (
    <ChartCard
      title="Client health"
      subtitle="Relationships and repeat business"
      className={className}
      action={<Link to="/clients" className="text-[12.5px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">View all</Link>}
    >
      <SectionBody
        loading={loading} error={error} onRetry={onRetry}
        empty={!data || data.total === 0} emptyIcon={Building2} emptyMessage="No clients yet. Won leads convert into clients here."
        skeleton={<><TileSkeleton count={4} /><ListSkeleton rows={4} height={34} /></>}
      >
        {data && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Tile label="Total clients" value={String(data.total)} hint={data.newThisMonth ? `+${data.newThisMonth} this month` : undefined} />
              <Tile label="Active clients" value={String(data.active)} tone="#10b981" />
              <Tile label="With active projects" value={String(data.withActiveProjects)} />
              <Tile label="Repeat clients" value={String(data.repeatClients)} hint={data.withProjects ? `${formatPercent(data.repeatRate, 0)} of ${data.withProjects} with projects` : undefined} />
            </div>

            <div className="mt-4 rounded-xl border border-app p-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/12 text-emerald-500"><Repeat size={15} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-base-fg">Repeat business</p>
                  <p className="text-[11px] text-muted-fg">Clients with 2+ projects</p>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-extrabold tabular text-base-fg">{formatCurrency(data.repeatValue)}</p>
                  <p className="text-[10.5px] text-subtle-fg">{formatPercent(data.repeatValueShare, 0)} of project value</p>
                </div>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(data.repeatValueShare, 100)}%` }} />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Top clients</p>
                <div className="inline-flex rounded-lg border border-app bg-surface-2 p-0.5">
                  {(['value', 'projects'] as const).map((k) => (
                    <button key={k} onClick={() => setSortBy(k)} className={cn('rounded-md px-2 py-0.5 text-[10.5px] font-bold capitalize transition-colors', sortBy === k ? 'bg-surface text-base-fg shadow-sm' : 'text-muted-fg hover:text-base-fg')}>
                      by {k}
                    </button>
                  ))}
                </div>
              </div>
              {top.length === 0 ? (
                <p className="text-[12px] text-muted-fg">No clients have linked projects yet.</p>
              ) : (
                <ul className="space-y-2">
                  {top.map((c) => (
                    <li key={c.id}>
                      <Link to={`/clients?id=${c.id}`} className="block rounded-lg px-1 py-1 hover:bg-surface-2">
                        <div className="flex items-center justify-between gap-2 text-[12px]">
                          <span className="truncate font-semibold text-base-fg">{c.name}</span>
                          <span className="shrink-0 tabular text-muted-fg">
                            {c.projectCount} project{c.projectCount === 1 ? '' : 's'} · <span className="font-bold text-base-fg">{formatCurrency(c.totalValue)}</span>
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${((sortBy === 'value' ? c.totalValue : c.projectCount) / maxValue) * 100}%` }} />
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
      <p className="text-[18px] font-extrabold leading-none tabular" style={{ color: tone ?? 'var(--text)' }}>{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-muted-fg">{label}</p>
      {hint && <p className="truncate text-[10.5px] text-subtle-fg">{hint}</p>}
    </div>
  );
}

