import { supabase, cors, fail, requireAuth } from './_lib.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // POST is public for tracking SDK; GET requires authenticated CRM user
  if (req.method === 'POST') {
    return handlePageViewReport(req, res);
  }

  if (req.method === 'GET') {
    const user = await requireAuth(req, res);
    if (!user) return;
    return handleGetAnalytics(req, res);
  }

  return fail(res, 405, 'Method not allowed');
}

async function handlePageViewReport(req, res) {
  try {
    const { tracking_token, session_id, visitor_id, path: pagePath, full_url, referrer, duration_seconds } = req.body || {};

    if (!tracking_token) return fail(res, 400, 'tracking_token is required');
    if (!session_id) return fail(res, 400, 'session_id is required');

    const cleanPath = (pagePath || '/').trim();
    const duration = Math.max(0, parseInt(duration_seconds || 0, 10));

    // Find matching lead and url
    const { data: leads, error: leadsErr } = await supabase
      .from('dt_leads3')
      .select('*')
      .is('deleted_at', null);

    if (leadsErr) throw leadsErr;

    let targetLead = null;
    let targetUrlObj = null;

    for (const l of (leads || [])) {
      if (Array.isArray(l.urls)) {
        const found = l.urls.find((u) => u.tracking_token === tracking_token && u.tracking_enabled);
        if (found) {
          targetLead = l;
          targetUrlObj = found;
          break;
        }
      }
    }

    if (!targetLead || !targetUrlObj) {
      return fail(res, 404, 'Tracked URL not found or tracking disabled');
    }

    const nowIso = new Date().toISOString();
    const pvRecord = {
      id: crypto.randomUUID(),
      visit_id: null,
      lead_id: targetLead.id,
      lead_url_id: targetUrlObj.id || tracking_token,
      tracking_token,
      session_id,
      path: cleanPath,
      full_url: full_url || targetUrlObj.url,
      viewed_at: nowIso,
      duration_seconds: duration,
      referrer: referrer || null,
    };

    // Insert into relational table dt_lead_url_page_views
    try {
      await supabase.from('dt_lead_url_page_views').insert(pvRecord);
    } catch (e) {
      // Relational table DDL pending execution in database
    }

    // Retrieve unique pages count for this token from relational table if available
    let uniquePagesCount = targetUrlObj.unique_pages || 1;
    try {
      const { data: pvDb } = await supabase
        .from('dt_lead_url_page_views')
        .select('path')
        .eq('tracking_token', tracking_token);
      if (pvDb && pvDb.length > 0) {
        uniquePagesCount = new Set(pvDb.map((p) => p.path)).size;
      }
    } catch (e) {}

    // Update ONLY summary fields in Lead JSONB URLs array in dt_leads3
    const updatedUrls = (targetLead.urls || []).map((u) => {
      if (u.tracking_token === tracking_token) {
        return {
          id: u.id,
          type: u.type,
          url: u.url,
          tracking_enabled: u.tracking_enabled,
          tracking_token: u.tracking_token,
          first_opened_at: u.first_opened_at || nowIso,
          last_opened_at: nowIso,
          total_visits: u.total_visits || 1,
          unique_visitors: u.unique_visitors || 1,
          unique_pages: Math.max(u.unique_pages || 1, uniquePagesCount),
        };
      }
      return u;
    });

    await supabase
      .from('dt_leads3')
      .update({ urls: updatedUrls, updated_at: nowIso })
      .eq('id', targetLead.id);

    return res.status(200).json({ ok: true, tracking_token, session_id, path: cleanPath });
  } catch (err) {
    return fail(res, 500, err.message);
  }
}

async function handleGetAnalytics(req, res) {
  try {
    const { action, leadId, urlId, token } = req.query;

    if (action === 'analytics') {
      return getOverallAnalytics(req, res);
    }

    if (!leadId && !urlId && !token) {
      return fail(res, 400, 'leadId, urlId, or token is required for URL analytics');
    }

    // Fetch Lead
    let lead = null;
    let targetUrlObj = null;

    if (leadId) {
      const { data, error } = await supabase.from('dt_leads3').select('*').eq('id', leadId).single();
      if (error) throw error;
      lead = data;
      if (lead && Array.isArray(lead.urls)) {
        if (urlId) targetUrlObj = lead.urls.find((u) => u.id === urlId);
        else if (token) targetUrlObj = lead.urls.find((u) => u.tracking_token === token);
        else targetUrlObj = lead.urls.find((u) => u.tracking_enabled);
      }
    } else {
      const { data: leads } = await supabase.from('dt_leads3').select('*').is('deleted_at', null);
      for (const l of (leads || [])) {
        if (Array.isArray(l.urls)) {
          const found = l.urls.find((u) => u.id === urlId || u.tracking_token === token);
          if (found) {
            lead = l;
            targetUrlObj = found;
            break;
          }
        }
      }
    }

    if (!lead || !targetUrlObj) {
      return fail(res, 404, 'Lead or Tracked URL not found');
    }

    const currentToken = targetUrlObj.tracking_token;

    // Fetch Visits & Page Views from relational tables
    let visits = [];
    let pageViews = [];

    try {
      const [{ data: vData }, { data: pvData }] = await Promise.all([
        supabase.from('dt_lead_url_visits').select('*').eq('tracking_token', currentToken).order('visited_at', { ascending: false }),
        supabase.from('dt_lead_url_page_views').select('*').eq('tracking_token', currentToken).order('viewed_at', { ascending: false }),
      ]);
      if (vData) visits = vData;
      if (pvData) pageViews = pvData;
    } catch (e) {}

    // Aggregate Top Pages
    const pageMap = new Map();
    pageViews.forEach((pv) => {
      const pathKey = pv.path || '/';
      if (!pageMap.has(pathKey)) {
        pageMap.set(pathKey, {
          path: pathKey,
          views: 0,
          first_viewed: pv.viewed_at,
          last_viewed: pv.viewed_at,
          total_duration: 0,
        });
      }
      const item = pageMap.get(pathKey);
      item.views += 1;
      if (new Date(pv.viewed_at) > new Date(item.last_viewed)) item.last_viewed = pv.viewed_at;
      if (new Date(pv.viewed_at) < new Date(item.first_viewed)) item.first_viewed = pv.viewed_at;
      item.total_duration += pv.duration_seconds || 0;
    });

    const pages = Array.from(pageMap.values()).map((p) => ({
      path: p.path,
      views: p.views,
      first_viewed: p.first_viewed,
      last_viewed: p.last_viewed,
      avg_duration_seconds: p.views > 0 ? Math.round(p.total_duration / p.views) : 0,
    })).sort((a, b) => b.views - a.views);

    return res.status(200).json({
      lead: {
        id: lead.id,
        lead_no: lead.lead_no,
        customer_name: lead.customer_name,
        company: lead.company,
      },
      url: targetUrlObj,
      summary: {
        first_opened_at: targetUrlObj.first_opened_at || (visits[visits.length - 1]?.visited_at ?? null),
        last_opened_at: targetUrlObj.last_opened_at || (visits[0]?.visited_at ?? null),
        total_visits: Math.max(targetUrlObj.total_visits || 0, visits.length),
        unique_visitors: Math.max(targetUrlObj.unique_visitors || 0, new Set(visits.map(v => v.ip_address || v.session_id)).size),
        unique_pages: Math.max(targetUrlObj.unique_pages || 0, pages.length),
      },
      pages,
      visits,
    });
  } catch (err) {
    return fail(res, 500, err.message);
  }
}

async function getOverallAnalytics(req, res) {
  try {
    const { data: leads, error } = await supabase.from('dt_leads3').select('*').is('deleted_at', null);
    if (error) throw error;

    let totalTrackedUrls = 0;
    let openedUrls = 0;
    let unopenedUrls = 0;
    let totalVisits = 0;
    const labelBreakdownMap = new Map();
    const trackedUrlList = [];

    (leads || []).forEach((l) => {
      if (Array.isArray(l.urls)) {
        l.urls.forEach((u) => {
          if (u.tracking_enabled) {
            totalTrackedUrls += 1;
            const visits = u.total_visits || 0;
            totalVisits += visits;
            if (visits > 0 || u.first_opened_at) openedUrls += 1;
            else unopenedUrls += 1;

            const label = u.type || 'Other';
            if (!labelBreakdownMap.has(label)) {
              labelBreakdownMap.set(label, { label, tracked: 0, opened: 0, visits: 0 });
            }
            const lbl = labelBreakdownMap.get(label);
            lbl.tracked += 1;
            if (visits > 0 || u.first_opened_at) lbl.opened += 1;
            lbl.visits += visits;

            trackedUrlList.push({
              lead_id: l.id,
              customer_name: l.customer_name,
              company: l.company,
              url_id: u.id,
              type: u.type,
              url: u.url,
              tracking_token: u.tracking_token,
              first_opened_at: u.first_opened_at,
              last_opened_at: u.last_opened_at,
              total_visits: u.total_visits || 0,
              unique_pages: u.unique_pages || 0,
            });
          }
        });
      }
    });

    let recentVisitsList = [];
    try {
      const { data: vDb } = await supabase
        .from('dt_lead_url_visits')
        .select('*')
        .order('visited_at', { ascending: false })
        .limit(50);
      if (vDb) recentVisitsList = vDb;
    } catch (e) {}

    return res.status(200).json({
      summary: {
        totalTrackedUrls,
        openedUrls,
        unopenedUrls,
        totalVisits,
        engagementRate: totalTrackedUrls > 0 ? Math.round((openedUrls / totalTrackedUrls) * 100) : 0,
      },
      labelBreakdown: Array.from(labelBreakdownMap.values()),
      trackedUrls: trackedUrlList.sort((a, b) => new Date(b.last_opened_at || 0) - new Date(a.last_opened_at || 0)),
      recentVisits: recentVisitsList,
    });
  } catch (err) {
    return fail(res, 500, err.message);
  }
}
