import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface RowAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export default function RowActions({ actions }: { actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onClick);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('mousedown', onClick); window.removeEventListener('scroll', onScroll, true); };
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setCoords({ top: rect.bottom + 6, left: rect.right - 176 });
    setOpen((v) => !v);
  };

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors">
        <MoreHorizontal className="h-4.5 w-4.5" />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div ref={menuRef}
              initial={{ opacity: 0, scale: 0.96, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.13 }}
              style={{ position: 'fixed', top: coords.top, left: Math.max(12, coords.left), zIndex: 90 }}
              className="w-44 bg-surface border border-app rounded-xl card-shadow-lg overflow-hidden p-1.5">
              {actions.map((a, i) => (
                <button key={i} disabled={a.disabled}
                  onClick={(e) => { e.stopPropagation(); setOpen(false); a.onClick(); }}
                  className={cn('flex items-center gap-2.5 w-full rounded-lg px-3 h-9 text-[13px] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none',
                    a.danger ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10' : 'text-muted-fg hover:bg-surface-2 hover:text-base-fg')}>
                  {a.icon}{a.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
