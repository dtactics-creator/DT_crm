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

function getPgPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:G00dwill1$@127.0.0.1:5432/dtactics_crm';
    pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
    });
  }
  return pool;
}

export async function fetchTasks(filters = {}) {
  const { id, project_id, assigned_employee_id, status, priority, module: taskModule, scope, employeeId, isAdmin } = filters;

  // Try Supabase PostgREST first
  try {
    let q = supabase
      .from('dt_tasks')
      .select('*, project:project_id(id, project_no, project_name, client, client_id), updates:dt_task_updates(*)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (id) q = q.eq('id', id);
    if (project_id) q = q.eq('project_id', project_id);
    if (assigned_employee_id) q = q.eq('assigned_employee_id', assigned_employee_id);
    if (status) q = q.eq('status', status);
    if (priority) q = q.eq('priority', priority);
    if (taskModule) q = q.eq('module', taskModule);

    if (scope === 'my_tasks' && employeeId) {
      q = q.eq('assigned_employee_id', employeeId);
    }

    const { data, error } = id ? await q.single() : await q;
    if (!error && data !== undefined) {
      return { data, isFromPg: false };
    }
  } catch (err) {
    // Fallback to direct PG client
  }

  // Fallback to PG Pool
  const client = getPgPool();
  let sql = `
    SELECT t.*,
           json_build_object('id', p.id, 'project_no', p.project_no, 'project_name', p.project_name, 'client', p.client, 'client_id', p.client_id) AS project,
           COALESCE((
             SELECT json_agg(u.* ORDER BY u.created_at DESC)
             FROM dt_task_updates u
             WHERE u.task_id = t.id
           ), '[]'::json) AS updates
    FROM dt_tasks t
    LEFT JOIN dt_projects p ON p.id = t.project_id
    WHERE t.deleted_at IS NULL
  `;
  const params = [];

  if (id) {
    params.push(id);
    sql += ` AND t.id = $${params.length}`;
  }
  if (project_id) {
    params.push(project_id);
    sql += ` AND t.project_id = $${params.length}`;
  }
  if (assigned_employee_id) {
    params.push(assigned_employee_id);
    sql += ` AND t.assigned_employee_id = $${params.length}`;
  }
  if (status) {
    params.push(status);
    sql += ` AND t.status = $${params.length}`;
  }
  if (priority) {
    params.push(priority);
    sql += ` AND t.priority = $${params.length}`;
  }
  if (taskModule) {
    params.push(taskModule);
    sql += ` AND t.module = $${params.length}`;
  }
  if (scope === 'my_tasks' && employeeId) {
    params.push(employeeId);
    sql += ` AND t.assigned_employee_id = $${params.length}`;
  }

  sql += ` ORDER BY t.created_at DESC`;

  const res = await client.query(sql, params);
  if (id) {
    return { data: res.rows[0] || null, isFromPg: true };
  }
  return { data: res.rows || [], isFromPg: true };
}

export async function insertTask(payload) {
  try {
    const { data, error } = await supabase.from('dt_tasks').insert(payload).select().single();
    if (!error && data) return data;
  } catch (e) {}

  const client = getPgPool();
  const keys = Object.keys(payload);
  const values = Object.values(payload).map(v => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v));
  const cols = keys.map(k => `"${k}"`).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const sql = `INSERT INTO dt_tasks (${cols}) VALUES (${placeholders}) RETURNING *`;
  const res = await client.query(sql, values);
  return res.rows[0];
}

export async function updateTaskRecord(id, payload) {
  try {
    const { data, error } = await supabase.from('dt_tasks').update(payload).eq('id', id).select().single();
    if (!error && data) return data;
  } catch (e) {}

  const client = getPgPool();
  const keys = Object.keys(payload);
  const values = Object.values(payload).map(v => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v));
  const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
  values.push(id);

  const sql = `UPDATE dt_tasks SET ${setClause} WHERE id = $${values.length} RETURNING *`;
  const res = await client.query(sql, values);
  return res.rows[0];
}

export async function deleteTaskRecord(id) {
  const patch = { deleted_at: new Date().toISOString() };
  try {
    const { error } = await supabase.from('dt_tasks').update(patch).eq('id', id);
    if (!error) return true;
  } catch (e) {}

  const client = getPgPool();
  await client.query('UPDATE dt_tasks SET deleted_at = NOW() WHERE id = $1', [id]);
  return true;
}

export async function fetchTaskUpdates(task_id) {
  try {
    const { data, error } = await supabase
      .from('dt_task_updates')
      .select('*')
      .eq('task_id', task_id)
      .order('created_at', { ascending: false });
    if (!error && data) return data;
  } catch (e) {}

  const client = getPgPool();
  const res = await client.query(
    'SELECT * FROM dt_task_updates WHERE task_id = $1 ORDER BY created_at DESC',
    [task_id]
  );
  return res.rows || [];
}

export async function insertTaskUpdate(payload) {
  try {
    const { data, error } = await supabase.from('dt_task_updates').insert([payload]).select().single();
    if (!error && data) return data;
  } catch (e) {}

  const client = getPgPool();
  const res = await client.query(
    `INSERT INTO dt_task_updates (task_id, employee_id, update_note, status_from, status_to)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [payload.task_id, payload.employee_id || null, payload.update_note, payload.status_from || null, payload.status_to || null]
  );
  return res.rows[0];
}
