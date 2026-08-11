import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { usePermissions } from '../contexts/PermissionContext';
import BrandLoader from './BrandLoader';

// Route-level guard. Blocks rendering (and direct URL access) unless the
// user has the required permission. Backend endpoints are independently
// guarded, so this is defense-in-depth, not the only line of defense.
export default function RequirePermission({ perm, children }: { perm: string | string[]; children: ReactNode }) {
  const { loading, can } = usePermissions();

  if (loading) return <BrandLoader />;

  if (!can(perm)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full text-center bg-surface border border-app rounded-2xl card-shadow p-8">
          <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-base-fg">Access denied</h2>
          <p className="text-[13.5px] text-muted-fg mt-1.5 leading-relaxed">
            You don't have permission to view this page. Contact your administrator if you believe this is a mistake.
          </p>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
