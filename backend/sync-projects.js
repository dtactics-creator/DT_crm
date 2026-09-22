import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:G00dwill1$@127.0.0.1:5432/dtactics_crm';
const pool = new pg.Pool({ connectionString });

const EMP_COLS = ['id', 'employee_name', 'role', 'phone', 'email', 'status', 'password_hash', 'created_at', 'updated_at', 'deleted_at'];
const PROJ_COLS = [
  'id', 'project_no', 'project_name', 'client', 'client_id', 'lead_id', 'lead_no', 'project_type',
  'industry', 'project_manager_id', 'assigned_employee_id', 'technology_stack', 'urls', 'project_cost',
  'status', 'priority', 'progress', 'start_date', 'expected_delivery', 'next_follow_up', 'remarks',
  'created_at', 'updated_at', 'deleted_at'
];

function filterObject(obj, allowedCols) {
  const res = {};
  for (const col of allowedCols) {
    if (col in obj) {
      res[col] = obj[col];
    }
  }
  return res;
}

async function main() {
  const { supabase } = await import('./api/_lib.js');

  console.log('Fetching employees from Supabase...');
  const { data: employees, error: eErr } = await supabase.from('crm_employees').select('*');
  if (eErr) throw eErr;
  console.log(`Fetched ${employees.length} employees from Supabase.`);

  console.log('Syncing employees into local PostgreSQL...');
  for (const e of employees) {
    const filtered = filterObject(e, EMP_COLS);
    const keys = Object.keys(filtered);
    const values = Object.values(filtered).map(v => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v));
    const cols = keys.map(k => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO crm_employees (${cols})
      VALUES (${placeholders})
      ON CONFLICT (id) DO UPDATE SET
        employee_name = EXCLUDED.employee_name,
        email = EXCLUDED.email,
        status = EXCLUDED.status;
    `;
    await pool.query(sql, values);
  }

  console.log('Fetching projects from Supabase...');
  const { data: projects, error: pErr } = await supabase.from('dt_projects').select('*');
  if (pErr) throw pErr;
  console.log(`Fetched ${projects.length} projects from Supabase.`);

  console.log('Syncing projects into local PostgreSQL...');
  for (const p of projects) {
    const filtered = filterObject(p, PROJ_COLS);
    const keys = Object.keys(filtered);
    const values = Object.values(filtered).map(v => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v));
    const cols = keys.map(k => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO dt_projects (${cols})
      VALUES (${placeholders})
      ON CONFLICT (id) DO UPDATE SET
        project_name = EXCLUDED.project_name,
        client = EXCLUDED.client,
        status = EXCLUDED.status;
    `;
    await pool.query(sql, values);
  }
  console.log('Local PostgreSQL employees and projects sync complete!');
  await pool.end();
}

main().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
