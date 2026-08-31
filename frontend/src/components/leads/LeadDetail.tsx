import { useState } from 'react';
import Drawer from '../ui/Drawer';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import { Pencil, Trash2, Mail, Phone, Building2, CalendarClock, CalendarCheck, Tag, Layers, ArrowRightLeft, CheckCircle2, UserPlus, MapPin, Link2, ExternalLink, Copy, BarChart3 } from 'lucide-react';
import type { Lead, MasterItem, ProjectUrl } from '../../types';
import { makeLookup } from '../../hooks/useMasters';
import { usePermissions } from '../../contexts/PermissionContext';
import { formatCurrency, formatDate } from '../../lib/utils';
import TrackingDetailDrawer from './TrackingDetailDrawer';

export default function LeadDetail({ open, onClose, lead, masters, onEdit, onDelete, onConvert, onNextFollowUp }: {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  masters: MasterItem[] | undefined;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: () => void;
  onNextFollowUp?: () => void;
}) {
  const [selectedTrackingUrl, setSelectedTrackingUrl] = useState<ProjectUrl | null>(null);
  const lookup = makeLookup(masters);
  const { can } = usePermissions();
  if (!lead) return null;

  const statusMasters = (masters || []).filter((m) => m.category === 'lead_status' && m.value !== 'lost').sort((a, b) => a.sort_order - b.sort_order);
  const currentIdx = statusMasters.findIndex((m) => m.value === lead.status);
  const isConverted = !!lead.converted_project_id;
  const urls = Array.isArray(lead.urls) ? lead.urls : [];

  const rows = [
    { icon: Building2, label: 'Company', value: lead.company || '—' },
    { icon: MapPin, label: 'Address', value: lead.address || '—' },
    { icon: Phone, label: 'Primary phone', value: lead.primary_phone || '—' },
    { icon: Phone, label: 'Secondary tel.', value: lead.secondary_phone || '—' },
    { icon: Phone, label: 'Alternate phone', value: lead.tertiary_phone || '—' },
    { icon: Mail, label: 'Primary email', value: lead.primary_email || '—' },
    { icon: Mail, label: 'Secondary email', value: lead.secondary_email || '—' },
    { icon: UserPlus, label: 'Source person', value: lead.source_person || '—' },
    { icon: Tag, label: 'Source', value: lookup.label('lead_source', lead.source) },
    { icon: Layers, label: 'Project type', value: lookup.label('project_type', lead.project_type) },
    { icon: Building2, label: 'Industry', value: lookup.label('industry', lead.industry) },
    { icon: CalendarCheck, label: 'Received date', value: formatDate(lead.lead_received_date) },
    { icon: CalendarClock, label: 'Next follow-up', value: formatDate(lead.next_follow_up) },
  ];

  return (
    <Drawer
      open={open} onClose={onClose}
      width="max-w-[85%]"
      title={lead.customer_name}
      subtitle={`${lead.lead_no || 'Lead'} · ${lead.company || '—'}`}
      footer={
        <div className="flex items-center justify-between gap-2">
          {can('leads.delete')
            ? <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={onDelete}>Delete</Button>
            : <span />}
          <div className="flex items-center gap-2">
            {onNextFollowUp && <Button variant="secondary" size="sm" icon={<CalendarClock className="h-4 w-4" />} onClick={onNextFollowUp}>Next follow-up</Button>}
            {can('leads.edit') && <Button variant="secondary" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={onEdit}>Edit</Button>}
            {can('leads.convert') && !isConverted && lead.status !== 'lost' && (
              <Button size="sm" icon={<ArrowRightLeft className="h-4 w-4" />} onClick={onConvert}>Convert to project</Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {isConverted && (
          <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-4 py-3">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <p className="text-[12.5px] font-medium text-emerald-700 dark:text-emerald-300">Converted to a project on {formatDate(lead.converted_at)}.</p>
          </div>
        )}

        <div className="rounded-2xl border border-app bg-surface-2 p-5">
          <div className="flex items-center gap-4">
            <Avatar name={lead.customer_name} size={52} />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-bold text-base-fg truncate">{lead.customer_name}</p>
              <p className="text-[13px] text-muted-fg truncate">{lead.primary_email || lead.primary_phone || '—'}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Badge label={lookup.label('lead_status', lead.status)} color={lookup.color('lead_status', lead.status)} dot />
            <Badge label={`${lookup.label('priority', lead.priority)} priority`} color={lookup.color('priority', lead.priority)} />
            {can('leads.view_budget') && <span className="ml-auto text-[15px] font-extrabold text-base-fg tabular">{formatCurrency(lead.budget)}</span>}
          </div>
        </div>

        <div>
          <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg mb-3">Pipeline stage</p>
          <div className="flex items-center gap-1">
            {statusMasters.map((m, i) => {
              const active = currentIdx >= 0 && i <= currentIdx && lead.status !== 'lost';
              return (
                <div key={m.id} className="flex-1 min-w-0">
                  <div className="h-1.5 rounded-full transition-colors" style={{ backgroundColor: active ? (m.color ?? '#3366ff') : 'var(--border-strong)' }} />
                  <p className="text-[9.5px] font-semibold text-center mt-1.5 truncate" style={{ color: active ? (m.color ?? '#3366ff') : 'var(--text-subtle)' }}>{m.label}</p>
                </div>
              );
            })}
          </div>
          {lead.status === 'lost' && <p className="text-[12px] font-semibold text-red-500 mt-2">This lead was marked as Lost.</p>}
        </div>

        {urls.length > 0 && (
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg mb-3">Lead URLs</p>
            <div className="space-y-3">
              {urls.map((u, i) => {
                const isTracked = Boolean(u.tracking_enabled && u.tracking_token);
                const visits = u.total_visits || 0;
                const engagementStatus = visits === 0 ? 'Not Opened' : visits >= 3 ? 'Highly Engaged' : 'Opened';
                const trackingLink = `${window.location.origin}/t/${u.tracking_token || ''}`;

                return (
                  <div key={i} className="rounded-xl border border-app bg-surface-1 p-3.5 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${lookup.color('url_type', u.type)}18` }}>
                        <Link2 className="h-4 w-4" style={{ color: lookup.color('url_type', u.type) }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <p className="text-[13.5px] font-bold text-base-fg">{lookup.label('url_type', u.type)}</p>
                          {isTracked ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold ${
                              engagementStatus === 'Highly Engaged' ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300' :
                              engagementStatus === 'Opened' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300' :
                              'bg-surface-3 text-muted-fg border border-app'
                            }`}>
                              {engagementStatus === 'Highly Engaged' ? '🔥 Highly Engaged' : engagementStatus === 'Opened' ? '🟢 Opened' : '⚪ Not Opened'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10.5px] font-medium bg-surface-3 text-subtle-fg">
                              Tracking OFF
                            </span>
                          )}
                        </div>
                        <a href={u.url} target="_blank" rel="noreferrer" className="text-[12px] text-muted-fg hover:text-brand-600 truncate flex items-center gap-1">
                          {u.url} <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                    </div>

                    {isTracked && (
                      <div className="pt-2 border-t border-[color:var(--border)] space-y-2.5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11.5px]">
                          <div>
                            <span className="text-subtle-fg block text-[10px] uppercase font-bold">First Opened</span>
                            <span className="font-semibold text-base-fg">{formatDate(u.first_opened_at) || 'Not yet'}</span>
                          </div>
                          <div>
                            <span className="text-subtle-fg block text-[10px] uppercase font-bold">Last Opened</span>
                            <span className="font-semibold text-base-fg">{formatDate(u.last_opened_at) || '—'}</span>
                          </div>
                          <div>
                            <span className="text-subtle-fg block text-[10px] uppercase font-bold">Total Visits</span>
                            <span className="font-bold text-brand-600 dark:text-brand-400">{u.total_visits || 0}</span>
                          </div>
                          <div>
                            <span className="text-subtle-fg block text-[10px] uppercase font-bold">Unique Pages</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{u.unique_pages || 0}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(trackingLink);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold bg-surface-2 border border-app hover:bg-surface-3 text-base-fg transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5 text-subtle-fg" /> Copy Tracked Link
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTrackingUrl(u)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold bg-brand-50 text-brand-600 border border-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/20 hover:bg-brand-100 transition-colors"
                          >
                            <BarChart3 className="h-3.5 w-3.5" /> View Tracking
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-app divide-y divide-[color:var(--border)]">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 px-4 py-3">
              <r.icon className="h-4 w-4 text-subtle-fg shrink-0" />
              <span className="text-[12.5px] font-medium text-muted-fg w-28 shrink-0">{r.label}</span>
              <span className="text-[13px] font-semibold text-base-fg truncate">{r.value}</span>
            </div>
          ))}
        </div>

        {(lead.sales_manager || lead.assigned_employee) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lead.sales_manager && (
              <div>
                <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg mb-2">Lead coordinator</p>
                <div className="flex items-center gap-3 rounded-xl border border-app p-3">
                  <Avatar name={lead.sales_manager.employee_name} size={36} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-base-fg truncate">{lead.sales_manager.employee_name}</p>
                    <p className="text-[12px] text-muted-fg truncate">{lead.sales_manager.role}</p>
                  </div>
                </div>
              </div>
            )}
            {lead.assigned_employee && (
              <div>
                <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg mb-2">Assigned Employee</p>
                <div className="flex items-center gap-3 rounded-xl border border-app p-3">
                  <Avatar name={lead.assigned_employee.employee_name} size={36} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-base-fg truncate">{lead.assigned_employee.employee_name}</p>
                    <p className="text-[12px] text-muted-fg truncate">{lead.assigned_employee.role}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {lead.remarks && (
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg mb-2">Remarks</p>
            <div className="space-y-2.5">
              {lead.remarks.split(/\n\n(?:---\n\n)?/).filter(r => r.trim() && r.trim() !== '---').map((r, i) => {
                const text = r.trim();
                const match = text.match(/^\[(\d{4}-\d{2}-\d{2})\]\s*(.*)$/s);
                const dateLabel = match ? formatDate(match[1]) : (i === 0 ? formatDate(lead.created_at) : 'Original Note');
                const content = match ? match[2] : text;
                return (
                  <div key={i} className="rounded-xl border border-app bg-surface-2 p-3.5 shadow-sm">
                    {dateLabel && <div className="mb-1.5"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-600 border border-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/20">{dateLabel}</span></div>}
                    <div className="text-[13px] text-muted-fg leading-relaxed whitespace-pre-wrap break-words">{content}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-[11.5px] text-subtle-fg">Created {formatDate(lead.created_at)} · Updated {formatDate(lead.updated_at)}</p>
      </div>

      <TrackingDetailDrawer
        open={Boolean(selectedTrackingUrl)}
        onClose={() => setSelectedTrackingUrl(null)}
        leadId={lead.id}
        leadName={lead.customer_name}
        leadNo={lead.lead_no}
        url={selectedTrackingUrl}
        masters={masters}
      />
    </Drawer>
  );
}
