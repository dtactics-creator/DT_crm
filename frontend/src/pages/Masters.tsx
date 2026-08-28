import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Flag, Radio, Users, Cpu, Link2, Layers, MessageSquareText, SignalHigh, Building2, Coins, CalendarDays } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import MasterTab from '../components/masters/MasterTab';
import EmployeeMasterTab from '../components/masters/EmployeeMasterTab';
import { cn } from '../lib/utils';

type TabKind =
  | { key: string; label: string; icon: typeof Layers; kind: 'master'; category: string; singular: string }
  | { key: string; label: string; icon: typeof Layers; kind: 'employee'; singular: string };

const TABS: TabKind[] = [
  { key: 'project_type', label: 'Project Types', icon: Layers, kind: 'master', category: 'project_type', singular: 'Project Type' },
  { key: 'lead_status', label: 'Lead Status', icon: Activity, kind: 'master', category: 'lead_status', singular: 'Lead Status' },
  { key: 'project_status', label: 'Project Status', icon: Flag, kind: 'master', category: 'project_status', singular: 'Project Status' },
  { key: 'lead_source', label: 'Lead Sources', icon: Radio, kind: 'master', category: 'lead_source', singular: 'Lead Source' },
  { key: 'employees', label: 'Employees', icon: Users, kind: 'employee', singular: 'Employee' },
  { key: 'technology_stack', label: 'Technology Stack', icon: Cpu, kind: 'master', category: 'technology_stack', singular: 'Technology' },
  { key: 'url_type', label: 'URL Types', icon: Link2, kind: 'master', category: 'url_type', singular: 'URL Type' },
  { key: 'template_category', label: 'Template Categories', icon: MessageSquareText, kind: 'master', category: 'template_category', singular: 'Template Category' },
  { key: 'priority', label: 'Priority', icon: SignalHigh, kind: 'master', category: 'priority', singular: 'Priority' },
  { key: 'project_service', label: 'Project Services', icon: Layers, kind: 'master', category: 'project_service', singular: 'Project Service' },
  { key: 'industry', label: 'Industries', icon: Building2, kind: 'master', category: 'industry', singular: 'Industry' },
  { key: 'currency', label: 'Currencies', icon: Coins, kind: 'master', category: 'currency', singular: 'Currency' },
  { key: 'payment_milestone', label: 'Payment Milestones', icon: CalendarDays, kind: 'master', category: 'payment_milestone', singular: 'Payment Milestone' },
];

export default function Masters() {
  const [active, setActive] = useState('project_type');
  const tab = TABS.find((t) => t.key === active)!;

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Masters" subtitle="Configure the reusable lookup values that power your entire CRM."
        crumbs={[{ label: 'Settings' }, { label: 'Masters' }]} />

      {/* Tab bar */}
      <div className="border-b border-app mb-6 -mx-1 px-1 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {TABS.map((t) => {
            const on = active === t.key;
            return (
              <button key={t.key} onClick={() => setActive(t.key)}
                className={cn('relative flex items-center gap-2 px-3.5 h-11 text-[13.5px] font-semibold whitespace-nowrap transition-colors',
                  on ? 'text-brand-700 dark:text-brand-300' : 'text-muted-fg hover:text-base-fg')}>
                <t.icon className="h-4 w-4" />
                {t.label}
                {on && <motion.span layoutId="master-tab" className="absolute left-2 right-2 -bottom-px h-[2.5px] rounded-full bg-brand-600" />}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {tab.kind === 'master'
            ? <MasterTab category={tab.category} singular={tab.singular} />
            : <EmployeeMasterTab singular={tab.singular} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
