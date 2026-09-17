import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';

/** Real PostgreSQL checks: legacy backfill, ongoing writes, RLS and idempotency. */
export async function verifySidebarRecords(pool: Pool, migration: string) {
  const actor = randomUUID();
  await pool.query(`INSERT INTO users (id, full_name, display_name, email, password_hash)
    VALUES ($1, 'Sidebar test teacher', 'Sidebar test teacher', 'sidebar-test@example.invalid', 'test-only')`, [actor]);
  for (const suffix of ['a', 'b']) {
    const tenant = `sidebar-record-school-${suffix}`;
    await pool.query(`INSERT INTO tenants (tenant_id, subdomain, name) VALUES ($1, $1, $1)`, [tenant]);
    await pool.query(`INSERT INTO schools (id,school_code,name,slug,school_type,ownership_type,curriculum_mode,status,created_by_user_id,updated_at)
      VALUES ($1,$1,$1,$2,enum_first(NULL::"SchoolType"),enum_first(NULL::"OwnershipType"),
      enum_first(NULL::"CurriculumMode"),enum_first(NULL::"SchoolStatus"),$3,NOW())`, [`legacy-${tenant}`, tenant, actor]);
    // This insert uses only the original Prisma fields, before the repair runs.
    await pool.query(`INSERT INTO academics_assignments
      (id,school_id,title,subject_id,teacher_user_id,updated_at)
      VALUES ($1,$2,'Existing homework','subject-a',$3,NOW())`, [`legacy-assignment-${suffix}`, `legacy-${tenant}`, actor]);
    await pool.query(`INSERT INTO academics_lesson_logs
      (id,school_id,topic,date,subject_id,teacher_user_id,updated_at)
      VALUES ($1,$2,'Existing lesson',CURRENT_DATE,'subject-a',$3,NOW())`, [`legacy-log-${suffix}`, `legacy-${tenant}`, actor]);
  }
  await pool.query(migration);
  await pool.query(migration);
  const assignments = await pool.query(`SELECT id,tenant_id,teacher_id FROM academics_assignments ORDER BY id`);
  assert.equal(assignments.rowCount, 2);
  assert.equal(assignments.rows[0].tenant_id, 'sidebar-record-school-a');
  assert.equal(assignments.rows[0].teacher_id, actor);
  assert.equal((await pool.query(`SELECT covered_topics FROM academics_lesson_logs WHERE id='legacy-log-a'`)).rows[0].covered_topics, 'Existing lesson');
  await pool.query(`INSERT INTO inventory_categories (id,school_id,tenant_id,name,type)
    VALUES ('sidebar-category','legacy-sidebar-record-school-a','sidebar-record-school-a','Books',enum_first(NULL::"InventoryCategoryType"))`);
  assert.equal((await pool.query(`SELECT category_name FROM inventory_categories WHERE id='sidebar-category'`)).rows[0].category_name, 'Books');
  await pool.query(`UPDATE inventory_categories SET name='Stationery' WHERE id='sidebar-category'`);
  assert.equal((await pool.query(`SELECT category_name FROM inventory_categories WHERE id='sidebar-category'`)).rows[0].category_name, 'Stationery');
  await pool.query(`UPDATE inventory_categories SET category_name='Teaching supplies' WHERE id='sidebar-category'`);
  assert.equal((await pool.query(`SELECT name FROM inventory_categories WHERE id='sidebar-category'`)).rows[0].name, 'Teaching supplies');
  const views = await pool.query(`SELECT relname, reloptions FROM pg_class
    WHERE relname IN ('student_attendance_logs','timetable_lessons','lesson_substitutions')`);
  assert.equal(views.rowCount, 3);
  for (const view of views.rows) assert.ok(view.reloptions.includes('security_invoker=true'));

  await pool.query(`CREATE ROLE sidebar_read_test NOSUPERUSER NOBYPASSRLS;
    GRANT USAGE ON SCHEMA public TO sidebar_read_test;
    GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO sidebar_read_test;`);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE sidebar_read_test');
    await client.query('SET LOCAL row_security TO on');
    await client.query("SELECT set_config('app.tenant_id', 'sidebar-record-school-a', true)");
    assert.equal((await client.query('SELECT * FROM academics_assignments')).rowCount, 1);
    assert.equal((await client.query("SELECT * FROM academics_assignments WHERE tenant_id='sidebar-record-school-b'")).rowCount, 0);
    const created = await client.query(`INSERT INTO academics_assignments
      (tenant_id,title,subject_id,teacher_id,class_id)
      VALUES ('sidebar-record-school-a','New homework','subject-a',$1,'new-canonical-class') RETURNING *`, [actor]);
    assert.equal(created.rows[0].school_id, 'legacy-sidebar-record-school-a');
    assert.equal(created.rows[0].teacher_user_id, actor);
    assert.equal(created.rows[0].class_id, 'new-canonical-class');
    assert.ok(created.rows[0].id);
    await client.query(`UPDATE academics_lesson_logs SET topic='Updated lesson' WHERE id='legacy-log-a'`);
    assert.equal((await client.query(`SELECT covered_topics FROM academics_lesson_logs WHERE id='legacy-log-a'`)).rows[0].covered_topics, 'Updated lesson');
    await client.query('SAVEPOINT cross_school_write');
    await assert.rejects(client.query(`INSERT INTO academics_assignments
      (tenant_id,title,subject_id,teacher_id) VALUES ('sidebar-record-school-b','Foreign homework','subject-a',$1)`, [actor]),
      (error: any) => ['23514', '42501'].includes(error.code));
    await client.query('ROLLBACK TO SAVEPOINT cross_school_write');
    await client.query('SAVEPOINT mismatched_school');
    await assert.rejects(client.query(`INSERT INTO academics_assignments
      (tenant_id,school_id,title,subject_id,teacher_id) VALUES
      ('sidebar-record-school-a','legacy-sidebar-record-school-b','Mismatched homework','subject-a',$1)`, [actor]),
      (error: any) => error.code === '23514');
    await client.query('ROLLBACK TO SAVEPOINT mismatched_school');
    await client.query(`INSERT INTO boarding_hostels (tenant_id,hostel_name,capacity,gender_allowed)
      VALUES ('sidebar-record-school-a','Test hostel',20,'mixed')`);
    await client.query("SELECT set_config('app.tenant_id', 'sidebar-record-school-b', true)");
    assert.equal((await client.query('SELECT * FROM boarding_hostels')).rowCount, 0);
    assert.equal((await client.query('SELECT * FROM academics_assignments')).rowCount, 1);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
  const tenantId = 'sidebar-record-school-a';
  const classId = randomUUID();
  await pool.query(`INSERT INTO academic_years
    (id,tenant_id,name,start_date,end_date,starts_on,ends_on,status)
    VALUES ('sidebar-year',$1,'Sidebar year',CURRENT_DATE-30,CURRENT_DATE+300,CURRENT_DATE-30,CURRENT_DATE+300,'active')`, [tenantId]);
  await pool.query(`INSERT INTO class_sections (id,tenant_id,academic_year_id,name,grade_level)
    VALUES ($1,$2,'sidebar-year','Sidebar class','8')`, [classId, tenantId]);
  await pool.query(`INSERT INTO academics_class_teachers (tenant_id,academic_year_id,class_section_id,teacher_user_id)
    VALUES ($1,'sidebar-year',$2,$3)`, [tenantId, classId, actor]);
  console.log('PASS legacy data, canonical writes, migration rerun, and cross-school read/write isolation');
  return { tenantId, userId: actor, classId };
}
