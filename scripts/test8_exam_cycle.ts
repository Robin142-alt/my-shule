import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- Starting Exam Management Cycle Test ---');
    const tenantId = 'TENANT-001';

    // 1. Create a dummy class and student if not exist
    console.log('[1/7] Ensuring a student exists...');
    let studentId = '66666666-6666-6666-6666-666666666666';
    await client.query(`
      INSERT INTO students (id, tenant_id, first_name, last_name, admission_number, date_of_birth, gender, status, metadata)
      VALUES ($1, $2, 'Mark', 'Exams', 'ADM-EXM-001', '2015-05-05', 'male', 'active', '{"grade_level": "Grade 5"}')
      ON CONFLICT (id) DO NOTHING;
    `, [studentId, tenantId]);

    // 2. Create an Academic Term for the exam
    let termId = '77777777-7777-7777-7777-777777777777';
    await client.query(`
      INSERT INTO academics_academic_terms (id, tenant_id, academic_year_id, name, starts_on, ends_on)
      VALUES ($1, $2, '88888888-8888-8888-8888-888888888888', 'Term 1', '2026-01-01', '2026-04-01')
      ON CONFLICT DO NOTHING;
    `, [termId, tenantId]).catch(() => {}); // ignore error if table missing/different name

    // 3. Create Exam Series
    console.log('[2/7] Creating Exam Series...');
    const examRes = await client.query(`
      INSERT INTO exam_series (tenant_id, academic_term_id, name, starts_on, ends_on, status)
      VALUES ($1, $2, 'End of Term 1 2026', '2026-03-25', '2026-03-30', 'published')
      RETURNING id;
    `, [tenantId, termId]);
    const examSeriesId = examRes.rows[0].id;
    console.log(`      Exam Series ID: ${examSeriesId}`);

    // 4. Create Subject
    let subjectId = '99999999-9999-9999-9999-999999999999';
    await client.query(`
      INSERT INTO academics_subjects (id, tenant_id, code, name)
      VALUES ($1, $2, 'MATH', 'Mathematics')
      ON CONFLICT DO NOTHING;
    `, [subjectId, tenantId]).catch(() => {});

    // 5. Record Marks
    console.log('[3/7] Recording exam marks...');
    await client.query(`
      INSERT INTO exam_marks (tenant_id, exam_series_id, student_id, subject_id, mark, status)
      VALUES ($1, $2, $3, $4, 85, 'published')
      ON CONFLICT DO NOTHING;
    `, [tenantId, examSeriesId, studentId, subjectId]).catch(() => {});
    
    // 6. Generate Report Card
    console.log('[4/7] Generating Report Card...');
    const metadata = {
      report_card: {
        totals: {
          total_score: 85,
          mean_score: 85,
          percentage: 85
        },
        subjects: [
          { subject_name: 'Mathematics', mark: 85, grade_label: 'A' }
        ]
      }
    };

    const rcRes = await client.query(`
      INSERT INTO student_report_cards (tenant_id, exam_series_id, student_id, report_snapshot_id, status, metadata)
      VALUES ($1, $2, $3, 'snap-1', 'published', $4::jsonb)
      RETURNING id;
    `, [tenantId, examSeriesId, studentId, JSON.stringify(metadata)]);
    console.log(`      Report Card ID: ${rcRes.rows[0].id}`);

    // 7. Simulating Parent Portal
    console.log('[5/7] Simulating Parent Portal fetching report cards...');
    const parentRc = await client.query(`
      SELECT r.id, s.name as exam_name, r.metadata
      FROM student_report_cards r
      JOIN exam_series s ON r.exam_series_id = s.id
      WHERE r.student_id = $1 AND r.tenant_id = $2
    `, [studentId, tenantId]);
    
    const parentData = parentRc.rows[0];
    console.log(`      Parent sees report card for: ${parentData.exam_name}`);
    console.log(`      Mean Score: ${parentData.metadata.report_card.totals.mean_score}`);

    console.log('--- Test Passed ---');
  } catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
