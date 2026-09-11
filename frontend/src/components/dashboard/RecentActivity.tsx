'use client';

import { Link } from 'react-router-dom';
import { FolderKanban, TrendingUp, Users, Zap, type LucideIcon } from 'lucide-react';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import { SectionBody, Skeleton } from './DashboardSkeleton';
import type { ActivityItem, RecentLead, RecentProject } from '../../types/dashboard';
import { cn, formatCompact, formatCurrency, timeAgo } from '../../lib/utils';

function Panel({ title, icon: Icon, tone, href, children }: { title: string; icon: LucideIcon; tone: string; href: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-app bg-surface card-shadow">
      <div className="flex items-center justify-between border-b border-app px-5 py-4">
        <div className="flex items-center gap-2">
          <Icon size={18} style={{ color: tone }} />
          <h3 className="text-[15px] font-bold text-base-fg">{title}</h3>
        </div>
        <Link to={href} className="text-[12.5px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">View all</Link>
      </div>
      {children}
    </section>
  );
}

const rowSkeleton = (n: number, h: number) => (
  <div className="divide-y divide-line">{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="rounded-none" style={{ height: h }} />)}</div>
);

interface RecentLeadsProps { rows: RecentLead[]; loading: boolean; error?: string; onRetry: () => void }

export function RecentLeads({ rows, loading, error, onRetry }: RecentLeadsProps) {
  return (
    <Panel title="Recent leads" icon={TrendingUp} tone="#3366ff" href="/leads">
      <div className={cn(error && 'p-4')}>
        <SectionBody loading={loading} error={error} onRetry={onRetry} empty={rows.length === 0} emptyIcon={Users} emptyMessage="No leads match the current filters." emptyCompact skeleton={rowSkeleton(6, 62)}>
          <ul className="divide-y divide-line">
            {rows.map((l) => (
              <li key={l.id}>
                <Link to={`/leads?id=${l.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2">
                  <Avatar name={l.customerName} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-base-fg">{l.customerName}</p>
                    <p className="truncate text-[12px] text-muted-fg">{l.leadNo || '—'} · {l.company || '—'}</p>
                    <p className="truncate text-[11px] text-subtle-fg">{l.sourceLabel}{l.owner ? ` · ${l.owner}` : ''} · {timeAgo(l.createdAt)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge label={l.statusLabel} color={l.statusColor} dot />
                    <p className="mt-1 text-[11px] tabular text-subtle-fg">{formatCurrency(l.budget)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SectionBody>
      </div>
    </Panel>
  );
}

interface RecentProjectsProps { rows: RecentProject[]; loading: boolean; error?: string; onRetry: () => void }

export function RecentProjects({ rows, loading, error, onRetry }: RecentProjectsProps) {
  return (
    <Panel title="Recent projects" icon={FolderKanban} tone="#8b5cf6" href="/projects">
      <div className={cn(error && 'p-4')}>
        <SectionBody loading={loading} error={error} onRetry={onRetry} empty={rows.length === 0} emptyIcon={FolderKanban} emptyMessage="No projects match the current filters." emptyCompact skeleton={rowSkeleton(6, 84)}>
          <ul className="divide-y divide-line">
            {rows.map((p) => (
              <li key={p.id}>
                <Link to={`/projects?id=${p.id}`} className="block px-5 py-3 transition-colors hover:bg-surface-2">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-base-fg">{p.projectName}</p>
                      <p className="truncate text-[12px] text-muted-fg">{p.projectNo || '—'} · {p.client} · {formatCompact(p.projectCost)}</p>
                    </div>
                    <Badge label={p.statusLabel} color={p.statusColor} dot />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(p.progress, 100)}%`, backgroundColor: p.statusColor }} />
                    </div>
                    <span className="w-9 text-right text-[11px] font-semibold tabular text-muted-fg">{Math.round(p.progress)}%</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-subtle-fg">Updated {timeAgo(p.updatedAt)}{p.manager ? ` · ${p.manager}` : ''}</p>
                </Link>
              </li>
            ))}
          </ul>
        </SectionBody>
      </div>
    </Panel>
  );
}

interface ActivityFeedProps { rows: ActivityItem[]; loading: boolean; error?: string; onRetry: () => void }

/** Notifications + audit log entries. IP addresses / user agents are never shown here. */
export function ActivityFeed({ rows, loading, error, onRetry }: ActivityFeedProps) {
  return (
    <Panel title="Recent activity" icon={Zap} tone="#f59e0b" href="/audit-logs">
      <div className={cn(error && 'p-4')}>
        <SectionBody loading={loading} error={error} onRetry={onRetry} empty={rows.length === 0} emptyIcon={Zap} emptyMessage="No notifications or audit entries yet." emptyCompact skeleton={rowSkeleton(7, 56)}>
          <ul className="divide-y divide-line">
            {rows.map((a) => (
              <li key={`${a.source}-${a.id}`} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: a.color || (a.source === 'audit' ? '#8b5cf6' : '#3366ff') }} />
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-[12.5px] text-base-fg', a.isRead ? 'font-semibold' : 'font-bold')}>{a.title}</p>
                  {a.description && <p className="truncate text-[11.5px] text-muted-fg">{a.description}</p>}
                  {a.actor && <p className="truncate text-[10.5px] text-subtle-fg">by {a.actor}</p>}
                </div>
                <span className="shrink-0 text-[10.5px] text-subtle-fg">{timeAgo(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </SectionBody>
      </div>
    </Panel>
  );
}

