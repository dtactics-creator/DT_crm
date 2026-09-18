import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Calendar, Clock, AlertTriangle, Play, CheckCircle, BarChart3, TrendingUp, PieChart as PieChartIcon, LayoutTemplate, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { EmptyState } from '../dashboard/DashboardSkeleton';
import Modal from '../ui/Modal';

const COLORS = ['#3366ff', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9'];

export function DistributionChart({ title, data, emptyMsg = "No data available" }: { title: string, data?: { name: string, value: number }[], emptyMsg?: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-app bg-surface p-5 shadow-sm flex flex-col h-[320px]">
        <h3 className="mb-4 text-[14px] font-bold text-base-fg">{title}</h3>
        <div className="flex-1 flex flex-col items-center justify-center -mt-6">
          <EmptyState icon={BarChart3} message={emptyMsg} compact />
        </div>
      </div>
    );
  }

  const max = Math.max(...data.map(d => d.value));
  const visibleData = data.slice(0, 5);

  const renderList = (items: { name: string, value: number }[]) => (
    <div className="space-y-4">
      {items.map((entry, index) => {
        const percent = Math.round((entry.value / max) * 100) || 0;
        return (
          <div key={entry.name + index} className="space-y-1.5">
            <div className="flex justify-between text-[12.5px]">
              <span className="font-semibold text-base-fg truncate">{entry.name}</span>
              <span className="text-muted-fg font-medium">{entry.value}</span>
            </div>
            <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: COLORS[index % COLORS.length] }} />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="rounded-2xl border border-app bg-surface p-5 shadow-sm flex flex-col max-h-[320px]">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-[14px] font-bold text-base-fg">{title}</h3>
          <button onClick={() => setModalOpen(true)} className="text-[12.5px] font-semibold text-brand-600 hover:text-brand-700">View all</button>
        </div>
        <div className="flex-1 overflow-hidden pr-2">
          {renderList(visibleData)}
        </div>
      </div>
      
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={title} size="max-w-md">
        {renderList(data)}
      </Modal>
    </>
  );
}

export function PieChartWidget({ title, data, emptyMsg = "No data available" }: { title: string, data?: { name: string, value: number }[], emptyMsg?: string }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-app bg-surface p-5 shadow-sm flex flex-col h-[320px]">
        <h3 className="mb-4 text-[14px] font-bold text-base-fg">{title}</h3>
        <div className="flex-1 flex flex-col items-center justify-center -mt-6">
          <EmptyState icon={PieChartIcon} message={emptyMsg} compact />
        </div>
      </div>
    );
  }

  const validData = data.filter(d => d.value > 0);

  return (
    <div className="rounded-2xl border border-app bg-surface p-5 shadow-sm h-[320px] flex flex-col">
      <h3 className="mb-4 text-[14px] font-bold text-base-fg shrink-0">{title}</h3>
      {validData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-fg text-[13px]">{emptyMsg}</div>
      ) : (
        <div className="flex-1 min-h-0 relative -mt-4">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={validData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {validData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
                itemStyle={{ color: 'var(--text)', fontSize: '13px', fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function RadarWidget({ title, data, emptyMsg = "No data available" }: { title: string, data?: { name: string, value: number }[], emptyMsg?: string }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-app bg-surface p-5 shadow-sm flex flex-col h-[320px]">
        <h3 className="mb-4 text-[14px] font-bold text-base-fg">{title}</h3>
        <div className="flex-1 flex flex-col items-center justify-center -mt-6">
          <EmptyState icon={Activity} message={emptyMsg} compact />
        </div>
      </div>
    );
  }

  const validData = data.filter(d => d.value > 0);

  return (
    <div className="rounded-2xl border border-app bg-surface p-5 shadow-sm h-[320px] flex flex-col">
      <h3 className="mb-4 text-[14px] font-bold text-base-fg shrink-0">{title}</h3>
      {validData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center -mt-6"><EmptyState icon={Activity} message={emptyMsg} compact /></div>
      ) : (
        <div className="flex-1 min-h-[200px] mt-2 relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={validData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--text)', fontSize: 12, fontWeight: 500 }} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
              <Radar name="Campaigns" dataKey="value" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.5} />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
                itemStyle={{ color: 'var(--text)', fontSize: '13px', fontWeight: 'bold' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function RadialBarWidget({ title, data, emptyMsg = "No data available" }: { title: string, data?: { name: string, value: number }[], emptyMsg?: string }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-app bg-surface p-5 shadow-sm flex flex-col h-[320px]">
        <h3 className="mb-4 text-[14px] font-bold text-base-fg">{title}</h3>
        <div className="flex-1 flex flex-col items-center justify-center -mt-6">
          <EmptyState icon={PieChartIcon} message={emptyMsg} compact />
        </div>
      </div>
    );
  }

  const validData = data.filter(d => d.value > 0).map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length] }));

  return (
    <div className="rounded-2xl border border-app bg-surface p-5 shadow-sm h-[320px] flex flex-col">
      <h3 className="mb-4 text-[14px] font-bold text-base-fg shrink-0">{title}</h3>
      {validData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center -mt-6"><EmptyState icon={PieChartIcon} message={emptyMsg} compact /></div>
      ) : (
        <div className="flex-1 min-h-[200px] mt-2 relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" barSize={12} data={validData}>
              <RadialBar background={{ fill: 'var(--surface-2)' }} dataKey="value" cornerRadius={10} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} layout="vertical" verticalAlign="middle" align="right" />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
                itemStyle={{ color: 'var(--text)', fontSize: '13px', fontWeight: 'bold' }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function TrendChart({ title, data }: { title: string, data?: { date: string, count: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-app bg-surface p-5 shadow-sm flex flex-col h-[320px]">
        <h3 className="mb-4 text-[14px] font-bold text-base-fg">{title}</h3>
        <div className="flex-1 flex flex-col items-center justify-center -mt-6">
          <EmptyState icon={TrendingUp} message="No trend data" compact />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-app bg-surface p-5 shadow-sm h-[320px] flex flex-col">
      <h3 className="mb-4 text-[14px] font-bold text-base-fg">{title}</h3>
      <div className="flex-1 min-h-[220px] -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3366ff" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3366ff" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} minTickGap={20} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
            <RechartsTooltip 
               contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
               itemStyle={{ color: 'var(--text)', fontSize: '13px', fontWeight: 'bold' }}
            />
            <Area type="monotone" dataKey="count" name="Campaigns" stroke="#3366ff" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TimelineWidget({ title, events }: { title: string, events?: { id: string, title: string, start: string | null, end: string | null, status: string }[] }) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!events || events.length === 0) {
    return (
      <div className="rounded-2xl border border-app bg-surface p-5 shadow-sm flex flex-col">
         <h3 className="mb-4 text-[14px] font-bold text-base-fg">{title}</h3>
         <div className="flex-1 flex flex-col items-center justify-center py-6">
           <EmptyState icon={Activity} message="No timeline events" compact />
         </div>
      </div>
    );
  }

  const visibleEvents = events.slice(0, 5);

  const renderList = (items: typeof events) => (
    <div className="relative border-l border-surface-2 ml-3 space-y-6 pt-2 pb-4">
      {items.map((e, i) => {
        let sDate = e.start ? new Date(e.start).toLocaleDateString() : 'No Start';
        let eDate = e.end ? new Date(e.end).toLocaleDateString() : 'No End';
        const isActive = e.status === 'active';
        return (
          <div key={e.id + i} className="relative pl-6">
            <span className={cn("absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-surface", isActive ? "bg-brand" : "bg-surface-3")} />
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-semibold text-base-fg">{e.title}</span>
              <div className="flex items-center gap-3 text-[11px] text-subtle-fg">
                <span className="flex items-center gap-1"><Calendar size={12} /> {sDate} - {eDate}</span>
                <span className="capitalize border rounded px-1.5 py-0.5">{e.status}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="rounded-2xl border border-app bg-surface p-5 shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-[14px] font-bold text-base-fg">{title}</h3>
          <button onClick={() => setModalOpen(true)} className="text-[12.5px] font-semibold text-brand-600 hover:text-brand-700">View all</button>
        </div>
        <div className="flex-1 overflow-hidden pr-2">
          {renderList(visibleEvents)}
        </div>
      </div>
      
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={title} size="max-w-md">
        {renderList(events)}
      </Modal>
    </>
  );
}

export function ExpiringWidget({ campaigns }: { campaigns?: { id: string, title: string, template: string | null, end: string, daysLeft: number }[] }) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="rounded-2xl border border-app bg-surface p-5 shadow-sm flex flex-col">
        <h3 className="mb-4 text-[14px] font-bold text-base-fg flex items-center gap-2"><Clock size={16} className="text-orange-500"/> Expiring Soon (7 Days)</h3>
        <div className="flex-1 flex flex-col items-center justify-center py-6">
           <EmptyState icon={Clock} message="No expiring campaigns" compact />
         </div>
      </div>
    );
  }

  const visibleCampaigns = campaigns.slice(0, 4);

  const renderList = (items: typeof campaigns) => (
    <div className="space-y-3">
      {items.map(c => (
        <div key={c.id} className="flex items-center justify-between rounded-xl bg-surface p-3 border border-app shadow-sm">
          <div className="flex flex-col">
            <span className="font-semibold text-[13px] text-base-fg truncate max-w-[200px]">{c.title}</span>
            <span className="text-[11px] text-subtle-fg">{c.template || 'No template'}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[14px] font-extrabold text-orange-600 tabular-nums">{c.daysLeft} days left</span>
            <span className="text-[10px] text-subtle-fg">Ends {new Date(c.end).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-[14px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2"><AlertTriangle size={16}/> Expiring Soon</h3>
          <button onClick={() => setModalOpen(true)} className="text-[12.5px] font-semibold text-orange-600 hover:text-orange-700">View all</button>
        </div>
        <div className="flex-1 overflow-hidden">
          {renderList(visibleCampaigns)}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Expiring Soon" size="max-w-md">
        {renderList(campaigns)}
      </Modal>
    </>
  );
}

export function SetupComposition({ compositions }: { compositions?: { setupId: string, setupName: string, templates: any[] }[] }) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!compositions || compositions.length === 0) return null;

  const visibleCompositions = compositions.slice(0, 5);

  const renderList = (items: typeof compositions) => (
    <div className="space-y-6">
      {items.map(c => (
        <div key={c.setupId} className="border border-surface-2 rounded-xl p-4">
          <h4 className="font-bold text-[13px] text-base-fg mb-3">{c.setupName}</h4>
          <div className="space-y-2">
            {c.templates.map((t, i) => (
              <div key={t.templateId + i} className="flex items-center gap-3 text-[12px] bg-surface-2 p-2 rounded-lg">
                <span className="w-5 h-5 flex items-center justify-center bg-surface-3 rounded text-[10px] font-bold">{t.order}</span>
                <span className="font-medium text-base-fg flex-1">{t.name || 'Unnamed Template'}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="rounded-2xl border border-app bg-surface p-5 shadow-sm flex flex-col max-h-[400px]">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-[14px] font-bold text-base-fg">Setup Template Composition</h3>
          <button onClick={() => setModalOpen(true)} className="text-[12.5px] font-semibold text-brand-600 hover:text-brand-700">View all</button>
        </div>
        <div className="flex-1 overflow-hidden pr-2">
          {renderList(visibleCompositions)}
        </div>
      </div>
      
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Setup Template Composition" size="max-w-xl">
        {renderList(compositions)}
      </Modal>
    </>
  );
}

export function DataList({ title, data, columns }: { title: string, data?: any[], columns: { header: string, accessor: (row: any) => React.ReactNode }[] }) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!data || data.length === 0) return (
     <div className="rounded-2xl border border-app bg-surface p-5 shadow-sm flex flex-col">
        <h3 className="mb-4 text-[14px] font-bold text-base-fg">{title}</h3>
        <div className="flex-1 flex flex-col items-center justify-center py-6">
           <EmptyState icon={LayoutTemplate} message="No data available" compact />
         </div>
     </div>
  );

  const visibleData = data.slice(0, 5);

  const renderTable = (items: typeof data, isModal = false) => (
    <div className={cn("overflow-auto", isModal ? "max-h-[70vh]" : "flex-1")}>
      <table className="w-full text-left text-[13px]">
        <thead className="bg-surface-2 sticky top-0 z-10">
          <tr>
            {columns.map((c, i) => <th key={i} className="px-4 py-3 font-semibold text-muted-fg whitespace-nowrap border-b border-app">{c.header}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-app">
          {items.map((row, i) => (
            <tr key={i} className="hover:bg-surface-2/50 transition-colors">
              {columns.map((c, j) => <td key={j} className="px-4 py-3 text-base-fg">{c.accessor(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="rounded-2xl border border-app bg-surface shadow-sm overflow-hidden flex flex-col max-h-[400px]">
        <div className="p-5 border-b border-app flex items-center justify-between shrink-0">
          <h3 className="text-[14px] font-bold text-base-fg">{title}</h3>
          <button onClick={() => setModalOpen(true)} className="text-[12.5px] font-semibold text-brand-600 hover:text-brand-700">View all</button>
        </div>
        {renderTable(visibleData)}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={title} size="max-w-xl">
        <div className="pt-2">
          {renderTable(data, true)}
        </div>
      </Modal>
    </>
  );
}
