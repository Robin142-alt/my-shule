import 'reflect-metadata';
import { TimetableSchemaService } from '../src/modules/timetable/timetable-schema.service';
import { TimetableWorkflowRepository } from '../src/modules/timetable/repositories/timetable-workflow.repository';
import { StudentProgressionFixture } from './support/student-progression-fixture';

jest.setTimeout(120_000);

describe('Independent term timetable publication in PostgreSQL', () => {
  const fixture = new StudentProgressionFixture();
  let repository: TimetableWorkflowRepository;
  beforeAll(async () => {
    await fixture.start();
    await new TimetableSchemaService({ runSchemaBootstrap: (sql: string) => fixture.pool.query(sql) } as never).onModuleInit();
    await fixture.q('ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS staff_number text');
    await fixture.pool.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO "${fixture.runtimeRole}";
      GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO "${fixture.runtimeRole}";`);
    repository = new TimetableWorkflowRepository({
      ...fixture.prisma,
      query: async (sql: string, values: unknown[]) => fixture.transaction(String(values[0]), async tx => {
        const rows = await tx.$queryRawUnsafe(sql, ...values);
        return { rows, rowCount: rows.length };
      }),
    } as never);
  });
  beforeEach(async () => {
    await fixture.reset();
    for (const tenant of [fixture.school, fixture.foreignSchool]) {
      await fixture.q(`UPDATE academic_years SET starts_on=CURRENT_DATE-100,ends_on=CURRENT_DATE+100
        WHERE tenant_id=$1 AND id=$2`, [tenant, `${tenant}-2026`]);
      await fixture.q(`UPDATE academic_terms SET starts_on=CURRENT_DATE-100,ends_on=CURRENT_DATE-1,status='closed',is_current=FALSE
        WHERE tenant_id=$1 AND academic_year_id=$2`, [tenant, `${tenant}-2026`]);
      await fixture.q(`INSERT INTO academic_terms(tenant_id,academic_year_id,name,starts_on,ends_on,status,is_current)
        VALUES($1,$2,'Term 2',CURRENT_DATE,CURRENT_DATE+60,'active',TRUE)`, [tenant, `${tenant}-2026`]);
    }
  });
  afterAll(() => fixture.close());
  async function version(term: string, status: 'draft' | 'published', tenant = fixture.school) {
    const [result] = await fixture.q(`INSERT INTO timetable_versions(tenant_id,academic_year,term_name,status,immutable,published_at)
      VALUES($1,'2026',$2,$3,$4,CASE WHEN $3='published' THEN NOW() ELSE NULL END) RETURNING *`,
    [tenant, term, status, status === 'published']);
    return result;
  }

  it('does not substitute the last term’s published timetable when the current term has only a draft', async () => {
    const previous = await version('Term 1', 'published');
    await version('Term 2', 'draft');

    expect(await repository.resolveCurrentPublishedAcademicScope(fixture.school)).toBeNull();
    // Explicit historical selection is still possible and does not mutate the record.
    expect(await repository.getVersion(fixture.school, previous.id)).toMatchObject({ id: previous.id, term_name: 'Term 1', status: 'published' });
    expect((await fixture.q('SELECT * FROM timetable_versions WHERE id=$1', [previous.id]))[0]).toEqual(previous);
  });

  it('publishes a term’s independent draft while preserving previous-term history and immutable source lessons', async () => {
    const previous = await version('Term 1', 'published');
    const draft = await version('Term 2', 'draft');
    for (const current of [previous, draft]) {
      await fixture.q(`INSERT INTO timetable_slots(tenant_id,version_id,academic_year,term_name,class_section_id,
        subject_id,teacher_id,day_of_week,starts_at,ends_at,status)
        VALUES($1,$2,'2026',$3,$4,$5,$6,1,'08:00','08:40',$7)`,
      [fixture.school, current.id, current.term_name, fixture.classId(7), `${fixture.school}-math`, fixture.teacher, current.status]);
    }
    const oldLessons = await fixture.q('SELECT * FROM timetable_slots WHERE tenant_id=$1 AND version_id=$2 ORDER BY id', [fixture.school, previous.id]);

    const result = await repository.publishVersionAtomic({ tenant_id: fixture.school, academic_year: '2026', term_name: 'Term 2',
      expected_row_version: draft.row_version, configuration_snapshot: { term: 'Term 2' }, validation_summary: { hard_conflicts: [] }, actor_user_id: fixture.user });

    expect(result).toMatchObject({ id: draft.id, status: 'published', immutable: true, term_name: 'Term 2' });
    expect(await repository.resolveCurrentPublishedAcademicScope(fixture.school)).toEqual({ academic_year: '2026', term_name: 'Term 2', version_id: draft.id });
    expect((await fixture.q('SELECT * FROM timetable_versions WHERE id=$1', [previous.id]))[0]).toEqual(previous);
    expect(await fixture.q('SELECT * FROM timetable_slots WHERE tenant_id=$1 AND version_id=$2 ORDER BY id', [fixture.school, previous.id])).toEqual(oldLessons);
    await expect(repository.publishVersionAtomic({ tenant_id: fixture.school, academic_year: '2026', term_name: 'Term 2',
      expected_row_version: draft.row_version, configuration_snapshot: {}, validation_summary: {}, actor_user_id: fixture.user })).rejects.toThrow();
    expect(await fixture.q("SELECT id FROM timetable_versions WHERE tenant_id=$1 AND academic_year='2026' AND term_name='Term 2' AND status='published'", [fixture.school])).toHaveLength(1);
  });

  it('does not choose a foreign school, unmatched calendar, archived term or future term as the current timetable', async () => {
    const foreign = await version('Term 2', 'published', fixture.foreignSchool);
    await version('Legacy unknown term', 'published');
    await fixture.q(`INSERT INTO academic_terms(tenant_id,academic_year_id,name,starts_on,ends_on,status)
      VALUES($1,$2,'Term 3',CURRENT_DATE+61,CURRENT_DATE+100,'active')`, [fixture.school, `${fixture.school}-2026`]);
    await version('Term 3', 'published');
    const current = await version('Term 2', 'published');
    await fixture.q("UPDATE academic_terms SET archived_at=NOW() WHERE tenant_id=$1 AND name='Term 2'", [fixture.school]);

    expect(await repository.resolveCurrentPublishedAcademicScope(fixture.school)).toBeNull();
    expect(await repository.getVersion(fixture.school, foreign.id)).toBeNull();
    expect(await repository.getVersion(fixture.school, current.id)).toMatchObject({ id: current.id, status: 'published' });
  });

  it('keeps an unmatched legacy timetable out of automatic staff portal reads while allowing explicit history', async () => {
    await fixture.q(`INSERT INTO staff_profiles(tenant_id,user_id,display_name,staff_number)
      VALUES($1,$2,'Teacher','T-1')`, [fixture.school, fixture.teacher]);
    const legacy = await version('Legacy unknown term', 'published');
    const input = { tenant_id: fixture.school, user_id: fixture.teacher, role: 'teacher' };

    expect(await repository.listPortalSchedule(input)).toMatchObject({ version: null, items: [] });
    expect(await repository.listPortalSchedule({ ...input, version_id: legacy.id }))
      .toMatchObject({ version: { id: legacy.id, status: 'published' }, items: [] });
  });
});
