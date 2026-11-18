import { api } from './api';
import type {
  Competition,
  CompetitionRegistration,
  CompetitionSubmission,
  CompetitionComment,
  CompetitionReport,
  CompetitionWinner,
  CompetitionDashboardStats,
} from '../types';

export interface CompetitionFilterParams {
  id?: string;
  slug?: string;
  status?: string;
  category?: string;
  project_id?: string;
  campaign_id?: string;
  search?: string;
}

export async function fetchAllCompetitions(params: CompetitionFilterParams = {}): Promise<Competition[]> {
  const query = new URLSearchParams();
  if (params.id) query.set('id', params.id);
  if (params.slug) query.set('slug', params.slug);
  if (params.status) query.set('status', params.status);
  if (params.category) query.set('category', params.category);
  if (params.project_id) query.set('project_id', params.project_id);
  if (params.campaign_id) query.set('campaign_id', params.campaign_id);
  if (params.search) query.set('search', params.search);

  const qs = query.toString();
  return api.get<Competition[]>(`/api/competitions${qs ? `?${qs}` : ''}`);
}

export async function fetchCompetitionById(id: string): Promise<Competition | null> {
  return api.get<Competition>(`/api/competitions?id=${encodeURIComponent(id)}`);
}

export async function saveCompetition(data: Partial<Competition>): Promise<Competition> {
  if (data.id) {
    return api.put<Competition>('/api/competitions', data);
  }
  return api.post<Competition>('/api/competitions', data);
}

export async function deleteCompetition(id: string): Promise<{ success: boolean }> {
  return api.del<{ success: boolean }>('/api/competitions', { id });
}

export async function fetchCompetitionDashboard(competitionId: string): Promise<CompetitionDashboardStats> {
  return api.get<CompetitionDashboardStats>(`/api/competition-dashboard?competition_id=${encodeURIComponent(competitionId)}`);
}

export async function fetchCompetitionParticipants(competitionId: string, params: { status?: string; search?: string } = {}): Promise<CompetitionRegistration[]> {
  const query = new URLSearchParams({ competition_id: competitionId });
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  return api.get<CompetitionRegistration[]>(`/api/competition-participants?${query.toString()}`);
}

export async function registerCompetitionParticipant(payload: {
  competition_id: string;
  participant_name: string;
  email: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  user_id?: string;
}): Promise<CompetitionRegistration> {
  return api.post<CompetitionRegistration>('/api/competition-participants', payload);
}

export async function updateParticipantStatus(id: string, payload: {
  status?: string;
  suspension_reason?: string;
  participant_name?: string;
  bio?: string;
  phone?: string;
}): Promise<CompetitionRegistration> {
  return api.put<CompetitionRegistration>('/api/competition-participants', { id, ...payload });
}

export async function fetchCompetitionSubmissions(competitionId: string, params: {
  registration_id?: string;
  status?: string;
  search?: string;
  limit?: number;
} = {}): Promise<CompetitionSubmission[]> {
  const query = new URLSearchParams({ competition_id: competitionId });
  if (params.registration_id) query.set('registration_id', params.registration_id);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.limit) query.set('limit', String(params.limit));
  return api.get<CompetitionSubmission[]>(`/api/competition-submissions?${query.toString()}`);
}

export async function submitCompetitionEntry(payload: {
  competition_id: string;
  registration_id: string;
  title: string;
  description?: string;
  media_type: 'image' | 'video';
  media_url: string;
  thumbnail_url?: string;
  participant_id?: string;
}): Promise<CompetitionSubmission> {
  return api.post<CompetitionSubmission>('/api/competition-submissions', payload);
}

export async function moderateSubmission(id: string, payload: {
  status: 'approved' | 'rejected' | 'removed';
  rejection_reason?: string;
}): Promise<CompetitionSubmission> {
  return api.put<CompetitionSubmission>('/api/competition-submissions', {
    id,
    action: 'moderate',
    ...payload,
  });
}

export async function deleteSubmission(id: string): Promise<{ success: boolean }> {
  return api.del<{ success: boolean }>('/api/competition-submissions', { id });
}

export async function toggleSubmissionLike(payload: {
  competition_id: string;
  submission_id: string;
  voter_email: string;
  user_id?: string;
}): Promise<{ liked: boolean }> {
  return api.post<{ liked: boolean }>('/api/competition-social', {
    action: 'like',
    ...payload,
  });
}

export async function fetchSubmissionComments(submissionId: string): Promise<CompetitionComment[]> {
  return api.get<CompetitionComment[]>(`/api/competition-social?submission_id=${encodeURIComponent(submissionId)}`);
}

export async function addSubmissionComment(payload: {
  competition_id: string;
  submission_id: string;
  author_name: string;
  author_email: string;
  comment_text: string;
  author_avatar?: string;
  user_id?: string;
}): Promise<CompetitionComment> {
  return api.post<CompetitionComment>('/api/competition-social', {
    action: 'comment',
    ...payload,
  });
}

export async function reportCompetitionItem(payload: {
  competition_id: string;
  target_type: 'submission' | 'participant' | 'comment';
  target_id: string;
  reason: string;
  details?: string;
  reported_by_email?: string;
}): Promise<CompetitionReport> {
  return api.post<CompetitionReport>('/api/competition-social', {
    action: 'report',
    ...payload,
  });
}

export async function fetchCompetitionReports(competitionId: string, status?: string): Promise<CompetitionReport[]> {
  const query = new URLSearchParams({ competition_id: competitionId, type: 'reports' });
  if (status) query.set('status', status);
  return api.get<CompetitionReport[]>(`/api/competition-social?${query.toString()}`);
}

export async function moderateReport(reportId: string, status: string, action_taken?: string): Promise<CompetitionReport> {
  return api.put<CompetitionReport>('/api/competition-social', {
    report_id: reportId,
    status,
    action_taken,
  });
}

export async function fetchCompetitionLeaderboard(competitionId: string, limit?: number): Promise<any[]> {
  const query = new URLSearchParams({ competition_id: competitionId });
  if (limit) query.set('limit', String(limit));
  return api.get<any[]>(`/api/competition-leaderboard?${query.toString()}`);
}

export async function publishOfficialWinners(competitionId: string, winners: any[]): Promise<{ success: boolean; winners: CompetitionWinner[] }> {
  return api.post<{ success: boolean; winners: CompetitionWinner[] }>('/api/competition-leaderboard', {
    competition_id: competitionId,
    winners,
  });
}

export async function fetchCompetitionWinners(competitionId: string): Promise<CompetitionWinner[]> {
  return api.get<CompetitionWinner[]>(`/api/competition-leaderboard?competition_id=${encodeURIComponent(competitionId)}&type=winners`);
}

export interface PublicCompetitionPayload {
  competition: Competition;
  stats: {
    total_participants: number;
    total_submissions: number;
    total_likes: number;
    total_views: number;
  };
  feed: CompetitionSubmission[];
  leaderboard: any[];
  winners: CompetitionWinner[];
  server_time: string;
}

export async function fetchPublicCompetition(identifier: { domain?: string; subdomain?: string; slug?: string; id?: string }): Promise<PublicCompetitionPayload> {
  const query = new URLSearchParams();
  if (identifier.domain) query.set('domain', identifier.domain);
  if (identifier.subdomain) query.set('subdomain', identifier.subdomain);
  if (identifier.slug) query.set('slug', identifier.slug);
  if (identifier.id) query.set('id', identifier.id);
  return api.get<PublicCompetitionPayload>(`/api/competition-public?${query.toString()}`);
}
