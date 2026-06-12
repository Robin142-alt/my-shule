import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        student_id UUID NOT NULL,
        invoice_number TEXT NOT NULL,
        fee_structure_id UUID,
        term TEXT NOT NULL,
        academic_year TEXT NOT NULL,
        amount_minor BIGINT NOT NULL,
        balance_minor BIGINT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        due_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS receipts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        receipt_number TEXT NOT NULL,
        student_id UUID NOT NULL,
        payment_id UUID NOT NULL,
        amount_minor BIGINT NOT NULL,
        payment_method TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tenant_pending_waivers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        waiver_number TEXT NOT NULL,
        student_id UUID NOT NULL,
        student_name TEXT NOT NULL,
        class_name TEXT NOT NULL,
        amount_minor BIGINT NOT NULL,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Finance tables created successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();