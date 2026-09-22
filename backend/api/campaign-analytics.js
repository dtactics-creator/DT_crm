import { supabase, preflight, fail } from './_lib.js';
import { requirePermission } from './_permissions.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  
  // Optionally, require 'campaign_reports.view' permission. 
  // If it's not seeded in the database yet for the user, this might block them.
  // We'll enforce it to stick to secure patterns.
  const user = await requirePermission(req, res, 'campaign_reports.view');
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('analytics_sessions')
        .select(`
          *,
          dt_campaign_setups (name),
          dt_campaign_templates (name)
        `)
        .order('created_at', { ascending: false })
        .limit(1000); // Reasonable limit for now

      if (error) {
        throw error;
      }

      // Map the response for easier frontend usage
      const formattedData = (data || []).map(row => ({
        ...row,
        setup_name: row.dt_campaign_setups?.name || null,
        template_name: row.dt_campaign_templates?.name || null,
        dt_campaign_setups: undefined,
        dt_campaign_templates: undefined
      }));

      return res.status(200).json(formattedData);
    }

    return fail(res, 405, 'Method Not Allowed');
  } catch (err) {
    console.error('Error fetching campaign analytics:', err);
    return fail(res, 500, err.message || 'Internal Server Error');
  }
}
