import { cn } from '../../lib/utils';
import React from 'react';

export default function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('skeleton rounded-lg', className)} style={style} />;
}
