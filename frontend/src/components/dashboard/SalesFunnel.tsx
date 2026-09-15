'use client';

import { Link } from 'react-router-dom';
import { ArrowDown, CircleX, Funnel } from 'lucide-react';
import { ChartCard } from '../../components/charts/ChartKit';
import { FunnelSkeleton, SectionBody } from './DashboardSkeleton';
import type { MasterOption, StatusSlice } from '../../types/dashboard';
import { formatCurrency, formatPercent } from '../../lib/utils';

/** Pipeline order from the lead_status master values. */
const FUNNEL_ORDER = ['new', 'contacted', 'proposal_sent', 'negotiation', 'won'];

interface SalesFunnelProps { slices: StatusSlice[]; stages: MasterOption[]; loading: boolean; error?: string; onRetry: () => void; className?: string }

export default function SalesFunnel({ slices, stages, loading, error, onRetry, className }: SalesFunnelProps) {
  const byStatus = new Map(slices.map((s) => [s.status, s]));

  const stageDefs = FUNNEL_ORDER
    .filter((v) => stages.some((s) => s.value === v) || byStatus.has(v))
    .map((v) => {
      const m = stages.find((s) => s.value === v);
      const sl = byStatus.get(v);
      return { value: v, label: m?.label ?? sl?.label ?? v, color: m?.color ?? sl?.color ?? '#64748b', count: sl?.count ?? 0, amount: sl?.value ?? 0 };
    });

  const lost = byStatus.get('lost');
  // "Reached" = leads whose current status is this stage or any later stage. Lost leads are excluded (stage unknown).
  const reached = stageDefs.map((_, i) => stageDefs.slice(i).reduce((sum, s) => sum + s.count, 0));
  const totalLeads = (reached[0] ?? 0) + (lost?.count ?? 0);

  return (
    <ChartCard title="Sales funnel" subtitle="Leads that reached each stage · current status or beyond" className={className}>
      <SectionBody
        loading={loading} error={error} onRetry={onRetry}
        empty={totalLeads === 0} emptyIcon={Funnel} emptyMessage="No lead data available for the selected filters."
        skeleton={<FunnelSkeleton />}
      >
        <div className="space-y-1">
          {stageDefs.map((st, i) => {
            const r = reached[i];
            const prev = i > 0 ? reached[i - 1] : null;
            const conversion = prev && prev > 0 ? (r / prev) * 100 : null;
            const dropped = prev !== null ? prev - r : 0;
            const width = reached[0] > 0 ? Math.max((r / reached[0]) * 100, 6) : 6;
            return (
              <div key={st.value}>
                {/* {i > 0 && (
                  <div className="flex items-center gap-1.5 py-1 pl-2 text-[11px] text-subtle-fg">
                    <ArrowDown size={12} />
                    <span>{conversion !== null ? `${formatPercent(conversion, 0)} stage conversion` : 'No prior-stage leads'}</span>
                    {dropped > 0 && <span>· {dropped} dropped</span>}
                  </div>
                )} */}
                <Link to={`/leads?status=${st.value}`} className="block rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-2">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: st.color }} />
                      <span className="truncate text-[12.5px] font-semibold text-base-fg">{st.label}</span>
                    </div>
                    <div className="flex shrink-0 items-baseline gap-1.5">
                      <span className="text-[14px] font-extrabold tabular text-base-fg">{r}</span>
                      <span className="text-[11px] tabular text-subtle-fg">{formatPercent(totalLeads ? (r / totalLeads) * 100 : 0, 0)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${width}%`, backgroundColor: st.color }} />
                  </div>
                  <p className="mt-1 text-[11px] text-subtle-fg">
                    {st.count} currently at this stage · {formatCurrency(st.amount)}
                  </p>
                </Link>
              </div>
            );
          })}

          <div className="mt-3 border-t border-app pt-3">
            <Link to="/leads?status=lost" className="flex items-center justify-between rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-2">
              <div className="flex min-w-0 items-center gap-2">
                <CircleX size={14} style={{ color: lost?.color ?? '#ef4444' }} />
                <span className="text-[12.5px] font-semibold text-base-fg">Lost</span>
                <span className="truncate text-[11px] text-subtle-fg">{formatPercent(totalLeads ? ((lost?.count ?? 0) / totalLeads) * 100 : 0, 0)} of all leads</span>
              </div>
              <div className="flex shrink-0 items-baseline gap-1.5">
                <span className="text-[14px] font-extrabold tabular text-base-fg">{lost?.count ?? 0}</span>
                <span className="text-[11px] tabular text-subtle-fg">{formatCurrency(lost?.value ?? 0)}</span>
              </div>
            </Link>
          </div>
        </div>
      </SectionBody>
    </ChartCard>
  );
}

