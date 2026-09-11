'use client';

import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { ChartCard } from '../../components/charts/ChartKit';
import { ListSkeleton, SectionBody, TileSkeleton } from './DashboardSkeleton';
import type { QuotationSummary } from '../../types/dashboard';
import { formatCurrency, formatPercent } from '../../lib/utils';

const STATUS_COLORS: Record<string, string> = { Draft: '#64748b', Sent: '#3366ff', Accepted: '#10b981', Rejected: '#ef4444' };

interface Props { data: QuotationSummary | null; loading: boolean; error?: string; onRetry: () => void; className?: string }

/** Values use the latest version of each quotation, so revisions never double count. */
export default function QuotationAnalytics({ data, loading, error, onRetry, className }: Props) {
  const statuses = data
    ? [{ label: 'Draft', count: data.draft }, { label: 'Sent', count: data.sent }, { label: 'Accepted', count: data.accepted }, { label: 'Rejected', count: data.rejected }]
    : [];

  return (
    <ChartCard
      title="Quotation analytics"
      subtitle="Latest version per quotation · no revision double counting"
      className={className}
      action={<Link to="/quotations" className="text-[12.5px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">View all</Link>}
    >
      <SectionBody
        loading={loading} error={error} onRetry={onRetry}
        empty={!data || data.total === 0} emptyIcon={Receipt} emptyMessage="No quotation data available."
        skeleton={<><TileSkeleton count={4} /><ListSkeleton rows={4} height={30} /></>}
      >
        {data && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Tile label="Quotations" value={String(data.total)} />
              <Tile label="Total value" value={formatCurrency(data.totalValue)} />
              <Tile label="Accepted value" value={formatCurrency(data.acceptedValue)} tone="#10b981" />
              <Tile label="Acceptance rate" value={formatPercent(data.acceptanceRate, 0)} hint="excl. drafts" />
            </div>

            <div className="mt-4">
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
                {statuses.filter((s) => s.count > 0).map((s) => (
                  <div key={s.label} style={{ width: `${(s.count / data.total) * 100}%`, backgroundColor: STATUS_COLORS[s.label] }} title={`${s.label}: ${s.count}`} />
                ))}
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {statuses.map((s) => (
                  <Link key={s.label} to={`/quotations?status=${s.label}`} className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-surface-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.label] }} />
                    <span className="flex-1 text-[12px] text-muted-fg">{s.label}</span>
                    <span className="text-[12px] font-bold tabular text-base-fg">{s.count}</span>
                  </Link>
                ))}
              </div>
            </div>

            <dl className="mt-4 space-y-2 border-t border-app pt-3 text-[12px]">
              <Row label="Value awaiting response (Sent)" value={formatCurrency(data.sentValue)} />
              <Row label="Average quotation value" value={formatCurrency(data.avgValue)} />
              <Row label="Average revisions per quotation" value={data.avgVersions.toFixed(1)} />
              <Row label="Expiring within 7 days" value={String(data.expiring7d)} tone={data.expiring7d > 0 ? '#f59e0b' : undefined} to="/quotations?expiring=7d" />
              <Row label="Expired · still awaiting response" value={String(data.expired)} tone={data.expired > 0 ? '#ef4444' : undefined} to="/quotations?expired=1" />
            </dl>
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
      <p className="mt-1 text-[11px] font-semibold text-muted-fg">{label}{hint && <span className="font-normal text-subtle-fg"> · {hint}</span>}</p>
    </div>
  );
}

function Row({ label, value, tone, to }: { label: string; value: string; tone?: string; to?: string }) {
  const content = (
    <>
      <dt className="text-muted-fg">{label}</dt>
      <dd className="font-bold tabular" style={{ color: tone ?? 'var(--text)' }}>{value}</dd>
    </>
  );
  return to
    ? <Link to={to} className="flex items-center justify-between rounded-md px-1 py-0.5 hover:bg-surface-2">{content}</Link>
    : <div className="flex items-center justify-between px-1 py-0.5">{content}</div>;
}

