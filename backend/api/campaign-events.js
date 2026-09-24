import { supabase, preflight, fail } from './_lib.js';
import { requirePermission } from './_permissions.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  
  const user = await requirePermission(req, res, 'campaign_events.view');
  if (!user) return; // Response handled by requirePermission

  if (req.method === 'GET') {
    // Fetch reports
    const { data: reports, error: reportError } = await supabase
      .from('campaign_reports')
      .select(`
        id,
        session_id,
        actions,
        created_at
      `)
      .order('updated_at', { ascending: false })
      .limit(1000);

    if (reportError) return fail(res, 500, reportError.message);

    // Fetch corresponding sessions
    const sessionIds = [...new Set((reports || []).map(r => r.session_id).filter(Boolean))];
    let sessionsMap = {};
    
    if (sessionIds.length > 0) {
      const { data: sessions, error: sessionError } = await supabase
        .from('analytics_sessions')
        .select('session_id, visitor_id, domain')
        .in('session_id', sessionIds);
        
      if (!sessionError && sessions) {
        sessionsMap = sessions.reduce((acc, s) => {
          acc[s.session_id] = s;
          return acc;
        }, {});
      }
    }

    // Merge data, returning 1 record per session with the actions array
    const formatted = (reports || []).map((report) => ({
      ...report,
      visitor_id: sessionsMap[report.session_id]?.visitor_id,
      domain: sessionsMap[report.session_id]?.domain
    }));

    return res.status(200).json(formatted);
  }

  return fail(res, 405, 'Method not allowed');
}
