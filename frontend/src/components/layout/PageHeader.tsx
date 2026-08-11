import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCrumbs } from './AppLayout';
import type { Crumb } from './crumbs';

export default function PageHeader({ title, subtitle, actions, crumbs }: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  crumbs?: Crumb[];
}) {
  const setCrumbs = useCrumbs();
  useEffect(() => {
    setCrumbs(crumbs ?? [{ label: title }]);
  }, [title, crumbs, setCrumbs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6"
    >
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-base-fg tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-[14px] text-muted-fg mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </motion.div>
  );
}
