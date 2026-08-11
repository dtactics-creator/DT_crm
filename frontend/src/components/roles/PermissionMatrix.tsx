import { useState, useEffect } from 'react';
import { Check, ShieldCheck, Crown } from 'lucide-react';
import Drawer from '../ui/Drawer';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { usePermissionCatalog } from '../../hooks/usePermissionCatalog';
import { usePermissions } from '../../contexts/PermissionContext';
import type { Role } from '../../types';

function Checkbox({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onChange} disabled={disabled}
      className={cn('h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0',
        checked ? 'bg-brand-600 border-brand-600' : 'bg-surface border-strong hover:border-brand-400',
        disabled && 'opacity-40 cursor-not-allowed')}>
      {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
    </button>
  );
}

export default function PermissionMatrix({ open, onClose, role, canEdit }: {
  open: boolean;
  onClose: () => void;
  role: Role | null;
  canEdit: boolean;
}) {
  const { data: catalog, isLoading } = usePermissionCatalog(open);
  const { refetch: refetchMe } = usePermissions();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [superAdmin, setSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !role) return;
    setLoading(true);
    api.get<{ permissions: string[] }>(`/api/role-permissions?role_id=${role.id}`)
      .then((r) => {
        const set = new Set(r.permissions);
        setSuperAdmin(set.has('*'));
        setSelected(set);
      })
      .catch(() => { setSelected(new Set()); setSuperAdmin(false); })
      .finally(() => setLoading(false));
  }, [open, role]);

  const toggle = (key: string) => {
    if (!canEdit) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleModule = (keys: string[], allOn: boolean) => {
    if (!canEdit) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOn) keys.forEach((k) => next.delete(k));
      else keys.forEach((k) => next.add(k));
      return next;
    });
  };

  const save = async () => {
    if (!role) return;
    setSaving(true);
    try {
      const permissions = superAdmin ? ['*'] : Array.from(selected).filter((p) => p !== '*');
      await api.put('/api/role-permissions', { role_id: role.id, permissions });
      await qc.invalidateQueries({ queryKey: ['role-permissions', role.id] });
      await refetchMe();
      toast('Permissions saved', 'success');
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to save permissions', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = superAdmin ? 'All' : Array.from(selected).filter((p) => p !== '*').length;

  return (
    <Drawer open={open} onClose={onClose}
      title="Manage permissions"
      subtitle={role ? `${role.name} · ${selectedCount === 'All' ? 'Full access' : `${selectedCount} permission${selectedCount === 1 ? '' : 's'}`}` : ''}
      width="max-w-2xl"
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] text-muted-fg">{canEdit ? 'Changes apply to everyone with this role.' : 'Read-only — you lack roles.edit permission.'}</p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            {canEdit && <Button onClick={save} loading={saving}>Save permissions</Button>}
          </div>
        </div>
      }>
      {isLoading || loading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
        <div className="space-y-4">
          {/* Super admin toggle */}
          <button type="button" onClick={() => canEdit && setSuperAdmin((v) => !v)} disabled={!canEdit}
            className={cn('w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-colors',
              superAdmin ? 'border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30' : 'border-app hover:bg-surface-2',
              !canEdit && 'cursor-not-allowed')}>
            <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <Crown className="h-4.5 w-4.5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-bold text-base-fg">Full access (Super Admin)</p>
              <p className="text-[12px] text-muted-fg">Grants every permission across all modules, including future ones.</p>
            </div>
            <Checkbox checked={superAdmin} onChange={() => canEdit && setSuperAdmin((v) => !v)} disabled={!canEdit} />
          </button>

          <div className={cn('space-y-2.5', superAdmin && 'opacity-40 pointer-events-none')}>
            <div className="flex items-center gap-2 px-1">
              <ShieldCheck className="h-4 w-4 text-subtle-fg" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Module permissions</p>
            </div>

            {(catalog || []).map((mod) => {
              const keys = mod.actions.map((a) => a.key);
              const onCount = keys.filter((k) => selected.has(k)).length;
              const allOn = onCount === keys.length;
              return (
                <div key={mod.module} className="rounded-xl border border-app overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-surface-2 border-b border-app">
                    <Checkbox checked={allOn} onChange={() => toggleModule(keys, allOn)} disabled={!canEdit} />
                    <p className="text-[13.5px] font-bold text-base-fg flex-1">{mod.label}</p>
                    <span className="text-[11px] font-semibold text-subtle-fg tabular">{onCount}/{keys.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-3 px-4 py-3.5">
                    {mod.actions.map((a) => (
                      <label key={a.key} className={cn('flex items-center gap-2', canEdit ? 'cursor-pointer' : 'cursor-default')}>
                        <Checkbox checked={selected.has(a.key)} onChange={() => toggle(a.key)} disabled={!canEdit} />
                        <span className="text-[13px] font-medium text-base-fg select-none">{a.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Drawer>
  );
}
