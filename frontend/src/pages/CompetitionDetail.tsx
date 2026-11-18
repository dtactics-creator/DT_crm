import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trophy, ArrowLeft, Users, Image as ImageIcon, Heart, MessageSquare,
  Eye, CheckCircle2, XCircle, AlertTriangle, Download, Plus, Filter,
  Search, ShieldAlert, Award, Globe, Share2, Play, RefreshCw, Sparkles,
  ExternalLink, Check, Trash2, Sliders, ChevronRight
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { usePermissions } from '../contexts/PermissionContext';
import { useLanguage } from '../contexts/LanguageContext';
import { downloadCsv } from '../lib/csv';
import { formatDate, formatDateTime, formatNumber } from '../lib/utils';
import {
  fetchCompetitionById,
  fetchCompetitionDashboard,
  fetchCompetitionParticipants,
  updateParticipantStatus,
  fetchCompetitionSubmissions,
  moderateSubmission,
  deleteSubmission,
  fetchCompetitionLeaderboard,
  publishOfficialWinners,
  fetchCompetitionWinners,
  fetchCompetitionReports,
  moderateReport,
  fetchSubmissionComments,
  addSubmissionComment,
  toggleSubmissionLike,
} from '../lib/competitionsRepo';
import type {
  Competition,
  CompetitionRegistration,
  CompetitionSubmission,
  CompetitionWinner,
  CompetitionComment,
  CompetitionReport,
} from '../types';

export default function CompetitionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { can } = usePermissions();
  const { lang, setLang, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'participants' | 'submissions' | 'social' | 'leaderboard' | 'reports'>('dashboard');

  // Queries
  const { data: competition, isLoading: compLoading } = useQuery({
    queryKey: ['competition', id],
    queryFn: () => fetchCompetitionById(id!),
    enabled: !!id,
  });

  const { data: dashboard, isLoading: dashLoading, refetch: refetchDash } = useQuery({
    queryKey: ['competition-dashboard', id],
    queryFn: () => fetchCompetitionDashboard(id!),
    enabled: !!id,
  });

  const { data: participants, isLoading: partsLoading, refetch: refetchParts } = useQuery({
    queryKey: ['competition-participants', id],
    queryFn: () => fetchCompetitionParticipants(id!),
    enabled: !!id,
  });

  const { data: submissions, isLoading: subsLoading, refetch: refetchSubs } = useQuery({
    queryKey: ['competition-submissions', id],
    queryFn: () => fetchCompetitionSubmissions(id!),
    enabled: !!id,
  });

  const { data: leaderboard, isLoading: leadLoading, refetch: refetchLead } = useQuery({
    queryKey: ['competition-leaderboard', id],
    queryFn: () => fetchCompetitionLeaderboard(id!),
    enabled: !!id,
  });

  const { data: winners, refetch: refetchWinners } = useQuery({
    queryKey: ['competition-winners', id],
    queryFn: () => fetchCompetitionWinners(id!),
    enabled: !!id,
  });

  const { data: reports, refetch: refetchReports } = useQuery({
    queryKey: ['competition-reports', id],
    queryFn: () => fetchCompetitionReports(id!),
    enabled: !!id && can('competitions.view'),
  });

  // Participant Filter & State
  const [partSearch, setPartSearch] = useState('');
  const [partStatusFilter, setPartStatusFilter] = useState('all');
  const [selectedParticipant, setSelectedParticipant] = useState<CompetitionRegistration | null>(null);
  const [suspensionModal, setSuspensionModal] = useState<CompetitionRegistration | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');

  // Submission Moderation & Preview State
  const [subStatusFilter, setSubStatusFilter] = useState('all');
  const [subSearch, setSubSearch] = useState('');
  const [previewMedia, setPreviewMedia] = useState<CompetitionSubmission | null>(null);
  const [rejectionModal, setRejectionModal] = useState<CompetitionSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [toDeleteSub, setToDeleteSub] = useState<CompetitionSubmission | null>(null);

  // Winner Publication Wizard State
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [winnerSelections, setWinnerSelections] = useState<any[]>([]);

  // Social Feed Comments modal inside Hub
  const [activeCommentSub, setActiveCommentSub] = useState<CompetitionSubmission | null>(null);
  const [commentText, setCommentText] = useState('');

  const { data: currentComments, refetch: refetchComments } = useQuery({
    queryKey: ['submission-comments', activeCommentSub?.id],
    queryFn: () => activeCommentSub ? fetchSubmissionComments(activeCommentSub.id) : Promise.resolve([]),
    enabled: !!activeCommentSub,
  });

  // Mutations
  const suspendMutation = useMutation({
    mutationFn: ({ partId, status, reason }: { partId: string; status: string; reason?: string }) =>
      updateParticipantStatus(partId, { status, suspension_reason: reason }),
    onSuccess: () => {
      refetchParts();
      refetchDash();
      toast('Participant status updated successfully', 'success');
      setSuspensionModal(null);
      setSuspensionReason('');
    },
    onError: (err: any) => toast(err.message || 'Action failed', 'error'),
  });

  const moderateSubMutation = useMutation({
    mutationFn: ({ subId, status, reason }: { subId: string; status: 'approved' | 'rejected' | 'removed'; reason?: string }) =>
      moderateSubmission(subId, { status, rejection_reason: reason }),
    onSuccess: () => {
      refetchSubs();
      refetchDash();
      refetchLead();
      toast('Submission moderated successfully', 'success');
      setRejectionModal(null);
      setRejectionReason('');
    },
    onError: (err: any) => toast(err.message || 'Moderation failed', 'error'),
  });

  const deleteSubMutation = useMutation({
    mutationFn: (subId: string) => deleteSubmission(subId),
    onSuccess: () => {
      refetchSubs();
      refetchDash();
      refetchLead();
      toast('Submission removed', 'success');
      setToDeleteSub(null);
    },
    onError: (err: any) => toast(err.message || 'Failed to remove submission', 'error'),
  });

  const publishWinnersMutation = useMutation({
    mutationFn: (winnersList: any[]) => publishOfficialWinners(id!, winnersList),
    onSuccess: () => {
      refetchWinners();
      refetchDash();
      refetchSubs();
      qc.invalidateQueries({ queryKey: ['competition', id] });
      toast('Official winners published successfully!', 'success');
      setPublishModalOpen(false);
    },
    onError: (err: any) => toast(err.message || 'Failed to publish winners', 'error'),
  });

  const postCommentMutation = useMutation({
    mutationFn: (text: string) =>
      addSubmissionComment({
        competition_id: id!,
        submission_id: activeCommentSub!.id,
        author_name: 'CRM Moderator',
        author_email: 'admin@dtactics.io',
        comment_text: text,
      }),
    onSuccess: () => {
      setCommentText('');
      refetchComments();
      refetchSubs();
      toast('Comment posted', 'success');
    },
    onError: (err: any) => toast(err.message || 'Failed to post comment', 'error'),
  });

  const resolveReportMutation = useMutation({
    mutationFn: ({ reportId, status, actionTaken }: { reportId: string; status: string; actionTaken: string }) =>
      moderateReport(reportId, status, actionTaken),
    onSuccess: () => {
      refetchReports();
      refetchDash();
      toast('Report updated', 'success');
    },
  });

  // Filtered Participants
  const filteredParticipants = useMemo(() => {
    return (participants || []).filter((p) => {
      if (partStatusFilter !== 'all' && p.status !== partStatusFilter) return false;
      if (partSearch.trim()) {
        const q = partSearch.toLowerCase();
        return (
          p.participant_name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.phone || '').includes(q)
        );
      }
      return true;
    });
  }, [participants, partStatusFilter, partSearch]);

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    return (submissions || []).filter((s) => {
      if (subStatusFilter !== 'all' && s.status !== subStatusFilter) return false;
      if (subSearch.trim()) {
        const q = subSearch.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          (s.submission_no || '').toLowerCase().includes(q) ||
          (s.participant_name || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [submissions, subStatusFilter, subSearch]);

  // Export Participants CSV
  const handleExportParticipants = () => {
    if (!filteredParticipants.length) {
      toast('No participants to export', 'info');
      return;
    }
    const headers = ['Name', 'Email', 'Phone', 'Status', 'Registered Date', 'Submissions Count'];
    const rows = filteredParticipants.map((p) => [
      `"${p.participant_name}"`,
      `"${p.email}"`,
      `"${p.phone || ''}"`,
      `"${p.status}"`,
      `"${p.registered_at}"`,
      p.submission_count || 0,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCsv(`participants-${competition?.slug || 'comp'}-${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
    toast(`Exported ${filteredParticipants.length} participants`, 'success');
  };

  // Open Winner Publication Wizard
  const handleOpenWinnerModal = () => {
    const defaultTiers = (competition?.rewards && competition.rewards.length > 0)
      ? competition.rewards
      : [
          { place: 1, title: '1st Prize Champion', amount: '₹25,000' },
          { place: 2, title: '2nd Prize Runner-Up', amount: '₹15,000' },
          { place: 3, title: '3rd Prize', amount: '₹10,000' },
        ];

    const initialWinners = defaultTiers.map((tier, idx) => {
      const candidate = leaderboard?.[idx];
      return {
        place: tier.place,
        prize_title: tier.title,
        prize_amount: tier.amount || '',
        submission_id: candidate?.submission_id || '',
        registration_id: candidate?.registration_id || '',
        participant_name: candidate?.participant_name || '',
        final_likes: candidate?.likes_count || 0,
        final_score: candidate?.total_score || candidate?.likes_count || 0,
        notes: candidate ? `Based on public ranking #${candidate.calculated_rank}` : '',
      };
    });

    setWinnerSelections(initialWinners);
    setPublishModalOpen(true);
  };

  if (compLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-1/3 rounded-xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="p-12 text-center">
        <EmptyState
          icon={<Trophy className="h-6 w-6 text-brand-600" />}
          title="Competition Not Found"
          description="The requested competition does not exist or has been removed."
          action={<Button onClick={() => navigate('/competitions')}>Back to Competitions</Button>}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-app">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/competitions')}
            className="p-2 rounded-xl border border-app bg-surface-1 hover:bg-surface-2 transition-colors text-muted-fg hover:text-base-fg"
            title="Back to Competitions"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-base-fg tracking-tight">{competition.name}</h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-surface-2 border border-app text-subtle-fg">
                {competition.competition_no}
              </span>
              <Badge
                label={competition.status.toUpperCase()}
                color={competition.status === 'active' ? '#10b981' : competition.status === 'completed' ? '#3b82f6' : '#64748b'}
                dot={competition.status === 'active'}
              />
            </div>
            <p className="text-xs text-subtle-fg flex items-center gap-2 mt-0.5">
              <span>Category: <strong className="text-base-fg capitalize">{competition.category}</strong></span>
              <span>•</span>
              <span>Type: <strong className="text-base-fg capitalize">{competition.type}</strong></span>
              {competition.subdomain && (
                <>
                  <span>•</span>
                  <a
                    href={`/c/${competition.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    {competition.subdomain}.guessme.co <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="flex items-center bg-surface-2 p-1 rounded-xl border border-app shadow-xs">
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'en' ? 'bg-brand-600 text-white shadow-xs' : 'text-muted-fg hover:text-base-fg'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('ta')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'ta' ? 'bg-brand-600 text-white shadow-xs' : 'text-muted-fg hover:text-base-fg'
              }`}
            >
              தமிழ்
            </button>
          </div>

          <a
            href={`/c/${competition.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-app bg-surface-1 text-xs font-bold text-base-fg hover:bg-surface-2 transition-colors shadow-xs"
          >
            <Globe className="h-4 w-4 text-brand-600" />
            Live Portal
          </a>

          {can('competitions.edit') && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenWinnerModal}
              className="gap-1.5 shadow-md shadow-brand-600/20"
            >
              <Award className="h-4 w-4 text-amber-300" /> Publish Winners
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-app pb-px overflow-x-auto">
        {[
          { key: 'dashboard', label: t('dashboard'), icon: Trophy },
          { key: 'participants', label: t('participants'), count: dashboard?.total_participants, icon: Users },
          { key: 'submissions', label: t('submissions'), count: dashboard?.total_submissions, icon: ImageIcon },
          { key: 'social', label: t('socialFeed'), icon: Heart },
          { key: 'leaderboard', label: t('leaderboard'), icon: Award },
          { key: 'reports', label: t('reports'), count: dashboard?.pending_reports, icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/20 rounded-t-xl'
                  : 'border-transparent text-muted-fg hover:text-base-fg hover:bg-surface-2 rounded-t-xl'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-brand-600 text-white' : 'bg-surface-3 text-subtle-fg'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-2xl border border-app bg-surface-1 shadow-xs">
              <div className="flex items-center justify-between text-muted-fg">
                <span className="text-xs font-semibold uppercase tracking-wider">{t('totalRegistrations')}</span>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-base-fg mt-2">{dashboard?.total_registrations || 0}</p>
              <p className="text-[11px] text-muted-fg mt-1">{dashboard?.total_participants || 0} active</p>
            </div>

            <div className="p-4 rounded-2xl border border-app bg-surface-1 shadow-xs">
              <div className="flex items-center justify-between text-muted-fg">
                <span className="text-xs font-semibold uppercase tracking-wider">{t('totalSubmissions')}</span>
                <ImageIcon className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-2xl font-black text-base-fg mt-2">{dashboard?.total_submissions || 0}</p>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">{dashboard?.approved_submissions || 0} approved</p>
            </div>

            <div className="p-4 rounded-2xl border border-app bg-surface-1 shadow-xs">
              <div className="flex items-center justify-between text-muted-fg">
                <span className="text-xs font-semibold uppercase tracking-wider">Pending Review</span>
                <CheckCircle2 className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-600 mt-2">{dashboard?.pending_submissions || 0}</p>
              <p className="text-[11px] text-rose-500 font-medium mt-1">{dashboard?.rejected_submissions || 0} rejected</p>
            </div>

            <div className="p-4 rounded-2xl border border-app bg-surface-1 shadow-xs">
              <div className="flex items-center justify-between text-muted-fg">
                <span className="text-xs font-semibold uppercase tracking-wider">{t('totalLikes')}</span>
                <Heart className="h-4 w-4 text-rose-500 fill-rose-500/20" />
              </div>
              <p className="text-2xl font-black text-rose-500 mt-2">{formatNumber(dashboard?.total_likes || 0)}</p>
              <p className="text-[11px] text-muted-fg mt-1">Verified votes</p>
            </div>

            <div className="p-4 rounded-2xl border border-app bg-surface-1 shadow-xs">
              <div className="flex items-center justify-between text-muted-fg">
                <span className="text-xs font-semibold uppercase tracking-wider">{t('totalComments')}</span>
                <MessageSquare className="h-4 w-4 text-sky-500" />
              </div>
              <p className="text-2xl font-black text-base-fg mt-2">{dashboard?.total_comments || 0}</p>
              <p className="text-[11px] text-muted-fg mt-1">Social feedback</p>
            </div>

            <div className="p-4 rounded-2xl border border-app bg-surface-1 shadow-xs">
              <div className="flex items-center justify-between text-muted-fg">
                <span className="text-xs font-semibold uppercase tracking-wider">Reports</span>
                <ShieldAlert className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-600 mt-2">{dashboard?.pending_reports || 0}</p>
              <p className="text-[11px] text-muted-fg mt-1">Needs moderation</p>
            </div>
          </div>

          {/* Official Winners Showcase (if published) */}
          {dashboard?.winners && dashboard.winners.length > 0 && (
            <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-6 w-6 text-amber-500" />
                  <h3 className="text-base font-bold text-base-fg">Official Winners Announcement</h3>
                </div>
                <Badge label="Completed" color="#3b82f6" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {dashboard.winners.map((w) => (
                  <div key={w.id} className="p-4 rounded-xl border border-app bg-surface-1 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-600 dark:text-amber-400">
                        Rank #{w.place}
                      </span>
                      {w.prize_amount && (
                        <span className="text-xs font-extrabold text-emerald-600">{w.prize_amount}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-base-fg text-sm">{w.participant_name}</p>
                      <p className="text-xs text-subtle-fg">{w.prize_title}</p>
                    </div>
                    {w.media_url && (
                      <div className="relative h-32 w-full rounded-lg overflow-hidden border border-app bg-surface-2">
                        <img src={w.media_url} alt={w.participant_name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-fg pt-1">
                      <span>{w.final_likes} verified likes</span>
                      <span>Announced {formatDate(w.announced_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Submissions & Live Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Submissions (2 cols) */}
            <div className="lg:col-span-2 p-6 rounded-2xl border border-app bg-surface-1 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base-fg text-sm uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  {t('topSubmissions')}
                </h3>
                <button
                  onClick={() => setActiveTab('submissions')}
                  className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
                >
                  View All Submissions <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {(!dashboard?.topSubmissions || dashboard.topSubmissions.length === 0) ? (
                <div className="py-12 text-center text-xs text-muted-fg">
                  No approved submissions yet. Moderate submissions to show top entries.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {dashboard.topSubmissions.map((sub, idx) => (
                    <div
                      key={sub.id}
                      onClick={() => setPreviewMedia(sub)}
                      className="group cursor-pointer rounded-xl border border-app bg-surface-2 overflow-hidden hover:border-brand-500 transition-all shadow-xs"
                    >
                      <div className="relative h-36 w-full bg-slate-900 overflow-hidden">
                        {sub.media_type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
                            <Play className="h-8 w-8 text-white/80 group-hover:scale-110 transition-transform" />
                          </div>
                        ) : (
                          <img src={sub.media_url} alt={sub.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        )}
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-black bg-black/60 text-white backdrop-blur-xs">
                          #{idx + 1}
                        </span>
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[11px] font-bold bg-black/60 text-rose-400 backdrop-blur-xs flex items-center gap-1">
                          <Heart className="h-3 w-3 fill-rose-500 text-rose-500" /> {sub.likes_count}
                        </span>
                      </div>
                      <div className="p-3">
                        <p className="font-bold text-xs text-base-fg truncate">{sub.title}</p>
                        <p className="text-[11px] text-muted-fg truncate mt-0.5">By {sub.participant_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activities (1 col) */}
            <div className="p-6 rounded-2xl border border-app bg-surface-1 shadow-xs space-y-4">
              <h3 className="font-bold text-base-fg text-sm uppercase tracking-wider">
                {t('recentActivity')}
              </h3>

              {(!dashboard?.recentActivities || dashboard.recentActivities.length === 0) ? (
                <div className="py-12 text-center text-xs text-muted-fg">
                  No recent activities logged yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboard.recentActivities.map((act) => (
                    <div key={act.id} className="p-3 rounded-xl border border-app bg-surface-2 text-xs space-y-1">
                      <div className="flex items-center justify-between text-subtle-fg">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-brand-600">
                          {act.activity_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px]">{formatDateTime(act.created_at)}</span>
                      </div>
                      <p className="text-base-fg font-medium">{act.description}</p>
                      {act.actor_name && (
                        <p className="text-[10px] text-muted-fg">By: {act.actor_name}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PARTICIPANTS */}
      {activeTab === 'participants' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border border-app bg-surface-1 shadow-xs">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[240px] flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg" />
                <Input
                  value={partSearch}
                  onChange={(e) => setPartSearch(e.target.value)}
                  placeholder="Search participants by name, email, phone..."
                  className="pl-9"
                />
              </div>

              <select
                value={partStatusFilter}
                onChange={(e) => setPartStatusFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-app bg-surface-2 text-xs font-semibold text-base-fg focus:outline-none"
              >
                <option value="all">All Participants</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
              </select>
            </div>

            <Button variant="outline" size="sm" onClick={handleExportParticipants} className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>

          {partsLoading ? (
            <Skeleton className="h-96 w-full rounded-2xl" />
          ) : filteredParticipants.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6 text-brand-600" />}
              title="No Participants Found"
              description="No participants have registered for this competition yet."
            />
          ) : (
            <div className="rounded-2xl border border-app bg-surface-1 shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-app bg-surface-2 text-[11px] font-bold uppercase tracking-wider text-subtle-fg">
                    <th className="px-5 py-3">Participant</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Entries</th>
                    <th className="px-4 py-3">Registered On</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app text-xs">
                  {filteredParticipants.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-brand-600/10 text-brand-600 font-bold flex items-center justify-center shrink-0">
                            {p.participant_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-base-fg text-sm">{p.participant_name}</p>
                            {p.bio && <p className="text-muted-fg text-[11px] line-clamp-1">{p.bio}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-fg space-y-0.5">
                        <p className="text-base-fg">{p.email}</p>
                        {p.phone && <p>{p.phone}</p>}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-base-fg">
                        {p.submission_count || 0} entries
                      </td>
                      <td className="px-4 py-3.5 text-muted-fg">
                        {formatDateTime(p.registered_at)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          label={p.status.toUpperCase()}
                          color={p.status === 'active' ? '#10b981' : '#ef4444'}
                          dot={p.status === 'active'}
                        />
                        {p.status === 'suspended' && p.suspension_reason && (
                          <p className="text-[10px] text-rose-500 mt-0.5 truncate max-w-[150px]" title={p.suspension_reason}>
                            {p.suspension_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {can('competitions.edit') && (
                          p.status === 'active' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSuspensionModal(p);
                                setSuspensionReason('');
                              }}
                              className="text-xs text-rose-500 hover:text-rose-600 hover:border-rose-300"
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => suspendMutation.mutate({ partId: p.id, status: 'active' })}
                              className="text-xs text-emerald-600 hover:text-emerald-700 hover:border-emerald-300"
                            >
                              Reactivate
                            </Button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SUBMISSIONS & MODERATION */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border border-app bg-surface-1 shadow-xs">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[240px] flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg" />
                <Input
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  placeholder="Search submissions by title, entry no, participant..."
                  className="pl-9"
                />
              </div>

              <select
                value={subStatusFilter}
                onChange={(e) => setSubStatusFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-app bg-surface-2 text-xs font-semibold text-base-fg focus:outline-none"
              >
                <option value="all">All Moderation Statuses</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {subsLoading ? (
            <Skeleton className="h-96 w-full rounded-2xl" />
          ) : filteredSubmissions.length === 0 ? (
            <EmptyState
              icon={<ImageIcon className="h-6 w-6 text-brand-600" />}
              title="No Submissions Found"
              description="No entries match the filter criteria."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex flex-col rounded-2xl border border-app bg-surface-1 overflow-hidden hover:border-brand-500/40 hover:shadow-lg transition-all"
                >
                  {/* Media Preview Box */}
                  <div
                    onClick={() => setPreviewMedia(sub)}
                    className="relative h-48 w-full bg-slate-900 cursor-pointer overflow-hidden group"
                  >
                    {sub.media_type === 'video' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white bg-slate-900">
                        <Play className="h-10 w-10 text-white/80 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold mt-2">Click to Play Video</span>
                      </div>
                    ) : (
                      <img src={sub.media_url} alt={sub.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    )}

                    {/* Status badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <Badge
                        label={sub.status.toUpperCase()}
                        color={sub.status === 'approved' ? '#10b981' : sub.status === 'rejected' ? '#ef4444' : '#f59e0b'}
                        dot={sub.status === 'approved'}
                      />
                    </div>

                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/70 text-white">
                      {sub.submission_no}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="font-bold text-sm text-base-fg line-clamp-1">{sub.title}</h4>
                      {sub.description && (
                        <p className="text-xs text-subtle-fg line-clamp-2 mt-1">{sub.description}</p>
                      )}
                      <p className="text-xs text-muted-fg mt-2">By: <strong className="text-base-fg">{sub.participant_name}</strong></p>
                    </div>

                    {sub.rejection_reason && (
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                        <strong>Reason:</strong> {sub.rejection_reason}
                      </div>
                    )}

                    {/* Engagement Counts */}
                    <div className="flex items-center justify-between py-2 border-y border-app text-xs text-muted-fg">
                      <span className="flex items-center gap-1 font-bold text-rose-500">
                        <Heart className="h-3.5 w-3.5 fill-rose-500" /> {sub.likes_count} likes
                      </span>
                      <button
                        onClick={() => setActiveCommentSub(sub)}
                        className="flex items-center gap-1 hover:text-base-fg transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-blue-500" /> {sub.comments_count} comments
                      </button>
                    </div>

                    {/* Moderation Controls */}
                    {can('competitions.edit') && (
                      <div className="flex items-center gap-2 pt-1">
                        {sub.status !== 'approved' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => moderateSubMutation.mutate({ subId: sub.id, status: 'approved' })}
                            className="flex-1 text-xs gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </Button>
                        )}
                        {sub.status !== 'rejected' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRejectionModal(sub);
                              setRejectionReason('');
                            }}
                            className="flex-1 text-xs text-rose-500 hover:border-rose-300 gap-1"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                        )}
                        <button
                          onClick={() => setToDeleteSub(sub)}
                          className="p-1.5 rounded-lg text-muted-fg hover:text-rose-500 hover:bg-surface-2 transition-colors"
                          title="Remove Entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SOCIAL FEED PREVIEW */}
      {activeTab === 'social' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="p-4 rounded-2xl border border-app bg-surface-1 text-center space-y-1 shadow-xs">
            <h3 className="font-bold text-base-fg text-sm">Competition Social Feed</h3>
            <p className="text-xs text-muted-fg">
              Approved entries appear here as an interactive feed. Users can like, comment, and share.
            </p>
          </div>

          {submissions?.filter((s) => s.status === 'approved').length === 0 ? (
            <EmptyState
              icon={<Heart className="h-6 w-6 text-rose-500" />}
              title="No Approved Submissions"
              description="Approve submissions in the Submissions tab to display them on the social feed."
            />
          ) : (
            submissions?.filter((s) => s.status === 'approved').map((sub) => (
              <div key={sub.id} className="rounded-2xl border border-app bg-surface-1 shadow-xs overflow-hidden">
                {/* Author Header */}
                <div className="p-4 flex items-center justify-between border-b border-app">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-brand-600/10 text-brand-600 font-bold flex items-center justify-center">
                      {sub.participant_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-base-fg">{sub.participant_name}</p>
                      <p className="text-[10px] text-muted-fg">{formatDateTime(sub.created_at)}</p>
                    </div>
                  </div>
                  <Badge label={sub.submission_no || 'SUB'} color="#64748b" />
                </div>

                {/* Media */}
                <div className="relative w-full bg-black max-h-[500px] flex items-center justify-center">
                  {sub.media_type === 'video' ? (
                    <video src={sub.media_url} controls className="max-h-[500px] w-full" />
                  ) : (
                    <img src={sub.media_url} alt={sub.title} className="max-h-[500px] w-full object-contain" />
                  )}
                </div>

                {/* Content & Actions */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleSubmissionLike({
                          competition_id: id!,
                          submission_id: sub.id,
                          voter_email: 'moderator@dtactics.io',
                        }).then(() => refetchSubs())}
                        className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:scale-105 transition-transform"
                      >
                        <Heart className="h-5 w-5 fill-rose-500/20" /> {sub.likes_count}
                      </button>

                      <button
                        onClick={() => setActiveCommentSub(sub)}
                        className="flex items-center gap-1.5 text-xs font-bold text-muted-fg hover:text-base-fg transition-colors"
                      >
                        <MessageSquare className="h-5 w-5" /> {sub.comments_count}
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/c/${competition.slug}`);
                        toast('Link copied to clipboard!', 'success');
                      }}
                      className="p-1.5 text-muted-fg hover:text-base-fg transition-colors"
                      title="Share Entry"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-base-fg">{sub.title}</h4>
                    {sub.description && <p className="text-xs text-subtle-fg mt-1">{sub.description}</p>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 5: LEADERBOARD & WINNER MANAGEMENT */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border border-app bg-surface-1 shadow-xs">
            <div>
              <h3 className="font-bold text-base-fg text-sm flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                Live Ranked Leaderboard
              </h3>
              <p className="text-xs text-muted-fg mt-0.5">
                Ranks calculated strictly server-side by verified vote counts with tie-breaking rules.
              </p>
            </div>

            {can('competitions.edit') && (
              <Button variant="primary" size="sm" onClick={handleOpenWinnerModal} className="gap-2">
                <Award className="h-4 w-4 text-amber-300" /> Finalize & Publish Winners
              </Button>
            )}
          </div>

          {leadLoading ? (
            <Skeleton className="h-96 w-full rounded-2xl" />
          ) : (!leaderboard || leaderboard.length === 0) ? (
            <EmptyState
              icon={<Award className="h-6 w-6 text-amber-500" />}
              title="No Leaderboard Entries"
              description="Approved submissions will appear here once participants start voting."
            />
          ) : (
            <div className="rounded-2xl border border-app bg-surface-1 shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-app bg-surface-2 text-[11px] font-bold uppercase tracking-wider text-subtle-fg">
                    <th className="px-5 py-3 w-16">Rank</th>
                    <th className="px-4 py-3">Entry & Participant</th>
                    <th className="px-4 py-3">Verified Likes</th>
                    <th className="px-4 py-3">Tie-Breaker Rule</th>
                    <th className="px-5 py-3 text-right">Award Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app text-xs">
                  {leaderboard.map((row) => (
                    <tr key={row.submission_id} className={`hover:bg-surface-2 transition-colors ${row.calculated_rank === 1 ? 'bg-amber-500/5' : ''}`}>
                      <td className="px-5 py-3.5">
                        <span className={`h-8 w-8 rounded-lg font-black text-xs flex items-center justify-center ${
                          row.calculated_rank === 1
                            ? 'bg-amber-500 text-white shadow-xs'
                            : row.calculated_rank === 2
                            ? 'bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-white'
                            : row.calculated_rank === 3
                            ? 'bg-amber-700/60 text-white'
                            : 'bg-surface-2 text-muted-fg'
                        }`}>
                          #{row.calculated_rank}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-app">
                            <img src={row.media_url} alt={row.title} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-bold text-base-fg text-sm">{row.title}</p>
                            <p className="text-muted-fg text-xs">By {row.participant_name} ({row.submission_no})</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-black text-rose-500 text-sm">
                        {row.likes_count} votes
                      </td>
                      <td className="px-4 py-3.5 text-muted-fg">
                        Earliest Submission
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {row.is_winner ? (
                          <Badge label="Winner Published" color="#10b981" dot />
                        ) : (
                          <Badge label="Contender" color="#64748b" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: REPORTS & MODERATION */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-app bg-surface-1 shadow-xs">
            <h3 className="font-bold text-base-fg text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Reported Content & Users
            </h3>
            <p className="text-xs text-muted-fg mt-0.5">
              Review flagged submissions, inappropriate comments, or suspicious activity submitted by public viewers.
            </p>
          </div>

          {(!reports || reports.length === 0) ? (
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />}
              title="Clean Slate"
              description="No reports have been filed for this competition."
            />
          ) : (
            <div className="rounded-2xl border border-app bg-surface-1 shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-app bg-surface-2 text-[11px] font-bold uppercase tracking-wider text-subtle-fg">
                    <th className="px-5 py-3">Reported Item</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Reported By</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app text-xs">
                  {reports.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-brand-600 block">
                          {r.target_type}
                        </span>
                        <span className="font-mono text-muted-fg text-[11px]">{r.target_id.slice(0, 12)}...</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-base-fg">{r.reason}</p>
                        {r.details && <p className="text-muted-fg text-[11px]">{r.details}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-muted-fg">
                        {r.reported_by_email || 'Anonymous'}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          label={r.status.toUpperCase()}
                          color={r.status === 'action_taken' ? '#ef4444' : r.status === 'dismissed' ? '#64748b' : '#f59e0b'}
                        />
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        {r.status === 'pending' && can('competitions.edit') && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resolveReportMutation.mutate({ reportId: r.id, status: 'dismissed', actionTaken: 'Dismissed by moderator' })}
                              className="text-xs"
                            >
                              Dismiss
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => resolveReportMutation.mutate({ reportId: r.id, status: 'action_taken', actionTaken: 'Content flagged or removed' })}
                              className="text-xs"
                            >
                              Take Action
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Media Preview Modal */}
      <Modal
        open={!!previewMedia}
        onClose={() => setPreviewMedia(null)}
        title={previewMedia?.title || 'Submission Media Preview'}
        size="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="relative w-full rounded-xl overflow-hidden bg-black max-h-[500px] flex items-center justify-center">
            {previewMedia?.media_type === 'video' ? (
              <video src={previewMedia.media_url} controls autoPlay className="max-h-[500px] w-full" />
            ) : (
              <img src={previewMedia?.media_url} alt={previewMedia?.title} className="max-h-[500px] w-full object-contain" />
            )}
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-base-fg text-base">{previewMedia?.title}</h4>
            <p className="text-xs text-subtle-fg">{previewMedia?.description || 'No description provided.'}</p>
            <p className="text-xs text-muted-fg">
              Submitted by <strong className="text-base-fg">{previewMedia?.participant_name}</strong> on {previewMedia?.created_at && formatDateTime(previewMedia.created_at)}
            </p>
          </div>
        </div>
      </Modal>

      {/* Comments Drawer / Modal */}
      <Modal
        open={!!activeCommentSub}
        onClose={() => setActiveCommentSub(null)}
        title={`Comments: ${activeCommentSub?.title || ''}`}
        size="max-w-md"
      >
        <div className="space-y-4">
          <div className="max-h-60 overflow-y-auto space-y-3 p-1">
            {(!currentComments || currentComments.length === 0) ? (
              <p className="text-xs text-muted-fg text-center py-6">No comments on this entry yet.</p>
            ) : (
              currentComments.map((c) => (
                <div key={c.id} className="p-3 rounded-xl border border-app bg-surface-2 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base-fg">{c.author_name}</span>
                    <span className="text-[10px] text-muted-fg">{formatDateTime(c.created_at)}</span>
                  </div>
                  <p className="text-subtle-fg">{c.comment_text}</p>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-app">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a moderation comment..."
              className="flex-1 text-xs"
            />
            <Button
              variant="primary"
              size="sm"
              disabled={!commentText.trim()}
              onClick={() => postCommentMutation.mutate(commentText)}
            >
              Post
            </Button>
          </div>
        </div>
      </Modal>

      {/* Participant Suspension Modal */}
      <Modal
        open={!!suspensionModal}
        onClose={() => setSuspensionModal(null)}
        title="Suspend Participant"
        size="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-fg">
            Suspending <strong>{suspensionModal?.participant_name}</strong> will disable their voting rights and hide their submissions.
          </p>
          <Textarea
            value={suspensionReason}
            onChange={(e) => setSuspensionReason(e.target.value)}
            placeholder="Enter reason for suspension (e.g. Terms of Service violation)..."
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setSuspensionModal(null)}>Cancel</Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => suspensionModal && suspendMutation.mutate({ partId: suspensionModal.id, status: 'suspended', reason: suspensionReason })}
            >
              Confirm Suspension
            </Button>
          </div>
        </div>
      </Modal>

      {/* Submission Rejection Modal */}
      <Modal
        open={!!rejectionModal}
        onClose={() => setRejectionModal(null)}
        title="Reject Submission"
        size="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-fg">
            Please provide a reason for rejecting <strong>{rejectionModal?.title}</strong>.
          </p>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Low resolution, inappropriate content, watermarks..."
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRejectionModal(null)}>Cancel</Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => rejectionModal && moderateSubMutation.mutate({ subId: rejectionModal.id, status: 'rejected', reason: rejectionReason })}
            >
              Reject Entry
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Submission Confirm */}
      <ConfirmDialog
        open={!!toDeleteSub}
        onClose={() => setToDeleteSub(null)}
        onConfirm={() => toDeleteSub && deleteSubMutation.mutate(toDeleteSub.id)}
        title="Delete Submission?"
        message={`Are you sure you want to remove "${toDeleteSub?.title}"? This cannot be undone.`}
        confirmLabel="Remove Entry"
      />

      {/* Publish Official Winners Wizard Modal */}
      <Modal
        open={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        title="Official Winner Review & Publication Wizard"
        size="max-w-2xl"
      >
        <div className="space-y-5">
          <p className="text-xs text-muted-fg">
            Verify the top ranking candidates calculated by the server. Once published, the leaderboard will be officially finalized, and winners will be announced on the public portal.
          </p>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {winnerSelections.map((w, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-app bg-surface-2 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="h-7 w-7 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                    #{w.place}
                  </span>
                  <span className="text-xs font-mono font-bold text-brand-600">
                    {w.final_likes} verified votes
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-subtle-fg uppercase tracking-wider block mb-1">
                      Participant & Winner
                    </label>
                    <select
                      value={w.submission_id}
                      onChange={(e) => {
                        const chosen = leaderboard?.find((l) => l.submission_id === e.target.value);
                        const copy = [...winnerSelections];
                        copy[idx].submission_id = e.target.value;
                        copy[idx].participant_name = chosen?.participant_name || '';
                        copy[idx].registration_id = chosen?.registration_id || '';
                        copy[idx].final_likes = chosen?.likes_count || 0;
                        setWinnerSelections(copy);
                      }}
                      className="w-full h-9 px-3 rounded-lg border border-app bg-surface-1 text-xs font-medium focus:outline-none"
                    >
                      <option value="">-- Select Candidate --</option>
                      {leaderboard?.map((l) => (
                        <option key={l.submission_id} value={l.submission_id}>
                          Rank #{l.calculated_rank}: {l.participant_name} ({l.likes_count} likes) - {l.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-subtle-fg uppercase tracking-wider block mb-1">
                      Prize Title
                    </label>
                    <Input
                      value={w.prize_title}
                      onChange={(e) => {
                        const copy = [...winnerSelections];
                        copy[idx].prize_title = e.target.value;
                        setWinnerSelections(copy);
                      }}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-subtle-fg uppercase tracking-wider block mb-1">
                      Prize Amount / Gift
                    </label>
                    <Input
                      value={w.prize_amount}
                      onChange={(e) => {
                        const copy = [...winnerSelections];
                        copy[idx].prize_amount = e.target.value;
                        setWinnerSelections(copy);
                      }}
                      className="h-9 text-xs"
                      placeholder="e.g. ₹50,000"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-subtle-fg uppercase tracking-wider block mb-1">
                      Audit Notes / Remarks
                    </label>
                    <Input
                      value={w.notes}
                      onChange={(e) => {
                        const copy = [...winnerSelections];
                        copy[idx].notes = e.target.value;
                        setWinnerSelections(copy);
                      }}
                      className="h-9 text-xs"
                      placeholder="e.g. Unanimous voting decision"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-app">
            <Button variant="outline" size="sm" onClick={() => setPublishModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={publishWinnersMutation.isPending || winnerSelections.some((w) => !w.submission_id)}
              onClick={() => publishWinnersMutation.mutate(winnerSelections)}
              className="gap-2"
            >
              <Award className="h-4 w-4" /> Publish & Announce Winners
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
