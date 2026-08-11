import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Save, Copy, Check, Trash2, MessageSquareText, Variable } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Field from '../components/ui/Field';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { useToast } from '../components/ui/Toast';
import { useTemplates } from '../hooks/useTemplates';
import { usePermissions } from '../contexts/PermissionContext';
import { collect, required, minLen, maxLen } from '../lib/validators';
import { useMasters, toOptions, makeLookup } from '../hooks/useMasters';
import { api } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '../lib/utils';
import type { Template } from '../types';

// Highlight {{variables}} inside the preview.
function countVars(body: string) {
  const set = new Set<string>();
  for (const m of body.matchAll(/\{\{?\s*([^{}]+?)\s*\}?\}/g)) set.add(m[1].trim());
  return set.size;
}

export default function Templates() {
  const { can } = usePermissions();
  const { data: templates, isLoading } = useTemplates();
  const { data: masters } = useMasters();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Category options come from the Template Categories master (dynamic, no hardcoding).
  const categoryOptions = toOptions(masters, 'template_category');
  const lookup = makeLookup(masters);
  const catMeta = (value: string) => ({
    label: lookup.label('template_category', value),
    color: lookup.color('template_category', value),
  });

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newTpl, setNewTpl] = useState({ title: '', category: 'outreach', body: '' });
  const [newErrors, setNewErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Seed local drafts whenever templates load/refresh.
  useEffect(() => {
    if (templates) {
      setDrafts((prev) => {
        const next: Record<string, string> = {};
        for (const t of templates) next[t.id] = prev[t.id] ?? t.body;
        return next;
      });
    }
  }, [templates]);

  const filtered = useMemo(() => (templates || []).filter((t) => {
    const q = search.toLowerCase();
    const matchQ = !q || [t.title, t.body].some((x) => x.toLowerCase().includes(q));
    const matchCat = !categoryFilter || t.category === categoryFilter;
    return matchQ && matchCat;
  }), [templates, search, categoryFilter]);

  const dirtyCount = useMemo(() => (templates || []).filter((t) => (drafts[t.id] ?? t.body) !== t.body).length, [templates, drafts]);

  const saveAll = async () => {
    if (!templates || dirtyCount === 0) return;
    const changed = templates.filter((t) => (drafts[t.id] ?? t.body) !== t.body)
      .map((t) => ({ id: t.id, title: t.title, category: t.category, channel: t.channel, body: drafts[t.id], status: t.status, sort_order: t.sort_order }));
    setSaving(true);
    try {
      await api.post('/api/templates', { templates: changed });
      await qc.invalidateQueries({ queryKey: ['templates'] });
      toast(`Saved ${changed.length} template${changed.length > 1 ? 's' : ''}`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to save templates', 'error');
    } finally {
      setSaving(false);
    }
  };

  const createTemplate = async () => {
    const er = collect({
      title: required(newTpl.title, 'Title') || minLen(newTpl.title, 2, 'Title') || maxLen(newTpl.title, 120, 'Title'),
      body: required(newTpl.body, 'Message') || maxLen(newTpl.body, 6000, 'Message'),
      category: required(newTpl.category, 'Category'),
    });
    setNewErrors(er);
    if (Object.keys(er).length) return;
    setCreating(true);
    try {
      await api.post('/api/templates', { title: newTpl.title.trim(), category: newTpl.category, channel: 'whatsapp', body: newTpl.body, sort_order: (templates?.length ?? 0) + 1 });
      await qc.invalidateQueries({ queryKey: ['templates'] });
      toast('Template created', 'success');
      setAddOpen(false); setNewTpl({ title: '', category: 'outreach', body: '' });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to create template', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.del('/api/templates', { id: toDelete.id });
      await qc.invalidateQueries({ queryKey: ['templates'] });
      toast('Template deleted', 'success');
      setToDelete(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const copyBody = async (t: Template) => {
    try {
      await navigator.clipboard.writeText(drafts[t.id] ?? t.body);
      setCopiedId(t.id);
      setTimeout(() => setCopiedId((c) => (c === t.id ? null : c)), 1500);
    } catch { toast('Copy failed', 'error'); }
  };

  return (
    <div className="p-5 sm:p-8 max-w-[1500px] mx-auto">
      <PageHeader
        title="Templates"
        subtitle="Ready-to-send WhatsApp message templates for leads, follow-ups and delivery."
        actions={
          <>
            {can('templates.create') && <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => { setNewErrors({}); setNewTpl({ title: '', category: categoryOptions[0]?.value ?? 'general', body: '' }); setAddOpen(true); }}>New template</Button>}
            {can('templates.edit') && <Button icon={<Save className="h-4 w-4" />} onClick={saveAll} loading={saving} disabled={dirtyCount === 0}>
              {dirtyCount > 0 ? `Save Templates (${dirtyCount})` : 'Save Templates'}
            </Button>}
          </>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-fg z-10" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates…" className="pl-10" />
        </div>
        <div className="w-48">
          <SearchableSelect value={categoryFilter} onChange={setCategoryFilter} placeholder="All categories"
            options={[{ value: '', label: 'All categories' }, ...categoryOptions]} />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-app rounded-2xl card-shadow">
          <EmptyState icon={<MessageSquareText className="h-6 w-6" />}
            title={search || categoryFilter ? 'No matching templates' : 'No templates yet'}
            description={search || categoryFilter ? 'Try adjusting your search or filters.' : 'Create your first message template to speed up outreach.'}
            action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => { setNewTpl({ title: '', category: categoryOptions[0]?.value ?? 'general', body: '' }); setAddOpen(true); }}>New template</Button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((t, i) => {
            const meta = catMeta(t.category);
            const value = drafts[t.id] ?? t.body;
            const dirty = value !== t.body;
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="bg-surface border border-app rounded-2xl card-shadow overflow-hidden flex flex-col">
                <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <h3 className="text-[15px] font-bold text-base-fg truncate">{t.title}</h3>
                    {dirty && <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" title="Unsaved changes" />}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge label={meta.label} color={meta.color} />
                    <button onClick={() => copyBody(t)} title="Copy" className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-2 hover:text-base-fg transition-colors">
                      {copiedId === t.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <button onClick={() => can('templates.delete') && setToDelete(t)} disabled={!can('templates.delete')} title="Delete" className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-30 disabled:pointer-events-none">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="px-5 pb-4 flex-1 flex flex-col">
                  <textarea
                    value={value}
                    onChange={(e) => setDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                    spellCheck={false}
                    className={cn(
                      'w-full flex-1 min-h-[230px] resize-y rounded-xl bg-surface-2 border px-4 py-3.5 text-[13.5px] leading-relaxed text-base-fg outline-none transition-all',
                      'focus:ring-2 focus:ring-offset-0 ring-brand focus:border-brand-500',
                      dirty ? 'border-amber-300 dark:border-amber-500/40' : 'border-app',
                    )}
                  />
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-subtle-fg">
                      <Variable className="h-3.5 w-3.5" /> {countVars(value)} variable{countVars(value) === 1 ? '' : 's'} · {value.length} chars
                    </span>
                    {dirty && <span className="text-[11.5px] font-semibold text-amber-600">Unsaved</span>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Variable helper */}
      {!isLoading && filtered.length > 0 && (
        <div className="mt-6 rounded-xl border border-app bg-surface-2 px-4 py-3 flex items-start gap-3">
          <Variable className="h-4.5 w-4.5 text-brand-600 shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-muted-fg leading-relaxed">
            Use <code className="px-1 py-0.5 rounded bg-surface border border-app text-[12px] font-semibold text-base-fg">{'{{Name}}'}</code>,{' '}
            <code className="px-1 py-0.5 rounded bg-surface border border-app text-[12px] font-semibold text-base-fg">{'{{BusinessName}}'}</code>,{' '}
            <code className="px-1 py-0.5 rounded bg-surface border border-app text-[12px] font-semibold text-base-fg">{'{{Demo Link}}'}</code> and other placeholders — they'll be filled in when you send the message.
          </p>
        </div>
      )}

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New template" size="max-w-lg"
        footer={<div className="flex items-center justify-end gap-2"><Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={createTemplate} loading={creating}>Create template</Button></div>}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Title" required error={newErrors.title}>
              <Input value={newTpl.title} onChange={(e) => setNewTpl((t) => ({ ...t, title: e.target.value }))} invalid={!!newErrors.title} placeholder="Website Demo Introduction" autoFocus />
            </Field>
            <Field label="Category">
              <SearchableSelect value={newTpl.category} onChange={(v) => setNewTpl((t) => ({ ...t, category: v }))} options={categoryOptions} placeholder="Select category" />
            </Field>
          </div>
          <Field label="Message" required error={newErrors.body} hint="Use {{variables}} for dynamic values">
            <textarea value={newTpl.body} onChange={(e) => setNewTpl((t) => ({ ...t, body: e.target.value }))}
              className={cn('w-full min-h-[180px] resize-y rounded-lg bg-surface border px-3.5 py-2.5 text-sm text-base-fg outline-none focus:ring-2 ring-brand focus:border-brand-500', newErrors.body ? 'border-red-400' : 'border-app')}
              placeholder="Hi {{Name}} 👋 …" />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete}
        title="Delete template" message={`Delete the "${toDelete?.title}" template? This can't be undone from the UI.`} loading={deleting} />
    </div>
  );
}
