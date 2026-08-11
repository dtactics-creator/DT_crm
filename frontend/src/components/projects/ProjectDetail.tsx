import Drawer from '../ui/Drawer';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import { Pencil, Trash2, Building2, Calendar, Hash, Link2, DollarSign, Layers, ExternalLink } from 'lucide-react';
import type { Project, MasterItem } from '../../types';
import { makeLookup } from '../../hooks/useMasters';
import { usePermissions } from '../../contexts/PermissionContext';
import { formatCurrency, formatDate } from '../../lib/utils';

export default function ProjectDetail({ open, onClose, project, masters, onEdit, onDelete }: {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  masters: MasterItem[] | undefined;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const lookup = makeLookup(masters);
  const { can } = usePermissions();
  if (!project) return null;
  const statusColor = lookup.color('project_status', project.status);
  const stack = Array.isArray(project.technology_stack) ? project.technology_stack : [];
  const urls = Array.isArray(project.urls) ? project.urls : [];

  const rows = [
    { icon: Building2, label: 'Client', value: project.client },
    { icon: Hash, label: 'Project No', value: project.project_no || '—' },
    { icon: Link2, label: 'Lead reference', value: project.lead_no || project.lead?.lead_no || '—' },
    { icon: Layers, label: 'Type', value: lookup.label('project_type', project.project_type) },
    { icon: DollarSign, label: 'Cost', value: formatCurrency(project.project_cost) },
    { icon: Calendar, label: 'Start date', value: formatDate(project.start_date) },
    { icon: Calendar, label: 'Expected delivery', value: formatDate(project.expected_delivery) },
  ];

  return (
    <Drawer
      open={open} onClose={onClose}
      title={project.project_name}
      subtitle={`${project.project_no || 'Project'} · ${project.client}`}
      footer={
        <div className="flex items-center justify-between gap-2">
          {can('projects.delete')
            ? <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={onDelete}>Delete</Button>
            : <span />}
          {can('projects.edit') && <Button icon={<Pencil className="h-4 w-4" />} onClick={onEdit}>Edit project</Button>}
        </div>
      }
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-app bg-surface-2 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[16px] font-bold text-base-fg">{project.project_name}</p>
              <p className="text-[13px] text-muted-fg mt-0.5">{project.project_no || 'No code'} · {lookup.label('project_type', project.project_type)}</p>
            </div>
            <span className="text-[16px] font-extrabold text-base-fg tabular shrink-0">{formatCurrency(project.project_cost)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Badge label={lookup.label('project_status', project.status)} color={statusColor} dot />
            <Badge label={`${lookup.label('priority', project.priority)} priority`} color={lookup.color('priority', project.priority)} />
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-semibold text-muted-fg">Progress</span>
              <span className="text-[12px] font-bold text-base-fg tabular">{project.progress}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-surface overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${project.progress}%`, backgroundColor: statusColor }} />
            </div>
          </div>
        </div>

        {stack.length > 0 && (
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg mb-3">Technology stack</p>
            <div className="flex flex-wrap gap-2">
              {stack.map((s) => <Badge key={s} label={lookup.label('technology_stack', s)} color={lookup.color('technology_stack', s)} />)}
            </div>
          </div>
        )}

        {urls.length > 0 && (
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg mb-3">Project URLs</p>
            <div className="space-y-2">
              {urls.map((u, i) => (
                <a key={i} href={u.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-app p-3 hover:bg-surface-2 hover:border-strong transition-colors group">
                  <span className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${lookup.color('url_type', u.type)}18` }}>
                    <Link2 className="h-4 w-4" style={{ color: lookup.color('url_type', u.type) }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-base-fg">{lookup.label('url_type', u.type)}</p>
                    <p className="text-[12px] text-muted-fg truncate">{u.url}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-subtle-fg group-hover:text-brand-600 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-app divide-y divide-[color:var(--border)]">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 px-4 py-3">
              <r.icon className="h-4 w-4 text-subtle-fg shrink-0" />
              <span className="text-[12.5px] font-medium text-muted-fg w-32 shrink-0">{r.label}</span>
              <span className="text-[13px] font-semibold text-base-fg truncate">{r.value}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {project.manager && (
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg mb-2">Manager</p>
              <div className="flex items-center gap-3 rounded-xl border border-app p-3">
                <Avatar name={project.manager.employee_name} size={36} />
                <div className="min-w-0"><p className="text-[13px] font-semibold text-base-fg truncate">{project.manager.employee_name}</p><p className="text-[11.5px] text-muted-fg truncate">{project.manager.role}</p></div>
              </div>
            </div>
          )}
          {project.assigned_employee && (
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg mb-2">Assigned</p>
              <div className="flex items-center gap-3 rounded-xl border border-app p-3">
                <Avatar name={project.assigned_employee.employee_name} size={36} />
                <div className="min-w-0"><p className="text-[13px] font-semibold text-base-fg truncate">{project.assigned_employee.employee_name}</p><p className="text-[11.5px] text-muted-fg truncate">{project.assigned_employee.role}</p></div>
              </div>
            </div>
          )}
        </div>

        {project.remarks && (
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg mb-2">Remarks</p>
            <p className="text-[13px] text-muted-fg leading-relaxed rounded-xl border border-app bg-surface-2 p-4">{project.remarks}</p>
          </div>
        )}

        <p className="text-[11.5px] text-subtle-fg">Created {formatDate(project.created_at)} · Updated {formatDate(project.updated_at)}</p>
      </div>
    </Drawer>
  );
}
