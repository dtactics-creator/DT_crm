import { preflight, fail, V } from './_lib.js';
import { requirePermission } from './_permissions.js';
import { logAudit } from './_audit.js';
import {
  fetchRegistrations,
  registerParticipant,
  updateRegistration,
  fetchCompetitions,
  logCompetitionActivity
} from './_competitions_db.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;

  try {
    // -------------------------------------------------------------------------
    // GET: List participants for a competition
    // -------------------------------------------------------------------------
    if (req.method === 'GET') {
      const { competition_id, status, search } = req.query;
      if (!competition_id) return fail(res, 400, 'competition_id query parameter is required');

      const participants = await fetchRegistrations(competition_id, { status, search });
      return res.status(200).json(participants);
    }

    // -------------------------------------------------------------------------
    // POST: Register participant
    // Can be called publicly (from competition portal) or by CRM admin
    // -------------------------------------------------------------------------
    if (req.method === 'POST') {
      const { competition_id, participant_name, email, phone, bio, avatar_url, user_id } = req.body || {};

      if (!competition_id) return fail(res, 400, 'competition_id is required');
      const name = V.str(participant_name, { field: 'Participant Name', required: true, min: 2 });
      const validEmail = V.email(email, { required: true });

      // Check competition registration window
      const comp = await fetchCompetitions({ id: competition_id });
      if (!comp) return fail(res, 404, 'Competition not found');

      if (comp.status === 'archived' || comp.status === 'completed') {
        return fail(res, 400, 'This competition is closed for registration.');
      }

      const now = new Date();
      if (comp.registration_start_date && new Date(comp.registration_start_date) > now) {
        return fail(res, 400, 'Registration has not started yet.');
      }
      if (comp.registration_end_date && new Date(comp.registration_end_date) < now) {
        return fail(res, 400, 'Registration period has ended.');
      }

      const registration = await registerParticipant({
        competition_id,
        user_id: user_id || null,
        participant_name: name,
        email: validEmail,
        phone: phone ? String(phone).trim() : null,
        bio: bio ? String(bio).trim() : null,
        avatar_url: avatar_url || null,
        status: 'active'
      });

      await logCompetitionActivity({
        competitionId: competition_id,
        activityType: 'PARTICIPANT_REGISTERED',
        actorName: name,
        actorEmail: validEmail,
        description: `${name} (${validEmail}) registered for the competition.`
      });

      return res.status(201).json(registration);
    }

    // -------------------------------------------------------------------------
    // PUT: Update participant (Suspend / Activate / Edit)
    // -------------------------------------------------------------------------
    if (req.method === 'PUT') {
      const user = await requirePermission(req, res, 'competitions.edit');
      if (!user) return;

      const { id, status, suspension_reason, participant_name, bio, phone } = req.body || {};
      if (!id) return fail(res, 400, 'Participant ID is required');

      const payload = {};
      if (status) payload.status = status;
      if (suspension_reason !== undefined) payload.suspension_reason = suspension_reason;
      if (participant_name) payload.participant_name = participant_name;
      if (bio !== undefined) payload.bio = bio;
      if (phone !== undefined) payload.phone = phone;

      const updated = await updateRegistration(id, payload);

      await logAudit({
        req,
        user,
        action: 'UPDATE',
        module: 'Competitions',
        entity: 'Participant',
        entityId: id,
        description: `Updated participant status to: ${updated.status}`,
        newValues: updated
      });

      if (status === 'suspended') {
        await logCompetitionActivity({
          competitionId: updated.competition_id,
          activityType: 'PARTICIPANT_SUSPENDED',
          actorName: user.employee_name || user.email,
          actorEmail: user.email,
          description: `Participant "${updated.participant_name}" was suspended.`
        });
      }

      return res.status(200).json(updated);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Error in /api/competition-participants:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
