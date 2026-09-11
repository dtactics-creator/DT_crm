import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ReportData, Lead, Project } from '../types';
import type { DashboardPayload } from '../types/dashboard';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      return await api.get<DashboardPayload>('/api/dashboard');
    },
  });
}

export function useReports() {
  return useQuery({
    queryKey: ['reports', 'mock-fallback'],
    queryFn: async () => {
      try {
        return await api.get<ReportData>('/api/reports');
      } catch (err) {
        console.warn('Backend unavailable, throwing error for reports.', err);
        throw err;
      }
    },
  });
}
