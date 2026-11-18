import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Plus, Search, Filter, LayoutGrid, List, Pencil, Trash2,
  ExternalLink, Calendar, Users, Heart, Image, Eye, Award, Globe
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FilterBar from '../components/ui/FilterBar';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { useToast } from '../components/ui/Toast';
import { usePermissions } from '../contexts/PermissionContext';
import { useLanguage } from '../contexts/LanguageContext';
import CompetitionFormDrawer from '../components/competitions/CompetitionFormDrawer';
import {
  fetchAllCompetitions,
  saveCompetition,
  deleteCompetition,
} from '../lib/competitionsRepo';
import { formatDate } from '../lib/utils';
import type { Competition } from '../types';

export default function Competitions() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { can } = usePermissions();
  const { lang, setLang, t } = useLanguage();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [view, setView] = useState<'table' | 'grid'>('grid');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<Competition | null>(null);
  const [toDelete, setToDelete] = useState<Competition | null>(null);

  const { data: competitions, isLoading } = useQuery({
    queryKey: ['competitions'],
    queryFn: () => fetchAllCompetitions(),
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Competition>) => saveCompetition(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitions'] });
      toast('Competition saved successfully!', 'success');
      setDrawerOpen(false);
      setEditingComp(null);
    },
    onError: (err: any) => {
      toast(err.message || 'Failed to save competition', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCompetition(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitions'] });
      toast('Competition deleted successfully', 'success');
      setToDelete(null);
    },
    onError: (err: any) => {
      toast(err.message || 'Failed to delete competition', 'error');
    },
  });

  // Filtered list
  const filtered = useMemo(() => {
    return (competitions || []).filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchNo = (c.competition_no || '').toLowerCase().includes(q);
        const matchSub = (c.subdomain || '').toLowerCase().includes(q);
        const matchCat = (c.category || '').toLowerCase().includes(q);
        if (!matchName && !matchNo && !matchSub && !matchCat) return false;
      }
      return true;
    });
  }, [competitions, search, statusFilter, categoryFilter]);

  // Overall Statistics
  const stats = useMemo(() => {
    const list = competitions || [];
    return {
      total: list.length,
      active: list.filter((c) => c.status === 'active').length,
      scheduled: list.filter((c) => c.status === 'scheduled').length,
      completed: list.filter((c) => c.status === 'completed').length,
      totalParticipants: list.reduce((acc, c) => acc + (c.total_participants || 0), 0),
      totalSubmissions: list.reduce((acc, c) => acc + (c.total_submissions || 0), 0),
      totalLikes: list.reduce((acc, c) => acc + (c.total_likes || 0), 0),
    };
  }, [competitions]);

  const getStatusBadge = (status: Competition['status']) => {
    switch (status) {
      case 'active':
        return <Badge label="Active" color="#10b981" dot />;
      case 'scheduled':
        return <Badge label="Scheduled" color="#f59e0b" dot />;
      case 'voting_closed':
        return <Badge label="Voting Closed" color="#64748b" />;
      case 'completed':
        return <Badge label="Completed" color="#3b82f6" />;
      case 'archived':
        return <Badge label="Archived" color="#64748b" />;
      default:
        return <Badge label="Draft" color="#94a3b8" />;
    }
  };

  const columns: Column<Competition>[] = [
    {
      key: 'name',
      header: 'Competition',
      sortValue: (c) => c.name,
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-surface-2 border border-app flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
            {c.logo_url ? (
              <img src={c.logo_url} alt={c.name} className="h-full w-full object-contain p-1" />
            ) : (
              <Trophy className="h-5 w-5 text-brand-600" />
            )}
          </div>
          <div className="min-w-0">
            <button
              onClick={() => navigate(`/competitions/${c.id}`)}
              className="text-[13.5px] font-bold text-base-fg hover:text-brand-600 truncate block text-left transition-colors"
            >
              {c.name}
            </button>
            <div className="flex items-center gap-2 text-xs text-subtle-fg">
              <span>{c.competition_no || 'CMP'}</span>
              <span>•</span>
              <span className="capitalize">{c.category}</span>
              {c.subdomain && (
                <>
                  <span>•</span>
                  <span className="text-brand-600 font-medium">{c.subdomain}.guessme.co</span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (c) => c.status,
      render: (c) => getStatusBadge(c.status),
    },
    {
      key: 'project_campaign',
      header: 'CRM Link',
      render: (c) => (
        <div className="text-xs space-y-0.5">
          {c.project && (
            <p className="text-base-fg font-medium truncate max-w-[140px]" title={c.project.project_name}>
              📁 {c.project.project_name}
            </p>
          )}
          {c.campaign && (
            <p className="text-subtle-fg truncate max-w-[140px]" title={c.campaign.title}>
              📢 {c.campaign.title}
            </p>
          )}
          {!c.project && !c.campaign && <span className="text-muted-fg">—</span>}
        </div>
      ),
    },
    {
      key: 'timeline',
      header: 'Timeline',
      render: (c) => (
        <div className="text-xs space-y-1 text-muted-fg">
          {c.registration_end_date && (
            <p>Reg: <span className="text-base-fg font-medium">{formatDate(c.registration_end_date)}</span></p>
          )}
          {c.submission_end_date && (
            <p>Sub: <span className="text-base-fg font-medium">{formatDate(c.submission_end_date)}</span></p>
          )}
        </div>
      ),
    },
    {
      key: 'metrics',
      header: 'Engagement',
      sortValue: (c) => c.total_likes || 0,
      render: (c) => (
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-muted-fg" title="Participants">
            <Users className="h-3.5 w-3.5 text-blue-500" /> {c.total_participants || 0}
          </span>
          <span className="flex items-center gap-1 text-muted-fg" title="Submissions">
            <Image className="h-3.5 w-3.5 text-purple-500" /> {c.total_submissions || 0}
          </span>
          <span className="flex items-center gap-1 text-muted-fg" title="Likes">
            <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20" /> {c.total_likes || 0}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/competitions/${c.id}`)}
            className="h-8 text-xs font-semibold"
          >
            Manage
          </Button>
          <a
            href={`/c/${c.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-muted-fg hover:text-brand-600 hover:bg-surface-2 transition-colors"
            title="Open Public Website"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          {can('competitions.edit') && (
            <button
              onClick={() => {
                setEditingComp(c);
                setDrawerOpen(true);
              }}
              className="p-1.5 rounded-lg text-muted-fg hover:text-base-fg hover:bg-surface-2 transition-colors"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {can('competitions.delete') && (
            <button
              onClick={() => setToDelete(c)}
              className="p-1.5 rounded-lg text-muted-fg hover:text-rose-500 hover:bg-surface-2 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header with Language Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-app">
        <PageHeader
          title={t('competitions')}
          subtitle="Create, configure, monitor and manage photo, video & talent contests seamlessly."
        />

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="flex items-center bg-surface-2 p-1 rounded-xl border border-app shadow-xs">
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                lang === 'en' ? 'bg-brand-600 text-white shadow-xs' : 'text-muted-fg hover:text-base-fg'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('ta')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                lang === 'ta' ? 'bg-brand-600 text-white shadow-xs' : 'text-muted-fg hover:text-base-fg'
              }`}
            >
              தமிழ்
            </button>
          </div>

          {can('competitions.create') && (
            <Button
              variant="primary"
              onClick={() => {
                setEditingComp(null);
                setDrawerOpen(true);
              }}
              className="gap-2 shadow-md shadow-brand-600/20"
            >
              <Plus className="h-4 w-4" /> {t('createCompetition')}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl border border-app bg-surface-1 shadow-xs">
          <p className="text-xs font-semibold text-subtle-fg uppercase tracking-wider">{t('totalCompetitions')}</p>
          <p className="text-2xl font-black text-base-fg mt-1">{stats.total}</p>
        </div>
        <div className="p-4 rounded-2xl border border-app bg-surface-1 shadow-xs">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{t('active')}</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</p>
        </div>
        <div className="p-4 rounded-2xl border border-app bg-surface-1 shadow-xs">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">{t('scheduled')}</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.scheduled}</p>
        </div>
        <div className="p-4 rounded-2xl border border-app bg-surface-1 shadow-xs">
          <p className="text-xs font-semibold text-subtle-fg uppercase tracking-wider">{t('totalParticipants')}</p>
          <p className="text-2xl font-black text-base-fg mt-1">{stats.totalParticipants}</p>
        </div>
        <div className="p-4 rounded-2xl border border-app bg-surface-1 shadow-xs">
          <p className="text-xs font-semibold text-subtle-fg uppercase tracking-wider">{t('totalSubmissions')}</p>
          <p className="text-2xl font-black text-base-fg mt-1">{stats.totalSubmissions}</p>
        </div>
        <div className="p-4 rounded-2xl border border-app bg-surface-1 shadow-xs">
          <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">{t('totalLikes')}</p>
          <p className="text-2xl font-black text-rose-500 mt-1">{stats.totalLikes}</p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border border-app bg-surface-1 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, subdomain, category..."
              className="pl-9"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-app bg-surface-2 text-xs font-semibold text-base-fg focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="voting_closed">Voting Closed</option>
            <option value="completed">Completed</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-app bg-surface-2 text-xs font-semibold text-base-fg focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="photography">Photography</option>
            <option value="short_film">Videography / Film</option>
            <option value="coding">Coding</option>
            <option value="art">Art & Painting</option>
            <option value="singing">Music & Singing</option>
            <option value="writing">Creative Writing</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="flex items-center bg-surface-2 p-1 rounded-xl border border-app">
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded-lg transition-colors ${view === 'grid' ? 'bg-surface-1 shadow-xs text-brand-600' : 'text-muted-fg hover:text-base-fg'}`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('table')}
              className={`p-1.5 rounded-lg transition-colors ${view === 'table' ? 'bg-surface-1 shadow-xs text-brand-600' : 'text-muted-fg hover:text-base-fg'}`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Grid or Table */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl border border-app bg-surface-1 p-6 space-y-4">
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-6 w-6 text-brand-600" />}
          title="No Competitions Found"
          description="Create your first competition to launch contests, public voting, and engagement campaigns."
          action={
            can('competitions.create') ? (
              <Button
                variant="primary"
                onClick={() => {
                  setEditingComp(null);
                  setDrawerOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Create Competition
              </Button>
            ) : undefined
          }
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="group flex flex-col rounded-2xl border border-app bg-surface-1 hover:border-brand-500/40 hover:shadow-xl hover:shadow-brand-500/5 transition-all overflow-hidden"
            >
              {/* Banner Header */}
              <div className="relative h-36 w-full bg-linear-to-r from-brand-600 to-indigo-700 overflow-hidden">
                {c.banner_url ? (
                  <img src={c.banner_url} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-30">
                    <Trophy className="h-16 w-16 text-white" />
                  </div>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

                {/* Status & Category Pills */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider backdrop-blur-md bg-black/40 text-white border border-white/20">
                    {c.category}
                  </span>
                  {getStatusBadge(c.status)}
                </div>

                {/* Subdomain Pill */}
                {c.subdomain && (
                  <a
                    href={`/c/${c.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg backdrop-blur-md bg-black/50 text-white text-xs font-semibold hover:bg-black/70 transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5 text-brand-400" />
                    <span>{c.subdomain}.guessme.co</span>
                  </a>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      onClick={() => navigate(`/competitions/${c.id}`)}
                      className="font-bold text-base-fg text-lg hover:text-brand-600 cursor-pointer line-clamp-1 transition-colors"
                    >
                      {c.name}
                    </h3>
                  </div>

                  <p className="text-xs text-subtle-fg mt-1 line-clamp-2">
                    {c.description || 'No description provided.'}
                  </p>
                </div>

                {/* Associated CRM Records */}
                {(c.project || c.campaign) && (
                  <div className="p-2.5 rounded-xl bg-surface-2 border border-app text-xs flex items-center justify-between text-muted-fg">
                    {c.project && (
                      <span className="truncate" title={c.project.project_name}>
                        📁 {c.project.project_name}
                      </span>
                    )}
                    {c.campaign && (
                      <span className="truncate" title={c.campaign.title}>
                        📢 {c.campaign.title}
                      </span>
                    )}
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-app text-center">
                  <div>
                    <p className="text-xs text-subtle-fg font-medium">Participants</p>
                    <p className="text-sm font-bold text-base-fg">{c.total_participants || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-subtle-fg font-medium">Submissions</p>
                    <p className="text-sm font-bold text-base-fg">{c.total_submissions || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-subtle-fg font-medium">Likes</p>
                    <p className="text-sm font-bold text-rose-500">{c.total_likes || 0}</p>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] font-medium text-muted-fg">
                    Created {formatDate(c.created_at)}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => navigate(`/competitions/${c.id}`)}
                      className="h-8 text-xs font-semibold gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" /> Manage Hub
                    </Button>
                    {can('competitions.edit') && (
                      <button
                        onClick={() => {
                          setEditingComp(c);
                          setDrawerOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-muted-fg hover:text-base-fg hover:bg-surface-2 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-app bg-surface-1 shadow-xs overflow-hidden">
          <DataTable
            data={filtered}
            columns={columns}
            rowKey={(c) => c.id}
            onRowClick={(c) => navigate(`/competitions/${c.id}`)}
          />
        </div>
      )}

      {/* Drawer */}
      <CompetitionFormDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingComp(null);
        }}
        onSave={async (data) => {
          await saveMutation.mutateAsync(data);
        }}
        initialData={editingComp}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
        title="Delete Competition?"
        message={`Are you sure you want to delete "${toDelete?.name}"? All participants and submissions will be archived.`}
        confirmLabel="Delete Competition"
      />
    </div>
  );
}
