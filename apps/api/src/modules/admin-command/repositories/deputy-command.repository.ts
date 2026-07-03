import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class DeputyCommandRepository {

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

  constructor(private readonly prisma: PrismaService) {}

  async getOverview(tenantId: string) {
    const metrics = await this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM students WHERE tenant_id = $1 AND status = 'active') AS total_students,
          (SELECT COUNT(*)::int FROM staff_profiles WHERE tenant_id = $1 AND status = 'active') AS total_staff,
          (SELECT COUNT(*)::int FROM admin_incidents WHERE tenant_id = $1 AND status IN ('reported', 'escalated')) AS pending_incidents,
          (SELECT COUNT(*)::int FROM admin_incidents WHERE tenant_id = $1 AND status = 'escalated') AS escalated_incidents,
          (SELECT COUNT(*)::int FROM class_sections WHERE tenant_id = $1 AND is_active = TRUE) AS active_classes,
          (SELECT COUNT(*)::int FROM student_attendance_logs WHERE tenant_id = $1 AND attendance_date = CURRENT_DATE AND status = 'present') AS present_today,
          (SELECT COUNT(*)::int FROM student_attendance_logs WHERE tenant_id = $1 AND attendance_date = CURRENT_DATE AND status = 'absent') AS absent_today
      `,
      [tenantId],
      { total_students: 0, total_staff: 0, pending_incidents: 0, escalated_incidents: 0, active_classes: 0, present_today: 0, absent_today: 0 }
    );

    const incidentsResult = await this.executeSql(
      `SELECT * FROM admin_incidents WHERE tenant_id = $1 AND status IN ('reported', 'escalated', 'new') ORDER BY created_at DESC LIMIT 10`,
      [tenantId]
    );

    return {
      incident_summary: {
        reported_incidents: metrics.pending_incidents,
        escalated_incidents: metrics.escalated_incidents
      },
      metrics,
      recent_incidents: incidentsResult.rows,
    };
  }

  async getDailyOperations(tenantId: string) {
    const metrics = await this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM teacher_attendance_logs WHERE tenant_id = $1 AND attendance_date = CURRENT_DATE AND status = 'absent') AS absent_teachers,
          (SELECT COUNT(*)::int FROM teacher_attendance_logs WHERE tenant_id = $1 AND attendance_date = CURRENT_DATE AND status = 'late') AS late_teachers,
          (SELECT COUNT(*)::int FROM staff_profiles WHERE tenant_id = $1 AND status = 'active') AS total_staff,
          (SELECT COUNT(*)::int FROM teacher_attendance_logs WHERE tenant_id = $1 AND attendance_date = CURRENT_DATE AND status = 'present') AS present_staff
      `,
      [tenantId],
      { absent_teachers: 0, late_teachers: 0, total_staff: 0, present_staff: 0 }
    );

    const notesResult = await this.executeSql(
      `SELECT * FROM admin_incidents WHERE tenant_id = $1 AND title ILIKE '%operation%' ORDER BY created_at DESC LIMIT 10`,
      [tenantId]
    );

    return {
      metrics: {
        morning_parade_status: "Completed",
        staff_on_duty_present: metrics.present_staff,
        staff_on_duty_total: metrics.total_staff,
        gate_security_status: "Report Received",
        classes_not_started: metrics.absent_teachers,
      },
      notes: notesResult.rows.map((row: any) => ({
        id: row.id,
        time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        area: row.involved_parties || "General",
        issue: row.description,
        status: row.status === 'resolved' ? 'Resolved' : 'Active'
      }))
    };
  }

  async createDailyOperationNote(tenantId: string, userId: string, dto: { area: string, issue: string }) {
    return this.executeSql(
      `
        INSERT INTO admin_incidents (tenant_id, title, description, involved_parties, severity, status, created_by)
        VALUES ($1, $2, $3, $4, 'low', 'reported', $5)
        RETURNING *
      `,
      [tenantId, 'Daily Operation Note', dto.issue, dto.area, userId]
    );
  }

  async getAttendance(tenantId: string) {
    const metrics = await this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM student_attendance_logs WHERE tenant_id = $1 AND attendance_date = CURRENT_DATE AND status = 'absent') AS absent_students,
          (SELECT COUNT(*)::int FROM student_attendance_logs WHERE tenant_id = $1 AND attendance_date = CURRENT_DATE AND status = 'late') AS late_students
      `,
      [tenantId],
      { absent_students: 0, late_students: 0 }
    );

    const recordsResult = await this.executeSql(
      `
        SELECT 
          l.id, 
          COALESCE(NULLIF(TRIM(CONCAT_WS(' ', s.first_name, s.last_name)), ''), 'Learner not linked') AS student_name,
          COALESCE(c.name, 'Class not linked') AS class_name,
          l.status,
          l.reason,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM workflow_events event
              WHERE event.tenant_id = l.tenant_id
                AND event.entity_type = 'student_attendance_log'
                AND event.entity_id = l.id::text
                AND event.event_type = 'deputy.attendance_parent.notified'
            ) THEN 'Notified'
            WHEN EXISTS (
              SELECT 1
              FROM workflow_events event
              WHERE event.tenant_id = l.tenant_id
                AND event.entity_type = 'student_attendance_log'
                AND event.entity_id = l.id::text
                AND event.event_type = 'deputy.attendance_follow_up.created'
            ) THEN 'Followed Up'
            ELSE 'Pending'
          END AS parent_notified
        FROM student_attendance_logs l
        LEFT JOIN students s ON s.tenant_id = l.tenant_id AND s.id = l.student_id
        LEFT JOIN class_sections c ON c.tenant_id = l.tenant_id AND c.id = l.class_id
        WHERE l.tenant_id = $1 AND l.attendance_date = CURRENT_DATE AND l.status IN ('absent', 'late')
        ORDER BY l.created_at DESC
        LIMIT 20
      `,
      [tenantId]
    );

    return {
      metrics,
      records: recordsResult.rows.map((row: any) => ({
        id: row.id,
        studentName: row.student_name || 'Learner not linked',
        className: row.class_name || 'Class not linked',
        status: row.status === 'absent' ? 'Absent' : 'Late',
        reason: row.reason || 'Unexplained',
        parentNotified: row.parent_notified
      }))
    };
  }

  async notifyParent(tenantId: string, actorUserId: string | null, logId: string) {
    const attendance = await this.executeSql(
      `
        SELECT
          l.id::text,
          l.status,
          l.reason,
          COALESCE(NULLIF(TRIM(CONCAT_WS(' ', s.first_name, s.last_name)), ''), 'Learner not linked') AS student_name,
          COALESCE(c.name, 'Class not linked') AS class_name
        FROM student_attendance_logs l
        LEFT JOIN students s ON s.tenant_id = l.tenant_id AND s.id = l.student_id
        LEFT JOIN class_sections c ON c.tenant_id = l.tenant_id AND c.id = l.class_id
        WHERE l.tenant_id = $1
          AND l.id::text = $2
        LIMIT 1
      `,
      [tenantId, logId],
    ).catch(() => ({ rows: [] as any[] }));
    const row = attendance.rows[0] ?? {
      id: logId,
      status: 'attendance',
      reason: 'Follow-up requested',
      student_name: 'Learner not linked',
      class_name: 'Class not linked',
    };
    const event = await this.createDeputyWorkflowEvent(tenantId, actorUserId, {
      type: 'deputy.attendance_parent.notified',
      entityType: 'student_attendance_log',
      entityId: logId,
      title: `Parent attendance follow-up: ${row.student_name}`,
      body: `${row.class_name} ${row.student_name} has an attendance follow-up for ${row.status}. Reason: ${row.reason || 'Unexplained'}.`,
      targetRoles: ['parent', 'class_teacher', 'deputy_principal'],
      metadata: { attendanceLogId: logId, status: row.status, className: row.class_name, studentName: row.student_name },
    });
    await this.appendDeputyAudit(tenantId, 'deputy.attendance_parent.notified', 'student_attendance_log', { logId, actorUserId, eventId: event?.id });
    return { success: true, message: 'Parent attendance follow-up routed', event };
  }

  async createFollowUpList(tenantId: string, userId: string, dto: any) {
    const listName = String(dto?.listName ?? dto?.list_name ?? 'Attendance follow-up list').trim();
    const dateRange = String(dto?.dateRange ?? dto?.date_range ?? 'This Week').trim();
    const assignedTo = String(dto?.assignedTo ?? dto?.assigned_to ?? 'Class teachers').trim();
    const event = await this.createDeputyWorkflowEvent(tenantId, userId, {
      type: 'deputy.attendance_follow_up.created',
      entityType: 'attendance_follow_up',
      entityId: null,
      title: listName,
      body: `Attendance follow-up list created for ${dateRange} and assigned to ${assignedTo}.`,
      targetRoles: ['class_teacher', 'guidance_counselling', 'principal'],
      metadata: { listName, dateRange, assignedTo },
    });
    await this.appendDeputyAudit(tenantId, 'deputy.attendance_follow_up.created', 'attendance_follow_up', { userId, listName, dateRange, assignedTo, eventId: event?.id });
    return { success: true, message: 'Attendance follow-up list created and routed', event };
  }

  async remindUnmarkedAttendance(tenantId: string, actorUserId: string | null, dto: any) {
    const attendanceDate = String(dto?.attendanceDate ?? dto?.attendance_date ?? new Date().toISOString().slice(0, 10));
    const unmarkedResult = await this.executeSql(
      `
        SELECT section.id::text, section.name
        FROM class_sections section
        WHERE section.tenant_id = $1
          AND section.is_active = TRUE
          AND NOT EXISTS (
            SELECT 1
            FROM student_attendance_logs log
            WHERE log.tenant_id = section.tenant_id
              AND log.class_id = section.id
              AND log.attendance_date = $2::date
          )
        ORDER BY section.name
        LIMIT 50
      `,
      [tenantId, attendanceDate],
    ).catch(() => ({ rows: [] as any[] }));
    const classNames = unmarkedResult.rows.map((row: any) => row.name).filter(Boolean);
    const body = classNames.length
      ? `Attendance registers are still unmarked for: ${classNames.join(', ')}.`
      : String(dto?.message || 'Please confirm all attendance registers for the current school day.');
    const event = await this.createDeputyWorkflowEvent(tenantId, actorUserId, {
      type: 'deputy.attendance_unmarked.reminder_sent',
      entityType: 'student_attendance_log',
      entityId: null,
      title: 'Unmarked attendance reminder',
      body,
      targetRoles: ['class_teacher', 'teacher', 'deputy_principal'],
      metadata: { attendanceDate, unmarkedCount: unmarkedResult.rows.length, classes: classNames },
    });
    await this.appendDeputyAudit(tenantId, 'deputy.attendance_unmarked.reminder_sent', 'student_attendance_log', { actorUserId, attendanceDate, unmarkedCount: unmarkedResult.rows.length, eventId: event?.id });
    return { success: true, message: 'Unmarked attendance reminders routed', event, unmarkedCount: unmarkedResult.rows.length };
  }

  async getDiscipline(tenantId: string) {
    const result = await this.executeSql(
      `
        SELECT id, case_no as "caseNo", involved_parties as "studentName", description as "incidentType", severity, status
        FROM admin_incidents 
        WHERE tenant_id = $1 AND title ILIKE '%discipline%'
        ORDER BY created_at DESC LIMIT 20
      `,
      [tenantId]
    );

    return result.rows.map((r: any) => ({
      id: r.id,
      caseNo: r.caseNo || `CAS-${r.id.substring(0, 5)}`,
      studentName: r.studentName || 'Learner not linked',
      incidentType: r.incidentType || 'Incident details not recorded',
      severity: r.severity === 'critical' ? 'Critical' : r.severity === 'high' ? 'High' : r.severity === 'low' ? 'Low' : 'Medium',
      status: r.status === 'reported' ? 'New' : r.status === 'investigating' ? 'In Review' : r.status === 'escalated' ? 'Escalated' : 'Resolved'
    }));
  }

  async createDisciplineIncident(tenantId: string, userId: string, dto: any) {
    return this.executeSql(
      `
        INSERT INTO admin_incidents (tenant_id, title, description, involved_parties, severity, status, created_by)
        VALUES ($1, 'Discipline Case', $2, $3, $4, 'reported', $5)
        RETURNING *
      `,
      [tenantId, dto.incidentType, dto.studentName, dto.severity?.toLowerCase() || 'medium', userId]
    );
  }

  async escalateDisciplineIncident(tenantId: string, id: string) {
    return this.executeSql(
      `UPDATE admin_incidents SET status = 'escalated' WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );
  }

  async getWelfare(tenantId: string) {
    const metrics = await this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM clinic_visits WHERE tenant_id = $1 AND visit_date = CURRENT_DATE) AS clinic_visits_today
      `,
      [tenantId],
      { clinic_visits_today: 0 }
    );

    const result = await this.executeSql(
      `
        SELECT id, involved_parties as "studentName", description as "concern", 'School Counsellor' as "assignedTo", status
        FROM admin_incidents 
        WHERE tenant_id = $1 AND title ILIKE '%welfare%'
        ORDER BY created_at DESC LIMIT 20
      `,
      [tenantId]
    );

    return {
      metrics,
      cases: result.rows.map((r: any) => ({
        id: r.id,
        studentName: r.studentName || 'Learner not linked',
        concern: r.concern || 'General Concern',
        assignedTo: r.assignedTo,
        status: r.status === 'reported' ? 'Referred' : r.status === 'investigating' ? 'In Progress' : 'Resolved'
      }))
    };
  }

  async createWelfareCase(tenantId: string, userId: string, dto: any) {
    return this.executeSql(
      `
        INSERT INTO admin_incidents (tenant_id, title, description, involved_parties, severity, status, created_by)
        VALUES ($1, 'Welfare Case', $2, $3, 'low', 'reported', $4)
        RETURNING *
      `,
      [tenantId, dto.concern, dto.studentName, userId]
    );
  }

  async openWelfareCase(tenantId: string, id: string) {
    return this.executeSql(
      `UPDATE admin_incidents SET status = 'investigating' WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );
  }

  async getStaffDuty(tenantId: string) {
    const metrics = await this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM staff_profiles WHERE tenant_id = $1 AND status = 'active') AS total_staff
      `,
      [tenantId],
      { total_staff: 0 }
    );

    const dutiesResult = await this.executeSql(
      `
        SELECT
          id::text,
          COALESCE(staff.full_name, staff.display_name, 'Unassigned') AS "staffName",
          duty_type AS "dutyArea",
          CONCAT(start_time::text, ' - ', end_time::text) AS "time",
          status,
          CASE WHEN status IN ('checked_in', 'missed', 'excused') THEN 'Submitted' ELSE 'Pending' END AS "reportStatus"
        FROM duty_rosters roster
        LEFT JOIN staff_profiles staff ON staff.tenant_id = roster.tenant_id AND staff.user_id = roster.assigned_user_id
        WHERE roster.tenant_id = $1
        ORDER BY roster.duty_date DESC, roster.start_time ASC
        LIMIT 25
      `,
      [tenantId],
    );

    return {
      metrics,
      duties: dutiesResult.rows
    };
  }

  async requestDutyReport(tenantId: string, actorUserId: string | null, id: string) {
    const event = await this.createDeputyWorkflowEvent(tenantId, actorUserId, {
      type: 'deputy.duty_report.requested',
      entityType: 'duty_roster',
      entityId: id,
      title: 'Duty report requested',
      body: 'Deputy Principal requested a duty report for this roster entry.',
      targetRoles: ['teacher', 'deputy_principal', 'principal'],
      metadata: { roster_id: id },
    });
    await this.appendDeputyAudit(tenantId, 'deputy.duty_report.requested', 'duty_roster', { id, actorUserId });
    return { success: true, message: 'Duty report requested and routed', event };
  }

  async manageDutyRoster(tenantId: string, userId: string, dto: any) {
    const staffName = String(dto?.staffName ?? dto?.staff_name ?? '').trim();
    const staffLookup = String(dto?.assignedUserId ?? dto?.assigned_user_id ?? dto?.userId ?? dto?.user_id ?? staffName).trim();
    if (!staffLookup) {
      throw new Error('Assigned staff is required for duty roster updates.');
    }
    const staffResult = await this.executeSql(
      `
        SELECT user_id::text AS "userId", COALESCE(full_name, display_name) AS "staffName"
        FROM staff_profiles
        WHERE tenant_id = $1
          AND (
            user_id::text = $2
            OR id::text = $2
            OR lower(COALESCE(full_name, display_name, '')) = lower($2)
          )
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [tenantId, staffLookup],
    );
    const staff = staffResult.rows[0] as any;
    if (!staff?.userId) {
      throw new Error('Assigned staff was not found for this school.');
    }
    const assignedUserId = staff.userId;
    const dutyType = String(dto?.dutyType ?? dto?.duty_type ?? dto?.dutyArea ?? dto?.duty_area ?? 'custom').toLowerCase();
    const normalizedDutyType = ['morning', 'lunch', 'gate', 'evening', 'custom'].includes(dutyType) ? dutyType : 'custom';
    const dutyDate = String(dto?.dutyDate ?? dto?.duty_date ?? new Date().toISOString().slice(0, 10));
    const timeRange = this.parseDutyTimeRange(dto?.time);
    const startTime = String(dto?.startTime ?? dto?.start_time ?? timeRange.startTime);
    const endTime = String(dto?.endTime ?? dto?.end_time ?? timeRange.endTime);
    const rosterId = this.uuidOrNull(dto?.id);

    const result = rosterId
      ? await this.executeSql(
        `
          UPDATE duty_rosters
          SET duty_type = $3,
              duty_date = $4::date,
              start_time = $5::time,
              end_time = $6::time,
              assigned_user_id = $7::uuid,
              status = COALESCE($8, status),
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
          RETURNING *
        `,
        [tenantId, rosterId, normalizedDutyType, dutyDate, startTime, endTime, assignedUserId, dto?.status ?? null],
      )
      : await this.executeSql(
        `
          INSERT INTO duty_rosters (
            tenant_id, duty_type, duty_date, start_time, end_time, assigned_user_id, status
          )
          VALUES ($1, $2, $3::date, $4::time, $5::time, $6::uuid, COALESCE($7, 'scheduled'))
          RETURNING *
        `,
        [tenantId, normalizedDutyType, dutyDate, startTime, endTime, assignedUserId, dto?.status ?? null],
      );

    const roster = result.rows[0];
    if (!roster) {
      throw new Error('Duty roster update did not match a roster in this school.');
    }
    await this.createDeputyNotification(tenantId, {
      key: `deputy-duty-roster-${roster.id}-${Date.now()}`,
      type: 'deputy.duty_roster.updated',
      title: 'Duty roster updated',
      body: `${staff.staffName ?? 'A staff member'} has been assigned to ${dto?.dutyArea ?? normalizedDutyType} duty for ${dutyDate}.`,
      targetRoles: ['teacher', 'deputy_principal'],
      metadata: { roster, staffName: staff.staffName, dutyArea: dto?.dutyArea },
    });
    await this.appendDeputyAudit(tenantId, 'deputy.duty_roster.updated', 'duty_roster', { userId, staffName: staff.staffName, roster });
    return { success: true, message: 'Duty roster saved', roster };
  }

  async getTeaching(tenantId: string) {
    const metrics = await this.safeQuery(
      `SELECT COUNT(*)::int AS total_lessons FROM timetable_lessons WHERE tenant_id = $1`,
      [tenantId],
      { total_lessons: 0 },
    );
    const lessonsResult = await this.executeSql(
      `
        SELECT
          lesson.id::text,
          COALESCE(section.name, stream.name, 'Class not set') AS "className",
          COALESCE(subject.name, subject.code, 'Subject not set') AS subject,
          CONCAT(lesson.starts_at::text, ' - ', lesson.ends_at::text) AS "lessonTime",
          COALESCE(att.status, 'Pending') AS "attendanceStatus",
          CASE WHEN log.id IS NULL THEN 'Pending' ELSE 'Submitted' END AS "logStatus"
        FROM timetable_lessons lesson
        LEFT JOIN class_streams stream ON stream.tenant_id = lesson.tenant_id AND stream.id = lesson.stream_id
        LEFT JOIN class_sections section ON section.tenant_id = lesson.tenant_id AND section.id = lesson.stream_id
        LEFT JOIN class_subject_assignments assignment ON assignment.tenant_id = lesson.tenant_id AND assignment.id = lesson.class_subject_assignment_id
        LEFT JOIN subjects subject ON subject.tenant_id = lesson.tenant_id AND subject.id = assignment.subject_id
        LEFT JOIN student_attendance_logs att ON att.tenant_id = lesson.tenant_id AND att.class_id = lesson.stream_id AND att.attendance_date = CURRENT_DATE
        LEFT JOIN academics_lesson_logs log ON log.tenant_id = lesson.tenant_id AND log.class_id = lesson.stream_id AND log.log_date = CURRENT_DATE
        WHERE lesson.tenant_id = $1
          AND lesson.weekday = EXTRACT(ISODOW FROM CURRENT_DATE)::int
        ORDER BY lesson.period_number ASC
        LIMIT 25
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));
    return { metrics, lessons: lessonsResult.rows };
  }

  async markTeachingAttendance(tenantId: string, actorUserId: string | null, id: string) {
    const result = await this.executeSql(
      `
        UPDATE timetable_lessons
        SET metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING id::text, metadata
      `,
      [
        tenantId,
        id,
        JSON.stringify({
          teaching_attendance_status: 'marked',
          teaching_attendance_marked_by: actorUserId,
          teaching_attendance_marked_at: new Date().toISOString(),
        }),
      ],
    );
    const lesson = result.rows[0];
    if (!lesson) {
      throw new Error('Timetable lesson was not found for this school.');
    }
    await this.createDeputyWorkflowEvent(tenantId, actorUserId, {
      type: 'deputy.teaching_attendance.marked',
      entityType: 'timetable_lesson',
      entityId: id,
      title: 'Teaching attendance marked',
      body: 'Deputy Principal marked teaching attendance for a timetable lesson.',
      targetRoles: ['dean_academics', 'principal'],
      metadata: { lesson },
    });
    await this.appendDeputyAudit(tenantId, 'deputy.teaching_attendance.marked', 'timetable_lesson', { id, actorUserId });
    return { success: true, message: 'Teaching attendance marked', lesson };
  }

  async logTeachingLesson(tenantId: string, actorUserId: string | null, id: string) {
    const result = await this.executeSql(
      `
        UPDATE timetable_lessons
        SET metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING id::text, metadata
      `,
      [
        tenantId,
        id,
        JSON.stringify({
          lesson_log_status: 'requested',
          lesson_log_requested_by: actorUserId,
          lesson_log_requested_at: new Date().toISOString(),
        }),
      ],
    );
    const lesson = result.rows[0];
    if (!lesson) {
      throw new Error('Timetable lesson was not found for this school.');
    }
    await this.createDeputyWorkflowEvent(tenantId, actorUserId, {
      type: 'deputy.lesson_log.requested',
      entityType: 'timetable_lesson',
      entityId: id,
      title: 'Lesson log requested',
      body: 'Deputy Principal requested lesson coverage notes for a timetable lesson.',
      targetRoles: ['teacher', 'hod', 'dean_academics'],
      metadata: { lesson },
    });
    await this.appendDeputyAudit(tenantId, 'deputy.lesson_log.requested', 'timetable_lesson', { id, actorUserId });
    return { success: true, message: 'Lesson log request routed', lesson };
  }

  async getTimetable(tenantId: string) {
    const metrics = await this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM timetable_periods WHERE tenant_id = $1) AS total_periods
      `,
      [tenantId],
      { total_periods: 0 }
    );

    const lessonsResult = await this.executeSql(
      `
        SELECT
          relief.id::text,
          CONCAT(lesson.starts_at::text, ' - ', lesson.ends_at::text) AS "lessonTime",
          COALESCE(section.name, stream.name, 'Class not set') AS "className",
          COALESCE(subject.name, subject.code, 'Subject not set') AS subject,
          COALESCE(absent.display_name, absent.full_name, 'Teacher not recorded') AS "absentTeacher",
          COALESCE(relief.status, 'Needed') AS "reliefStatus",
          COALESCE(assigned.display_name, assigned.full_name) AS "assignedTeacher"
        FROM lesson_substitutions relief
        LEFT JOIN timetable_lessons lesson ON lesson.tenant_id = relief.tenant_id AND lesson.id = relief.lesson_id
        LEFT JOIN class_streams stream ON stream.tenant_id = lesson.tenant_id AND stream.id = lesson.stream_id
        LEFT JOIN class_sections section ON section.tenant_id = lesson.tenant_id AND section.id = lesson.stream_id
        LEFT JOIN class_subject_assignments assignment ON assignment.tenant_id = lesson.tenant_id AND assignment.id = lesson.class_subject_assignment_id
        LEFT JOIN subjects subject ON subject.tenant_id = lesson.tenant_id AND subject.id = assignment.subject_id
        LEFT JOIN staff_profiles absent ON absent.tenant_id = relief.tenant_id AND absent.id = relief.absent_teacher_id
        LEFT JOIN staff_profiles assigned ON assigned.tenant_id = relief.tenant_id AND assigned.id = relief.assigned_teacher_id
        WHERE relief.tenant_id = $1
        ORDER BY relief.created_at DESC
        LIMIT 25
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    return {
      metrics,
      lessons: lessonsResult.rows
    };
  }

  async assignReliefTeacher(tenantId: string, actorUserId: string | null, id: string, teacherName: string) {
    const teacherLookup = String(teacherName || '').trim();
    if (!teacherLookup) {
      throw new Error('Relief teacher is required.');
    }
    const result = await this.executeSql(
      `
        WITH teacher AS (
          SELECT id, COALESCE(full_name, display_name) AS name
          FROM staff_profiles
          WHERE tenant_id = $1
            AND (
              id::text = $3
              OR user_id::text = $3
              OR lower(COALESCE(full_name, display_name, '')) = lower($3)
            )
          ORDER BY created_at DESC
          LIMIT 1
        ),
        updated AS (
          UPDATE lesson_substitutions relief
          SET assigned_teacher_id = teacher.id,
              status = 'Assigned',
              updated_at = NOW()
          FROM teacher
          WHERE relief.tenant_id = $1
            AND relief.id = $2::uuid
          RETURNING relief.id::text, relief.assigned_teacher_id::text, relief.status, teacher.name
        )
        SELECT * FROM updated
      `,
      [tenantId, id, teacherLookup],
    ).catch(() => ({ rows: [], rowCount: 0 }));
    const assignment = result.rows[0];
    if (!assignment) {
      const event = await this.createDeputyWorkflowEvent(tenantId, actorUserId, {
        type: 'deputy.relief_teacher.assignment_verification_required',
        entityType: 'lesson_substitution',
        entityId: id,
        title: 'Relief assignment needs verification',
        body: `Could not directly assign ${teacherLookup}; timetable office needs to verify the substitution.`,
        targetRoles: ['dean_academics', 'timetable_manager', 'principal'],
        metadata: { id, teacherLookup },
      });
      return { success: true, message: 'Relief assignment routed for verification', event };
    }
    await this.createDeputyNotification(tenantId, {
      key: `deputy-relief-assigned-${id}-${Date.now()}`,
      type: 'deputy.relief_teacher.assigned',
      title: 'Relief teacher assigned',
      body: `${assignment.name} has been assigned for relief teaching.`,
      targetRoles: ['teacher', 'dean_academics', 'principal'],
      metadata: { assignment },
    });
    await this.appendDeputyAudit(tenantId, 'deputy.relief_teacher.assigned', 'lesson_substitution', { id, teacherLookup, assignment });
    return { success: true, message: `Relief teacher assigned: ${assignment.name}`, assignment };
  }

  async autoAssignRelief(tenantId: string, actorUserId: string | null) {
    const result = await this.executeSql(
      `
        WITH candidates AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
          FROM staff_profiles
          WHERE tenant_id = $1
            AND status = 'active'
        ),
        pending AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
          FROM lesson_substitutions
          WHERE tenant_id = $1
            AND assigned_teacher_id IS NULL
          LIMIT 10
        )
        UPDATE lesson_substitutions relief
        SET assigned_teacher_id = candidates.id,
            status = 'Assigned',
            updated_at = NOW()
        FROM pending
        JOIN candidates ON candidates.rn = ((pending.rn - 1) % GREATEST((SELECT COUNT(*) FROM candidates), 1)) + 1
        WHERE relief.tenant_id = $1
          AND relief.id = pending.id
        RETURNING relief.id::text, relief.assigned_teacher_id::text, relief.status
      `,
      [tenantId],
    ).catch(() => ({ rows: [], rowCount: 0 }));
    await this.createDeputyWorkflowEvent(tenantId, actorUserId, {
      type: 'deputy.relief_teacher.auto_assigned',
      entityType: 'lesson_substitution',
      entityId: null,
      title: 'Relief auto-assignment completed',
      body: `${result.rowCount} pending relief lesson(s) were auto-assigned.`,
      targetRoles: ['dean_academics', 'principal'],
      metadata: { assignments: result.rows },
    });
    await this.appendDeputyAudit(tenantId, 'deputy.relief_teacher.auto_assigned', 'lesson_substitution', { count: result.rowCount, assignments: result.rows });
    return { success: true, message: 'Relief auto-assignment completed', assignedCount: result.rowCount, assignments: result.rows };
  }

  async getAcademics(tenantId: string) {
    const metrics = await this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM subjects WHERE tenant_id = $1 AND status = 'active') AS active_subjects
      `,
      [tenantId],
      { active_subjects: 0 }
    );

    const interventionsResult = await this.executeSql(
      `
        SELECT
          assignment.id::text,
          COALESCE(section.name, stream.name, 'Class not set') AS "className",
          COALESCE(subject.name, subject.code, 'Subject not set') AS subject,
          COALESCE(staff.full_name, staff.display_name, 'Teacher not assigned') AS teacher,
          COALESCE(assignment.metadata->>'coverage', 'Not recorded') AS coverage,
          COALESCE(assignment.metadata->>'concern', 'Review required') AS concern
        FROM class_subject_assignments assignment
        LEFT JOIN class_sections section ON section.tenant_id = assignment.tenant_id AND section.id = assignment.class_section_id
        LEFT JOIN class_streams stream ON stream.tenant_id = assignment.tenant_id AND stream.id = assignment.stream_id
        LEFT JOIN subjects subject ON subject.tenant_id = assignment.tenant_id AND subject.id = assignment.subject_id
        LEFT JOIN staff_profiles staff ON staff.tenant_id = assignment.tenant_id AND staff.id = assignment.staff_member_id
        WHERE assignment.tenant_id = $1
          AND (
            assignment.metadata ? 'concern'
            OR assignment.metadata ? 'coverage'
          )
        ORDER BY assignment.updated_at DESC
        LIMIT 25
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    return {
      metrics,
      interventions: interventionsResult.rows
    };
  }

  async messageHOD(tenantId: string, id: string) {
    const intervention = await this.executeSql(
      `
        SELECT
          assignment.id::text,
          COALESCE(section.name, stream.name, 'Class not set') AS class_name,
          COALESCE(subject.name, subject.code, 'Subject not set') AS subject_name,
          COALESCE(staff.full_name, staff.display_name, 'Teacher not assigned') AS teacher_name,
          COALESCE(assignment.metadata->>'concern', 'Academic intervention requires HOD review') AS concern
        FROM class_subject_assignments assignment
        LEFT JOIN class_sections section ON section.tenant_id = assignment.tenant_id AND section.id = assignment.class_section_id
        LEFT JOIN class_streams stream ON stream.tenant_id = assignment.tenant_id AND stream.id = assignment.stream_id
        LEFT JOIN subjects subject ON subject.tenant_id = assignment.tenant_id AND subject.id = assignment.subject_id
        LEFT JOIN staff_profiles staff ON staff.tenant_id = assignment.tenant_id AND staff.id = assignment.staff_member_id
        WHERE assignment.tenant_id = $1 AND assignment.id::text = $2
        LIMIT 1
      `,
      [tenantId, id],
    ).catch(() => ({ rows: [] as any[] }));
    const row = intervention.rows[0];
    if (!row) {
      throw new Error('Academic intervention was not found for this school.');
    }
    const title = `HOD review requested: ${row.subject_name}`;
    const body = `${row.class_name} needs HOD review. Teacher: ${row.teacher_name}. Concern: ${row.concern}.`;

    await this.createDeputyNotification(tenantId, {
      key: `deputy-hod-message-${id}-${Date.now()}`,
      type: 'deputy.hod.message_requested',
      title,
      body,
      targetRoles: ['hod', 'head_of_department', 'dean_academics'],
      metadata: { interventionId: id, className: row.class_name, subject: row.subject_name, teacher: row.teacher_name },
    });
    await this.appendDeputyAudit(tenantId, 'deputy.hod.message_requested', 'academic_intervention', { id, title, body });
    return { success: true, message: 'HOD notification sent', notification: { title, body } };
  }

  async createIntervention(tenantId: string, userId: string, dto: any) {
    const title = dto?.title || dto?.concern || 'Academic intervention created';
    const body = dto?.description || dto?.notes || `Deputy Principal created an academic intervention for ${dto?.className ?? dto?.class_name ?? 'a class'}.`;
    await this.createDeputyNotification(tenantId, {
      key: `deputy-academic-intervention-${Date.now()}`,
      type: 'deputy.academic_intervention.created',
      title,
      body,
      targetRoles: ['hod', 'head_of_department', 'dean_academics', 'principal'],
      metadata: { createdBy: userId, ...dto },
    });
    await this.appendDeputyAudit(tenantId, 'deputy.academic_intervention.created', 'academic_intervention', { userId, ...dto });
    return { success: true, message: 'Academic intervention created and routed to academic leads' };
  }

  async getExams(tenantId: string) {
    const metrics = await this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM exam_marks WHERE tenant_id = $1 AND status = 'draft') AS draft_marks
      `,
      [tenantId],
      { draft_marks: 0 }
    );

    const examsResult = await this.executeSql(
      `
        SELECT
          mark.id::text,
          COALESCE(series.name, exam.name, 'Exam not set') AS exam,
          COALESCE(section.name, stream.name, 'Class not set') AS "className",
          COALESCE(subject.name, subject.code, 'Subject not set') AS subject,
          COALESCE(staff.full_name, staff.display_name, 'Teacher not recorded') AS teacher,
          COALESCE(mark.status, 'draft') AS progress
        FROM exam_marks mark
        LEFT JOIN exam_series series ON series.tenant_id = mark.tenant_id AND series.id = mark.exam_series_id
        LEFT JOIN exams exam ON exam.tenant_id = mark.tenant_id AND exam.id = mark.exam_id
        LEFT JOIN class_streams stream ON stream.tenant_id = mark.tenant_id AND stream.id = mark.stream_id
        LEFT JOIN class_sections section ON section.tenant_id = mark.tenant_id AND section.id = mark.class_id
        LEFT JOIN subjects subject ON subject.tenant_id = mark.tenant_id AND subject.id = mark.subject_id
        LEFT JOIN staff_profiles staff ON staff.tenant_id = mark.tenant_id AND staff.user_id = mark.teacher_id
        WHERE mark.tenant_id = $1
        ORDER BY mark.updated_at DESC
        LIMIT 25
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    return {
      metrics,
      examsList: examsResult.rows
    };
  }

  async flagExamDelay(tenantId: string, id: string) {
    const updateResult = await this.executeSql(
      `
        UPDATE exam_marks
        SET
          remarks = trim(concat(COALESCE(remarks, ''), CASE WHEN COALESCE(remarks, '') = '' THEN '' ELSE E'\n' END, 'Deputy flagged this mark batch for delay follow-up.')),
          updated_at = NOW()
        WHERE tenant_id = $1 AND id::text = $2
        RETURNING id::text, status, remarks
      `,
      [tenantId, id],
    ).catch(() => ({ rows: [] as any[] }));
    if (!updateResult.rows[0]) {
      throw new Error('Exam mark batch was not found for this school.');
    }
    await this.createDeputyNotification(tenantId, {
      key: `deputy-exam-delay-${id}-${Date.now()}`,
      type: 'deputy.exam_delay.flagged',
      title: 'Exam delay flagged',
      body: `Exam mark batch ${id} was flagged for delay follow-up.`,
      targetRoles: ['exams_manager', 'hod', 'head_of_department', 'dean_academics'],
      metadata: { examMarkId: id, updated: true },
    });
    await this.appendDeputyAudit(tenantId, 'deputy.exam_delay.flagged', 'exam_mark', { id, updated: true });
    return { success: true, message: 'Exam delay flagged and routed' };
  }

  async getClasses(tenantId: string) {
    const metrics = await this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM classes WHERE tenant_id = $1 AND status = 'active') AS active_classes
      `,
      [tenantId],
      { active_classes: 0 }
    );

    const classesResult = await this.executeSql(
      `
        SELECT
          section.id::text,
          section.name,
          COALESCE(staff.full_name, staff.display_name, 'Class teacher not assigned') AS "classTeacher",
          COALESCE(student_counts.count, 0)::int AS "studentCount",
          CASE WHEN section.is_active THEN 'Active' ELSE 'Inactive' END AS status
        FROM class_sections section
        LEFT JOIN class_teachers class_teacher ON class_teacher.tenant_id = section.tenant_id AND class_teacher.class_section_id = section.id
        LEFT JOIN staff_profiles staff ON staff.tenant_id = section.tenant_id AND (staff.user_id = class_teacher.teacher_user_id OR staff.id = class_teacher.staff_profile_id)
        LEFT JOIN (
          SELECT tenant_id, class_id, COUNT(*) AS count
          FROM students
          WHERE tenant_id = $1 AND status = 'active'
          GROUP BY tenant_id, class_id
        ) student_counts ON student_counts.tenant_id = section.tenant_id AND student_counts.class_id = section.id
        WHERE section.tenant_id = $1
        ORDER BY section.name ASC
        LIMIT 50
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    return {
      metrics,
      classesList: classesResult.rows
    };
  }

  async manageStreams(tenantId: string, userId: string, dto: any) {
    const streamId = this.uuidOrNull(dto?.streamId ?? dto?.stream_id ?? dto?.id);
    const targetClass = String(dto?.targetClass ?? dto?.target_class ?? dto?.classId ?? dto?.class_id ?? '').trim();
    const streamName = String(dto?.streamName ?? dto?.stream_name ?? dto?.name ?? '').trim();
    const action = String(dto?.action ?? 'Create New Stream').toLowerCase();
    const capacity = Number.isFinite(Number(dto?.capacity)) ? Number(dto.capacity) : null;
    if (!targetClass || !streamName) {
      throw new Error('Target class and stream name are required.');
    }

    const classResult = await this.executeSql(
      `
        SELECT id::text, name
        FROM class_sections
        WHERE tenant_id = $1
          AND (
            id::text = $2
            OR lower(name) = lower($2)
            OR lower(COALESCE(custom_label, '')) = lower($2)
          )
          AND is_active = TRUE
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [tenantId, targetClass],
    );
    const targetClassRow = classResult.rows[0] as any;
    if (!targetClassRow) {
      throw new Error('Target class was not found for this school.');
    }

    let result: { rows: any[]; rowCount: number };
    if (action.includes('merge')) {
      result = await this.executeSql(
        `
          WITH target_stream AS (
            INSERT INTO class_streams (tenant_id, class_section_id, name, capacity, is_active)
            VALUES ($1, $2::uuid, $3, $4::int, TRUE)
            ON CONFLICT (tenant_id, class_section_id, name)
            DO UPDATE SET
              capacity = COALESCE(EXCLUDED.capacity, class_streams.capacity),
              is_active = TRUE,
              updated_at = NOW()
            RETURNING id, tenant_id, class_section_id, name, capacity, is_active, created_at, updated_at
          ),
          merged AS (
            UPDATE class_streams stream
            SET is_active = FALSE, updated_at = NOW()
            FROM target_stream
            WHERE stream.tenant_id = $1
              AND stream.class_section_id = $2::uuid
              AND stream.id <> target_stream.id
              AND stream.is_active = TRUE
            RETURNING stream.id
          )
          SELECT target_stream.*, (SELECT COUNT(*)::int FROM merged) AS "mergedCount"
          FROM target_stream
        `,
        [tenantId, targetClassRow.id, streamName, capacity],
      );
    } else if (action.includes('rename')) {
      result = await this.executeSql(
        `
          WITH selected_stream AS (
            SELECT id
            FROM class_streams
            WHERE tenant_id = $1
              AND class_section_id = $2::uuid
              AND ($5::uuid IS NULL OR id = $5::uuid)
              AND is_active = TRUE
            ORDER BY updated_at DESC
            LIMIT 1
          ),
          updated AS (
            UPDATE class_streams stream
            SET name = $3,
                capacity = COALESCE($4::int, capacity),
                updated_at = NOW()
            FROM selected_stream
            WHERE stream.tenant_id = $1
              AND stream.id = selected_stream.id
            RETURNING stream.*
          )
          SELECT * FROM updated
        `,
        [tenantId, targetClassRow.id, streamName, capacity, streamId],
      );
      if (!result.rows[0]) {
        result = await this.executeSql(
          `
            INSERT INTO class_streams (tenant_id, class_section_id, name, capacity, is_active)
            VALUES ($1, $2::uuid, $3, $4::int, TRUE)
            ON CONFLICT (tenant_id, class_section_id, name)
            DO UPDATE SET
              capacity = COALESCE(EXCLUDED.capacity, class_streams.capacity),
              is_active = TRUE,
              updated_at = NOW()
            RETURNING *
          `,
          [tenantId, targetClassRow.id, streamName, capacity],
        );
      }
    } else {
      result = await this.executeSql(
        `
          INSERT INTO class_streams (tenant_id, class_section_id, name, capacity, is_active)
          VALUES ($1, $2::uuid, $3, $4::int, TRUE)
          ON CONFLICT (tenant_id, class_section_id, name)
          DO UPDATE SET
            capacity = COALESCE(EXCLUDED.capacity, class_streams.capacity),
            is_active = TRUE,
            updated_at = NOW()
          RETURNING *
        `,
        [tenantId, targetClassRow.id, streamName, capacity],
      );
    }

    const stream = result.rows[0];
    if (!stream) {
      throw new Error('Stream configuration could not be saved for this school.');
    }
    await this.createDeputyNotification(tenantId, {
      key: `deputy-stream-configuration-${stream.id ?? streamName}-${Date.now()}`,
      type: 'deputy.stream_configuration.updated',
      title: `Stream updated: ${streamName}`,
      body: `${targetClassRow.name} stream configuration was saved by the Deputy Principal.`,
      targetRoles: ['principal', 'dean_academics', 'class_teacher'],
      metadata: { userId, targetClass, streamName, action, stream },
    });
    await this.appendDeputyAudit(tenantId, 'deputy.stream_configuration.updated', 'class_stream', { userId, targetClass, streamName, action, stream });
    return { success: true, message: 'Stream configuration updated', stream };
  }

  async getApprovals(tenantId: string) {
    const metrics = await this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM operational_requests WHERE tenant_id = $1 AND status IN ('PENDING', 'REQUESTED', 'pending', 'requested')) AS pending_approvals
      `,
      [tenantId],
      { pending_approvals: 0 }
    );

    const approvalsResult = await this.executeSql(
      `
        SELECT
          id::text,
          COALESCE(action_type, type, 'Approval') AS type,
          COALESCE(origin_role, requester_role, created_by, 'Requester not recorded') AS "raisedBy",
          COALESCE(related_record_id::text, title, 'Record not linked') AS "affectedPerson",
          COALESCE(status, 'Pending Approval') AS status
        FROM operational_requests
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT 25
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    return {
      metrics,
      approvalsList: approvalsResult.rows
    };
  }

  async actionApproval(tenantId: string, id: string, action: string) {
    const normalizedAction = String(action || '').toLowerCase() === 'reject' ? 'REJECTED' : 'APPROVED';
    const updateResult = await this.executeSql(
      `
        UPDATE operational_requests
        SET
          status = $3,
          status_detail = concat('Deputy Principal ', lower($3), ' this request.'),
          updated_at = NOW()
        WHERE tenant_id = $1 AND id::text = $2
        RETURNING id::text, title, status
      `,
      [tenantId, id, normalizedAction],
    ).catch(() => ({ rows: [] as any[] }));
    await this.createDeputyNotification(tenantId, {
      key: `deputy-approval-${id}-${normalizedAction}-${Date.now()}`,
      type: 'deputy.approval.action_recorded',
      title: `Approval ${normalizedAction.toLowerCase()}`,
      body: updateResult.rows[0]
        ? `${updateResult.rows[0].title ?? 'Approval request'} was ${normalizedAction.toLowerCase()} by the Deputy Principal.`
        : `Approval action ${normalizedAction.toLowerCase()} was requested for ${id}, but the request row needs verification.`,
      targetRoles: ['principal', 'system_monitor'],
      metadata: { approvalId: id, action: normalizedAction, updated: Boolean(updateResult.rows[0]) },
    });
    await this.appendDeputyAudit(tenantId, 'deputy.approval.action_recorded', 'operational_request', { id, action: normalizedAction, updated: Boolean(updateResult.rows[0]) });
    return { success: true, message: updateResult.rows[0] ? `Approval ${normalizedAction.toLowerCase()} and notification sent` : 'Approval action routed for verification' };
  }

  async getCommunication(tenantId: string) {
    return this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM announcements WHERE tenant_id = $1) AS total_announcements
      `,
      [tenantId],
      { total_announcements: 0 }
    );
  }

  async getReports(tenantId: string) {
    const metrics = await this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM report_snapshots WHERE tenant_id = $1 AND module = 'deputy-command') AS generated_reports
      `,
      [tenantId],
      { generated_reports: 0 }
    );

    const reportsResult = await this.executeSql(
      `
        SELECT
          id::text,
          title AS "reportName",
          created_at::text AS "generatedDate",
          format AS type,
          'Ready' AS status
        FROM report_snapshots
        WHERE tenant_id = $1
          AND module = 'deputy-command'
        ORDER BY created_at DESC
        LIMIT 25
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    return {
      metrics,
      reportsList: reportsResult.rows
    };
  }

  async generateReport(tenantId: string, name: string, format: string) {
    const normalizedFormat = ['csv', 'xlsx', 'pdf'].includes(String(format || '').toLowerCase())
      ? String(format).toLowerCase()
      : 'pdf';
    const reportName = String(name || 'Deputy Principal operational report').trim();
    const [overview, dailyOperations, attendance, discipline, welfare, teaching, timetable, academics, exams, classes, approvals, staff] = await Promise.all([
      this.getOverview(tenantId),
      this.getDailyOperations(tenantId),
      this.getAttendance(tenantId),
      this.getDiscipline(tenantId),
      this.getWelfare(tenantId),
      this.getTeaching(tenantId),
      this.getTimetable(tenantId),
      this.getAcademics(tenantId),
      this.getExams(tenantId),
      this.getClasses(tenantId),
      this.getApprovals(tenantId),
      this.getStaff(tenantId),
    ]);
    const snapshotId = `deputy-${Date.now()}-${randomUUID()}`;
    const manifest = {
      module: 'deputy-command',
      reportName,
      format: normalizedFormat,
      generatedAt: new Date().toISOString(),
      sections: {
        overview,
        dailyOperations,
        attendance,
        discipline,
        welfare,
        teaching,
        timetable,
        academics,
        exams,
        classes,
        approvals,
        staff,
      },
    };
    const manifestJson = JSON.stringify(manifest);
    const checksum = createHash('sha256').update(manifestJson).digest('hex');

    await this.executeSql(
      `
        INSERT INTO report_snapshots (
          tenant_id, snapshot_id, module, report_id, title, format, artifact, filters, generated_by_user_id, manifest, manifest_checksum_sha256
        )
        VALUES ($1, $2, 'deputy-command', $3, $4, $5, $6::jsonb, '{}'::jsonb, NULL, $7::jsonb, $8)
      `,
      [
        tenantId,
        snapshotId,
        `deputy-${this.stableKey(reportName).replace(/attendance/g, 'attn')}`,
        reportName,
        normalizedFormat,
        JSON.stringify({
          kind: 'compiled-json-report',
          filename: `deputy-${this.stableKey(reportName).replace(/attendance/g, 'attn')}.${normalizedFormat}`,
          section_count: Object.keys(manifest.sections).length,
        }),
        manifestJson,
        checksum,
      ],
    );
    await this.executeSql(
      `
        INSERT INTO report_snapshot_audit_logs (tenant_id, snapshot_id, action, actor_user_id, request_id, metadata)
        VALUES ($1, $2, 'deputy.report.generated', NULL, current_setting('app.request_id', true), $3::jsonb)
      `,
      [tenantId, snapshotId, JSON.stringify({ reportName, format: normalizedFormat, checksum })],
    ).catch(() => undefined);
    await this.createDeputyNotification(tenantId, {
      key: `deputy-report-generated-${snapshotId}`,
      type: 'deputy.report.generated',
      title: `${reportName} generated`,
      body: `Deputy Principal report was compiled with ${Object.keys(manifest.sections).length} operational sections.`,
      targetRoles: ['principal', 'deputy_principal', 'system_monitor'],
      metadata: { snapshotId, reportName, format: normalizedFormat, checksum },
    });
    await this.appendDeputyAudit(tenantId, 'deputy.report.generated', 'report_snapshot', { snapshotId, reportName, format: normalizedFormat, checksum });
    return { success: true, message: 'Report compiled and stored', snapshotId, report: manifest };
  }

  async getStaff(tenantId: string) {
    const metrics = await this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM staff_profiles WHERE tenant_id = $1 AND status = 'active') AS active_staff
      `,
      [tenantId],
      { active_staff: 0 }
    );

    const staffResult = await this.executeSql(
      `
        SELECT
          staff.id::text,
          COALESCE(staff.full_name, staff.display_name, 'Unnamed staff') AS name,
          COALESCE(role.name, staff.role, staff.job_title, 'Role not assigned') AS role,
          COALESCE(department.name, staff.department, 'Department not assigned') AS department,
          COALESCE(staff.status, 'active') AS status
        FROM staff_profiles staff
        LEFT JOIN user_roles user_role ON user_role.tenant_id = staff.tenant_id AND user_role.user_id = staff.user_id
        LEFT JOIN roles role ON role.id = user_role.role_id
        LEFT JOIN departments department ON department.tenant_id = staff.tenant_id AND department.id = staff.department_id
        WHERE staff.tenant_id = $1
        ORDER BY staff.created_at DESC
        LIMIT 50
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    return {
      metrics,
      staffList: staffResult.rows
    };
  }

  async assignRole(tenantId: string, dto: any) {
    const staffLookup = String(dto?.staffId ?? dto?.staff_id ?? dto?.userId ?? dto?.user_id ?? dto?.name ?? '').trim();
    const roleLookup = String(dto?.roleId ?? dto?.role_id ?? dto?.roleCode ?? dto?.role_code ?? dto?.role ?? '').trim();
    const actorUserId = this.uuidOrNull(dto?.assignedByUserId ?? dto?.assigned_by_user_id ?? dto?.actorUserId);

    if (!staffLookup || !roleLookup) {
      throw new Error('Staff and role are required before assigning a role.');
    }

    const result = await this.executeSql(
      `
        WITH target_staff AS (
          SELECT id, user_id, COALESCE(full_name, display_name) AS staff_name
          FROM staff_profiles
          WHERE tenant_id = $1
            AND (
              id::text = $2
              OR user_id::text = $2
              OR lower(COALESCE(full_name, display_name, '')) = lower($2)
            )
          ORDER BY created_at DESC
          LIMIT 1
        ),
        target_role AS (
          SELECT id, COALESCE(name, code) AS role_name
          FROM roles
          WHERE (school_id IS NULL OR school_id = $1)
            AND (
              id::text = $3
              OR lower(code) = lower($3)
              OR lower(name) = lower($3)
            )
          ORDER BY CASE WHEN school_id = $1 THEN 0 ELSE 1 END, created_at DESC
          LIMIT 1
        ),
        inserted AS (
          INSERT INTO user_roles (
            school_id, user_id, role_id, scope_type, scope_id, assigned_by_user_id, status
          )
          SELECT
            $1,
            target_staff.user_id,
            target_role.id,
            'SCHOOL',
            NULL,
            COALESCE($4::uuid, target_staff.user_id),
            'ACTIVE'
          FROM target_staff, target_role
          WHERE NOT EXISTS (
            SELECT 1
            FROM user_roles existing
            WHERE existing.school_id = $1
              AND existing.user_id = target_staff.user_id
              AND existing.role_id = target_role.id
              AND existing.deleted_at IS NULL
          )
          RETURNING id::text, user_id::text, role_id::text
        )
        SELECT
          inserted.id,
          target_staff.user_id::text AS "userId",
          target_staff.staff_name AS "staffName",
          target_role.id::text AS "roleId",
          target_role.role_name AS "roleName",
          CASE WHEN inserted.id IS NULL THEN 'already_assigned' ELSE 'assigned' END AS status
        FROM target_staff
        CROSS JOIN target_role
        LEFT JOIN inserted ON TRUE
      `,
      [tenantId, staffLookup, roleLookup, actorUserId],
    );

    const assignment = result.rows[0];
    if (!assignment) {
      throw new Error('No matching staff member or role was found for this school.');
    }

    await this.createDeputyNotification(tenantId, {
      key: `deputy-role-assigned-${assignment.userId}-${assignment.roleId}-${Date.now()}`,
      type: 'deputy.staff_role.assigned',
      title: `Role assigned: ${assignment.roleName}`,
      body: `${assignment.staffName} now has ${assignment.roleName} access in this school.`,
      targetRoles: ['principal', 'deputy_principal', 'system_monitor'],
      metadata: { assignment, department: dto?.department },
    });
    await this.appendDeputyAudit(tenantId, 'deputy.staff_role.assigned', 'staff_profile', { assignment, dto });
    return { success: true, message: assignment.status === 'already_assigned' ? 'Role was already assigned' : 'Role assigned', assignment };
  }

  private async appendDeputyAudit(
    tenantId: string,
    action: string,
    resourceType: string,
    metadata: Record<string, unknown>,
  ) {
    await this.executeSql(
      `
        INSERT INTO audit_logs (
          tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
        )
        VALUES ($1, NULL, current_setting('app.request_id', true), $2, $3, NULL, $4::jsonb)
      `,
      [tenantId, action, resourceType, JSON.stringify(metadata)],
    ).catch(() => undefined);
  }

  private async createDeputyNotification(
    tenantId: string,
    input: {
      key: string;
      type: string;
      title: string;
      body: string;
      targetRoles: string[];
      metadata?: Record<string, unknown>;
    },
  ) {
    const metadata = {
      ...(input.metadata ?? {}),
      target_roles: input.targetRoles,
      source_module: 'deputy-command',
    };

    await this.executeSql(
      `
        INSERT INTO notifications (
          tenant_id,
          notification_key,
          recipient_user_id,
          recipient_guardian_id,
          type,
          title,
          body,
          status,
          metadata
        )
        VALUES ($1, $2, NULL, NULL, $3, $4, $5, 'unread', $6::jsonb)
        ON CONFLICT (tenant_id, notification_key)
        DO UPDATE SET
          title = EXCLUDED.title,
          body = EXCLUDED.body,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `,
      [tenantId, input.key, input.type, input.title, input.body, JSON.stringify(metadata)],
    ).catch(async () => {
      await this.executeSql(
        `
          INSERT INTO notifications (
            school_id,
            target_role,
            module,
            event_type,
            entity_type,
            entity_id,
            channel,
            title,
            message,
            priority,
            status,
            action_url,
            action_label,
            metadata_json
          )
          SELECT
            $1,
            role_name,
            'deputy-command',
            $2,
            'deputy-action',
            $3,
            'IN_APP',
            $4,
            $5,
            'HIGH',
            'UNREAD',
            '/school/deputy-principal/approvals',
            'Open deputy workspace',
            $6::jsonb
          FROM unnest($7::text[]) AS role_name
        `,
        [
          tenantId,
          input.type,
          input.key,
          input.title,
          input.body,
          JSON.stringify(metadata),
          input.targetRoles,
        ],
      ).catch(() => undefined);
    });
  }

  private async createDeputyWorkflowEvent(
    tenantId: string,
    actorUserId: string | null,
    input: {
      type: string;
      entityType: string;
      entityId: string | null;
      title: string;
      body: string;
      targetRoles: string[];
      metadata?: Record<string, unknown>;
    },
  ) {
    const result = await this.executeSql(
      `
        INSERT INTO workflow_events (
          tenant_id,
          source_user_id,
          source_role,
          target_roles,
          event_type,
          entity_type,
          entity_id,
          title,
          message,
          priority,
          payload
        )
        VALUES ($1, $2::uuid, 'deputy_principal', $3::jsonb, $4, $5, $6, $7, $8, 'normal', $9::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        this.uuidOrNull(actorUserId),
        JSON.stringify(input.targetRoles),
        input.type,
        input.entityType,
        input.entityId,
        input.title,
        input.body,
        JSON.stringify({
          ...(input.metadata ?? {}),
          source_dashboard: 'deputy-command',
        }),
      ],
    );

    await this.createDeputyNotification(tenantId, {
      key: `${input.type}-${input.entityId ?? 'all'}-${Date.now()}`,
      type: input.type,
      title: input.title,
      body: input.body,
      targetRoles: input.targetRoles,
      metadata: {
        ...(input.metadata ?? {}),
        entity_type: input.entityType,
        entity_id: input.entityId,
      },
    });

    return result.rows[0];
  }

  private stableKey(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'deputy-report';
  }

  private uuidOrNull(value: unknown) {
    const text = typeof value === 'string' ? value : '';
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
      ? text
      : null;
  }

  private parseDutyTimeRange(value: unknown) {
    const text = String(value ?? '').trim();
    const match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(?:-|to|until)\s*(\d{1,2})(?::(\d{2}))?/i);
    if (!match) {
      return { startTime: '08:00', endTime: '17:00' };
    }
    const startHour = Math.max(0, Math.min(23, Number(match[1])));
    const endHour = Math.max(0, Math.min(23, Number(match[3])));
    const startMinute = Math.max(0, Math.min(59, Number(match[2] ?? 0)));
    const endMinute = Math.max(0, Math.min(59, Number(match[4] ?? 0)));
    return {
      startTime: `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
      endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
    };
  }

  private async safeQuery<T>(
    sql: string,
    values: unknown[],
    fallback: T
  ): Promise<T> {
    try {
      const result = await this.executeSql(sql, values);
      return (result.rows[0] as T) || fallback;
    } catch (error) {
      const code = typeof error === 'object' && error ? (error as { code?: string }).code : undefined;
      if (code === '42P01' || code === '42703') {
        return fallback;
      }
      throw error;
    }
  }
}
