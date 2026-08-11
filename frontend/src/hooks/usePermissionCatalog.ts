import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface CatalogAction { key: string; action: string; label: string }
export interface CatalogModule { module: string; label: string; actions: CatalogAction[] }

export function usePermissionCatalog(enabled = true) {
  return useQuery({
    queryKey: ['permission-catalog'],
    queryFn: () => api.get<{ catalog: CatalogModule[] }>('/api/permissions').then((r) => r.catalog),
    enabled,
    staleTime: 5 * 60_000,
  });
}
