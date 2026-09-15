'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Gauge, Target } from 'lucide-react';
import { ChartCard, ChartTooltip, useChartColors } from '../../components/charts/ChartKit';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import { ChartSkeleton, ListSkeleton, SectionBody } from './DashboardSkeleton';
import type { OpportunityRow, PrioritySlice, StatusSlice } from '../../types/dashboard';
import { daysUntil, dueLabel, formatCurrency, formatCurrencyFull, formatPercent } from '../../lib/utils';

const STAGE_ORDER = ['new', 'contacted', 'proposal_sent', 'negotiation', 'won', 'lost'];
const CLOSED = new Set(['won', 'lost']);

interface PipelineByStageProps { slices: StatusSlice[]; priorities: PrioritySlice[]; loading: boolean; error?: string; onRetry: () => void; className?: string }

/** Budget currently sitting at each stage (each lead counted once, in its current status). */
export function PipelineByStage({ slices, priorities, loading, error, onRetry, className }: PipelineByStageProps) {
  const c = useChartColors();
  const ordered = [...slices].sort((a, b) => {
    const ia = STAGE_ORDER.indexOf(a.status); const ib = STAGE_ORDER.indexOf(b.status);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const openTotal = ordered.filter((s) => !CLOSED.has(s.status)).reduce((sum, s) => sum + s.value, 0);
  const priorityTotal = priorities.reduce((sum, p) => sum + p.value, 0);
  const priorityCount = priorities.reduce((sum, p) => sum + p.count, 0);

  return (
    <ChartCard
      title="Pipeline value by stage"
      subtitle="Budget of leads at each stage · won and lost shown for context"
      className={className}
      action={
        <div className="text-right">
          <p className="text-[11px] font-semibold text-subtle-fg">Open pipeline</p>
          <p className="text-[16px] font-extrabold tabular text-base-fg">{formatCurrency(openTotal)}</p>
        </div>
      }
    >
      <SectionBody
        loading={loading} error={error} onRetry={onRetry}
        empty={ordered.length === 0} emptyIcon={Gauge} emptyMessage="No pipeline data available for the selected filters."
        skeleton={<ChartSkeleton height={220} />}
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={ordered} margin={{ left: -6, right: 8, top: 6 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => formatCurrency(v)} />
            <Tooltip content={<ChartTooltip prefix="?" />} cursor={{ fill: "#334155", opacity: 0.1 }} />
            <Bar dataKey="value" name="Value" radius={[6, 6, 0, 0]} maxBarSize={52}>
              {ordered.map((s) => <Cell key={s.status} fill={s.color} fillOpacity={CLOSED.has(s.status) ? 0.5 : 1} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 border-t border-app pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-bold text-base-fg">Open pipeline by priority</p>
            <p className="text-[11px] text-subtle-fg">{priorityCount} open leads</p>
          </div>
          {priorities.length === 0 ? (
            <p className="text-[12px] text-muted-fg">No open leads.</p>
          ) : (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2">
                {priorities.map((p) => (
                  <div key={p.priority} style={{ width: `${priorityTotal ? (p.value / priorityTotal) * 100 : 0}%`, backgroundColor: p.color }} title={`${p.label}: ${formatCurrencyFull(p.value)}`} />
                ))}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
                {priorities.map((p) => (
                  <Link key={p.priority} to={`/leads?priority=${p.priority}`} className="flex items-center gap-1.5 text-[11.5px] hover:underline">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-muted-fg">{p.label}</span>
                    <span className="font-bold tabular text-base-fg">{formatCurrency(p.value)}</span>
                    <span className="text-subtle-fg">· {p.count} · {formatPercent(priorityTotal ? (p.value / priorityTotal) * 100 : 0, 0)}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </SectionBody>
    </ChartCard>
  );
}

interface OpportunitiesProps { rows: OpportunityRow[]; loading: boolean; error?: string; onRetry: () => void; className?: string }

/** Largest open leads by budget. */
export function HighValueOpportunities({ rows, loading, error, onRetry, className }: OpportunitiesProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const visibleRows = rows.slice(0, 5);

  const renderList = (data: OpportunityRow[]) => (
    <ul className="-mx-2 divide-y divide-line">
      {data.map((o) => {
        const days = daysUntil(o.nextFollowUp);
        return (
          <li key={o.id}>
            <Link to={`/leads?id=${o.id}`} onClick={() => setModalOpen(false)} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-2">
              <Avatar name={o.customerName} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-base-fg">{o.customerName}</p>
                <p className="truncate text-[11.5px] text-muted-fg">{o.company || '—'} · {o.leadNo || 'No ref.'}{o.owner ? ` · ${o.owner}` : ''}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13.5px] font-extrabold tabular text-base-fg">{formatCurrency(o.budget)}</p>
                <div className="mt-1 flex items-center justify-end gap-1.5">
                  <Badge label={o.statusLabel} color={o.statusColor} dot />
                  <span className={`text-[10.5px] font-semibold ${days !== null && days < 0 ? 'text-red-500' : 'text-subtle-fg'}`}>{dueLabel(days)}</span>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <ChartCard title="High-value opportunities" subtitle="Largest open leads by budget" className={className}
        action={rows.length > 5 ? <button onClick={() => setModalOpen(true)} className="text-[12.5px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">View all</button> : undefined}>
        <SectionBody
          loading={loading} error={error} onRetry={onRetry}
          empty={rows.length === 0} emptyIcon={Target} emptyMessage="No open opportunities right now." emptyCompact
          skeleton={<ListSkeleton rows={5} height={58} />}
        >
          {renderList(visibleRows)}
        </SectionBody>
      </ChartCard>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="High-value opportunities" size="max-w-xl">
        {renderList(rows)}
      </Modal>
    </>
  );
}

