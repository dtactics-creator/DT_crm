'use client';

import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { FolderKanban, Gauge } from 'lucide-react';
import { ChartCard, ChartTooltip } from '../../components/charts/ChartKit';
import Badge from '../../components/ui/Badge';
import { DonutSkeleton, SectionBody, TableSkeleton, TileSkeleton } from './DashboardSkeleton';
import type { HealthSlice, ProjectHealthRow, ProjectSummary } from '../../types/dashboard';
import { cn, daysUntil, dueLabel, formatCurrency, formatDateShort } from '../../lib/utils';

interface Props { summary: ProjectSummary | null; slices: HealthSlice[]; rows: ProjectHealthRow[]; loading: boolean; error?: string; onRetry: () => void }

/**
 * Health is derived, not stored:
 *  Delayed  → expected delivery passed and progress < 100
 *  At risk  → progress trails the elapsed share of the planned timeline by more than 15 points
 *  On track → everything else that is active · Completed / On hold come from project status
 */
export default function ProjectHealth({ summary, slices, rows, loading, error, onRetry }: Props) {
  const donut = slices.filter((s) => s.health !== 'cancelled' && s.count > 0);
  const tracked = donut.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <ChartCard title="Project health" subtitle="Derived from progress vs. planned timeline">
        <SectionBody
          loading={loading} error={error} onRetry={onRetry}
          empty={!summary || summary.total === 0} emptyIcon={Gauge} emptyMessage="No project data available."
          skeleton={<><DonutSkeleton /><TileSkeleton count={4} /></>}
        >
          {summary && (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={donut} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={52} outerRadius={76} paddingAngle={3} strokeWidth={0}>
                      {donut.map((s) => <Cell key={s.health} fill={s.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[22px] font-extrabold leading-none tabular text-base-fg">{tracked}</p>
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-subtle-fg">tracked</p>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {donut.map((s) => (
                  <Link key={s.health} to={`/projects?health=${s.health}`} className="flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5 hover:bg-surface-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="flex-1 truncate text-[12px] text-muted-fg">{s.label}</span>
                    <span className="text-[12px] font-bold tabular text-base-fg">{s.count}</span>
                  </Link>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-app pt-4">
                <Tile label="Total projects" value={String(summary.total)} />
                <Tile label="Active value" value={formatCurrency(summary.activeValue)} />
                <Tile label="Delayed" value={String(summary.delayed)} tone={summary.delayed > 0 ? '#ef4444' : undefined} />
                <Tile label="Due in 30 days" value={String(summary.due30d)} tone={summary.due30d > 0 ? '#f59e0b' : undefined} />
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-muted-fg">Avg. progress · active projects</span>
                  <span className="text-[12px] font-bold tabular text-base-fg">{summary.avgProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-violet-500 transition-[width]" style={{ width: `${summary.avgProgress}%` }} />
                </div>
                <p className="mt-2 text-[11px] text-subtle-fg">
                  {summary.completed} completed · {summary.onHold} on hold · {summary.cancelled} cancelled · {formatCurrency(summary.totalValue)} total value
                </p>
              </div>
            </>
          )}
        </SectionBody>
      </ChartCard>

      <ChartCard
        title="Delivery tracker"
        subtitle="Progress vs. expected progress by today"
        className="lg:col-span-2"
        action={<Link to="/projects" className="text-[12.5px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">View all</Link>}
      >
        <SectionBody
          loading={loading} error={error} onRetry={onRetry}
          empty={rows.length === 0} emptyIcon={FolderKanban} emptyMessage="No active projects to track."
          skeleton={<TableSkeleton rows={6} cols={5} />}
        >
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[640px] text-[12.5px]">
              <thead>
                <tr className="text-left text-[10.5px] font-bold uppercase tracking-wider text-subtle-fg">
                  <th className="pb-2 pr-3 font-bold">Project</th>
                  <th className="pb-2 pr-3 font-bold">Health</th>
                  <th className="pb-2 pr-3 font-bold">Progress</th>
                  <th className="pb-2 pr-3 text-right font-bold">Delivery</th>
                  <th className="pb-2 text-right font-bold">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((p) => {
                  const days = p.expectedDelivery ? daysUntil(p.expectedDelivery) : null;
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-surface-2">
                      <td className="py-2.5 pr-3">
                        <Link to={`/projects?id=${p.id}`} className="block min-w-0">
                          <p className="max-w-[220px] truncate font-semibold text-base-fg">{p.projectName}</p>
                          <p className="truncate text-[11px] text-subtle-fg">{p.projectNo || '—'} · {p.client}{p.manager ? ` · ${p.manager}` : ''}</p>
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex flex-col items-start gap-1">
                          <Badge label={p.healthLabel} color={p.healthColor} dot />
                          {p.status !== 'active' && <span className="text-[10.5px] text-subtle-fg">{p.statusLabel}</span>}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="relative h-1.5 w-full min-w-[90px] max-w-[160px] rounded-full bg-surface-2">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(p.progress, 100)}%`, backgroundColor: p.healthColor }} />
                            {p.expectedProgress !== null && (
                              <span
                                className="absolute -top-[3px] h-3 w-[2px] rounded bg-base-fg/60"
                                style={{ left: `calc(${Math.min(p.expectedProgress, 100)}% - 1px)` }}
                                title={`Expected ${p.expectedProgress}% by today`}
                              />
                            )}
                          </div>
                          <span className="w-9 text-right text-[11px] font-semibold tabular text-muted-fg">{Math.round(p.progress)}%</span>
                        </div>
                        {p.expectedProgress !== null && (
                          <p className={cn('mt-0.5 text-[10.5px]', p.expectedProgress - p.progress > 15 ? 'text-amber-500' : 'text-subtle-fg')}>
                            expected {p.expectedProgress}%
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <p className="font-semibold tabular text-base-fg">{formatDateShort(p.expectedDelivery)}</p>
                        <p className={cn('text-[11px]', days !== null && days < 0 ? 'text-red-500' : 'text-subtle-fg')}>{p.expectedDelivery ? dueLabel(days) : 'No date'}</p>
                      </td>
                      <td className="py-2.5 text-right font-bold tabular text-base-fg">{formatCurrency(p.projectCost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-subtle-fg">▍ marker = expected progress based on the elapsed share of start → expected delivery.</p>
        </SectionBody>
      </ChartCard>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-[18px] font-extrabold leading-none tabular" style={{ color: tone ?? 'var(--text)' }}>{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-muted-fg">{label}</p>
    </div>
  );
}

