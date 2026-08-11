import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface Option { value: string; label: string; color?: string | null; hint?: string }

export function SearchableSelect({ value, onChange, options, placeholder = 'Select…', invalid, clearable }: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  invalid?: boolean;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())), [options, q]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => { setOpen((v) => !v); setQ(''); }}
        className={cn(
          'w-full h-10 pl-3.5 pr-9 rounded-lg bg-surface text-left text-sm flex items-center gap-2',
          'border transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-0 ring-brand',
          invalid ? 'border-red-400' : 'border-app', open && 'ring-2',
        )}>
        {selected ? (
          <span className="flex items-center gap-2 min-w-0 flex-1">
            {selected.color && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />}
            <span className="truncate text-base-fg font-medium">{selected.label}</span>
          </span>
        ) : <span className="text-subtle-fg flex-1">{placeholder}</span>}
        {clearable && selected && (
          <span onClick={(e) => { e.stopPropagation(); onChange(''); }} className="text-subtle-fg hover:text-base-fg">
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>
      <ChevronDown className={cn('pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-fg transition-transform', open && 'rotate-180')} />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute z-50 mt-1.5 w-full bg-surface border border-app rounded-xl card-shadow-lg overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 h-10 border-b border-app">
              <Search className="h-4 w-4 text-subtle-fg shrink-0" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
                className="flex-1 bg-transparent outline-none text-[13px] text-base-fg placeholder:text-subtle-fg" />
            </div>
            <div className="max-h-60 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <p className="text-center text-[13px] text-muted-fg py-6">No matches</p>
              ) : filtered.map((o) => (
                <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
                  className={cn('flex items-center gap-2.5 w-full rounded-lg px-3 h-9 text-left transition-colors',
                    o.value === value ? 'bg-brand-50 dark:bg-brand-600/12' : 'hover:bg-surface-2')}>
                  {o.color && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} />}
                  <span className="flex-1 text-[13px] font-medium text-base-fg truncate">{o.label}</span>
                  {o.hint && <span className="text-[11px] text-subtle-fg">{o.hint}</span>}
                  {o.value === value && <Check className="h-4 w-4 text-brand-600 shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MultiSelect({ values, onChange, options, placeholder = 'Select…' }: {
  values: string[];
  onChange: (v: string[]) => void;
  options: Option[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const filtered = useMemo(() => options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())), [options, q]);
  const toggle = (v: string) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  const selectedOpts = options.filter((o) => values.includes(o.value));

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => { setOpen((v) => !v); setQ(''); }}
        className={cn('w-full min-h-10 py-1.5 pl-2 pr-9 rounded-lg bg-surface text-left text-sm flex items-center flex-wrap gap-1.5',
          'border border-app transition-all outline-none focus:ring-2 ring-brand', open && 'ring-2')}>
        {selectedOpts.length === 0 ? <span className="text-subtle-fg pl-1.5">{placeholder}</span> : selectedOpts.map((o) => (
          <span key={o.value} className="inline-flex items-center gap-1 rounded-md bg-surface-2 border border-app px-2 py-0.5 text-[12px] font-medium text-base-fg">
            {o.color && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: o.color }} />}
            {o.label}
            <span onClick={(e) => { e.stopPropagation(); toggle(o.value); }} className="text-subtle-fg hover:text-red-500"><X className="h-3 w-3" /></span>
          </span>
        ))}
      </button>
      <ChevronDown className={cn('pointer-events-none absolute right-3 top-3 h-4 w-4 text-subtle-fg transition-transform', open && 'rotate-180')} />

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.14 }}
            className="absolute z-50 mt-1.5 w-full bg-surface border border-app rounded-xl card-shadow-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 h-10 border-b border-app">
              <Search className="h-4 w-4 text-subtle-fg shrink-0" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
                className="flex-1 bg-transparent outline-none text-[13px] text-base-fg placeholder:text-subtle-fg" />
            </div>
            <div className="max-h-56 overflow-y-auto p-1.5">
              {filtered.map((o) => {
                const on = values.includes(o.value);
                return (
                  <button key={o.value} type="button" onClick={() => toggle(o.value)}
                    className={cn('flex items-center gap-2.5 w-full rounded-lg px-3 h-9 text-left transition-colors', on ? 'bg-brand-50 dark:bg-brand-600/12' : 'hover:bg-surface-2')}>
                    <span className={cn('h-4 w-4 rounded border flex items-center justify-center shrink-0', on ? 'bg-brand-600 border-brand-600' : 'border-strong')}>
                      {on && <Check className="h-3 w-3 text-white" />}
                    </span>
                    {o.color && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} />}
                    <span className="flex-1 text-[13px] font-medium text-base-fg truncate">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
