import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Trophy, Heart, MessageSquare, Share2, UploadCloud, CheckCircle2,
  Calendar, Award, ShieldAlert, Sparkles, UserPlus, Play, Check,
  AlertCircle, ChevronRight, ExternalLink, Globe, Clock, Layers
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { uploadFile } from '../lib/upload';
import { formatDate, formatDateTime, formatNumber } from '../lib/utils';
import {
  fetchPublicCompetition,
  registerCompetitionParticipant,
  submitCompetitionEntry,
  toggleSubmissionLike,
  addSubmissionComment,
  fetchSubmissionComments,
  reportCompetitionItem,
} from '../lib/competitionsRepo';
import type { CompetitionSubmission } from '../types';

export default function PublicCompetitionPortal() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { lang, setLang, t } = useLanguage();

  const domainParam = searchParams.get('domain');
  const subdomainParam = searchParams.get('subdomain');

  // Active section tab
  const [activeTab, setActiveTab] = useState<'feed' | 'leaderboard' | 'rules' | 'winners'>('feed');

  // Identification resolution
  const identifier = useMemo(() => {
    if (slug) return { slug };
    if (subdomainParam) return { subdomain: subdomainParam };
    if (domainParam) return { domain: domainParam };
    const host = window.location.hostname;
    if (host && !['localhost', '127.0.0.1'].includes(host)) {
      return { domain: host };
    }
    return { slug: 'photo' }; // fallback
  }, [slug, domainParam, subdomainParam]);

  // Main Public Data Query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['public-competition', identifier],
    queryFn: () => fetchPublicCompetition(identifier),
  });

  const competition = data?.competition;
  const feed = data?.feed || [];
  const leaderboard = data?.leaderboard || [];
  const winners = data?.winners || [];
  const stats = data?.stats;

  // Local voter session
  const [voterEmail, setVoterEmail] = useState(() => localStorage.getItem('crm_voter_email') || '');
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [pendingLikeSubId, setPendingLikeSubId] = useState<string | null>(null);

  // Registration Modal
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBio, setRegBio] = useState('');

  // Submission Entry Modal
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryDesc, setEntryDesc] = useState('');
  const [entryMediaType, setEntryMediaType] = useState<'image' | 'video'>('image');
  const [entryMediaUrl, setEntryMediaUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Active comments modal
  const [selectedFeedSub, setSelectedFeedSub] = useState<CompetitionSubmission | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commenterName, setCommenterName] = useState('');
  const [commenterEmail, setCommenterEmail] = useState('');

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['public-submission-comments', selectedFeedSub?.id],
    queryFn: () => selectedFeedSub ? fetchSubmissionComments(selectedFeedSub.id) : Promise.resolve([]),
    enabled: !!selectedFeedSub,
  });

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState('');
  const [reportTargetType, setReportTargetType] = useState<'submission' | 'comment'>('submission');
  const [reportReason, setReportReason] = useState('Inappropriate Content');
  const [reportDetails, setReportDetails] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');

  // Media Viewer
  const [mediaViewerSub, setMediaViewerSub] = useState<CompetitionSubmission | null>(null);

  // Save voter email helper
  const handleSaveVoterEmail = (email: string) => {
    localStorage.setItem('crm_voter_email', email);
    setVoterEmail(email);
    setEmailModalOpen(false);
    if (pendingLikeSubId && competition) {
      executeLike(pendingLikeSubId, email);
      setPendingLikeSubId(null);
    }
  };

  const executeLike = async (submissionId: string, email: string) => {
    try {
      const res = await toggleSubmissionLike({
        competition_id: competition!.id,
        submission_id: submissionId,
        voter_email: email,
      });
      refetch();
      if (res.liked) {
        toast('Vote recorded! Thank you for supporting.', 'success');
      } else {
        toast('Vote removed.', 'info');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to vote', 'error');
    }
  };

  const handleLikeClick = (submissionId: string) => {
    if (!voterEmail) {
      setPendingLikeSubId(submissionId);
      setEmailModalOpen(true);
      return;
    }
    executeLike(submissionId, voterEmail);
  };

  // Participant Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!competition) return;
    try {
      await registerCompetitionParticipant({
        competition_id: competition.id,
        participant_name: regName,
        email: regEmail,
        phone: regPhone || undefined,
        bio: regBio || undefined,
      });
      localStorage.setItem('crm_participant_email', regEmail);
      localStorage.setItem('crm_voter_email', regEmail);
      setVoterEmail(regEmail);
      toast(t('registeredSuccess'), 'success');
      setRegModalOpen(false);
      refetch();
    } catch (err: any) {
      toast(err.message || 'Registration failed', 'error');
    }
  };

  // Submit Entry
  const handleEntryUpload = async (file: File) => {
    try {
      setUploadingFile(true);
      const res = await uploadFile(file, 'competitions');
      setEntryMediaUrl(res.url);
      toast('Media uploaded successfully', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to upload media', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!competition) return;
    const email = regEmail || voterEmail || localStorage.getItem('crm_participant_email');
    if (!email) {
      toast('Please enter your registered participant email first', 'info');
      setRegModalOpen(true);
      return;
    }

    try {
      // Find or auto-register participant
      const reg = await registerCompetitionParticipant({
        competition_id: competition.id,
        participant_name: regName || email.split('@')[0],
        email: email,
      });

      await submitCompetitionEntry({
        competition_id: competition.id,
        registration_id: reg.id,
        title: entryTitle,
        description: entryDesc,
        media_type: entryMediaType,
        media_url: entryMediaUrl,
      });

      toast('Entry submitted successfully! It will be live once reviewed.', 'success');
      setSubmitModalOpen(false);
      setEntryTitle('');
      setEntryDesc('');
      setEntryMediaUrl('');
      refetch();
    } catch (err: any) {
      toast(err.message || 'Failed to submit entry', 'error');
    }
  };

  // Post Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedSub || !commentInput.trim() || !competition) return;
    try {
      await addSubmissionComment({
        competition_id: competition.id,
        submission_id: selectedFeedSub.id,
        author_name: commenterName || 'Guest Viewer',
        author_email: commenterEmail || voterEmail || 'guest@viewer.io',
        comment_text: commentInput.trim(),
      });
      setCommentInput('');
      refetchComments();
      refetch();
      toast('Comment posted!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to post comment', 'error');
    }
  };

  // Submit Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!competition) return;
    try {
      await reportCompetitionItem({
        competition_id: competition.id,
        target_type: reportTargetType,
        target_id: reportTargetId,
        reason: reportReason,
        details: reportDetails,
        reported_by_email: reporterEmail || voterEmail,
      });
      toast('Report submitted. Our moderation team will review this item.', 'success');
      setReportModalOpen(false);
      setReportDetails('');
    } catch (err: any) {
      toast(err.message || 'Failed to submit report', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 space-y-4">
        <Trophy className="h-12 w-12 text-brand-500 animate-bounce" />
        <p className="text-sm font-semibold tracking-wider text-slate-400">Loading Competition Portal...</p>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Trophy className="h-16 w-16 text-slate-600" />
        <h2 className="text-2xl font-bold">Competition Not Found</h2>
        <p className="text-sm text-slate-400 max-w-md">
          The requested competition website could not be found. Please check the URL or subdomain.
        </p>
        <Link to="/" className="text-brand-400 font-bold hover:underline">
          Return to CRM
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
              {competition.logo_url ? (
                <img src={competition.logo_url} alt={competition.name} className="h-full w-full object-contain p-1" />
              ) : (
                <Trophy className="h-6 w-6 text-brand-500" />
              )}
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white line-clamp-1">{competition.name}</h1>
              <p className="text-xs text-slate-400 font-medium capitalize">{competition.category} Competition</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher Button */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  lang === 'en' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('ta')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  lang === 'ta' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                தமிழ்
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setRegModalOpen(true)}
              className="text-xs border-slate-700 hover:bg-slate-900 text-slate-200"
            >
              {t('registerNow')}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setSubmitModalOpen(true)}
              className="text-xs gap-1.5 shadow-lg shadow-brand-600/30"
            >
              <UploadCloud className="h-3.5 w-3.5" /> {t('uploadEntry')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <div className="relative w-full border-b border-slate-800 bg-linear-to-b from-slate-900 to-slate-950 overflow-hidden">
        {competition.banner_url && (
          <div className="absolute inset-0 opacity-20">
            <img src={competition.banner_url} alt="Hero" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/60 to-transparent" />
          </div>
        )}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-500/10 border border-brand-500/30 text-brand-400 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{competition.status.toUpperCase()} CONTEST</span>
          </div>

          <div className="max-w-3xl space-y-3">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              {competition.name}
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {lang === 'ta' && competition.description_ta ? competition.description_ta : competition.description}
            </p>
          </div>

          {/* Quick Metrics & Call to Action Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl pt-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('totalParticipants')}</p>
              <p className="text-2xl font-black text-white mt-1">{stats?.total_participants || 0}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('totalSubmissions')}</p>
              <p className="text-2xl font-black text-white mt-1">{stats?.total_submissions || 0}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-400">{t('totalLikes')}</p>
              <p className="text-2xl font-black text-rose-400 mt-1">{formatNumber(stats?.total_likes || 0)}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md text-center flex flex-col justify-center items-center">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSubmitModalOpen(true)}
                className="w-full text-xs font-bold"
              >
                {t('enterCompetition')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-16 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto">
          {[
            { key: 'feed', label: t('exploreFeed'), icon: Sparkles, count: feed.length },
            { key: 'leaderboard', label: t('leaderboard'), icon: Award, count: leaderboard.length },
            { key: 'rules', label: t('rulesAndPrizes'), icon: Layers },
            { key: 'winners', label: t('winners'), icon: Trophy, count: winners.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-brand-500 text-brand-400 bg-brand-500/10'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className={`px-2 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* TAB 1: SOCIAL FEED & ENTRIES */}
        {activeTab === 'feed' && (
          <div className="space-y-6">
            {feed.length === 0 ? (
              <EmptyState
                icon={<Trophy className="h-6 w-6 text-brand-400" />}
                title="Be the First to Enter!"
                description="No submissions have been approved yet. Upload your photos or videos to start getting votes!"
                action={
                  <Button variant="primary" onClick={() => setSubmitModalOpen(true)}>
                    Upload Your Entry
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {feed.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden hover:border-slate-700 transition-all shadow-md group"
                  >
                    {/* Media Display */}
                    <div
                      onClick={() => setMediaViewerSub(sub)}
                      className="relative h-60 w-full bg-slate-950 cursor-pointer overflow-hidden"
                    >
                      {sub.media_type === 'video' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white bg-slate-950">
                          <Play className="h-12 w-12 text-white/80 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold mt-2 text-slate-400">Play Video</span>
                        </div>
                      ) : (
                        <img
                          src={sub.media_url}
                          alt={sub.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}

                      {/* Entry Pill */}
                      <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/70 text-white backdrop-blur-xs">
                        {sub.submission_no}
                      </span>
                    </div>

                    {/* Card Content & Interaction */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-400">By {sub.participant_name}</p>
                          <span className="text-[10px] text-slate-500">{formatDate(sub.created_at)}</span>
                        </div>
                        <h3 className="font-bold text-base text-white mt-1 line-clamp-1">{sub.title}</h3>
                        {sub.description && (
                          <p className="text-xs text-slate-400 line-clamp-2 mt-1">{sub.description}</p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                        <button
                          onClick={() => handleLikeClick(sub.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-colors"
                        >
                          <Heart className="h-4 w-4 fill-rose-500" />
                          <span>{sub.likes_count} Likes</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedFeedSub(sub)}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Comments"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(window.location.href);
                              toast(t('copiedLink'), 'success');
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Share"
                          >
                            <Share2 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => {
                              setReportTargetId(sub.id);
                              setReportTargetType('submission');
                              setReportModalOpen(true);
                            }}
                            className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Report"
                          >
                            <ShieldAlert className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 text-center space-y-2">
              <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                <Award className="h-6 w-6 text-amber-400" />
                Live Standings & Rankings
              </h3>
              <p className="text-xs text-slate-400">
                Rankings are updated live based on verified unique voter likes.
              </p>
            </div>

            {leaderboard.length === 0 ? (
              <EmptyState icon={<Award className="h-6 w-6 text-amber-400" />} title="No Rankings Yet" description="Votes are being collected." />
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-4 w-16">Rank</th>
                      <th className="px-5 py-4">Participant & Entry</th>
                      <th className="px-5 py-4 text-right">Votes (Likes)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {leaderboard.map((row) => (
                      <tr key={row.submission_id} className={`hover:bg-slate-800/50 transition-colors ${row.calculated_rank === 1 ? 'bg-amber-500/10' : ''}`}>
                        <td className="px-5 py-4">
                          <span className={`h-8 w-8 rounded-lg font-black text-xs flex items-center justify-center ${
                            row.calculated_rank === 1
                              ? 'bg-amber-400 text-slate-950 font-black'
                              : row.calculated_rank === 2
                              ? 'bg-slate-300 text-slate-950 font-bold'
                              : row.calculated_rank === 3
                              ? 'bg-amber-700 text-white font-bold'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            #{row.calculated_rank}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0">
                              <img src={row.media_url} alt={row.title} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-white">{row.title}</p>
                              <p className="text-xs text-slate-400">By {row.participant_name} ({row.submission_no})</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-black text-rose-400 text-base flex items-center justify-end gap-1.5">
                            <Heart className="h-4 w-4 fill-rose-500" /> {row.likes_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RULES & PRIZES */}
        {activeTab === 'rules' && (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Rewards Tiers */}
            {competition.rewards && competition.rewards.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-400" />
                  {t('rewardsAndPrizes')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {competition.rewards.map((r, i) => (
                    <div key={i} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2">
                      <span className="h-8 w-8 rounded-lg bg-amber-400/20 text-amber-400 font-black text-xs flex items-center justify-center">
                        #{r.place}
                      </span>
                      <h4 className="font-bold text-base text-white">{r.title}</h4>
                      {r.amount && <p className="text-lg font-black text-emerald-400">{r.amount}</p>}
                      {r.description && <p className="text-xs text-slate-400">{r.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rules Text (Bilingual) */}
            <div className="space-y-4 p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
              <h3 className="text-lg font-bold text-white">{t('rulesEn')}</h3>
              <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                {lang === 'ta' && competition.rules_ta ? competition.rules_ta : (competition.rules || 'Standard fair play rules apply.')}
              </div>
            </div>

            {/* Eligibility Criteria */}
            {(competition.eligibility || competition.eligibility_ta) && (
              <div className="space-y-4 p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
                <h3 className="text-lg font-bold text-white">{t('eligibilityEn')}</h3>
                <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                  {lang === 'ta' && competition.eligibility_ta ? competition.eligibility_ta : competition.eligibility}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: WINNERS / HALL OF FAME */}
        {activeTab === 'winners' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-center space-y-2">
              <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                <Trophy className="h-6 w-6 text-amber-400" />
                Hall of Fame & Official Winners
              </h3>
              <p className="text-xs text-slate-400">
                Official announcement of winners selected through public voting and review.
              </p>
            </div>

            {winners.length === 0 ? (
              <EmptyState
                icon={<Trophy className="h-6 w-6 text-amber-400" />}
                title="Winners Pending Announcement"
                description="The contest is currently in progress. Official winners will be announced once voting concludes."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {winners.map((w) => (
                  <div key={w.id} className="p-6 rounded-2xl border border-amber-500/30 bg-slate-900/60 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950">
                        Rank #{w.place}
                      </span>
                      {w.prize_amount && (
                        <span className="text-sm font-extrabold text-emerald-400">{w.prize_amount}</span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-lg text-white">{w.participant_name}</h4>
                      <p className="text-xs text-amber-400 font-semibold">{w.prize_title}</p>
                    </div>

                    {w.media_url && (
                      <div className="relative h-44 w-full rounded-xl overflow-hidden border border-slate-800">
                        <img src={w.media_url} alt={w.participant_name} className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                      <span>{w.final_likes} verified votes</span>
                      <span>{formatDate(w.announced_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Voter Email Capture Modal (for one-click voting) */}
      <Modal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        title="Verify Your Vote"
        size="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            To ensure fair voting and prevent duplicate votes, please enter your email address.
          </p>
          <Input
            type="email"
            placeholder="your.email@example.com"
            value={voterEmail}
            onChange={(e) => setVoterEmail(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEmailModalOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!voterEmail || !voterEmail.includes('@')}
              onClick={() => handleSaveVoterEmail(voterEmail)}
            >
              Verify & Cast Vote
            </Button>
          </div>
        </div>
      </Modal>

      {/* Registration Modal */}
      <Modal
        open={regModalOpen}
        onClose={() => setRegModalOpen(false)}
        title={t('registerNow')}
        size="max-w-lg"
      >
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {t('participantName')} *
            </label>
            <Input
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {t('email')} *
            </label>
            <Input
              type="email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="rahul@example.com"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {t('phone')}
            </label>
            <Input
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              placeholder="+91 9876543210"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {t('bio')}
            </label>
            <Textarea
              value={regBio}
              onChange={(e) => setRegBio(e.target.value)}
              placeholder="Short bio or portfolio description..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setRegModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {t('registerNow')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Submit Entry Modal */}
      <Modal
        open={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title={t('uploadEntry')}
        size="max-w-lg"
      >
        <form onSubmit={handleSubmitEntry} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {t('submissionTitle')} *
            </label>
            <Input
              value={entryTitle}
              onChange={(e) => setEntryTitle(e.target.value)}
              placeholder="e.g. Sunset over Marina Beach"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Description
            </label>
            <Textarea
              value={entryDesc}
              onChange={(e) => setEntryDesc(e.target.value)}
              placeholder="Camera settings, story behind the shot..."
              rows={2}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Media Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="radio"
                  name="mediaType"
                  value="image"
                  checked={entryMediaType === 'image'}
                  onChange={() => setEntryMediaType('image')}
                />
                Photo (Image)
              </label>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="radio"
                  name="mediaType"
                  value="video"
                  checked={entryMediaType === 'video'}
                  onChange={() => setEntryMediaType('video')}
                />
                Video
              </label>
            </div>
          </div>

          {/* Upload media area */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {t('submissionMedia')} *
            </label>
            {entryMediaUrl ? (
              <div className="relative h-40 w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                {entryMediaType === 'video' ? (
                  <video src={entryMediaUrl} controls className="w-full h-full object-cover" />
                ) : (
                  <img src={entryMediaUrl} alt="Preview" className="w-full h-full object-contain" />
                )}
                <button
                  type="button"
                  onClick={() => setEntryMediaUrl('')}
                  className="absolute top-2 right-2 px-2 py-1 rounded-md text-xs bg-rose-600 text-white font-bold"
                >
                  Change
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-slate-800 rounded-xl hover:bg-slate-900 cursor-pointer transition-colors">
                <UploadCloud className="h-8 w-8 text-slate-500 mb-2" />
                <span className="text-xs font-medium text-slate-400">
                  {uploadingFile ? 'Uploading to secure storage...' : 'Click or drop file to upload'}
                </span>
                <input
                  type="file"
                  accept={entryMediaType === 'video' ? 'video/*' : 'image/*'}
                  className="hidden"
                  disabled={uploadingFile}
                  onChange={(e) => e.target.files?.[0] && handleEntryUpload(e.target.files[0])}
                />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setSubmitModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={!entryMediaUrl || !entryTitle.trim() || uploadingFile}>
              {uploadingFile ? 'Uploading...' : 'Submit Entry'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Comments Modal */}
      <Modal
        open={!!selectedFeedSub}
        onClose={() => setSelectedFeedSub(null)}
        title={`Comments on "${selectedFeedSub?.title || ''}"`}
        size="max-w-md"
      >
        <div className="space-y-4">
          <div className="max-h-60 overflow-y-auto space-y-3 p-1">
            {(!comments || comments.length === 0) ? (
              <p className="text-xs text-slate-500 text-center py-6">Be the first to leave a comment!</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{c.author_name}</span>
                    <span className="text-[10px] text-slate-500">{formatDateTime(c.created_at)}</span>
                  </div>
                  <p className="text-slate-300">{c.comment_text}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handlePostComment} className="space-y-2 pt-2 border-t border-slate-800">
            {!voterEmail && (
              <Input
                placeholder="Your Name"
                value={commenterName}
                onChange={(e) => setCommenterName(e.target.value)}
                className="text-xs h-8"
              />
            )}
            <div className="flex gap-2">
              <Input
                placeholder={t('writeComment')}
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className="flex-1 text-xs"
                required
              />
              <Button variant="primary" size="sm" type="submit">
                {t('postComment')}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Full Media Viewer Modal */}
      <Modal
        open={!!mediaViewerSub}
        onClose={() => setMediaViewerSub(null)}
        title={mediaViewerSub?.title || 'Entry Viewer'}
        size="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="relative w-full rounded-xl overflow-hidden bg-black max-h-[550px] flex items-center justify-center">
            {mediaViewerSub?.media_type === 'video' ? (
              <video src={mediaViewerSub.media_url} controls autoPlay className="max-h-[550px] w-full" />
            ) : (
              <img src={mediaViewerSub?.media_url} alt={mediaViewerSub?.title} className="max-h-[550px] w-full object-contain" />
            )}
          </div>
          <div className="flex items-center justify-between pt-2">
            <div>
              <h3 className="font-bold text-lg text-white">{mediaViewerSub?.title}</h3>
              <p className="text-xs text-slate-400">By {mediaViewerSub?.participant_name}</p>
            </div>
            {mediaViewerSub && (
              <button
                onClick={() => handleLikeClick(mediaViewerSub.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-sm font-bold transition-colors"
              >
                <Heart className="h-5 w-5 fill-rose-500" />
                <span>{mediaViewerSub.likes_count} Likes</span>
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Report Modal */}
      <Modal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title={t('report')}
        size="max-w-md"
      >
        <form onSubmit={handleSubmitReport} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {t('reportReason')}
            </label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-200 focus:outline-none"
            >
              <option value="Inappropriate Content">Inappropriate / Offensive Content</option>
              <option value="Copyright Violation">Copyright Infringement / Not Original</option>
              <option value="Spam or Bot Activity">Spam / Bot Votes</option>
              <option value="Violates Contest Rules">Violates Competition Rules</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {t('reportDetails')}
            </label>
            <Textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Provide specific details to help moderators..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setReportModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button variant="danger" size="sm" type="submit">
              {t('submitReport')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
