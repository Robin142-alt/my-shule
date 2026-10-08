import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { REPORT_COMPARISON_SQL, REPORT_TREND_SQL } from '../src/modules/exams/services/report-card-comparison';

describe('Report comparison chronology and school isolation', () => {
  let pool: Pool;
  const ids = Array.from({ length: 8 }, () => randomUUID());
  const [old, previous, current, future, learner, subject, paper1, paper2] = ids;
  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.includes('disposable')) throw new Error('Use disposable local PostgreSQL');
    pool = new Pool({ connectionString: url.toString(), options: '-c search_path=report_comparison,public' });
    await pool.query(`CREATE SCHEMA report_comparison;
      CREATE TABLE exam_series(tenant_id text,id uuid,name text,starts_on date,created_at timestamptz);
      CREATE TABLE subjects(tenant_id text,id text,name text);
      CREATE TABLE exam_assessments(tenant_id text,id uuid,name text,max_score numeric,weight numeric);
      CREATE TABLE exam_result_snapshots(tenant_id text,exam_series_id uuid,student_id uuid,average_percentage numeric,processed_at timestamptz);
      CREATE TABLE exam_marks(tenant_id text,exam_series_id uuid,student_id uuid,subject_id uuid,assessment_id uuid,
        status text,score_status text,score numeric,updated_at timestamptz DEFAULT '2099-01-01');`);
    for (const tenant of ['school-a', 'school-b']) {
      for (const [index, exam] of [old, previous, current, future].entries()) {
        await pool.query('INSERT INTO exam_series VALUES($1,$2,$3,$4,$5)', [tenant, exam, ['CAT 1', 'Mid Term 3', 'End Term 3', 'Next Exam'][index], ['2026-09-01', '2026-10-01', '2026-10-01', '2026-11-01'][index], `2026-08-0${index + 1}`]);
      }
      await pool.query('INSERT INTO subjects VALUES($1,$2,$3)', [tenant, subject, 'Integrated Science']);
      await pool.query('INSERT INTO exam_assessments VALUES($1,$2,$3,100,25),($1,$4,$5,100,75)', [tenant, paper1, 'Theory', paper2, 'Practical']);
      for (const exam of [old, previous, current, future]) {
        await pool.query("INSERT INTO exam_marks VALUES($1,$2,$3,$4,$5,'locked','entered',$6,DEFAULT),($1,$2,$3,$4,$7,'locked','entered',$8,DEFAULT)", [tenant, exam, learner, subject, paper1, tenant === 'school-a' ? 20 : 100, paper2, tenant === 'school-a' ? 80 : 100]);
      }
    }
  });
  afterAll(async () => { if (pool) { await pool.query('DROP SCHEMA report_comparison CASCADE'); await pool.end(); } });

  it('selects the immediate earlier exam in the same term using exam dates and creation order', async () => {
    const { rows } = await pool.query(REPORT_COMPARISON_SQL, ['school-a', current, learner]);
    expect(rows.map(row => row.label)).toEqual(['Mid Term 3', 'End Term 3']);
    expect(rows.map(row => row.percentage)).toEqual([65, 65]);
    expect(rows.every(row => row.subject_name === 'Integrated Science')).toBe(true);
  });
  it('cannot return another school or learner results', async () => {
    expect((await pool.query(REPORT_COMPARISON_SQL, ['school-b', current, learner])).rows.map(row => row.percentage)).toEqual([100, 100]);
    const missing = (await pool.query(REPORT_COMPARISON_SQL, ['school-a', current, randomUUID()])).rows;
    expect(missing).toHaveLength(1);
    expect(missing[0].exam_series_id).toBe(current);
    expect(missing[0].percentage).toBeNull();
    expect((await pool.query(REPORT_COMPARISON_SQL, ['school-c', current, learner])).rows).toEqual([]);
  });
  it('term trend returns current plus two previous exams, respects processed totals and excludes future exams', async () => {
    await pool.query('INSERT INTO exam_result_snapshots VALUES($1,$2,$3,73,$4),($1,$2,$3,75,$5)', ['school-a', current, learner, '2026-10-01', '2026-10-02']);
    const rows = (await pool.query(REPORT_TREND_SQL, ['school-a', current, learner])).rows;
    expect(rows.map(row => row.label)).toEqual(['End Term 3', 'Mid Term 3', 'CAT 1']);
    expect(rows.map(row => row.percentage)).toEqual([75, 65, 65]);
    expect((await pool.query(REPORT_TREND_SQL, ['school-b', current, learner])).rows.map(row => row.percentage)).toEqual([100, 100, 100]);
    expect((await pool.query(REPORT_TREND_SQL, ['school-a', old, learner])).rows.map(row => row.label)).toEqual(['CAT 1']);
  });
  it('first exam has no invented predecessor and incomplete components are not averaged as complete', async () => {
    const first = (await pool.query(REPORT_COMPARISON_SQL, ['school-a', old, learner])).rows;
    expect(first).toHaveLength(1);
    expect(first[0].label).toBe('CAT 1');
    await pool.query("UPDATE exam_marks SET score_status='absent',score=NULL WHERE tenant_id='school-a' AND exam_series_id=$1 AND assessment_id=$2", [previous, paper1]);
    const rows = (await pool.query(REPORT_COMPARISON_SQL, ['school-a', current, learner])).rows;
    expect(rows[0].percentage).toBeNull();
    expect(rows[1].percentage).toBe(65);
    await pool.query("UPDATE exam_marks SET score_status='absent',score=NULL WHERE tenant_id='school-a' AND exam_series_id=$1", [previous]);
    const absent = (await pool.query(REPORT_COMPARISON_SQL, ['school-a', current, learner])).rows;
    expect(absent.map(row => row.label)).toEqual(['Mid Term 3', 'End Term 3']);
    expect(absent[0].percentage).toBeNull();
  });
});
