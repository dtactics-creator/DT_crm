import { preflight, fail, V } from './_lib.js';
import { requirePermission, getEffectivePermissions } from './_permissions.js';
import { getUser } from './_lib.js';
import { logAudit } from './_audit.js';
import {
  fetchSubmissions,
  insertSubmission,
  updateSubmissionRecord,
  moderateSubmissionRecord,
  fetchCompetitions,
  fetchRegistrations,
  logCompetitionActivity
} from './_competitions_db.js';

function generateSubmissionNo() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SUB-${rand}`;
}

export default async function handler(req, res) {
  if (preflight(req, res)) return;

  try {
    // -------------------------------------------------------------------------
    // GET: List submissions
    // -------------------------------------------------------------------------
    if (req.method === 'GET') {
      const { competition_id, registration_id, status, search, limit, offset } = req.query;
      if (!competition_id) return fail(res, 400, 'competition_id query parameter is required');

      const submissions = await fetchSubmissions(competition_id, {
        registration_id,
        status,
        search,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0
      });

      return res.status(200).json(submissions);
    }

    // -------------------------------------------------------------------------
    // POST: Create a new submission (Participant or CRM Admin)
    // -------------------------------------------------------------------------
    if (req.method === 'POST') {
      const {
        competition_id,
        registration_id,
        title,
        description,
        media_type = 'image',
        media_url,
        thumbnail_url,
        participant_id
      } = req.body || {};

      if (!competition_id) return fail(res, 400, 'competition_id is required');
      if (!registration_id) return fail(res, 400, 'registration_id is required');
      const validTitle = V.str(title, { field: 'Submission Title', required: true, min: 2 });
      if (!media_url) return fail(res, 400, 'media_url is required');

      // Verify competition submission period and limits
      const comp = await fetchCompetitions({ id: competition_id });
      if (!comp) return fail(res, 404, 'Competition not found');

      if (comp.status === 'archived' || comp.status === 'completed' || comp.status === 'voting_closed') {
        return fail(res, 400, 'Submissions are closed for this competition.');
      }

      const now = new Date();
      if (comp.submission_start_date && new Date(comp.submission_start_date) > now) {
        return fail(res, 400, 'Submission period has not started yet.');
      }
      if (comp.submission_end_date && new Date(comp.submission_end_date) < now) {
        return fail(res, 400, 'Submission period has ended.');
      }

      // Check max entries per participant
      const existingEntries = await fetchSubmissions(competition_id, { registration_id });
      const maxEntries = comp.max_entries_per_participant || 1;
      if (existingEntries.length >= maxEntries) {
        return fail(res, 400, `Maximum allowed submissions (${maxEntries}) reached for this participant.`);
      }

      const submission = await insertSubmission({
        submission_no: generateSubmissionNo(),
        competition_id,
        registration_id,
        participant_id: participant_id || null,
        title: validTitle,
        description: description || '',
        media_type,
        media_url,
        thumbnail_url: thumbnail_url || null,
        status: 'pending', // pending approval
      });

      await logCompetitionActivity({
        competitionId: competition_id,
        activityType: 'SUBMISSION_CREATED',
        actorName: submission.participant_name || 'Participant',
        description: `New entry submitted: "${validTitle}" (${submission.submission_no})`
      });

      return res.status(201).json(submission);
    }

    // -------------------------------------------------------------------------
    // PUT: Moderate submission (Approve / Reject / Remove) or Edit
    // -------------------------------------------------------------------------
    if (req.method === 'PUT') {
      const { id, action, status, rejection_reason, title, description } = req.body || {};
      if (!id) return fail(res, 400, 'Submission ID is required');

      // If this is an administrative moderation action
      if (action === 'moderate' || status) {
        const user = await requirePermission(req, res, 'competitions.edit');
        if (!user) return;

        const moderated = await moderateSubmissionRecord(id, {
          status: status || 'approved',
          rejection_reason: rejection_reason || null,
          moderator_id: user.employee_id || user.id || null
        });

        await logAudit({
          req,
          user,
          action: 'MODERATE',
          module: 'Competitions',
          entity: 'Submission',
          entityId: id,
          description: `Submission moderated to status: ${status}`,
          newValues: moderated
        });

        await logCompetitionActivity({
          competitionId: moderated.competition_id,
          activityType: 'SUBMISSION_MODERATED',
          actorName: user.employee_name || user.email,
          actorEmail: user.email,
          description: `Submission "${moderated.title}" was ${status}.`
        });

        return res.status(200).json(moderated);
      }

      // Otherwise participant editing own title/description
      const payload = {};
      if (title) payload.title = title;
      if (description !== undefined) payload.description = description;

      const updated = await updateSubmissionRecord(id, payload);
      return res.status(200).json(updated);
    }

    // -------------------------------------------------------------------------
    // DELETE: Delete submission
    // -------------------------------------------------------------------------
    if (req.method === 'DELETE') {
      const { id } = req.body || req.query || {};
      if (!id) return fail(res, 400, 'Submission ID is required');

      const user = await requirePermission(req, res, 'competitions.delete');
      if (!user) return;

      const updated = await updateSubmissionRecord(id, { deleted_at: new Date().toISOString(), status: 'removed' });

      await logAudit({
        req,
        user,
        action: 'DELETE',
        module: 'Competitions',
        entity: 'Submission',
        entityId: id,
        description: `Removed submission ${id}`
      });

      return res.status(200).json({ success: true, message: 'Submission removed successfully.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Error in /api/competition-submissions:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
