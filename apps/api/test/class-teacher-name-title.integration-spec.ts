import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { ClassTeacherService } from '../src/modules/class-teacher/class-teacher.service';
import { STAFF_NAME_TITLE_SCHEMA_SQL } from '../src/modules/hr/staff-name-title';

describe('Class teacher name titles', () => {
  let pool: Pool;
  let service: ClassTeacherService;
  const teacher = randomUUID();
  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.includes('disposable')) throw new Error('Use disposable local PostgreSQL');
    pool = new Pool({ connectionString: url.toString(), options: '-c search_path=staff_title_test,public' });
    await pool.query(`CREATE SCHEMA staff_title_test;
      CREATE TABLE staff_profiles(id uuid DEFAULT gen_random_uuid(),tenant_id text,user_id uuid,display_name text,updated_at timestamptz);
      CREATE TABLE staff_audit_logs(id uuid DEFAULT gen_random_uuid(),tenant_id text,staff_profile_id uuid,actor_user_id uuid,action text,metadata jsonb);
      CREATE TABLE workflow_events(id uuid DEFAULT gen_random_uuid(),tenant_id text,source_user_id uuid,entity_id text,event_type text,entity_type text,title text,message text,payload jsonb,status text,priority text,target_roles jsonb,created_at timestamptz DEFAULT now());
      ${STAFF_NAME_TITLE_SCHEMA_SQL}`);
    service = new ClassTeacherService({ query: async (sql: string, params: unknown[]) => {
      if (sql.includes('class_appointments') || sql.includes('FROM teacher_subject_assignments')) return { rows: [{ id: 'active-appointment' }], rowCount: 1 };
      return pool.query(sql, params);
    } } as never, {} as never);
  });
  beforeEach(async () => {
    await pool.query('TRUNCATE staff_profiles,staff_audit_logs,workflow_events');
    await pool.query('INSERT INTO staff_profiles(tenant_id,user_id,display_name) VALUES($1,$2,$3),($4,$2,$5)', ['school-a', teacher, 'Ms. Amani Wanjiku', 'school-b', 'Other School Name']);
  });
  afterAll(async () => { if (pool) { await pool.query('DROP SCHEMA staff_title_test CASCADE'); await pool.end(); } });
  const save = (nameTitle: string) => service.saveSettings('school-a', teacher, 'class-a', { nameTitle, notificationsEnabled: true, defaultView: 'Overview' });

  it('persists the selected title, returns it after reload and isolates the school profile', async () => {
    await save('Mrs.');
    const loaded = await service.getSettings('school-a', teacher, 'class-a');
    expect(loaded).toMatchObject({ nameTitle: 'Mrs.', displayName: 'Mrs. Amani Wanjiku' });
    expect((await pool.query("SELECT display_name FROM staff_profiles WHERE tenant_id='school-b'")).rows[0].display_name).toBe('Other School Name');
    expect((await pool.query('SELECT action FROM staff_audit_logs')).rows).toEqual([{ action: 'staff.name_title.updated' }]);
    expect((await pool.query('SELECT event_type FROM workflow_events')).rows).toEqual([{ event_type: 'class_teacher.settings_saved' }]);
  });
  it('replacing, clearing and editing a staff name never duplicates or loses the chosen title', async () => {
    await save('Mr.');
    await save('Dr.');
    await pool.query("UPDATE staff_profiles SET display_name='Amani Updated' WHERE tenant_id='school-a'");
    expect((await service.getSettings('school-a', teacher, 'class-a')).displayName).toBe('Dr. Amani Updated');
    await save('');
    expect((await service.getSettings('school-a', teacher, 'class-a')).displayName).toBe('Amani Updated');
  });
  it('rolls back profile and audit changes when the workflow event cannot be persisted', async () => {
    await pool.query("ALTER TABLE workflow_events ADD CONSTRAINT injected_failure CHECK(event_type <> 'class_teacher.settings_saved') NOT VALID");
    try {
      await expect(save('Miss')).rejects.toThrow('injected_failure');
      expect((await pool.query("SELECT display_name FROM staff_profiles WHERE tenant_id='school-a'")).rows[0].display_name).toBe('Ms. Amani Wanjiku');
      expect((await pool.query('SELECT * FROM staff_audit_logs')).rows).toHaveLength(0);
    } finally { await pool.query('ALTER TABLE workflow_events DROP CONSTRAINT injected_failure'); }
  });
});
