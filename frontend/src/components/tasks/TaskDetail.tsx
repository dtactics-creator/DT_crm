import Drawer from '../ui/Drawer';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Skeleton from '../ui/Skeleton';
import { Pencil, Trash2, Calendar, Clock, FolderKanban, CheckCircle2, MessageSquarePlus, User, Tag } from 'lucide-react';
import type { Task, MasterItem } from '../../types';
import { makeLookup } from '../../hooks/useMasters';
import { usePermissions } from '../../contexts/PermissionContext';
import { useTaskUpdates } from '../../hooks/useTasks';
import { formatDate } from '../../lib/utils';

export default function TaskDetail({
  open,
  onClose,
  task,
  masters,
  onEdit,
  onDelete,
  onWorkUpdate,
}: {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  masters: MasterItem[] | undefined;
  onEdit?: () => void;
  onDelete?: () => void;
  onWorkUpdate?: () => void;
}) {
  const { can } = usePermissions();
  const lookup = makeLookup(masters);
  const { data: updates, isLoading: isUpdatesLoading } = useTaskUpdates(task?.id);

  if (!task) return null;

  const statusColor = lookup.color('task_status', task.status);
  const priorityColor = lookup.color('task_priority', task.priority);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={task.title}
      subtitle={`${task.task_no || 'Task'} · ${task.project?.project_name || 'Project'}`}
      footer={
        <div className="flex items-center justify-between gap-2">
          {can('tasks.delete') && onDelete ? (
            <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={onDelete}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {can('tasks.edit') && onWorkUpdate && (
              <Button variant="secondary" size="sm" icon={<MessageSquarePlus className="h-4 w-4" />} onClick={onWorkUpdate}>
                Work Update
              </Button>
            )}
            {can('tasks.edit') && onEdit && (
              <Button size="sm" icon={<Pencil className="h-4 w-4" />} onClick={onEdit}>
                Edit Task
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Summary Card */}
        <div className="rounded-2xl border border-app bg-surface-2 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[16px] font-bold text-base-fg">{task.title}</p>
              <p className="text-[13px] text-muted-fg mt-0.5">
                {task.task_no || 'No code'} · Module: {lookup.label('task_module', task.module)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Badge label={lookup.label('task_status', task.status)} color={statusColor} dot />
            <Badge label={`${lookup.label('task_priority', task.priority)} priority`} color={priorityColor} />
            {task.module && <Badge label={lookup.label('task_module', task.module)} color="#6366f1" />}
          </div>
        </div>

        {/* Info Rows */}
        <div className="rounded-2xl border border-app divide-y divide-[color:var(--border)]">
          <div className="flex items-center gap-3 px-4 py-3">
            <FolderKanban className="h-4 w-4 text-subtle-fg shrink-0" />
            <span className="text-[12.5px] font-medium text-muted-fg w-32 shrink-0">Project</span>
            <span className="text-[13px] font-semibold text-brand-600 truncate">
              {task.project?.project_name || '—'}
            </span>
          </div>

          <div className="flex items-center gap-3 px-4 py-3">
            <Calendar className="h-4 w-4 text-subtle-fg shrink-0" />
            <span className="text-[12.5px] font-medium text-muted-fg w-32 shrink-0">Start Date</span>
            <span className="text-[13px] font-semibold text-base-fg tabular">{formatDate(task.start_date)}</span>
          </div>

          <div className="flex items-center gap-3 px-4 py-3">
            <Calendar className="h-4 w-4 text-subtle-fg shrink-0" />
            <span className="text-[12.5px] font-medium text-muted-fg w-32 shrink-0">Due Date</span>
            <span className="text-[13px] font-semibold text-base-fg tabular">{formatDate(task.due_date)}</span>
          </div>

          <div className="flex items-center gap-3 px-4 py-3">
            <Clock className="h-4 w-4 text-subtle-fg shrink-0" />
            <span className="text-[12.5px] font-medium text-muted-fg w-32 shrink-0">Estimated Hours</span>
            <span className="text-[13px] font-semibold text-base-fg tabular">{task.estimated_hours || 0} hrs</span>
          </div>

          {task.completed_at && (
            <div className="flex items-center gap-3 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-[12.5px] font-medium text-muted-fg w-32 shrink-0">Completed At</span>
              <span className="text-[13px] font-semibold text-emerald-600 tabular">{formatDate(task.completed_at)}</span>
            </div>
          )}
        </div>

        {/* Assigned Employee Card */}
        <div>
          <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg mb-2">Assigned Member</p>
          {task.assigned_employee ? (
            <div className="flex items-center gap-3 rounded-xl border border-app p-3 bg-surface">
              <Avatar name={task.assigned_employee.employee_name} size={40} />
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold text-base-fg truncate">{task.assigned_employee.employee_name}</p>
                <p className="text-[12px] text-muted-fg truncate">{task.assigned_employee.role}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-app p-4 text-center text-muted-fg text-sm">
              No member assigned yet.
            </div>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg mb-2">Description</p>
            <div className="rounded-xl border border-app bg-surface-2 p-4 text-[13px] text-muted-fg leading-relaxed whitespace-pre-wrap">
              {task.description}
            </div>
          </div>
        )}

        {/* Additional Notes */}
        {task.additional_notes && (
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg mb-2">Additional Notes</p>
            <div className="rounded-xl border border-app bg-surface-2 p-4 text-[13px] text-muted-fg leading-relaxed whitespace-pre-wrap">
              {task.additional_notes}
            </div>
          </div>
        )}

        {/* Attachments */}
        {task.attachments && task.attachments.length > 0 && (
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg mb-2">Attachments</p>
            <div className="space-y-2">
              {task.attachments.map((att, i) => (
                <a
                  key={i}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-app bg-surface-2 hover:bg-surface transition-colors text-xs group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-base-fg truncate group-hover:text-brand-600">{att.name}</span>
                  </div>
                  {att.size ? <span className="text-subtle-fg shrink-0">{(att.size / 1024).toFixed(1)} KB</span> : null}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Work Updates & Activity Timeline */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg">Task Activity &amp; Work Updates</p>
            {can('tasks.edit') && onWorkUpdate && (
              <Button size="sm" variant="secondary" icon={<MessageSquarePlus className="h-3.5 w-3.5" />} onClick={onWorkUpdate}>
                Add Update
              </Button>
            )}
          </div>

          {isUpdatesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ) : !updates || updates.length === 0 ? (
            <div className="rounded-xl border border-app bg-surface p-4 text-center text-muted-fg text-xs">
              No activity updates logged yet.
            </div>
          ) : (
            <div className="space-y-3">
              {updates.map((u) => (
                <div key={u.id} className="rounded-xl border border-app bg-surface-2 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.employee?.employee_name || 'System'} size={20} />
                      <span className="text-[12px] font-bold text-base-fg">
                        {u.employee?.employee_name || 'System'}
                      </span>
                    </div>
                    <span className="text-[10px] text-subtle-fg tabular">
                      {new Date(u.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-[12.5px] text-muted-fg leading-relaxed whitespace-pre-wrap">
                    {u.update_note}
                  </p>

                  {u.status_from && u.status_to && u.status_from !== u.status_to && (
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] font-medium text-subtle-fg">
                      Status changed:
                      <Badge label={lookup.label('task_status', u.status_from)} color="#64748b" />
                      <span>──►</span>
                      <Badge label={lookup.label('task_status', u.status_to)} color={lookup.color('task_status', u.status_to)} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-[11.5px] text-subtle-fg pt-2 border-t border-app">
          Created {formatDate(task.created_at)} · Updated {formatDate(task.updated_at)}
        </p>
      </div>
    </Drawer>
  );
}
