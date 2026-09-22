import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface Option { value: string; label: string; color?: string | null; hint?: string }

export function SearchableSelect({ value, onChange, options, placeholder = 'Select…', invalid, clearable, align = 'left', creatable = false, disabled = false }: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  invalid?: boolean;
  clearable?: boolean;
  align?: 'left' | 'right';
  creatable?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  
  const stateRef = useRef({ q, onChange, creatable, options });
  stateRef.current = { q, onChange, creatable, options };

  useEffect(() => {
    const onClick = (e: MouseEvent) => { 
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(prev => {
          if (prev) {
            const { q, onChange, creatable, options } = stateRef.current;
            if (creatable && q.trim()) {
              const exact = options.find(o => (o.label || '').toLowerCase() === q.trim().toLowerCase());
              if (exact) onChange(exact.value);
              else onChange(q.trim());
            }
          }
          return false;
        });
      } 
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  let selected = options.find((o) => o.value === value);
  if (!selected && creatable && value) {
    // If creatable and no option matches, treat the value itself as the selected option
    selected = { value, label: value };
  }
  const filtered = useMemo(() => options.filter((o) => (o.label || '').toLowerCase().includes(q.toLowerCase())), [options, q]);

  return (
    <div className="relative" ref={ref}>
      <div className={cn(
        'relative flex items-center w-full h-10 px-3.5 rounded-lg bg-surface-2 border transition-all cursor-text',
        invalid ? 'border-red-400' : 'border-app', open && 'ring-2 ring-brand',
        disabled && 'opacity-60 cursor-not-allowed bg-subtle/30 pointer-events-none'
      )} onClick={() => { if (!open && !disabled) setOpen(true); }}>
        {selected?.color && !open && <span className="h-2.5 w-2.5 rounded-full shrink-0 mr-2" style={{ backgroundColor: selected.color }} />}
        <input 
          value={open ? q : (selected?.label || '')}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => { if (!open) setQ(selected?.label || value || ''); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const exact = filtered.find(o => (o.label || '').toLowerCase() === q.trim().toLowerCase());
              if (exact) { onChange(exact.value); setOpen(false); }
              else if (creatable && q.trim()) { onChange(q.trim()); setOpen(false); }
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent outline-none text-sm text-base-fg truncate min-w-0"
        />
        {clearable && selected && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); setQ(''); setOpen(false); }} className="text-subtle-fg hover:text-base-fg p-1">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <ChevronDown className={cn('pointer-events-none h-4 w-4 text-subtle-fg transition-transform shrink-0 ml-1', open && 'rotate-180')} />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className={cn(
              "absolute z-50 mt-1.5 min-w-full w-[max-content] max-w-[320px] bg-surface border border-app rounded-xl card-shadow-lg overflow-hidden",
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
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
              {creatable && q.trim() && !options.find(o => (o.label || '').toLowerCase() === q.trim().toLowerCase()) && (
                <button type="button" onClick={() => { onChange(q.trim()); setOpen(false); }}
                  className="flex items-center gap-2.5 w-full rounded-lg px-3 h-9 text-left transition-colors hover:bg-surface-2 border-t border-app mt-1 pt-1">
                  <span className="flex-1 text-[13px] font-medium text-brand-600 truncate">Create "{q.trim()}"</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MultiSelect({ values, onChange, options, placeholder = 'Select…', align = 'left' }: {
  values: string[];
  onChange: (v: string[]) => void;
  options: Option[];
  placeholder?: string;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const filtered = useMemo(() => options.filter((o) => (o.label || '').toLowerCase().includes(q.toLowerCase())), [options, q]);
  const toggle = (v: string) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  const selectedOpts = options.filter((o) => values.includes(o.value));

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => { setOpen((v) => !v); setQ(''); }}
        className={cn('w-full min-h-[40px] py-1.5 pl-2 pr-8 rounded-lg bg-surface-2 text-left text-sm flex items-center flex-wrap gap-1.5',
          'border border-app transition-all outline-none focus:ring-2 ring-brand', open && 'ring-2')}>
        {selectedOpts.length === 0 ? <span className="text-subtle-fg pl-1.5">{placeholder}</span> : (
          <>
            {selectedOpts.length <= 2 ? selectedOpts.map((o) => (
              <span key={o.value} className="inline-flex items-center gap-1 rounded-md bg-surface border border-app px-1.5 py-0.5 text-[12px] font-medium text-base-fg shrink-0 max-w-full">
                {o.color && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} />}
                <span className="truncate">{o.label}</span>
                <span onClick={(e) => { e.stopPropagation(); toggle(o.value); }} className="text-subtle-fg hover:text-red-500 shrink-0"><X className="h-3 w-3" /></span>
              </span>
            )) : (
              <span className="text-[13px] font-medium text-base-fg pl-1.5">{selectedOpts.length} selected</span>
            )}
          </>
        )}
      </button>
      <ChevronDown className={cn('pointer-events-none absolute right-3 top-3 h-4 w-4 text-subtle-fg transition-transform', open && 'rotate-180')} />

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.14 }}
            className={cn(
              "absolute z-50 mt-1.5 top-full min-w-full w-[max-content] max-w-[320px] bg-surface border border-app rounded-xl card-shadow-lg overflow-hidden",
              align === 'right' ? 'right-0' : 'left-0'
            )}>
            <div className="flex items-center justify-between gap-2 px-3 h-10 border-b border-app">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Search className="h-4 w-4 text-subtle-fg shrink-0" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
                  className="w-full bg-transparent outline-none text-[13px] text-base-fg placeholder:text-subtle-fg min-w-0" />
              </div>
              <button 
                type="button" 
                onClick={(e) => {
                  e.stopPropagation();
                  const allValues = options.map(o => o.value);
                  const isAllSelected = allValues.length > 0 && allValues.every(v => values.includes(v));
                  onChange(isAllSelected ? [] : allValues);
                }}
                className="text-[12px] font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 whitespace-nowrap shrink-0 transition-colors"
              >
                {options.length > 0 && options.every(o => values.includes(o.value)) ? 'Deselect all' : 'Select all'}
              </button>
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
