'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChartColumn } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { ChartCard } from '../../components/charts/ChartKit';
import { SectionBody, TableSkeleton } from './DashboardSkeleton';
import type { SourceRow } from '../../types/dashboard';
import { formatCurrency, formatPercent } from '../../lib/utils';

interface Props { rows: SourceRow[]; loading: boolean; error?: string; onRetry: () => void; className?: string }

export default function LeadSourcePerformance({ rows, loading, error, onRetry, className }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const visibleRows = rows.slice(0, 5);

  const maxLeads = Math.max(1, ...rows.map((r) => r.totalLeads));
  const totals = rows.reduce(
    (acc, r) => ({ leads: acc.leads + r.totalLeads, won: acc.won + r.wonLeads, pipeline: acc.pipeline + r.pipelineValue, wonValue: acc.wonValue + r.wonValue }),
    { leads: 0, won: 0, pipeline: 0, wonValue: 0 },
  );

  const renderTable = (data: SourceRow[]) => (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[560px] text-[12.5px]">
        <thead>
          <tr className="text-left text-[10.5px] font-bold uppercase tracking-wider text-subtle-fg">
            <th className="pb-2 pr-3 font-bold">Source</th>
            <th className="pb-2 pr-3 font-bold">Leads</th>
            <th className="pb-2 pr-3 text-right font-bold">Won</th>
            <th className="pb-2 pr-3 text-right font-bold">Conv.</th>
            <th className="pb-2 pr-3 text-right font-bold">Pipeline</th>
            <th className="pb-2 text-right font-bold">Won value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.map((s) => (
            <tr key={s.source} className="transition-colors hover:bg-surface-2">
              <td className="py-2.5 pr-3">
                <Link to={`/leads?source=${s.source}`} onClick={() => setModalOpen(false)} className="flex items-center gap-2 hover:underline">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="font-semibold text-base-fg">{s.label}</span>
                </Link>
              </td>
              <td className="py-2.5 pr-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${(s.totalLeads / maxLeads) * 100}%`, backgroundColor: s.color }} />
                  </div>
                  <span className="w-6 font-bold tabular text-base-fg">{s.totalLeads}</span>
                </div>
              </td>
              <td className="py-2.5 pr-3 text-right font-bold tabular text-emerald-500">{s.wonLeads}</td>
              <td className="py-2.5 pr-3 text-right font-bold tabular text-base-fg">{formatPercent(s.conversionRate, 0)}</td>
              <td className="py-2.5 pr-3 text-right font-bold tabular text-base-fg">{formatCurrency(s.pipelineValue)}</td>
              <td className="py-2.5 text-right font-bold tabular text-emerald-500">{formatCurrency(s.wonValue)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-app text-[12px] text-muted-fg">
            <td className="pt-2.5 font-semibold">Total</td>
            <td className="pt-2.5 font-bold tabular text-base-fg">{totals.leads}</td>
            <td className="pt-2.5 text-right font-bold tabular text-base-fg">{totals.won}</td>
            <td className="pt-2.5 text-right font-bold tabular text-base-fg">{formatPercent(totals.leads ? (totals.won / totals.leads) * 100 : 0, 0)}</td>
            <td className="pt-2.5 text-right font-bold tabular text-base-fg">{formatCurrency(totals.pipeline)}</td>
            <td className="pt-2.5 text-right font-bold tabular text-base-fg">{formatCurrency(totals.wonValue)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <>
      <ChartCard title="Lead source performance" subtitle="Volume, conversion and open pipeline by source" className={className} action={rows.length > 5 ? <button onClick={() => setModalOpen(true)} className="text-[12.5px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">View all</button> : undefined}>
        <SectionBody
          loading={loading} error={error} onRetry={onRetry}
          empty={rows.length === 0} emptyIcon={ChartColumn} emptyMessage="No lead source data available."
          skeleton={<TableSkeleton rows={6} cols={6} />}
        >
          {renderTable(visibleRows)}
        </SectionBody>
      </ChartCard>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Lead source performance" size="max-w-4xl">
        {renderTable(rows)}
      </Modal>
    </>
  );
}

