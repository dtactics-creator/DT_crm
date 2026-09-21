import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Field from '../ui/Field';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import { SearchableSelect } from '../ui/SearchableSelect';
import { toOptions } from '../../hooks/useMasters';
import type { Task, MasterItem } from '../../types';

export default function TaskUpdateModal({
  open,
  onClose,
  task,
  masters,
  saving,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  masters: MasterItem[] | undefined;
  saving: boolean;
  onSubmit: (data: { task_id: string; update_note: string; status_to?: string }) => void;
}) {
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const statusOpts = toOptions(masters, 'task_status');

  useEffect(() => {
    if (open && task) {
      setNote('');
      setStatus(task.status);
      setError('');
    }
  }, [open, task]);

  if (!task) return null;

  const handleSubmit = () => {
    if (!note.trim()) {
      setError('Please provide a work update description.');
      return;
    }
    onSubmit({
      task_id: task.id,
      update_note: note.trim(),
      status_to: status,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Post Work Update"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Submit Update
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-[12.5px] font-medium text-muted-fg -mt-1 mb-2">
          Task: <span className="font-semibold text-brand-600">{task.task_no || 'Task'}</span> · {task.title}
        </p>

        <Field label="Work Progress Note" required error={error}>

          <Textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (error) setError('');
            }}
            placeholder="Describe what you worked on, API progress, code changes, or blockers…"
            rows={4}
            autoFocus
          />
        </Field>

        <Field label="Task Status">
          <SearchableSelect
            value={status}
            onChange={(v) => setStatus(v)}
            options={statusOpts}
            placeholder="Select Status"
          />
        </Field>
      </div>
    </Modal>
  );
}
