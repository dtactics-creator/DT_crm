import { preflight, fail, V } from './_lib.js';
import { requirePermission, methodPermission } from './_permissions.js';
import { logAudit } from './_audit.js';
import {
  fetchCompetitions,
  insertCompetition,
  updateCompetitionRecord,
  softDeleteCompetition,
  logCompetitionActivity
} from './_competitions_db.js';

// Auto-generate competition number like '26-CMP-001'
function generateCompetitionNo() {
  const year = new Date().getFullYear().toString().slice(-2);
  const rand = Math.floor(100 + Math.random() * 900);
  return `${year}-CMP-${rand}`;
}

export default async function handler(req, res) {
  if (preflight(req, res)) return;

  try {
    // -------------------------------------------------------------------------
    // GET: List or retrieve competition(s)
    // -------------------------------------------------------------------------
    if (req.method === 'GET') {
      const { id, slug, status, category, project_id, campaign_id, search } = req.query;
      const data = await fetchCompetitions({ id, slug, status, category, project_id, campaign_id, search });
      return res.status(200).json(data);
    }

    // Mutating methods require permissions
    const requiredPerm = methodPermission('competitions', req.method);
    const user = await requirePermission(req, res, requiredPerm);
    if (!user) return; // 401/403 sent

    // -------------------------------------------------------------------------
    // POST: Create a new competition
    // -------------------------------------------------------------------------
    if (req.method === 'POST') {
      const body = req.body || {};
      const name = V.str(body.name, { field: 'Competition Name', required: true, min: 3 });
      
      // Auto-generate slug if not provided
      let slug = body.slug ? String(body.slug).toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-') : '';
      if (!slug) {
        slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }

      const payload = {
        competition_no: body.competition_no || generateCompetitionNo(),
        name,
        slug,
        subdomain: body.subdomain ? String(body.subdomain).toLowerCase().trim() : slug,
        custom_domain: body.custom_domain ? String(body.custom_domain).toLowerCase().trim() : null,
        category: body.category || 'photography',
        type: body.type || 'public',
        description: body.description || '',
        description_ta: body.description_ta || '',
        rules: body.rules || '',
        rules_ta: body.rules_ta || '',
        eligibility: body.eligibility || '',
        eligibility_ta: body.eligibility_ta || '',
        banner_url: body.banner_url || null,
        logo_url: body.logo_url || null,
        primary_color: body.primary_color || '#3b82f6',
        project_id: body.project_id || null,
        campaign_id: body.campaign_id || null,
        registration_start_date: body.registration_start_date || null,
        registration_end_date: body.registration_end_date || null,
        submission_start_date: body.submission_start_date || null,
        submission_end_date: body.submission_end_date || null,
        voting_start_date: body.voting_start_date || null,
        voting_end_date: body.voting_end_date || null,
        max_entries_per_participant: parseInt(body.max_entries_per_participant, 10) || 1,
        allowed_formats: Array.isArray(body.allowed_formats) ? body.allowed_formats : ['image'],
        max_file_size_mb: parseInt(body.max_file_size_mb, 10) || 50,
        winner_selection_method: body.winner_selection_method || 'public_voting',
        tie_breaker_rule: body.tie_breaker_rule || 'earliest_submission',
        status: body.status || 'draft',
        rewards: Array.isArray(body.rewards) ? body.rewards : [],
        metadata: body.metadata || {},
        created_by: user.employee_id || user.id || null,
      };

      const created = await insertCompetition(payload);

      await logAudit({
        req,
        user,
        action: 'CREATE',
        module: 'Competitions',
        entity: 'Competition',
        entityId: created.id,
        description: `Created competition: ${created.name} (${created.competition_no})`,
        newValues: created
      });

      await logCompetitionActivity({
        competitionId: created.id,
        activityType: 'COMPETITION_CREATED',
        actorName: user.employee_name || user.email,
        actorEmail: user.email,
        description: `Competition "${created.name}" was created.`
      });

      return res.status(201).json(created);
    }

    // -------------------------------------------------------------------------
    // PUT: Update competition configuration
    // -------------------------------------------------------------------------
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || {};
      if (!id) return fail(res, 400, 'Competition ID is required.');

      const existing = await fetchCompetitions({ id });
      if (!existing) return fail(res, 404, 'Competition not found.');

      // Format clean updates
      const allowedKeys = [
        'name', 'slug', 'subdomain', 'custom_domain', 'category', 'type',
        'description', 'description_ta', 'rules', 'rules_ta',
        'eligibility', 'eligibility_ta', 'banner_url', 'logo_url', 'primary_color',
        'project_id', 'campaign_id', 'registration_start_date', 'registration_end_date',
        'submission_start_date', 'submission_end_date', 'voting_start_date', 'voting_end_date',
        'max_entries_per_participant', 'allowed_formats', 'max_file_size_mb',
        'winner_selection_method', 'tie_breaker_rule', 'status', 'rewards', 'metadata'
      ];

      const payload = {};
      for (const k of allowedKeys) {
        if (k in updates) {
          payload[k] = updates[k];
        }
      }

      const updated = await updateCompetitionRecord(id, payload);

      await logAudit({
        req,
        user,
        action: 'UPDATE',
        module: 'Competitions',
        entity: 'Competition',
        entityId: id,
        description: `Updated competition: ${updated.name}`,
        oldValues: existing,
        newValues: updated
      });

      await logCompetitionActivity({
        competitionId: id,
        activityType: 'COMPETITION_UPDATED',
        actorName: user.employee_name || user.email,
        actorEmail: user.email,
        description: `Competition "${updated.name}" settings were updated.`
      });

      return res.status(200).json(updated);
    }

    // -------------------------------------------------------------------------
    // DELETE: Soft delete competition
    // -------------------------------------------------------------------------
    if (req.method === 'DELETE') {
      const { id } = req.body || req.query || {};
      if (!id) return fail(res, 400, 'Competition ID is required.');

      const existing = await fetchCompetitions({ id });
      if (!existing) return fail(res, 404, 'Competition not found.');

      await softDeleteCompetition(id);

      await logAudit({
        req,
        user,
        action: 'DELETE',
        module: 'Competitions',
        entity: 'Competition',
        entityId: id,
        description: `Soft deleted competition: ${existing.name}`,
        oldValues: existing
      });

      return res.status(200).json({ success: true, message: 'Competition deleted successfully.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Error in /api/competitions:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
