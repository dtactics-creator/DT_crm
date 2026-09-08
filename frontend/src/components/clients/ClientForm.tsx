import { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import Field from '../ui/Field';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';
import { collect, required } from '../../lib/validators';
import type { Client, ClientContact } from '../../types';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useNextNo } from '../../hooks/useNextNo';

export interface FormClientContact extends Omit<ClientContact, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'client_id'> {
  id?: string;
}

export interface ClientFormValues {
  id?: string;
  customer_name: string;
  company_name: string;
  vat_gst_no: string;
  status: string;
  address: string;
  country: string;
  state: string;
  city: string;
  contacts: FormClientContact[];
  client_no?: string | null;
}

const empty: ClientFormValues = {
  customer_name: '',
  company_name: '',
  vat_gst_no: '',
  status: 'active',
  address: '',
  country: '',
  state: '',
  city: '',
  contacts: [],
};

export default function ClientForm({ open, onClose, onSubmit, initial, saving, title, subtitle }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ClientFormValues) => void;
  initial?: Client | null;
  saving: boolean;
  title: string;
  subtitle?: string;
}) {
  const [v, setV] = useState<ClientFormValues>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: nextNo } = useNextNo('client', open && !initial);
  const displayClientNo = initial?.client_no ? initial.client_no : (nextNo?.next ?? 'Generating...');

  useEffect(() => {
    if (open) {
      setErrors({});
      if (initial) {
        setV({
          id: initial.id,
          client_no: initial.client_no,
          customer_name: initial.customer_name || '',
          company_name: initial.company_name || '',
          vat_gst_no: initial.vat_gst_no || '',
          status: initial.status || 'active',
          address: initial.address || '',
          country: initial.country || '',
          state: initial.state || '',
          city: initial.city || '',
          contacts: initial.contacts?.map(c => ({
            id: c.id,
            full_name: c.full_name,
            department: c.department || '',
            mobile: c.mobile || '',
            landline: c.landline || '',
            email: c.email || '',
            remarks: c.remarks || '',
            is_primary: c.is_primary || false
          })) || []
        });
      } else {
        setV({ ...empty });
      }
    }
  }, [open, initial]);

  const set = (k: keyof ClientFormValues, val: any) => setV(p => ({ ...p, [k]: val }));

  const addContact = () => setV(p => ({
    ...p,
    contacts: [...p.contacts, { full_name: '', department: '', mobile: '', landline: '', email: '', remarks: '', is_primary: false }]
  }));

  const removeContact = (i: number) => setV(p => ({ ...p, contacts: p.contacts.filter((_, idx) => idx !== i) }));

  const updateContact = (i: number, patch: Partial<FormClientContact>) => {
    setV(p => ({ ...p, contacts: p.contacts.map((c, idx) => idx === i ? { ...c, ...patch } : c) }));
  };

  const validate = () => {
    const e = collect({
      company_name: required(v.company_name, 'Company Name'),
    });

    v.contacts.forEach((c, i) => {
      if (!c.full_name) e[`contact_${i}_name`] = 'Required';
    });

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    onSubmit(v);
  };

  return (
    <Drawer
      open={open} onClose={onClose}
      title={title} subtitle={subtitle}
      footer={
        <div className="flex items-center justify-end w-full gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Save Client</Button>
        </div>
      }
    >
      <div className="space-y-8 pb-10">

        {/* Client Details Group */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg mb-4">Client Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Customer No">
              <Input value={displayClientNo} disabled className="bg-subtle/30" />
            </Field>
            <Field label="Customer Name">
              <Input value={v.customer_name} onChange={(e) => set('customer_name', e.target.value)} />
            </Field>
            <Field label="Company Name" required error={errors.company_name}>
              <Input value={v.company_name} onChange={(e) => set('company_name', e.target.value)} invalid={!!errors.company_name} />
            </Field>
            <Field label="VAT/GST No">
              <Input value={v.vat_gst_no} onChange={(e) => set('vat_gst_no', e.target.value)} />
            </Field>
            <Field label="Status">
              <SearchableSelect
                options={[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }]}
                value={v.status}
                onChange={(val) => set('status', val)}
              />
            </Field>
          </div>
        </section>

        {/* Address Group */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg mb-4">Address Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Address">
                <Textarea value={v.address} onChange={(e) => set('address', e.target.value)} rows={2} />
              </Field>
            </div>
            <Field label="Country">
              <Input value={v.country} onChange={(e) => set('country', e.target.value)} />
            </Field>
            <Field label="State/Province">
              <Input value={v.state} onChange={(e) => set('state', e.target.value)} />
            </Field>
            <Field label="City/Town">
              <Input value={v.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
          </div>
        </section>

        {/* Contact Group */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-fg">Contact Persons</p>
            <Button type="button" variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addContact}>
              Add Contact
            </Button>
          </div>

          <div className="space-y-4">
            {v.contacts.length === 0 && (
              <div className="text-center p-6 bg-surface-2 rounded-xl border border-app text-muted-fg text-sm">
                No contacts added yet. Click 'Add Contact' to create one.
              </div>
            )}

            {v.contacts.map((c, i) => (
              <div key={i} className="bg-surface-2 rounded-xl border border-app p-4 flex gap-4 items-start relative">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Full Name" required error={errors[`contact_${i}_name`]}>
                    <Input value={c.full_name} onChange={(e) => updateContact(i, { full_name: e.target.value })} invalid={!!errors[`contact_${i}_name`]} />
                  </Field>
                  <Field label="Department">
                    <Input value={c.department || ''} onChange={(e) => updateContact(i, { department: e.target.value })} />
                  </Field>
                  <Field label="Email">
                    <Input value={c.email || ''} onChange={(e) => updateContact(i, { email: e.target.value })} />
                  </Field>
                  <Field label="Mobile">
                    <Input value={c.mobile || ''} onChange={(e) => updateContact(i, { mobile: e.target.value })} />
                  </Field>
                  <Field label="Landline">
                    <Input value={c.landline || ''} onChange={(e) => updateContact(i, { landline: e.target.value })} />
                  </Field>
                  <div className="sm:col-span-3">
                    <Field label="Remarks">
                      <Input value={c.remarks || ''} onChange={(e) => updateContact(i, { remarks: e.target.value })} />
                    </Field>
                  </div>
                </div>
                <button type="button" onClick={() => removeContact(i)} className="mt-7 h-8 w-8 rounded text-subtle-fg hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

      </div>
    </Drawer>
  );
}
