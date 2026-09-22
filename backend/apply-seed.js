import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:G00dwill1$@127.0.0.1:5432/dtactics_crm';
const pool = new pg.Pool({ connectionString });

async function main() {
  const seedPath = path.join(__dirname, '..', 'seed.sql');
  console.log('Reading seed file from:', seedPath);
  const rawSql = fs.readFileSync(seedPath, 'utf8');

  // Filter out lines with GRANT/REVOKE/ALTER DEFAULT PRIVILEGES/anon/authenticated/service_role
  const cleanedLines = rawSql.split('\n').filter((line) => {
    const lower = line.toLowerCase().trim();
    if (lower.startsWith('grant ') || lower.startsWith('revoke ') || lower.startsWith('alter default privileges')) return false;
    if (lower.includes(' to anon') || lower.includes(' to authenticated') || lower.includes(' to service_role')) return false;
    return true;
  });

  const sql = cleanedLines.join('\n');
  console.log('Executing seed.sql on local PostgreSQL...');
  await pool.query(sql);
  console.log('Successfully seeded local PostgreSQL database!');
  await pool.end();
}

main().catch((err) => {
  console.error('Failed to apply seed:', err);
  process.exit(1);
});
