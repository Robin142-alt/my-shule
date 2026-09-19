import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { TimetableSchemaService } from '../src/modules/timetable/timetable-schema.service';
import { TimetableWorkflowRepository } from '../src/modules/timetable/repositories/timetable-workflow.repository';

describe('School day configuration persistence', () => {
  let pool: Pool;
  let repository: TimetableWorkflowRepository;
  const actor = randomUUID();
  const types = [
    { id: 'lesson', name: 'Lesson', default_duration_minutes: 40, is_teaching: true },
    { id: 'tea', name: 'Tea Break', default_duration_minutes: 15, is_teaching: false },
  ];
  const makeInput = (tenant = 'school-a') => ({
    tenant_id: tenant, actor_user_id: actor, academic_year: '2026', term_name: 'Term 1',
    school_starts_at: '08:00', period_types: types,
    days: [{ day_of_week: 1, name: 'Monday', is_teaching_day: true, periods: [
      { id: randomUUID(), name: 'Period 1', starts_at: '08:00', ends_at: '08:45', period_type: 'lesson', is_teaching: false },
      { id: randomUUID(), name: 'Tea Break', starts_at: '08:45', ends_at: '09:00', period_type: 'tea', is_teaching: true },
    ] }], common_blocks: [],
  });

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL || 'postgres://invalid/invalid');
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || !url.pathname.slice(1).startsWith('my_shule_disposable_')) throw new Error('Use disposable local PostgreSQL.');
    pool = new Pool({ connectionString: url.toString() });
    await new TimetableSchemaService({ runSchemaBootstrap: async (sql: string) => pool.query(sql) } as never).onModuleInit();
    await pool.query(`CREATE TABLE academic_years (id uuid, tenant_id text, name text, status text, archived_at timestamptz);
      CREATE TABLE academic_terms (id uuid, tenant_id text, academic_year_id uuid, name text, status text, archived_at timestamptz);`);
    for (const tenant of ['school-a', 'school-b']) {
      const year = randomUUID();
      await pool.query(`INSERT INTO academic_years VALUES ($1, $2, '2026', 'active', NULL)`, [year, tenant]);
      await pool.query(`INSERT INTO academic_terms VALUES ($1, $2, $3, 'Term 1', 'active', NULL)`, [randomUUID(), tenant, year]);
    }
    repository = new TimetableWorkflowRepository({
      query: (sql: string, values: unknown[]) => pool.query(sql, values),
      executeWithTenant: async (tenant: string, user: string, callback: (tx: unknown) => Promise<unknown>) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenant]);
          const result = await callback({
            $queryRawUnsafe: async (sql: string, ...values: unknown[]) => (await client.query(sql, values)).rows,
            $executeRawUnsafe: async (sql: string, ...values: unknown[]) => (await client.query(sql, values)).rowCount,
          });
          await client.query('COMMIT'); return result;
        } catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
      },
    } as never);
  }, 30_000);
  afterAll(async () => { await pool?.end(); });
  beforeEach(async () => { await pool.query('TRUNCATE timetable_configurations, timetable_days, timetable_period_definitions, timetable_common_blocks, timetable_teacher_availability, timetable_audit_logs CASCADE'); });

  it('round-trips definitions, start time, custom occurrence duration and authoritative teaching status', async () => {
    const input = makeInput();
    const saved = await repository.saveConfiguration(input);
    expect(saved.period_types).toEqual(types);
    expect(saved.school_starts_at).toBe('08:00');
    expect(saved.days[0].periods.map((period: any) => [period.id, period.ends_at, period.is_teaching])).toEqual([
      [input.days[0].periods[0].id, '08:45', true], [input.days[0].periods[1].id, '09:00', false],
    ]);
    expect((await pool.query(`SELECT action FROM timetable_audit_logs WHERE tenant_id = 'school-a'`)).rows).toEqual([{ action: 'timetable.configuration.updated' }]);
  });

  it('retains availability across saves and reorders instead of deleting every period', async () => {
    const input = makeInput();
    const saved = await repository.saveConfiguration(input);
    await pool.query(`INSERT INTO timetable_teacher_availability
      (tenant_id, academic_year, term_name, teacher_id, day_of_week, period_id, state)
      VALUES ('school-a', '2026', 'Term 1', $1, 1, $2, 'unavailable')`, [actor, input.days[0].periods[0].id]);
    input.days[0].periods.reverse();
    input.days[0].periods[0].starts_at = '08:00'; input.days[0].periods[0].ends_at = '08:15';
    input.days[0].periods[1].starts_at = '08:15'; input.days[0].periods[1].ends_at = '09:00';
    const updated = await repository.saveConfiguration({ ...input, expected_row_version: saved.row_version });
    expect(updated.row_version).toBe(2);
    expect(updated.days[0].periods[0].period_type).toBe('tea');
    expect((await pool.query('SELECT period_id::text FROM timetable_teacher_availability')).rows).toEqual([{ period_id: input.days[0].periods[1].id }]);
  });

  it('keeps schools separate and rolls back attempts to reuse another school period ID', async () => {
    const a = makeInput(); const b = makeInput('school-b');
    await repository.saveConfiguration(a);
    await repository.saveConfiguration(b);
    const loaded = await repository.getConfiguration('school-b', '2026', 'Term 1');
    expect(loaded.days[0].periods[0].id).toBe(b.days[0].periods[0].id);
    a.days[0].periods[0].id = b.days[0].periods[0].id;
    await expect(repository.saveConfiguration({ ...a, expected_row_version: 1 })).rejects.toThrow('does not belong');
    expect((await repository.getConfiguration('school-b', '2026', 'Term 1')).row_version).toBe(1);
    expect((await repository.getConfiguration('school-a', '2026', 'Term 1')).row_version).toBe(1);
    expect(await repository.getConfiguration('school-c', '2026', 'Term 1')).toBeNull();
  });

  it('rejects stale saves, overlaps, unknown types and duplicate types without partial writes', async () => {
    const input = makeInput(); await repository.saveConfiguration(input);
    await expect(repository.saveConfiguration({ ...input, expected_row_version: 9 })).rejects.toThrow('changed since');
    await expect(repository.saveConfiguration({ ...input, period_types: [types[0], types[0]] })).rejects.toThrow('unique');
    const overlap = structuredClone(input); overlap.days[0].periods[1].starts_at = '08:30';
    await expect(repository.saveConfiguration(overlap)).rejects.toThrow('non-overlapping');
    const unknown = structuredClone(input); unknown.days[0].periods[0].period_type = 'missing';
    await expect(repository.saveConfiguration(unknown)).rejects.toThrow('configured period type');
    expect((await repository.getConfiguration('school-a', '2026', 'Term 1')).row_version).toBe(1);
    expect((await pool.query('SELECT count(*)::int AS count FROM timetable_audit_logs')).rows[0].count).toBe(1);
  });

  it('keeps saved definitions for older clients that omit the new fields', async () => {
    const input = makeInput(); await repository.saveConfiguration(input);
    const { period_types, school_starts_at, ...legacy } = input;
    const saved = await repository.saveConfiguration({ ...legacy, expected_row_version: 1 });
    expect(saved.period_types).toEqual(period_types);
    expect(saved.school_starts_at).toBe(school_starts_at);
    expect(saved.days[0].periods[1].is_teaching).toBe(false);
  });

  it('applies row-level security to the catalogue even when a query omits the tenant filter', async () => {
    await repository.saveConfiguration(makeInput());
    await repository.saveConfiguration(makeInput('school-b'));
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('CREATE ROLE timetable_period_test_reader NOLOGIN NOSUPERUSER');
      await client.query('GRANT SELECT ON timetable_configurations TO timetable_period_test_reader');
      await client.query('SET LOCAL ROLE timetable_period_test_reader');
      await client.query(`SELECT set_config('app.tenant_id', 'school-a', true)`);
      const rows = (await client.query('SELECT tenant_id, period_types FROM timetable_configurations')).rows;
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({ tenant_id: 'school-a', period_types: types });
    } finally { await client.query('ROLLBACK'); client.release(); }
  });
});
