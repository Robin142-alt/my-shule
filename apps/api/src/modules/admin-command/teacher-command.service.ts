import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { notificationRecipientPredicate } from '../notifications/notification-recipient-predicate';
import { AdminCommandOperationsService } from './admin-command-operations.service';

@Injectable()
export class TeacherCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly operations: AdminCommandOperationsService,
  ) {}

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  private requireUserId(): string {
    const userId = this.requestContext.getStore()?.user_id;
    if (!userId) {
      throw new UnauthorizedException('Authenticated teacher context is required');
    }
    return userId;
  }

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    return this.prisma.query<T>(query, params);
  }

  private titleCaseStatus(value: unknown): string {
    return String(value || 'pending')
      .replace(/_/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private normalizePriority(value: unknown): 'low' | 'normal' | 'high' | 'urgent' {
    const normalized = String(value || 'normal').trim().toLowerCase();
    return normalized === 'low' || normalized === 'high' || normalized === 'urgent' ? normalized : 'normal';
  }

  private async nextSequenceCode(tenantId: string, table: string, prefix: string): Promise<string> {
    const result = await this.executeSql<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM ${table} WHERE tenant_id = $1`,
      [tenantId],
    );
    const next = (result.rows[0]?.count ?? 0) + 1;
    return `${prefix}-${new Date().getFullYear()}-${String(next).padStart(5, '0')}`;
  }

  async getProfile() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const res = await this.executeSql(
      `SELECT * FROM staff_profiles WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId]
    );
    return res.rows[0] || { name: 'Teacher', email: '' };
  }

  async getAcademicSetup() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM academic_years WHERE tenant_id = $1 AND lower(status::text) = 'active'`,
      [tenantId]
    );
    return res.rows;
  }

  async getSubjectAllocations() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const res = await this.executeSql(
      `
        SELECT
          assignment.id::text,
          subject.name AS subject,
          class_section.name AS class_name,
          class_section.name AS stream,
          COUNT(timetable.id)::int AS lessons_per_week,
          INITCAP(assignment.status) AS status
        FROM teacher_subject_assignments assignment
        INNER JOIN subjects subject
          ON subject.tenant_id = assignment.tenant_id
         AND subject.id::text = assignment.subject_id::text
        INNER JOIN class_sections class_section
          ON class_section.tenant_id = assignment.tenant_id
         AND class_section.id::text = assignment.class_section_id::text
        LEFT JOIN timetable_slots timetable
          ON timetable.tenant_id = assignment.tenant_id
         AND timetable.class_section_id::text = assignment.class_section_id::text
         AND timetable.subject_id::text = assignment.subject_id::text
         AND timetable.teacher_id::text = assignment.teacher_user_id::text
        WHERE assignment.tenant_id = $1
          AND assignment.teacher_user_id::text = $2
          AND assignment.status = 'active'
          AND assignment.effective_from <= CURRENT_DATE
          AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
        GROUP BY assignment.id, subject.name, class_section.name, assignment.status
        ORDER BY subject.name, class_section.name
      `,
      [tenantId, userId]
    );
    const items = res.rows as any[];
    return {
      metrics: {
        total_subjects: new Set(items.map((item) => item.subject)).size,
        total_lessons: items.reduce((sum, item) => sum + Number(item.lessons_per_week || 0), 0),
      },
      items,
    };
  }

  async getSyllabusCoverage() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const res = await this.executeSql(
      `
        WITH assigned_subjects AS (
          SELECT
            assignment.id,
            assignment.tenant_id,
            assignment.class_section_id,
            assignment.subject_id,
            assignment.teacher_user_id,
            subject.name AS subject,
            class_section.name AS class_name
          FROM teacher_subject_assignments assignment
          INNER JOIN subjects subject
            ON subject.tenant_id = assignment.tenant_id
           AND subject.id::text = assignment.subject_id::text
          INNER JOIN class_sections class_section
            ON class_section.tenant_id = assignment.tenant_id
           AND class_section.id::text = assignment.class_section_id::text
          WHERE assignment.tenant_id = $1
            AND assignment.teacher_user_id::text = $2
            AND assignment.status = 'active'
            AND assignment.effective_from <= CURRENT_DATE
            AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
        ), coverage AS (
          SELECT
            assignment.id,
            assignment.subject,
            assignment.class_name,
            COUNT(DISTINCT plan.id)::int AS planned_topics,
            COUNT(DISTINCT log.plan_id) FILTER (WHERE log.id IS NOT NULL)::int AS covered_topics,
            COALESCE(
              (ARRAY_AGG(log.covered_topics ORDER BY log.log_date DESC)
                FILTER (WHERE log.covered_topics IS NOT NULL))[1],
              (ARRAY_AGG(plan.topic ORDER BY plan.updated_at DESC)
                FILTER (WHERE plan.topic IS NOT NULL))[1],
              'No lesson plan yet'
            ) AS topic
          FROM assigned_subjects assignment
          LEFT JOIN academics_lesson_plans plan
            ON plan.tenant_id::text = assignment.tenant_id
           AND plan.teacher_id::text = assignment.teacher_user_id::text
           AND plan.class_id::text = assignment.class_section_id::text
           AND plan.subject_id::text = assignment.subject_id::text
          LEFT JOIN academics_lesson_logs log
            ON log.tenant_id::text = assignment.tenant_id
           AND log.teacher_id::text = assignment.teacher_user_id::text
           AND log.class_id::text = assignment.class_section_id::text
           AND log.plan_id = plan.id
          GROUP BY assignment.id, assignment.subject, assignment.class_name
        )
        SELECT
          id::text,
          subject,
          class_name,
          topic,
          CASE
            WHEN planned_topics = 0 THEN 0
            ELSE LEAST(100, ROUND((covered_topics::numeric / planned_topics::numeric) * 100))::int
          END AS coverage,
          100::int AS target,
          CASE
            WHEN planned_topics > 0 AND covered_topics >= planned_topics THEN 'On Track'
            ELSE 'Behind'
          END AS status
        FROM coverage
        ORDER BY subject, class_name
      `,
      [tenantId, userId]
    );
    const items = res.rows as any[];
    return {
      metrics: {
        on_track: items.filter((item) => String(item.status).toLowerCase() === 'on track').length,
        behind: items.filter((item) => String(item.status).toLowerCase() === 'behind').length,
      },
      items,
    };
  }

  async getLessonPlans() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const res = await this.executeSql(
      `
        SELECT
          plan.id::text,
          subject.name AS subject,
          class_section.name AS class_name,
          plan.week_number AS week,
          plan.topic,
          INITCAP(plan.status) AS status
        FROM academics_lesson_plans plan
        INNER JOIN subjects subject
          ON subject.tenant_id = plan.tenant_id
         AND subject.id::text = plan.subject_id::text
        INNER JOIN class_sections class_section
          ON class_section.tenant_id = plan.tenant_id
         AND class_section.id::text = plan.class_id::text
        WHERE plan.tenant_id = $1
          AND plan.teacher_id::text = $2
        ORDER BY plan.updated_at DESC
      `,
      [tenantId, userId]
    );
    const items = res.rows as any[];
    return {
      metrics: {
        submitted: items.filter((item) => String(item.status).toLowerCase() === 'submitted').length,
        approved: items.filter((item) => String(item.status).toLowerCase() === 'approved').length,
        draft: items.filter((item) => String(item.status).toLowerCase() === 'draft').length,
      },
      items,
    };
  }

  async getResources() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const res = await this.executeSql(
      `
        SELECT
          resource.id::text,
          resource.title,
          subject.name AS subject,
          resource.type,
          resource.created_at::text AS uploaded_at,
          INITCAP(resource.status) AS status
        FROM academics_resources resource
        LEFT JOIN subjects subject
          ON subject.tenant_id = resource.tenant_id
         AND subject.id::text = resource.subject_id::text
        WHERE resource.tenant_id = $1
          AND resource.teacher_id::text = $2
        ORDER BY resource.created_at DESC
      `,
      [tenantId, userId]
    );
    const items = res.rows as any[];
    return {
      metrics: {
        total: items.length,
        shared: items.filter((item) => String(item.status).toLowerCase() === 'published').length,
      },
      items,
    };
  }

  async getMarkEntry() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const res = await this.executeSql(
      `
        SELECT
          mark.id::text,
          mark.exam_series_id::text,
          mark.assessment_id::text,
          mark.academic_term_id::text,
          mark.class_section_id::text,
          mark.subject_id::text,
          mark.student_id::text,
          mark.score::text,
          mark.remarks,
          mark.status,
          mark.created_at::text,
          mark.updated_at::text
        FROM exam_marks mark
        WHERE mark.tenant_id = $1
          AND mark.entered_by_user_id = $2::uuid
        ORDER BY mark.updated_at DESC
      `,
      [tenantId, userId]
    );
    return res.rows;
  }

  async getCBCAssessments() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const res = await this.executeSql(
      `
        SELECT
          entry.id::text,
          concat_ws(' ', student.first_name, student.middle_name, student.last_name) AS learner,
          entry.class_id::text AS class_name,
          ''::text AS subject,
          entry.strand_id::text AS strand,
          entry.level::text AS score,
          INITCAP(entry.status::text) AS status
        FROM cbc_assessment_entries entry
        INNER JOIN students student
          ON student.id::text = entry.student_id::text
         AND student.school_id::text = entry.school_id::text
        WHERE entry.school_id::text = $1
          AND entry.teacher_user_id::text = $2
          AND entry.deleted_at IS NULL
        ORDER BY entry.updated_at DESC
      `,
      [tenantId, userId]
    );
    const items = res.rows as any[];
    return {
      metrics: {
        pending: items.filter((item) => String(item.status).toLowerCase() === 'draft').length,
        completed: items.filter((item) => String(item.status).toLowerCase() !== 'draft').length,
      },
      items,
    };
  }

  async getLearnerProgress() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const res = await this.executeSql(
      `
        SELECT
          student.id::text,
          concat_ws(' ', student.first_name, student.middle_name, student.last_name) AS learner,
          class_section.name AS class_name,
          subject.name AS subject,
          CASE
            WHEN COUNT(mark.id) = 0 THEN '--'
            ELSE CONCAT(ROUND(AVG(mark.score), 1), '%')
          END AS score,
          'No trend'::text AS trend,
          CASE
            WHEN COUNT(mark.id) = 0 THEN 'Pending'
            WHEN AVG(mark.score) < 50 THEN 'At risk'
            ELSE 'On track'
          END AS status
        FROM teacher_subject_assignments assignment
        INNER JOIN student_class_assignments student_assignment
          ON student_assignment.tenant_id = assignment.tenant_id
         AND student_assignment.class_section_id::text = assignment.class_section_id::text
              AND (assignment.stream_id IS NULL OR assignment.stream_id::text = student_assignment.stream_id::text)
         AND student_assignment.status = 'active'
        INNER JOIN students student
          ON student.tenant_id = student_assignment.tenant_id
         AND student.id::text = student_assignment.student_id::text
        INNER JOIN class_sections class_section
          ON class_section.tenant_id = assignment.tenant_id
         AND class_section.id::text = assignment.class_section_id::text
        INNER JOIN subjects subject
          ON subject.tenant_id = assignment.tenant_id
         AND subject.id::text = assignment.subject_id::text
        LEFT JOIN exam_marks mark
          ON mark.tenant_id = assignment.tenant_id
         AND mark.student_id::text = student.id::text
         AND mark.class_section_id::text = assignment.class_section_id::text
         AND mark.subject_id::text = assignment.subject_id::text
        WHERE assignment.tenant_id = $1
          AND assignment.teacher_user_id::text = $2
          AND assignment.status = 'active'
          AND assignment.effective_from <= CURRENT_DATE
          AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
        GROUP BY student.id, student.first_name, student.middle_name, student.last_name,
                 class_section.name, subject.name
        ORDER BY class_section.name, subject.name, learner
      `,
      [tenantId, userId]
    );
    const items = res.rows as any[];
    return {
      metrics: {
        tracked: items.length,
        at_risk: items.filter((item) => String(item.status).toLowerCase() === 'at risk').length,
      },
      items,
    };
  }

  async getAttendance() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const res = await this.executeSql(
      `
        SELECT
          attendance.id::text,
          attendance.date::text AS date,
          '--'::text AS check_in,
          '--'::text AS check_out,
          INITCAP(REPLACE(attendance.status, '_', ' ')) AS status
        FROM staff_profiles profile
        INNER JOIN staff_attendance attendance
          ON attendance.tenant_id = profile.tenant_id
         AND attendance.staff_profile_id = profile.id
        WHERE profile.tenant_id = $1
          AND profile.user_id::text = $2
        ORDER BY attendance.date DESC
      `,
      [tenantId, userId]
    );
    const items = res.rows as any[];
    return {
      metrics: {
        present_days: items.filter((item) => String(item.status).toLowerCase() === 'present').length,
        absent: items.filter((item) => String(item.status).toLowerCase() === 'absent').length,
      },
      items,
    };
  }

  async getStudentNotes() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const res = await this.executeSql(
      `
        SELECT
          note.id::text,
          concat_ws(' ', student.first_name, student.middle_name, student.last_name) AS student_name,
          class_section.name AS class_name,
          note.created_at::date::text AS date,
          INITCAP(REPLACE(note.note_type, '_', ' ')) AS category,
          INITCAP(note.visibility) AS status
        FROM student_notes note
        INNER JOIN students student
          ON student.tenant_id = note.tenant_id
         AND student.id::text = note.student_id::text
        INNER JOIN student_class_assignments student_assignment
          ON student_assignment.tenant_id = note.tenant_id
         AND student_assignment.student_id::text = note.student_id::text
         AND student_assignment.status = 'active'
        INNER JOIN class_sections class_section
          ON class_section.tenant_id = student_assignment.tenant_id
         AND class_section.id::text = student_assignment.class_section_id::text
        WHERE note.tenant_id = $1
          AND note.created_by_user_id::text = $2
          AND EXISTS (
            SELECT 1
            FROM teacher_subject_assignments assignment
            WHERE assignment.tenant_id = note.tenant_id
              AND assignment.teacher_user_id::text = $2
              AND assignment.class_section_id::text = student_assignment.class_section_id::text
              AND (assignment.stream_id IS NULL OR assignment.stream_id::text = student_assignment.stream_id::text)
              AND assignment.status = 'active'
              AND assignment.effective_from <= CURRENT_DATE
              AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
          )
        ORDER BY note.created_at DESC
      `,
      [tenantId, userId]
    );
    const items = res.rows as any[];
    return {
      metrics: {
        active: items.length,
        flagged: items.filter((item) => String(item.category).toLowerCase().includes('flag')).length,
      },
      items,
    };
  }

  async getClubs() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const res = await this.executeSql(
      `
        SELECT
          assignment.id::text,
          subject.name AS activity,
          COALESCE(
            STRING_AGG(
              DISTINCT CONCAT(
                CASE timetable.day_of_week
                  WHEN 1 THEN 'Mon'
                  WHEN 2 THEN 'Tue'
                  WHEN 3 THEN 'Wed'
                  WHEN 4 THEN 'Thu'
                  WHEN 5 THEN 'Fri'
                  WHEN 6 THEN 'Sat'
                  WHEN 7 THEN 'Sun'
                END,
                ' ',
                TO_CHAR(timetable.starts_at, 'HH24:MI')
              ),
              ', '
            ),
            'Not scheduled'
          ) AS date,
          (
            SELECT COUNT(*)::int
            FROM student_class_assignments placement
            WHERE placement.tenant_id = assignment.tenant_id
              AND placement.class_section_id::text = assignment.class_section_id::text
              AND placement.status = 'active'
          ) AS expected,
          'Not recorded'::text AS present,
          CASE
            WHEN COUNT(timetable.id) FILTER (
              WHERE timetable.day_of_week = EXTRACT(ISODOW FROM CURRENT_DATE)::int
            ) > 0 THEN 'Scheduled Today'
            ELSE 'Active'
          END AS status,
          (COUNT(timetable.id) FILTER (
            WHERE timetable.day_of_week = EXTRACT(ISODOW FROM CURRENT_DATE)::int
          ))::int AS sessions_today
        FROM teacher_subject_assignments assignment
        INNER JOIN subjects subject
          ON subject.tenant_id = assignment.tenant_id
         AND subject.id::text = assignment.subject_id::text
        INNER JOIN class_sections class_section
          ON class_section.tenant_id = assignment.tenant_id
         AND class_section.id::text = assignment.class_section_id::text
        LEFT JOIN timetable_slots timetable
          ON timetable.tenant_id = assignment.tenant_id
         AND timetable.teacher_id::text = assignment.teacher_user_id::text
         AND timetable.class_section_id::text = assignment.class_section_id::text
         AND timetable.subject_id::text = assignment.subject_id::text
         AND timetable.status = 'published'
        WHERE assignment.tenant_id = $1
          AND assignment.teacher_user_id::text = $2
          AND assignment.status = 'active'
          AND assignment.effective_from <= CURRENT_DATE
          AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
          AND (subject.is_co_curricular = TRUE OR subject.subject_type = 'co_curricular')
        GROUP BY
          assignment.id,
          assignment.tenant_id,
          assignment.class_section_id,
          subject.name
        ORDER BY subject.name, assignment.id
      `,
      [tenantId, userId]
    );
    const rows = res.rows as any[];
    return {
      metrics: {
        active_clubs: rows.length,
        sessions_today: rows.reduce((sum, item) => sum + Number(item.sessions_today || 0), 0),
      },
      items: rows.map(({ sessions_today: _sessionsToday, ...item }) => item),
    };
  }

  async getInvigilation() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const res = await this.executeSql(
      `
        SELECT
          assignment.id::text,
          slot.date::text AS date,
          concat_ws(' - ', slot.start_time::text, slot.end_time::text) AS time,
          series.name AS exam,
          COALESCE(slot.room_name, 'Room not set') AS room,
          COALESCE(assessment.name, 'General paper') AS paper,
          ''::text AS class_name,
          INITCAP(assignment.status) AS status
        FROM exam_invigilators assignment
        INNER JOIN exam_timetable_slots slot
          ON slot.tenant_id = assignment.tenant_id
         AND slot.id = assignment.timetable_slot_id
        INNER JOIN exam_series series
          ON series.tenant_id = slot.tenant_id
         AND series.id = slot.exam_series_id
        LEFT JOIN exam_assessments assessment
          ON assessment.tenant_id = slot.tenant_id
         AND assessment.id = slot.assessment_id
        WHERE assignment.tenant_id = $1
          AND assignment.staff_user_id::text = $2
        ORDER BY slot.date, slot.start_time
      `,
      [tenantId, userId]
    );
    const items = res.rows as any[];
    return {
      metrics: {
        upcoming: items.filter((item) => String(item.status).toLowerCase() !== 'completed').length,
        completed: items.filter((item) => String(item.status).toLowerCase() === 'completed').length,
      },
      items,
    };
  }

  private async listStoreRequests(requireActiveTeachingAssignment = false) {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const res = await this.executeSql(
      `
        SELECT
          id::text,
          request_number,
          COALESCE(lines->0->>'item_name', lines->0->>'name', 'Requested item') AS item,
          COALESCE(NULLIF(lines->0->>'quantity', '')::int, NULLIF(lines->0->>'quantity_requested', '')::int, 1) AS quantity,
          to_char(needed_by, 'YYYY-MM-DD') AS needed_by,
          to_char(created_at, 'YYYY-MM-DD') AS date,
          INITCAP(priority) AS priority,
          INITCAP(status) AS status,
          COALESCE(notes, '') AS notes
        FROM inventory_requests
        WHERE tenant_id = $1
          AND (
            $3::boolean = FALSE
            OR EXISTS (
              SELECT 1
              FROM teacher_subject_assignments assignment
              WHERE assignment.tenant_id = inventory_requests.tenant_id
                AND assignment.teacher_user_id::text = $2
                AND assignment.status = 'active'
                AND assignment.effective_from <= CURRENT_DATE
                AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
            )
          )
          AND (
            requested_by = $2
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(lines) AS line
              WHERE line->>'requested_by_user_id' = $2
            )
          )
        ORDER BY created_at DESC
      `,
      [tenantId, userId, requireActiveTeachingAssignment]
    );
    const items = res.rows.map((request: any) => ({
      ...request,
      status: this.titleCaseStatus(request.status),
      priority: this.titleCaseStatus(request.priority),
    }));
    return {
      metrics: {
        pending: items.filter((item: any) => item.status === 'Pending').length,
        approved: items.filter((item: any) => item.status === 'Approved').length,
        fulfilled: items.filter((item: any) => item.status === 'Fulfilled').length,
        rejected: items.filter((item: any) => item.status === 'Rejected').length,
      },
      items,
    };
  }

  async getStoreRequests() {
    return this.listStoreRequests();
  }

  async createStoreRequest(dto: any = {}) {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const item = this.operations.requiredText(dto?.item ?? dto?.item_name, 'Requested item');
    const quantity = this.operations.positiveInteger(dto?.quantity, 'Quantity');
    const priority = this.normalizePriority(dto?.priority);
    const neededBy = String(dto?.needed_by ?? dto?.neededBy ?? '').trim() || null;
    const notes = String(dto?.notes ?? dto?.reason ?? '').trim();
    const requestNumber = await this.nextSequenceCode(tenantId, 'inventory_requests', 'REQ');
    const requestLine = {
      item_name: item,
      quantity,
      unit: String(dto?.unit || 'unit').trim() || 'unit',
      requested_by_user_id: userId,
      source_dashboard: 'teacher-store-requests',
    };
    const result = await this.operations.writeSql(
      `
        INSERT INTO inventory_requests (
          tenant_id, request_number, department, requested_by, status, needed_by, priority, lines, notes
        )
        VALUES ($1, $2, $3, $4, 'pending', $5::date, $6, $7::jsonb, NULLIF($8, ''))
        RETURNING id::text, request_number, status
      `,
      [
        tenantId,
        requestNumber,
        String(dto?.department || 'Teaching').trim() || 'Teaching',
        userId,
        neededBy,
        priority,
        JSON.stringify([requestLine]),
        notes,
      ],
    );
    const request = result.rows[0];
    const event = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: userId,
      sourceRole: 'teacher',
      targetRoles: ['storekeeper', 'hod', 'principal'],
      eventType: 'inventory.requested',
      entityType: 'inventory_request',
      entityId: request?.id ?? null,
      title: `Store request: ${item}`,
      message: `Teacher requested ${quantity} ${requestLine.unit}(s) of ${item}.`,
      priority: priority === 'urgent' ? 'high' : priority === 'high' ? 'high' : 'normal',
      payload: {
        request_number: request?.request_number,
        item,
        quantity,
        needed_by: neededBy,
        source_dashboard: 'teacher-store-requests',
      },
    });

    return {
      success: true,
      message: 'Store request sent to the storekeeper queue',
      request,
      event,
    };
  }

  async getResourceRequests() {
    return this.listStoreRequests(true);
  }

  async getMessages() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const res = await this.executeSql(
      `
        SELECT
          notification.id::text,
          'You'::text AS "from",
          notification.title AS subject,
          guardian.display_name AS recipient,
          notification.body AS message,
          notification.created_at::date::text AS date,
          CASE
            WHEN LOWER(notification.status) = 'failed' THEN 'Failed'
            WHEN LOWER(notification.status) = 'read' THEN 'Read in portal'
            ELSE 'Available in portal'
          END AS status
        FROM notifications notification
        INNER JOIN workflow_events event
          ON event.tenant_id = notification.tenant_id
         AND event.id::text = notification.source_record_id::text
         AND event.event_type = 'teacher.parent_message_sent'
         AND event.source_user_id::text = $2
        INNER JOIN student_guardians guardian
          ON guardian.tenant_id = notification.tenant_id
         AND guardian.id::text = notification.recipient_guardian_id::text
         AND guardian.user_id::text = notification.recipient_user_id::text
        WHERE notification.tenant_id = $1
          AND notification.type = 'teacher.parent_message_sent'
          AND notification.source_module = 'teacher-command'
          AND notification.recipient_user_id IS NOT NULL
          AND notification.recipient_guardian_id IS NOT NULL
        ORDER BY notification.created_at DESC
        LIMIT 100
      `,
      [tenantId, userId]
    );
    const items = res.rows as any[];
    return {
      metrics: {
        unread: 0,
        total: items.length,
      },
      items,
    };
  }

  async getParentMessageRecipients() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const result = await this.executeSql<{
      kind: 'class' | 'guardian';
      recipient_id: string;
      label: string;
      student_name: string | null;
      class_name: string;
      sms_available: boolean;
    }>(
      `
        WITH current_assignments AS (
          SELECT DISTINCT assignment.class_section_id::text AS class_section_id, assignment.stream_id
          FROM teacher_subject_assignments assignment
          WHERE assignment.tenant_id = $1
            AND assignment.teacher_user_id::text = $2
            AND LOWER(assignment.status) = 'active'
            AND assignment.effective_from <= CURRENT_DATE
            AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
        ), assigned_students AS (
          SELECT DISTINCT
            student.id::text AS student_id,
            student_assignment.class_section_id::text AS class_section_id,
            COALESCE(
              NULLIF(TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)), ''),
              student.admission_number,
              'Learner'
            ) AS student_name
          FROM current_assignments assignment
          INNER JOIN student_class_assignments student_assignment
            ON student_assignment.tenant_id = $1
           AND student_assignment.class_section_id::text = assignment.class_section_id
              AND (assignment.stream_id IS NULL OR assignment.stream_id::text = student_assignment.stream_id::text)
           AND LOWER(student_assignment.status) = 'active'
          INNER JOIN students student
            ON student.tenant_id = student_assignment.tenant_id
           AND student.id::text = student_assignment.student_id::text
           AND student.deleted_at IS NULL
           AND LOWER(COALESCE(student.status, 'active')) IN ('active', 'admitted', 'enrolled')
        ), guardian_options AS (
          SELECT DISTINCT
            guardian.id::text AS guardian_id,
            guardian.display_name AS guardian_name,
            assigned.student_name,
            assigned.class_section_id,
            COALESCE(guardian.can_receive_sms, TRUE)
              AND NULLIF(TRIM(COALESCE(guardian.phone, '')), '') IS NOT NULL AS sms_available
          FROM assigned_students assigned
          INNER JOIN student_guardians guardian
            ON guardian.tenant_id = $1
           AND guardian.student_id::text = assigned.student_id
           AND LOWER(guardian.status) = 'active'
           AND guardian.user_id IS NOT NULL
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = guardian.tenant_id
           AND membership.user_id = guardian.user_id
           AND LOWER(membership.status) = 'active'
        )
        SELECT
          'class'::text AS kind,
          class_section.id::text AS recipient_id,
          class_section.name AS label,
          NULL::text AS student_name,
          class_section.name AS class_name,
          BOOL_OR(guardian.sms_available) AS sms_available
        FROM current_assignments assignment
        INNER JOIN class_sections class_section
          ON class_section.tenant_id = $1
         AND class_section.id::text = assignment.class_section_id
        INNER JOIN guardian_options guardian
          ON guardian.class_section_id = assignment.class_section_id
        GROUP BY class_section.id, class_section.name
        UNION ALL
        SELECT
          'guardian'::text AS kind,
          guardian.guardian_id AS recipient_id,
          guardian.guardian_name AS label,
          guardian.student_name,
          class_section.name AS class_name,
          guardian.sms_available
        FROM guardian_options guardian
        INNER JOIN class_sections class_section
          ON class_section.tenant_id = $1
         AND class_section.id::text = guardian.class_section_id
        ORDER BY kind, label, student_name
      `,
      [tenantId, userId],
    );

    return {
      classes: result.rows
        .filter((row) => row.kind === 'class')
        .map((row) => ({
          class_section_id: row.recipient_id,
          class_name: row.class_name,
          sms_available: Boolean(row.sms_available),
        })),
      guardians: result.rows
        .filter((row) => row.kind === 'guardian')
        .map((row) => ({
          guardian_id: row.recipient_id,
          guardian_name: row.label,
          student_name: row.student_name ?? 'Learner',
          class_name: row.class_name,
          sms_available: Boolean(row.sms_available),
        })),
    };
  }

  async sendParentMessage(dto: any = {}) {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const audienceValue = this.operations.requiredText(dto?.audience, 'Audience');
    if (audienceValue !== 'individual_parent' && audienceValue !== 'class_parents') {
      throw new BadRequestException('Audience must be an individual parent or parents of an assigned class.');
    }
    const audience = audienceValue as 'individual_parent' | 'class_parents';
    const message = this.operations.requiredText(dto?.message, 'Message');
    const recipient = this.operations.requiredText(
      dto?.recipient,
      audience === 'class_parents' ? 'Assigned class' : 'Linked learner or guardian',
    );
    const subject = String(dto?.subject ?? '').trim() || 'Teacher parent communication';
    if (subject.length > 160) {
      throw new BadRequestException('Subject must be 160 characters or fewer');
    }
    if (message.length > 1600) {
      throw new BadRequestException('Message must be 1600 characters or fewer');
    }

    const deliveryResult = await this.operations.writeSql<{
      assigned_scope_count: number;
      guardian_count: number;
      portal_notification_count: number;
      sms_queue_count: number;
      sms_processing_count: number;
      sms_accepted_count: number;
      sms_needs_review_count: number;
      sms_outbox_count: number;
      event_id: string | null;
    }>(
      `
        WITH assigned_scope AS (
          SELECT DISTINCT assignment.class_section_id::text AS class_section_id, assignment.stream_id
          FROM teacher_subject_assignments assignment
          WHERE assignment.tenant_id = $1
            AND assignment.teacher_user_id::text = $2
            AND LOWER(assignment.status) = 'active'
            AND assignment.effective_from <= CURRENT_DATE
            AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
            AND (
              ($3 = 'class_parents' AND assignment.class_section_id::text = $4)
              OR (
                $3 = 'individual_parent'
                AND EXISTS (
                  SELECT 1
                  FROM student_class_assignments selected_assignment
                  INNER JOIN student_guardians selected_guardian
                    ON selected_guardian.tenant_id = selected_assignment.tenant_id
                   AND selected_guardian.student_id::text = selected_assignment.student_id::text
                   AND selected_guardian.id::text = $4
                   AND LOWER(selected_guardian.status) = 'active'
                  WHERE selected_assignment.tenant_id = assignment.tenant_id
                    AND selected_assignment.class_section_id::text = assignment.class_section_id::text
                    AND LOWER(selected_assignment.status) = 'active'
                )
              )
            )
        ), assigned_students AS (
          SELECT DISTINCT
            student.id::text AS student_id,
            student_assignment.class_section_id::text AS class_section_id
          FROM assigned_scope scope
          INNER JOIN student_class_assignments student_assignment
            ON student_assignment.tenant_id = $1
           AND student_assignment.class_section_id::text = scope.class_section_id
           AND LOWER(student_assignment.status) = 'active'
          INNER JOIN students student
            ON student.tenant_id = student_assignment.tenant_id
           AND student.id::text = student_assignment.student_id::text
           AND student.deleted_at IS NULL
           AND LOWER(COALESCE(student.status, 'active')) IN ('active', 'admitted', 'enrolled')
        ), guardian_recipients AS (
          SELECT DISTINCT ON (guardian.user_id)
            guardian.id AS guardian_id,
            guardian.user_id,
            NULLIF(TRIM(COALESCE(guardian.phone, '')), '') AS phone,
            COALESCE(guardian.can_receive_sms, TRUE) AS can_receive_sms
          FROM assigned_students assigned
          INNER JOIN student_guardians guardian
            ON guardian.tenant_id = $1
           AND guardian.student_id::text = assigned.student_id
           AND LOWER(guardian.status) = 'active'
           AND guardian.user_id IS NOT NULL
           AND ($3 = 'class_parents' OR guardian.id::text = $4)
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = guardian.tenant_id
           AND membership.user_id = guardian.user_id
           AND LOWER(membership.status) = 'active'
          ORDER BY guardian.user_id, guardian.is_primary DESC, guardian.created_at ASC
        ), delivery AS (
          SELECT
            (SELECT COUNT(*)::int FROM assigned_scope) AS assigned_scope_count,
            (SELECT COUNT(*)::int FROM guardian_recipients) AS guardian_count
        ), batch AS (
          SELECT gen_random_uuid() AS id
        ), inserted_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type,
            entity_type, entity_id, title, message, priority, payload
          )
          SELECT
            $1,
            $2::uuid,
            'teacher',
            '["class_teacher","secretary","principal"]'::jsonb,
            'teacher.parent_message_sent',
            'parent_message',
            batch.id::text,
            'Teacher guardian communication queued',
            delivery.guardian_count::text || ' exact linked guardian delivery record(s) queued.',
            'normal',
            jsonb_build_object(
              'audience', $3::text,
              'recipient_scope', 'exact_linked_guardian_users',
              'recipient_count', delivery.guardian_count,
              'source_dashboard', 'teacher-parent-communication'
            )
          FROM delivery
          CROSS JOIN batch
          WHERE delivery.assigned_scope_count > 0
            AND delivery.guardian_count > 0
          RETURNING id
        ), inserted_guardian_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, recipient_guardian_id,
            type, title, body, status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            'teacher-parent-message-' || event.id::text || '-' || recipient.guardian_id::text,
            recipient.user_id,
            recipient.guardian_id,
            'teacher.parent_message_sent',
            $5,
            $6,
            'unread',
            'normal',
            'teacher-command',
            event.id::text,
            jsonb_build_object(
              'event_id', event.id::text,
              'audience', $3::text,
              'recipient_scope', 'exact_linked_guardian_user',
              'source_dashboard', 'teacher-parent-communication'
            )
          FROM inserted_event event
          CROSS JOIN guardian_recipients recipient
          ON CONFLICT (tenant_id, notification_key)
          DO UPDATE SET
            recipient_user_id = EXCLUDED.recipient_user_id,
            recipient_guardian_id = EXCLUDED.recipient_guardian_id,
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            status = 'unread',
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING id
        ), inserted_sms AS (
          INSERT INTO communication_sms_outbox (
            tenant_id, sent_by, recipient_phone, message, status, dispatch_key
          )
          SELECT
            $1,
            $2::uuid,
            recipient.phone,
            $6,
            'Pending',
            'teacher-parent-message:'
              || NULLIF(current_setting('app.request_id', true), '')
              || ':' || recipient.guardian_id::text
          FROM inserted_event event
          CROSS JOIN guardian_recipients recipient
          WHERE recipient.can_receive_sms = TRUE
            AND recipient.phone IS NOT NULL
          ON CONFLICT (tenant_id, dispatch_key) DO UPDATE
          SET dispatch_key = EXCLUDED.dispatch_key
          WHERE communication_sms_outbox.recipient_phone = EXCLUDED.recipient_phone
            AND communication_sms_outbox.message = EXCLUDED.message
            AND communication_sms_outbox.sent_by IS NOT DISTINCT FROM EXCLUDED.sent_by
          RETURNING id, status
        ), sms_outcome AS (
          SELECT
            COUNT(*)::int AS outbox_count,
            (COUNT(*) FILTER (WHERE LOWER(status) IN ('pending', 'queued')))::int AS queued_count,
            (COUNT(*) FILTER (WHERE LOWER(status) = 'processing'))::int AS processing_count,
            (COUNT(*) FILTER (WHERE LOWER(status) IN ('accepted', 'sent', 'provider_accepted')))::int AS accepted_count,
            (COUNT(*) FILTER (WHERE LOWER(status) NOT IN (
              'pending', 'queued', 'processing', 'accepted', 'sent', 'provider_accepted'
            )))::int AS needs_review_count
          FROM inserted_sms
        ), action_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1,
            $2::uuid,
            current_setting('app.request_id', true),
            'teacher.parent_message_sent',
            'parent_message',
            event.id,
            jsonb_build_object(
              'audience', $3::text,
              'recipient_scope', 'exact_linked_guardian_users',
              'guardian_count', delivery.guardian_count,
              'portal_notification_count', (SELECT COUNT(*) FROM inserted_guardian_notifications),
              'sms_queue_count', (SELECT queued_count FROM sms_outcome),
              'sms_processing_count', (SELECT processing_count FROM sms_outcome),
              'sms_accepted_count', (SELECT accepted_count FROM sms_outcome),
              'sms_needs_review_count', (SELECT needs_review_count FROM sms_outcome)
            )
          FROM inserted_event event
          CROSS JOIN delivery
          RETURNING id
        )
        SELECT
          delivery.assigned_scope_count,
          delivery.guardian_count,
          (SELECT COUNT(*)::int FROM inserted_guardian_notifications) AS portal_notification_count,
          (SELECT queued_count FROM sms_outcome) AS sms_queue_count,
          (SELECT processing_count FROM sms_outcome) AS sms_processing_count,
          (SELECT accepted_count FROM sms_outcome) AS sms_accepted_count,
          (SELECT needs_review_count FROM sms_outcome) AS sms_needs_review_count,
          (SELECT outbox_count FROM sms_outcome) AS sms_outbox_count,
          (SELECT id::text FROM inserted_event LIMIT 1) AS event_id
        FROM delivery
      `,
      [tenantId, userId, audience, recipient, subject, message],
    );
    const delivery = deliveryResult.rows[0];
    if (!delivery || Number(delivery.assigned_scope_count) === 0) {
      throw new ForbiddenException(
        audience === 'class_parents'
          ? 'You can message only parents in an active class teaching assignment.'
          : 'The selected parent is not linked to a learner in your active teaching assignments.',
      );
    }
    const guardianCount = Number(delivery.guardian_count ?? 0);
    const portalNotificationCount = Number(delivery.portal_notification_count ?? 0);
    const smsQueueCount = Number(delivery.sms_queue_count ?? 0);
    const smsProcessingCount = Number(delivery.sms_processing_count ?? 0);
    const smsAcceptedCount = Number(delivery.sms_accepted_count ?? 0);
    const smsNeedsReviewCount = Number(delivery.sms_needs_review_count ?? 0);
    const smsOutboxCount = Number(
      delivery.sms_outbox_count
        ?? smsQueueCount + smsProcessingCount + smsAcceptedCount + smsNeedsReviewCount,
    );
    if (!delivery.event_id || guardianCount === 0 || portalNotificationCount !== guardianCount) {
      throw new BadRequestException('No active linked guardian account could receive this message');
    }

    return {
      success: true,
      message: `Parent portal message queued for ${guardianCount} exact guardian account${guardianCount === 1 ? '' : 's'} (${portalNotificationCount} portal; SMS: ${smsQueueCount} queued, ${smsProcessingCount} dispatching, ${smsAcceptedCount} provider-accepted, ${smsNeedsReviewCount} requiring review).`,
      queuedCount: guardianCount,
      delivery: {
        event_id: delivery.event_id,
        guardian_count: guardianCount,
        portal_notification_count: portalNotificationCount,
        sms_queue_count: smsQueueCount,
        sms_processing_count: smsProcessingCount,
        sms_accepted_count: smsAcceptedCount,
        sms_needs_review_count: smsNeedsReviewCount,
        sms_outbox_count: smsOutboxCount,
        recipient_scope: 'exact_linked_guardian_users',
      },
    };
  }

  async getNotifications() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const res = await this.executeSql(
      `
        SELECT
          notification.id::text,
          notification.created_at::date::text AS date,
          notification.title,
          COALESCE(notification.type, notification.source_module, 'School') AS category,
          INITCAP(COALESCE(notification.status, 'unread')) AS status
        FROM notifications notification
        WHERE notification.tenant_id = $1
          AND ${notificationRecipientPredicate('notification', '$2', '$3')}
        ORDER BY notification.created_at DESC
        LIMIT 100
      `,
      [tenantId, userId, 'teacher']
    );
    const items = res.rows as any[];
    return {
      metrics: {
        unread: items.filter((item) => String(item.status).toLowerCase() === 'unread').length,
        total: items.length,
      },
      items,
    };
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const res = await this.executeSql(
      `
        SELECT
          snapshot.id::text,
          snapshot.title,
          UPPER(snapshot.format) AS type,
          snapshot.created_at::date::text AS generated_at,
          'Ready'::text AS status
        FROM report_snapshots snapshot
        WHERE snapshot.tenant_id = $1
          AND snapshot.generated_by_user_id = $2
          AND snapshot.module IN ('teacher-command', 'class-teacher-command', 'exams')
        ORDER BY snapshot.created_at DESC
        LIMIT 100
      `,
      [tenantId, userId]
    );
    const items = res.rows as any[];
    return { metrics: { available: items.length }, items };
  }

  async getUtilities() {
    const tenantId = this.requireTenantId();
    return {
      time: new Date(),
      tenantId,
      status: 'active'
    };
  }
}
