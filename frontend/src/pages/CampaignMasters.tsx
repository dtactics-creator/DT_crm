import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Type, Globe } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import MasterTab from '../components/masters/MasterTab';
import DomainTab from '../components/masters/DomainTab';
import { cn } from '../lib/utils';

type TabKind = { key: string; label: string; icon: typeof Layers; kind: 'master' | 'custom'; category: string; singular: string };

const TABS: TabKind[] = [
  { key: 'campaign_type', label: 'Campaign Types', icon: Layers, kind: 'master', category: 'campaign_type', singular: 'Campaign Type' },
  { key: 'campaign_font', label: 'Fonts', icon: Type, kind: 'master', category: 'campaign_font', singular: 'Font' },
  { key: 'campaign_domain', label: 'Domains', icon: Globe, kind: 'custom', category: 'campaign_domain', singular: 'Domain' },
];

export default function CampaignMasters() {
  const [active, setActive] = useState('campaign_type');
  const tab = TABS.find((t) => t.key === active)!;

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Campaign Masters" subtitle="Configure the reusable lookup values for campaigns."
        crumbs={[{ label: 'Campaigns' }, { label: 'Masters' }]} />

      {/* Tab bar */}
      <div className="border-b border-app mb-6 -mx-1 px-1 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {TABS.map((t) => {
            const on = active === t.key;
            return (
              <button key={t.key} onClick={() => setActive(t.key)}
                className={cn('relative flex items-center gap-2 px-3.5 h-11 text-[13.5px] font-semibold whitespace-nowrap transition-colors',
                  on ? 'text-brand-700 dark:text-brand-300' : 'text-muted-fg hover:text-base-fg')}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                {on && <motion.span layoutId="camp-master-tab" className="absolute left-2 right-2 -bottom-px h-[2.5px] rounded-full bg-brand-600" />}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {tab.kind === 'master' && <MasterTab category={tab.category} singular={tab.singular} permPrefix="campaign_masters" />}
          {active === 'campaign_domain' && <DomainTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
