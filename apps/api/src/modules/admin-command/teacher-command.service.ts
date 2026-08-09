import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
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
      `SELECT * FROM academic_years WHERE tenant_id = $1 AND is_active = TRUE`,
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
        LEFT JOIN academics_timetable_slots timetable
          ON timetable.tenant_id = assignment.tenant_id
         AND timetable.class_id::text = assignment.class_section_id::text
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
          message.id::text,
          'You'::text AS "from",
          'Parent communication'::text AS subject,
          message.created_at::date::text AS date,
          INITCAP(message.status) AS status
        FROM communication_sms_outbox message
        WHERE message.tenant_id = $1
          AND message.sent_by::text = $2
        ORDER BY message.created_at DESC
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

  private async resolveParentMessageRecipients(
    tenantId: string,
    userId: string,
    audience: 'individual_parent' | 'class_parents',
    recipient: string,
  ): Promise<string[]> {
    const audienceFilter =
      audience === 'class_parents'
        ? `AND (
             class_section.id::text = $3
             OR LOWER(class_section.name) = LOWER($3)
           )`
        : `AND (
             student.id::text = $3
             OR student.admission_number = $3
             OR guardian.id::text = $3
             OR guardian.user_id::text = $3
             OR LOWER(COALESCE(guardian.email, '')) = LOWER($3)
             OR COALESCE(guardian.phone, student.primary_guardian_phone, '') = $3
           )`;
    const result = await this.executeSql<{ phone: string }>(
      `
        SELECT DISTINCT COALESCE(NULLIF(guardian.phone, ''), NULLIF(student.primary_guardian_phone, '')) AS phone
        FROM teacher_subject_assignments assignment
        INNER JOIN class_sections class_section
          ON class_section.tenant_id = assignment.tenant_id
         AND class_section.id::text = assignment.class_section_id::text
        INNER JOIN student_class_assignments student_assignment
          ON student_assignment.tenant_id = assignment.tenant_id
         AND student_assignment.class_section_id::text = assignment.class_section_id::text
         AND student_assignment.status = 'active'
        INNER JOIN students student
          ON student.tenant_id = student_assignment.tenant_id
         AND student.id::text = student_assignment.student_id::text
        LEFT JOIN student_guardians guardian
          ON guardian.tenant_id = student.tenant_id
         AND guardian.student_id::text = student.id::text
         AND guardian.status <> 'revoked'
         AND COALESCE(guardian.can_receive_sms, TRUE) = TRUE
        WHERE assignment.tenant_id = $1
          AND assignment.teacher_user_id::text = $2
          AND assignment.status = 'active'
          AND assignment.effective_from <= CURRENT_DATE
          AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
          ${audienceFilter}
          AND COALESCE(NULLIF(guardian.phone, ''), NULLIF(student.primary_guardian_phone, '')) IS NOT NULL
      `,
      [tenantId, userId, recipient],
    );

    return [...new Set(result.rows.map((row) => String(row.phone).trim()).filter(Boolean))];
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
    const subject = String(dto?.subject ?? 'Teacher parent communication').trim();
    const recipientPhones = await this.resolveParentMessageRecipients(
      tenantId,
      userId,
      audience,
      recipient,
    );
    if (recipientPhones.length === 0) {
      throw new ForbiddenException(
        audience === 'class_parents'
          ? 'You can message only parents in an active class teaching assignment.'
          : 'The selected parent is not linked to a learner in your active teaching assignments.',
      );
    }

    const queued = await this.operations.writeSql(
      `
        INSERT INTO communication_sms_outbox (tenant_id, sent_by, recipient_phone, message, status)
        SELECT $1, $2::uuid, phone, $3, 'Pending'
        FROM unnest($4::text[]) AS phone
        RETURNING id::text, recipient_phone, status
      `,
      [tenantId, userId, message, recipientPhones],
    );
    const event = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: userId,
      sourceRole: 'teacher',
      targetRoles: ['parent', 'class_teacher', 'secretary', 'principal'],
      eventType: 'teacher.parent_message_sent',
      entityType: 'parent_message',
      entityId: queued.rows[0]?.id ?? null,
      title: subject,
      message,
      priority: audience === 'class_parents' ? 'normal' : 'low',
      payload: {
        audience,
        recipient,
        recipient_count: recipientPhones.length,
        source_dashboard: 'teacher-parent-communication',
      },
    });

    return {
      success: true,
      message: `Parent message queued for ${recipientPhones.length} recipient${recipientPhones.length === 1 ? '' : 's'}`,
      queuedCount: recipientPhones.length,
      event,
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
          AND notification.recipient_user_id::text = $2
        ORDER BY notification.created_at DESC
        LIMIT 100
      `,
      [tenantId, userId]
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
