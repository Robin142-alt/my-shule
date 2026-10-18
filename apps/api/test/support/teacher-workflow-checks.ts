import { TeacherCommandService } from '../../src/modules/admin-command/teacher-command.service';
import { AdminCommandOperationsService } from '../../src/modules/admin-command/admin-command-operations.service';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { TeacherWorkflowService } from '../../src/modules/class-teacher/teacher-workflow.service';
import { ClassTeacherService } from '../../src/modules/class-teacher/class-teacher.service';
import { DisciplineService } from '../../src/modules/discipline/discipline.service';
import { DisciplineRepository } from '../../src/modules/discipline/repositories/discipline.repository';
import { SchoolOperationalEventsService } from '../../src/modules/events/school-operational-events.service';
import { EventPublisherService } from '../../src/modules/events/event-publisher.service';
import { OutboxEventsRepository } from '../../src/modules/events/repositories/outbox-events.repository';
import { SchoolOperationNotificationsRepository } from '../../src/modules/events/repositories/school-operation-notifications.repository';

export async function verifyTeacherWorkflows(pool: Pool, fixture: { tenantId: string; userId: string }) {
  const ids = Object.fromEntries(['teacher', 'studentUser', 'year', 'term', 'class', 'subject', 'stream', 'otherStream', 'learner', 'otherLearner', 'level'].map(key => [key, randomUUID()]));
  const tenantId = fixture.tenantId;
  for (const [id, label] of [[ids.teacher, 'teacher'], [ids.studentUser, 'student']]) {
    await pool.query("INSERT INTO users(id,full_name,display_name,email,password_hash,status) VALUES($1,$2,$2,$3,'test-only','active')", [id, label, `teacher-workflow-${label}@example.invalid`]);
  }
  await pool.query(`INSERT INTO academic_years(id,tenant_id,name,start_date,end_date,starts_on,ends_on,status)
    VALUES($1,$2,'Teacher workflow year',CURRENT_DATE-30,CURRENT_DATE+300,CURRENT_DATE-30,CURRENT_DATE+300,'active')`, [ids.year, tenantId]);
  await pool.query(`INSERT INTO academic_terms(id,tenant_id,academic_year_id,name,starts_on,ends_on,status)
    VALUES($1,$2,$3,'Teacher workflow term',CURRENT_DATE-10,CURRENT_DATE+60,'active')`, [ids.term, tenantId, ids.year]);
  await pool.query(`INSERT INTO class_sections(id,tenant_id,academic_year_id,name,grade_level) VALUES($1,$2,$3,'Teacher workflow class','7')`, [ids.class, tenantId, ids.year]);
  for (const [id, name] of [[ids.stream, 'Blue'], [ids.otherStream, 'Red']]) {
    await pool.query("INSERT INTO class_streams(id,tenant_id,class_section_id,name) VALUES($1,$2,$3,$4)", [id, tenantId, ids.class, name]);
  }
  await pool.query("INSERT INTO subjects(id,tenant_id,name,code) VALUES($1,$2,'Teacher mathematics','TWM')", [ids.subject, tenantId]);
  await pool.query(`INSERT INTO teacher_subject_assignments(tenant_id,teacher_user_id,academic_year_id,academic_term_id,class_section_id,subject_id,stream_id)
    VALUES($1,$2,$3,$4,$5,$6,$7)`, [tenantId, ids.teacher, ids.year, ids.term, ids.class, ids.subject, ids.stream]);
  await pool.query("INSERT INTO academic_levels(id,tenant_id,system_type,name,order_index) VALUES($1,$2,'CBC','Teacher workflow level',999)", [ids.level,tenantId]);
  for (const [id, stream, name] of [[ids.learner, ids.stream, 'Allowed learner'], [ids.otherLearner, ids.otherStream, 'Other stream learner']]) {
    await pool.query(`INSERT INTO students(id,tenant_id,school_id,admission_number,first_name,last_name,gender,nationality,student_status,admission_date,boarding_status,status,current_class_id)
      VALUES($1,$2,$3,$1,$4,'Test','Female','Kenyan',enum_first(NULL::"StudentStatus"),CURRENT_DATE,enum_first(NULL::"BoardingStatus"),'active',$5)`,
    [id, tenantId, `legacy-${tenantId}`, name, ids.class]);
    await pool.query(`INSERT INTO student_class_assignments(tenant_id,student_id,academic_year_id,class_section_id,stream_id,status,school_id,academic_level_id)
      VALUES($1,$2,$3,$4,$5,'active',$6,$7)`, [tenantId, id, ids.year, ids.class, stream, `legacy-${tenantId}`, ids.level]);
  }
  const role = await pool.query("INSERT INTO roles(tenant_id,code,name,updated_at) VALUES($1,'student','Student',NOW()) RETURNING id", [tenantId]);
  await pool.query("INSERT INTO tenant_memberships(tenant_id,user_id,role_id,status) VALUES($1,$2,$3,'active')", [tenantId, ids.studentUser, role.rows[0].id]);
  await pool.query("INSERT INTO student_portal_access(tenant_id,student_id,user_id,status,username,guardian_phone_hash) VALUES($1,$2,$3,'active','qa-learner','fixture-only')", [tenantId, ids.learner, ids.studentUser]);
  await pool.query('GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO sidebar_read_test; GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sidebar_read_test');
  const context = { tenant_id: tenantId, user_id: ids.teacher, role: 'teacher', permissions: ['teacher:read', 'teacher:write'], is_authenticated: true, request_id: randomUUID() };
  let active: PoolClient | undefined;
  const tx = { $queryRawUnsafe: async (sql: string, ...params: unknown[]) => (await query(sql, params)).rows };
  const transaction = async <T>(callback: (connection: typeof tx) => Promise<T>): Promise<T> => {
    if (active) return callback(tx);
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      await connection.query('SET LOCAL ROLE sidebar_read_test');
      await connection.query('SET LOCAL row_security = on');
      await connection.query("SELECT set_config('app.tenant_id',$1,true), set_config('app.user_id',$2,true), set_config('app.role',$3,true)", [context.tenant_id, context.user_id, context.role]);
      active = connection;
      const result = await callback(tx);
      await connection.query('COMMIT');
      return result;
    } catch (error) { await connection.query('ROLLBACK'); throw error; }
    finally { active = undefined; connection.release(); }
  };
  const query = async (sql: string, params: unknown[] = []): Promise<any> => active ? active.query(sql, params) : transaction(() => active!.query(sql, params));
  const db = { query, withRequestTransaction: transaction, executeWithTenant: (_tenant: string, _actor: string | null, callback: (connection: typeof tx) => Promise<unknown>) => transaction(callback) };
  const request = { requireStore: () => context, getStore: () => context };
  const publisher = new EventPublisherService(request as never, new OutboxEventsRepository(db as never));
  const events = new SchoolOperationalEventsService(request as never, publisher, new SchoolOperationNotificationsRepository(db as never));
  const discipline = new DisciplineService(request as never, {} as never, db as never, new DisciplineRepository(db as never));
  const workflow = new TeacherWorkflowService(db as never, request as never, discipline, events);
  const teacher = new ClassTeacherService(db as never, publisher, undefined, request as never);

  const classes = await teacher.getMyClasses(tenantId, ids.teacher);
  assert.equal(classes.classes.length, 1);
  assert.equal(classes.classes[0].learnersCount, 1);
  assert.equal(classes.classes[0].streamId, ids.stream);
  await assert.rejects(teacher.getRegister(tenantId, ids.teacher, ids.class), /Only an appointed Class Teacher/);
  await assert.rejects(teacher.getAttendance(tenantId, ids.teacher, ids.class), /Only an appointed Class Teacher/);
  await assert.rejects(teacher.saveAttendance(tenantId, ids.teacher, ids.class, [{id:ids.learner,status:'present'}]), /Only an appointed Class Teacher/);
  context.role = 'class_teacher';
  await assert.rejects(teacher.getRegister(tenantId, ids.teacher, ids.class), /active class-teacher appointment/);
  await pool.query(`INSERT INTO academics_class_teachers(school_id,tenant_id,academic_year_id,class_section_id,teacher_user_id)
    VALUES($1,$2,$3,$4,$5)`, [`legacy-${tenantId}`,tenantId,ids.year,ids.class,ids.teacher]);
  assert.equal((await teacher.getRegister(tenantId, ids.teacher, ids.class)).length, 2);
  assert.equal((await teacher.getAttendance(tenantId, ids.teacher, ids.class)).length, 2);
  context.role = 'teacher';
  await assert.rejects(teacher.saveLessonLog(tenantId, ids.teacher, { classId: ids.class, subjectId:ids.subject,streamId:ids.stream,lessonStatus:'not_taught' }), /Reason/);
  await teacher.saveLessonLog(tenantId, ids.teacher, { classId:ids.class,subjectId:ids.subject,streamId:ids.stream,lessonStatus:'not_taught',challenges:'School assembly' });
  await teacher.saveLessonLog(tenantId, ids.teacher, { classId:ids.class,subjectId:ids.subject,streamId:ids.stream,lessonStatus:'taught',topics:'Fractions' });
  const lessonLogs = await teacher.getLessonLogs(tenantId, ids.teacher);
  assert.equal(lessonLogs.length,2); assert.ok(lessonLogs.some(row=>row.status==='Not taught' && row.reason==='School assembly'));
  assert.ok((await query("SELECT id FROM workflow_events WHERE tenant_id=$1 AND event_type='lesson.recorded'",[tenantId])).rows.length===2);
  await assert.rejects(teacher.saveLessonLog(tenantId, ids.teacher, { classId:ids.class,subjectId:ids.subject,streamId:ids.otherStream,lessonStatus:'taught',topics:'Denied' }), /allocation/);
  assert.deepEqual((await workflow.concernLearners()).map(row => row.id), [ids.learner]);
  const options = await workflow.concernOptions();
  assert.ok(options.categories.length);
  const dueDate = new Date(Date.now() + 86400000).toISOString();
  await assert.rejects(teacher.saveHomework(tenantId, ids.teacher, { title: 'Too broad', classId: ids.class, subjectId: ids.subject, dueDate }), /no longer active/);
  const created = await teacher.saveHomework(tenantId, ids.teacher, { title: 'Fractions', classId: ids.class, subjectId: ids.subject, streamId: ids.stream, dueDate, maxScore: 20, description: 'Exercises 1 to 5' });
  const homework = await teacher.getHomework(tenantId, ids.teacher, '');
  assert.equal(homework[0].title, 'Fractions');
  assert.equal(homework[0].total, 1);
  assert.equal(homework[0].submitted, 0);
  const assignmentId = created.assignmentId;
  assert.deepEqual((await workflow.submissions(assignmentId)).students.map(row => row.studentId), [ids.learner]);
  await assert.rejects(workflow.reviewSubmission(assignmentId, { studentId: ids.otherLearner, status: 'submitted' }), /outside/);
  await assert.rejects(workflow.reviewSubmission(assignmentId, { studentId: ids.learner, status: 'graded', score: 10 }), /receipt/);
  await workflow.reviewSubmission(assignmentId, { studentId: ids.learner, status: 'submitted' });
  await workflow.reviewSubmission(assignmentId, { studentId: ids.learner, status: 'submitted' });
  assert.equal((await query('SELECT COUNT(*)::int AS count FROM academics_assignment_submissions WHERE tenant_id=$1 AND assignment_id=$2::uuid', [tenantId, assignmentId])).rows[0].count, 1);
  await assert.rejects(workflow.reviewSubmission(assignmentId, { studentId: ids.learner, status: 'graded', score: 21 }), /between 0 and 20/);
  await workflow.reviewSubmission(assignmentId, { studentId: ids.learner, status: 'graded', score: 0, feedback: 'Review fractions' });
  let roster = await workflow.submissions(assignmentId);
  assert.equal(roster.students[0].score, '0');
  assert.equal(roster.students[0].feedback, 'Review fractions');
  assert.equal((await teacher.getHomework(tenantId, ids.teacher, ''))[0].graded, 1);
  await assert.rejects(workflow.reviewSubmission(assignmentId, { studentId: ids.learner, status: 'returned', feedback: '' }), /revise/);
  await assert.rejects(workflow.reviewSubmission(assignmentId, { studentId: ids.learner, status: 'graded', score: 10, expectedUpdatedAt: '2000-01-01T00:00:00Z' }), /changed/);
  await workflow.reviewSubmission(assignmentId, { studentId: ids.learner, status: 'returned', feedback: 'Try question 2 again' });
  roster = await workflow.submissions(assignmentId);
  assert.equal(roster.students[0].status, 'returned');
  assert.equal(roster.students[0].score, null);
  assert.ok((await query("SELECT id FROM academic_audit_logs WHERE tenant_id=$1 AND entity_type='assignment_submission'", [tenantId])).rows.length >= 3);
  assert.ok((await query("SELECT id FROM workflow_events WHERE tenant_id=$1 AND event_type='assignment.graded'", [tenantId])).rows.length);
  assert.ok((await query("SELECT id FROM notifications WHERE tenant_id=$1 AND recipient_user_id=$2 AND type='assignment.reviewed'", [tenantId, ids.studentUser])).rows.length);

  const concern = { studentId: ids.learner, categoryId: options.categories[0].id, title: 'Concern for follow-up', description: 'Observed an incident in class.', severity: 'medium' as const };
  await assert.rejects(workflow.raiseConcern({ ...concern, studentId: ids.otherLearner }), /outside/);
  const raised = await workflow.raiseConcern(concern);
  assert.ok(raised.reference.startsWith('DIS-'));
  assert.equal((await workflow.concerns())[0].title, concern.title);
  assert.equal((await workflow.concernDetail(raised.incidentId)).incident.description, concern.description);
  context.role = 'discipline_master';
  context.permissions = ['discipline:manage', 'discipline:read'];
  await discipline.createAction(raised.incidentId, { action_type: 'parent_meeting', title: 'School support meeting', description: 'Discuss the concern with the parent.' });
  await discipline.createComment(raised.incidentId, { visibility: 'public', body: 'School follow-up arranged.' });
  await discipline.createComment(raised.incidentId, { visibility: 'internal', body: 'Restricted team note.' });
  context.role = 'teacher';
  context.permissions = ['teacher:read', 'teacher:write'];
  const tracked = await workflow.concernDetail(raised.incidentId);
  assert.equal(tracked.actions[0].title, 'School support meeting');
  assert.equal(tracked.comments.length, 1);
  assert.equal(tracked.comments[0].body, 'School follow-up arranged.');
  await pool.query("UPDATE discipline_incidents SET status='resolved',action_taken='School follow-up completed' WHERE id=$1::uuid", [raised.incidentId]);
  assert.equal((await workflow.concerns())[0].status, 'resolved');
  const before = (await query('SELECT COUNT(*)::int AS count FROM discipline_incidents WHERE tenant_id=$1', [tenantId])).rows[0].count;
  const original = events.recordSchoolOperation.bind(events);
  events.recordSchoolOperation = async () => { throw new Error('Outbox unavailable'); };
  await assert.rejects(workflow.raiseConcern(concern), /Outbox unavailable/);
  events.recordSchoolOperation = original;
  assert.equal((await query('SELECT COUNT(*)::int AS count FROM discipline_incidents WHERE tenant_id=$1', [tenantId])).rows[0].count, before);

  const reports = new TeacherCommandService(request as never,db as never,new AdminCommandOperationsService(db as never));
  await reports.generateReport();
  const reportId = (await reports.getReports()).items[0].id;
  const report = await reports.getReport(reportId);
  assert.ok(Buffer.from(report.artifact.content_base64,'base64').subarray(0,4).equals(Buffer.from('%PDF')));
  context.tenant_id = 'sidebar-record-school-b';
  await assert.rejects(reports.getReport(reportId),/not found/);
  assert.deepEqual(await workflow.concerns(), []);
  await assert.rejects(workflow.concernDetail(raised.incidentId), /not found/);
  await assert.rejects(workflow.submissions(assignmentId), /unavailable/);
  context.tenant_id = tenantId;
  context.user_id = fixture.userId;
  await assert.rejects(workflow.submissions(assignmentId), /unavailable/);
  context.user_id = ids.teacher;
  context.permissions = ['teacher:read'];
  await assert.rejects(workflow.reviewSubmission(assignmentId, { studentId: ids.learner, status: 'submitted' }), /permission/);
  context.permissions = ['teacher:read', 'teacher:write'];
  await pool.query("UPDATE teacher_subject_assignments SET status='ended' WHERE tenant_id=$1 AND teacher_user_id=$2", [tenantId, ids.teacher]);
  await assert.rejects(workflow.submissions(assignmentId), /unavailable/);
  assert.equal((await workflow.concerns()).length, 1, 'Reporter can track existing concerns after allocation changes');
  assert.equal((await workflow.concernLearners()).length, 0, 'Ended allocations cannot raise new concerns');
  console.log('PASS teacher assignment lifecycle, discipline workflow, audit/events, rollback, stream and tenant isolation');
}
