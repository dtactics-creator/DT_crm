import { useState, useRef, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { useToast } from './ui/Toast';
import { parseCsv, toCsv, downloadCsv } from '../lib/csv';
import { UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, X, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ImportColumn {
  key: string;        // canonical field key
  label: string;      // display label (also matched as an alias)
  required?: boolean;
  hint?: string;      // e.g. accepted values / format
  example?: string;   // used in the downloadable template
  aliases?: string[]; // extra header names accepted from uploaded files
}

// Normalize a header for loose matching: lowercase, strip non-alphanumerics.
const normHeader = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// Remap arbitrary uploaded headers (label / key / alias / friendly export
// header) onto the canonical column keys so exported files round-trip and
// human-friendly spreadsheets work too.
function normalizeRows(rawRows: Record<string, string>[], columns: ImportColumn[]): Record<string, string>[] {
  const lookup: Record<string, string> = {};
  for (const c of columns) {
    lookup[normHeader(c.key)] = c.key;
    lookup[normHeader(c.label)] = c.key;
    for (const a of c.aliases || []) lookup[normHeader(a)] = c.key;
  }
  return rawRows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const [header, value] of Object.entries(row)) {
      const key = lookup[normHeader(header)];
      if (key) mapped[key] = value;
    }
    return mapped;
  });
}

export interface MappedRow {
  values: Record<string, unknown>;   // resolved payload sent to the API
  errors: string[];                  // validation errors (empty = valid)
  display: Record<string, string>;   // what to show in the preview table
}

export type DuplicateMode = 'update' | 'skip' | 'create';

export interface ImportResult {
  insertedCount: number;
  updatedCount?: number;
  skippedCount?: number;
  failedCount: number;
  failed: { row: number; error: string }[];
  skipped?: { row: number; reason: string }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  entity: string;                    // e.g. "leads"
  columns: ImportColumn[];
  templateName: string;              // e.g. "leads-import-template.csv"
  // A hint describing how duplicates are matched, shown in the mode picker.
  duplicateKeyHint?: string;
  // Extracts every candidate natural key from a mapped row's payload for
  // duplicate detection in the preview (mirrors the server's matching, which
  // may match on more than one key — e.g. Lead No AND email).
  dedupeKeys?: (values: Record<string, unknown>) => string[];
  // Keys of records already in the database, so the preview can flag rows
  // that would be skipped as existing duplicates (normalized the same way
  // `dedupeKeys` produces keys).
  existingKeys?: Set<string>;
  // Resolve + validate a raw CSV record into a payload (labels -> values, etc.).
  mapRow: (raw: Record<string, string>) => MappedRow;
  // Sends valid rows to the server with the chosen duplicate mode.
  onImport: (rows: Record<string, unknown>[], mode: DuplicateMode) => Promise<ImportResult>;
  onDone: () => void;                // called after a successful import (refetch)
}

type RowStatus = 'valid' | 'invalid' | 'duplicate';

export default function ImportDialog({ open, onClose, title, entity, columns, templateName, duplicateKeyHint, dedupeKeys, existingKeys, mapRow, onImport, onDone }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);

  // Normalize headers, validate, then classify each row as valid / invalid /
  // duplicate (matches any candidate key already seen in-file OR in the DB).
  const mapped = useMemo(() => {
    const rows = normalizeRows(rawRows, columns).map((r) => mapRow(r));
    const seen = new Set<string>();
    return rows.map((m) => {
      let status: RowStatus = 'valid';
      if (m.errors.length > 0) {
        status = 'invalid';
      } else if (dedupeKeys) {
        const keys = dedupeKeys(m.values).filter(Boolean);
        const isDup = keys.some((k) => seen.has(k) || existingKeys?.has(k));
        if (isDup) status = 'duplicate';
        else keys.forEach((k) => seen.add(k));
      }
      return { ...m, status };
    });
  }, [rawRows, mapRow, columns, dedupeKeys, existingKeys]);

  const validRows = mapped.filter((m) => m.status === 'valid');
  const invalidCount = mapped.filter((m) => m.status === 'invalid').length;
  const duplicateCount = mapped.filter((m) => m.status === 'duplicate').length;

  const reset = () => { setFileName(''); setRawRows([]); if (fileRef.current) fileRef.current.value = ''; };
  const close = () => { reset(); onClose(); };

  const handleFile = async (file: File) => {
    try {
      const name = file.name.toLowerCase();
      const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');
      let rows: Record<string, string>[];

      if (isExcel) {
        // Parse Excel with SheetJS, lazily loaded so it doesn't bloat the
        // main bundle. Read cells as strings so dates/numbers stay intact.
        const XLSX = await import('xlsx');
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) { toast('The spreadsheet has no sheets.', 'error'); return; }
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
        rows = json.map((r) => {
          const o: Record<string, string> = {};
          for (const [k, v] of Object.entries(r)) o[k] = v == null ? '' : String(v).trim();
          return o;
        });
      } else {
        rows = parseCsv(await file.text());
      }

      if (rows.length === 0) { toast('The file has no data rows.', 'error'); return; }
      setFileName(file.name);
      setRawRows(rows);
    } catch {
      toast('Could not read the file. Please upload a valid CSV or Excel file.', 'error');
    }
  };

  const downloadTemplate = () => {
    // Template headers === export headers === import headers (single schema).
    const headers = columns.map((c) => (c.required ? `* ${c.label}` : c.label));
    const example = columns.map((c) => c.example ?? '');
    downloadCsv(templateName, toCsv(headers, [example]));
  };

  const runImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      // Always skip: only valid, non-duplicate rows are imported.
      const res = await onImport(validRows.map((m) => m.values), 'skip');
      onDone();
      // Skipped = duplicates + invalid rows (never sent) + any server skips.
      const skipped = (res.skippedCount ?? 0) + res.failedCount + invalidCount + duplicateCount;
      const parts = [`${res.insertedCount} created`];
      if (skipped) parts.push(`${skipped} skipped`);
      toast(parts.join(' · '), 'success');
      close();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const previewCols = columns.slice(0, 5); // keep the preview readable

  return (
    <Modal open={open} onClose={close} title={title} size="max-w-3xl"
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center flex-wrap gap-1.5 text-[12.5px]">
            {rawRows.length > 0 && (
              <>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">{validRows.length} valid</span>
                {invalidCount > 0 && <span className="inline-flex items-center gap-1 font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full">{invalidCount} invalid</span>}
                {duplicateCount > 0 && <span className="inline-flex items-center gap-1 font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">{duplicateCount} duplicate{duplicateCount > 1 ? 's' : ''}</span>}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={close}>Cancel</Button>
            {rawRows.length > 0 && (
              <Button onClick={runImport} loading={importing} disabled={validRows.length === 0} icon={<UploadCloud className="h-4 w-4" />}>
                Import {validRows.length} {entity}
              </Button>
            )}
          </div>
        </div>
      }>
      {rawRows.length === 0 ? (
        /* Upload view */
        <div className="space-y-5">
          <button type="button" onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            className="w-full rounded-2xl border-2 border-dashed border-strong hover:border-brand-400 hover:bg-surface-2 transition-colors py-10 flex flex-col items-center gap-2.5">
            <div className="h-12 w-12 rounded-2xl bg-brand-50 dark:bg-brand-600/12 flex items-center justify-center">
              <UploadCloud className="h-6 w-6 text-brand-600 dark:text-brand-300" />
            </div>
            <p className="text-[14px] font-semibold text-base-fg">Click to upload or drag a file</p>
            <p className="text-[12.5px] text-muted-fg">Supports .csv, .xlsx and .xls files</p>
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

          <div className="flex items-center justify-between rounded-xl border border-app bg-surface-2 px-4 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              <p className="text-[12.5px] text-muted-fg">Not sure about the format? Download a ready-made template.</p>
            </div>
            <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} onClick={downloadTemplate}>Template</Button>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg mb-2">Expected columns</p>
            <div className="rounded-xl border border-app divide-y divide-[color:var(--border)] max-h-52 overflow-y-auto">
              {columns.map((c) => (
                <div key={c.key} className="flex items-start gap-3 px-4 py-2">
                  <code className="text-[12px] font-semibold text-base-fg font-mono shrink-0 w-44 truncate">{c.label}{c.required && <span className="text-red-500"> *</span>}</code>
                  <span className="text-[12px] text-muted-fg">{c.hint || c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Preview view */
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-[13px] font-semibold text-base-fg truncate">{fileName}</span>
              <span className="text-[12px] text-muted-fg">· {rawRows.length} rows</span>
            </div>
            <button onClick={reset} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-fg hover:text-base-fg">
              <RotateCcw className="h-3.5 w-3.5" /> Choose another file
            </button>
          </div>

          {(invalidCount > 0 || duplicateCount > 0) && (
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3.5 py-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[12.5px] text-amber-700 dark:text-amber-300">
                Only valid, non-duplicate rows will be imported.
                {invalidCount > 0 && <> {invalidCount} row{invalidCount > 1 ? 's have' : ' has'} errors.</>}
                {duplicateCount > 0 && <> {duplicateCount} duplicate row{duplicateCount > 1 ? 's' : ''}{duplicateKeyHint ? ` (matched by ${duplicateKeyHint})` : ''} will be skipped.</>}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-app overflow-hidden">
            <div className="overflow-x-auto max-h-[46vh] overflow-y-auto">
              <table className="w-full border-collapse min-w-[640px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-surface-2 border-b border-app">
                    <th className="text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-subtle-fg w-12">#</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-subtle-fg w-24">Status</th>
                    {previewCols.map((c) => (
                      <th key={c.key} className="text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-subtle-fg whitespace-nowrap">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mapped.map((m, i) => (
                    <tr key={i} className={cn('border-b border-app last:border-0',
                      m.status === 'invalid' && 'bg-red-50/50 dark:bg-red-500/5',
                      m.status === 'duplicate' && 'bg-amber-50/50 dark:bg-amber-500/5')}>
                      <td className="px-3 py-2.5 text-[12px] text-subtle-fg tabular">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        {m.status === 'valid' && (
                          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Valid</span>
                        )}
                        {m.status === 'invalid' && (
                          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-red-500" title={m.errors.join('; ')}><X className="h-3.5 w-3.5" /> Invalid</span>
                        )}
                        {m.status === 'duplicate' && (
                          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber-600" title="Already exists or duplicated in file"><AlertTriangle className="h-3.5 w-3.5" /> Duplicate</span>
                        )}
                      </td>
                      {previewCols.map((c) => (
                        <td key={c.key} className="px-3 py-2.5 text-[12.5px] text-base-fg max-w-[200px] truncate">{m.display[c.key] || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-row error details */}
          {invalidCount > 0 && (
            <div className="rounded-xl border border-app max-h-40 overflow-y-auto divide-y divide-[color:var(--border)]">
              {mapped.map((m, i) => m.errors.length > 0 && (
                <div key={i} className="flex items-start gap-3 px-4 py-2">
                  <span className="text-[12px] font-bold text-subtle-fg tabular w-14 shrink-0">Row {i + 1}</span>
                  <span className="text-[12px] text-red-500">{m.errors.join(' · ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
