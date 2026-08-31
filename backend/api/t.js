import { supabase, cors, fail } from './_lib.js';
import { getGeoLocation } from './_geo.js';
import { parseUserAgent } from './_ua.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    let token = req.params?.tracking_token || req.query?.token;
    if (!token && req.url) {
      const parts = req.url.split('?')[0].split('/');
      token = parts[parts.length - 1];
    }

    if (!token || token === 't' || token === 'sdk.js') {
      return fail(res, 400, 'Tracking token is required.');
    }

    // 1. Find lead containing the URL object with matching tracking_token
    const { data: leads, error: leadsErr } = await supabase
      .from('dt_leads3')
      .select('*')
      .is('deleted_at', null);

    if (leadsErr) throw leadsErr;

    let targetLead = null;
    let targetUrlObj = null;

    for (const l of (leads || [])) {
      if (Array.isArray(l.urls)) {
        const found = l.urls.find((u) => u.tracking_token === token && u.tracking_enabled);
        if (found) {
          targetLead = l;
          targetUrlObj = found;
          break;
        }
      }
    }

    if (!targetLead || !targetUrlObj) {
      return fail(res, 404, 'Tracked URL not found or tracking is disabled.');
    }

    // 2. Extract visitor metrics
    const clientIp = (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.ip ||
      req.socket?.remoteAddress ||
      '127.0.0.1'
    );
    const rawUa = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || req.headers['referrer'] || null;

    const uaInfo = parseUserAgent(rawUa);
    const geoInfo = await getGeoLocation(clientIp);
    const sessionId = `sess_${crypto.randomBytes(12).toString('hex')}`;
    const visitorId = `vid_${crypto.randomBytes(8).toString('hex')}`;
    const nowIso = new Date().toISOString();

    const visitRecord = {
      id: crypto.randomUUID(),
      lead_id: targetLead.id,
      lead_url_id: targetUrlObj.id || token,
      tracking_token: token,
      session_id: sessionId,
      visited_at: nowIso,
      full_url: targetUrlObj.url,
      path: '/',
      query_string: null,
      ip_address: clientIp,
      country: geoInfo.country,
      state: geoInfo.state,
      city: geoInfo.city,
      latitude: geoInfo.latitude,
      longitude: geoInfo.longitude,
      timezone: geoInfo.timezone,
      device_type: uaInfo.device_type,
      operating_system: uaInfo.operating_system,
      browser: uaInfo.browser,
      user_agent: rawUa,
      referrer: referrer,
      duration_seconds: 0,
    };

    const pageViewRecord = {
      id: crypto.randomUUID(),
      visit_id: visitRecord.id,
      lead_id: targetLead.id,
      lead_url_id: targetUrlObj.id || token,
      tracking_token: token,
      session_id: sessionId,
      path: '/',
      full_url: targetUrlObj.url,
      viewed_at: nowIso,
      duration_seconds: 0,
      referrer: referrer,
    };

    // 3. Insert visit & page view into relational tables dt_lead_url_visits and dt_lead_url_page_views
    try {
      await supabase.from('dt_lead_url_visits').insert(visitRecord);
      await supabase.from('dt_lead_url_page_views').insert(pageViewRecord);
    } catch (e) {
      // Ignore if table cache is loading
    }

    // 4. Calculate accurate counts for this tracking_token
    let totalVisitsCount = (targetUrlObj.total_visits || 0) + 1;
    let uniqueVisitorsCount = Math.max(1, targetUrlObj.unique_visitors || 1);
    let uniquePagesCount = Math.max(1, targetUrlObj.unique_pages || 1);

    try {
      const [{ data: visitsData }, { data: pvData }] = await Promise.all([
        supabase.from('dt_lead_url_visits').select('ip_address, session_id').eq('tracking_token', token),
        supabase.from('dt_lead_url_page_views').select('path').eq('tracking_token', token)
      ]);

      if (visitsData && visitsData.length > 0) {
        totalVisitsCount = visitsData.length;
        uniqueVisitorsCount = new Set(visitsData.map(v => v.ip_address || v.session_id)).size;
      }
      if (pvData && pvData.length > 0) {
        uniquePagesCount = new Set(pvData.map(p => p.path)).size;
      }
    } catch (e) {}

    // 5. Update summary fields inside Lead JSONB URLs array in dt_leads3
    const updatedUrls = (targetLead.urls || []).map((u) => {
      if (u.tracking_token === token || u.id === targetUrlObj.id) {
        const first_opened_at = u.first_opened_at || nowIso;
        const last_opened_at = nowIso;

        return {
          id: u.id,
          type: u.type,
          url: u.url,
          tracking_enabled: true,
          tracking_token: token,
          first_opened_at,
          last_opened_at,
          total_visits: totalVisitsCount,
          unique_visitors: uniqueVisitorsCount,
          unique_pages: uniquePagesCount,
        };
      }
      return u;
    });

    await supabase
      .from('dt_leads3')
      .update({ urls: updatedUrls, updated_at: nowIso })
      .eq('id', targetLead.id);

    // 6. Construct redirect URL with tracking parameters
    try {
      const redirectUrl = new URL(targetUrlObj.url);
      redirectUrl.searchParams.set('_dt_tk', token);
      redirectUrl.searchParams.set('_dt_sid', sessionId);
      return res.redirect(302, redirectUrl.toString());
    } catch (e) {
      const sep = targetUrlObj.url.includes('?') ? '&' : '?';
      return res.redirect(302, `${targetUrlObj.url}${sep}_dt_tk=${encodeURIComponent(token)}&_dt_sid=${encodeURIComponent(sessionId)}`);
    }
  } catch (err) {
    return fail(res, 500, err.message);
  }
}
