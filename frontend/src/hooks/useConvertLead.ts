import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';

export interface ConvertPayload {
  lead_id: string;
  project_name?: string;
  project_manager_id?: string | null;
  assigned_employee_id?: string | null;
  technology_stack?: string[];
  project_cost?: number;
  start_date?: string | null;
  expected_delivery?: string | null;
}

export function useConvertLead() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: ConvertPayload) => api.post('/api/convert-lead', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      toast('Lead converted to project — marked as Won 🎉', 'success');
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });
}
