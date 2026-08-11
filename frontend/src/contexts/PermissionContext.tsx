import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

interface MeResponse {
  user: { id: string; email: string };
  isAdmin: boolean;
  permissions: string[];
  employee: { id: string; role: string } | null;
  role: { id: string; name: string; type: string } | null;
}

interface PermissionState {
  loading: boolean;
  isAdmin: boolean;
  permissions: string[];
  roleName: string | null;
  can: (perm: string | string[]) => boolean;
  refetch: () => void;
}

const PermissionContext = createContext<PermissionState>({
  loading: true, isAdmin: false, permissions: [], roleName: null,
  can: () => false, refetch: () => {},
});

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roleName, setRoleName] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setPermissions([]); setIsAdmin(false); setRoleName(null); setLoading(false); return; }
    setLoading(true);
    try {
      const me = await api.get<MeResponse>('/api/me');
      setIsAdmin(me.isAdmin);
      setPermissions(me.permissions || []);
      setRoleName(me.role?.name ?? null);
    } catch {
      setIsAdmin(false);
      setPermissions([]);
      setRoleName(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  // `can` accepts a single permission or an array (ANY match).
  const can = useCallback((perm: string | string[]) => {
    if (isAdmin || permissions.includes('*')) return true;
    const list = Array.isArray(perm) ? perm : [perm];
    return list.some((p) => permissions.includes(p));
  }, [isAdmin, permissions]);

  return (
    <PermissionContext.Provider value={{ loading, isAdmin, permissions, roleName, can, refetch: load }}>
      {children}
    </PermissionContext.Provider>
  );
}

export const usePermissions = () => useContext(PermissionContext);
