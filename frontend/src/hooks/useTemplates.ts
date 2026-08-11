import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Template } from '../types';

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get<Template[]>('/api/templates'),
  });
}
