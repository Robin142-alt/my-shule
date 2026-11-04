import 'reflect-metadata';
import { ProgressionEngine } from '../src/modules/student-progression/student-progression.service';
import { ensureCohortContexts } from '../src/modules/academics/cohort-configuration';
import { writeCohortSubjects, writeCohortTeacher } from '../src/modules/academics/cohort-assignment-writes';
import { AcademicsRepository } from '../src/modules/academics/repositories/academics.repository';
import { StudentProgressionFixture } from './support/student-progression-fixture';

jest.setTimeout(120_000);

describe('Complete academic-year structure continuation in PostgreSQL', () => {
  const fixture = new StudentProgressionFixture();
  let engine: ProgressionEngine;
  beforeAll(async () => {
    await fixture.start();
    engine = new ProgressionEngine(fixture.prisma as never, fixture.events as never);
  });
  beforeEach(() => fixture.reset());
  afterAll(() => fixture.close());
  const year = (value = 2027, tenant = fixture.school) => `${tenant}-${value}`;
  const actor = () => fixture.actor();
  // Load at invocation so the existing calendar path independently reproduces
  // the missing-class defect before the new structure helper is introduced.
  const prepare = (target = year(), tenant = fixture.school) => fixture.transaction(tenant, async tx => {
    const { prepareAcademicYearStructure } = require('../src/modules/student-progression/academic-year-structure');
    return prepareAcademicYearStructure(tx, fixture.actor(tenant), target);
  });
  const classes = (value = 2027, tenant = fixture.school) => fixture.q(
    'SELECT * FROM class_sections WHERE tenant_id=$1 AND academic_year_id=$2 ORDER BY curriculum_model,name,id',
    [tenant, year(value, tenant)],
  );
  const streams = (value = 2027, tenant = fixture.school) => fixture.q(`SELECT stream.* FROM class_streams stream
    JOIN class_sections section ON section.tenant_id=stream.tenant_id AND section.id=stream.class_section_id
    WHERE section.tenant_id=$1 AND section.academic_year_id=$2 ORDER BY section.curriculum_model,section.name,stream.name,stream.id`,
  [tenant, year(value, tenant)]);
  const subjects = (value = 2027) => fixture.q(`SELECT assignment.*,section.name AS class_name,stream.name AS stream_name
    FROM class_subject_assignments assignment JOIN class_sections section
      ON section.tenant_id=assignment.tenant_id AND section.id=assignment.class_section_id
    LEFT JOIN class_streams stream ON stream.tenant_id=assignment.tenant_id AND stream.id=assignment.stream_id
    WHERE section.tenant_id=$1 AND section.academic_year_id=$2 ORDER BY section.name,stream.name,assignment.subject_id,assignment.id`,
  [fixture.school, year(value)]);
  const teachers = (value = 2027) => fixture.q(`SELECT assignment.*,section.name AS class_name,stream.name AS stream_name
    FROM teacher_subject_assignments assignment JOIN class_sections section
      ON section.tenant_id=assignment.tenant_id AND section.id=assignment.class_section_id
    LEFT JOIN class_streams stream ON stream.tenant_id=assignment.tenant_id AND stream.id=assignment.stream_id
    WHERE section.tenant_id=$1 AND section.academic_year_id=$2 ORDER BY section.name,stream.name,assignment.subject_id,assignment.id`,
  [fixture.school, year(value)]);
  const appointments = (value = 2027) => fixture.q(
    'SELECT * FROM academics_role_appointments WHERE tenant_id=$1 AND academic_year_id=$2 ORDER BY id',
    [fixture.school, year(value)],
  );
  const classTeachers = (value = 2027) => fixture.q(
    'SELECT * FROM academics_class_teachers WHERE tenant_id=$1 AND academic_year_id=$2 ORDER BY id',
    [fixture.school, year(value)],
  );
  async function seedAppointments(value = 2026, teacher = fixture.teacher) {
    const classId = fixture.classId(7, 'CBC', value);
    await fixture.q(`INSERT INTO academics_class_teachers(tenant_id,school_id,academic_year_id,class_section_id,teacher_user_id,
      status,is_active,effective_from,assignment_type,reason) VALUES($1,$1,$2,$3,$4,'active',TRUE,$5::date,'primary','Class responsibility')`,
    [fixture.school, year(value), classId, teacher, `${value}-01-01`]);
    await fixture.q(`INSERT INTO academics_role_appointments(tenant_id,school_id,academic_year_id,class_section_id,stream_id,
      role_type,teacher_user_id,effective_from,appointed_by_user_id,reason)
      VALUES($1,$1,$2,$3,$4,'grade_master',$5,$6::date,$7,'Grade responsibility')`,
    [fixture.school, year(value), classId, fixture.streamId(7, 'East', 'CBC', value), teacher, `${value}-01-01`, fixture.user]);
  }

  it('creates the new academic year together with its reusable classes and teaching associations', async () => {
    await fixture.configureClass(7, 'East', 'CBC', 2026, fixture.school, fixture.teacher);
    await seedAppointments();
    await fixture.q('DELETE FROM academic_years WHERE tenant_id=$1 AND id=$2', [fixture.school, year()]);
    const repository = new AcademicsRepository(fixture.prisma as never);

    const created = await repository.createAcademicYear({ tenant_id: fixture.school, name: '2027', starts_on: '2027-01-01',
      ends_on: '2027-12-31', is_current: false, created_by_user_id: fixture.user });

    expect(created).toMatchObject({ name: '2027', status: 'draft', is_current: false });
    const copied = await fixture.q('SELECT * FROM class_sections WHERE tenant_id=$1 AND academic_year_id=$2', [fixture.school, created.id]);
    expect(copied).toHaveLength((await classes(2026)).length);
    const target = copied.find(row => row.name === 'Grade 7' && row.curriculum_model === 'CBC');
    expect(await fixture.q("SELECT teacher_user_id FROM academics_class_teachers WHERE tenant_id=$1 AND class_section_id=$2 AND is_active", [fixture.school, target.id]))
      .toEqual([{ teacher_user_id: fixture.teacher }]);
    expect(await fixture.q("SELECT teacher_user_id FROM teacher_subject_assignments WHERE tenant_id=$1 AND class_section_id=$2 AND status='active'", [fixture.school, target.id]))
      .toEqual([{ teacher_user_id: fixture.teacher }]);
  });

  it('retries an initially empty school structure after the school configures its first classes', async () => {
    await fixture.q('DELETE FROM class_streams WHERE tenant_id=$1', [fixture.school]);
    await fixture.q('DELETE FROM class_sections WHERE tenant_id=$1', [fixture.school]);
    const now = new Date('2026-11-03T09:00:00Z');
    await engine.synchronizeCalendar(actor(), now);
    expect(await classes()).toEqual([]);
    await fixture.addClass(fixture.school, 2026, 7);
    await fixture.configureClass(7, 'East', 'CBC', 2026, fixture.school, fixture.teacher);

    await engine.synchronizeCalendar(actor(), now);

    expect(await classes()).toEqual([expect.objectContaining({ name: 'Grade 7', curriculum_model: 'CBC' })]);
    expect((await subjects()).filter(row => row.status === 'active')).toHaveLength(3);
  });

  it('prepares all configured classes and attached teaching structures before annual promotion is due', async () => {
    const student = await fixture.seed(7, 'East');
    await fixture.configureClass(7, 'West', 'CBC', 2026, fixture.school, fixture.teacher);
    await fixture.configureClass(2, 'East', '8-4-4', 2026, fixture.school, fixture.otherTeacher);
    await seedAppointments();
    await fixture.q("UPDATE class_sections SET code='G7',custom_label='Year Seven' WHERE tenant_id=$1 AND id=$2",
      [fixture.school, fixture.classId(7)]);
    await fixture.q(`UPDATE class_streams SET code='G7-E',class_teacher_id=$3,stream_teacher_user_id=$4
      WHERE tenant_id=$1 AND id=$2`, [fixture.school, fixture.streamId(7), fixture.teacher, fixture.otherTeacher]);
    await fixture.q(`UPDATE class_subject_assignments SET lessons_per_week=6,metadata='{"assessment":"school policy"}'
      WHERE tenant_id=$1 AND class_section_id=$2 AND subject_id=$3`, [fixture.school, fixture.classId(7), `${fixture.school}-math`]);
    await fixture.q(`UPDATE teacher_subject_assignments SET mark_entry_allowed=FALSE,report_comment_allowed=FALSE
      WHERE tenant_id=$1 AND class_section_id=$2 AND stream_id=$3`, [fixture.school, fixture.classId(7), fixture.streamId(7)]);
    const [department] = await fixture.q(`INSERT INTO academics_departments(tenant_id,name,head_of_department_user_id)
      VALUES($1,'Languages',$2) RETURNING *`, [fixture.school, fixture.otherTeacher]);
    await fixture.q(`INSERT INTO academics_department_hod_appointments(tenant_id,school_id,department_id,teacher_user_id,effective_from)
      VALUES($1,$1,$2,$3,'2026-01-01')`, [fixture.school, department.id, fixture.otherTeacher]);
    await fixture.q(`INSERT INTO academics_curriculum_configurations(tenant_id,school_id,name,curriculum_model,configuration,effective_from,status)
      VALUES($1,$1,'CBC structure','CBC','{"progression":{"terminal":"Grade 12"}}','2026-01-01','active')`, [fixture.school]);
    await fixture.q(`INSERT INTO academic_timetable_slots(tenant_id,class_section_id,day_of_week,starts_at,ends_at,subject_name)
      VALUES($1,$2,'Monday','08:00','08:40','math')`, [fixture.school, fixture.classId(7)]);
    const before = { classes: await classes(2026), streams: await streams(2026), subjects: await subjects(2026),
      teachers: await teachers(2026), classTeachers: await classTeachers(2026), appointments: await appointments(2026),
      records: await fixture.relatedRecords(student.id), timetable: await fixture.q('SELECT * FROM academic_timetable_slots ORDER BY id'),
      curriculum: await fixture.q('SELECT * FROM academics_curriculum_configurations ORDER BY id'),
      departmentHeads: await fixture.q('SELECT * FROM academics_department_hod_appointments ORDER BY id') };

    await engine.synchronizeCalendar(actor(), new Date('2026-11-03T09:00:00Z'));

    expect((await classes()).map(row => [row.name, row.curriculum_model, row.grade_level, row.capacity, row.code, row.custom_label, row.academic_level_id]))
      .toEqual(before.classes.map(row => [row.name, row.curriculum_model, row.grade_level, row.capacity, row.code, row.custom_label, row.academic_level_id]));
    expect((await streams()).map(row => [row.name, row.capacity, row.code, row.class_teacher_id, row.stream_teacher_user_id]))
      .toEqual(before.streams.map(row => [row.name, row.capacity, row.code, row.class_teacher_id, row.stream_teacher_user_id]));
    expect((await subjects()).map(row => [row.class_name, row.stream_name, row.subject_id, row.is_compulsory, row.lessons_per_week, row.metadata]))
      .toEqual(before.subjects.map(row => [row.class_name, row.stream_name, row.subject_id, row.is_compulsory, row.lessons_per_week, row.metadata]));
    expect((await teachers()).map(row => [row.class_name, row.stream_name, row.subject_id, row.teacher_user_id, row.mark_entry_allowed, row.lesson_record_allowed, row.report_comment_allowed]))
      .toEqual(before.teachers.map(row => [row.class_name, row.stream_name, row.subject_id, row.teacher_user_id, row.mark_entry_allowed, row.lesson_record_allowed, row.report_comment_allowed]));
    const [nextClass] = (await classes()).filter(row => row.name === 'Grade 7' && row.curriculum_model === 'CBC');
    const [nextStream] = (await streams()).filter(row => row.class_section_id === nextClass.id && row.name === 'East');
    expect(await classTeachers()).toEqual([expect.objectContaining({ class_section_id: nextClass.id, teacher_user_id: fixture.teacher })]);
    expect(await appointments()).toEqual([expect.objectContaining({ class_section_id: nextClass.id, stream_id: nextStream.id,
      role_type: 'grade_master', teacher_user_id: fixture.teacher })]);
    expect(await classes(2026)).toEqual(before.classes);
    expect(await streams(2026)).toEqual(before.streams);
    expect(await subjects(2026)).toEqual(before.subjects);
    expect(await teachers(2026)).toEqual(before.teachers);
    expect(await classTeachers(2026)).toEqual(before.classTeachers);
    expect(await appointments(2026)).toEqual(before.appointments);
    expect(await fixture.q('SELECT * FROM academics_departments WHERE tenant_id=$1', [fixture.school])).toEqual([department]);
    expect(await fixture.q('SELECT * FROM academics_curriculum_configurations ORDER BY id')).toEqual(before.curriculum);
    expect(await fixture.q('SELECT * FROM academics_department_hod_appointments ORDER BY id')).toEqual(before.departmentHeads);
    expect(await fixture.relatedRecords(student.id)).toEqual(before.records);
    expect(await fixture.q('SELECT * FROM academic_timetable_slots ORDER BY id')).toEqual(before.timetable);
    expect(await fixture.q('SELECT id FROM student_academic_enrollments WHERE tenant_id=$1 AND academic_year_id=$2', [fixture.school, year()])).toEqual([]);
    expect(await fixture.q('SELECT id FROM academic_student_transitions WHERE tenant_id=$1', [fixture.school])).toEqual([]);
  });

  it('fills missing mappings independently while preserving explicit next-year teacher and subject overrides', async () => {
    await fixture.configureClass(7, 'East', 'CBC', 2026, fixture.school, fixture.teacher);
    await fixture.configureClass(7, 'West', 'CBC', 2026, fixture.school, fixture.teacher);
    await seedAppointments();
    const targetClass = await fixture.addClass(fixture.school, 2027, 7);
    const targetStream = fixture.streamId(7, 'East', 'CBC', 2027);
    await fixture.transaction(fixture.school, async tx => {
      await ensureCohortContexts(tx, fixture.school, targetClass, targetStream);
      await writeCohortSubjects(tx, fixture.school, { class_section_id: targetClass, stream_id: targetStream,
        subject_ids: [`${fixture.school}-math`, `${fixture.school}-art`], is_compulsory: false, actor_user_id: fixture.user });
      await writeCohortTeacher(tx, fixture.school, { class_section_id: targetClass, stream_id: targetStream,
        subject_id: `${fixture.school}-math`, teacher_user_id: fixture.otherTeacher, created_by_user_id: fixture.user,
        effective_from: '2027-01-01' });
    });
    await fixture.q(`UPDATE class_subject_assignments SET lessons_per_week=7,metadata='{"school_override":true}'
      WHERE tenant_id=$1 AND class_section_id=$2 AND subject_id=$3`, [fixture.school, targetClass, `${fixture.school}-math`]);
    await fixture.q(`UPDATE class_subject_assignments SET status='archived',archived_at=NOW()
      WHERE tenant_id=$1 AND class_section_id=$2 AND subject_id=$3`, [fixture.school, targetClass, `${fixture.school}-art`]);
    await seedAppointments(2027, fixture.otherTeacher);
    const before = { subjects: await subjects(), teachers: await teachers(), classTeachers: await classTeachers(), appointments: await appointments() };

    await prepare();

    const allSubjects = await subjects();
    for (const original of before.subjects) expect(allSubjects.find(row => row.id === original.id)).toEqual(original);
    expect(allSubjects.filter(row => row.class_section_id === targetClass && row.stream_id === targetStream && row.status === 'active')
      .map(row => row.subject_id).sort()).toEqual([`${fixture.school}-english`, `${fixture.school}-math`]);
    expect(allSubjects.filter(row => row.class_section_id === targetClass && row.stream_name === 'West' && row.status === 'active')).toHaveLength(3);
    for (const original of before.teachers) expect((await teachers()).find(row => row.id === original.id)).toEqual(original);
    expect((await teachers()).filter(row => row.class_section_id === targetClass && row.stream_id === targetStream && row.status === 'active'))
      .toEqual([expect.objectContaining({ teacher_user_id: fixture.otherTeacher })]);
    expect(await classTeachers()).toEqual(before.classTeachers);
    expect(await appointments()).toEqual(before.appointments);
  });

  it('copies missing class teachers even when destination subjects are already configured', async () => {
    await fixture.configureClass(7, 'East', 'CBC', 2026, fixture.school, fixture.teacher);
    await seedAppointments();
    await fixture.addClass(fixture.school, 2027, 7);
    await fixture.configureClass(7, 'East', 'CBC', 2027, fixture.school, fixture.otherTeacher);

    await prepare();

    expect(await classTeachers()).toEqual([expect.objectContaining({ teacher_user_id: fixture.teacher,
      class_section_id: fixture.classId(7, 'CBC', 2027) })]);
    expect(await appointments()).toEqual([expect.objectContaining({ teacher_user_id: fixture.teacher, role_type: 'grade_master' })]);
  });

  it('is safe to repeat and run concurrently, and the following year reuses identities without sharing editable associations', async () => {
    await fixture.configureClass(7, 'East', 'CBC', 2026, fixture.school, fixture.teacher);
    await seedAppointments();
    await prepare();
    const saved = { classes: await classes(), streams: await streams(), subjects: await subjects(), teachers: await teachers(),
      classTeachers: await classTeachers(), appointments: await appointments() };
    await Promise.all([prepare(), prepare()]);
    expect({ classes: await classes(), streams: await streams(), subjects: await subjects(), teachers: await teachers(),
      classTeachers: await classTeachers(), appointments: await appointments() }).toEqual(saved);

    await prepare(year(2028));
    expect((await classes(2028)).map(row => [row.name, row.curriculum_model])).toEqual(saved.classes.map(row => [row.name, row.curriculum_model]));
    expect((await teachers(2028)).map(row => [row.subject_id, row.teacher_user_id])).toEqual(saved.teachers.map(row => [row.subject_id, row.teacher_user_id]));
    expect((await subjects(2028)).every(row => !saved.subjects.some(old => old.id === row.id))).toBe(true);
    const nextSubject = (await subjects(2028))[0];
    await fixture.q('UPDATE class_subject_assignments SET lessons_per_week=9 WHERE tenant_id=$1 AND id=$2', [fixture.school, nextSubject.id]);
    expect(await subjects()).toEqual(saved.subjects);
    expect(await teachers()).toEqual(saved.teachers);
    expect((await fixture.q('SELECT id FROM subjects WHERE tenant_id=$1', [fixture.school]))).toHaveLength(3);
  });

  it('respects explicit appointment expiry and inactive school membership without dropping reusable subjects', async () => {
    await fixture.configureClass(7, 'East', 'CBC', 2026, fixture.school, fixture.teacher);
    await fixture.configureClass(7, 'West', 'CBC', 2026, fixture.school, fixture.otherTeacher);
    await seedAppointments();
    await fixture.q("UPDATE teacher_subject_assignments SET effective_to='2026-12-31' WHERE tenant_id=$1 AND teacher_user_id=$2", [fixture.school, fixture.teacher]);
    await fixture.q("UPDATE academics_class_teachers SET effective_to='2026-12-31' WHERE tenant_id=$1", [fixture.school]);
    await fixture.q("UPDATE academics_role_appointments SET effective_to='2026-12-31' WHERE tenant_id=$1", [fixture.school]);
    await fixture.q("UPDATE tenant_memberships SET status='suspended' WHERE tenant_id=$1 AND user_id=$2", [fixture.school, fixture.otherTeacher]);
    await fixture.q(`UPDATE class_streams SET class_teacher_id=$3,stream_teacher_user_id=$3
      WHERE tenant_id=$1 AND id=$2`, [fixture.school, fixture.streamId(7), fixture.otherTeacher]);

    await prepare();

    expect((await subjects()).filter(row => row.class_name === 'Grade 7' && row.status === 'active')).toHaveLength(6);
    expect((await teachers()).filter(row => row.status === 'active')).toEqual([]);
    expect(await classTeachers()).toEqual([]);
    expect(await appointments()).toEqual([]);
    expect((await streams()).every(row => row.class_teacher_id === null && row.stream_teacher_user_id === null)).toBe(true);
  });

  it('carries every allowed holder of a shared year responsibility without replacing an existing appointment', async () => {
    for (const teacher of [fixture.teacher, fixture.otherTeacher]) {
      await fixture.q(`INSERT INTO academics_role_appointments(tenant_id,school_id,academic_year_id,role_type,teacher_user_id,effective_from)
        VALUES($1,$1,$2,'exams_manager',$3,'2026-01-01')`, [fixture.school, year(2026), teacher]);
    }
    const [existing] = await fixture.q(`INSERT INTO academics_role_appointments(tenant_id,school_id,academic_year_id,role_type,teacher_user_id,effective_from,reason)
      VALUES($1,$1,$2,'exams_manager',$3,'2027-01-01','Confirmed next-year responsibility') RETURNING *`,
    [fixture.school, year(), fixture.otherTeacher]);

    await prepare();
    await prepare();

    const copied = await appointments();
    expect(copied.map(row => row.teacher_user_id).sort()).toEqual([fixture.teacher, fixture.otherTeacher].sort());
    expect(copied.find(row => row.id === existing.id)).toEqual(existing);
    expect(await appointments(2026)).toHaveLength(2);
  });

  it('refuses another school’s target and never copies another school’s classes or teacher assignments', async () => {
    await fixture.configureClass(7, 'East', 'CBC', 2026, fixture.school, fixture.teacher);
    await fixture.configureClass(8, 'West', 'CBC', 2026, fixture.foreignSchool, fixture.otherTeacher);
    const foreignBefore = { classes: await classes(2026, fixture.foreignSchool), streams: await streams(2026, fixture.foreignSchool) };
    await expect(prepare(year(2027, fixture.foreignSchool))).rejects.toThrow();
    expect(await classes()).toEqual([]);
    await prepare();
    expect((await subjects()).every(row => row.tenant_id === fixture.school && row.subject_id.startsWith(`${fixture.school}-`))).toBe(true);
    expect((await teachers()).map(row => row.teacher_user_id)).toEqual([fixture.teacher]);
    expect(await classes(2027, fixture.foreignSchool)).toEqual([]);
    expect(await classes(2026, fixture.foreignSchool)).toEqual(foreignBefore.classes);
    expect(await streams(2026, fixture.foreignSchool)).toEqual(foreignBefore.streams);
  });
});
