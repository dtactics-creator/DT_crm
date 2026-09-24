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
  ip_address?: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
    latitude?: string;
    longitude?: string;
    timezone?: string;
  };

  // Joined fields from API
  setup_name: string | null;
  template_name: string | null;
}

export async function fetchCampaignAnalytics(): Promise<CampaignAnalyticsSession[]> {
  return api.get<CampaignAnalyticsSession[]>('/api/campaign-analytics');
}

export interface CampaignAnalyticsEvent {
  id: string;
  session_id: string;
  event_type: string;
  action_name?: string;
  target_value?: string;
  created_at: string;
  // Joined fields
  visitor_id?: string;
  domain?: string;
}

export async function fetchCampaignEvents(): Promise<CampaignAnalyticsEvent[]> {
  return api.get<CampaignAnalyticsEvent[]>('/api/campaign-events');
}
