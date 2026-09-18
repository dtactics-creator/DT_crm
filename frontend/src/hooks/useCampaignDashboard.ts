import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export type CampaignFilters = {
  startDate?: string;
  endDate?: string;
  type?: string;
  status?: string;
  templateId?: string;
  setupId?: string;
  playMode?: string;
};

export type CampaignDashboardPayload = {
  kpis: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalTemplates: number;
    activeTemplates: number;
    totalSetups: number;
    activeSetups: number;
  };
  typeSlices: { name: string; value: number }[];
  recentCampaigns: { id: string; title: string; type: string; is_active: boolean; created_at: string }[];
  
  campaignStatusDistribution: { name: string; value: number }[];
  creationTrend: { date: string; count: number }[];
  templateUtilization: { template_id: string; name: string; count: number }[];
  templateStatusDistribution: { name: string; value: number }[];
  setupStatusDistribution: { name: string; value: number }[];
  setupPlayModeDistribution: { name: string; value: number }[];
  
  campaignTimeline: { id: string; title: string; start: string | null; end: string | null; status: string }[];
  setupTimeline: { id: string; title: string; start: string | null; end: string | null; status: string }[];
  
  activeCampaignsList: { id: string; title: string; type: string; template: string | null; start: string | null; end: string | null; status: string }[];
  upcomingCampaignsList: { id: string; title: string; type: string; template: string | null; start: string | null; end: string | null; }[];
  expiringSoonCampaigns: { id: string; title: string; template: string | null; end: string; daysLeft: number }[];
  
  setupOverview: { id: string; name: string; description: string; status: string; playMode: string; start: string | null; end: string | null; templateCount: number }[];
  setupTemplateComposition: { setupId: string; setupName: string; templates: { templateId: string; name: string; order: number; start: string | null; end: string | null }[] }[];
};

export function useCampaignDashboard(filters?: CampaignFilters) {
  return useQuery({
    queryKey: ['campaign-dashboard', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
      }
      const qs = params.toString();
      return await api.get<CampaignDashboardPayload>(`/api/campaign-dashboard${qs ? '?' + qs : ''}`);
    },
  });
}
