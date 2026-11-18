import { preflight, fail } from './_lib.js';
import { requirePermission } from './_permissions.js';
import { logAudit } from './_audit.js';
import {
  fetchLeaderboard,
  fetchWinners,
  publishCompetitionWinners,
  logCompetitionActivity
} from './_competitions_db.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;

  try {
    // -------------------------------------------------------------------------
    // GET: Retrieve leaderboard or published winners
    // -------------------------------------------------------------------------
    if (req.method === 'GET') {
      const { competition_id, type = 'leaderboard', limit } = req.query;
      if (!competition_id) return fail(res, 400, 'competition_id query parameter is required.');

      if (type === 'winners') {
        const winners = await fetchWinners(competition_id);
        return res.status(200).json(winners);
      }

      const leaderboard = await fetchLeaderboard(competition_id, {
        limit: limit ? parseInt(limit, 10) : 50
      });
      return res.status(200).json(leaderboard);
    }

    // -------------------------------------------------------------------------
    // POST: Publish / finalize winners
    // -------------------------------------------------------------------------
    if (req.method === 'POST') {
      const user = await requirePermission(req, res, 'competitions.edit');
      if (!user) return;

      const { competition_id, winners } = req.body || {};
      if (!competition_id || !Array.isArray(winners) || winners.length === 0) {
        return fail(res, 400, 'competition_id and a non-empty winners array are required.');
      }

      const published = await publishCompetitionWinners(
        competition_id,
        winners,
        user.employee_id || user.id
      );

      await logAudit({
        req,
        user,
        action: 'PUBLISH_WINNERS',
        module: 'Competitions',
        entity: 'Competition',
        entityId: competition_id,
        description: `Published ${winners.length} winners for competition ${competition_id}`,
        newValues: published
      });

      await logCompetitionActivity({
        competitionId: competition_id,
        activityType: 'WINNERS_PUBLISHED',
        actorName: user.employee_name || user.email,
        actorEmail: user.email,
        description: `Official winners were reviewed and published.`
      });

      return res.status(200).json({ success: true, winners: published });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Error in /api/competition-leaderboard:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
