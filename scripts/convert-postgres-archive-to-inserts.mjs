import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

import pg from 'pg';

const { Client } = pg;

const [archivePath, outputPath] = process.argv.slice(2);
const connectionString = process.env.DATABASE_URL;

if (!archivePath || !outputPath) {
  throw new Error(
    'Usage: node scripts/convert-postgres-archive-to-inserts.mjs <archive> <output.sql>',
  );
}

if (!connectionString) {
  throw new Error('DATABASE_URL is required.');
}

const parsedUrl = new URL(connectionString);
if (!['127.0.0.1', 'localhost'].includes(parsedUrl.hostname)) {
  throw new Error('Refusing archive conversion against a non-local database.');
}

const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    env: process.env,
    shell: false,
    stdio: ['ignore', 'inherit', 'inherit'],
    windowsHide: true,
  });

  child.once('error', reject);
  child.once('exit', (code) => {
    if (code === 0) {
      resolve();
      return;
    }
    reject(new Error(`${command} failed with exit code ${code}.`));
  });
});

await run('pg_restore', [
  '-w',
  '--exit-on-error',
  '--single-transaction',
  '--no-owner',
  '--no-privileges',
  '--dbname',
  connectionString,
  archivePath,
]);

const client = new Client({ connectionString });
await client.connect();

let restoredTables;
let restoredRows;
try {
  const tables = await client.query(`
    select format('%I.%I', schemaname, tablename) as table_name
    from pg_tables
    where schemaname in ('public', 'app')
    order by schemaname, tablename
  `);
  restoredTables = tables.rowCount;
  restoredRows = 0;

  for (const { table_name: tableName } of tables.rows) {
    const count = await client.query(`select count(*)::int as count from ${tableName}`);
    restoredRows += count.rows[0].count;
  }
} finally {
  await client.end();
}

await run('pg_dump', [
  '-w',
  '--format=plain',
  '--inserts',
  '--no-owner',
  '--no-privileges',
  '--file',
  outputPath,
  connectionString,
]);

const output = await readFile(outputPath);
console.log(JSON.stringify({
  bytes: output.byteLength,
  restoredRows,
  restoredTables,
  sha256: createHash('sha256').update(output).digest('hex'),
}));
