import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { AuditLog } from '../types';

export interface AuditLogFilters {
  page: number;
  pageSize: number;
  search: string;
  user_id: string;
  action: string;
  module: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface AuditLogResponse {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export function useAuditLogs(filters: AuditLogFilters) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.append(key, value.toString());
  });

  return useQuery({
    queryKey: ['audit_logs', filters],
    queryFn: () => api.get<AuditLogResponse>(`/api/audit-logs?${query.toString()}`),
    placeholderData: keepPreviousData,
  });
}
