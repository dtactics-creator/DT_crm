import { preflight, fail } from './_lib.js';
import {
  fetchCompetitionByDomain,
  fetchCompetitions,
  fetchSubmissions,
  fetchLeaderboard,
  fetchWinners,
  getCompetitionDashboardStats
} from './_competitions_db.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { domain, subdomain, slug, id } = req.query;
    const hostHeader = req.headers.host || '';

    let competition = null;

    // 1. By ID or Slug explicitly passed
    if (id) {
      competition = await fetchCompetitions({ id });
    } else if (slug) {
      competition = await fetchCompetitions({ slug });
    } else if (subdomain) {
      competition = await fetchCompetitionByDomain(subdomain);
    } else if (domain) {
      competition = await fetchCompetitionByDomain(domain);
    } else if (hostHeader) {
      // Extract hostname e.g. photo.guessme.co -> 'photo' or 'photo.guessme.co'
      const cleanHost = hostHeader.split(':')[0].toLowerCase();
      // If host is not a standard localhost / root crm domain
      if (!['localhost', '127.0.0.1'].includes(cleanHost)) {
        competition = await fetchCompetitionByDomain(cleanHost);
      }
    }

    if (!competition) {
      return fail(res, 404, 'Competition not found for the requested domain or slug.');
    }

    // Fetch public data for the competition
    const [stats, feed, leaderboard, winners] = await Promise.all([
      getCompetitionDashboardStats(competition.id),
      fetchSubmissions(competition.id, { status: 'approved', limit: 60 }),
      fetchLeaderboard(competition.id, { limit: 25 }),
      fetchWinners(competition.id)
    ]);

    return res.status(200).json({
      competition,
      stats: {
        total_participants: stats.total_participants,
        total_submissions: stats.total_submissions,
        total_likes: stats.total_likes,
        total_views: stats.total_views,
      },
      feed,
      leaderboard,
      winners,
      server_time: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error in /api/competition-public:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
