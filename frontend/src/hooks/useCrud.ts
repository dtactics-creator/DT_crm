import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';

export function useCrud(resource: string, invalidate: string[]) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidateAll = () => {
    for (const key of invalidate) qc.invalidateQueries({ queryKey: [key] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['reports'] });
    qc.invalidateQueries({ queryKey: ['audit_logs'] });
  };

  const create = useMutation({
    mutationFn: (data: unknown) => api.post(`/api/${resource}`, data),
    onSuccess: () => { invalidateAll(); toast('Created successfully', 'success'); },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const update = useMutation({
    mutationFn: (data: unknown) => api.put(`/api/${resource}`, data),
    onSuccess: () => { invalidateAll(); toast('Saved changes', 'success'); },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/${resource}`, { id }),
    onSuccess: () => { invalidateAll(); toast('Deleted', 'success'); },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  return { create, update, remove };
}
