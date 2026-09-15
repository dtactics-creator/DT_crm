'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { ChartCard } from '../../components/charts/ChartKit';
import Avatar from '../../components/ui/Avatar';
import { SectionBody, TableSkeleton } from './DashboardSkeleton';
import type { EmployeeRow } from '../../types/dashboard';
import { formatCurrency, formatPercent } from '../../lib/utils';

interface Props { rows: EmployeeRow[]; unassigned: number; loading: boolean; error?: string; onRetry: () => void; className?: string }

/**
 * Per-employee results. "Assigned" metrics use dt_leads3.assigned_employee_id (lead owner);
 * "Managed" counts leads where the employee is the sales_manager_id.
 */
export default function SalesPerformance({ rows, unassigned, loading, error, onRetry, className }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const visibleRows = rows.slice(0, 5);

  const renderTable = (data: EmployeeRow[]) => (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[620px] text-[12.5px]">
        <thead>
          <tr className="text-left text-[10.5px] font-bold uppercase tracking-wider text-subtle-fg">
            <th className="pb-2 pr-3 font-bold">Employee</th>
            <th className="pb-2 pr-3 text-right font-bold">Assigned</th>
            <th className="pb-2 pr-3 text-right font-bold">Managed</th>
            <th className="pb-2 pr-3 text-right font-bold">Won</th>
            <th className="pb-2 pr-3 text-right font-bold">Lost</th>
            <th className="pb-2 pr-3 text-right font-bold">Conv.</th>
            <th className="pb-2 pr-3 text-right font-bold">Pipeline</th>
            <th className="pb-2 text-right font-bold">Won value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.map((e) => (
            <tr key={e.id} className="transition-colors hover:bg-surface-2">
              <td className="py-2.5 pr-3">
                <Link to={`/leads?employee=${e.id}`} onClick={() => setModalOpen(false)} className="flex items-center gap-2.5">
                  <Avatar name={e.name} size={30} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-base-fg">{e.name}</p>
                    <p className="truncate text-[11px] text-subtle-fg">{e.role}</p>
                  </div>
                </Link>
              </td>
              <td className="py-2.5 pr-3 text-right font-bold tabular text-base-fg">{e.assignedLeads}</td>
              <td className="py-2.5 pr-3 text-right tabular text-muted-fg">{e.managedLeads}</td>
              <td className="py-2.5 pr-3 text-right font-bold tabular text-emerald-500">{e.wonLeads}</td>
              <td className="py-2.5 pr-3 text-right font-bold tabular text-red-500">{e.lostLeads}</td>
              <td className="py-2.5 pr-3 text-right font-bold tabular text-base-fg">{e.assignedLeads ? formatPercent(e.conversionRate, 0) : '—'}</td>
              <td className="py-2.5 pr-3 text-right font-bold tabular text-base-fg">{formatCurrency(e.pipelineValue)}</td>
              <td className="py-2.5 text-right font-bold tabular text-emerald-500">{formatCurrency(e.wonValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <ChartCard title="Sales employee performance" subtitle="Assigned leads (owner) · managed leads (sales manager)" className={className} action={rows.length > 5 ? <button onClick={() => setModalOpen(true)} className="text-[12.5px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">View all</button> : undefined}>
        <SectionBody
          loading={loading} error={error} onRetry={onRetry}
          empty={rows.length === 0} emptyIcon={Users} emptyMessage="No leads are assigned to employees for the selected filters."
          skeleton={<TableSkeleton rows={5} cols={6} />}
        >
          {renderTable(visibleRows)}
          {unassigned > 0 && (
            <p className="mt-3 text-[11.5px] text-muted-fg">
              <Link to="/leads?assigned=none" className="font-semibold text-amber-500 hover:underline">{unassigned} open lead{unassigned === 1 ? '' : 's'}</Link> currently have no assigned employee.
            </p>
          )}
        </SectionBody>
      </ChartCard>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Sales employee performance" size="max-w-4xl">
        {renderTable(rows)}
      </Modal>
    </>
  );
}

