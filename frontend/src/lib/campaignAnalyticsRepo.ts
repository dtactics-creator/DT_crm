import { api } from './api';

export interface CampaignAnalyticsSession {
  id: string;
  session_id: string;
  visitor_id: string;
  domain: string | null;
  campaign_setup_id: string | null;
  template_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
  
  // Joined fields from API
  setup_name: string | null;
  template_name: string | null;
}

export async function fetchCampaignAnalytics(): Promise<CampaignAnalyticsSession[]> {
  return api.get<CampaignAnalyticsSession[]>('/api/campaign-analytics');
}
