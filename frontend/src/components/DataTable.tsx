import { useState, useMemo, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { cn } from '../lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  emptyState?: ReactNode;
  stickyHeader?: boolean;
  maxBodyHeight?: string;
}

export default function DataTable<T>({ data, columns, rowKey, onRowClick, pageSize = 10, emptyState, stickyHeader, maxBodyHeight }: Props<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(0);

  const [internalPageSize, setInternalPageSize] = useState(pageSize);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return data;
    const arr = [...data].sort((a, b) => {
      const av = col.sortValue!(a); const bv = col.sortValue!(b);
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [data, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / internalPageSize));
  const current = Math.min(page, totalPages - 1);
  const rows = sorted.slice(current * internalPageSize, current * internalPageSize + internalPageSize);

  const toggleSort = (key: string) => {
    setPage(0);
    setSort((s) => {
      if (s?.key !== key) return { key, dir: 'asc' };
      if (s.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setInternalPageSize(Number(e.target.value));
    setPage(0);
  };

  if (data.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div className="w-full">
      <div className="overflow-x-auto overflow-y-auto" style={maxBodyHeight ? { maxHeight: maxBodyHeight } : undefined}>
        <table className="w-full border-collapse min-w-[760px]">
          <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
            <tr className={cn('border-b border-app', stickyHeader && 'bg-surface-2')}>
              {columns.map((col) => (
                <th key={col.key} className={cn('text-left px-4 py-3 first:pl-5 last:pr-5', stickyHeader && 'bg-surface-2', col.headerClassName)}>
                  {col.sortValue ? (
                    <button onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg hover:text-base-fg transition-colors">
                      {col.header}
                      {sort?.key === col.key ? (
                        sort.dir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                      ) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  ) : (
                    <span className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg">{col.header}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn('border-b border-app last:border-0 transition-colors', onRowClick && 'cursor-pointer hover:bg-surface-2')}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3.5 first:pl-5 last:pr-5 align-middle text-[13.5px] text-base-fg max-w-[200px] xl:max-w-[300px] truncate', col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 border-t border-app">
          <div className="flex items-center gap-4">
            <p className="text-[12.5px] text-muted-fg">
              Showing <span className="font-semibold text-base-fg">{sorted.length > 0 ? current * internalPageSize + 1 : 0}–{Math.min((current + 1) * internalPageSize, sorted.length)}</span> of{' '}
              <span className="font-semibold text-base-fg">{sorted.length}</span>
            </p>
            <div className="flex items-center gap-1.5 border-l border-app pl-4">
              <span className="text-[12.5px] text-muted-fg">Rows per page:</span>
              <select
                value={internalPageSize}
                onChange={handlePageSizeChange}
                className="bg-surface border border-app rounded px-1.5 py-1 text-[12.5px] text-base-fg focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={current === 0}
              className="h-8 w-8 rounded-lg border border-app flex items-center justify-center text-muted-fg hover:bg-surface-2 disabled:opacity-40 disabled:pointer-events-none transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[12.5px] font-semibold text-base-fg tabular px-2">{totalPages > 0 ? current + 1 : 0} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={current >= totalPages - 1 || totalPages === 0}
              className="h-8 w-8 rounded-lg border border-app flex items-center justify-center text-muted-fg hover:bg-surface-2 disabled:opacity-40 disabled:pointer-events-none transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
