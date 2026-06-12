import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS academics_exams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        academic_year TEXT NOT NULL,
        term TEXT NOT NULL,
        grade_level TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS academics_exam_marks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        exam_id UUID NOT NULL,
        student_id UUID NOT NULL,
        subject TEXT NOT NULL,
        marks INTEGER NOT NULL,
        grade TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, exam_id, student_id, subject)
      );
      
      CREATE TABLE IF NOT EXISTS academics_report_cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        exam_id UUID NOT NULL,
        student_id UUID NOT NULL,
        total_marks INTEGER,
        average_score NUMERIC(5,2),
        overall_grade TEXT,
        teacher_remarks TEXT,
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, exam_id, student_id)
      );
    `);
    console.log('Exam tables created successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
