'use client';

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleCheck, FolderKanban, Receipt, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import { ChartCard } from '../../components/charts/ChartKit';
import Badge from '../../components/ui/Badge';
import { ListSkeleton, SectionBody } from './DashboardSkeleton';
import type { AttentionData, AttentionEntity, AttentionItem, AttentionUrgency } from '../../types/dashboard';
import { cn, daysUntil, dueLabel, formatCurrency } from '../../lib/utils';

const ENTITY_META: Record<AttentionEntity, { label: string; plural: string; icon: LucideIcon; color: string; href: (i: AttentionItem) => string }> = {
  lead: { label: 'Lead', plural: 'Leads', icon: Users, color: '#3366ff', href: (i) => `/leads?id=${i.id}` },
  quotation: { label: 'Quotation', plural: 'Quotations', icon: Receipt, color: '#8b5cf6', href: (i) => `/quotations?id=${i.id}` },
  project: { label: 'Project', plural: 'Projects', icon: FolderKanban, color: '#f59e0b', href: (i) => `/projects?id=${i.id}` },
  amc: { label: 'AMC', plural: 'AMC', icon: ShieldCheck, color: '#14b8a6', href: (i) => `/clients?tab=amc&id=${i.id}` },
};

const URGENCY_META: Record<AttentionUrgency, { label: string; color: string }> = {
  overdue: { label: 'Overdue', color: '#ef4444' },
  today: { label: 'Due today', color: '#f59e0b' },
  soon: { label: 'Due soon', color: '#0ea5e9' },
  watch: { label: 'Watch', color: '#64748b' },
};

const KIND_LABEL: Record<string, string> = {
  follow_up_overdue: 'Follow-up overdue',
  follow_up_today: 'Follow-up due today',
  follow_up_tomorrow: 'Follow-up due tomorrow',
  high_priority_no_followup: 'High priority · no follow-up scheduled',
  high_value_stale: 'Top-quartile budget · no update in 14 days',
  quotation_expired: 'Validity expired · still awaiting response',
  quotation_expiring: 'Expires within 7 days',
  quotation_awaiting: 'Awaiting response · sent 7+ days ago',
  quotation_draft_stale: 'Draft for 7+ days',
  quotation_rejected: 'Rejected in the last 30 days',
  project_delayed: 'Past expected delivery',
  project_due_soon: 'Delivery due within 14 days',
  project_followup_due: 'Project follow-up due',
  project_at_risk: 'Behind planned timeline by 15%+',
  amc_expired: 'AMC expired · renewal pending',
  amc_renewal_30: 'Renewal due within 30 days',
  amc_renewal_90: 'Renewal due within 90 days',
};

const ENTITIES: AttentionEntity[] = ['lead', 'quotation', 'project', 'amc'];
const URGENCIES: AttentionUrgency[] = ['overdue', 'today', 'soon', 'watch'];
const PAGE = 8;

interface Props { data: AttentionData | null; loading: boolean; error?: string; onRetry: () => void; className?: string }

export default function NeedsAttention({ data, loading, error, onRetry, className }: Props) {
  const [entity, setEntity] = useState<AttentionEntity | 'all'>('all');
  const [urgency, setUrgency] = useState<AttentionUrgency | 'all'>('all');
  const [expanded, setExpanded] = useState(false);

  const items = useMemo(() => data?.items ?? [], [data]);
  const filtered = items.filter((i) => (entity === 'all' || i.entity === entity) && (urgency === 'all' || i.urgency === urgency));
  const visible = expanded ? filtered : filtered.slice(0, PAGE);

  const byEntity = ENTITIES.reduce<Record<string, number>>((acc, e) => { acc[e] = items.filter((i) => i.entity === e).length; return acc; }, {});
  const byUrgency = URGENCIES.reduce<Record<string, number>>((acc, u) => { acc[u] = items.filter((i) => i.urgency === u).length; return acc; }, {});

  return (
    <ChartCard
      title="Needs attention"
      subtitle="Action center · overdue and upcoming items across leads, quotations, projects and AMC"
      className={className}
      action={data && data.total > 0 ? <Badge label={`${data.total} item${data.total === 1 ? '' : 's'}`} color={byUrgency.overdue ? '#ef4444' : '#f59e0b'} dot /> : undefined}
    >
      <SectionBody
        loading={loading} error={error} onRetry={onRetry}
        empty={items.length === 0} emptyIcon={CircleCheck} emptyTitle="All caught up" emptyMessage="No overdue follow-ups, expiring quotations, delayed projects or pending renewals."
        skeleton={<ListSkeleton rows={5} height={62} />}
      >
        {/* Urgency chips */}
        <div className="mb-3 flex flex-wrap gap-2">
          <Chip active={urgency === 'all'} onClick={() => setUrgency('all')} label="All" count={items.length} color="#3366ff" />
          {URGENCIES.filter((u) => byUrgency[u] > 0).map((u) => (
            <Chip key={u} active={urgency === u} onClick={() => setUrgency(urgency === u ? 'all' : u)} label={URGENCY_META[u].label} count={byUrgency[u]} color={URGENCY_META[u].color} />
          ))}
        </div>

        {/* Entity tabs */}
        <div className="mb-3 flex gap-1 overflow-x-auto border-b border-app">
          <Tab active={entity === 'all'} onClick={() => setEntity('all')}>All</Tab>
          {ENTITIES.map((e) => (
            <Tab key={e} active={entity === e} onClick={() => setEntity(e)} disabled={byEntity[e] === 0}>
              {ENTITY_META[e].plural} <span className="ml-1 text-subtle-fg">{byEntity[e]}</span>
            </Tab>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-muted-fg">Nothing matches this filter.</p>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((item) => {
              const meta = ENTITY_META[item.entity];
              const urg = URGENCY_META[item.urgency];
              const days = daysUntil(item.dueDate);
              const Icon = meta.icon;
              return (
                <li key={`${item.entity}-${item.id}-${item.kind}`}>
                  <Link
                    to={meta.href(item)}
                    className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-2 sm:gap-4"
                    style={{ boxShadow: `inset 3px 0 0 ${urg.color}` }}
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 14%, transparent)`, color: meta.color }}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <p className="truncate text-[13px] font-semibold text-base-fg">{item.name}</p>
                        {item.reference && <span className="text-[11px] text-subtle-fg">{item.reference}</span>}
                        {item.statusLabel && item.statusColor && <Badge label={item.statusLabel} color={item.statusColor} dot />}
                        {item.priorityLabel && item.priorityColor && item.entity === 'lead' && <Badge label={item.priorityLabel} color={item.priorityColor} />}
                      </div>
                      <p className="truncate text-[11.5px] text-muted-fg">
                        <span className="font-semibold" style={{ color: urg.color }}>{KIND_LABEL[item.kind] ?? item.kind}</span>
                        {item.subtitle ? ` · ${item.subtitle}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[12px] font-bold tabular" style={{ color: days !== null && days < 0 ? '#ef4444' : undefined }}>
                        {item.dueDate ? dueLabel(days) : item.urgency === 'watch' ? 'Review' : 'No date'}
                      </p>
                      {item.value > 0 && <p className="text-[11px] tabular text-subtle-fg">{formatCurrency(item.value)}</p>}
                    </div>
                    <ArrowRight size={14} className="hidden shrink-0 text-subtle-fg opacity-0 transition-opacity group-hover:opacity-100 sm:block" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {filtered.length > PAGE && (
          <button onClick={() => setExpanded((v) => !v)} className="mt-3 w-full rounded-xl border border-app py-2 text-[12.5px] font-semibold text-muted-fg transition-colors hover:bg-surface-2 hover:text-base-fg">
            {expanded ? 'Show fewer' : `Show all ${filtered.length} items`}
          </button>
        )}
      </SectionBody>
    </ChartCard>
  );
}

function Chip({ active, onClick, label, count, color }: { active: boolean; onClick: () => void; label: string; count: number; color: string }) {
  return (
    <button
      onClick={onClick}
      className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-semibold transition-colors', active ? 'border-transparent text-white' : 'border-app bg-surface text-muted-fg hover:text-base-fg')}
      style={active ? { backgroundColor: color } : undefined}
    >
      {!active && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />}
      {label}
      <span className={cn('tabular', active ? 'opacity-90' : 'text-subtle-fg')}>{count}</span>
    </button>
  );
}

function Tab({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-[12.5px] font-semibold transition-colors',
        active ? 'border-brand text-brand-600 dark:text-brand-300' : 'border-transparent text-muted-fg hover:text-base-fg',
        disabled && 'cursor-not-allowed opacity-40 hover:text-muted-fg',
      )}
    >
      {children}
    </button>
  );
}

