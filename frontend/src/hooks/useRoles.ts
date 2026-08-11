import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Role } from '../types';

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<Role[]>('/api/roles'),
  });
}

// Fetch roles filtered by type ('sales' | 'developer').
export function useRolesByType(type: 'sales' | 'developer') {
  return useQuery({
    queryKey: ['roles', type],
    queryFn: () => api.get<Role[]>(`/api/roles?type=${type}`),
  });
}
