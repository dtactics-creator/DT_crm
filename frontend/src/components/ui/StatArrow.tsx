import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function StatArrow({ value, className }: { value: number; className?: string }) {
  const up = value >= 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[12px] font-bold', up ? 'text-emerald-500' : 'text-red-500', className)}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {Math.abs(value)}%
    </span>
  );
}
