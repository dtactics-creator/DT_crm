import { supabase, preflight, fail } from './_lib.js';
import { requirePermission } from './_permissions.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const user = await requirePermission(req, res, null);
  if (!user) return;

  if (req.method !== 'GET') {
    return fail(res, 405, 'Method not allowed');
  }

  try {
    const { startDate, endDate, type, status, templateId, setupId, playMode } = req.query || {};

    const [
      { data: campaigns, error: cErr },
      { data: templates, error: tErr },
      { data: setups, error: sErr },
      { data: setupTemplates, error: stErr }
    ] = await Promise.all([
      supabase.from('dt_campaigns').select('id, type, is_active, start_datetime, end_datetime, created_at, title, template_id'),
      supabase.from('dt_campaign_templates').select('id, status, name'),
      supabase.from('dt_campaign_setups').select('id, status, name, play_mode, start_datetime, end_datetime, description'),
      supabase.from('dt_campaign_setup_templates').select('campaign_setup_id, template_id, sort_order, start_datetime, end_datetime')
    ]);

    if (cErr) throw cErr;
    if (tErr) throw tErr;
    if (sErr) throw sErr;
    if (stErr) throw stErr;

    const now = new Date();
    const nowMs = now.getTime();

    // Map helpers
    const templateMap = (templates || []).reduce((acc, t) => { acc[t.id] = t; return acc; }, {});
    const setupMap = (setups || []).reduce((acc, s) => { acc[s.id] = s; return acc; }, {});
    const setupTemplatesBySetup = (setupTemplates || []).reduce((acc, st) => {
      if (!acc[st.campaign_setup_id]) acc[st.campaign_setup_id] = [];
      acc[st.campaign_setup_id].push(st);
      return acc;
    }, {});
    const setupTemplatesByTemplate = (setupTemplates || []).reduce((acc, st) => {
      if (!acc[st.template_id]) acc[st.template_id] = [];
      acc[st.template_id].push(st);
      return acc;
    }, {});

    // Derive Campaign Status
    const deriveCampaignStatus = (c) => {
      const s = c.start_datetime ? new Date(c.start_datetime).getTime() : null;
      const e = c.end_datetime ? new Date(c.end_datetime).getTime() : null;
      
      if (!c.is_active) return 'inactive';
      if (e && e < nowMs) return 'expired';
      if (s && s > nowMs) return 'scheduled';
      return 'active';
    };

    let filteredCampaigns = (campaigns || []).map(c => ({ ...c, derivedStatus: deriveCampaignStatus(c) }));
    let filteredSetups = setups || [];
    let filteredTemplates = templates || [];

    // Apply Filters
    if (startDate || endDate) {
      const sd = startDate ? new Date(startDate).getTime() : 0;
      const ed = endDate ? new Date(endDate).getTime() : Infinity;
      filteredCampaigns = filteredCampaigns.filter(c => {
        const cd = new Date(c.created_at).getTime();
        return cd >= sd && cd <= ed;
      });
      // Setups don't have created_at here, use start_datetime for filtering
      filteredSetups = filteredSetups.filter(s => {
        if (!s.start_datetime) return true;
        const sTime = new Date(s.start_datetime).getTime();
        return sTime >= sd && sTime <= ed;
      });
    }

    if (type) filteredCampaigns = filteredCampaigns.filter(c => c.type === type);
    if (status) filteredCampaigns = filteredCampaigns.filter(c => c.derivedStatus === status);
    if (templateId) {
      filteredCampaigns = filteredCampaigns.filter(c => c.template_id === templateId);
      filteredSetups = filteredSetups.filter(s => (setupTemplatesBySetup[s.id] || []).some(st => st.template_id === templateId));
    }
    if (setupId) {
      const allowedTemplates = new Set((setupTemplatesBySetup[setupId] || []).map(st => st.template_id));
      filteredCampaigns = filteredCampaigns.filter(c => allowedTemplates.has(c.template_id));
      filteredSetups = filteredSetups.filter(s => s.id === setupId);
    }
    if (playMode) {
      filteredSetups = filteredSetups.filter(s => s.play_mode === playMode);
    }

    // --- Widgets Aggregation ---
    
    // 7. Campaign Status Distribution
    const campaignStatusCounts = filteredCampaigns.reduce((acc, c) => {
      acc[c.derivedStatus] = (acc[c.derivedStatus] || 0) + 1;
      return acc;
    }, {});
    const campaignStatusDistribution = Object.entries(campaignStatusCounts).map(([name, value]) => ({ name, value }));

    // 8. Campaigns by Type
    const campaignsByType = filteredCampaigns.reduce((acc, c) => {
      const t = c.type || 'Unknown';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
    const typeSlices = Object.entries(campaignsByType).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);



    // 9. Campaign Creation Trend
    const tempStatus = filteredTemplates.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});
    const templateStatusDistribution = Object.entries(tempStatus).map(([name, value]) => ({ name, value }));

    // 12 & 13. Setup Status & Play Mode Distribution
    const setupStatus = {};
    const setupPlayMode = {};
    filteredSetups.forEach(s => {
      const st = s.status || 'unknown';
      const pm = s.play_mode || 'unknown';
      setupStatus[st] = (setupStatus[st] || 0) + 1;
      setupPlayMode[pm] = (setupPlayMode[pm] || 0) + 1;
    });
    const setupStatusDistribution = Object.entries(setupStatus).map(([name, value]) => ({ name, value }));
    const setupPlayModeDistribution = Object.entries(setupPlayMode).map(([name, value]) => ({ name, value }));

    // --- Timelines ---
    
    // 14. Campaign Timeline
    const campaignTimeline = filteredCampaigns
      .filter(c => c.start_datetime || c.end_datetime)
      .map(c => ({
        id: c.id,
        title: c.title || c.type,
        start: c.start_datetime,
        end: c.end_datetime,
        status: c.derivedStatus
      }))
      .sort((a, b) => new Date(a.start || 0).getTime() - new Date(b.start || 0).getTime());

    // 15. Setup Timeline
    const setupTimeline = filteredSetups
      .filter(s => s.start_datetime || s.end_datetime)
      .map(s => ({
        id: s.id,
        title: s.name,
        start: s.start_datetime,
        end: s.end_datetime,
        status: s.status
      }))
      .sort((a, b) => new Date(a.start || 0).getTime() - new Date(b.start || 0).getTime());

    // --- Tables / Lists ---

    // 16. Active Campaigns
    const activeCampaignsList = filteredCampaigns
      .filter(c => c.derivedStatus === 'active')
      .map(c => ({
        id: c.id,
        title: c.title || c.type,
        type: c.type,
        template: c.template_id ? templateMap[c.template_id]?.name : null,
        start: c.start_datetime,
        end: c.end_datetime,
        status: c.derivedStatus
      }));

    // 17. Upcoming Campaigns
    const upcomingCampaignsList = filteredCampaigns
      .filter(c => c.derivedStatus === 'scheduled')
      .map(c => ({
         id: c.id,
         title: c.title || c.type,
         type: c.type,
         template: c.template_id ? templateMap[c.template_id]?.name : null,
         start: c.start_datetime,
         end: c.end_datetime,
      }))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    // 18. Expiring Soon (7 days window)
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const expiringSoonCampaigns = filteredCampaigns
      .filter(c => c.derivedStatus === 'active' && c.end_datetime)
      .filter(c => {
        const eTime = new Date(c.end_datetime).getTime();
        return (eTime - nowMs) <= sevenDaysMs && (eTime - nowMs) > 0;
      })
      .map(c => {
        const eTime = new Date(c.end_datetime).getTime();
        const daysLeft = Math.ceil((eTime - nowMs) / (1000 * 60 * 60 * 24));
        return {
          id: c.id,
          title: c.title || c.type,
          template: c.template_id ? templateMap[c.template_id]?.name : null,
          end: c.end_datetime,
          daysLeft
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);

    // 19. Campaign Setup Overview
    const setupOverview = filteredSetups.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      status: s.status,
      playMode: s.play_mode,
      start: s.start_datetime,
      end: s.end_datetime,
      templateCount: (setupTemplatesBySetup[s.id] || []).length
    }));

    // 20. Setup Template Composition
    const setupTemplateComposition = filteredSetups.map(s => {
      const stList = (setupTemplatesBySetup[s.id] || []).sort((a, b) => a.sort_order - b.sort_order);
      return {
        setupId: s.id,
        setupName: s.name,
        templates: stList.map(st => ({
          templateId: st.template_id,
          name: templateMap[st.template_id]?.name,
          order: st.sort_order,
          start: st.start_datetime,
          end: st.end_datetime
        }))
      };
    }).filter(s => s.templates.length > 0);

    // Legacy KPIs (Maintained for existing cards)
    const kpis = {
      totalCampaigns: filteredCampaigns.length,
      activeCampaigns: filteredCampaigns.filter(c => c.derivedStatus === 'active').length,
      totalTemplates: filteredTemplates.length,
      activeTemplates: filteredTemplates.filter(t => t.status === 'active').length,
      totalSetups: filteredSetups.length,
      activeSetups: filteredSetups.filter(s => s.status === 'active').length
    };

    res.status(200).json({
      kpis,
      typeSlices,
      recentCampaigns: [...filteredCampaigns].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
      
      campaignStatusDistribution,
      templateStatusDistribution,
      setupStatusDistribution,
      setupPlayModeDistribution,
      
      campaignTimeline,
      setupTimeline,
      
      activeCampaignsList,
      upcomingCampaignsList,
      expiringSoonCampaigns,
      setupOverview,
      setupTemplateComposition
    });

  } catch (err) {
    return fail(res, 500, err.message);
  }
}
