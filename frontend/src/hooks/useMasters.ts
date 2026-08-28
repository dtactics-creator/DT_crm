import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { MasterItem } from '../types';

export function useMasters() {
  return useQuery({
    queryKey: ['masters'],
    queryFn: () => api.get<MasterItem[]>('/api/masters'),
    staleTime: 60_000,
  });
}

export function groupMasters(items: MasterItem[] | undefined) {
  const g: Record<string, MasterItem[]> = {};
  for (const it of items || []) {
    if (!it.is_active) continue;
    (g[it.category] ||= []).push(it);
  }
  for (const k of Object.keys(g)) g[k].sort((a, b) => a.sort_order - b.sort_order);
  return g;
}

export function makeLookup(items: MasterItem[] | undefined) {
  const map: Record<string, Record<string, MasterItem>> = {};
  for (const it of items || []) {
    (map[it.category] ||= {})[it.value] = it;
  }
  return {
    label: (cat: string, val: string | null | undefined) => (val ? map[cat]?.[val]?.label ?? val : '—'),
    color: (cat: string, val: string | null | undefined) => (val ? map[cat]?.[val]?.color ?? '#64748b' : '#64748b'),
  };
}

// Reverse resolver for imports: accepts either the master value OR the label
// (case-insensitive) and returns the canonical value, or undefined if unknown.
export function makeResolver(items: MasterItem[] | undefined) {
  const byCat: Record<string, Record<string, string>> = {};
  for (const it of items || []) {
    const cat = (byCat[it.category] ||= {});
    cat[it.value.toLowerCase()] = it.value;
    cat[it.label.toLowerCase()] = it.value;
  }
  return (category: string, input: string | null | undefined): string | undefined => {
    if (!input) return undefined;
    return byCat[category]?.[String(input).trim().toLowerCase()];
  };
}

export function toOptions(items: MasterItem[] | undefined, category: string) {
  return (items || [])
    .filter((m) => m.category === category && m.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => ({ value: m.value, label: m.label, color: m.color, description: m.description, gst_percent: m.gst_percent, percent: m.percent }));
}
