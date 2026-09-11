'use client';

import type { ReactNode } from 'react';
import { CircleAlert, RefreshCw, type LucideIcon } from 'lucide-react';
import Skeleton from '../../components/ui/Skeleton';
import { cn } from '../../lib/utils';

export { Skeleton };

export function KpiSkeleton() {
  return <Skeleton className="h-[122px] rounded-2xl" />;
}

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  const bars = [40, 65, 50, 80, 60, 90, 70, 55, 75, 85, 45, 68];
  return (
    <div className="flex items-end gap-2 px-2" style={{ height }} aria-hidden>
      {bars.map((h, i) => <Skeleton key={i} className="flex-1 rounded-md" style={{ height: `${h}%` }} />)}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      <div className="flex gap-3">{Array.from({ length: cols }).map((_, j) => <Skeleton key={j} className={cn('h-4 rounded', j === 0 ? 'flex-[2]' : 'flex-1')} />)}</div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {Array.from({ length: cols }).map((_, j) => <Skeleton key={j} className={cn('h-9 rounded-lg', j === 0 ? 'flex-[2]' : 'flex-1')} />)}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5, height = 56 }: { rows?: number; height?: number }) {
  return <div className="space-y-2" aria-hidden>{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="rounded-xl" style={{ height }} />)}</div>;
}

export function FunnelSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      {[100, 84, 68, 52, 36].map((w, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex justify-between"><Skeleton className="h-3 w-24 rounded" /><Skeleton className="h-3 w-12 rounded" /></div>
          <Skeleton className="h-7 rounded-lg" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}

export function TileSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3', className)} aria-hidden>{Array.from({ length: count }).map((_, i) => <Skeleton key={i} className="h-[76px] rounded-xl" />)}</div>;
}

export function DonutSkeleton() {
  return (
    <div className="flex items-center justify-center py-4" aria-hidden>
      <div className="h-[150px] w-[150px] animate-pulse rounded-full border-[18px] border-surface-2" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, compact }: { icon: LucideIcon; title?: string; message: string; compact?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-6' : 'py-12')}>
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-surface-2 text-subtle-fg"><Icon size={20} /></div>
      {title && <p className="text-[13.5px] font-bold text-base-fg">{title}</p>}
      <p className="max-w-[320px] text-[12.5px] text-muted-fg">{message}</p>
    </div>
  );
}

export function SectionError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[12.5px] text-red-600 dark:text-red-300">
      <CircleAlert size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">This section couldn&apos;t load</p>
        <p className="mt-0.5 break-words opacity-80">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 font-bold hover:bg-red-500/10">
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}

interface SectionBodyProps {
  loading: boolean; error?: string; onRetry?: () => void;
  empty?: boolean; emptyIcon: LucideIcon; emptyTitle?: string; emptyMessage: string; emptyCompact?: boolean;
  skeleton: ReactNode; children: ReactNode;
}

/** Loading → error → empty → content, in that order. Each dashboard section owns its own state. */
export function SectionBody({ loading, error, onRetry, empty, emptyIcon, emptyTitle, emptyMessage, emptyCompact, skeleton, children }: SectionBodyProps) {
  if (loading) return <>{skeleton}</>;
  if (error) return <SectionError message={error} onRetry={onRetry} />;
  if (empty) return <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} compact={emptyCompact} />;
  return <>{children}</>;
}

