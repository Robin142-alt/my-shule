import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

import pg from 'pg';

const { Client } = pg;

const CONFIRMATION = 'RAILWAY_TEST_ONLY';
const sqlPath = process.argv[2];
const connectionString = process.env.TARGET_DATABASE_URL;
const expectedDatabase = process.env.MIGRATION_EXPECTED_TARGET_DATABASE ?? 'myshule';

if (!sqlPath) {
  throw new Error('Usage: node scripts/restore-postgres-archive.mjs <insert-sql-file>');
}

if (!connectionString) {
  throw new Error('TARGET_DATABASE_URL is required.');
}

if (process.env.MYSHULE_RESTORE_CONFIRM !== CONFIRMATION) {
  throw new Error(`MYSHULE_RESTORE_CONFIRM must equal ${CONFIRMATION}.`);
}

if (!['myshule', 'myshule_final'].includes(expectedDatabase)) {
  throw new Error('MIGRATION_EXPECTED_TARGET_DATABASE must be myshule or myshule_final.');
}

const parsedUrl = new URL(connectionString);
if (parsedUrl.hostname.includes('neon.tech')) {
  throw new Error('Refusing to restore to a Neon database.');
}

let sql = await readFile(sqlPath, 'utf8');
const sha256 = createHash('sha256').update(sql).digest('hex');

// PostgreSQL 18 pg_restore adds session-bound psql guards around plain output.
sql = sql.replace(/^\\(?:restrict|unrestrict)\b.*$/gmu, '');

if (/^\\/mu.test(sql)) {
  throw new Error('Restore SQL contains unsupported psql meta-commands.');
}

if (/\bCOPY\s+[^;]+\s+FROM\s+stdin\s*;/iu.test(sql)) {
  throw new Error('Restore SQL contains COPY FROM stdin; regenerate it with --inserts.');
}

const client = new Client({
  application_name: 'myshule_archive_restore',
  connectionString,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

await client.connect();

try {
  const preflight = await client.query(`
    select
      current_database() as database_name,
      count(*)::int as user_table_count
    from information_schema.tables
    where table_schema in ('public', 'app')
  `);
  const { database_name: databaseName, user_table_count: userTableCount } = preflight.rows[0];

  if (databaseName !== expectedDatabase) {
    throw new Error(`Refusing restore into unexpected database ${databaseName}.`);
  }

  if (userTableCount !== 0) {
    throw new Error(`Refusing restore into non-empty database (${userTableCount} user tables).`);
  }

  const startedAt = new Date();
  await client.query(`begin;\n${sql}\ncommit;`);

  const verification = await client.query(`
    select
      count(*) filter (where table_type = 'BASE TABLE')::int as tables,
      count(*) filter (where table_type = 'VIEW')::int as views
    from information_schema.tables
    where table_schema in ('public', 'app')
  `);

  console.log(JSON.stringify({
    database: databaseName,
    durationSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
    restoreTransactionCommitted: true,
    sha256,
    ...verification.rows[0],
  }));
} catch (error) {
  try {
    await client.query('rollback');
  } catch {
    // The server already rolled back if the connection itself failed.
  }
  throw error;
} finally {
  await client.end().catch(() => undefined);
}
