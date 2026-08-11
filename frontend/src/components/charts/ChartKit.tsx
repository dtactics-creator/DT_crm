import type { ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export function useChartColors() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return {
    grid: dark ? '#1e2637' : '#eef1f6',
    axis: dark ? '#64748b' : '#94a3b8',
    tooltipBg: dark ? '#111725' : '#ffffff',
    tooltipBorder: dark ? '#2a3346' : '#e7ebf1',
    text: dark ? '#eef2f8' : '#0f172a',
  };
}

export function ChartTooltip({ active, payload, label, prefix = '', suffix = '' }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; payload?: Record<string, unknown> }[];
  label?: string;
  prefix?: string;
  suffix?: string;
}) {
  const c = useChartColors();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border px-3 py-2.5 card-shadow-lg" style={{ backgroundColor: c.tooltipBg, borderColor: c.tooltipBorder }}>
      {label && <p className="text-[12px] font-bold mb-1.5" style={{ color: c.text }}>{label}</p>}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-fg capitalize">{p.name}:</span>
            <span className="font-bold tabular" style={{ color: c.text }}>
              {prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartCard({ title, subtitle, action, children, className }: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface border border-app rounded-2xl card-shadow p-5 ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-[15px] font-bold text-base-fg">{title}</h3>
          {subtitle && <p className="text-[12.5px] text-muted-fg mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
