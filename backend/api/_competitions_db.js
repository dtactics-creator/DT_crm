import { supabase } from './_lib.js';
import pg from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;
let pool = null;

export function getPgPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:G00dwill1$@127.0.0.1:5432/dtactics_crm';
    pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
    });
  }
  return pool;
}

// Helper to safely execute a query on PG pool
async function queryPg(sql, params = []) {
  const client = getPgPool();
  const res = await client.query(sql, params);
  return res.rows;
}

// ---------------------------------------------------------------------------
// COMPETITIONS CRUD & LISTING
// ---------------------------------------------------------------------------

export async function fetchCompetitions(filters = {}) {
  const { id, slug, status, category, project_id, campaign_id, search } = filters;

  // Attempt Supabase PostgREST first
  try {
    let q = supabase
      .from('dt_competitions')
      .select('*, project:project_id(id, project_no, project_name, client), campaign:campaign_id(id, title, type)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (id) q = q.eq('id', id);
    if (slug) q = q.eq('slug', slug);
    if (status) q = q.eq('status', status);
    if (category) q = q.eq('category', category);
    if (project_id) q = q.eq('project_id', project_id);
    if (campaign_id) q = q.eq('campaign_id', campaign_id);
    if (search) q = q.ilike('name', `%${search}%`);

    const { data, error } = id || slug ? await q.maybeSingle() : await q;
    if (!error && data !== undefined) {
      return data;
    }
  } catch (err) {
    // fallback to pg
  }

  // PG Fallback
  let sql = `
    SELECT c.*,
           json_build_object('id', p.id, 'project_no', p.project_no, 'project_name', p.project_name, 'client', p.client) AS project,
           json_build_object('id', cmp.id, 'title', cmp.title, 'type', cmp.type) AS campaign,
           (SELECT COUNT(*)::int FROM dt_competition_registrations r WHERE r.competition_id = c.id AND r.deleted_at IS NULL) AS total_participants,
           (SELECT COUNT(*)::int FROM dt_competition_submissions s WHERE s.competition_id = c.id AND s.deleted_at IS NULL) AS total_submissions,
           (SELECT COALESCE(SUM(s.likes_count), 0)::int FROM dt_competition_submissions s WHERE s.competition_id = c.id AND s.deleted_at IS NULL) AS total_likes
    FROM dt_competitions c
    LEFT JOIN dt_projects p ON p.id = c.project_id
    LEFT JOIN dt_campaigns cmp ON cmp.id = c.campaign_id
    WHERE c.deleted_at IS NULL
  `;
  const params = [];

  if (id) {
    params.push(id);
    sql += ` AND c.id = $${params.length}`;
  }
  if (slug) {
    params.push(slug);
    sql += ` AND (c.slug = $${params.length} OR c.subdomain = $${params.length})`;
  }
  if (status) {
    params.push(status);
    sql += ` AND c.status = $${params.length}`;
  }
  if (category) {
    params.push(category);
    sql += ` AND c.category = $${params.length}`;
  }
  if (project_id) {
    params.push(project_id);
    sql += ` AND c.project_id = $${params.length}`;
  }
  if (campaign_id) {
    params.push(campaign_id);
    sql += ` AND c.campaign_id = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (c.name ILIKE $${params.length} OR c.competition_no ILIKE $${params.length})`;
  }

  sql += ` ORDER BY c.created_at DESC`;

  const rows = await queryPg(sql, params);
  return id || slug ? (rows[0] || null) : rows;
}

export async function fetchCompetitionByDomain(domain) {
  if (!domain) return null;
  const cleanDomain = domain.toLowerCase().trim();

  // 1. Direct match on subdomain or custom_domain or slug
  let sql = `
    SELECT c.*,
           json_build_object('id', p.id, 'project_no', p.project_no, 'project_name', p.project_name) AS project,
           json_build_object('id', cmp.id, 'title', cmp.title) AS campaign
    FROM dt_competitions c
    LEFT JOIN dt_projects p ON p.id = c.project_id
    LEFT JOIN dt_campaigns cmp ON cmp.id = c.campaign_id
    LEFT JOIN dt_competition_domains cd ON cd.competition_id = c.id
    WHERE c.deleted_at IS NULL
      AND (
        c.slug = $1
        OR c.subdomain = $1
        OR c.custom_domain = $1
        OR cd.domain = $1
        OR $1 LIKE c.subdomain || '.%'
      )
    LIMIT 1;
  `;
  const rows = await queryPg(sql, [cleanDomain]);
  return rows[0] || null;
}

export async function insertCompetition(payload) {
  const client = getPgPool();
  const keys = Object.keys(payload);
  const values = Object.values(payload).map(v => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v));
  const cols = keys.map(k => `"${k}"`).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const sql = `INSERT INTO dt_competitions (${cols}) VALUES (${placeholders}) RETURNING *`;
  const res = await client.query(sql, values);
  return res.rows[0];
}

export async function updateCompetitionRecord(id, payload) {
  const client = getPgPool();
  payload.updated_at = new Date().toISOString();
  const keys = Object.keys(payload);
  const values = Object.values(payload).map(v => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v));
  const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');

  values.push(id);
  const sql = `UPDATE dt_competitions SET ${setClause} WHERE id = $${values.length} AND deleted_at IS NULL RETURNING *`;
  const res = await client.query(sql, values);
  return res.rows[0] || null;
}

export async function softDeleteCompetition(id) {
  const client = getPgPool();
  const now = new Date().toISOString();
  const res = await client.query(
    `UPDATE dt_competitions SET deleted_at = $1 WHERE id = $2 RETURNING *`,
    [now, id]
  );
  return res.rows[0] || null;
}

// ---------------------------------------------------------------------------
// COMPETITION DASHBOARD & ENGAGEMENT STATS
// ---------------------------------------------------------------------------

export async function getCompetitionDashboardStats(competitionId) {
  const client = getPgPool();

  const statsQuery = `
    SELECT
      (SELECT COUNT(*)::int FROM dt_competition_registrations WHERE competition_id = $1 AND deleted_at IS NULL) AS total_registrations,
      (SELECT COUNT(*)::int FROM dt_competition_registrations WHERE competition_id = $1 AND status = 'active' AND deleted_at IS NULL) AS total_participants,
      (SELECT COUNT(*)::int FROM dt_competition_submissions WHERE competition_id = $1 AND deleted_at IS NULL) AS total_submissions,
      (SELECT COUNT(*)::int FROM dt_competition_submissions WHERE competition_id = $1 AND status = 'approved' AND deleted_at IS NULL) AS approved_submissions,
      (SELECT COUNT(*)::int FROM dt_competition_submissions WHERE competition_id = $1 AND status = 'pending' AND deleted_at IS NULL) AS pending_submissions,
      (SELECT COUNT(*)::int FROM dt_competition_submissions WHERE competition_id = $1 AND status = 'rejected' AND deleted_at IS NULL) AS rejected_submissions,
      (SELECT COALESCE(SUM(likes_count), 0)::int FROM dt_competition_submissions WHERE competition_id = $1 AND deleted_at IS NULL) AS total_likes,
      (SELECT COALESCE(SUM(comments_count), 0)::int FROM dt_competition_submissions WHERE competition_id = $1 AND deleted_at IS NULL) AS total_comments,
      (SELECT COALESCE(SUM(views_count), 0)::int FROM dt_competition_submissions WHERE competition_id = $1 AND deleted_at IS NULL) AS total_views,
      (SELECT COUNT(*)::int FROM dt_competition_reports WHERE competition_id = $1 AND status = 'pending') AS pending_reports
  `;
  const statsRes = await client.query(statsQuery, [competitionId]);
  const stats = statsRes.rows[0] || {};

  // Top performing submissions
  const topSubmissionsQuery = `
    SELECT s.*, r.participant_name, r.avatar_url AS participant_avatar
    FROM dt_competition_submissions s
    JOIN dt_competition_registrations r ON r.id = s.registration_id
    WHERE s.competition_id = $1 AND s.status = 'approved' AND s.deleted_at IS NULL
    ORDER BY s.likes_count DESC, s.created_at ASC
    LIMIT 6
  `;
  const topSubmissions = await queryPg(topSubmissionsQuery, [competitionId]);

  // Recent activity logs
  const activityQuery = `
    SELECT * FROM dt_competition_activity_logs
    WHERE competition_id = $1
    ORDER BY created_at DESC
    LIMIT 10
  `;
  const recentActivities = await queryPg(activityQuery, [competitionId]);

  // Winners if any
  const winnersQuery = `
    SELECT w.*, s.title AS submission_title, s.media_url, s.media_type
    FROM dt_competition_winners w
    LEFT JOIN dt_competition_submissions s ON s.id = w.submission_id
    WHERE w.competition_id = $1
    ORDER BY w.place ASC
  `;
  const winners = await queryPg(winnersQuery, [competitionId]);

  return {
    ...stats,
    topSubmissions,
    recentActivities,
    winners
  };
}

// ---------------------------------------------------------------------------
// PARTICIPANT / REGISTRATION MANAGEMENT
// ---------------------------------------------------------------------------

export async function fetchRegistrations(competitionId, filters = {}) {
  const { search, status } = filters;
  let sql = `
    SELECT r.*,
           (SELECT COUNT(*)::int FROM dt_competition_submissions s WHERE s.registration_id = r.id AND s.deleted_at IS NULL) AS submission_count,
           (SELECT COUNT(*)::int FROM dt_competition_reports rep WHERE rep.target_id = r.id AND rep.target_type = 'participant' AND rep.status = 'pending') AS report_count
    FROM dt_competition_registrations r
    WHERE r.competition_id = $1 AND r.deleted_at IS NULL
  `;
  const params = [competitionId];

  if (status) {
    params.push(status);
    sql += ` AND r.status = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (r.participant_name ILIKE $${params.length} OR r.email ILIKE $${params.length} OR r.phone ILIKE $${params.length})`;
  }

  sql += ` ORDER BY r.registered_at DESC`;
  return await queryPg(sql, params);
}

export async function registerParticipant(payload) {
  const client = getPgPool();
  const keys = Object.keys(payload);
  const values = Object.values(payload).map(v => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v));
  const cols = keys.map(k => `"${k}"`).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const sql = `
    INSERT INTO dt_competition_registrations (${cols})
    VALUES (${placeholders})
    ON CONFLICT (competition_id, email) DO UPDATE SET
      participant_name = EXCLUDED.participant_name,
      phone = COALESCE(EXCLUDED.phone, dt_competition_registrations.phone),
      bio = COALESCE(EXCLUDED.bio, dt_competition_registrations.bio),
      updated_at = NOW()
    RETURNING *
  `;
  const res = await client.query(sql, values);
  return res.rows[0];
}

export async function updateRegistration(id, payload) {
  const client = getPgPool();
  payload.updated_at = new Date().toISOString();
  const keys = Object.keys(payload);
  const values = Object.values(payload).map(v => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v));
  const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');

  values.push(id);
  const sql = `UPDATE dt_competition_registrations SET ${setClause} WHERE id = $${values.length} RETURNING *`;
  const res = await client.query(sql, values);
  return res.rows[0] || null;
}

// ---------------------------------------------------------------------------
// SUBMISSIONS MANAGEMENT & MODERATION
// ---------------------------------------------------------------------------

export async function fetchSubmissions(competitionId, filters = {}) {
  const { registration_id, status, search, limit = 50, offset = 0 } = filters;
  let sql = `
    SELECT s.*,
           r.participant_name,
           r.email AS participant_email,
           r.avatar_url AS participant_avatar,
           r.status AS participant_status,
           e.employee_name AS moderator_name
    FROM dt_competition_submissions s
    JOIN dt_competition_registrations r ON r.id = s.registration_id
    LEFT JOIN crm_employees e ON e.id = s.moderated_by
    WHERE s.competition_id = $1 AND s.deleted_at IS NULL
  `;
  const params = [competitionId];

  if (registration_id) {
    params.push(registration_id);
    sql += ` AND s.registration_id = $${params.length}`;
  }
  if (status) {
    params.push(status);
    sql += ` AND s.status = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (s.title ILIKE $${params.length} OR s.description ILIKE $${params.length} OR r.participant_name ILIKE $${params.length} OR s.submission_no ILIKE $${params.length})`;
  }

  sql += ` ORDER BY s.likes_count DESC, s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  return await queryPg(sql, params);
}

export async function insertSubmission(payload) {
  const client = getPgPool();
  const keys = Object.keys(payload);
  const values = Object.values(payload).map(v => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v));
  const cols = keys.map(k => `"${k}"`).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const sql = `INSERT INTO dt_competition_submissions (${cols}) VALUES (${placeholders}) RETURNING *`;
  const res = await client.query(sql, values);
  return res.rows[0];
}

export async function updateSubmissionRecord(id, payload) {
  const client = getPgPool();
  payload.updated_at = new Date().toISOString();
  const keys = Object.keys(payload);
  const values = Object.values(payload).map(v => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v));
  const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');

  values.push(id);
  const sql = `UPDATE dt_competition_submissions SET ${setClause} WHERE id = $${values.length} AND deleted_at IS NULL RETURNING *`;
  const res = await client.query(sql, values);
  return res.rows[0] || null;
}

export async function moderateSubmissionRecord(id, { status, rejection_reason, moderator_id }) {
  const client = getPgPool();
  const sql = `
    UPDATE dt_competition_submissions
    SET status = $1,
        rejection_reason = $2,
        moderated_by = $3,
        moderated_at = NOW(),
        updated_at = NOW()
    WHERE id = $4
    RETURNING *
  `;
  const res = await client.query(sql, [status, rejection_reason || null, moderator_id || null, id]);
  return res.rows[0] || null;
}

// ---------------------------------------------------------------------------
// SOCIAL ENGAGEMENT: LIKES, COMMENTS & REPORTS
// ---------------------------------------------------------------------------

export async function toggleLikeSubmission({ competitionId, submissionId, voterEmail, userId, ipAddress, userAgent }) {
  const client = await getPgPool().connect();
  try {
    await client.query('BEGIN');

    // Check if voting is open for this competition
    const compRes = await client.query(
      `SELECT voting_start_date, voting_end_date, status FROM dt_competitions WHERE id = $1`,
      [competitionId]
    );
    const comp = compRes.rows[0];
    if (comp) {
      const now = new Date();
      if (comp.status === 'voting_closed' || comp.status === 'completed' || comp.status === 'archived') {
        throw new Error('Voting is closed for this competition.');
      }
      if (comp.voting_start_date && new Date(comp.voting_start_date) > now) {
        throw new Error('Voting has not started yet.');
      }
      if (comp.voting_end_date && new Date(comp.voting_end_date) < now) {
        throw new Error('Voting has ended.');
      }
    }

    // Check existing like
    const checkSql = `SELECT id FROM dt_competition_likes WHERE submission_id = $1 AND voter_email = $2`;
    const checkRes = await client.query(checkSql, [submissionId, voterEmail.toLowerCase().trim()]);

    if (checkRes.rows.length > 0) {
      // Unlike
      await client.query(`DELETE FROM dt_competition_likes WHERE id = $1`, [checkRes.rows[0].id]);
      await client.query(
        `UPDATE dt_competition_submissions SET likes_count = GREATEST(0, likes_count - 1), updated_at = NOW() WHERE id = $1`,
        [submissionId]
      );
      await client.query('COMMIT');
      return { liked: false };
    } else {
      // Like
      await client.query(
        `INSERT INTO dt_competition_likes (competition_id, submission_id, user_id, voter_email, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [competitionId, submissionId, userId || null, voterEmail.toLowerCase().trim(), ipAddress || null, userAgent || null]
      );
      await client.query(
        `UPDATE dt_competition_submissions SET likes_count = likes_count + 1, updated_at = NOW() WHERE id = $1`,
        [submissionId]
      );
      await client.query('COMMIT');
      return { liked: true };
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function fetchComments(submissionId) {
  const sql = `
    SELECT * FROM dt_competition_comments
    WHERE submission_id = $1 AND deleted_at IS NULL AND status = 'active'
    ORDER BY created_at ASC
  `;
  return await queryPg(sql, [submissionId]);
}

export async function addCommentRecord({ competitionId, submissionId, userId, authorName, authorEmail, authorAvatar, commentText }) {
  const client = await getPgPool().connect();
  try {
    await client.query('BEGIN');
    const insertSql = `
      INSERT INTO dt_competition_comments (competition_id, submission_id, user_id, author_name, author_email, author_avatar, comment_text)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const res = await client.query(insertSql, [competitionId, submissionId, userId || null, authorName, authorEmail, authorAvatar || null, commentText]);
    await client.query(
      `UPDATE dt_competition_submissions SET comments_count = comments_count + 1, updated_at = NOW() WHERE id = $1`,
      [submissionId]
    );
    await client.query('COMMIT');
    return res.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function createReport({ competitionId, targetType, targetId, reportedByEmail, reason, details }) {
  const sql = `
    INSERT INTO dt_competition_reports (competition_id, target_type, target_id, reported_by_email, reason, details)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const res = await queryPg(sql, [competitionId, targetType, targetId, reportedByEmail || null, reason, details || null]);
  return res[0];
}

export async function fetchReports(competitionId, status = null) {
  let sql = `
    SELECT r.*,
           e.employee_name AS reviewer_name
    FROM dt_competition_reports r
    LEFT JOIN crm_employees e ON e.id = r.reviewed_by
    WHERE r.competition_id = $1
  `;
  const params = [competitionId];
  if (status) {
    params.push(status);
    sql += ` AND r.status = $${params.length}`;
  }
  sql += ` ORDER BY r.created_at DESC`;
  return await queryPg(sql, params);
}

export async function updateReportRecord(id, { status, action_taken, reviewed_by }) {
  const sql = `
    UPDATE dt_competition_reports
    SET status = $1,
        action_taken = $2,
        reviewed_by = $3,
        reviewed_at = NOW()
    WHERE id = $4
    RETURNING *
  `;
  const res = await queryPg(sql, [status, action_taken || null, reviewed_by || null, id]);
  return res[0] || null;
}

// ---------------------------------------------------------------------------
// LEADERBOARD & WINNERS
// ---------------------------------------------------------------------------

export async function fetchLeaderboard(competitionId, { limit = 20 } = {}) {
  const sql = `
    SELECT s.id AS submission_id,
           s.submission_no,
           s.title,
           s.media_url,
           s.thumbnail_url,
           s.media_type,
           s.likes_count,
           s.jury_score,
           (s.likes_count + COALESCE(s.jury_score, 0)) AS total_score,
           s.is_winner,
           r.id AS registration_id,
           r.participant_name,
           r.avatar_url AS participant_avatar,
           DENSE_RANK() OVER (ORDER BY s.likes_count DESC, s.created_at ASC) AS calculated_rank
    FROM dt_competition_submissions s
    JOIN dt_competition_registrations r ON r.id = s.registration_id
    WHERE s.competition_id = $1
      AND s.status = 'approved'
      AND s.deleted_at IS NULL
      AND r.status = 'active'
    ORDER BY calculated_rank ASC, s.created_at ASC
    LIMIT $2
  `;
  return await queryPg(sql, [competitionId, limit]);
}

export async function publishCompetitionWinners(competitionId, winnersList, publishedBy) {
  const client = await getPgPool().connect();
  try {
    await client.query('BEGIN');

    // Clear previous winners if re-publishing
    await client.query(`DELETE FROM dt_competition_winners WHERE competition_id = $1`, [competitionId]);

    // Reset winner flags on submissions
    await client.query(`UPDATE dt_competition_submissions SET is_winner = false, rank = NULL WHERE competition_id = $1`, [competitionId]);

    const insertedWinners = [];
    for (const w of winnersList) {
      const sql = `
        INSERT INTO dt_competition_winners (
          competition_id, place, prize_title, prize_amount, submission_id,
          registration_id, participant_name, final_likes, final_score, published_by, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      const res = await client.query(sql, [
        competitionId,
        w.place,
        w.prize_title,
        w.prize_amount || null,
        w.submission_id,
        w.registration_id,
        w.participant_name,
        w.final_likes || 0,
        w.final_score || 0,
        publishedBy || null,
        w.notes || null
      ]);
      insertedWinners.push(res.rows[0]);

      // Update submission record
      if (w.submission_id) {
        await client.query(
          `UPDATE dt_competition_submissions SET is_winner = true, rank = $1, updated_at = NOW() WHERE id = $2`,
          [w.place, w.submission_id]
        );
      }
    }

    // Set competition status to completed
    await client.query(
      `UPDATE dt_competitions SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [competitionId]
    );

    await client.query('COMMIT');
    return insertedWinners;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function fetchWinners(competitionId) {
  const sql = `
    SELECT w.*,
           s.title AS submission_title,
           s.media_url,
           s.media_type,
           r.avatar_url AS participant_avatar
    FROM dt_competition_winners w
    LEFT JOIN dt_competition_submissions s ON s.id = w.submission_id
    LEFT JOIN dt_competition_registrations r ON r.id = w.registration_id
    WHERE w.competition_id = $1
    ORDER BY w.place ASC
  `;
  return await queryPg(sql, [competitionId]);
}

// ---------------------------------------------------------------------------
// ACTIVITY LOGGING
// ---------------------------------------------------------------------------

export async function logCompetitionActivity({ competitionId, activityType, actorName, actorEmail, description, metadata = {} }) {
  try {
    const sql = `
      INSERT INTO dt_competition_activity_logs (competition_id, activity_type, actor_name, actor_email, description, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await queryPg(sql, [competitionId, activityType, actorName || 'System', actorEmail || null, description, JSON.stringify(metadata)]);
  } catch (e) {
    console.error('Failed to log competition activity:', e.message);
  }
}
