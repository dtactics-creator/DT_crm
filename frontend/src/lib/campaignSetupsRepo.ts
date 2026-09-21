import { api } from './api';
import { CampaignTemplateRow } from './templatesRepo';

export interface CampaignSetupTemplateRow {
  template_id: string;
  sort_order: number;
  start_datetime: string | null;
  end_datetime: string | null;
}

export interface CampaignSetupRow {
  id: string;
  name: string;
  description: string | null;
  play_mode: string;
  start_datetime: string | null;
  end_datetime: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  campaign_products?: string[];
  templates?: CampaignSetupTemplateRow[];
}

export type CampaignSetupFormState = {
  id?: string;
  name: string;
  description: string;
  play_mode: string;
  start_datetime: string | null;
  end_datetime: string | null;
  status: string;
  templates: {
    template_id: string;
    start_datetime: string;
    end_datetime: string;
  }[];
  campaign_products: string[];
};

export async function fetchAllCampaignSetups(): Promise<CampaignSetupRow[]> {
  return api.get<CampaignSetupRow[]>('/api/campaign-setups');
}

export async function fetchCampaignSetup(id: string): Promise<CampaignSetupRow> {
  return api.get<CampaignSetupRow>(`/api/campaign-setups?id=${id}`);
}

export async function saveCampaignSetup(form: CampaignSetupFormState): Promise<CampaignSetupRow> {
  const isUpdate = !!form.id;
  const url = '/api/campaign-setups';
  return isUpdate ? api.put<CampaignSetupRow>(url, form) : api.post<CampaignSetupRow>(url, form);
}

export async function deleteCampaignSetup(id: string): Promise<void> {
  await api.del<void>('/api/campaign-setups', { id });
}
