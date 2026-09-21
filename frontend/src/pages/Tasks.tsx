import { useState, useMemo } from 'react';
import { Plus, CheckSquare, Search, Filter } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FilterBar from '../components/ui/FilterBar';
import { MultiSelect, SearchableSelect } from '../components/ui/SearchableSelect';
import TaskList from '../components/tasks/TaskList';
import TaskForm, { type TaskFormValues } from '../components/tasks/TaskForm';
import TaskDetail from '../components/tasks/TaskDetail';
import TaskUpdateModal from '../components/tasks/TaskUpdateModal';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useCreateTaskUpdate, type TaskFilters } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useEmployees } from '../hooks/useEmployees';
import { useMasters, toOptions } from '../hooks/useMasters';
import { usePermissions } from '../contexts/PermissionContext';
import { cn } from '../lib/utils';
import type { Task } from '../types';

type ScopeTab = 'all' | 'my_tasks' | 'team_tasks';

export default function Tasks() {
  const { can } = usePermissions();
  const { data: masters } = useMasters();
  const { data: projects } = useProjects();
  const { data: employees } = useEmployees();

  const [scope, setScope] = useState<ScopeTab>('all');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [moduleFilter, setModuleFilter] = useState<string[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState('');

  const queryFilters: TaskFilters = useMemo(
    () => ({
      scope,
      project_id: projectFilter || undefined,
      assigned_employee_id: employeeFilter || undefined,
    }),
    [scope, projectFilter, employeeFilter]
  );

  const { data: rawTasks, isLoading } = useTasks(queryFilters);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createTaskUpdate = useCreateTaskUpdate();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [workUpdateTask, setWorkUpdateTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Client-side filtering for search, status, priority, and module
  const filteredTasks = useMemo(() => {
    return (rawTasks || []).filter((t) => {
      const q = search.toLowerCase();
      const matchQ =
        !q ||
        [t.title, t.task_no ?? '', t.project?.project_name ?? '', t.project?.client ?? '', t.description ?? ''].some(
          (x) => x.toLowerCase().includes(q)
        );

      const matchStatus = statusFilter.length === 0 || statusFilter.includes(t.status);
      const matchPriority = priorityFilter.length === 0 || priorityFilter.includes(t.priority);
      const matchModule = moduleFilter.length === 0 || moduleFilter.includes(t.module ?? '');

      return matchQ && matchStatus && matchPriority && matchModule;
    });
  }, [rawTasks, search, statusFilter, priorityFilter, moduleFilter]);

  const handleSaveTask = async (v: TaskFormValues) => {
    const payload = {
      ...(v.id ? { id: v.id } : {}),
      task_no: v.task_no || undefined,
      project_id: v.project_id,
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
    };

    if (v.id) {
      await updateTask.mutateAsync(payload);
    } else {
      await createTask.mutateAsync(payload);
    }
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTask) return;
    await deleteTask.mutateAsync(deletingTask.id);
    setDeletingTask(null);
    if (selectedTask?.id === deletingTask.id) setSelectedTask(null);
  };

  const projectOptions = (projects || []).map((p) => ({ value: p.id, label: p.project_name }));
  const employeeOptions = (employees || [])
    .filter((e) => e.status === 'active')
    .map((e) => ({ value: e.id, label: e.employee_name }));

  return (
    <div className="p-5 sm:p-8 max-w-[1500px] mx-auto">
      <PageHeader
        title="Tasks"
        subtitle="Manage and track work execution across all project engagements."
        actions={
          can('tasks.create') ? (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditingTask(null); setIsFormOpen(true); }}>
              New Task
            </Button>
          ) : null
        }
      />

      {/* Scope Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-app mb-6 pb-2">
        {[
          { key: 'all', label: 'All Tasks' },
          { key: 'my_tasks', label: 'My Tasks' },
          { key: 'team_tasks', label: 'Team Tasks' },
        ].map((tab) => {
          const active = scope === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setScope(tab.key as ScopeTab)}
              className={cn(
                'px-4 h-9 text-sm font-semibold rounded-lg transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-300'
                  : 'text-muted-fg hover:text-base-fg hover:bg-surface-2'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tasks, task no, projects…"
        filters={
          <>
            <div className="w-44">
              <SearchableSelect
                value={projectFilter}
                onChange={setProjectFilter}
                options={projectOptions}
                placeholder="All Projects"
                clearable
              />
            </div>

            <div className="w-40">
              <MultiSelect
                values={statusFilter}
                onChange={setStatusFilter}
                options={toOptions(masters, 'task_status')}
                placeholder="All Statuses"
              />
            </div>

            <div className="w-36">
              <MultiSelect
                values={priorityFilter}
                onChange={setPriorityFilter}
                options={toOptions(masters, 'task_priority')}
                placeholder="All Priorities"
              />
            </div>

            <div className="w-40">
              <MultiSelect
                values={moduleFilter}
                onChange={setModuleFilter}
                options={toOptions(masters, 'task_module')}
                placeholder="All Modules"
              />
            </div>

            {scope !== 'my_tasks' && (
              <div className="w-40">
                <SearchableSelect
                  value={employeeFilter}
                  onChange={setEmployeeFilter}
                  options={employeeOptions}
                  placeholder="All Assigned"
                  clearable
                />
              </div>
            )}
          </>
        }
      />

      <div className="bg-surface border border-app rounded-2xl card-shadow mt-6">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="h-6 w-6 text-subtle-fg" />}
            title={search || statusFilter.length || projectFilter ? 'No matching tasks' : 'No tasks created yet'}
            description={
              search || statusFilter.length || projectFilter
                ? 'Try adjusting your search or filters.'
                : 'Create tasks inside a project or click "New Task" above.'
            }
            action={
              can('tasks.create') ? (
                <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditingTask(null); setIsFormOpen(true); }}>
                  New Task
                </Button>
              ) : null
            }
          />
        ) : (
          <TaskList
            tasks={filteredTasks}
            masters={masters}
            onTaskClick={(t) => setSelectedTask(t)}
            onEdit={(t) => { setEditingTask(t); setIsFormOpen(true); }}
            onDelete={(t) => setDeletingTask(t)}
            onWorkUpdate={(t) => setWorkUpdateTask(t)}
            stickyHeader
          />

        )}
      </div>

      {/* Task Creation Drawer */}
      <TaskForm
        open={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingTask(null); }}
        initial={editingTask}
        projects={projects}
        employees={employees}
        masters={masters}
        onSubmit={handleSaveTask}
        saving={createTask.isPending || updateTask.isPending}
      />

      {/* Task Detail Drawer */}
      <TaskDetail
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        masters={masters}
        onEdit={() => { setEditingTask(selectedTask); setIsFormOpen(true); }}
        onDelete={() => setDeletingTask(selectedTask)}
        onWorkUpdate={() => setWorkUpdateTask(selectedTask)}
      />

      {/* Work Update Modal */}
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

      {/* Confirm Task Deletion */}
      <ConfirmDialog
        open={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Task"
        message={`Are you sure you want to delete task "${deletingTask?.title}"?`}
        loading={deleteTask.isPending}
      />
    </div>
  );
}
