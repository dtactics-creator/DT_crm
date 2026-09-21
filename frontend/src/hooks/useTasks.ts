import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import type { Task, TaskUpdate } from '../types';

export interface TaskFilters {
  project_id?: string;
  assigned_employee_id?: string;
  status?: string;
  priority?: string;
  module?: string;
  scope?: 'all' | 'my_tasks' | 'team_tasks';
}

export function useTasks(filters?: TaskFilters, options?: { enabled?: boolean }) {
  const queryParams = new URLSearchParams();
  if (filters?.project_id) queryParams.set('project_id', filters.project_id);
  if (filters?.assigned_employee_id) queryParams.set('assigned_employee_id', filters.assigned_employee_id);
  if (filters?.status) queryParams.set('status', filters.status);
  if (filters?.priority) queryParams.set('priority', filters.priority);
  if (filters?.module) queryParams.set('module', filters.module);
  if (filters?.scope) queryParams.set('scope', filters.scope);

  const qs = queryParams.toString();
  const url = `/api/tasks${qs ? `?${qs}` : ''}`;

  return useQuery<Task[]>({
    queryKey: ['tasks', filters],
    queryFn: () => api.get<Task[]>(url),
    enabled: options?.enabled ?? true,
  });
}

export function useTaskDetails(id?: string | null) {
  return useQuery<Task>({
    queryKey: ['tasks', id],
    queryFn: () => api.get<Task>(`/api/tasks?id=${id}`),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: Partial<Task>) => api.post<Task>('/api/tasks', payload),
    onSuccess: (data) => {
      toast(`Created task ${data.task_no || data.title}`, 'success');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['audit_logs'] });
    },
    onError: (err: Error) => {
      toast(err.message || 'Failed to create task', 'error');
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: Partial<Task>) => api.put<Task>('/api/tasks', payload),
    onSuccess: (data) => {
      toast(`Updated task ${data.task_no || data.title}`, 'success');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['audit_logs'] });
    },
    onError: (err: Error) => {
      toast(err.message || 'Failed to update task', 'error');
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: boolean }>('/api/tasks', { id }),
    onSuccess: () => {
      toast('Deleted task', 'success');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['audit_logs'] });
    },
    onError: (err: Error) => {
      toast(err.message || 'Failed to delete task', 'error');
    },
  });
}


export function useTaskUpdates(taskId?: string | null) {
  return useQuery<TaskUpdate[]>({
    queryKey: ['task_updates', taskId],
    queryFn: () => api.get<TaskUpdate[]>(`/api/task-updates?task_id=${taskId}`),
    enabled: !!taskId,
  });
}

export function useCreateTaskUpdate() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: { task_id: string; update_note: string; status_to?: string }) =>
      api.post<TaskUpdate>('/api/task-updates', payload),
    onSuccess: (_, vars) => {
      toast('Added work update', 'success');
      qc.invalidateQueries({ queryKey: ['task_updates', vars.task_id] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: Error) => {
      toast(err.message || 'Failed to add work update', 'error');
    },
  });
}
