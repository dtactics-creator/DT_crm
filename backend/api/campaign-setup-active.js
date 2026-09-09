import { supabase, preflight, fail } from './_lib.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;

  try {
    if (req.method === 'GET') {
      const { name } = req.query || {};
      
      if (!name) {
        return fail(res, 400, 'Campaign Setup name is required');
      }

      // 1. Fetch Campaign Setup by name
      const { data: setupData, error: setupErr } = await supabase
        .from('dt_campaign_setups')
        .select('*, templates:dt_campaign_setup_templates(*, template:template_id(*))')
        .eq('name', name)
        .eq('status', 'active')
        .single();

      if (setupErr || !setupData) {
        return fail(res, 404, 'Active Campaign Setup not found');
      }

      const templates = setupData.templates || [];
      if (templates.length === 0) {
        return fail(res, 404, 'No templates found in setup');
      }

      // 2. Sort templates sequentially
      templates.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      const now = new Date().getTime();

      let activeTemplate = null;

      // 3. Find currently active template based on schedule
      if (setupData.play_mode === 'loop') {
        // Find if we are currently inside any template's explicit time range
        activeTemplate = templates.find(t => {
          if (!t.start_datetime || !t.end_datetime) return false;
          return now >= new Date(t.start_datetime).getTime() && now <= new Date(t.end_datetime).getTime();
        });

        // If loop mode and no explicit match, fallback to the first template (or handle loop logic if it repeats beyond end dates)
        // Since we strictly set dates, if we are past the end of the entire setup, we could loop back, but for now we'll just check if there's a match.
        if (!activeTemplate && templates.length > 0) {
          activeTemplate = templates[0];
        }
      } else {
        // play once
        activeTemplate = templates.find(t => {
          if (!t.start_datetime || !t.end_datetime) return false;
          return now >= new Date(t.start_datetime).getTime() && now <= new Date(t.end_datetime).getTime();
        });
        
        // If past the end, it might just stick to the last one or show nothing
        if (!activeTemplate && templates.length > 0) {
          activeTemplate = templates[templates.length - 1];
        }
      }

      if (!activeTemplate || !activeTemplate.template) {
        return fail(res, 404, 'No active template found in setup');
      }

      return res.status(200).json(activeTemplate.template);
    }

    return fail(res, 405, 'Method not allowed');
  } catch (err) {
    return fail(res, 500, err.message);
  }
}
