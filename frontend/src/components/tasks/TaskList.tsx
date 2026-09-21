import { useMemo } from 'react';
import DataTable, { type Column } from '../DataTable';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import RowActions from '../ui/RowActions';
import { Pencil, Trash2, Eye, MessageSquarePlus } from 'lucide-react';
import { usePermissions } from '../../contexts/PermissionContext';
import { makeLookup } from '../../hooks/useMasters';
import { formatDate } from '../../lib/utils';
import type { Task, MasterItem } from '../../types';

export default function TaskList({
  tasks,
  masters,
  onTaskClick,
  onEdit,
  onDelete,
  onWorkUpdate,
  hideProjectColumn = false,
  stickyHeader = false,
}: {
  tasks: Task[] | undefined;
  masters: MasterItem[] | undefined;
  onTaskClick?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onWorkUpdate?: (task: Task) => void;
  hideProjectColumn?: boolean;
  stickyHeader?: boolean;
}) {
  const { can } = usePermissions();
  const lookup = useMemo(() => makeLookup(masters), [masters]);

  const columns = useMemo(() => {
    const cols: Column<Task>[] = [
      {
        key: 'task_no',
        header: 'Task No',
        sortValue: (r) => r.task_no ?? '',
        className: 'font-semibold tabular text-brand-600 w-28',
        render: (r) => r.task_no || '—',
      },
      {
        key: 'title',
        header: 'Task Title',
        sortValue: (r) => r.title.toLowerCase(),
        render: (r) => (
          <div className="min-w-0">
            <p className="font-semibold text-base-fg truncate">{r.title}</p>
            {r.module && (
              <p className="text-[11.5px] text-muted-fg truncate mt-0.5">
                Module: <span className="font-medium text-base-fg">{lookup.label('task_module', r.module)}</span>
              </p>
            )}
          </div>
        ),
      },
    ];

    if (!hideProjectColumn) {
      cols.push({
        key: 'project',
        header: 'Project & Client',
        sortValue: (r) => r.project?.project_name ?? '',
        render: (r) => (
          <div className="min-w-0">
            <p className="font-semibold text-brand-600 truncate text-[13px]">{r.project?.project_name || '—'}</p>
            <p className="text-[11.5px] text-muted-fg truncate">{r.project?.client || '—'}</p>
          </div>
        ),
      });
    }

    cols.push(
      {
        key: 'assigned',
        header: 'Assigned To',
        sortValue: (r) => r.assigned_employee?.employee_name ?? '',
        render: (r) =>
          r.assigned_employee ? (
            <div className="flex items-center gap-2">
              <Avatar name={r.assigned_employee.employee_name} size={24} />
              <span className="text-[12.5px] text-muted-fg truncate">{r.assigned_employee.employee_name}</span>
            </div>
          ) : (
            <span className="text-subtle-fg text-[12.5px]">Unassigned</span>
          ),
      },
      {
        key: 'priority',
        header: 'Priority',
        sortValue: (r) => r.priority,
        render: (r) => (
          <Badge
            label={lookup.label('task_priority', r.priority)}
            color={lookup.color('task_priority', r.priority)}
          />
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortValue: (r) => r.status,
        render: (r) => (
          <Badge
            label={lookup.label('task_status', r.status)}
            color={lookup.color('task_status', r.status)}
            dot
          />
        ),
      },
      {
        key: 'due_date',
        header: 'Due Date',
        sortValue: (r) => r.due_date ?? '',
        render: (r) => (
          <span className="text-muted-fg text-[12.5px] tabular">{formatDate(r.due_date)}</span>
        ),
      },
      {
        key: 'actions',
        header: '',
        headerClassName: 'w-12',
        className: 'text-right',
        render: (r) => (
          <RowActions
            actions={[
              { label: 'View task details', icon: <Eye className="h-4 w-4" />, onClick: () => onTaskClick?.(r) },
              ...(can('tasks.edit') && onWorkUpdate
                ? [{ label: 'Post work update', icon: <MessageSquarePlus className="h-4 w-4" />, onClick: () => onWorkUpdate(r) }]
                : []),
              ...(can('tasks.edit') && onEdit
                ? [{ label: 'Edit task', icon: <Pencil className="h-4 w-4" />, onClick: () => onEdit(r) }]
                : []),
              ...(can('tasks.delete') && onDelete
                ? [{ label: 'Delete task', icon: <Trash2 className="h-4 w-4" />, onClick: () => onDelete(r), danger: true }]
                : []),
            ]}
          />
        ),
      }
    );

    return cols;
  }, [hideProjectColumn, lookup, can, onTaskClick, onEdit, onDelete, onWorkUpdate]);

  return (
    <DataTable
      data={tasks || []}
      columns={columns}
      rowKey={(r) => r.id}
      onRowClick={onTaskClick}
      stickyHeader={stickyHeader}
    />
  );
}
