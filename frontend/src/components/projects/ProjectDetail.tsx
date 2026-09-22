import { useState } from 'react';
import Drawer from '../ui/Drawer';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import EmptyState from '../ui/EmptyState';
import ConfirmDialog from '../ui/ConfirmDialog';
import TaskList from '../tasks/TaskList';
import TaskForm, { type TaskFormValues } from '../tasks/TaskForm';
import TaskDetail from '../tasks/TaskDetail';
import TaskUpdateModal from '../tasks/TaskUpdateModal';
import { Pencil, Trash2, Building2, Calendar, Hash, Link2, DollarSign, Layers, ExternalLink, CalendarClock, Plus, CheckSquare } from 'lucide-react';
import type { Project, MasterItem, Task } from '../../types';
import { makeLookup } from '../../hooks/useMasters';
import { usePermissions } from '../../contexts/PermissionContext';
import { useEmployees } from '../../hooks/useEmployees';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useCreateTaskUpdate } from '../../hooks/useTasks';
import { formatCurrency, formatDate } from '../../lib/utils';

export default function ProjectDetail({ open, onClose, project, masters, isProjectManagementContext = false, onEdit, onDelete, onNextFollowUp }: {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  masters: MasterItem[] | undefined;
  isProjectManagementContext?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onNextFollowUp?: () => void;
}) {
  const lookup = makeLookup(masters);
  const { can } = usePermissions();
  const { data: employees } = useEmployees();

  // Tasks hooks & local state (only active when in Project Management context)
  const { data: projectTasks, isLoading: isTasksLoading } = useTasks(
    project?.id ? { project_id: project.id } : undefined,
    { enabled: isProjectManagementContext && !!project?.id }
  );
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createTaskUpdate = useCreateTaskUpdate();

  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [workUpdateTask, setWorkUpdateTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  if (!project) return null;
  const statusColor = lookup.color('project_status', project.status);
  const stack = Array.isArray(project.technology_stack) ? project.technology_stack : [];
  const urls = Array.isArray(project.urls) ? project.urls : [];

  const handleSaveTask = async (v: TaskFormValues) => {
    const payload = {
      ...(v.id ? { id: v.id } : {}),
      task_no: v.task_no || undefined,
      project_id: project.id, // Auto-bound project context
      title: v.title,
      description: v.description || null,
      module: v.module || null,
      assigned_employee_id: v.assigned_employee_id || null,
      status: v.status || 'assigned',
      priority: v.priority || 'medium',
      start_date: v.start_date || null,
      due_date: v.due_date || null,
      estimated_hours: v.estimated_hours ? Number(v.estimated_hours) : 0,
      additional_notes: v.additional_notes || null,
      attachments: v.attachments || [],
    };

    if (v.id) {
      await updateTask.mutateAsync(payload);
    } else {
      await createTask.mutateAsync(payload);
    }
    setIsTaskFormOpen(false);
    setEditingTask(null);
  };

  const handleDeleteTaskConfirm = async () => {
    if (!deletingTask) return;
    await deleteTask.mutateAsync(deletingTask.id);
    setDeletingTask(null);
    if (selectedTask?.id === deletingTask.id) setSelectedTask(null);
  };

  const rows = [
    { icon: Building2, label: 'Client', value: project.client },
    { icon: Hash, label: 'Project No', value: project.project_no || '—' },
    { icon: Link2, label: 'Lead reference', value: project.lead_no || project.lead?.lead_no || '—' },
    { icon: Layers, label: 'Type', value: lookup.label('project_type', project.project_type) },
    { icon: Building2, label: 'Industry', value: lookup.label('industry', project.industry) },
    ...(can('projects.view_cost') ? [{ icon: DollarSign, label: 'Budget', value: formatCurrency(project.project_cost) }] : []),
    { icon: Calendar, label: 'Start date', value: formatDate(project.start_date) },
    { icon: Calendar, label: 'Expected delivery', value: formatDate(project.expected_delivery) },
    { icon: CalendarClock, label: 'Next follow-up', value: formatDate(project.next_follow_up) },
  ];

  return (
    <>
      <Drawer
        open={open} onClose={onClose}
        title={project.project_name}
        subtitle={`${project.project_no || 'Project'} · ${project.client}`}
        footer={
          <div className="flex items-center justify-between gap-2">
            {can('projects.delete')
              ? <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={onDelete}>Delete</Button>
              : <span />}
            <div className="flex items-center gap-2">
              {onNextFollowUp && <Button variant="secondary" size="sm" icon={<CalendarClock className="h-4 w-4" />} onClick={onNextFollowUp}>Next follow-up</Button>}
              {can('projects.edit') && <Button size="sm" icon={<Pencil className="h-4 w-4" />} onClick={onEdit}>Edit project</Button>}
            </div>
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
              {can('projects.view_cost') && <span className="text-[16px] font-extrabold text-base-fg tabular shrink-0">{formatCurrency(project.project_cost)}</span>}
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

          {/* Project Tasks Section (ONLY rendered in Project Management context) */}
          {isProjectManagementContext && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg">Project Tasks</p>
                  <p className="text-[12px] text-muted-fg">Tasks associated with this project</p>
                </div>
                {can('tasks.create') && (
                  <Button
                    size="sm"
                    icon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() => { setEditingTask(null); setIsTaskFormOpen(true); }}
                  >
                    Create Task
                  </Button>
                )}
              </div>

              {isTasksLoading ? (
                <div className="animate-pulse bg-surface-2 h-32 rounded-xl" />
              ) : !projectTasks || projectTasks.length === 0 ? (
                <div className="rounded-xl border border-app bg-surface-2 p-6 text-center">
                  <EmptyState
                    icon={<CheckSquare className="h-5 w-5 text-subtle-fg" />}
                    title="No tasks yet"
                    description="Create tasks to assign modules and track delivery progress for this project."
                    action={
                      can('tasks.create') ? (
                        <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => { setEditingTask(null); setIsTaskFormOpen(true); }}>
                          Create Task
                        </Button>
                      ) : null
                    }
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-app bg-surface overflow-hidden">
                  <TaskList
                    tasks={projectTasks}
                    masters={masters}
                    hideProjectColumn
                    onTaskClick={(t) => setSelectedTask(t)}
                    onEdit={(t) => { setEditingTask(t); setIsTaskFormOpen(true); }}
                    onDelete={(t) => setDeletingTask(t)}
                    onWorkUpdate={(t) => setWorkUpdateTask(t)}
                  />
                </div>
              )}
            </div>
          )}

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
            {project.lead_coordinator && (
              <div>
                <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg mb-2">Lead Coordinator</p>
                <div className="flex items-center gap-3 rounded-xl border border-app p-3">
                  <Avatar name={project.lead_coordinator.employee_name} size={36} />
                  <div className="min-w-0"><p className="text-[13px] font-semibold text-base-fg truncate">{project.lead_coordinator.employee_name}</p><p className="text-[11.5px] text-muted-fg truncate">{project.lead_coordinator.role}</p></div>
                </div>
              </div>
            )}
          </div>

          {project.remarks && (
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-wider text-subtle-fg mb-2">Remarks</p>
              <div className="space-y-2.5">
                {project.remarks.split(/\n\n(?:---\n\n)?/).filter(r => r.trim() && r.trim() !== '---').map((r, i) => {
                  const text = r.trim();
                  const match = text.match(/^\[(\d{4}-\d{2}-\d{2})\]\s*(.*)$/s);
                  const dateLabel = match ? formatDate(match[1]) : (i === 0 ? formatDate(project.created_at) : 'Original Note');
                  const content = match ? match[2] : text;
                  return (
                    <div key={i} className="rounded-xl border border-app bg-surface-2 p-3.5 shadow-sm">
                      {dateLabel && <div className="mb-1.5"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-600 border border-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/20">{dateLabel}</span></div>}
                      <div className="text-[13px] text-muted-fg leading-relaxed whitespace-pre-wrap break-words">{content}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-[11.5px] text-subtle-fg">Created {formatDate(project.created_at)} · Updated {formatDate(project.updated_at)}</p>
        </div>
      </Drawer>

      {/* Task Creation & Editing Drawer (with bound Project Context) */}
      <TaskForm
        open={isTaskFormOpen}
        onClose={() => { setIsTaskFormOpen(false); setEditingTask(null); }}
        initial={editingTask}
        projectContext={project}
        employees={employees}
        masters={masters}
        onSubmit={handleSaveTask}
        saving={createTask.isPending || updateTask.isPending}
      />

      {/* Task Details Drawer */}
      <TaskDetail
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        masters={masters}
        onEdit={() => { setEditingTask(selectedTask); setIsTaskFormOpen(true); }}
        onDelete={() => setDeletingTask(selectedTask)}
        onWorkUpdate={() => setWorkUpdateTask(selectedTask)}
      />

      {/* Task Work Update Modal */}
      <TaskUpdateModal
        open={!!workUpdateTask}
        onClose={() => setWorkUpdateTask(null)}
        task={workUpdateTask}
        masters={masters}
        saving={createTaskUpdate.isPending}
        onSubmit={async (data) => {
          await createTaskUpdate.mutateAsync(data);
          setWorkUpdateTask(null);
        }}
      />

      {/* Task Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDeleteTaskConfirm}
        title="Delete Task"
        message={`Are you sure you want to delete task "${deletingTask?.title}"?`}
        loading={deleteTask.isPending}
      />
    </>
  );
}
