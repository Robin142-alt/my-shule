import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const connectionString = process.env.DATABASE_URL || 'postgres://myshule:secret@localhost:5432/myshule';
  console.log('Connecting to:', connectionString);
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to DB');
    
    const sqlPath = path.join(__dirname, '../../src/database/migrations/005_teacher_dashboard_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
