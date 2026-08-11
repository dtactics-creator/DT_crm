import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Lead } from '../types';

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: () => api.get<Lead[]>('/api/leads'),
  });
}
