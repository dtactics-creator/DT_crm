import type { ReactNode } from 'react';
import { usePermissions } from '../contexts/PermissionContext';

// Conditionally renders children only when the user has the permission(s).
// Usage: <Can perm="leads.create"><Button/></Can>
export default function Can({ perm, children, fallback = null }: {
  perm: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = usePermissions();
  return <>{can(perm) ? children : fallback}</>;
}
