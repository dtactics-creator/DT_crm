import { cn } from '../../lib/utils';

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function Badge({ label, color, className, dot }: {
  label: string;
  color?: string | null;
  className?: string;
  dot?: boolean;
}) {
  const c = color || '#64748b';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap',
        className,
      )}
      style={{ backgroundColor: hexToRgba(c, 0.12), color: c }}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />}
      {label}
    </span>
  );
}
