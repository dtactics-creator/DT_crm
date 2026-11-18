import { preflight, fail, V } from './_lib.js';
import { requirePermission } from './_permissions.js';
import { logAudit } from './_audit.js';
import {
  toggleLikeSubmission,
  fetchComments,
  addCommentRecord,
  createReport,
  fetchReports,
  updateReportRecord,
  logCompetitionActivity
} from './_competitions_db.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;

  try {
    // -------------------------------------------------------------------------
    // GET: Retrieve comments for a submission, or reports for admin review
    // -------------------------------------------------------------------------
    if (req.method === 'GET') {
      const { submission_id, competition_id, type, status } = req.query;

      if (submission_id) {
        const comments = await fetchComments(submission_id);
        return res.status(200).json(comments);
      }

      if (type === 'reports' && competition_id) {
        const user = await requirePermission(req, res, 'competitions.view');
        if (!user) return;

        const reports = await fetchReports(competition_id, status);
        return res.status(200).json(reports);
      }

      return fail(res, 400, 'Invalid query parameters.');
    }

    // -------------------------------------------------------------------------
    // POST: Like, Comment, or Report
    // -------------------------------------------------------------------------
    if (req.method === 'POST') {
      const { action } = req.body || {};

      // 1. LIKE / UNLIKE
      if (action === 'like') {
        const { competition_id, submission_id, voter_email, user_id } = req.body;
        if (!competition_id || !submission_id) return fail(res, 400, 'competition_id and submission_id are required.');
        const email = V.email(voter_email, { required: true });

        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
        const ua = req.headers['user-agent'];

        const result = await toggleLikeSubmission({
          competitionId: competition_id,
          submissionId: submission_id,
          voterEmail: email,
          userId: user_id || null,
          ipAddress: ip,
          userAgent: ua
        });

        return res.status(200).json(result);
      }

      // 2. COMMENT
      if (action === 'comment') {
        const { competition_id, submission_id, author_name, author_email, comment_text, author_avatar, user_id } = req.body;
        if (!competition_id || !submission_id) return fail(res, 400, 'competition_id and submission_id are required.');
        const name = V.str(author_name, { field: 'Author Name', required: true });
        const email = V.email(author_email, { required: true });
        const text = V.str(comment_text, { field: 'Comment', required: true, max: 1000 });

        const comment = await addCommentRecord({
          competitionId: competition_id,
          submissionId: submission_id,
          userId: user_id || null,
          authorName: name,
          authorEmail: email,
          authorAvatar: author_avatar || null,
          commentText: text
        });

        await logCompetitionActivity({
          competitionId: competition_id,
          activityType: 'COMMENT_ADDED',
          actorName: name,
          actorEmail: email,
          description: `${name} commented on submission ${submission_id.slice(0, 8)}...`
        });

        return res.status(201).json(comment);
      }

      // 3. REPORT
      if (action === 'report') {
        const { competition_id, target_type, target_id, reason, details, reported_by_email } = req.body;
        if (!competition_id || !target_type || !target_id) return fail(res, 400, 'Missing required report fields.');
        const validReason = V.str(reason, { field: 'Report Reason', required: true });

        const report = await createReport({
          competitionId: competition_id,
          targetType: target_type,
          targetId: target_id,
          reportedByEmail: reported_by_email || null,
          reason: validReason,
          details: details || null
        });

        await logCompetitionActivity({
          competitionId: competition_id,
          activityType: 'CONTENT_REPORTED',
          actorName: reported_by_email || 'Anonymous',
          description: `A ${target_type} was reported for: ${validReason}`
        });

        return res.status(201).json(report);
      }

      return fail(res, 400, 'Invalid action. Supported actions: like, comment, report.');
    }

    // -------------------------------------------------------------------------
    // PUT: Resolve or update report status
    // -------------------------------------------------------------------------
    if (req.method === 'PUT') {
      const user = await requirePermission(req, res, 'competitions.edit');
      if (!user) return;

      const { report_id, status, action_taken } = req.body;
      if (!report_id || !status) return fail(res, 400, 'report_id and status are required.');

      const updated = await updateReportRecord(report_id, {
        status,
        action_taken,
        reviewed_by: user.employee_id || user.id
      });

      await logAudit({
        req,
        user,
        action: 'MODERATE_REPORT',
        module: 'Competitions',
        entity: 'Report',
        entityId: report_id,
        description: `Moderated report to status ${status}`,
        newValues: updated
      });

      return res.status(200).json(updated);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Error in /api/competition-social:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
