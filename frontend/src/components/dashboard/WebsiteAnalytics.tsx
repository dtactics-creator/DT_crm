'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { ChartCard } from '../../components/charts/ChartKit';
import Badge from '../../components/ui/Badge';
import { SectionBody, TileSkeleton } from './DashboardSkeleton';
import type { LabelCount, WebsiteSummary } from '../../types/dashboard';
import { formatDuration, formatNumber, timeAgo } from '../../lib/utils';

interface Props { data: WebsiteSummary | null; loading: boolean; error?: string; onRetry: () => void; className?: string }

/** Lead URL tracking (dt_lead_url_visits / dt_lead_url_page_views). No scoring — only observed counts and durations. */
export default function WebsiteAnalytics({ data, loading, error, onRetry, className }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const pagesPerSession = data && data.uniqueSessions > 0 ? (data.pageViews / data.uniqueSessions).toFixed(1) : '0';

  const renderLeadsTable = (leads: any[]) => (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[640px] text-[12.5px]">
        <thead>
          <tr className="text-left text-[10.5px] font-bold uppercase tracking-wider text-subtle-fg">
            <th className="pb-2 pr-3 font-bold">Lead</th>
            <th className="pb-2 pr-3 font-bold">Status</th>
            <th className="pb-2 pr-3 text-right font-bold">Sessions</th>
            <th className="pb-2 pr-3 text-right font-bold">Visits</th>
            <th className="pb-2 pr-3 text-right font-bold">Page views</th>
            <th className="pb-2 pr-3 text-right font-bold">Time on site</th>
            <th className="pb-2 text-right font-bold">Last visit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {leads.map((l) => (
            <tr key={l.id} className="hover:bg-surface-2">
              <td className="py-2 pr-3">
                <Link to={`/leads?id=${l.id}`} onClick={() => setModalOpen(false)} className="block">
                  <p className="font-semibold text-base-fg">{l.customerName}{l.sessions >= 2 && <span className="ml-2 rounded-full bg-emerald-500/12 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">Returning</span>}</p>
                  <p className="text-[11px] text-subtle-fg">{l.leadNo || '—'} · {l.company || '—'}</p>
                </Link>
              </td>
              <td className="py-2 pr-3"><Badge label={l.statusLabel} color={l.statusColor} dot /></td>
              <td className="py-2 pr-3 text-right font-bold tabular text-base-fg">{l.sessions}</td>
              <td className="py-2 pr-3 text-right tabular text-muted-fg">{l.visits}</td>
              <td className="py-2 pr-3 text-right tabular text-muted-fg">{l.pageViews}</td>
              <td className="py-2 pr-3 text-right tabular text-muted-fg">{formatDuration(l.totalDuration)}</td>
              <td className="py-2 text-right tabular text-muted-fg">{timeAgo(l.lastVisit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <ChartCard title="Website & lead engagement" subtitle="Tracked lead-link visits, sessions and page views" className={className}>
        <SectionBody
          loading={loading} error={error} onRetry={onRetry}
          empty={!data || data.totalVisits === 0} emptyIcon={Eye}
          emptyTitle="No website activity yet"
          emptyMessage="Visits appear here once tracked lead URLs are opened. Devices, browsers, locations and per-lead engagement will populate automatically."
          skeleton={<TileSkeleton count={8} className="sm:grid-cols-4" />}
        >
          {data && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
                <Tile label="Total visits" value={formatNumber(data.totalVisits)} />
                <Tile label="Unique sessions" value={formatNumber(data.uniqueSessions)} />
                <Tile label="Page views" value={formatNumber(data.pageViews)} />
                <Tile label="Avg. session" value={formatDuration(data.avgDuration)} />
                <Tile label="Leads engaged" value={formatNumber(data.leadsEngaged)} />
                <Tile label="Returning leads" value={formatNumber(data.returningLeads)} hint="2+ sessions" />
                <Tile label="Visits · 7 days" value={formatNumber(data.visits7d)} />
                <Tile label="Pages / session" value={pagesPerSession} />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                <Breakdown title="Most visited pages" items={data.topPages} color="#3366ff" showDuration />
                <Breakdown title="Top referrers" items={data.referrers} color="#8b5cf6" />
                <Breakdown title="Devices" items={data.devices} color="#10b981" />
                <Breakdown title="Browsers" items={data.browsers} color="#0ea5e9" />
                <Breakdown title="Operating systems" items={data.os} color="#f59e0b" />
                <Breakdown title="Countries" items={data.countries} color="#14b8a6" />
              </div>

              {data.recentLeads.length > 0 && (
                <div className="mt-5 border-t border-app pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Recently active leads</p>
                    {data.recentLeads.length > 5 && (
                      <button onClick={() => setModalOpen(true)} className="text-[11.5px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">View all</button>
                    )}
                  </div>
                  {renderLeadsTable(data.recentLeads.slice(0, 5))}
                </div>
              )}
            </>
          )}
        </SectionBody>
      </ChartCard>
      {data && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Recently active leads" size="max-w-4xl">
          {renderLeadsTable(data.recentLeads)}
        </Modal>
      )}
    </>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="truncate text-[18px] font-extrabold leading-none tabular text-base-fg">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-muted-fg">{label}{hint && <span className="font-normal text-subtle-fg"> · {hint}</span>}</p>
    </div>
  );
}

function Breakdown({ title, items, color, showDuration }: { title: string; items: LabelCount[]; color: string; showDuration?: boolean }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-subtle-fg">{title}</p>
      {items.length === 0 ? (
        <p className="text-[12px] text-muted-fg">No data recorded.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((i) => (
            <li key={i.label}>
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="truncate text-base-fg" title={i.label}>{i.label}</span>
                <span className="shrink-0 tabular text-muted-fg">
                  {formatNumber(i.count)}{showDuration && i.avgDuration !== undefined ? <span className="text-subtle-fg"> · {formatDuration(i.avgDuration)}</span> : null}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${(i.count / max) * 100}%`, backgroundColor: color }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

