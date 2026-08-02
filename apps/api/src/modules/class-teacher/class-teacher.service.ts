import {
  BadRequestException,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventPublisherService } from '../events/event-publisher.service';
import {
  EXAM_SCORE_STATUSES,
  type BulkExamMarkUploadRowDto,
  type ExamScoreStatus,
} from '../exams/dto/exams.dto';
import { ExamsService } from '../exams/exams.service';
import type { SaveTeacherMarksDto, TeacherMarkInput } from './dto/class-teacher.dto';

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
  ) {}

  private async assertStudentBelongsToStream(tenantId: string, streamId: string, studentId: string) {
    if (!studentId) {
      throw new BadRequestException('Select a learner before submitting this class-teacher action.');
    }

    const { rows } = await this.executeSql(
      `SELECT id
       FROM student_class_assignments
       WHERE tenant_id = $1
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
  ) {
    const { rows } = await this.executeSql(
      `SELECT id
       FROM teacher_subject_assignments
       WHERE tenant_id = $1
         AND teacher_user_id = $2
         AND class_section_id = $3
         AND subject_id = $4
         AND status = 'active'
       LIMIT 1`,
      [tenantId, userId, classSectionId, subjectId],
    );

    if (rows.length === 0) {
      throw new BadRequestException('Select an assigned class and subject before publishing homework.');
    }
  }

  private async assertTeacherAssignedClass(tenantId: string, userId: string, classSectionId: string) {
    const { rows } = await this.executeSql(
      `SELECT id
       FROM teacher_subject_assignments
       WHERE tenant_id = $1
         AND teacher_user_id = $2
         AND class_section_id = $3
         AND status = 'active'
       LIMIT 1`,
      [tenantId, userId, classSectionId],
    );

    if (rows.length === 0) {
      throw new BadRequestException('Select one of your assigned classes before saving this lesson log.');
    }
  }

  async getMyClasses(tenantId: string, userId: string) {
    const query = `
      SELECT 
        tsa.id,
        cs.id as class_section_id,
        s.id as subject_id,
        cs.name as class_name,
        s.name as subject_name,
        COALESCE(sc.student_count, 0) as learners_count,
        CASE WHEN today_attendance.class_section_id IS NULL THEN 'Pending' ELSE 'Completed' END as attendance_status,
        COALESCE(attendance_stats.present_count, 0)::int as attendance_present_count,
        COALESCE(attendance_stats.total_count, 0)::int as attendance_total_count,
        '--' as cat_average
      FROM teacher_subject_assignments tsa
      JOIN subjects s ON s.id = tsa.subject_id AND s.tenant_id = tsa.tenant_id
      JOIN class_sections cs ON cs.id = tsa.class_section_id AND cs.tenant_id = tsa.tenant_id
      LEFT JOIN (
        SELECT class_section_id, tenant_id, COUNT(student_id) as student_count
        FROM student_class_assignments
        WHERE status = 'active'
        GROUP BY class_section_id, tenant_id
      ) sc ON sc.class_section_id = tsa.class_section_id AND sc.tenant_id = tsa.tenant_id
      LEFT JOIN (
        SELECT
          sa.class_section_id,
          a.tenant_id,
          COUNT(*) FILTER (WHERE LOWER(a.status) = 'present') as present_count,
          COUNT(*) as total_count
        FROM academics_attendance a
        JOIN student_class_assignments sa ON sa.student_id = a.student_id AND sa.tenant_id = a.tenant_id
        WHERE a.attendance_date >= CURRENT_DATE - interval '30 days'
        GROUP BY sa.class_section_id, a.tenant_id
      ) attendance_stats ON attendance_stats.class_section_id = tsa.class_section_id AND attendance_stats.tenant_id = tsa.tenant_id
      LEFT JOIN (
        SELECT DISTINCT sa.class_section_id, a.tenant_id
        FROM academics_attendance a
        JOIN student_class_assignments sa ON sa.student_id = a.student_id AND sa.tenant_id = a.tenant_id
        WHERE a.attendance_date = CURRENT_DATE
      ) today_attendance ON today_attendance.class_section_id = tsa.class_section_id AND today_attendance.tenant_id = tsa.tenant_id
      WHERE tsa.tenant_id = $1 
        AND tsa.teacher_user_id = $2
        AND tsa.status = 'active'
    `;
    const { rows: result } = await this.executeSql(query, [tenantId, userId]);

    const totalLearners = result.reduce((acc, row) => acc + parseInt(row.learners_count), 0);
    const attendancePresentCount = result.reduce((acc, row) => acc + Number(row.attendance_present_count || 0), 0);
    const attendanceTotalCount = result.reduce((acc, row) => acc + Number(row.attendance_total_count || 0), 0);
    const averageAttendance = attendanceTotalCount > 0
      ? `${Math.round((attendancePresentCount / attendanceTotalCount) * 100)}%`
      : '0%';

    return {
      stats: {
        assignedClasses: result.length,
        totalLearnersTaught: totalLearners,
        averageAttendance,
      },
      classes: result.map(r => ({
        id: r.id,
        classSectionId: r.class_section_id,
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
    const learnersRes = await this.executeSql(
      `SELECT count(*)::int as count FROM student_class_assignments WHERE tenant_id = $1 AND class_section_id = $2 AND status = 'active'`,
      [tenantId, streamId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const attendanceRes = await this.executeSql(
      `SELECT count(*) FILTER (WHERE status = 'present')::int as present, count(*) FILTER (WHERE status = 'absent')::int as absent FROM academics_attendance WHERE tenant_id = $1 AND class_id = $2 AND attendance_date = CURRENT_DATE`,
      [tenantId, streamId]
    ).catch(() => ({ rows: [{ present: 0, absent: 0 }] }));

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
      `SELECT count(*)::int as count FROM academics_timetable_slots WHERE tenant_id = $1 AND teacher_id = $2 AND day_of_week = EXTRACT(ISODOW FROM CURRENT_DATE)`,
      [tenantId, userId]
    ).catch(() => ({ rows: [{ count: 0 }] }));
    const todaysLessonsCount = lessonsRes.rows[0]?.count || 0;

    // Pending Attendance
    const { stats: attendanceStats } = await this.getPendingAttendance(tenantId, userId);

    // Lesson Logs
    const lessonLogsRes = await this.executeSql(
      `SELECT count(*)::int as count FROM academics_lesson_logs WHERE tenant_id = $1 AND teacher_id = $2 AND log_date = $3`,
      [tenantId, userId, today]
    ).catch(() => ({ rows: [{ count: 0 }] }));
    const pendingLessonLogs = Math.max(0, todaysLessonsCount - (lessonLogsRes.rows[0]?.count || 0));

    // Marks
    const { stats: marksStats } = await this.getPendingMarks(tenantId, userId);

    // Assignments
    const assignmentsRes = await this.executeSql(
      `SELECT count(*)::int as count FROM academics_assignments WHERE tenant_id = $1 AND teacher_id = $2 AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + interval '7 days'`,
      [tenantId, userId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    // Learners needing attention (Discipline)
    const disciplineRes = await this.executeSql(
      `SELECT count(DISTINCT di.student_id)::int as count 
       FROM discipline_incidents di 
       JOIN student_class_assignments sca ON di.student_id = sca.student_id AND sca.tenant_id = di.tenant_id AND sca.status = 'active'
       JOIN teacher_subject_assignments tsa ON sca.class_section_id = tsa.class_section_id AND tsa.tenant_id = sca.tenant_id
       WHERE di.status = 'PENDING' AND tsa.teacher_user_id = $2 AND di.tenant_id = $1`,
      [tenantId, userId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    // Messages
    const msgRes = await this.executeSql(
      `SELECT count(*)::int as count FROM school_notifications WHERE tenant_id = $1 AND user_id = $2 AND read_at IS NULL`,
      [tenantId, userId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const storeRequestsRes = await this.executeSql(
      `SELECT count(*)::int as count
       FROM inventory_requests
       WHERE tenant_id = $1
         AND requested_by = $2
         AND status IN ('pending', 'approved', 'backordered')`,
      [tenantId, userId],
    ).catch(() => ({ rows: [{ count: 0 }] }));
    const storeRequestsCount = storeRequestsRes.rows[0]?.count || 0;

    return {
      todaysLessons: { count: todaysLessonsCount, detail: `${todaysLessonsCount} scheduled for today` },
      pendingAttendance: { count: attendanceStats.pendingTasks, detail: `${attendanceStats.pendingTasks} classes not marked` },
      pendingLessonLogs: { count: pendingLessonLogs, detail: `${pendingLessonLogs} lessons not logged` },
      openMarkEntry: { count: marksStats.totalWindows, detail: `${marksStats.totalWindows} exams awaiting marks` },
      assignmentsDue: { count: assignmentsRes.rows[0]?.count || 0, detail: `${assignmentsRes.rows[0]?.count || 0} assignments due this week` },
      learnersNeedingAttention: { count: disciplineRes.rows[0]?.count || 0, detail: `${disciplineRes.rows[0]?.count || 0} flagged learners` },
      unreadMessages: { count: msgRes.rows[0]?.count || 0, detail: `${msgRes.rows[0]?.count || 0} unread messages` },
      storeRequests: { count: storeRequestsCount, detail: `${storeRequestsCount} pending store requests` }
    };
  }

  async getRegister(tenantId: string, userId: string, streamId: string) {
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
      JOIN students s ON s.id = sa.student_id AND s.tenant_id = sa.tenant_id
      WHERE sa.tenant_id = $1 
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
    const today = new Date().toISOString().split('T')[0];
    
    // We get classes taught by the teacher and see if attendance exists today
    const query = `
      SELECT 
        tsa.id as assignment_id,
        cs.name as class_name,
        cs.id as class_section_id,
        s.name as subject_name,
        COALESCE(sc.student_count, 0) as expected,
        CASE WHEN ar.id IS NULL THEN 'Pending' ELSE 'Completed' END as status
      FROM teacher_subject_assignments tsa
      JOIN subjects s ON s.id = tsa.subject_id AND s.tenant_id = tsa.tenant_id
      JOIN class_sections cs ON cs.id = tsa.class_section_id AND cs.tenant_id = tsa.tenant_id
      LEFT JOIN (
        SELECT class_section_id, tenant_id, COUNT(student_id) as student_count
        FROM student_class_assignments
        WHERE status = 'active'
        GROUP BY class_section_id, tenant_id
      ) sc ON sc.class_section_id = tsa.class_section_id AND sc.tenant_id = tsa.tenant_id
      LEFT JOIN (
        SELECT DISTINCT a.tenant_id, a.id, sa.class_section_id
        FROM academics_attendance a
        JOIN student_class_assignments sa ON sa.student_id = a.student_id AND sa.tenant_id = a.tenant_id
        WHERE a.attendance_date = $3
      ) ar ON ar.class_section_id = tsa.class_section_id AND ar.tenant_id = tsa.tenant_id
      WHERE tsa.tenant_id = $1 
        AND tsa.teacher_user_id = $2
        AND tsa.status = 'active'
    `;
    const { rows: result } = await this.executeSql(query, [tenantId, userId, today]);
    
    const pendingCount = result.filter(r => r.status === 'Pending').length;

    return {
      stats: {
        totalTasks: result.length,
        pendingTasks: pendingCount,
      },
      tasks: result.map(r => ({
        id: r.assignment_id,
        classSectionId: r.class_section_id,
        date: today,
        time: "08:00",
        className: r.class_name,
        subjectName: r.subject_name,
        expected: parseInt(r.expected),
        status: r.status,
      }))
    };
  }

  async getPendingMarks(tenantId: string, userId: string) {
    const query = `
      SELECT 
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
        w.closes_at as deadline,
        (
          SELECT COUNT(*) 
          FROM exam_marks em 
          WHERE em.tenant_id = w.tenant_id 
            AND em.exam_series_id = w.exam_series_id 
            AND em.assessment_id = assessment.id
            AND em.class_section_id = w.class_section_id 
            AND em.subject_id = w.subject_id
            AND em.score_status NOT IN ('not_assessed', 'incomplete')
        ) as entered_count,
        (
          SELECT COUNT(*)
          FROM students student
          WHERE student.tenant_id = w.tenant_id
            AND student.status = 'active'
            AND EXISTS (
              SELECT 1
              FROM student_class_assignments class_assignment
              WHERE class_assignment.tenant_id = student.tenant_id
                AND class_assignment.student_id = student.id::text
                AND class_assignment.class_section_id = w.class_section_id::text
                AND class_assignment.status = 'active'
            )
            AND EXISTS (
              SELECT 1
              FROM student_subject_enrollments subject_enrollment
              WHERE subject_enrollment.tenant_id = student.tenant_id
                AND subject_enrollment.student_id = student.id::text
                AND subject_enrollment.class_section_id = w.class_section_id::text
                AND subject_enrollment.subject_id = w.subject_id::text
                AND subject_enrollment.status = 'active'
            )
        ) as total_students,
        w.status as window_status
      FROM exam_mark_entry_windows w
      JOIN exam_series es ON es.id = w.exam_series_id AND es.tenant_id = w.tenant_id
      JOIN class_sections cs ON cs.id = w.class_section_id AND cs.tenant_id = w.tenant_id
      JOIN subjects s ON s.id = w.subject_id AND s.tenant_id = w.tenant_id
      JOIN LATERAL (
        SELECT ea.id, ea.name, ea.max_score
        FROM exam_assessments ea
        WHERE ea.tenant_id = w.tenant_id
          AND ea.exam_series_id = w.exam_series_id
          AND ea.subject_id = w.subject_id
        ORDER BY ea.created_at ASC
        LIMIT 1
      ) assessment ON TRUE
      JOIN teacher_subject_assignments tsa ON tsa.class_section_id = w.class_section_id 
        AND tsa.subject_id = w.subject_id 
        AND tsa.tenant_id = w.tenant_id
        AND tsa.academic_term_id = es.academic_term_id::text
        AND tsa.status = 'active'
      WHERE w.tenant_id = $1 
        AND tsa.teacher_user_id = $2
        AND w.status = 'open'
        AND w.opens_at <= NOW()
        AND w.closes_at >= NOW()
      ORDER BY w.closes_at ASC
    `;
    const { rows: result } = await this.executeSql(query, [tenantId, userId]);
    
    return {
      stats: {
        totalWindows: result.length,
        nearingDeadline: result.filter(r => new Date(r.deadline).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000).length
      },
      windows: result.map(r => ({
        id: r.window_id,
        examSeriesId: r.exam_series_id,
        academicTermId: r.academic_term_id,
        examName: r.exam_name,
        className: r.class_name,
        classSectionId: r.class_section_id,
        subjectId: r.subject_id,
        subjectName: r.subject_name,
        assessmentId: r.assessment_id,
        paperName: r.paper_name,
        outOf: parseInt(r.out_of),
        deadline: new Date(r.deadline).toLocaleDateString(),
        enteredCount: parseInt(r.entered_count),
        totalStudents: parseInt(r.total_students),
        status: parseInt(r.entered_count) >= parseInt(r.total_students) ? 'Completed' : 'Pending',
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
      JOIN class_sections cs ON cs.id::text = ts.class_section_id AND cs.tenant_id = ts.tenant_id
      JOIN subjects s ON s.id::text = ts.subject_id AND s.tenant_id = ts.tenant_id
      WHERE ts.tenant_id = $1 
        AND ts.teacher_id = $2
        AND ts.status = 'published'
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
      WHERE tenant_id = $1
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
    const query = `
      SELECT 
        s.id as student_id,
        s.admission_number,
        s.first_name || ' ' || s.last_name as name,
        cs.name as class_name,
        COALESCE((
          SELECT COUNT(*)
          FROM academics_attendance a
          WHERE a.student_id = s.id
            AND a.tenant_id = s.tenant_id
            AND a.status = 'PRESENT'
        ), 0) as days_present,
        COALESCE((
          SELECT COUNT(*)
          FROM academics_attendance a
          WHERE a.student_id = s.id
            AND a.tenant_id = s.tenant_id
        ), 0) as total_attendance_days,
        (
          SELECT status
          FROM academics_attendance a
          WHERE a.student_id = s.id
            AND a.tenant_id = s.tenant_id
            AND a.attendance_date = CURRENT_DATE
          LIMIT 1
        ) as today_status,
        COALESCE((
          SELECT COUNT(*)
          FROM discipline_incidents di
          WHERE di.student_id = s.id
            AND di.tenant_id = s.tenant_id
            AND di.status = 'PENDING'
        ), 0) as active_incidents,
        (
          SELECT AVG(m.marks_obtained)
          FROM academics_exam_marks m
          WHERE m.student_id = s.id
            AND m.tenant_id = s.tenant_id
        ) as avg_marks
      FROM class_sections cs
      JOIN student_class_assignments sca ON sca.class_section_id = cs.id AND sca.tenant_id = cs.tenant_id
      JOIN students s ON s.id = sca.student_id AND s.tenant_id = sca.tenant_id
      WHERE cs.tenant_id = $1 
        AND cs.class_teacher_id = $2
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
        di.incident_date,
        s.first_name || ' ' || s.last_name as learner_name,
        cs.name as class_name,
        di.category,
        di.severity,
        di.status
      FROM discipline_incidents di
      JOIN students s ON s.id = di.student_id AND s.tenant_id = di.tenant_id
      JOIN student_class_assignments sca ON sca.student_id = s.id AND sca.tenant_id = s.tenant_id AND sca.status = 'active'
      JOIN class_sections cs ON cs.id = sca.class_section_id AND cs.tenant_id = sca.tenant_id
      WHERE di.tenant_id = $1
        AND di.reported_by_user_id = $2
      ORDER BY di.incident_date DESC
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
    
    // Default values if not provided
    const severity = payload.severity || 'medium';
    const actionTaken = payload.actionTaken || 'Pending Review';
    const status = payload.status || 'reported';
    
    await this.executeSql(
      `INSERT INTO discipline_incidents 
        (tenant_id, student_id, category, severity, description, incident_date, reported_by_user_id, action_taken, status)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8)`,
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
      JOIN student_class_assignments sca ON sca.class_section_id = cs.id AND sca.tenant_id = cs.tenant_id
      JOIN students s ON s.id = sca.student_id AND s.tenant_id = sca.tenant_id
      LEFT JOIN report_card_comments rcc ON rcc.student_id = s.id AND rcc.tenant_id = s.tenant_id
      WHERE cs.tenant_id = $1 
        AND cs.class_teacher_id = $2
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
      WHERE tenant_id = $1 AND student_id = $2
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
    const query = `
      SELECT 
        s.id as "id",
        s.admission_number as "admissionNo",
        s.first_name || ' ' || s.last_name as name,
        COALESCE(aa.status, 'present') as attendance,
        '' as reason
      FROM student_class_assignments sa
      JOIN students s ON s.id = sa.student_id AND s.tenant_id = sa.tenant_id
      LEFT JOIN academics_attendance aa ON aa.student_id = s.id AND aa.tenant_id = s.tenant_id AND aa.attendance_date = CURRENT_DATE
      WHERE sa.tenant_id = $1 
        AND sa.class_section_id = $2
        AND sa.status = 'active'
      ORDER BY s.first_name ASC
    `;
    const { rows: result } = await this.executeSql(query, [tenantId, streamId]);
    return result;
  }

  async saveAttendance(tenantId: string, userId: string, streamId: string, records: any[]) {
    this.logger.log(`Saved ${records.length} attendance records for class/stream ${streamId}`);
    
    if (!records || records.length === 0) {
      return { success: true, count: 0 };
    }

    const today = new Date().toISOString().split('T')[0];

    await this.executeSql(
      `DELETE FROM academics_attendance WHERE tenant_id = $1 AND class_id = $2 AND attendance_date = $3`,
      [tenantId, streamId, today]
    );

    let paramIndex = 4;
    const values = records.map(r => {
       const str = `($1, $2, $3, $${paramIndex}, $${paramIndex+1}, $${paramIndex+2})`;
       paramIndex += 3;
       return str;
    }).join(', ');

    const params: any[] = [tenantId, streamId, today];
    records.forEach(r => {
      params.push(r.id || r.studentId, r.attendance || r.status || 'present', userId);
    });

    const query = `
      INSERT INTO academics_attendance (tenant_id, class_id, attendance_date, student_id, status, submitted_by)
      VALUES ${values}
    `;

    await this.executeSql(query, params);

    const presentCount = records.filter(r => (r.attendance || r.status || 'present') === 'present').length;
    const absentCount = records.length - presentCount;

    await this.eventPublisherService.publishAttendanceRegisterMarked({
      tenant_id: tenantId,
      stream_id: streamId,
      marked_by_user_id: userId,
      date: today,
      present_count: presentCount,
      absent_count: absentCount,
    });

    return { success: true, count: records.length };
  }

  async reportDisciplineIncident(tenantId: string, userId: string, streamId: string, payload: any) {
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
  ) {
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
      SELECT
        w.id,
        w.exam_series_id,
        w.class_section_id,
        w.subject_id,
        es.academic_term_id,
        es.name AS exam_name,
        cs.name AS class_name,
        subject.name AS subject_name,
        assessment.id AS assessment_id,
        COALESCE(assessment.max_score, 100) AS out_of
      FROM exam_mark_entry_windows w
      JOIN exam_series es
        ON es.id = w.exam_series_id
       AND es.tenant_id = w.tenant_id
      JOIN class_sections cs
        ON cs.id = w.class_section_id
       AND cs.tenant_id = w.tenant_id
      JOIN subjects subject
        ON subject.id = w.subject_id
       AND subject.tenant_id = w.tenant_id
      JOIN teacher_subject_assignments tsa
        ON tsa.tenant_id = w.tenant_id
       AND tsa.academic_term_id = es.academic_term_id::text
       AND tsa.class_section_id = w.class_section_id::text
       AND tsa.subject_id = w.subject_id::text
       AND tsa.teacher_user_id = $3
       AND tsa.status = 'active'
      JOIN LATERAL (
        SELECT ea.id, ea.max_score
        FROM exam_assessments ea
        WHERE ea.tenant_id = w.tenant_id
          AND ea.exam_series_id = w.exam_series_id
          AND ea.subject_id = w.subject_id
        ORDER BY ea.created_at ASC
        LIMIT 1
      ) assessment ON TRUE
      WHERE w.id = $1
        AND w.tenant_id = $2
        AND w.class_section_id = $4
        AND w.status = 'open'
        AND w.opens_at <= NOW()
        AND w.closes_at >= NOW()
      LIMIT 1
    `;
    const { rows: windows } = await this.executeSql(windowQuery, [
      payload.examId,
      tenantId,
      userId,
      payload.classSectionId,
    ]);
    if (windows.length === 0) {
      throw new BadRequestException(
        'Exam window is closed, invalid, or not assigned to this teacher.',
      );
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
    );

    if (action === 'submit') {
      try {
        await this.eventPublisherService.publishExamSubmitted({
          tenant_id: tenantId,
          exam_id: window.exam_series_id,
          exam_name: window.exam_name,
          class_name: window.class_name,
          stream_name: window.class_name,
          submitted_by_user_id: userId,
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
    const scoreRes = await this.executeSql(
      `SELECT COALESCE(ROUND(AVG(score), 2), 0)::numeric as avg FROM exam_marks WHERE tenant_id = $1 AND class_section_id = $2`,
      [tenantId, streamId]
    ).catch(() => ({ rows: [{ avg: 0 }] }));

    return {
      classMean: `${scoreRes.rows[0]?.avg || 0}%`,
      classGrade: "N/A",
      missingMarksSubjects: 0,
      topPerformer: "N/A",
      learnersBelowTarget: 0
    };
  }

  async getComments(tenantId: string, userId: string, streamId: string) {
    const query = `
      SELECT 
        s.id,
        s.first_name || ' ' || s.last_name as name,
        'N/A' as mean,
        'N/A' as grade,
        'N/A' as position,
        COALESCE(rcc.final_comment, '') as comment
      FROM student_class_assignments sca
      JOIN students s ON s.id = sca.student_id AND s.tenant_id = sca.tenant_id
      LEFT JOIN report_card_comments rcc ON rcc.student_id = s.id AND rcc.tenant_id = s.tenant_id
      WHERE sca.tenant_id = $1 AND sca.class_section_id = $2
    `;
    const { rows } = await this.executeSql(query, [tenantId, streamId]);
    return rows;
  }

  async getDiscipline(tenantId: string, userId: string, streamId: string) {
    const query = `
      SELECT 
        di.id,
        di.created_at as date,
        s.first_name || ' ' || s.last_name as learner,
        di.category as issue,
        di.severity,
        di.status
      FROM discipline_incidents di
      JOIN students s ON s.id = di.student_id AND s.tenant_id = di.tenant_id
      JOIN student_class_assignments sca ON sca.student_id = s.id AND sca.tenant_id = s.tenant_id AND sca.status = 'active'
      WHERE di.tenant_id = $1
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
    const query = `
      SELECT 
        sw.id,
        sw.created_at as date,
        s.first_name || ' ' || s.last_name as learner,
        sw.description as concern,
        'Medium' as priority,
        sw.status
      FROM student_welfare_cases sw
      JOIN students s ON s.id = sw.student_id AND s.tenant_id = sw.tenant_id
      JOIN student_class_assignments sca ON sca.student_id = s.id AND sca.tenant_id = s.tenant_id AND sca.status = 'active'
      WHERE sw.tenant_id = $1 AND sca.class_section_id = $2
      ORDER BY sw.created_at DESC
    `;
    const { rows } = await this.executeSql(query, [tenantId, streamId]);
    return rows.map(r => ({ ...r, date: new Date(r.date).toLocaleDateString() }));
  }

  async getStreamTimetable(tenantId: string, userId: string, streamId: string) {
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
        to_char(start_time, 'HH24:MI') || ' - ' || to_char(end_time, 'HH24:MI') as time,
        subject_id as subject,
        teacher_id as teacher,
        'Room 1' as room
      FROM academics_timetable_slots
      WHERE tenant_id = $1 AND class_id = $2
      ORDER BY day_of_week, start_time
    `;
    const { rows } = await this.executeSql(query, [tenantId, streamId]);
    return rows;
  }

  async getSubjects(tenantId: string, userId: string, streamId: string) {
    const query = `
      SELECT 
        subject_id as id,
        subject_id as subject,
        teacher_id as teacher,
        COUNT(id) as "lessonsPerWeek"
      FROM academics_timetable_slots
      WHERE tenant_id = $1 AND class_id = $2
      GROUP BY subject_id, teacher_id
    `;
    const { rows } = await this.executeSql(query, [tenantId, streamId]);
    return rows.map(r => ({
      ...r,
      lessonsPerWeek: Number(r.lessonsPerWeek)
    }));
  }

  async getCommunication(tenantId: string, userId: string, streamId: string) {
    const query = `
      SELECT 
        id,
        'SMS' as type,
        recipient_phone as recipient,
        created_at as date,
        message as content,
        status
      FROM communication_sms_outbox
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const { rows } = await this.executeSql(query, [tenantId]);
    return rows.map(r => ({ ...r, date: new Date(r.date).toLocaleDateString() }));
  }

  async getHomework(tenantId: string, userId: string, streamId: string) {
    const query = `
      SELECT 
        a.id,
        a.title,
        cs.name as "className",
        s.name as subject,
        a.due_date as "dueDate",
        a.status
      FROM academics_assignments a
      JOIN class_sections cs ON cs.id::text = a.class_id AND cs.tenant_id = a.tenant_id
      JOIN subjects s ON s.id::text = a.subject_id AND s.tenant_id = a.tenant_id
      WHERE a.tenant_id = $1 ${streamId ? 'AND a.class_id = $2' : ''} AND a.teacher_id = ${streamId ? '$3' : '$2'}
      ORDER BY a.due_date DESC
    `;
    const params = streamId ? [tenantId, streamId, userId] : [tenantId, userId];
    const { rows } = await this.executeSql(query, params).catch(() => ({ rows: [] }));
    return rows.map((r: any) => ({ ...r, dueDate: new Date(r.dueDate).toLocaleDateString() }));
  }

  async saveHomework(tenantId: string, userId: string, payload: any) {
    const title = this.requireText(payload?.title, 'Assignment title');
    const classId = this.requireText(payload?.classId, 'Assigned class');
    const subjectId = this.requireText(payload?.subjectId, 'Assigned subject');
    const dueDate = this.requireText(payload?.dueDate, 'Due date');
    const description = typeof payload?.description === 'string' ? payload.description.trim() : '';

    await this.assertTeacherAssignedClassSubject(tenantId, userId, classId, subjectId);

    const query = `
      INSERT INTO academics_assignments (tenant_id, title, description, class_id, subject_id, due_date, teacher_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Published')
      RETURNING id
    `;
    const { rows } = await this.executeSql(query, [
      tenantId,
      title,
      description,
      classId,
      subjectId,
      dueDate,
      userId
    ]);

    const assignmentId = rows[0]?.id ?? null;

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
        VALUES ($1, $2, $3, 'class_teacher.homework_published', 'assignment', $4, $5, $6::jsonb, 'published', 'normal', $7::jsonb)
      `,
      [
        tenantId,
        userId,
        assignmentId ?? classId,
        'Homework assignment published',
        `${title} was published for the selected class and subject.`,
        JSON.stringify({ assignment_id: assignmentId, class_id: classId, subject_id: subjectId, due_date: dueDate }),
        JSON.stringify(['class_teacher', 'student', 'parent']),
      ],
    ).catch((error) => {
      this.logger.warn(`Could not record homework workflow event: ${error?.message ?? error}`);
    });

    return { success: true, assignmentId };
  }

  async getLessonLogs(tenantId: string, userId: string, streamId?: string) {
    const query = `
      SELECT 
        l.id,
        l.log_date as date,
        cs.name as class,
        'General' as subject,
        l.covered_topics as topics,
        'Logged' as status
      FROM academics_lesson_logs l
      JOIN class_sections cs ON cs.id = l.class_id AND cs.tenant_id = l.tenant_id
      WHERE l.tenant_id = $1 AND l.teacher_id = $2
      ORDER BY l.log_date DESC
    `;
    const { rows } = await this.executeSql(query, [tenantId, userId]).catch(() => ({ rows: [] }));
    return rows.map((r: any) => ({ ...r, date: new Date(r.date).toLocaleDateString() }));
  }

  async saveLessonLog(tenantId: string, userId: string, payload: any) {
    const classId = this.requireText(payload?.classId, 'Assigned class');
    const topics = this.requireText(payload?.topics, 'Topics covered');
    await this.assertTeacherAssignedClass(tenantId, userId, classId);

    const query = `
      INSERT INTO academics_lesson_logs (tenant_id, teacher_id, class_id, log_date, covered_topics, student_understanding_notes, challenges)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    await this.executeSql(query, [
      tenantId,
      userId,
      classId,
      payload.date || new Date().toISOString().split('T')[0],
      topics,
      payload.notes || '',
      payload.challenges || ''
    ]);
    return { success: true };
  }

  async getTasks(tenantId: string, userId: string, streamId: string) {
    const query = `
      SELECT 
        id,
        title as task,
        due_date as "dueDate",
        status
      FROM school_tasks
      WHERE tenant_id = $1 AND assigned_to = $2
      ORDER BY due_date ASC
    `;
    const { rows } = await this.executeSql(query, [tenantId, userId]);
    return rows.map(r => ({ ...r, dueDate: r.dueDate ? new Date(r.dueDate).toLocaleDateString() : 'N/A' }));
  }

  async getHealth(tenantId: string, userId: string, streamId: string) {
    const query = `
      SELECT 
        cv.id,
        cv.created_at as date,
        s.first_name || ' ' || s.last_name as learner,
        cv.symptoms as issue,
        cv.action_taken as action,
        cv.status
      FROM clinic_visits cv
      JOIN students s ON s.id = cv.student_id AND s.tenant_id = cv.tenant_id
      JOIN student_class_assignments sca ON sca.student_id = s.id AND sca.tenant_id = s.tenant_id AND sca.status = 'active'
      WHERE cv.tenant_id = $1 AND sca.class_section_id = $2
      ORDER BY cv.created_at DESC
    `;
    const { rows } = await this.executeSql(query, [tenantId, streamId]);
    return rows.map(r => ({ ...r, date: new Date(r.date).toLocaleDateString() }));
  }

  async getMeetings(tenantId: string, userId: string, streamId: string) {
    const query = `
      SELECT 
        id,
        start_time as date,
        to_char(start_time, 'HH24:MI') as time,
        'N/A' as parent,
        title as agenda,
        status
      FROM school_meetings
      WHERE tenant_id = $1 AND organizer_id = $2
      ORDER BY start_time DESC
    `;
    const { rows } = await this.executeSql(query, [tenantId, userId]);
    return rows.map(r => ({ ...r, date: new Date(r.date).toLocaleDateString() }));
  }

  async getRequests(tenantId: string, userId: string, streamId: string) {
    const query = `
      SELECT 
        r.id,
        r.created_at as date,
        s.first_name || ' ' || s.last_name as learner,
        r.request_type as type,
        r.status,
        r.requested_by as "requestedBy"
      FROM student_requests r
      JOIN students s ON s.id = r.student_id AND s.tenant_id = r.tenant_id
      JOIN student_class_assignments sca ON sca.student_id = s.id AND sca.tenant_id = s.tenant_id AND sca.status = 'active'
      WHERE r.tenant_id = $1 AND sca.class_section_id = $2
      ORDER BY r.created_at DESC
    `;
    const { rows } = await this.executeSql(query, [tenantId, streamId]);
    return rows.map(r => ({ ...r, date: new Date(r.date).toLocaleDateString() }));
  }

  async getDocuments(tenantId: string, userId: string, streamId: string) {
    const query = `
      SELECT 
        id,
        title,
        type,
        created_at as "uploadedAt",
        'Unknown' as size
      FROM academics_resources
      WHERE tenant_id = $1 AND class_id = $2
      ORDER BY created_at DESC
    `;
    const { rows } = await this.executeSql(query, [tenantId, streamId]);
    return rows.map(r => ({ ...r, uploadedAt: new Date(r.uploadedAt).toLocaleDateString() }));
  }

  async getNotifications(tenantId: string, userId: string, streamId: string) {
    const res = await this.executeSql(
      `SELECT id, created_at, title as message, read_at FROM school_notifications WHERE tenant_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 5`,
      [tenantId, userId]
    ).catch(() => ({ rows: [] }));
    return res.rows.map(r => ({
      id: r.id,
      date: new Date(r.created_at).toLocaleDateString(),
      message: r.message,
      isRead: !!r.read_at
    }));
  }

  async getReports(tenantId: string, userId: string, streamId: string) {
    const query = `
      SELECT
        id::text,
        snapshot_id,
        title as report_name,
        format as type,
        created_at::text as generated_at,
        'Ready' as status
      FROM report_snapshots
      WHERE tenant_id = $1
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
    const { rows } = await this.executeSql(
      `
        SELECT payload
        FROM workflow_events
        WHERE tenant_id = $1
          AND source_user_id = $2
          AND entity_id = $3
          AND event_type = 'class_teacher.settings_saved'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [tenantId, userId, streamId],
    ).catch(() => ({ rows: [] as any[] }));

    const payload = rows[0]?.payload || {};
    return {
      notificationsEnabled: payload.notificationsEnabled ?? true,
      defaultView: payload.defaultView ?? 'Overview',
      darkMode: payload.darkMode ?? false,
      updatedAt: rows[0]?.created_at ?? null,
    };
  }

  async saveSettings(tenantId: string, userId: string, streamId: string, payload: any) {
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
