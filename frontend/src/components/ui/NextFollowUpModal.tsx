import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Field from '../ui/Field';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import { CalendarClock } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export interface FollowUpEntity {
  id: string;
  name: string;
  next_follow_up: string | null;
  remarks: string | null;
  created_at: string;
}

export default function NextFollowUpModal({ open, onClose, onConfirm, entity, saving }: {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { next_follow_up: string; remarks: string }) => void;
  entity: FollowUpEntity | null;
  saving: boolean;
}) {
  const [date, setDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && entity) {
      setDate(entity.next_follow_up ? new Date(entity.next_follow_up).toISOString().slice(0, 10) : '');
      setRemarks('');
      setError('');
    }
  }, [open, entity]);

  const confirm = () => {
    if (!date) {
      setError('Please select a follow-up date.');
      return;
    }

    let combinedRemarks = entity?.remarks || '';
    if (remarks.trim()) {
      const timestamp = new Date().toISOString().slice(0, 10);
      const newEntry = `[${timestamp}] ${remarks.trim()}`;
      combinedRemarks = combinedRemarks ? `${newEntry}\n\n---\n\n${combinedRemarks}` : newEntry;
    }

    onConfirm({
      next_follow_up: date,
      remarks: combinedRemarks,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Set next follow-up" size="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={<CalendarClock className="h-4 w-4" />} onClick={confirm} loading={saving}>Save follow-up</Button>
        </div>
      }>
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-medium text-base-fg">
            Schedule a follow-up for <span className="font-bold">{entity?.name}</span>.
          </p>
        </div>

        <Field label="Next follow-up date" required error={error}>
          <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setError(''); }} invalid={!!error} />
        </Field>

        <Field label="New Remarks">
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add notes about this follow-up..." />
        </Field>

        {entity?.remarks && (
          <div className="mt-4">
            <p className="text-[12px] font-bold uppercase tracking-wider text-subtle-fg mb-2">Previous Remarks</p>
            <div className="space-y-2.5">
              {entity.remarks.split(/\n\n(?:---\n\n)?/).filter(r => r.trim() && r.trim() !== '---').map((r, i) => {
                const text = r.trim();
                const match = text.match(/^\[(\d{4}-\d{2}-\d{2})\]\s*(.*)$/s);
                const dateLabel = match ? formatDate(match[1]) : (i === 0 ? formatDate(entity?.created_at) : 'Original Note');
                const content = match ? match[2] : text;
                return (
                  <div key={i} className="rounded-xl border border-app bg-surface-2 p-3.5 shadow-sm">
                    {dateLabel && <div className="mb-1.5"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-600 border border-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/20">{dateLabel}</span></div>}
                    <div className="text-[13px] text-muted-fg leading-relaxed whitespace-pre-wrap break-words">{content}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
