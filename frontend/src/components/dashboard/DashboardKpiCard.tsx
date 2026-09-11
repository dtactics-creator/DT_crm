'use client';

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { KpiSkeleton } from './DashboardSkeleton';
import { cn } from '../../lib/utils';

interface KpiCardProps {
  label: string; value: string; icon: LucideIcon; tone: string; hint?: string; href?: string; loading?: boolean; index?: number;
}

export default function DashboardKpiCard({ label, value, icon: Icon, tone, hint, href, loading, index = 0 }: KpiCardProps) {
  if (loading) return <KpiSkeleton />;

  const body = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'group relative h-full min-w-0 rounded-2xl border border-app bg-surface p-4 card-shadow transition-colors',
        href && 'hover:border-brand/60',
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ backgroundColor: `color-mix(in srgb, ${tone} 14%, transparent)` }}>
          <Icon size={18} style={{ color: tone }} />
        </div>
        {href && <ArrowUpRight size={14} className="text-subtle-fg opacity-0 transition-opacity group-hover:opacity-100" />}
      </div>
      <p className="truncate text-[24px] font-extrabold leading-none tracking-tight tabular text-base-fg">{value}</p>
      <p className="mt-1.5 text-[12px] font-semibold text-muted-fg">{label}</p>
      {hint && <p className="mt-1 truncate text-[11px] text-subtle-fg" title={hint}>{hint}</p>}
    </motion.div>
  );

  return href ? <Link to={href} className="block h-full min-w-0">{body}</Link> : body;
}

export function QuickStat({ icon: Icon, tone, label, value }: { icon: LucideIcon; tone: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${tone} 14%, transparent)` }}>
        <Icon size={18} style={{ color: tone }} />
      </div>
      <span className="flex-1 text-[12.5px] font-semibold text-muted-fg">{label}</span>
      <span className="text-[14px] font-extrabold tabular text-base-fg">{value}</span>
    </div>
  );
}

