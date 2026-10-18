import { randomUUID } from 'node:crypto';
import { CLASS_TEACHER_APPOINTMENT_SCOPE_SQL } from '../academics/class-teacher-appointment-scope';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { notificationRecipientPredicate } from '../notifications/notification-recipient-predicate';
import { PrismaService } from '../../database/prisma.service';
import { EventPublisherService } from '../events/event-publisher.service';
import {
  EXAM_SCORE_STATUSES,
  type BulkExamMarkUploadRowDto,
  type ExamScoreStatus,
} from '../exams/dto/exams.dto';
import { ExamsService } from '../exams/exams.service';
import { markEntryHasStartedSql, markEntryAccessSql, effectiveEntryDeadlineSql } from '../exams/mark-entry-window-policy';
import { teacherMarkSheetSubmittedSql, teacherMarkStudentScopeSql } from '../exams/teacher-mark-scope';
import type { SaveTeacherMarksDto, TeacherMarkInput } from './dto/class-teacher.dto';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { requireAssistedMarkEntryScope } from '../exams/assisted-mark-entry-policy';
import type { UploadFileMetadata } from '../../common/uploads/upload-policy';
import { STAFF_NAME_TITLES } from '../hr/staff-name-title';

@Injectable()
export class ClassTeacherService {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  private readonly logger = new Logger(ClassTeacherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisherService: EventPublisherService,
    @Optional() private readonly examsService?: ExamsService,
    @Optional() private readonly requestContext?: RequestContextService,
  ) {}

  private isClassTeacherMode(): boolean {
    return this.requestContext?.getStore()?.role === 'class_teacher';
  }

  private requireClassTeacherRegisterRole() {
    if (!this.isClassTeacherMode()) {
      throw new ForbiddenException('Only an appointed Class Teacher can view or mark registers. Switch Working As to Class Teacher.');
    }
  }

  private async assertStudentBelongsToStream(tenantId: string, streamId: string, studentId: string) {
    if (!studentId) {
      throw new BadRequestException('Select a learner before submitting this class-teacher action.');
    }

    const { rows } = await this.executeSql(
      `SELECT id
       FROM student_class_assignments
       WHERE tenant_id::text = $1::text
         AND class_section_id = $2
         AND student_id = $3
         AND status = 'active'
       LIMIT 1`,
      [tenantId, streamId, studentId],
    );

    if (rows.length === 0) {
      throw new BadRequestException('The selected learner is not active in this class stream.');
    }
  }

  private assignmentCapabilityClause(
    capability?: 'mark_entry_allowed' | 'lesson_record_allowed' | 'report_comment_allowed',
  ): string {
    return capability ? `AND ${capability} = TRUE` : '';
  }

  private requireText(value: unknown, fieldName: string): string {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    return normalized;
  }

  private async assertTeacherAssignedClassSubject(
    tenantId: string,
    userId: string,
    classSectionId: string,
    subjectId: string,
    capability?: 'mark_entry_allowed' | 'lesson_record_allowed' | 'report_comment_allowed',
  ) {
    const capabilityClause = this.assignmentCapabilityClause(capability);
    const { rows } = await this.executeSql(
      `SELECT id
       FROM teacher_subject_assignments
       WHERE tenant_id::text = $1::text
         AND teacher_user_id = $2
          AND class_section_id = $3
          AND subject_id = $4
          AND status = 'active'
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
          ${capabilityClause}
       LIMIT 1`,
      [tenantId, userId, classSectionId, subjectId],
    );

    if (rows.length === 0) {
      throw new ForbiddenException('This class and subject are not active in your teaching assignments.');
    }
  }

  private async assertTeacherAssignedClass(
    tenantId: string,
    userId: string,
    classSectionId: string,
    capability?: 'mark_entry_allowed' | 'lesson_record_allowed' | 'report_comment_allowed',
  ) {
    const capabilityClause = this.assignmentCapabilityClause(capability);
    const { rows } = await this.executeSql(
      `SELECT id
       FROM teacher_subject_assignments
       WHERE tenant_id::text = $1::text
          AND teacher_user_id = $2
          AND class_section_id = $3
          AND status = 'active'
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
          ${capabilityClause}
       LIMIT 1`,
      [tenantId, userId, classSectionId],
    );

    if (rows.length === 0) {
      throw new ForbiddenException('This class is not active in your teaching assignments.');
    }
  }

  private async assertTeacherAssignedStudent(
    tenantId: string,
    userId: string,
    studentId: string,
  ) {
    if (!studentId) {
      throw new BadRequestException('Select a learner before submitting this teacher action.');
    }

    const { rows } = await this.executeSql(
      `SELECT assignment.id
       FROM student_class_assignments student_assignment
       JOIN teacher_subject_assignments assignment
         ON assignment.tenant_id::text = student_assignment.tenant_id::text
        AND assignment.class_section_id::text = student_assignment.class_section_id::text
        AND (assignment.stream_id IS NULL OR assignment.stream_id::text = student_assignment.stream_id::text)
       WHERE student_assignment.tenant_id::text = $1::text
         AND assignment.teacher_user_id = $2
         AND student_assignment.student_id = $3
         AND student_assignment.status = 'active'
         AND assignment.status = 'active'
         AND assignment.effective_from <= CURRENT_DATE
         AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
       LIMIT 1`,
      [tenantId, userId, studentId],
    );

    if (rows.length === 0) {
      throw new ForbiddenException('The selected learner is outside your active teaching assignments.');
    }
  }

  private async assertActiveClassTeacherClass(
    tenantId: string,
    userId: string,
    classSectionId: string,
  ) {
    const { rows } = await this.executeSql(
      `SELECT id
       FROM ${CLASS_TEACHER_APPOINTMENT_SCOPE_SQL} class_appointments
       WHERE tenant_id::text = $1::text
         AND teacher_user_id::text = $2
         AND class_section_id = $3
         AND is_active = TRUE
         AND status = 'active'
         AND effective_from <= CURRENT_DATE
         AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
       LIMIT 1`,
      [tenantId, userId, classSectionId],
    );

    if (rows.length === 0) {
      throw new ForbiddenException('An active class-teacher appointment is required for this class.');
    }
  }

  private async assertCurrentRoleAssignedClass(
    tenantId: string,
    userId: string,
    classSectionId: string,
    capability?: 'mark_entry_allowed' | 'lesson_record_allowed' | 'report_comment_allowed',
  ) {
    if (this.isClassTeacherMode()) {
      await this.assertActiveClassTeacherClass(tenantId, userId, classSectionId);
      return;
    }

    await this.assertTeacherAssignedClass(tenantId, userId, classSectionId, capability);
  }

  private async assertActiveClassTeacherStudent(
    tenantId: string,
    userId: string,
    studentId: string,
  ) {
    if (!studentId) {
      throw new BadRequestException('Select a learner before saving a class-teacher comment.');
    }

    const { rows } = await this.executeSql(
      `SELECT appointment.id
       FROM ${CLASS_TEACHER_APPOINTMENT_SCOPE_SQL} appointment
       JOIN student_class_assignments student_assignment
         ON student_assignment.tenant_id::text = appointment.tenant_id::text
        AND student_assignment.class_section_id::text = appointment.class_section_id::text
       WHERE appointment.tenant_id::text = $1::text
         AND appointment.teacher_user_id::text = $2
         AND student_assignment.student_id = $3
         AND student_assignment.status = 'active'
         AND appointment.is_active = TRUE
         AND appointment.status = 'active'
         AND appointment.effective_from <= CURRENT_DATE
         AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
       LIMIT 1`,
      [tenantId, userId, studentId],
    );

    if (rows.length === 0) {
      throw new ForbiddenException('The learner is outside your active class-teacher appointment.');
    }
  }

  async getMyClasses(tenantId: string, userId: string) {
    if (this.isClassTeacherMode()) {
      return this.getClassTeacherAppointments(tenantId, userId);
    }

    const query = `
      SELECT 
        tsa.id,
        cs.id as class_section_id,
        tsa.stream_id::text as stream_id,
        s.id as subject_id,
        CONCAT_WS(' — ', cs.name, stream.name) as class_name,
        s.name as subject_name,
        COALESCE(sc.student_count, 0) as learners_count, sc.learner_ids,
        'Class Teacher only' as attendance_status, 0 AS attendance_present_count, 0 AS attendance_total_count, '--' as cat_average
      FROM teacher_subject_assignments tsa
      JOIN subjects s ON s.id::text = tsa.subject_id::text AND s.tenant_id::text = tsa.tenant_id::text
      JOIN class_sections cs ON cs.id::text = tsa.class_section_id::text AND cs.tenant_id::text = tsa.tenant_id::text
      LEFT JOIN class_streams stream ON stream.tenant_id = tsa.tenant_id AND stream.id::text = tsa.stream_id::text
      LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT placement.student_id) as student_count, ARRAY_AGG(DISTINCT placement.student_id::text) AS learner_ids
        FROM student_class_assignments placement
        WHERE placement.tenant_id = tsa.tenant_id AND placement.class_section_id::text = tsa.class_section_id::text
          AND placement.status = 'active' AND (tsa.stream_id IS NULL OR placement.stream_id::text = tsa.stream_id::text)
      ) sc ON TRUE
      WHERE tsa.tenant_id::text = $1::text
        AND tsa.teacher_user_id = $2
        AND tsa.status = 'active'
        AND tsa.effective_from <= CURRENT_DATE
        AND (tsa.effective_to IS NULL OR tsa.effective_to >= CURRENT_DATE)
    `;
    const { rows: result } = await this.executeSql(query, [tenantId, userId]);

    const totalLearners = new Set(result.flatMap(row => row.learner_ids ?? [])).size;
    const classScopes = [...new Map(result.map(row => [row.class_section_id + ':' + (row.stream_id ?? ''), row])).values()];
    const attendancePresentCount = classScopes.reduce((acc, row) => acc + Number(row.attendance_present_count || 0), 0);
    const attendanceTotalCount = classScopes.reduce((acc, row) => acc + Number(row.attendance_total_count || 0), 0);
    const averageAttendance = attendanceTotalCount > 0
      ? `${Math.round((attendancePresentCount / attendanceTotalCount) * 100)}%`
      : '0%';

    return {
      stats: {
        assignedClasses: classScopes.length,
        totalLearnersTaught: totalLearners,
        averageAttendance,
      },
      classes: result.map(r => ({
        id: r.id,
        classSectionId: r.class_section_id,
        streamId: r.stream_id,
        subjectId: r.subject_id,
        className: r.class_name,
        subjectName: r.subject_name,
        learnersCount: parseInt(r.learners_count),
        attendanceStatus: r.attendance_status,
        catAverage: r.cat_average,
      })),
    };
  }

  async getOverview(tenantId: string, userId: string, streamId: string) {
    this.requireClassTeacherRegisterRole();
    await this.assertActiveClassTeacherClass(tenantId, userId, streamId);

    const learnersRes = await this.executeSql(
      `SELECT count(*)::int as count FROM student_class_assignments WHERE tenant_id::text = $1::text AND class_section_id = $2 AND status = 'active'`,
      [tenantId, streamId]
    );

    const attendanceRes = await this.executeSql(
      `SELECT count(*) FILTER (WHERE status = 'present')::int as present, count(*) FILTER (WHERE status = 'absent')::int as absent FROM academics_attendance WHERE tenant_id::text = $1::text AND class_id = $2 AND attendance_date::date = CURRENT_DATE`,
      [tenantId, streamId]
    );

    return {
      totalLearners: learnersRes.rows[0]?.count || 0,
      presentToday: attendanceRes.rows[0]?.present || 0,
      absentToday: attendanceRes.rows[0]?.absent || 0,
      urgentFollowups: [] // Requires welfare/discipline incidents logic
    };
  }

  async getDashboardOverview(tenantId: string, userId: string) {
    const today = new Date().toISOString().split('T')[0];

    // Todays Lessons
    const lessonsRes = await this.executeSql(
      `SELECT count(*)::int as count FROM timetable_slots WHERE tenant_id::text = $1::text AND teacher_id = $2 AND day_of_week = EXTRACT(ISODOW FROM CURRENT_DATE)`,
      [tenantId, userId]
    );
    const todaysLessonsCount = lessonsRes.rows[0]?.count || 0;

    // Pending Attendance
    const attendanceStats = this.isClassTeacherMode() ? (await this.getPendingAttendance(tenantId, userId)).stats : undefined;

    // Lesson Logs
    const lessonLogsRes = await this.executeSql(
      `SELECT count(*)::int as count FROM academics_lesson_logs WHERE tenant_id::text = $1::text AND teacher_id = $2 AND log_date = $3`,
      [tenantId, userId, today]
    );
    const pendingLessonLogs = Math.max(0, todaysLessonsCount - (lessonLogsRes.rows[0]?.count || 0));

    // Marks
    const { stats: marksStats } = await this.getPendingMarks(tenantId, userId);

    // Assignments
    const assignmentsRes = await this.executeSql(
      `SELECT count(*)::int as count FROM academics_assignments WHERE tenant_id::text = $1::text AND teacher_id = $2 AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + interval '7 days'`,
      [tenantId, userId]
    );

    // Learners needing attention (Discipline)
    const disciplineRes = await this.executeSql(
      `SELECT count(DISTINCT di.student_id)::int as count 
       FROM discipline_incidents di 
       JOIN student_class_assignments sca ON di.student_id::text = sca.student_id::text AND sca.tenant_id::text = di.tenant_id::text AND sca.status = 'active'
       JOIN teacher_subject_assignments tsa ON sca.class_section_id::text = tsa.class_section_id::text AND tsa.tenant_id::text = sca.tenant_id::text AND (tsa.stream_id IS NULL OR tsa.stream_id::text = sca.stream_id::text) AND tsa.status='active'
       WHERE LOWER(di.status) NOT IN ('resolved', 'closed') AND di.reporting_staff_id::text = $2 AND tsa.teacher_user_id = $2 AND di.tenant_id::text = $1::text`,
      [tenantId, userId]
    );

    // Messages
    const msgRes = await this.executeSql(
      `SELECT count(*)::int as count FROM notifications notification
       WHERE notification.tenant_id = $1
         AND ${notificationRecipientPredicate('notification', '$2', '$3')}
         AND notification.status <> 'read'`,
      [tenantId, userId, this.isClassTeacherMode() ? 'class_teacher' : 'teacher']
    );

    const storeRequestsRes = await this.executeSql(
      `SELECT count(*)::int as count
       FROM inventory_requests
       WHERE tenant_id::text = $1::text
         AND requested_by = $2
         AND status IN ('pending', 'approved', 'backordered')`,
      [tenantId, userId],
    );
    const storeRequestsCount = storeRequestsRes.rows[0]?.count || 0;

    return {
      todaysLessons: { count: todaysLessonsCount, detail: `${todaysLessonsCount} scheduled for today` },
      ...(attendanceStats ? { pendingAttendance: { count: attendanceStats.pendingTasks, detail: `${attendanceStats.pendingTasks} classes not marked` } } : {}),
      pendingLessonLogs: { count: pendingLessonLogs, detail: `${pendingLessonLogs} lessons not logged` },
      openMarkEntry: { count: marksStats.totalWindows, detail: `${marksStats.totalWindows} exams awaiting marks` },
      assignmentsDue: { count: assignmentsRes.rows[0]?.count || 0, detail: `${assignmentsRes.rows[0]?.count || 0} assignments due this week` },
      learnersNeedingAttention: { count: disciplineRes.rows[0]?.count || 0, detail: `${disciplineRes.rows[0]?.count || 0} flagged learners` },
      unreadMessages: { count: msgRes.rows[0]?.count || 0, detail: `${msgRes.rows[0]?.count || 0} unread messages` },
      storeRequests: { count: storeRequestsCount, detail: `${storeRequestsCount} pending store requests` }
    };
  }

  private async getClassTeacherAppointments(tenantId: string, userId: string) {
    const query = `
      SELECT
        appointment.id,
        cs.id AS class_section_id,
        NULL::text AS subject_id,
        cs.name AS class_name,
        'Class Teacher'::text AS subject_name,
        COALESCE(student_counts.student_count, 0) AS learners_count,
        CASE WHEN today_attendance.class_section_id IS NULL THEN 'Pending' ELSE 'Completed' END AS attendance_status,
        COALESCE(attendance_stats.present_count, 0)::int AS attendance_present_count,
        COALESCE(attendance_stats.total_count, 0)::int AS attendance_total_count,
        '--'::text AS cat_average
      FROM ${CLASS_TEACHER_APPOINTMENT_SCOPE_SQL} appointment
      JOIN class_sections cs
        ON cs.id::text = appointment.class_section_id::text
       AND cs.tenant_id::text = appointment.tenant_id::text
      LEFT JOIN (
        SELECT class_section_id, tenant_id, COUNT(student_id) AS student_count
        FROM student_class_assignments
        WHERE status = 'active'
        GROUP BY class_section_id, tenant_id
      ) student_counts
        ON student_counts.class_section_id::text = appointment.class_section_id::text
       AND student_counts.tenant_id::text = appointment.tenant_id::text
      LEFT JOIN (
        SELECT
          student_assignment.class_section_id,
          attendance.tenant_id,
          COUNT(*) FILTER (WHERE LOWER(attendance.status) = 'present') AS present_count,
          COUNT(*) AS total_count
        FROM academics_attendance attendance
        JOIN student_class_assignments student_assignment
          ON student_assignment.student_id::text = attendance.student_id::text
         AND student_assignment.tenant_id::text = attendance.tenant_id::text
        WHERE attendance.attendance_date::date >= CURRENT_DATE - interval '30 days'
          AND student_assignment.status = 'active'
        GROUP BY student_assignment.class_section_id, attendance.tenant_id
      ) attendance_stats
        ON attendance_stats.class_section_id::text = appointment.class_section_id::text
       AND attendance_stats.tenant_id::text = appointment.tenant_id::text
      LEFT JOIN (
        SELECT DISTINCT student_assignment.class_section_id, attendance.tenant_id
        FROM academics_attendance attendance
        JOIN student_class_assignments student_assignment
          ON student_assignment.student_id::text = attendance.student_id::text
         AND student_assignment.tenant_id::text = attendance.tenant_id::text
        WHERE attendance.attendance_date::date = CURRENT_DATE
          AND student_assignment.status = 'active'
      ) today_attendance
        ON today_attendance.class_section_id::text = appointment.class_section_id::text
       AND today_attendance.tenant_id::text = appointment.tenant_id::text
      WHERE appointment.tenant_id::text = $1::text
        AND appointment.teacher_user_id::text = $2
        AND appointment.is_active = TRUE
        AND appointment.status = 'active'
        AND appointment.effective_from <= CURRENT_DATE
        AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
      ORDER BY cs.name
    `;
    const { rows } = await this.executeSql(query, [tenantId, userId]);
    const totalLearners = rows.reduce((sum, row) => sum + Number(row.learners_count || 0), 0);
    const attendancePresentCount = rows.reduce(
      (sum, row) => sum + Number(row.attendance_present_count || 0),
      0,
    );
    const attendanceTotalCount = rows.reduce(
      (sum, row) => sum + Number(row.attendance_total_count || 0),
      0,
    );

    return {
      stats: {
        assignedClasses: rows.length,
        totalLearnersTaught: totalLearners,
        averageAttendance:
          attendanceTotalCount > 0
            ? `${Math.round((attendancePresentCount / attendanceTotalCount) * 100)}%`
            : '0%',
      },
      classes: rows.map((row) => ({
        id: row.id,
        classSectionId: row.class_section_id,
        subjectId: row.subject_id,
        className: row.class_name,
        subjectName: row.subject_name,
        learnersCount: Number(row.learners_count || 0),
        attendanceStatus: row.attendance_status,
        catAverage: row.cat_average,
      })),
    };
  }

  async getRegister(tenantId: string, userId: string, streamId: string) {
    this.requireClassTeacherRegisterRole();
    await this.assertActiveClassTeacherClass(tenantId, userId, streamId);

    // streamId here is actually class_section_id
    const query = `
      SELECT 
        s.id,
        s.admission_number,
        s.first_name || ' ' || s.last_name as name,
        s.gender,
        s.primary_guardian_phone as parent_phone,
        sa.status
      FROM student_class_assignments sa
      JOIN students s ON s.id::text = sa.student_id::text AND s.tenant_id::text = sa.tenant_id::text
      WHERE sa.tenant_id::text = $1::text
        AND sa.class_section_id = $2
        AND sa.status = 'active'

      ORDER BY s.first_name ASC
    `;
    const { rows: result } = await this.executeSql(query, [tenantId, streamId]);
    return result.map(r => ({
      id: r.id,
      admissionNo: r.admission_number,
      name: r.name,
      gender: r.gender,
      parentPhone: r.parent_phone,
      status: r.status,
    }));
  }

  async getPendingAttendance(tenantId: string, userId: string) {
    this.requireClassTeacherRegisterRole();
    const { classes } = await this.getClassTeacherAppointments(tenantId, userId);
    const tasks = classes.map(row => ({ id: row.id, classSectionId: row.classSectionId,
      date: new Date().toISOString().slice(0,10), time: '08:00', className: row.className,
      subjectName: 'Class register', expected: row.learnersCount, status: row.attendanceStatus }));
    return { stats: { totalTasks: tasks.length, pendingTasks: tasks.filter(row => row.status === 'Pending').length }, tasks };
  }

  async getAssistedMarkAssignments() {
    const { tenantId } = requireAssistedMarkEntryScope(this.requestContext?.getStore());
    const { rows } = await this.executeSql(`SELECT DISTINCT
        series.id::text AS exam_id, series.name AS exam_name,
        section.id AS class_section_id, section.name AS class_name,
        subject.id AS subject_id, subject.name AS subject_name,
        assignment.teacher_user_id,
        COALESCE(NULLIF(staff.display_name, ''), staff.staff_number, 'Teacher name unavailable') AS teacher_name
      FROM exam_mark_entry_windows w
      JOIN exam_series series ON series.tenant_id = w.tenant_id AND series.id = w.exam_series_id
      JOIN class_sections section ON section.tenant_id = w.tenant_id AND section.id = w.class_section_id::text
      JOIN subjects subject ON subject.tenant_id = w.tenant_id AND subject.id = w.subject_id::text
      JOIN teacher_subject_assignments assignment ON assignment.tenant_id = w.tenant_id
        AND assignment.class_section_id = section.id AND assignment.subject_id = subject.id
        AND (assignment.academic_term_id IS NULL OR assignment.academic_term_id = series.academic_term_id::text)
        AND assignment.status = 'active' AND assignment.mark_entry_allowed = TRUE
        AND assignment.effective_from <= CURRENT_DATE
        AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
      LEFT JOIN staff_profiles staff ON staff.tenant_id = w.tenant_id AND staff.user_id::text = assignment.teacher_user_id
      WHERE w.tenant_id = $1 AND series.status <> 'archived'
      ORDER BY exam_name, class_name, subject_name, teacher_name`, [tenantId]);
    return { assignments: rows };
  }

  getAssistedMarkbooks(teacherUserId: string) {
    const { tenantId } = requireAssistedMarkEntryScope(this.requestContext?.getStore());
    return this.getPendingMarks(tenantId, teacherUserId, true, true);
  }

  saveAssistedMarks(teacherUserId: string, payload: SaveTeacherMarksDto) {
    const { tenantId, actorUserId } = requireAssistedMarkEntryScope(this.requestContext?.getStore());
    return this.saveMarks(tenantId, teacherUserId, payload, actorUserId);
  }

  async getPendingMarks(tenantId: string, userId: string, includeUnavailable = false, includeSubmitted = false) {
    const query = `
      SELECT DISTINCT
        w.id as window_id,
        w.exam_series_id,
        es.academic_term_id,
        es.name as exam_name,
        cs.name as class_name,
        w.class_section_id,
        w.subject_id,
        s.name as subject_name,
        assessment.id as assessment_id,
        COALESCE(assessment.name, 'Main Paper') as paper_name,
        COALESCE(assessment.max_score, 100) as out_of,
        ${effectiveEntryDeadlineSql('w', '$2')} as deadline,
        ${teacherMarkSheetSubmittedSql('w', 'es', 'assessment.id', '$2')} AS is_submitted,
        (
          SELECT COUNT(DISTINCT em.student_id) FROM exam_marks em
          WHERE em.tenant_id = w.tenant_id AND em.exam_series_id = w.exam_series_id
            AND em.assessment_id = assessment.id AND em.class_section_id = w.class_section_id
            AND em.subject_id = w.subject_id
            AND ${teacherMarkStudentScopeSql('w', 'es', 'em.student_id', '$2')}
        ) AS saved_count,
        (
          SELECT MAX(em.submitted_at) FROM exam_marks em
          WHERE em.tenant_id = w.tenant_id AND em.exam_series_id = w.exam_series_id
            AND em.assessment_id = assessment.id AND em.class_section_id = w.class_section_id
            AND em.subject_id = w.subject_id
            AND ${teacherMarkStudentScopeSql('w', 'es', 'em.student_id', '$2')}
        ) AS submitted_at,
        (
          SELECT STRING_AGG(DISTINCT stream.name, ', ' ORDER BY stream.name)
          FROM class_streams stream
          JOIN teacher_subject_assignments assigned ON assigned.tenant_id = stream.tenant_id
            AND assigned.class_section_id = stream.class_section_id
            AND (assigned.stream_id IS NULL OR assigned.stream_id = stream.id)
          WHERE stream.tenant_id = w.tenant_id AND stream.class_section_id = w.class_section_id::text
            AND assigned.teacher_user_id = $2 AND assigned.subject_id = w.subject_id::text
            AND (assigned.academic_term_id IS NULL OR assigned.academic_term_id = es.academic_term_id::text)
            AND assigned.status = 'active' AND assigned.mark_entry_allowed = TRUE
            AND assigned.effective_from <= CURRENT_DATE
            AND (assigned.effective_to IS NULL OR assigned.effective_to >= CURRENT_DATE)
        ) AS stream_names,
        (
          SELECT COUNT(*) 
          FROM exam_marks em 
          WHERE em.tenant_id::text = w.tenant_id::text
            AND em.exam_series_id::text = w.exam_series_id::text
            AND em.assessment_id::text = assessment.id::text
            AND em.class_section_id::text = w.class_section_id::text
            AND em.subject_id::text = w.subject_id::text
            AND em.score_status = 'entered' AND em.score IS NOT NULL
            AND ${teacherMarkStudentScopeSql('w', 'es', 'em.student_id', '$2')}
        ) as entered_count,
        (
          SELECT COUNT(*)
          FROM students student
          WHERE student.tenant_id::text = w.tenant_id::text
            AND student.status = 'active'
            AND ${teacherMarkStudentScopeSql('w', 'es', 'student.id', '$2')}
            AND EXISTS (
              SELECT 1
              FROM student_class_assignments class_assignment
              WHERE class_assignment.tenant_id::text = student.tenant_id::text
                AND class_assignment.student_id = student.id::text
                AND class_assignment.class_section_id = w.class_section_id::text
                AND class_assignment.status = 'active'
            )
            AND EXISTS (
              SELECT 1
              FROM student_subject_enrollments subject_enrollment
              WHERE subject_enrollment.tenant_id::text = student.tenant_id::text
                AND subject_enrollment.student_id = student.id::text
                AND subject_enrollment.class_section_id = w.class_section_id::text
                AND subject_enrollment.subject_id = w.subject_id::text
                AND subject_enrollment.status = 'active'
            )
        ) as total_students,
        w.status as window_status,
        CASE
          WHEN es.locked_at IS NOT NULL OR es.published_at IS NOT NULL
            OR es.status IN ('locked', 'published', 'archived') THEN 'Locked'
          WHEN es.status = 'draft' AND w.status <> 'open' THEN 'Draft'
          WHEN ${markEntryAccessSql('w', 'es', '$2')} THEN 'Open'
          WHEN w.status <> 'open' THEN 'Closed'
          WHEN w.closes_at < NOW() THEN 'Deadline passed'
          WHEN ${markEntryHasStartedSql('w', 'es')} THEN 'Open'
          ELSE 'Scheduled'
        END AS entry_state,
        w.opens_at
      FROM exam_mark_entry_windows w
      JOIN exam_series es ON es.id::text = w.exam_series_id::text AND es.tenant_id::text = w.tenant_id::text
      JOIN class_sections cs ON cs.id = w.class_section_id::text AND cs.tenant_id::text = w.tenant_id::text
      JOIN subjects s ON s.id = w.subject_id::text AND s.tenant_id::text = w.tenant_id::text
      JOIN LATERAL (
        SELECT ea.id, ea.name, ea.max_score
        FROM exam_assessments ea
        WHERE ea.tenant_id::text = w.tenant_id::text
          AND ea.exam_series_id::text = w.exam_series_id::text
          AND ea.subject_id::text = w.subject_id::text
      ) assessment ON TRUE
      JOIN teacher_subject_assignments tsa ON tsa.class_section_id = w.class_section_id::text
        AND tsa.subject_id = w.subject_id::text
        AND tsa.tenant_id::text = w.tenant_id::text
        AND (tsa.academic_term_id IS NULL OR tsa.academic_term_id = es.academic_term_id::text)
        AND tsa.status = 'active'
        AND tsa.mark_entry_allowed = TRUE
        AND tsa.effective_from <= CURRENT_DATE
        AND (tsa.effective_to IS NULL OR tsa.effective_to >= CURRENT_DATE)
      WHERE w.tenant_id::text = $1::text
        AND tsa.teacher_user_id = $2
        AND ($4::boolean OR NOT ${teacherMarkSheetSubmittedSql('w', 'es', 'assessment.id', '$2')})
        AND ($3::boolean OR (
          ${markEntryAccessSql('w', 'es', '$2')}
          AND es.locked_at IS NULL AND es.published_at IS NULL
          AND es.status NOT IN ('locked', 'published', 'archived')
        ))
      ORDER BY deadline ASC
    `;
    const { rows: result } = await this.executeSql(query, [tenantId, userId, includeUnavailable, includeSubmitted]);
    
    return {
      stats: {
        totalWindows: result.filter(r => !r.is_submitted).length,
        nearingDeadline: result.filter(r => !r.is_submitted && r.entry_state === 'Open' && new Date(r.deadline).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000).length
      },
      windows: result.map(r => ({
        id: r.window_id,
        sheetId: `${r.window_id}:${r.assessment_id}`,
        examSeriesId: r.exam_series_id,
        academicTermId: r.academic_term_id,
        examName: r.exam_name,
        className: r.class_name,
        classSectionId: r.class_section_id,
        subjectId: r.subject_id,
        subjectName: r.subject_name,
        assessmentId: r.assessment_id,
        paperName: r.paper_name,
        streamNames: r.stream_names || null,
        savedCount: Number(r.saved_count),
        submittedAt: r.submitted_at ? new Date(r.submitted_at).toISOString() : null,
        outOf: parseInt(r.out_of),
        deadline: new Date(r.deadline).toISOString(),
        enteredCount: parseInt(r.entered_count),
        totalStudents: parseInt(r.total_students),
        canEnter: !r.is_submitted && r.entry_state === 'Open',
        entryState: r.entry_state,
        opensAt: new Date(r.opens_at).toISOString(),
        status: r.is_submitted ? 'Submitted' : r.entry_state !== 'Open'
          ? r.entry_state
          : Number(r.saved_count) > 0 ? 'Draft' : 'Pending',
      }))
    };
  }

  async getTimetable(tenantId: string, userId: string) {
    const query = `
      SELECT 
        ts.id as slot_id,
        cs.name as class_name,
        s.name as subject_name,
        ts.room_id as room_name,
        ts.day_of_week,
        ts.starts_at,
        ts.ends_at
      FROM timetable_slots ts
      JOIN class_sections cs ON cs.id::text = ts.class_section_id AND cs.tenant_id::text = ts.tenant_id::text
      JOIN subjects s ON s.id::text = ts.subject_id AND s.tenant_id::text = ts.tenant_id::text
      WHERE ts.tenant_id::text = $1::text
        AND ts.teacher_id = $2
        AND ts.status = 'published'
        AND EXISTS (
          SELECT 1
          FROM teacher_subject_assignments assignment
          WHERE assignment.tenant_id::text = ts.tenant_id::text
            AND assignment.teacher_user_id = $2
            AND assignment.class_section_id::text = ts.class_section_id::text
            AND assignment.subject_id::text = ts.subject_id::text
            AND assignment.status = 'active'
            AND assignment.effective_from <= CURRENT_DATE
            AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
        )
      ORDER BY ts.day_of_week ASC, ts.starts_at ASC
    `;
    const { rows: result } = await this.executeSql(query, [tenantId, userId]);
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return result.map(r => ({
      id: r.slot_id,
      day: days[parseInt(r.day_of_week) % 7], // assuming 1=Mon or 1=Sun, adjust if needed, mostly 1=Mon but let's just map it.
      // SQL day_of_week between 1 and 7. If 1=Monday:
      dayName: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][parseInt(r.day_of_week) - 1],
      startTime: r.starts_at.substring(0, 5),
      endTime: r.ends_at.substring(0, 5),
      className: r.class_name,
      subjectName: r.subject_name,
      roomName: r.room_name || 'TBA',
    }));
  }

  async getSentMessages(tenantId: string, userId: string) {
    const query = `
      SELECT 
        id,
        recipient_phone,
        message,
        status,
        created_at
      FROM communication_sms_outbox
      WHERE tenant_id::text = $1::text
        AND sent_by = $2
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const { rows: result } = await this.executeSql(query, [tenantId, userId]);
    return result.map(r => ({
      id: r.id,
      date: new Date(r.created_at).toLocaleDateString() + ' ' + new Date(r.created_at).toLocaleTimeString(),
      recipient: r.recipient_phone,
      message: r.message,
      status: r.status,
    }));
  }

  async getClassRegisterOverview(tenantId: string, userId: string) {
    this.requireClassTeacherRegisterRole();
    const query = `
      SELECT 
        s.id as student_id,
        s.admission_number,
        s.first_name || ' ' || s.last_name as name,
        cs.name as class_name,
        COALESCE((
          SELECT COUNT(*)
          FROM academics_attendance a
          WHERE a.student_id::text = s.id::text
            AND a.tenant_id::text = s.tenant_id::text
            AND a.status = 'PRESENT'
        ), 0) as days_present,
        COALESCE((
          SELECT COUNT(*)
          FROM academics_attendance a
          WHERE a.student_id::text = s.id::text
            AND a.tenant_id::text = s.tenant_id::text
        ), 0) as total_attendance_days,
        (
          SELECT status
          FROM academics_attendance a
          WHERE a.student_id::text = s.id::text
            AND a.tenant_id::text = s.tenant_id::text
            AND a.attendance_date::date = CURRENT_DATE
          LIMIT 1
        ) as today_status,
        COALESCE((
          SELECT COUNT(*)
          FROM discipline_incidents di
          WHERE di.student_id::text = s.id::text
            AND di.tenant_id::text = s.tenant_id::text
            AND di.status = 'PENDING'
        ), 0) as active_incidents,
        (
          SELECT AVG(100.0 * m.score / NULLIF(assessment.max_score, 0))
          FROM exam_marks m
          JOIN exam_assessments assessment ON assessment.tenant_id = m.tenant_id AND assessment.id = m.assessment_id
          WHERE m.student_id::text = s.id::text
            AND m.tenant_id::text = s.tenant_id::text
            AND m.score_status = 'entered' AND m.status IN ('submitted', 'reviewed', 'locked', 'published')
        ) as avg_marks
      FROM class_sections cs
      JOIN ${CLASS_TEACHER_APPOINTMENT_SCOPE_SQL} appointment
        ON appointment.tenant_id::text = cs.tenant_id::text
       AND appointment.class_section_id = cs.id::text
      JOIN student_class_assignments sca ON sca.class_section_id::text = cs.id::text AND sca.tenant_id::text = cs.tenant_id::text
      JOIN students s ON s.id::text = sca.student_id::text AND s.tenant_id::text = sca.tenant_id::text
      WHERE cs.tenant_id::text = $1::text
        AND appointment.teacher_user_id::text = $2
        AND appointment.is_active = TRUE
        AND appointment.status = 'active'
        AND appointment.effective_from <= CURRENT_DATE
        AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
        AND sca.status = 'active'
      ORDER BY s.admission_number ASC
    `;
    const { rows: result } = await this.executeSql(query, [tenantId, userId]);
    
    return {
      stats: {
        totalLearners: result.length,
        absentToday: result.filter(r => r.today_status === 'ABSENT').length
      },
      students: result.map(r => {
        const attendancePercent = r.total_attendance_days > 0 
          ? Math.round((r.days_present / r.total_attendance_days) * 100) + "%" 
          : "100%";
        
        let academic = "N/A";
        if (r.avg_marks !== null && r.avg_marks !== undefined) {
          const m = Number(r.avg_marks);
          if (m >= 80) academic = "A";
          else if (m >= 70) academic = "B";
          else if (m >= 60) academic = "C";
          else if (m >= 50) academic = "D";
          else academic = "E";
        }

        return {
          id: r.student_id,
          admissionNo: r.admission_number,
          name: r.name,
          className: r.class_name,
          attendancePercent,
          academic,
          discipline: r.active_incidents > 0 ? "Action Needed" : "Good"
        };
      })
    };
  }

  async getDisciplineConcerns(tenantId: string, userId: string) {
    const query = `
      SELECT 
        di.id,
        di.created_at AS incident_date,
        s.first_name || ' ' || s.last_name as learner_name,
        cs.name as class_name,
        di.title,
        di.severity,
        di.status
      FROM discipline_incidents di
      JOIN students s ON s.id::text = di.student_id::text AND s.tenant_id::text = di.tenant_id::text
      JOIN student_class_assignments sca ON sca.student_id::text = s.id::text AND sca.tenant_id::text = s.tenant_id::text AND sca.status = 'active'
      JOIN class_sections cs ON cs.id::text = sca.class_section_id::text AND cs.tenant_id::text = sca.tenant_id::text
      JOIN ${CLASS_TEACHER_APPOINTMENT_SCOPE_SQL} appointment
        ON appointment.tenant_id::text = sca.tenant_id::text
       AND appointment.class_section_id::text = sca.class_section_id::text
      WHERE di.tenant_id::text = $1::text
        AND di.reporting_staff_id::text = $2
        AND appointment.teacher_user_id::text = $2
        AND appointment.is_active = TRUE
        AND appointment.status = 'active'
        AND appointment.effective_from <= CURRENT_DATE
        AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
      ORDER BY di.created_at DESC
    `;
    const { rows: result } = await this.executeSql(query, [tenantId, userId]);
    
    return result.map(r => ({
      id: r.id,
      date: new Date(r.incident_date).toLocaleDateString(),
      learner: r.learner_name,
      className: r.class_name,
      type: r.category,
      severity: r.severity,
      sentTo: 'Discipline Master',
      status: r.status,
    }));
  }

  async saveDisciplineConcern(tenantId: string, userId: string, payload: any) {
    this.logger.log(`Saving discipline concern for student ${payload.studentId}`);
    await this.assertActiveClassTeacherStudent(tenantId, userId, payload?.studentId);
    
    // Default values if not provided
    const severity = payload.severity || 'medium';
    const actionTaken = payload.actionTaken || 'Pending Review';
    const status = payload.status || 'reported';
    
    await this.executeSql(
      `INSERT INTO discipline_incidents 
        (tenant_id, student_id, category, severity, description, reported_by, action_taken, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        tenantId, 
        payload.studentId, 
        payload.concernType, 
        severity, 
        payload.description, 
        userId, 
        actionTaken,
        status
      ]
    );

    return { success: true };
  }

  async getReportComments(tenantId: string, userId: string) {
    const query = `
      SELECT 
        s.id as student_id,
        s.admission_number,
        s.first_name || ' ' || s.last_name as name,
        rcc.final_comment,
        rcc.comment_status
      FROM class_sections cs
      JOIN ${CLASS_TEACHER_APPOINTMENT_SCOPE_SQL} appointment
        ON appointment.tenant_id::text = cs.tenant_id::text
       AND appointment.class_section_id = cs.id::text
      JOIN student_class_assignments sca ON sca.class_section_id::text = cs.id::text AND sca.tenant_id::text = cs.tenant_id::text
      JOIN students s ON s.id::text = sca.student_id::text AND s.tenant_id::text = sca.tenant_id::text
      LEFT JOIN report_card_comments rcc ON rcc.student_id::text = s.id::text AND rcc.tenant_id::text = s.tenant_id::text
      WHERE cs.tenant_id::text = $1::text
        AND appointment.teacher_user_id::text = $2
        AND appointment.is_active = TRUE
        AND appointment.status = 'active'
        AND appointment.effective_from <= CURRENT_DATE
        AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
        AND sca.status = 'active'
      ORDER BY s.admission_number ASC
    `;
    const { rows: result } = await this.executeSql(query, [tenantId, userId]);
    return result.map(r => ({
      studentId: r.student_id,
      admissionNo: r.admission_number,
      name: r.name,
      comment: r.final_comment || '',
      status: r.comment_status || 'pending',
    }));
  }

  async saveReportComment(tenantId: string, userId: string, data: any) {
    const checkQuery = `
      SELECT id FROM report_card_comments 
      WHERE tenant_id::text = $1::text AND student_id = $2
    `;
    const insertQuery = `
      INSERT INTO report_card_comments (
        tenant_id, student_id, academic_term_id, class_section_id, final_comment, comment_status, created_by_user_id
      ) VALUES (
        $1, $2, 
        (SELECT id FROM academic_terms WHERE tenant_id = $1 AND status = 'active' LIMIT 1),
        (SELECT class_section_id FROM student_class_assignments WHERE tenant_id = $1 AND student_id = $2 AND status = 'active' LIMIT 1),
        $3, 'draft', $4
      )
    `;
    const updateQuery = `
      UPDATE report_card_comments 
      SET final_comment = $3, updated_at = NOW() 
      WHERE tenant_id = $1 AND student_id = $2
    `;
    
    // We would ideally loop over bulk data, but for now we handle a single save or array loop:
    const items = Array.isArray(data) ? data : [data];
    
    for (const item of items) {
      await this.assertActiveClassTeacherStudent(tenantId, userId, item?.studentId);
      const existing = await this.executeSql(checkQuery, [tenantId, item.studentId]);
      if ((existing.rowCount ?? 0) > 0) {
        await this.executeSql(updateQuery, [tenantId, item.studentId, item.comment]);
      } else {
        await this.executeSql(insertQuery, [tenantId, item.studentId, item.comment, userId]);
      }
    }
    
    return { success: true };
  }

  async getAttendance(tenantId: string, userId: string, streamId: string) {
    this.requireClassTeacherRegisterRole();
    await this.assertActiveClassTeacherClass(tenantId, userId, streamId);

    const query = `
      SELECT 
        s.id as "id",
        s.admission_number as "admissionNo",
        s.first_name || ' ' || s.last_name as name,
        COALESCE(aa.status, 'present') as attendance,
        '' as reason
      FROM student_class_assignments sa
      JOIN students s ON s.id::text = sa.student_id::text AND s.tenant_id::text = sa.tenant_id::text
      LEFT JOIN academics_attendance aa ON aa.student_id::text = s.id::text AND aa.tenant_id::text = s.tenant_id::text AND aa.attendance_date::date = CURRENT_DATE
      WHERE sa.tenant_id::text = $1::text
        AND sa.class_section_id = $2
        AND sa.status = 'active'
      ORDER BY s.first_name ASC
    `;
    const { rows: result } = await this.executeSql(query, [tenantId, streamId]);
    return result;
  }

  async saveAttendance(tenantId: string, userId: string, streamId: string, records: any[]) {
    this.requireClassTeacherRegisterRole();
    const submittedRecords = Array.isArray(records) ? records : [];
    this.logger.log(`Saving ${submittedRecords.length} attendance records for class/stream ${streamId}`);
    await this.assertActiveClassTeacherClass(tenantId, userId, streamId);
    
    if (submittedRecords.length === 0) {
      return { success: true, count: 0 };
    }

    const normalizedRecords = submittedRecords.map((record) => ({
      studentId: this.requireText(record?.studentId ?? record?.id, 'Learner'),
      status: String(record?.status ?? record?.attendance ?? 'present').trim().toLowerCase(),
    }));
    const allowedStatuses = new Set(['present', 'absent', 'late', 'excused']);
    const uniqueStudentIds = new Set(normalizedRecords.map((record) => record.studentId));
    if (uniqueStudentIds.size !== normalizedRecords.length) {
      throw new BadRequestException('Each learner may appear only once in an attendance register.');
    }
    if (normalizedRecords.some((record) => !allowedStatuses.has(record.status))) {
      throw new BadRequestException('Attendance status must be present, absent, late, or excused.');
    }

    const activeStudents = await this.executeSql<{ student_id: string }>(
      `SELECT student_id::text
       FROM student_class_assignments
       WHERE tenant_id::text = $1::text
         AND class_section_id = $2
         AND status = 'active'
         AND student_id::text = ANY($3::text[])
`,
      [tenantId, streamId, [...uniqueStudentIds]],
    );
    const activeStudentIds = new Set(activeStudents.rows.map((row) => String(row.student_id)));
    if (activeStudentIds.size !== uniqueStudentIds.size) {
      throw new ForbiddenException('Attendance includes a learner outside this active class register.');
    }

    const today = new Date().toISOString().split('T')[0];

    let paramIndex = 4;
    const values = normalizedRecords.map(() => {
       const str = `($1, $2, $3, $${paramIndex}, $${paramIndex+1}, $${paramIndex+2})`;
       paramIndex += 3;
       return str;
    }).join(', ');

    const params: any[] = [tenantId, streamId, today];
    normalizedRecords.forEach((record) => {
      params.push(record.studentId, record.status, userId);
    });

    const insertQuery = `
      INSERT INTO academics_attendance (tenant_id, class_id, attendance_date, student_id, status, submitted_by)
      VALUES ${values}
    `;

    await this.prisma.executeWithTenant(tenantId, userId, async (tx: any) => {
      await tx.$executeRawUnsafe(
        `DELETE FROM academics_attendance WHERE tenant_id = $1 AND class_id = $2 AND attendance_date = $3`,
        tenantId,
        streamId,
        today,
      );
      await tx.$executeRawUnsafe(insertQuery, ...params);
    });

    const presentCount = normalizedRecords.filter((record) => record.status === 'present').length;
    const absentCount = normalizedRecords.length - presentCount;

    await this.eventPublisherService.publishAttendanceRegisterMarked({
      tenant_id: tenantId,
      stream_id: streamId,
      marked_by_user_id: userId,
      date: today,
      present_count: presentCount,
      absent_count: absentCount,
    });

    return { success: true, count: normalizedRecords.length };
  }

  async reportDisciplineIncident(tenantId: string, userId: string, streamId: string, payload: any) {
    await this.assertCurrentRoleAssignedClass(tenantId, userId, streamId);
    await this.assertStudentBelongsToStream(tenantId, streamId, payload.studentId);
    this.logger.log(`Reported discipline incident for student ${payload.studentId}`);
    
    const query = `
      INSERT INTO discipline_incidents (tenant_id, student_id, category, severity, description, status, reported_by)
      VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
      RETURNING id
    `;
    const { rows } = await this.executeSql(query, [
      tenantId, 
      payload.studentId, 
      payload.category || payload.issue || 'Other', 
      payload.severity || 'low', 
      payload.description || '', 
      userId
    ]);
    
    await this.eventPublisherService.publishDisciplineIncidentReported({
      tenant_id: tenantId,
      incident_id: rows[0].id,
      student_id: payload.studentId,
      reported_by_user_id: userId,
      date: new Date().toISOString().split('T')[0],
      description: payload.description,
      severity: payload.severity || 'low',
    });

    return { success: true, incidentId: rows[0].id };
  }

  async saveMarks(
    tenantId: string,
    userId: string,
    payload: SaveTeacherMarksDto,
    assistedActorUserId?: string,
  ) {
    if (assistedActorUserId) {
      const scope = requireAssistedMarkEntryScope(this.requestContext?.getStore());
      if (scope.tenantId !== tenantId || scope.actorUserId !== assistedActorUserId) {
        throw new ForbiddenException('Assisted mark entry must use the authenticated school and editor.');
      }
    }
    this.logger.log(`Saving marks for exam window ${payload.examId}`);

    if (!this.examsService) {
      throw new ServiceUnavailableException(
        'The governed exams workflow is unavailable. Retry after the exams module is initialized.',
      );
    }

    const action = payload.action === 'submit' ? 'submit' : 'draft';
    if (!payload.examId || !payload.classSectionId) {
      throw new BadRequestException(
        'Exam window and class section are required before saving marks.',
      );
    }

    const windowQuery = `
      SELECT DISTINCT
        w.id,
        w.exam_series_id,
        w.class_section_id,
        w.subject_id,
        es.academic_term_id,
        es.name AS exam_name,
        cs.name AS class_name,
        subject.name AS subject_name,
        assessment.id AS assessment_id,
        (SELECT COUNT(*) FROM exam_assessments paper
          WHERE paper.tenant_id = w.tenant_id AND paper.exam_series_id = w.exam_series_id
            AND paper.subject_id = w.subject_id) AS assessment_count,
        COALESCE(assessment.max_score, 100) AS out_of
      FROM exam_mark_entry_windows w
      JOIN exam_series es
        ON es.id::text = w.exam_series_id::text
       AND es.tenant_id::text = w.tenant_id::text
      JOIN class_sections cs
        ON cs.id = w.class_section_id::text
       AND cs.tenant_id::text = w.tenant_id::text
      JOIN subjects subject
        ON subject.id = w.subject_id::text
       AND subject.tenant_id::text = w.tenant_id::text
      JOIN teacher_subject_assignments tsa
        ON tsa.tenant_id::text = w.tenant_id::text
       AND (tsa.academic_term_id IS NULL OR tsa.academic_term_id = es.academic_term_id::text)
       AND tsa.class_section_id = w.class_section_id::text
       AND tsa.subject_id = w.subject_id::text
       AND tsa.teacher_user_id = $3
       AND tsa.status = 'active'
       AND tsa.mark_entry_allowed = TRUE
       AND tsa.effective_from <= CURRENT_DATE
       AND (tsa.effective_to IS NULL OR tsa.effective_to >= CURRENT_DATE)
      JOIN LATERAL (
        SELECT ea.id, ea.max_score
        FROM exam_assessments ea
        WHERE ea.tenant_id::text = w.tenant_id::text
          AND ea.exam_series_id::text = w.exam_series_id::text
          AND ea.subject_id::text = w.subject_id::text
          AND ($5::text IS NULL OR ea.id::text = $5::text)
      ) assessment ON TRUE
      WHERE w.id = $2
        AND w.tenant_id = $1
        AND w.class_section_id = $4
        AND NOT ${teacherMarkSheetSubmittedSql('w', 'es', 'assessment.id', '$3')}
        AND ${markEntryAccessSql('w', 'es', '$3')}
    `;
    const { rows: windows } = await this.executeSql(windowQuery, [
      tenantId,
      payload.examId,
      userId,
      payload.classSectionId,
      payload.assessmentId?.trim() || null,
    ]);
    if (windows.length === 0) {
      throw new BadRequestException(
        'Exam window is closed, invalid, or not assigned to this teacher.',
      );
    }

    if (windows.length > 1 || (!payload.assessmentId && Number(windows[0].assessment_count) > 1)) {
      throw new BadRequestException('Select the assessment paper before saving marks.');
    }

    const window = windows[0];
    const rawMarks: Record<string, TeacherMarkInput> = payload.marks
      ? payload.marks
      : Object.fromEntries(
          Object.entries(payload.scores ?? {}).map(([studentId, score]) => [
            studentId,
            {
              score,
              score_status: score === '' || score === null ? undefined : 'entered',
              remarks: payload.remarks?.[studentId],
            },
          ]),
        );
    const rows: BulkExamMarkUploadRowDto[] = [];

    for (const [studentId, rawEntry] of Object.entries(rawMarks)) {
      const entry = rawEntry && typeof rawEntry === 'object'
        ? rawEntry
        : { score: rawEntry as number | string | null };
      const rawScore = entry.score;
      const hasScore = rawScore !== undefined && rawScore !== null && rawScore !== '';
      const scoreStatus = entry.score_status
        ?? (hasScore ? 'entered' : undefined);

      // Blank legacy cells stay unsaved drafts. Submission will report them as missing.
      if (!scoreStatus && !hasScore && !entry.remarks?.trim()) {
        continue;
      }
      if (!scoreStatus || !EXAM_SCORE_STATUSES.includes(scoreStatus as ExamScoreStatus)) {
        throw new BadRequestException(
          `Select a valid score status for learner ${studentId}.`,
        );
      }

      let score: number | null = null;
      if (scoreStatus === 'entered') {
        if (!hasScore || (typeof rawScore !== 'number' && typeof rawScore !== 'string')
          || (typeof rawScore === 'string' && !rawScore.trim())) {
          throw new BadRequestException(`Enter a valid numeric score for learner ${studentId}.`);
        }
        score = Number(rawScore);
        if (!Number.isFinite(score)) {
          throw new BadRequestException(
            `Enter a valid numeric score for learner ${studentId}.`,
          );
        }
      }

      rows.push({
        row_number: rows.length + 1,
        exam_series_id: window.exam_series_id,
        assessment_id: window.assessment_id,
        academic_term_id: window.academic_term_id,
        class_section_id: window.class_section_id,
        subject_id: window.subject_id,
        student_id: studentId,
        score,
        score_status: scoreStatus,
        remarks: entry.remarks?.trim() || undefined,
      });
    }

    if (rows.length === 0) {
      throw new BadRequestException(
        'Enter at least one learner score or explicit evidence status before saving marks.',
      );
    }

    const result = await this.examsService.saveTeacherMarkEntries(
      rows,
      window.id,
      action === 'submit',
      ...(assistedActorUserId ? [userId] : []),
    );

    if (action === 'submit') {
      try {
        await this.eventPublisherService.publishExamSubmitted({
          tenant_id: tenantId,
          exam_id: window.exam_series_id,
          exam_name: window.exam_name,
          class_name: window.class_name,
          stream_name: window.class_name,
          submitted_by_user_id: assistedActorUserId ?? userId,
          submitted_at: new Date().toISOString(),
          completion_status: 'SUBMITTED',
          missing_marks_count: 0,
        });
      } catch (error) {
        this.logger.error(`Failed to publish exam submission event: ${error}`);
      }
    }

    return {
      success: true,
      action,
      status: result.data.status,
      savedCount: result.data.saved_count,
      submittedCount: result.data.submitted_count,
      markIds: result.data.mark_ids,
    };
  }

  async referWelfareCase(tenantId: string, userId: string, streamId: string, payload: any) {
    await this.assertCurrentRoleAssignedClass(tenantId, userId, streamId);
    await this.assertStudentBelongsToStream(tenantId, streamId, payload.studentId);
    this.logger.log(`Referred welfare case for student ${payload.studentId}`);

    const description = payload.reason || payload.description || '';
    const category = payload.category || 'Welfare';
    const { rows } = await this.executeSql(
      `INSERT INTO student_welfare_cases (tenant_id, student_id, category, description, status, reported_by)
       VALUES ($1, $2, $3, $4, 'OPEN', $5)
       RETURNING id`,
      [tenantId, payload.studentId, category, description, userId],
    );
    const referralId = rows[0].id;
    
    await this.eventPublisherService.publishWelfareCaseReferred({
      tenant_id: tenantId,
      referral_id: referralId,
      student_id: payload.studentId,
      referred_by_user_id: userId,
      date: new Date().toISOString().split('T')[0],
      reason: description,
    });

    return { success: true, referralId };
  }

  async getProgress(tenantId: string, userId: string, streamId: string) {
    await this.assertCurrentRoleAssignedClass(tenantId, userId, streamId);

    const scoreRes = await this.executeSql(
      `SELECT COALESCE(ROUND(AVG(score), 2), 0)::numeric as avg FROM exam_marks WHERE tenant_id::text = $1::text AND class_section_id = $2`,
      [tenantId, streamId]
    );

    return {
      classMean: `${scoreRes.rows[0]?.avg || 0}%`,
      classGrade: "N/A",
      missingMarksSubjects: 0,
      topPerformer: "N/A",
      learnersBelowTarget: 0
    };
  }

  async getComments(tenantId: string, userId: string, streamId: string) {
    await this.assertActiveClassTeacherClass(tenantId, userId, streamId);

    const query = `
      SELECT 
        s.id,
        s.first_name || ' ' || s.last_name as name,
        'N/A' as mean,
        'N/A' as grade,
        'N/A' as position,
        COALESCE(rcc.final_comment, '') as comment
      FROM student_class_assignments sca
      JOIN students s ON s.id::text = sca.student_id::text AND s.tenant_id::text = sca.tenant_id::text
      LEFT JOIN report_card_comments rcc ON rcc.student_id::text = s.id::text AND rcc.tenant_id::text = s.tenant_id::text
      WHERE sca.tenant_id::text = $1::text AND sca.class_section_id = $2
    `;
    const { rows } = await this.executeSql(query, [tenantId, streamId]);
    return rows;
  }

  async getDiscipline(tenantId: string, userId: string, streamId: string) {
    await this.assertCurrentRoleAssignedClass(tenantId, userId, streamId);

    const query = `
      SELECT 
        di.id,
        di.created_at as date,
        s.first_name || ' ' || s.last_name as learner,
        di.title as issue,
        di.severity,
        di.status
      FROM discipline_incidents di
      JOIN students s ON s.id::text = di.student_id::text AND s.tenant_id::text = di.tenant_id::text
      JOIN student_class_assignments sca ON sca.student_id::text = s.id::text AND sca.tenant_id::text = s.tenant_id::text AND sca.status = 'active'
      WHERE di.tenant_id::text = $1::text
        AND sca.class_section_id = $2
      ORDER BY di.created_at DESC
    `;
    const { rows: result } = await this.executeSql(query, [tenantId, streamId]);
    return result.map(r => ({
      ...r,
      date: new Date(r.date).toLocaleDateString()
    }));
  }

  async getWelfare(tenantId: string, userId: string, streamId: string) {
    await this.assertCurrentRoleAssignedClass(tenantId, userId, streamId);

    const query = `
      SELECT 
        sw.id,
        sw.created_at as date,
        s.first_name || ' ' || s.last_name as learner,
        sw.description as concern,
        'Medium' as priority,
        sw.status
      FROM student_welfare_cases sw
      JOIN students s ON s.id::text = sw.student_id::text AND s.tenant_id::text = sw.tenant_id::text
      JOIN student_class_assignments sca ON sca.student_id::text = s.id::text AND sca.tenant_id::text = s.tenant_id::text AND sca.status = 'active'
      WHERE sw.tenant_id::text = $1::text AND sca.class_section_id = $2
      ORDER BY sw.created_at DESC
    `;
    const { rows } = await this.executeSql(query, [tenantId, streamId]);
    return rows.map(r => ({ ...r, date: new Date(r.date).toLocaleDateString() }));
  }

  async getStreamTimetable(tenantId: string, userId: string, streamId: string) {
    await this.assertCurrentRoleAssignedClass(tenantId, userId, streamId);

    const teacherFilter = this.isClassTeacherMode() ? '' : 'AND teacher_id::text = $3';

    const query = `
      SELECT 
        id,
        CASE day_of_week
          WHEN 1 THEN 'Monday'
          WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday'
          WHEN 4 THEN 'Thursday'
          WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
          WHEN 7 THEN 'Sunday'
        END as day,
        to_char(starts_at, 'HH24:MI') || ' - ' || to_char(ends_at, 'HH24:MI') as time,
        subject_id as subject,
        teacher_id as teacher,
        room_id as room
      FROM timetable_slots
      WHERE tenant_id::text = $1::text AND class_section_id = $2 ${teacherFilter}
      ORDER BY day_of_week, starts_at
    `;
    const params = this.isClassTeacherMode() ? [tenantId, streamId] : [tenantId, streamId, userId];
    const { rows } = await this.executeSql(query, params);
    return rows;
  }

  async getSubjects(tenantId: string, userId: string, streamId: string) {
    await this.assertCurrentRoleAssignedClass(tenantId, userId, streamId);

    const teacherFilter = this.isClassTeacherMode() ? '' : 'AND teacher_id::text = $3';

    const query = `
      SELECT 
        subject_id as id,
        subject_id as subject,
        teacher_id as teacher,
        COUNT(id) as "lessonsPerWeek"
      FROM timetable_slots
      WHERE tenant_id::text = $1::text AND class_section_id = $2 ${teacherFilter}
      GROUP BY subject_id, teacher_id
    `;
    const params = this.isClassTeacherMode() ? [tenantId, streamId] : [tenantId, streamId, userId];
    const { rows } = await this.executeSql(query, params);
    return rows.map(r => ({
      ...r,
      lessonsPerWeek: Number(r.lessonsPerWeek)
    }));
  }

  async getCommunication(tenantId: string, userId: string, streamId: string) {
    await this.assertCurrentRoleAssignedClass(tenantId, userId, streamId);

    const query = `
      SELECT 
        id,
        'SMS' as type,
        recipient_phone as recipient,
        created_at as date,
        message as content,
        status
      FROM communication_sms_outbox
      WHERE tenant_id::text = $1::text AND sent_by::text = $2
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const { rows } = await this.executeSql(query, [tenantId, userId]);
    return rows.map(r => ({ ...r, date: new Date(r.date).toLocaleDateString() }));
  }

  async getHomework(tenantId: string, userId: string, streamId: string) {
    if (streamId) {
      await this.assertCurrentRoleAssignedClass(tenantId, userId, streamId);
    }

    const query = `
      SELECT 
        a.id,
        a.title,
        a.description,
        a.stream_id AS "streamId",
        a.max_score AS "maxScore",
        a.created_at::text AS "createdAt",
        (SELECT COUNT(DISTINCT placement.student_id)::int FROM student_class_assignments placement
          WHERE placement.tenant_id = a.tenant_id AND placement.class_section_id::text = a.class_id
            AND placement.status = 'active' AND (a.stream_id IS NULL OR placement.stream_id::text = a.stream_id)) AS total,
        (SELECT COUNT(*)::int FROM academics_assignment_submissions submission
          WHERE submission.tenant_id = a.tenant_id AND submission.assignment_id::text = a.id::text
            AND submission.status IN ('submitted', 'completed', 'graded')) AS submitted,
        (SELECT COUNT(*)::int FROM academics_assignment_submissions submission
          WHERE submission.tenant_id = a.tenant_id AND submission.assignment_id::text = a.id::text AND submission.status = 'graded') AS graded,
        cs.name as "className",
        s.name as subject,
        a.due_date as "dueDate",
        a.status
      FROM academics_assignments a
      JOIN class_sections cs ON cs.id::text = a.class_id AND cs.tenant_id::text = a.tenant_id::text
      JOIN subjects s ON s.id::text = a.subject_id AND s.tenant_id::text = a.tenant_id::text
      WHERE a.tenant_id::text = $1::text ${streamId ? 'AND a.class_id = $2' : ''} AND a.teacher_id = ${streamId ? '$3' : '$2'}
      ORDER BY a.due_date DESC
    `;
    const params = streamId ? [tenantId, streamId, userId] : [tenantId, userId];
    const { rows } = await this.executeSql(query, params);
    return rows.map((r: any) => ({ ...r, dueDate: new Date(r.dueDate).toLocaleDateString() }));
  }

  async saveHomework(tenantId: string, userId: string, payload: any) {
    const title = this.requireText(payload?.title, 'Assignment title');
    const classId = this.requireText(payload?.classId, 'Assigned class');
    const subjectId = this.requireText(payload?.subjectId, 'Assigned subject');
    const dueDate = this.requireText(payload?.dueDate, 'Due date');
    const description = typeof payload?.description === 'string' ? payload.description.trim() : '';
    const streamId = typeof payload?.streamId === 'string' && payload.streamId.trim() ? payload.streamId.trim() : null;
    const maxScore = payload?.maxScore ?? 100;
    if (!Number.isFinite(maxScore) || maxScore < 1 || maxScore > 10000) throw new BadRequestException('Total marks must be between 1 and 10000.');
    if (!Number.isFinite(Date.parse(dueDate))) throw new BadRequestException('Enter a valid due date.');
    const sourceRole = this.isClassTeacherMode() ? 'class_teacher' : 'teacher';

    await this.assertTeacherAssignedClassSubject(tenantId, userId, classId, subjectId);

    const { rows } = await this.executeSql<{
      assignment_id: string | null;
      workflow_event_id: string | null;
      student_notification_count: number;
      guardian_notification_count: number;
      audits_created: number;
    }>(
      `
        WITH authorized_assignment AS (
          SELECT assignment.id
          FROM teacher_subject_assignments assignment
          WHERE assignment.tenant_id = $1
            AND assignment.teacher_user_id::text = $7::text
            AND assignment.class_section_id::text = $4
            AND assignment.subject_id::text = $5
            AND (assignment.stream_id IS NULL OR assignment.stream_id::text = $9)
            AND ($9::text IS NULL OR EXISTS (
              SELECT 1 FROM class_streams stream WHERE stream.tenant_id::text = $1::text
                AND stream.id::text = $9 AND stream.class_section_id::text = $4
            ))
            AND LOWER(assignment.status) = 'active'
            AND assignment.effective_from <= CURRENT_DATE
            AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
          LIMIT 1
        ), inserted_assignment AS (
          INSERT INTO academics_assignments (
            tenant_id, title, description, class_id, subject_id, due_date, teacher_id, status, stream_id, max_score
          )
          SELECT $1, $2, $3, $4, $5, $6::timestamptz, $7::uuid, 'Published', $9::text, $10::numeric
          FROM authorized_assignment
          RETURNING id, tenant_id, class_id, subject_id, due_date, stream_id
        ), assigned_students AS (
          SELECT DISTINCT student.id
          FROM inserted_assignment homework
          INNER JOIN student_class_assignments class_assignment
            ON class_assignment.tenant_id = homework.tenant_id
           AND class_assignment.class_section_id::text = homework.class_id
           AND (homework.stream_id IS NULL OR class_assignment.stream_id::text = homework.stream_id)
           AND LOWER(class_assignment.status) = 'active'
          INNER JOIN students student
            ON student.tenant_id = class_assignment.tenant_id
           AND student.id::text = class_assignment.student_id::text
           AND student.deleted_at IS NULL
           AND LOWER(COALESCE(student.status, 'active')) IN ('active', 'admitted', 'enrolled')
        ), student_recipients AS (
          SELECT DISTINCT portal.user_id, student.id AS student_id
          FROM assigned_students student
          INNER JOIN student_portal_access portal
            ON portal.tenant_id = $1
           AND portal.student_id::text = student.id::text
           AND LOWER(portal.status) = 'active'
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = portal.tenant_id
           AND membership.user_id = portal.user_id
           AND LOWER(membership.status) = 'active'
          WHERE portal.user_id IS NOT NULL
        ), guardian_recipients AS (
          SELECT DISTINCT ON (guardian.user_id)
            guardian.id AS guardian_id,
            guardian.user_id
          FROM assigned_students student
          INNER JOIN student_guardians guardian
            ON guardian.tenant_id = $1
           AND guardian.student_id::text = student.id::text
           AND LOWER(guardian.status) = 'active'
           AND guardian.user_id IS NOT NULL
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = guardian.tenant_id
           AND membership.user_id = guardian.user_id
           AND LOWER(membership.status) = 'active'
          ORDER BY guardian.user_id, guardian.is_primary DESC, guardian.created_at ASC
        ), inserted_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type,
            entity_type, entity_id, title, message, payload, status, priority
          )
          SELECT
            homework.tenant_id,
            $7::uuid,
            $8,
            '[]'::jsonb,
            'class_teacher.homework_published',
            'assignment',
            homework.id::text,
            'Homework assignment published',
            'A homework assignment was published to exact active class recipients.',
            jsonb_build_object(
              'assignment_id', homework.id::text,
              'class_id', homework.class_id,
              'subject_id', homework.subject_id,
              'due_date', homework.due_date,
              'recipient_scope', 'exact_active_class_accounts',
              'student_recipient_count', (SELECT COUNT(*) FROM student_recipients),
              'guardian_recipient_count', (SELECT COUNT(*) FROM guardian_recipients),
              'source_dashboard', 'class-teacher-homework'
            ),
            'published',
            'normal'
          FROM inserted_assignment homework
          RETURNING id, entity_id
        ), inserted_student_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, type, title, body,
            status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            'class-teacher-homework-' || event.entity_id || '-student-' || recipient.user_id::text,
            recipient.user_id,
            'class_teacher.homework_published',
            $2,
            $2 || ' is due on ' || $6 || '.',
            'unread',
            'normal',
            'class-teacher-homework',
            event.entity_id,
            jsonb_build_object(
              'assignment_id', event.entity_id,
              'student_id', recipient.student_id::text,
              'recipient_scope', 'exact_active_student_account',
              'source_dashboard', 'class-teacher-homework'
            )
          FROM inserted_event event
          CROSS JOIN student_recipients recipient
          ON CONFLICT (tenant_id, notification_key)
          DO UPDATE SET
            recipient_user_id = EXCLUDED.recipient_user_id,
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            status = 'unread',
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING id
        ), inserted_guardian_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id,
            type, title, body, status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            'class-teacher-homework-' || event.entity_id || '-guardian-' || recipient.user_id::text,
            recipient.user_id,
            'class_teacher.homework_published',
            $2,
            $2 || ' is due on ' || $6 || '.',
            'unread',
            'normal',
            'class-teacher-homework',
            event.entity_id,
            jsonb_build_object(
              'assignment_id', event.entity_id,
              'recipient_scope', 'exact_active_linked_guardian_account',
              'guardian_link_id', recipient.guardian_id,
              'source_dashboard', 'class-teacher-homework'
            )
          FROM inserted_event event
          CROSS JOIN guardian_recipients recipient
          ON CONFLICT (tenant_id, notification_key)
          DO UPDATE SET
            recipient_user_id = EXCLUDED.recipient_user_id,
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            status = 'unread',
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING id
        ), action_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1,
            $7::uuid,
            current_setting('app.request_id', true),
            'class_teacher.homework_published',
            'assignment',
            homework.id::uuid,
            jsonb_build_object(
              'class_id', homework.class_id,
              'subject_id', homework.subject_id,
              'recipient_scope', 'exact_active_class_accounts',
              'student_notification_count', (SELECT COUNT(*) FROM inserted_student_notifications),
              'guardian_notification_count', (SELECT COUNT(*) FROM inserted_guardian_notifications),
              'source_role', $8::text
            )
          FROM inserted_assignment homework
          RETURNING id
        )
        SELECT
          homework.id::text AS assignment_id,
          (SELECT id::text FROM inserted_event LIMIT 1) AS workflow_event_id,
          (SELECT COUNT(*)::int FROM inserted_student_notifications) AS student_notification_count,
          (SELECT COUNT(*)::int FROM inserted_guardian_notifications) AS guardian_notification_count,
          (SELECT COUNT(*)::int FROM action_audit) AS audits_created
        FROM inserted_assignment homework
      `,
      [
        tenantId,
        title,
        description,
        classId,
        subjectId,
        dueDate,
        userId,
        sourceRole,
        streamId,
        maxScore,
      ],
    );

    const persisted = rows[0];
    if (!persisted?.assignment_id || !persisted.workflow_event_id || Number(persisted.audits_created) !== 1) {
      throw new ForbiddenException('This class and subject are no longer active in your teaching assignments.');
    }

    return {
      success: true,
      assignmentId: persisted.assignment_id,
      studentNotificationCount: Number(persisted.student_notification_count ?? 0),
      guardianNotificationCount: Number(persisted.guardian_notification_count ?? 0),
    };
  }

  async getLessonLogs(tenantId: string, userId: string, _streamId?: string) {
    const { rows } = await this.executeSql(`
      SELECT log.id, log.log_date AS date, CONCAT_WS(' — ', section.name, stream.name) AS class,
        COALESCE(subject.name, 'General') AS subject, log.covered_topics AS topics,
        log.challenges AS reason, log.student_understanding_notes AS notes,
        CASE WHEN log.lesson_status = 'not_taught' THEN 'Not taught' ELSE 'Taught' END AS status
      FROM academics_lesson_logs log
      JOIN class_sections section ON section.tenant_id::text = log.tenant_id::text AND section.id::text = log.class_id::text
      LEFT JOIN subjects subject ON subject.tenant_id::text = log.tenant_id::text AND subject.id::text = log.subject_id::text
      LEFT JOIN class_streams stream ON stream.tenant_id::text = log.tenant_id::text AND stream.id::text = log.stream_id
      WHERE log.tenant_id::text = $1 AND log.teacher_id::text = $2 ORDER BY log.log_date DESC, log.created_at DESC LIMIT 500
    `, [tenantId, userId]);
    return rows.map(row => ({ ...row, date: new Date(row.date).toLocaleDateString('en-KE') }));
  }

  async saveLessonLog(tenantId: string, userId: string, payload: any) {
    const classId = this.requireText(payload?.classId, 'Assigned class');
    const subjectId = this.requireText(payload?.subjectId, 'Assigned subject');
    const streamId = typeof payload.streamId === 'string' && payload.streamId.trim() ? payload.streamId.trim() : null;
    const status = payload.lessonStatus ?? 'taught';
    if (!['taught','not_taught'].includes(status)) throw new BadRequestException('Select whether the lesson was taught.');
    const topics = status === 'taught' ? this.requireText(payload.topics, 'Topics covered') : '';
    const reason = status === 'not_taught' ? this.requireText(payload.challenges, 'Reason the lesson was not taught') : (payload.challenges ?? '');
    const date = payload.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || date > new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })) throw new BadRequestException('Enter a valid lesson date that is not in the future.');
    const { rows } = await this.executeSql(`
      WITH allocation AS (
        SELECT id FROM teacher_subject_assignments WHERE tenant_id::text = $1 AND teacher_user_id::text = $2
          AND class_section_id::text = $3 AND subject_id::text = $4 AND (stream_id IS NULL OR stream_id::text = $5)
          AND status = 'active' AND lesson_record_allowed = TRUE AND effective_from <= $6::date
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
          AND ($5::text IS NULL OR EXISTS (SELECT 1 FROM class_streams stream WHERE stream.tenant_id::text=$1 AND stream.class_section_id::text=$3 AND stream.id::text=$5))
        LIMIT 1
      ), saved AS (
        INSERT INTO academics_lesson_logs(tenant_id, teacher_id, class_id, subject_id, stream_id, log_date, covered_topics, student_understanding_notes, challenges, lesson_status)
        SELECT $1, $2::uuid, $3, $4, $5, $6::date, $7, $8, $9, $10 FROM allocation RETURNING *
      ), audited AS (
        INSERT INTO academic_audit_logs(school_id,tenant_id,entity_type,entity_id,action,actor_user_id,actor_role,new_values,correlation_id)
        SELECT $1,$1,'lesson_log',id::text,'lesson.recorded',$2::uuid,$11,to_jsonb(saved),$12 FROM saved RETURNING id
      ), emitted AS (
        INSERT INTO workflow_events(id,tenant_id,source_user_id,source_role,target_roles,event_type,entity_type,entity_id,title,message,payload,status)
        SELECT $12::uuid,$1,$2::uuid,$11,'[]'::jsonb,'lesson.recorded','lesson_log',id::text,'Lesson recorded','Teacher recorded lesson delivery.',
          jsonb_build_object('event_id',$12,'correlation_id',$12,'school_id',$1,'actor_user_id',$2,'actor_role',$11,'entity_id',id::text,'entity_type','lesson_log','lesson_status',$10,'date',$6,'source_dashboard','teacher','timestamp',NOW()),'published'
        FROM saved RETURNING id
      ) SELECT id::text FROM saved
    `, [tenantId,userId,classId,subjectId,streamId,date,topics,payload.notes || '',reason,status,this.isClassTeacherMode() ? 'class_teacher' : 'teacher',randomUUID()]);
    if (!rows.length) throw new ForbiddenException('This class and subject are not active in your teaching allocation or lesson recording is disabled.');
    return { success: true, id: rows[0].id };
  }

  async getTasks(tenantId: string, userId: string, streamId: string) {
    const query = `
      SELECT 
        id,
        title as task,
        due_date as "dueDate",
        status
      FROM school_tasks
      WHERE tenant_id::text = $1::text AND assigned_to = $2
      ORDER BY due_date ASC
    `;
    const { rows } = await this.executeSql(query, [tenantId, userId]);
    return rows.map(r => ({ ...r, dueDate: r.dueDate ? new Date(r.dueDate).toLocaleDateString() : 'N/A' }));
  }

  async getHealth(tenantId: string, userId: string, streamId: string) {
    await this.assertActiveClassTeacherClass(tenantId, userId, streamId);

    const query = `
      SELECT 
        cv.id,
        cv.created_at as date,
        s.first_name || ' ' || s.last_name as learner,
        cv.symptoms_summary as issue,
        cv.treatment_summary as action,
        cv.status
      FROM clinic_visits cv
      JOIN students s ON s.id::text = cv.student_id::text AND s.tenant_id::text = cv.tenant_id::text
      JOIN student_class_assignments sca ON sca.student_id::text = s.id::text AND sca.tenant_id::text = s.tenant_id::text AND sca.status = 'active'
      WHERE cv.tenant_id::text = $1::text AND sca.class_section_id = $2
      ORDER BY cv.created_at DESC
    `;
    const { rows } = await this.executeSql(query, [tenantId, streamId]);
    return rows.map(r => ({ ...r, date: new Date(r.date).toLocaleDateString() }));
  }

  async getMeetings(tenantId: string, userId: string, streamId: string) {
    await this.assertActiveClassTeacherClass(tenantId, userId, streamId);

    const query = `
      WITH active_class_scope AS (
        SELECT DISTINCT appointment.class_section_id::text AS class_section_id
        FROM ${CLASS_TEACHER_APPOINTMENT_SCOPE_SQL} appointment
        WHERE appointment.tenant_id::text = $1::text
          AND appointment.teacher_user_id = $2::uuid
          AND appointment.is_active = TRUE
          AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
          AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
          AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
      )
      SELECT 
        meeting.id,
        meeting.start_time as date,
        to_char(meeting.start_time, 'HH24:MI') as time,
        COALESCE(NULLIF(TRIM(meeting.description), ''), 'Meeting context was not recorded') as parent,
        meeting.title as agenda,
        meeting.status
      FROM school_meetings meeting
      LEFT JOIN LATERAL (
        SELECT event.payload
        FROM workflow_events event
        WHERE event.tenant_id::text = meeting.tenant_id::text
          AND event.entity_type = 'school_meeting'
          AND event.entity_id = meeting.id::text
          AND event.event_type = 'class_teacher.meeting_scheduled'
        ORDER BY event.created_at DESC
        LIMIT 1
      ) meeting_scope ON TRUE
      WHERE meeting.tenant_id::text = $1::text
        AND meeting.organizer_id = $2::uuid
        AND (
          meeting_scope.payload->>'class_section_id' = $3
          OR (
            NULLIF(meeting_scope.payload->>'class_section_id', '') IS NULL
            AND (SELECT COUNT(*) FROM active_class_scope) = 1
            AND EXISTS (
              SELECT 1 FROM active_class_scope scope WHERE scope.class_section_id = $3
            )
          )
        )
      ORDER BY meeting.start_time DESC
    `;
    const { rows } = await this.executeSql(query, [tenantId, userId, streamId]);
    return rows.map(r => ({ ...r, date: new Date(r.date).toLocaleDateString() }));
  }

  async getRequests(tenantId: string, userId: string, streamId: string) {
    await this.assertActiveClassTeacherClass(tenantId, userId, streamId);

    const query = `
      SELECT 
        r.id,
        r.created_at as date,
        s.first_name || ' ' || s.last_name as learner,
        r.request_type as type,
        r.status,
        r.requested_by as "requestedBy"
      FROM student_requests r
      JOIN students s ON s.id::text = r.student_id::text AND s.tenant_id::text = r.tenant_id::text
      JOIN student_class_assignments sca ON sca.student_id::text = s.id::text AND sca.tenant_id::text = s.tenant_id::text AND sca.status = 'active'
      WHERE r.tenant_id::text = $1::text AND sca.class_section_id = $2
      ORDER BY r.created_at DESC
    `;
    const { rows } = await this.executeSql(query, [tenantId, streamId]);
    return rows.map(r => ({ ...r, date: new Date(r.date).toLocaleDateString() }));
  }

  async getDocuments(tenantId: string, userId: string, streamId: string) {
    await this.assertCurrentRoleAssignedClass(tenantId, userId, streamId);

    const query = `
      SELECT 
        id,
        title,
        type,
        created_at as "uploadedAt",
        'Unknown' as size
      FROM academics_resources
      WHERE tenant_id::text = $1::text AND class_id = $2
      ORDER BY created_at DESC
    `;
    const { rows } = await this.executeSql(query, [tenantId, streamId]);
    return rows.map(r => ({ ...r, uploadedAt: new Date(r.uploadedAt).toLocaleDateString() }));
  }

  async getNotifications(tenantId: string, userId: string, streamId: string) {
    const res = await this.executeSql(
      `SELECT notification.id, notification.created_at, notification.title as message,
              notification.status = 'read' AS is_read
       FROM notifications notification WHERE notification.tenant_id = $1
         AND ${notificationRecipientPredicate('notification', '$2', '$3')}
       ORDER BY notification.created_at DESC LIMIT 50`,
      [tenantId, userId, this.isClassTeacherMode() ? 'class_teacher' : 'teacher']
    );
    return res.rows.map(r => ({
      id: r.id,
      date: new Date(r.created_at).toLocaleDateString(),
      message: r.message,
      isRead: r.is_read === true
    }));
  }

  async getReports(tenantId: string, userId: string, streamId: string) {
    await this.assertCurrentRoleAssignedClass(tenantId, userId, streamId);

    const query = `
      SELECT
        id::text,
        snapshot_id,
        title as report_name,
        format as type,
        created_at::text as generated_at,
        'Ready' as status
      FROM report_snapshots
      WHERE tenant_id::text = $1::text
        AND module = 'class-teacher-command'
        AND (
          $2::text IS NULL
          OR filters->>'streamId' = $2
          OR filters->>'class_section_id' = $2
          OR NOT (filters ? 'streamId')
        )
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const { rows } = await this.executeSql(query, [tenantId, streamId || null]);
    const reports = rows.map((row: any) => ({
      id: row.id,
      report_name: row.report_name,
      type: row.type,
      term: 'Current term',
      generated_at: row.generated_at ? new Date(row.generated_at).toLocaleDateString() : 'N/A',
      status: row.status,
      download_url: `/api/admin-command/class-teacher/reports/${encodeURIComponent(String(row.snapshot_id || row.id))}/download`,
    }));

    return {
      metrics: {
        total_reports: reports.length,
        generated_this_term: reports.length,
        pending: 0,
      },
      available_types: ['Academic Analysis', 'Discipline Report', 'Class Register', 'Welfare Report'],
      reports,
    };
  }

  async getSettings(tenantId: string, userId: string, streamId: string) {
    await this.assertCurrentRoleAssignedClass(tenantId, userId, streamId);

    const { rows } = await this.executeSql(
      `
        SELECT payload, created_at
        FROM workflow_events
        WHERE tenant_id::text = $1::text
          AND source_user_id = $2
          AND entity_id = $3
          AND event_type = 'class_teacher.settings_saved'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [tenantId, userId, streamId],
    );

    const payload = rows[0]?.payload || {};
    const profile = await this.executeSql(
      'SELECT name_title, display_name FROM staff_profiles WHERE tenant_id = $1 AND user_id::text = $2 LIMIT 1',
      [tenantId, userId],
    );
    return {
      notificationsEnabled: payload.notificationsEnabled ?? true,
      defaultView: payload.defaultView ?? 'Overview',
      darkMode: payload.darkMode ?? false,
      updatedAt: rows[0]?.created_at ?? null,
      nameTitle: profile.rows[0]?.name_title ?? null,
      displayName: profile.rows[0]?.display_name ?? null,
      nameTitles: STAFF_NAME_TITLES,
    };
  }

  async uploadReportCardSignature(
    tenantId: string,
    userId: string,
    streamId: string,
    file: UploadFileMetadata,
  ) {
    await this.assertActiveClassTeacherClass(tenantId, userId, streamId);
    if (!this.examsService) {
      throw new ServiceUnavailableException('Report-card signature service is not available');
    }

    const result = await this.examsService.uploadOwnedReportCardSignature({
      tenant_id: tenantId,
      signer_user_id: userId,
      signer_role: 'class_teacher',
    }, file);

    return {
      ...result,
      content_url: result.content_url
        ? `${result.content_url}?streamId=${encodeURIComponent(streamId)}`
        : null,
    };
  }

  async getReportCardSignature(tenantId: string, userId: string, streamId: string) {
    await this.assertActiveClassTeacherClass(tenantId, userId, streamId);
    if (!this.examsService) {
      throw new ServiceUnavailableException('Report-card signature service is not available');
    }

    const result = await this.examsService.getOwnedReportCardSignature({
      tenant_id: tenantId,
      signer_user_id: userId,
      signer_role: 'class_teacher',
    });

    return {
      ...result,
      content_url: result.content_url
        ? `${result.content_url}?streamId=${encodeURIComponent(streamId)}`
        : null,
    };
  }

  async getReportCardSignatureContent(tenantId: string, userId: string, streamId: string) {
    await this.assertActiveClassTeacherClass(tenantId, userId, streamId);
    if (!this.examsService) {
      throw new ServiceUnavailableException('Report-card signature service is not available');
    }

    return this.examsService.readOwnedReportCardSignature({
      tenant_id: tenantId,
      signer_user_id: userId,
      signer_role: 'class_teacher',
    });
  }

  async saveSettings(tenantId: string, userId: string, streamId: string, payload: any) {
    await this.assertCurrentRoleAssignedClass(tenantId, userId, streamId);

    const notificationsEnabled = Boolean(payload?.notificationsEnabled);
    const defaultView = String(payload?.defaultView || 'Overview').trim();
    if (!defaultView) {
      throw new Error('Default view is required');
    }

    const settings = {
      notificationsEnabled,
      defaultView,
      darkMode: Boolean(payload?.darkMode),
    };

    if (payload?.nameTitle !== undefined) {
      await this.assertActiveClassTeacherClass(tenantId, userId, streamId);
      if (typeof payload.nameTitle !== 'string' || !STAFF_NAME_TITLES.includes(payload.nameTitle as typeof STAFF_NAME_TITLES[number])) {
        throw new BadRequestException('Choose a valid name title.');
      }
      const result = await this.executeSql(`
        WITH previous AS (
          SELECT id, name_title, display_name FROM staff_profiles
          WHERE tenant_id = $1 AND user_id::text = $2 FOR UPDATE
        ), updated AS (
          UPDATE staff_profiles staff SET name_title = $4, updated_at = NOW()
          FROM previous WHERE staff.id = previous.id AND staff.tenant_id = $1
          RETURNING staff.id, staff.name_title, staff.display_name,
            previous.name_title AS previous_title, previous.display_name AS previous_name
        ), audit AS (
          INSERT INTO staff_audit_logs (tenant_id, staff_profile_id, actor_user_id, action, metadata)
          SELECT $1, id, $2::uuid, 'staff.name_title.updated',
            jsonb_build_object('previous_title', previous_title, 'name_title', name_title,
              'previous_name', previous_name, 'display_name', display_name,
              'source_dashboard', 'class_teacher', 'class_section_id', $3::text)
          FROM updated RETURNING id
        ), event AS (
          INSERT INTO workflow_events (tenant_id, source_user_id, entity_id, event_type,
            entity_type, title, message, payload, status, priority, target_roles)
          SELECT $1, $2::uuid, $3, 'class_teacher.settings_saved', 'class_teacher_settings',
            'Class-teacher settings saved', 'Staff name title and preferences updated.',
            $5::jsonb || jsonb_build_object('nameTitle', name_title, 'displayName', display_name),
            'applied', 'normal', '["class_teacher"]'::jsonb
          FROM updated RETURNING id
        ) SELECT updated.name_title, updated.display_name FROM updated
          CROSS JOIN audit CROSS JOIN event`,
      [tenantId, userId, streamId, payload.nameTitle, JSON.stringify(settings)]);
      if (!result.rows[0]) throw new BadRequestException('Your staff profile was not found in this school. Ask the school administrator to complete it.');
      return { success: true, settings: { ...settings, nameTitle: result.rows[0].name_title, displayName: result.rows[0].display_name } };
    }

    await this.executeSql(
      `
        INSERT INTO workflow_events (
          tenant_id,
          source_user_id,
          entity_id,
          event_type,
          entity_type,
          title,
          message,
          payload,
          status,
          priority,
          target_roles
        )
        VALUES ($1, $2, $3, $4, 'class_teacher_settings', $5, $6, $7::jsonb, 'applied', 'normal', $8::jsonb)
        RETURNING id, payload
      `,
      [
        tenantId,
        userId,
        streamId,
        'class_teacher.settings_saved',
        'Class-teacher settings saved',
        `Class-teacher workspace preferences saved for stream ${streamId}.`,
        JSON.stringify(settings),
        JSON.stringify(['class_teacher']),
      ],
    );

    return { success: true, settings };
  }
}
