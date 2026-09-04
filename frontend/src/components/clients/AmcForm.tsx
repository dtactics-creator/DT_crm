import { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import Field from '../ui/Field';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import type { ClientAmc, Client } from '../../types';

export default function AmcForm({ open, onClose, client, projectId }: { open: boolean, onClose: () => void, client: Client | null, projectId?: string | null }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  
  const [v, setV] = useState<Partial<ClientAmc>>({
    amc_name: '',
    description: '',
    amc_amount: 0,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    renewal_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'active',
    notes: '',
    project_id: projectId || ''
  });

  useEffect(() => {
    if (open) {
      setV({
        amc_name: '',
        description: '',
        amc_amount: 0,
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        renewal_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        status: 'active',
        notes: '',
        project_id: projectId || ''
      });
    }
  }, [open, projectId]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/client-amc', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast('AMC created successfully', 'success');
      onClose();
    },
    onError: (err: any) => toast(err.message, 'error')
  });

  if (!client) return null;

  const submit = () => {
    mutation.mutate({
      ...v,
      client_id: client.id,
      amc_amount: Number(v.amc_amount) || 0
    });
  };

  return (
    <Drawer open={open} onClose={onClose} title="New AMC" width="max-w-[500px]" footer={
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={mutation.isPending}>Save</Button>
      </div>
    }>
      <div className="space-y-4">
        <Field label="AMC Name" required>
          <Input value={v.amc_name || ''} onChange={(e) => setV({ ...v, amc_name: e.target.value })} />
        </Field>
        {client.projects && client.projects.length > 0 && (
          <Field label="Project">
            <SearchableSelect
              options={client.projects.map((p: any) => ({ label: p.project_name || p.project_no, value: p.id }))}
              value={v.project_id || ''}
              onChange={(val) => setV({ ...v, project_id: val })}
              placeholder="Select a project..."
            />
          </Field>
        )}
        <Field label="Amount">
          <Input type="number" value={v.amc_amount || ''} onChange={(e) => setV({ ...v, amc_amount: parseFloat(e.target.value) })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Date">
            <Input type="date" value={v.start_date || ''} onChange={(e) => setV({ ...v, start_date: e.target.value })} />
          </Field>
          <Field label="End Date">
            <Input type="date" value={v.end_date || ''} onChange={(e) => setV({ ...v, end_date: e.target.value })} />
          </Field>
        </div>
        <Field label="Renewal Date">
          <Input type="date" value={v.renewal_date || ''} onChange={(e) => setV({ ...v, renewal_date: e.target.value })} />
        </Field>
        <Field label="Description">
          <Textarea value={v.description || ''} onChange={(e) => setV({ ...v, description: e.target.value })} rows={2} />
        </Field>
        <Field label="Notes">
          <Textarea value={v.notes || ''} onChange={(e) => setV({ ...v, notes: e.target.value })} rows={2} />
        </Field>
      </div>
    </Drawer>
  );
}
