import { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import {
  Activity, Eye, Globe, Laptop, Smartphone, Tablet, Clock, MapPin, Copy, Check, ExternalLink, Code2, RefreshCw, AlertCircle
} from 'lucide-react';
import type { ProjectUrl, LeadUrlAnalytics, MasterItem } from '../../types';
import { formatDate } from '../../lib/utils';
import { makeLookup } from '../../hooks/useMasters';
import { useAuth } from '../../contexts/AuthContext';

export default function TrackingDetailDrawer({ open, onClose, leadId, leadName, leadNo, url, masters }: {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  leadNo: string | null;
  url: ProjectUrl | null;
  masters: MasterItem[] | undefined;
}) {
  const [data, setData] = useState<LeadUrlAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'pages' | 'history' | 'setup'>('pages');
  const [searchTerm, setSearchTerm] = useState('');

  const lookup = makeLookup(masters);
  const { session } = useAuth();

  const fetchAnalytics = async () => {
    if (!url || !url.tracking_token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lead-url-tracking?leadId=${leadId}&token=${url.tracking_token}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to load tracking details');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading tracking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && url) {
      fetchAnalytics();
    } else {
      setData(null);
    }

  }, [open, url?.tracking_token]);

  if (!url) return null;

  const trackingLink = `${window.location.origin}/t/${url.tracking_token || ''}`;

  const copyLink = () => {
    navigator.clipboard.writeText(trackingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '< 5s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getDeviceIcon = (device?: string | null) => {
    if (device === 'Mobile') return <Smartphone className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
    if (device === 'Tablet') return <Tablet className="h-3.5 w-3.5 text-purple-500 shrink-0" />;
    return <Laptop className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
  };

  const filteredVisits = (data?.visits || []).filter((v) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (v.path || '').toLowerCase().includes(term) ||
      (v.city || '').toLowerCase().includes(term) ||
      (v.country || '').toLowerCase().includes(term) ||
      (v.ip_address || '').toLowerCase().includes(term) ||
      (v.device_type || '').toLowerCase().includes(term) ||
      (v.browser || '').toLowerCase().includes(term)
    );
  });

  const totalVisits = data?.summary?.total_visits ?? url.total_visits ?? 0;
  const engagementStatus = totalVisits === 0 ? 'Not Opened' : totalVisits >= 3 ? 'Highly Engaged' : 'Opened';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-[85%]"
      title={`Tracking Analytics · ${lookup.label('url_type', url.type)}`}
      subtitle={`${leadNo || 'Lead'} · ${leadName}`}
      footer={
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={fetchAnalytics} loading={loading}>
            Refresh Data
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* URL Header & Action Banner */}
        <div className="rounded-2xl border border-app bg-surface-2 p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[14px] font-bold text-base-fg">{lookup.label('url_type', url.type)}</span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${
                  engagementStatus === 'Highly Engaged' ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300' :
                  engagementStatus === 'Opened' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300' :
                  'bg-surface-3 text-muted-fg border border-app'
                }`}>
                  {engagementStatus === 'Highly Engaged' ? '🔥 Highly Engaged' : engagementStatus === 'Opened' ? '🟢 Opened' : '⚪ Not Opened'}
                </span>
              </div>
              <a href={url.url} target="_blank" rel="noreferrer" className="text-[13px] text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-medium break-all">
                {url.url} <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>

            <Button size="sm" icon={copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />} onClick={copyLink}>
              {copied ? 'Copied Link!' : 'Copy Tracked URL'}
            </Button>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-surface-1 border border-app p-3">
            <Globe className="h-4 w-4 text-brand-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Tracked Link</p>
              <p className="text-[12.5px] font-mono font-semibold text-base-fg truncate">{trackingLink}</p>
            </div>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-app bg-surface-1 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">First Opened</p>
            <p className="text-[13.5px] font-bold text-base-fg mt-1">
              {formatDate(data?.summary?.first_opened_at || url.first_opened_at) || 'Not yet opened'}
            </p>
          </div>

          <div className="rounded-xl border border-app bg-surface-1 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Last Opened</p>
            <p className="text-[13.5px] font-bold text-base-fg mt-1">
              {formatDate(data?.summary?.last_opened_at || url.last_opened_at) || '—'}
            </p>
          </div>

          <div className="rounded-xl border border-app bg-surface-1 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Total Visits</p>
            <p className="text-[20px] font-extrabold text-brand-600 dark:text-brand-400 mt-0.5">
              {data?.summary?.total_visits ?? url.total_visits ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-app bg-surface-1 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Unique Pages</p>
            <p className="text-[20px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {data?.summary?.unique_pages ?? url.unique_pages ?? 0}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300 p-3.5 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-[12.5px] font-medium">{error}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[color:var(--border)] gap-6">
          <button
            onClick={() => setActiveTab('pages')}
            className={`pb-2.5 text-[13px] font-bold border-b-2 transition-colors ${
              activeTab === 'pages' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-muted-fg hover:text-base-fg'
            }`}
          >
            Pages Viewed ({(data?.pages || []).length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 text-[13px] font-bold border-b-2 transition-colors ${
              activeTab === 'history' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-muted-fg hover:text-base-fg'
            }`}
          >
            Visit History ({(data?.visits || []).length})
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`pb-2.5 text-[13px] font-bold border-b-2 transition-colors ${
              activeTab === 'setup' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-muted-fg hover:text-base-fg'
            }`}
          >
            SDK Integration
          </button>
        </div>

        {/* Tab 1: Pages Viewed */}
        {activeTab === 'pages' && (
          <div>
            {loading ? (
              <div className="py-8 text-center text-[13px] text-muted-fg">Loading pages data...</div>
            ) : (data?.pages || []).length === 0 ? (
              <div className="py-10 text-center rounded-xl border border-dashed border-strong p-6">
                <Eye className="h-8 w-8 text-subtle-fg mx-auto mb-2 opacity-50" />
                <p className="text-[13px] font-medium text-muted-fg">No page view activity recorded yet.</p>
                <p className="text-[12px] text-subtle-fg mt-1">Send the tracked link to your lead to start recording visitor engagement.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-app overflow-hidden">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="bg-surface-2 text-subtle-fg font-bold uppercase tracking-wider text-[10.5px]">
                    <tr>
                      <th className="px-4 py-3">Path</th>
                      <th className="px-4 py-3 text-center">Views</th>
                      <th className="px-4 py-3">Last Viewed</th>
                      <th className="px-4 py-3">Avg Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border)]">
                    {data?.pages.map((p, idx) => (
                      <tr key={idx} className="hover:bg-surface-2/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-base-fg font-mono">{p.path}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded font-extrabold text-[12px] bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                            {p.views}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-fg">{formatDate(p.last_viewed)}</td>
                        <td className="px-4 py-3 font-medium text-base-fg">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-subtle-fg" /> {formatDuration(p.avg_duration_seconds)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Detailed Visit History */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by path, city, country, device, IP..."
                className="w-full sm:w-80 h-9 px-3 text-[12.5px] rounded-lg border border-strong bg-surface-1 text-base-fg placeholder:text-subtle-fg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-[12px] font-medium text-subtle-fg shrink-0">{filteredVisits.length} visits found</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-[13px] text-muted-fg">Loading visit history...</div>
            ) : filteredVisits.length === 0 ? (
              <div className="py-10 text-center rounded-xl border border-dashed border-strong p-6">
                <Activity className="h-8 w-8 text-subtle-fg mx-auto mb-2 opacity-50" />
                <p className="text-[13px] font-medium text-muted-fg">No visit records matching your query.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-app overflow-x-auto">
                <table className="w-full text-left text-[12px] whitespace-nowrap">
                  <thead className="bg-surface-2 text-subtle-fg font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3.5 py-2.5">Date &amp; Time</th>
                      <th className="px-3.5 py-2.5">Path</th>
                      <th className="px-3.5 py-2.5">Location</th>
                      <th className="px-3.5 py-2.5">Device &amp; Browser</th>
                      <th className="px-3.5 py-2.5">IP Address</th>
                      <th className="px-3.5 py-2.5">Referrer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border)]">
                    {filteredVisits.map((v) => (
                      <tr key={v.id} className="hover:bg-surface-2/50 transition-colors">
                        <td className="px-3.5 py-2.5 font-medium text-base-fg">{formatDate(v.visited_at)}</td>
                        <td className="px-3.5 py-2.5 font-mono font-semibold text-brand-600 dark:text-brand-400">{v.path || '/'}</td>
                        <td className="px-3.5 py-2.5 text-muted-fg">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                            {v.city ? `${v.city}, ` : ''}{v.country || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-muted-fg">
                          <span className="inline-flex items-center gap-1.5">
                            {getDeviceIcon(v.device_type)}
                            <span className="font-semibold text-base-fg">{v.device_type || 'Desktop'}</span>
                            <span>· {v.operating_system || 'OS'} / {v.browser || 'Browser'}</span>
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-subtle-fg">{v.ip_address || '—'}</td>
                        <td className="px-3.5 py-2.5 text-subtle-fg truncate max-w-[150px]">{v.referrer || 'Direct'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: SDK Integration Guide */}
        {activeTab === 'setup' && (
          <div className="space-y-4 rounded-2xl border border-app bg-surface-2 p-5">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold text-[14px]">
              <Code2 className="h-4 w-4" /> Single-Line Website Tracking SDK
            </div>
            <p className="text-[12.5px] text-muted-fg leading-relaxed">
              To capture internal SPA page views and visitor duration when leads navigate your client website, include this tracking script inside your target website's <code className="font-mono text-brand-600">&lt;head&gt;</code> or <code className="font-mono text-brand-600">&lt;body&gt;</code>:
            </p>

            <div className="relative rounded-xl bg-slate-950 p-4 font-mono text-[12px] text-emerald-400 overflow-x-auto border border-slate-800">
              {`<script src="${window.location.origin}/t/sdk.js" async></script>`}
            </div>

            <div className="space-y-2 text-[12px] text-muted-fg">
              <p className="font-bold text-base-fg">How it works:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Automatically preserves tracking token and visitor session across navigation.</li>
                <li>Monitors client-side route changes (`pushState`, `popstate`, React/Vue router).</li>
                <li>Sends page duration beacons silently without slowing down website loading.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
