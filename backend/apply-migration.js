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
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.warn('No migrations directory found');
    return false;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

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

    for (const file of files) {
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log(`Applying migration: ${file}...`);
      await client.query(sql);
      console.log(`Migration ${file} applied successfully!`);
    }

    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;");
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
