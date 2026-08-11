import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Field from '../ui/Field';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { SearchableSelect, MultiSelect } from '../ui/SearchableSelect';
import { toOptions } from '../../hooks/useMasters';
import { required, minLen, maxLen, nonNegativeNumber, dateOrder } from '../../lib/validators';
import { ArrowRightLeft, Sparkles } from 'lucide-react';
import type { Lead, MasterItem, Employee } from '../../types';

export default function ConvertLeadModal({ open, onClose, onConfirm, lead, masters, managers, saving }: {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    project_name: string; project_manager_id: string | null; technology_stack: string[];
    project_cost: number; start_date: string | null; expected_delivery: string | null;
  }) => void;
  lead: Lead | null;
  masters: MasterItem[] | undefined;
  managers: Employee[] | undefined;
  saving: boolean;
}) {
  const [projectName, setProjectName] = useState('');
  const [managerId, setManagerId] = useState('');
  const [stack, setStack] = useState<string[]>([]);
  const [cost, setCost] = useState('');
  const [start, setStart] = useState('');
  const [delivery, setDelivery] = useState('');
  const [error, setError] = useState('');

  const stackOpts = toOptions(masters, 'technology_stack');
  const managerOpts = (managers || []).map((m) => ({ value: m.id, label: m.employee_name, hint: m.role }));

  useEffect(() => {
    if (open && lead) {
      setProjectName(`${lead.company || lead.customer_name} Project`);
      setManagerId(''); setStack([]); setCost(String(lead.budget ?? '')); setError('');
      setStart(new Date().toISOString().slice(0, 10)); setDelivery('');
    }
  }, [open, lead]);

  const confirm = () => {
    const nameErr = required(projectName, 'Project name') || minLen(projectName, 2, 'Project name') || maxLen(projectName, 150, 'Project name');
    const costErr = nonNegativeNumber(cost, 'Project cost');
    const dateErr = dateOrder(start, delivery, 'Expected delivery');
    const msg = nameErr || costErr || dateErr;
    if (msg) { setError(msg); return; }
    onConfirm({
      project_name: projectName.trim(),
      project_manager_id: managerId || null,
      technology_stack: stack,
      project_cost: cost ? Number(cost) : 0,
      start_date: start || null,
      expected_delivery: delivery || null,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Convert lead to project" size="max-w-lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={<ArrowRightLeft className="h-4 w-4" />} onClick={confirm} loading={saving}>Convert &amp; create project</Button>
        </div>
      }>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-brand-50 dark:bg-brand-600/12 border border-brand-100 dark:border-brand-600/20 px-4 py-3">
          <Sparkles className="h-4.5 w-4.5 text-brand-600 shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-brand-800 dark:text-brand-200 leading-relaxed">
            This will copy <span className="font-semibold">{lead?.customer_name}</span>'s details into a new project, link the lead reference
            <span className="font-semibold"> {lead?.lead_no}</span>, and mark the lead as <span className="font-semibold">Won</span>.
          </p>
        </div>

        <Field label="Project name" required error={error}>
          <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} invalid={!!error} placeholder="Acme CRM Platform" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Project manager">
            <SearchableSelect value={managerId} onChange={setManagerId} options={managerOpts} placeholder="Assign manager" clearable />
          </Field>
          <Field label="Project cost (₹)">
            <Input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="50000" />
          </Field>
          <Field label="Start date">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Expected delivery">
            <Input type="date" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
          </Field>
        </div>

        <Field label="Technology stack">
          <MultiSelect values={stack} onChange={setStack} options={stackOpts} placeholder="Select technologies" />
        </Field>
      </div>
    </Modal>
  );
}
