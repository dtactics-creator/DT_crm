import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Activity, SignalHigh } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import MasterTab from '../components/masters/MasterTab';
import { cn } from '../lib/utils';

interface TabItem {
  key: string;
  label: string;
  icon: typeof Layers;
  category: string;
  singular: string;
}

const TABS: TabItem[] = [
  { key: 'task_module', label: 'Modules', icon: Layers, category: 'task_module', singular: 'Module' },
  { key: 'task_status', label: 'Task Status', icon: Activity, category: 'task_status', singular: 'Task Status' },
  { key: 'task_priority', label: 'Task Priority', icon: SignalHigh, category: 'task_priority', singular: 'Task Priority' },
];

export default function ProjectManagementMasters() {
  const [active, setActive] = useState('task_module');
  const tab = TABS.find((t) => t.key === active)!;

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Project Management Masters"
        subtitle="Manage reusable Modules, Task Statuses, and Task Priorities for your project workspace."
        crumbs={[{ label: 'Project Management' }, { label: 'Masters' }]}
      />

      {/* Tab bar */}
      <div className="border-b border-app mb-6 -mx-1 px-1 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {TABS.map((t) => {
            const on = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={cn(
                  'relative flex items-center gap-2 px-4 h-11 text-[13.5px] font-semibold whitespace-nowrap transition-colors',
                  on ? 'text-brand-700 dark:text-brand-300' : 'text-muted-fg hover:text-base-fg'
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                {on && (
                  <motion.span
                    layoutId="pm-master-tab"
                    className="absolute left-2 right-2 -bottom-px h-[2.5px] rounded-full bg-brand-600"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <MasterTab category={tab.category} singular={tab.singular} permPrefix="masters" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
