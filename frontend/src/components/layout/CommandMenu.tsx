import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, LayoutDashboard, Users, FolderKanban, Database, UserCog, BarChart3, CornerDownLeft, ShieldCheck, MessageSquareText,
} from 'lucide-react';

const ITEMS = [
  { label: 'Go to Dashboard', to: '/', icon: LayoutDashboard, group: 'Navigation' },
  { label: 'Go to Leads', to: '/leads', icon: Users, group: 'Navigation' },
  { label: 'Go to Projects', to: '/projects', icon: FolderKanban, group: 'Navigation' },
  { label: 'Go to Masters', to: '/masters', icon: Database, group: 'Navigation' },
  { label: 'Go to Employees', to: '/employees', icon: UserCog, group: 'Navigation' },
  { label: 'Go to Roles', to: '/roles', icon: ShieldCheck, group: 'Navigation' },
  { label: 'Go to Templates', to: '/templates', icon: MessageSquareText, group: 'Navigation' },
  { label: 'Go to Reports', to: '/reports', icon: BarChart3, group: 'Navigation' },
  { label: 'Create new lead', to: '/leads?new=1', icon: Users, group: 'Actions' },
  { label: 'Create new project', to: '/projects?new=1', icon: FolderKanban, group: 'Actions' },
];

export default function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);

  const filtered = useMemo(
    () => ITEMS.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())),
    [q],
  );

  useEffect(() => { if (open) { setQ(''); setActive(0); } }, [open]);
  useEffect(() => { setActive(0); }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      if (e.key === 'Enter') {
        const item = filtered[active];
        if (item) { navigate(item.to); onClose(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, filtered, active, navigate, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="relative w-full max-w-lg bg-surface border border-app rounded-2xl elevated overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 h-14 border-b border-app">
              <Search className="h-4.5 w-4.5 text-subtle-fg shrink-0" />
              <input
                autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search pages and actions…"
                className="flex-1 bg-transparent outline-none text-[14px] text-base-fg placeholder:text-subtle-fg"
              />
              <kbd className="text-[11px] font-semibold px-1.5 h-5 flex items-center rounded bg-surface-2 border border-app text-subtle-fg">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="text-center text-[13px] text-muted-fg py-8">No results for “{q}”</p>
              ) : (
                filtered.map((item, i) => (
                  <button
                    key={item.label}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => { navigate(item.to); onClose(); }}
                    className={`flex items-center gap-3 w-full rounded-lg px-3 h-11 text-left transition-colors ${i === active ? 'bg-brand-50 dark:bg-brand-600/12' : ''}`}
                  >
                    <item.icon className={`h-4.5 w-4.5 shrink-0 ${i === active ? 'text-brand-600 dark:text-brand-300' : 'text-muted-fg'}`} />
                    <span className="flex-1 text-[13.5px] font-medium text-base-fg">{item.label}</span>
                    <span className="text-[11px] font-semibold text-subtle-fg">{item.group}</span>
                    {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-subtle-fg" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
