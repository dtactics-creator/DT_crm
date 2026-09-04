import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import type { Quotation, QuotationVersion } from '../types';

export function useQuotations(leadId?: string) {
  return useQuery({
    queryKey: ['quotations', { leadId }],
    queryFn: () => api.get<Quotation[]>(`/api/quotations${leadId ? `?lead_id=${leadId}` : ''}`),
  });
}

export function useQuotation(quotationId?: string) {
  return useQuery({
    queryKey: ['quotation', quotationId],
    queryFn: async () => {
      if (!quotationId) return null;
      const data = await api.get<Quotation[]>(`/api/quotations?quotation_id=${quotationId}`);
      return data[0] || null;
    },
    enabled: !!quotationId,
  });
}

export function useCreateQuotation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: Partial<QuotationVersion> & { lead_id?: string | null, client_id?: string | null }) => api.post<Quotation>('/api/quotations', data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      qc.invalidateQueries({ queryKey: ['quotation'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast(`Quotation ${data.quotation_no} created successfully`, 'success');
    },
    onError: (err: any) => toast(err.message, 'error'),
  });
}

export function useUpdateQuotationVersion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: Partial<QuotationVersion> & { id: string }) => api.put<QuotationVersion>('/api/quotations', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      qc.invalidateQueries({ queryKey: ['quotation'] });
      toast('Quotation version updated successfully', 'success');
    },
    onError: (err: any) => toast(err.message, 'error'),
  });
}

export function useCreateQuotationVersion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: Partial<QuotationVersion> & { quotation_id: string }) => 
      api.post<{ id: string, version_number: number }>('/api/quotations', { ...data, action: 'create_version' }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      qc.invalidateQueries({ queryKey: ['quotation'] });
      toast(`Version ${data.version_number} created successfully`, 'success');
    },
    onError: (err: any) => toast(err.message, 'error'),
  });
}

export function useChangeQuotationStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      api.put<Quotation>('/api/quotations', { id, status, action: 'change_status' }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      qc.invalidateQueries({ queryKey: ['quotation'] });
      toast(`Status changed to ${data.status}`, 'success');
    },
    onError: (err: any) => toast(err.message, 'error'),
  });
}
