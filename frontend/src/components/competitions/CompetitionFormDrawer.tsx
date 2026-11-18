import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, UploadCloud, Plus, Trash2, Award, Calendar, Globe, Layers, AlertCircle } from 'lucide-react';
import Drawer from '../ui/Drawer';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Field from '../ui/Field';
import Badge from '../ui/Badge';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useToast } from '../ui/Toast';
import { uploadFile } from '../../lib/upload';
import { useProjects } from '../../hooks/useProjects';
import { fetchAllCampaigns } from '../../lib/campaignsRepo';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Competition, CompetitionReward } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Competition>) => Promise<void>;
  initialData?: Competition | null;
}

const CATEGORIES = [
  { value: 'photography', label: 'Photography' },
  { value: 'short_film', label: 'Videography / Short Film' },
  { value: 'coding', label: 'Coding / Hackathon' },
  { value: 'art', label: 'Digital Art & Painting' },
  { value: 'singing', label: 'Music & Singing' },
  { value: 'dance', label: 'Dance & Performance' },
  { value: 'writing', label: 'Creative Writing & Poetry' },
  { value: 'quiz', label: 'Quiz & Trivia' },
  { value: 'general', label: 'General / Open' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'active', label: 'Active' },
  { value: 'voting_closed', label: 'Voting Closed' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const WINNER_METHODS = [
  { value: 'public_voting', label: 'Public Voting (Likes Based)' },
  { value: 'jury', label: 'Jury Evaluation' },
  { value: 'hybrid', label: 'Hybrid (Voting + Jury)' },
];

const TIE_BREAKERS = [
  { value: 'earliest_submission', label: 'Earliest Submission Wins' },
  { value: 'jury_decision', label: 'Jury Committee Decision' },
  { value: 'split_reward', label: 'Split Rewards' },
];

export default function CompetitionFormDrawer({ open, onClose, onSave, initialData }: Props) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { data: projects } = useProjects();
  const { data: campaigns } = useQuery({ queryKey: ['campaigns'], queryFn: fetchAllCampaigns });

  const [saving, setSaving] = useState(false);
  const [activeLangTab, setActiveLangTab] = useState<'en' | 'ta'>('en');

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [category, setCategory] = useState('photography');
  const [type, setType] = useState('public');
  const [status, setStatus] = useState<Competition['status']>('draft');
  const [projectId, setProjectId] = useState<string>('');
  const [campaignId, setCampaignId] = useState<string>('');

  // Multilingual content
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionTa, setDescriptionTa] = useState('');
  const [rulesEn, setRulesEn] = useState('');
  const [rulesTa, setRulesTa] = useState('');
  const [eligibilityEn, setEligibilityEn] = useState('');
  const [eligibilityTa, setEligibilityTa] = useState('');

  // Dates
  const [regStart, setRegStart] = useState('');
  const [regEnd, setRegEnd] = useState('');
  const [subStart, setSubStart] = useState('');
  const [subEnd, setSubEnd] = useState('');
  const [voteStart, setVoteStart] = useState('');
  const [voteEnd, setVoteEnd] = useState('');

  // Rules & Formats
  const [maxEntries, setMaxEntries] = useState(1);
  const [allowedFormats, setAllowedFormats] = useState<string[]>(['image']);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(50);
  const [winnerMethod, setWinnerMethod] = useState('public_voting');
  const [tieBreaker, setTieBreaker] = useState('earliest_submission');

  // Media
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Rewards
  const [rewards, setRewards] = useState<CompetitionReward[]>([
    { place: 1, title: '1st Prize Champion', amount: '₹25,000', description: 'Winner Trophy + Certificate' },
    { place: 2, title: '2nd Prize Runner-Up', amount: '₹15,000', description: 'Medal + Certificate' },
    { place: 3, title: '3rd Prize', amount: '₹10,000', description: 'Certificate of Excellence' },
  ]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setSlug(initialData.slug || '');
      setSubdomain(initialData.subdomain || '');
      setCustomDomain(initialData.custom_domain || '');
      setCategory(initialData.category || 'photography');
      setType(initialData.type || 'public');
      setStatus(initialData.status || 'draft');
      setProjectId(initialData.project_id || '');
      setCampaignId(initialData.campaign_id || '');

      setDescriptionEn(initialData.description || '');
      setDescriptionTa(initialData.description_ta || '');
      setRulesEn(initialData.rules || '');
      setRulesTa(initialData.rules_ta || '');
      setEligibilityEn(initialData.eligibility || '');
      setEligibilityTa(initialData.eligibility_ta || '');

      setRegStart(initialData.registration_start_date ? initialData.registration_start_date.slice(0, 16) : '');
      setRegEnd(initialData.registration_end_date ? initialData.registration_end_date.slice(0, 16) : '');
      setSubStart(initialData.submission_start_date ? initialData.submission_start_date.slice(0, 16) : '');
      setSubEnd(initialData.submission_end_date ? initialData.submission_end_date.slice(0, 16) : '');
      setVoteStart(initialData.voting_start_date ? initialData.voting_start_date.slice(0, 16) : '');
      setVoteEnd(initialData.voting_end_date ? initialData.voting_end_date.slice(0, 16) : '');

      setMaxEntries(initialData.max_entries_per_participant || 1);
      setAllowedFormats(initialData.allowed_formats || ['image']);
      setMaxFileSizeMb(initialData.max_file_size_mb || 50);
      setWinnerMethod(initialData.winner_selection_method || 'public_voting');
      setTieBreaker(initialData.tie_breaker_rule || 'earliest_submission');

      setLogoUrl(initialData.logo_url || '');
      setBannerUrl(initialData.banner_url || '');
      setPrimaryColor(initialData.primary_color || '#3b82f6');
      if (initialData.rewards && initialData.rewards.length > 0) {
        setRewards(initialData.rewards);
      }
    } else {
      // Defaults for new competition
      setName('');
      setSlug('');
      setSubdomain('');
      setCustomDomain('');
      setCategory('photography');
      setType('public');
      setStatus('draft');
      setProjectId('');
      setCampaignId('');
      setDescriptionEn('');
      setDescriptionTa('');
      setRulesEn('');
      setRulesTa('');
      setEligibilityEn('');
      setEligibilityTa('');
      setRegStart('');
      setRegEnd('');
      setSubStart('');
      setSubEnd('');
      setVoteStart('');
      setVoteEnd('');
      setMaxEntries(1);
      setAllowedFormats(['image']);
      setMaxFileSizeMb(50);
      setWinnerMethod('public_voting');
      setTieBreaker('earliest_submission');
      setLogoUrl('');
      setBannerUrl('');
      setPrimaryColor('#3b82f6');
      setRewards([
        { place: 1, title: '1st Prize Champion', amount: '₹25,000', description: 'Winner Trophy + Certificate' },
        { place: 2, title: '2nd Prize Runner-Up', amount: '₹15,000', description: 'Medal + Certificate' },
        { place: 3, title: '3rd Prize', amount: '₹10,000', description: 'Certificate of Excellence' },
      ]);
    }
  }, [initialData, open]);

  // Auto generate slug from name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!initialData) {
      const generated = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setSlug(generated);
      setSubdomain(generated);
    }
  };

  const handleFileUpload = async (file: File, target: 'logo' | 'banner') => {
    try {
      if (target === 'logo') setUploadingLogo(true);
      else setUploadingBanner(true);

      const res = await uploadFile(file, 'competitions');
      if (target === 'logo') setLogoUrl(res.url);
      else setBannerUrl(res.url);
      toast('File uploaded successfully', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to upload image', 'error');
    } finally {
      if (target === 'logo') setUploadingLogo(false);
      else setUploadingBanner(false);
    }
  };

  const handleAddReward = () => {
    const nextPlace = rewards.length + 1;
    setRewards([...rewards, { place: nextPlace, title: `${nextPlace}th Place Prize`, amount: '', description: '' }]);
  };

  const handleRemoveReward = (idx: number) => {
    const updated = rewards.filter((_, i) => i !== idx).map((r, i) => ({ ...r, place: i + 1 }));
    setRewards(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Competition Name is required', 'error');
      return;
    }
    if (!slug.trim()) {
      toast('Subdomain / Slug is required', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload: Partial<Competition> = {
        ...(initialData?.id ? { id: initialData.id } : {}),
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        subdomain: subdomain.trim().toLowerCase() || slug.trim().toLowerCase(),
        custom_domain: customDomain.trim() || null,
        category,
        type,
        status,
        project_id: projectId || null,
        campaign_id: campaignId || null,
        description: descriptionEn,
        description_ta: descriptionTa,
        rules: rulesEn,
        rules_ta: rulesTa,
        eligibility: eligibilityEn,
        eligibility_ta: eligibilityTa,
        registration_start_date: regStart ? new Date(regStart).toISOString() : null,
        registration_end_date: regEnd ? new Date(regEnd).toISOString() : null,
        submission_start_date: subStart ? new Date(subStart).toISOString() : null,
        submission_end_date: subEnd ? new Date(subEnd).toISOString() : null,
        voting_start_date: voteStart ? new Date(voteStart).toISOString() : null,
        voting_end_date: voteEnd ? new Date(voteEnd).toISOString() : null,
        max_entries_per_participant: maxEntries,
        allowed_formats: allowedFormats,
        max_file_size_mb: maxFileSizeMb,
        winner_selection_method: winnerMethod,
        tie_breaker_rule: tieBreaker,
        logo_url: logoUrl || null,
        banner_url: bannerUrl || null,
        primary_color: primaryColor,
        rewards,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to save competition', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={initialData ? t('editCompetition') : t('createCompetition')} width="w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Basic Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-subtle-fg flex items-center gap-2">
            <Layers className="h-4 w-4 text-brand-600" />
            General Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t('competitionName')} required>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Annual Wildlife Photography Contest 2026"
                required
              />
            </Field>

            <Field label={t('competitionCategory')}>
              <SearchableSelect
                value={category}
                onChange={setCategory}
                options={CATEGORIES}
              />
            </Field>

            <Field label="Website Subdomain (e.g. photo.guessme.co)" required>
              <div className="flex rounded-xl border border-app bg-surface-1 focus-within:border-brand-500 overflow-hidden">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => {
                    const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                    setSubdomain(clean);
                    setSlug(clean);
                  }}
                  className="flex-1 px-3 py-2 bg-transparent text-sm focus:outline-none"
                  placeholder="photo"
                  required
                />
                <span className="px-3 py-2 bg-surface-2 text-xs font-semibold text-muted-fg border-l border-app flex items-center">
                  .guessme.co
                </span>
              </div>
            </Field>

            <Field label="Custom Domain (Optional)">
              <Input
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="e.g. contest.yourbrand.com"
              />
            </Field>

            <Field label={t('status')}>
              <SearchableSelect
                value={status}
                onChange={(v) => setStatus(v as any)}
                options={STATUS_OPTIONS}
              />
            </Field>

            <Field label={t('competitionType')}>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-app bg-surface-1 text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="public">Public (Open for Everyone)</option>
                <option value="campus">Campus / College Only</option>
                <option value="corporate">Corporate / Private</option>
                <option value="internal">Internal Team Only</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Existing CRM Integration: Link with Projects & Campaigns */}
        <div className="space-y-4 pt-4 border-t border-app">
          <h3 className="text-sm font-bold uppercase tracking-wider text-subtle-fg flex items-center gap-2">
            <Globe className="h-4 w-4 text-brand-600" />
            CRM Integrations (Reuse Existing Projects & Campaigns)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t('associatedProject')}>
              <SearchableSelect
                value={projectId}
                onChange={setProjectId}
                options={[
                  { value: '', label: '-- None (Stand-alone) --' },
                  ...(projects || []).map((p) => ({
                    value: p.id,
                    label: `${p.project_no || ''} - ${p.project_name} (${p.client || 'General'})`,
                  })),
                ]}
              />
            </Field>

            <Field label={t('associatedCampaign')}>
              <SearchableSelect
                value={campaignId}
                onChange={setCampaignId}
                options={[
                  { value: '', label: '-- None (Stand-alone) --' },
                  ...(campaigns || []).map((c) => ({
                    value: c.id,
                    label: `${c.title} (${c.type || 'Campaign'})`,
                  })),
                ]}
              />
            </Field>
          </div>
        </div>

        {/* Multilingual Content Tabs (English & Tamil) */}
        <div className="space-y-4 pt-4 border-t border-app">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-subtle-fg">
              Description & Rules (Multilingual)
            </h3>
            <div className="flex gap-1 bg-surface-2 p-1 rounded-xl border border-app">
              <button
                type="button"
                onClick={() => setActiveLangTab('en')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  activeLangTab === 'en' ? 'bg-brand-600 text-white shadow-sm' : 'text-muted-fg hover:text-base-fg'
                }`}
              >
                English (EN)
              </button>
              <button
                type="button"
                onClick={() => setActiveLangTab('ta')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  activeLangTab === 'ta' ? 'bg-brand-600 text-white shadow-sm' : 'text-muted-fg hover:text-base-fg'
                }`}
              >
                தமிழ் (Tamil)
              </button>
            </div>
          </div>

          {activeLangTab === 'en' ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <Field label={t('descriptionEn')}>
                <Textarea
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  placeholder="Detailed description of the competition in English..."
                  rows={3}
                />
              </Field>
              <Field label={t('rulesEn')}>
                <Textarea
                  value={rulesEn}
                  onChange={(e) => setRulesEn(e.target.value)}
                  placeholder="1. High resolution only&#10;2. Must be authentic original work&#10;3. No offensive content..."
                  rows={4}
                />
              </Field>
              <Field label={t('eligibilityEn')}>
                <Textarea
                  value={eligibilityEn}
                  onChange={(e) => setEligibilityEn(e.target.value)}
                  placeholder="Open to all registered users aged 18 and above..."
                  rows={2}
                />
              </Field>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              <Field label={t('descriptionTa')}>
                <Textarea
                  value={descriptionTa}
                  onChange={(e) => setDescriptionTa(e.target.value)}
                  placeholder="போட்டியின் முழுமையான விளக்கம் தமிழில்..."
                  rows={3}
                />
              </Field>
              <Field label={t('rulesTa')}>
                <Textarea
                  value={rulesTa}
                  onChange={(e) => setRulesTa(e.target.value)}
                  placeholder="1. அசல் புகைப்படங்கள் மட்டுமே அனுமதிக்கப்படும்&#10;2. நகலெடுக்கப்பட்டவை நிராகரிக்கப்படும்..."
                  rows={4}
                />
              </Field>
              <Field label={t('eligibilityTa')}>
                <Textarea
                  value={eligibilityTa}
                  onChange={(e) => setEligibilityTa(e.target.value)}
                  placeholder="அனைத்து பதிவுசெய்த பயனர்களும் பங்கேற்கலாம்..."
                  rows={2}
                />
              </Field>
            </div>
          )}
        </div>

        {/* Timelines & Windows */}
        <div className="space-y-4 pt-4 border-t border-app">
          <h3 className="text-sm font-bold uppercase tracking-wider text-subtle-fg flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-600" />
            Timelines & Schedule
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Registration Start">
              <Input type="datetime-local" value={regStart} onChange={(e) => setRegStart(e.target.value)} />
            </Field>
            <Field label="Registration End">
              <Input type="datetime-local" value={regEnd} onChange={(e) => setRegEnd(e.target.value)} />
            </Field>

            <Field label="Submission Start">
              <Input type="datetime-local" value={subStart} onChange={(e) => setSubStart(e.target.value)} />
            </Field>
            <Field label="Submission End">
              <Input type="datetime-local" value={subEnd} onChange={(e) => setSubEnd(e.target.value)} />
            </Field>

            <Field label="Voting Start">
              <Input type="datetime-local" value={voteStart} onChange={(e) => setVoteStart(e.target.value)} />
            </Field>
            <Field label="Voting End">
              <Input type="datetime-local" value={voteEnd} onChange={(e) => setVoteEnd(e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Submission Rules & Winner Selection */}
        <div className="space-y-4 pt-4 border-t border-app">
          <h3 className="text-sm font-bold uppercase tracking-wider text-subtle-fg flex items-center gap-2">
            <Award className="h-4 w-4 text-brand-600" />
            Submission Constraints & Voting Mechanism
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label={t('maxEntries')}>
              <Input
                type="number"
                min={1}
                max={50}
                value={maxEntries}
                onChange={(e) => setMaxEntries(parseInt(e.target.value, 10) || 1)}
              />
            </Field>

            <Field label={t('maxFileSize')}>
              <Input
                type="number"
                min={5}
                max={500}
                value={maxFileSizeMb}
                onChange={(e) => setMaxFileSizeMb(parseInt(e.target.value, 10) || 50)}
              />
            </Field>

            <Field label="Allowed Media Formats">
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowedFormats.includes('image')}
                    onChange={(e) => {
                      if (e.target.checked) setAllowedFormats([...allowedFormats, 'image']);
                      else setAllowedFormats(allowedFormats.filter((f) => f !== 'image'));
                    }}
                    className="rounded border-app text-brand-600"
                  />
                  Images (JPG, PNG)
                </label>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowedFormats.includes('video')}
                    onChange={(e) => {
                      if (e.target.checked) setAllowedFormats([...allowedFormats, 'video']);
                      else setAllowedFormats(allowedFormats.filter((f) => f !== 'video'));
                    }}
                    className="rounded border-app text-brand-600"
                  />
                  Videos (MP4, WebM)
                </label>
              </div>
            </Field>

            <Field label={t('winnerSelectionMethod')}>
              <SearchableSelect
                value={winnerMethod}
                onChange={setWinnerMethod}
                options={WINNER_METHODS}
              />
            </Field>

            <Field label={t('tieBreakerRule')}>
              <SearchableSelect
                value={tieBreaker}
                onChange={setTieBreaker}
                options={TIE_BREAKERS}
              />
            </Field>

            <Field label={t('themeColor')}>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-12 rounded-xl border border-app cursor-pointer p-0.5 bg-surface-1"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#3b82f6"
                />
              </div>
            </Field>
          </div>
        </div>

        {/* Media & Branding (Reusing Storage Upload) */}
        <div className="space-y-4 pt-4 border-t border-app">
          <h3 className="text-sm font-bold uppercase tracking-wider text-subtle-fg">
            Branding & Visuals (Logo & Hero Banner)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Logo */}
            <div className="p-4 rounded-2xl border border-app bg-surface-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-subtle-fg">Competition Logo</label>
                {logoUrl && (
                  <button type="button" onClick={() => setLogoUrl('')} className="text-xs text-rose-500 hover:underline">
                    Remove
                  </button>
                )}
              </div>
              {logoUrl ? (
                <div className="relative h-28 w-28 mx-auto rounded-xl overflow-hidden border border-app bg-surface-1">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-app rounded-xl hover:bg-surface-1 cursor-pointer transition-colors">
                  <UploadCloud className="h-6 w-6 text-muted-fg mb-1" />
                  <span className="text-xs font-medium text-muted-fg">
                    {uploadingLogo ? 'Uploading...' : 'Click to upload logo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo')}
                  />
                </label>
              )}
            </div>

            {/* Banner */}
            <div className="p-4 rounded-2xl border border-app bg-surface-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-subtle-fg">Hero Banner</label>
                {bannerUrl && (
                  <button type="button" onClick={() => setBannerUrl('')} className="text-xs text-rose-500 hover:underline">
                    Remove
                  </button>
                )}
              </div>
              {bannerUrl ? (
                <div className="relative h-28 w-full rounded-xl overflow-hidden border border-app bg-surface-1">
                  <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-app rounded-xl hover:bg-surface-1 cursor-pointer transition-colors">
                  <UploadCloud className="h-6 w-6 text-muted-fg mb-1" />
                  <span className="text-xs font-medium text-muted-fg">
                    {uploadingBanner ? 'Uploading...' : 'Click to upload wide hero banner'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingBanner}
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'banner')}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Rewards and Prizes */}
        <div className="space-y-4 pt-4 border-t border-app">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-subtle-fg flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Prizes & Reward Tiers
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={handleAddReward} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Tier
            </Button>
          </div>

          <div className="space-y-3">
            {rewards.map((r, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-app bg-surface-1">
                <span className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                  #{r.place}
                </span>
                <input
                  type="text"
                  placeholder="Prize Title (e.g. 1st Place)"
                  value={r.title}
                  onChange={(e) => {
                    const copy = [...rewards];
                    copy[idx].title = e.target.value;
                    setRewards(copy);
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-app bg-surface-2 text-sm focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Prize Amount / Gift"
                  value={r.amount || ''}
                  onChange={(e) => {
                    const copy = [...rewards];
                    copy[idx].amount = e.target.value;
                    setRewards(copy);
                  }}
                  className="w-36 px-3 py-1.5 rounded-lg border border-app bg-surface-2 text-sm focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Description / Perks"
                  value={r.description || ''}
                  onChange={(e) => {
                    const copy = [...rewards];
                    copy[idx].description = e.target.value;
                    setRewards(copy);
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-app bg-surface-2 text-sm focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveReward(idx)}
                  className="p-1.5 text-muted-fg hover:text-rose-500 rounded-lg hover:bg-surface-2 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-app flex items-center justify-end gap-3 sticky bottom-0 bg-sidebar py-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? t('loading') : t('save')}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
