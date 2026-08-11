import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Employee } from '../types';

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get<Employee[]>('/api/employees'),
  });
}

export function useManagers() {
  return useQuery({
    queryKey: ['managers'],
    queryFn: () => api.get<Employee[]>('/api/employees?managers=1'),
  });
}
