import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

// Fetches the next auto-generated number (lead or project).
// `enabled` lets callers only fetch when a create form is open.
export function useNextNo(type: 'lead' | 'project' | 'quotation', enabled: boolean) {
  return useQuery({
    queryKey: ['next-no', type, enabled],
    queryFn: () => api.get<{ next: string }>(`/api/next-no?type=${type}`),
    enabled,
    staleTime: 0,
    gcTime: 0,
  });
}
