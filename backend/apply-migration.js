import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { Client } = pg;

export async function applyMigration() {
  const sqlPath = path.join(__dirname, 'migrations', '001_create_tasks.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Try local postgres connection if DATABASE_URL or PG_HOST configured, or default local
  const pgConfig = process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  } : {
    host: process.env.PGHOST || '127.0.0.1',
    port: process.env.PGPORT || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'G00dwill1$',
    database: process.env.PGDATABASE || 'dtactics_crm'
  };

  try {
    const client = new Client(pgConfig);
    await client.connect();
    await client.query(sql);
    console.log('Migration 001_create_tasks.sql applied successfully!');
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public';");
    console.log('Current DB tables:', res.rows.map(r => r.table_name));
    await client.end();
    return true;
  } catch (err) {
    console.error('Migration failed:', err.message);
    return false;
  }
}

if (process.argv[1] && process.argv[1].endsWith('apply-migration.js')) {
  applyMigration();
}
