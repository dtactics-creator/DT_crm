import { preflight, fail } from './_lib.js';
import { getCompetitionDashboardStats } from './_competitions_db.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { competition_id } = req.query;
    if (!competition_id) {
      return fail(res, 400, 'competition_id query parameter is required');
    }

    const data = await getCompetitionDashboardStats(competition_id);
    return res.status(200).json(data);
  } catch (err) {
    console.error('Error in /api/competition-dashboard:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
