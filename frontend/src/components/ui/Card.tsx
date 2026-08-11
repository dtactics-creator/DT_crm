import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export default function Card({ children, className, padding = true }: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div className={cn('bg-surface border border-app rounded-2xl card-shadow', padding && 'p-5', className)}>
      {children}
    </div>
  );
}
