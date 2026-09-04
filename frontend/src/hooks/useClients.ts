import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Client } from '../types';

export function useClients() {
  return useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => api.get<Client[]>('/api/clients'),
  });
}

export function useClientDetails(id?: string) {
  return useQuery<Client>({
    queryKey: ['clients', id],
    queryFn: () => api.get<Client>(`/api/clients?id=${id}`),
    enabled: !!id,
  });
}
