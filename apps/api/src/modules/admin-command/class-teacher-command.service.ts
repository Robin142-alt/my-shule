import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

@Injectable()
export class ClassTeacherCommandService {
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

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    try {
      return await this.prisma.query<T>(query, params);
    } catch (e) {
      return { rows: [], rowCount: 0 };
    }
  }

  async getOverview() {
    const tenantId = this.requireTenantId();
    const metrics = await this.executeSql(`
      SELECT 
        (SELECT COUNT(*)::int FROM students WHERE tenant_id = $1 AND status = 'active') as "totalStudents",
        (SELECT COUNT(*)::int FROM student_attendance_logs WHERE tenant_id = $1 AND attendance_date = CURRENT_DATE AND status = 'absent') as "absentToday"
    `, [tenantId]);

    const row = metrics.rows[0] || { totalStudents: 0, absentToday: 0 };
    return {
      metrics: {
        totalStudents: row.totalStudents || 0,
        absentToday: row.absentToday || 0,
        averagePerformance: 0,
      },
      classAnnouncements: []
    };
  }

  async getMyClass() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM class_sections WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getLearnerProfiles() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM students WHERE tenant_id = $1 ORDER BY first_name ASC, last_name ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getClassAcademics() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM exam_marks WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getAttendanceFollowUp() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM student_attendance_logs WHERE tenant_id = $1 AND status IN ('absent', 'late') ORDER BY attendance_date DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getDisciplineFollowUp() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM admin_incidents WHERE tenant_id = $1 AND title ILIKE '%discipline%' ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getWelfareNotes() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM admin_incidents WHERE tenant_id = $1 AND title ILIKE '%welfare%' ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getParentContacts() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM parents WHERE tenant_id = $1 ORDER BY first_name ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getReportComments() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        WITH current_term AS (
          SELECT id, COALESCE(name, term_name, 'Current term') AS name
          FROM academic_terms
          WHERE tenant_id = $1
          ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, start_date DESC NULLS LAST, created_at DESC
          LIMIT 1
        ),
        class_students AS (
          SELECT
            student.id,
            student.admission_number,
            CONCAT_WS(' ', student.first_name, student.last_name) AS student_name,
            assignment.class_section_id
          FROM class_sections section
          JOIN student_class_assignments assignment
            ON assignment.tenant_id = section.tenant_id
           AND assignment.class_section_id = section.id
           AND assignment.status = 'active'
          JOIN students student
            ON student.tenant_id = assignment.tenant_id
           AND student.id = assignment.student_id
          WHERE section.tenant_id = $1
            AND ($2::uuid IS NULL OR section.class_teacher_id = $2::uuid)
            AND student.status IN ('active', 'enrolled')
        ),
        latest_marks AS (
          SELECT student_id, AVG(score)::numeric(8,2) AS mean_score
          FROM exam_marks
          WHERE tenant_id = $1
          GROUP BY student_id
        )
        SELECT
          class_students.id::text,
          class_students.id::text AS student_id,
          class_students.student_name,
          class_students.admission_number AS admission_no,
          COALESCE(latest_marks.mean_score::text, 'N/A') AS mean_grade,
          ROW_NUMBER() OVER (ORDER BY latest_marks.mean_score DESC NULLS LAST, class_students.student_name ASC)::int AS class_position,
          COALESCE(comment.final_comment, '') AS comment,
          CASE
            WHEN comment.comment_status = 'submitted' THEN 'Submitted'
            WHEN COALESCE(comment.final_comment, '') <> '' THEN 'Written'
            ELSE 'Pending'
          END AS status,
          COALESCE((SELECT name FROM current_term), 'Current term') AS term,
          'Class report comments' AS exam_name
        FROM class_students
        LEFT JOIN latest_marks ON latest_marks.student_id = class_students.id
        LEFT JOIN report_card_comments comment
          ON comment.tenant_id = $1
         AND comment.student_id = class_students.id
         AND comment.class_section_id = class_students.class_section_id
        ORDER BY class_position ASC, class_students.student_name ASC
      `,
      [tenantId, this.currentUserUuid()]
    );
    const comments = res.rows;
    const submitted = comments.filter((row: any) => row.status === 'Submitted').length;
    const written = comments.filter((row: any) => row.status === 'Written' || row.status === 'Submitted').length;
    return {
      metrics: {
        total_students: comments.length,
        comments_written: written,
        comments_pending: Math.max(comments.length - written, 0),
        submitted,
      },
      term: comments[0]?.term ?? 'Current term',
      exam_name: comments[0]?.exam_name ?? 'Class report comments',
      comments,
    };
  }

  async submitAllComments(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserUuid();
    const pending = await this.operations.readSql<{ pending_count: number }>(
      `
        WITH class_students AS (
          SELECT student.id, assignment.class_section_id
          FROM class_sections section
          JOIN student_class_assignments assignment
            ON assignment.tenant_id = section.tenant_id
           AND assignment.class_section_id = section.id
           AND assignment.status = 'active'
          JOIN students student
            ON student.tenant_id = assignment.tenant_id
           AND student.id = assignment.student_id
          WHERE section.tenant_id = $1
            AND ($2::uuid IS NULL OR section.class_teacher_id = $2::uuid)
            AND student.status IN ('active', 'enrolled')
        )
        SELECT COUNT(*)::int AS pending_count
        FROM class_students
        LEFT JOIN report_card_comments comment
          ON comment.tenant_id = $1
         AND comment.student_id = class_students.id
         AND comment.class_section_id = class_students.class_section_id
        WHERE COALESCE(comment.final_comment, '') = ''
      `,
      [tenantId, userId],
    );
    if ((pending.rows[0]?.pending_count ?? 0) > 0) {
      throw new BadRequestException('All class learners must have comments before submission.');
    }

    const result = await this.operations.writeSql(
      `
        UPDATE report_card_comments comment
        SET comment_status = 'submitted',
            updated_at = NOW()
        FROM class_sections section
        WHERE comment.tenant_id = $1
          AND section.tenant_id = comment.tenant_id
          AND section.id = comment.class_section_id
          AND ($2::uuid IS NULL OR section.class_teacher_id = $2::uuid)
          AND COALESCE(comment.final_comment, '') <> ''
        RETURNING comment.id::text, comment.student_id::text
      `,
      [tenantId, userId],
    );
    await this.operations.recordAudit(tenantId, 'class_teacher.report_comments_submitted', 'report_card_comments', null, {
      submitted_count: result.rowCount,
      term: dto?.term,
      exam: dto?.exam,
    }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `class-teacher-comments-submitted-${Date.now()}`,
      type: 'class_teacher.report_comments_submitted',
      title: 'Class teacher comments submitted',
      body: `${result.rowCount} report-card comment(s) were submitted for review.`,
      targetRoles: ['exams_manager', 'dean_academics', 'principal'],
      metadata: { submitted_count: result.rowCount, term: dto?.term, exam: dto?.exam },
    });
    return { success: true, message: 'Comments submitted for review', submittedCount: result.rowCount };
  }

  async saveReportComment(studentId: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserUuid();
    const comment = this.operations.requiredText(dto?.comment ?? dto?.final_comment, 'Comment');
    const result = await this.operations.writeSql(
      `
        WITH target_student AS (
          SELECT student.id, assignment.class_section_id
          FROM students student
          JOIN student_class_assignments assignment
            ON assignment.tenant_id = student.tenant_id
           AND assignment.student_id = student.id
           AND assignment.status = 'active'
          LEFT JOIN class_sections section
            ON section.tenant_id = assignment.tenant_id
           AND section.id = assignment.class_section_id
          WHERE student.tenant_id = $1
            AND student.id = $2::uuid
            AND ($3::uuid IS NULL OR section.class_teacher_id = $3::uuid)
          LIMIT 1
        ),
        current_term AS (
          SELECT id
          FROM academic_terms
          WHERE tenant_id = $1
          ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, start_date DESC NULLS LAST, created_at DESC
          LIMIT 1
        ),
        updated AS (
          UPDATE report_card_comments comment
          SET final_comment = $4,
              comment_status = 'draft',
              created_by_user_id = COALESCE(comment.created_by_user_id, $3::uuid),
              updated_at = NOW()
          FROM target_student, current_term
          WHERE comment.tenant_id = $1
            AND comment.student_id = target_student.id
            AND comment.academic_term_id = current_term.id
          RETURNING comment.*
        ),
        inserted AS (
          INSERT INTO report_card_comments (
            tenant_id, student_id, academic_term_id, class_section_id, final_comment, comment_status, created_by_user_id
          )
          SELECT $1, target_student.id, current_term.id, target_student.class_section_id, $4, 'draft', $3::uuid
          FROM target_student, current_term
          WHERE NOT EXISTS (SELECT 1 FROM updated)
          RETURNING *
        )
        SELECT * FROM updated
        UNION ALL
        SELECT * FROM inserted
      `,
      [tenantId, studentId, userId, comment],
    );
    const saved = result.rows[0];
    if (!saved) {
      throw new BadRequestException('Student, active class assignment, or academic term was not found for this school.');
    }
    await this.operations.recordAudit(tenantId, 'class_teacher.report_comment_saved', 'report_card_comment', saved.id, { studentId }, userId);
    return { success: true, message: 'Report comment saved', comment: saved };
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const reports = await this.operations.listReportSnapshots(tenantId, 'class-teacher-command');
    return {
      metrics: {
        total_reports: reports.length,
        generated_this_term: reports.length,
        pending: 0,
      },
      available_types: ['Academic Analysis', 'Discipline Report', 'Class Register', 'Welfare Report'],
      reports: reports.map((report: any) => ({
        id: report.id,
        report_name: report.reportName,
        type: report.type,
        term: 'Current term',
        generated_at: report.generatedDate,
        status: 'Ready',
        download_url: `/api/admin-command/class-teacher/reports/${encodeURIComponent(String(report.snapshotId || report.id))}/download`,
      })),
    };
  }

  async downloadReport(snapshotId: string) {
    const tenantId = this.requireTenantId();
    const snapshotKey = this.operations.requiredText(snapshotId, 'Report snapshot');
    const result = await this.operations.readSql(
      `
        SELECT
          snapshot_id,
          title,
          format,
          artifact,
          manifest,
          manifest_checksum_sha256,
          created_at::text
        FROM report_snapshots
        WHERE tenant_id = $1
          AND snapshot_id = $2
          AND module = 'class-teacher-command'
        LIMIT 1
      `,
      [tenantId, snapshotKey],
    );
    const snapshot = result.rows[0];
    if (!snapshot) {
      throw new BadRequestException('Class-teacher report snapshot was not found for this school.');
    }
    return snapshot;
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserUuid();
    const [overview, myClass, learnerProfiles, academics, discipline, welfare, parentContacts, comments] = await Promise.all([
      this.getOverview(),
      this.getMyClass(),
      this.getLearnerProfiles(),
      this.getClassAcademics(),
      this.getDisciplineFollowUp(),
      this.getWelfareNotes(),
      this.getParentContacts(),
      this.getReportComments(),
    ]);
    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'class-teacher-command',
      reportId: 'class-teacher-operations',
      title: String(dto?.type || dto?.name || dto?.title || 'Class teacher report'),
      format: dto?.format,
      generatedByUserId: userId,
      sections: { overview, myClass, learnerProfiles, academics, discipline, welfare, parentContacts, comments },
      filters: { requested_from: 'class-teacher-dashboard', type: dto?.type },
      targetRoles: ['principal', 'dean_academics', 'exams_manager'],
    });
  }

  async notifyAttendanceParent(studentId: string, dto: any) {
    return this.createStudentGuardianMessage(studentId, 'attendance.follow_up_parent_notified', String(dto?.message || 'Please follow up on the learner attendance record.'));
  }

  async resolveAttendanceFollowUp(studentId: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserUuid();
    const result = await this.operations.writeSql(
      `
        UPDATE student_attendance_logs
        SET status = 'resolved',
            updated_at = NOW()
        WHERE tenant_id = $1
          AND student_id = $2::uuid
          AND status IN ('absent', 'late')
        RETURNING *
      `,
      [tenantId, studentId],
    );
    await this.operations.recordAudit(tenantId, 'attendance.follow_up_resolved', 'student', studentId, { resolved_count: result.rowCount }, userId);
    return { success: true, message: 'Attendance follow-up resolved', resolvedCount: result.rowCount };
  }

  async addDisciplineFollowUp(incidentId: string, dto: any) {
    return this.createWorkflowEvent('discipline.follow_up_added', 'admin_incident', incidentId, 'Discipline follow-up added', String(dto?.note || dto?.message || 'Class teacher added a discipline follow-up.'), ['discipline_master', 'dean_academics']);
  }

  async escalateDisciplineFollowUp(incidentId: string) {
    return this.createWorkflowEvent('discipline.follow_up_escalated', 'admin_incident', incidentId, 'Discipline follow-up escalated', 'Class teacher escalated this discipline follow-up.', ['discipline_master', 'dean_academics', 'principal']);
  }

  async createWelfareNote(dto: any) {
    const studentId = this.operations.requiredText(dto?.studentId ?? dto?.student_id, 'Student');
    return this.createLearnerNote(studentId, { ...dto, note_type: 'welfare', visibility: 'staff' });
  }

  async escalateWelfareNote(noteId: string) {
    return this.createWorkflowEvent('welfare.note_escalated', 'student_note', noteId, 'Welfare note escalated', 'Class teacher escalated a learner welfare note.', ['deputy_principal', 'principal', 'counsellor']);
  }

  async messageParent(parentId: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserUuid();
    const message = this.operations.requiredText(dto?.message, 'Message');
    const result = await this.operations.writeSql(
      `
        INSERT INTO notifications (
          tenant_id, notification_key, recipient_user_id, type, title, body, status, metadata
        )
        SELECT
          $1,
          'class-teacher-parent-message-' || $2 || '-' || EXTRACT(EPOCH FROM NOW())::bigint,
          guardian.user_id,
          'class_teacher.parent_message',
          COALESCE($4, 'Message from class teacher'),
          $5,
          'unread',
          $6::jsonb
        FROM student_guardians guardian
        WHERE guardian.tenant_id = $1
          AND guardian.id = $2::uuid
          AND guardian.user_id IS NOT NULL
        RETURNING *
      `,
      [
        tenantId,
        parentId,
        userId,
        dto?.subject || null,
        message,
        JSON.stringify({ parentId, source_module: 'class-teacher-command' }),
      ],
    );
    if (!result.rows[0]) {
      await this.createWorkflowEvent('class_teacher.parent_message_follow_up_required', 'student_guardian', parentId, 'Parent message needs office follow-up', message, ['secretary', 'principal']);
      return { success: true, message: 'Parent has no active user account; follow-up routed to front office' };
    }
    await this.operations.recordAudit(tenantId, 'class_teacher.parent_message_sent', 'student_guardian', parentId, { message }, userId);
    return { success: true, message: 'Parent message queued in portal', notification: result.rows[0] };
  }

  async sendClassCommunication(dto: any) {
    const audience = String(dto?.audience || dto?.type || 'class').slice(0, 80);
    const message = String(dto?.message || dto?.body || 'Class teacher communication sent.').slice(0, 500);
    return this.createWorkflowEvent(
      'class_teacher.communication_sent',
      'class_communication',
      dto?.studentId || dto?.student_id || dto?.classSectionId || dto?.class_section_id || 'class',
      `Class teacher communication: ${audience}`,
      message,
      ['parent', 'student', 'principal', 'secretary'],
    );
  }

  async recordAction(dto: any) {
    const action = String(dto?.action || 'workflow_action')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'workflow_action';
    const title = String(dto?.title || `Class teacher ${action.replace(/_/g, ' ')}`).trim();
    const message = String(dto?.description || dto?.message || title).trim();
    return this.createWorkflowEvent(
      'class_teacher.workflow_action',
      String(dto?.entityType || 'class_teacher_workflow'),
      String(dto?.entityId || dto?.studentId || dto?.student_id || 'class'),
      title,
      message,
      ['principal', 'deputy_principal', 'class_teacher', 'secretary'],
    );
  }

  async createLearnerNote(studentId: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserUuid();
    const description = this.operations.requiredText(dto?.description ?? dto?.note ?? dto?.message, 'Note');
    const result = await this.operations.writeSql(
      `
        INSERT INTO student_notes (
          tenant_id, student_id, note_type, visibility, description, follow_up_date, created_by_user_id
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6::date, $7::uuid)
        RETURNING *
      `,
      [
        tenantId,
        studentId,
        String(dto?.note_type || dto?.type || 'general').slice(0, 60),
        String(dto?.visibility || 'staff').slice(0, 40),
        description,
        dto?.follow_up_date || dto?.followUpDate || null,
        userId,
      ],
    );
    const note = result.rows[0];
    await this.operations.recordAudit(tenantId, 'class_teacher.learner_note_created', 'student_note', note.id, { studentId }, userId);
    return { success: true, message: 'Learner note saved', note };
  }

  async scheduleMeeting(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserUuid();
    if (!userId) throw new UnauthorizedException('A valid class teacher account is required');
    const title = this.operations.requiredText(dto?.title ?? dto?.agenda, 'Meeting agenda');
    const startTime = new Date(this.operations.requiredText(dto?.start_time ?? dto?.startTime, 'Meeting start time'));
    if (Number.isNaN(startTime.getTime())) throw new BadRequestException('Meeting start time is invalid');
    const requestedEnd = dto?.end_time ?? dto?.endTime;
    const endTime = requestedEnd ? new Date(requestedEnd) : new Date(startTime.getTime() + 30 * 60 * 1000);
    if (Number.isNaN(endTime.getTime()) || endTime <= startTime) throw new BadRequestException('Meeting end time must be after its start time');
    const description = String(dto?.description || dto?.parent || '').trim();
    const result = await this.operations.writeSql(
      `INSERT INTO school_meetings (tenant_id, title, description, start_time, end_time, organizer_id, status)
       VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz, $6::uuid, 'SCHEDULED') RETURNING *`,
      [tenantId, title, description || null, startTime.toISOString(), endTime.toISOString(), userId],
    );
    const meeting = result.rows[0];
    await this.operations.recordAudit(tenantId, 'class_teacher.meeting_scheduled', 'school_meeting', meeting.id, { meeting }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `class-teacher-meeting-${meeting.id}`,
      type: 'class_teacher.meeting_scheduled',
      title: 'Parent meeting scheduled',
      body: `${title} is scheduled for ${startTime.toISOString()}.`,
      targetRoles: ['class_teacher', 'secretary'],
      metadata: { meeting },
    });
    return { success: true, message: 'Parent meeting scheduled', meeting };
  }

  async createTask(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserUuid();
    if (!userId) throw new UnauthorizedException('A valid class teacher account is required');
    const title = this.operations.requiredText(dto?.title ?? dto?.task, 'Task title');
    const dueDate = dto?.due_date ?? dto?.dueDate ?? null;
    if (dueDate && Number.isNaN(new Date(dueDate).getTime())) throw new BadRequestException('Task due date is invalid');
    const result = await this.operations.writeSql(
      `INSERT INTO school_tasks (tenant_id, assigned_to, title, due_date, status)
       VALUES ($1, $2::uuid, $3, $4::timestamptz, 'PENDING') RETURNING *`,
      [tenantId, userId, title, dueDate ? new Date(dueDate).toISOString() : null],
    );
    const task = result.rows[0];
    await this.operations.recordAudit(tenantId, 'class_teacher.task_created', 'school_task', task.id, { task }, userId);
    return { success: true, message: 'Class-teacher task created', task };
  }

  async completeTask(taskId: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserUuid();
    if (!userId) throw new UnauthorizedException('A valid class teacher account is required');
    const result = await this.operations.writeSql(
      `UPDATE school_tasks SET status = 'COMPLETED', updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::uuid AND assigned_to = $3::uuid AND status <> 'COMPLETED'
       RETURNING *`,
      [tenantId, this.operations.requiredText(taskId, 'Task ID'), userId],
    );
    const task = result.rows[0];
    if (!task) throw new BadRequestException('Task was not found, is already complete, or is assigned to another user');
    await this.operations.recordAudit(tenantId, 'class_teacher.task_completed', 'school_task', task.id, { task }, userId);
    return { success: true, message: 'Task completed', task };
  }

  private async createStudentGuardianMessage(studentId: string, type: string, message: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserUuid();
    const result = await this.operations.writeSql(
      `
        INSERT INTO notifications (
          tenant_id, notification_key, recipient_user_id, type, title, body, status, metadata
        )
        SELECT
          $1,
          $2 || '-' || guardian.id::text || '-' || EXTRACT(EPOCH FROM NOW())::bigint,
          guardian.user_id,
          $2,
          'Class teacher follow-up',
          $4,
          'unread',
          $5::jsonb
        FROM student_guardians guardian
        WHERE guardian.tenant_id = $1
          AND guardian.student_id = $3::uuid
          AND guardian.user_id IS NOT NULL
        RETURNING *
      `,
      [tenantId, type, studentId, message, JSON.stringify({ studentId, source_module: 'class-teacher-command' })],
    );
    if (result.rowCount === 0) {
      await this.createWorkflowEvent(`${type}.office_follow_up_required`, 'student', studentId, 'Parent follow-up required', message, ['secretary', 'principal']);
      return { success: true, message: 'No active parent portal account; follow-up routed to front office' };
    }
    await this.operations.recordAudit(tenantId, type, 'student', studentId, { notification_count: result.rowCount }, userId);
    return { success: true, message: 'Parent notification queued', notificationCount: result.rowCount };
  }

  private async createWorkflowEvent(type: string, entityType: string, entityId: string, title: string, message: string, targetRoles: string[]) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserUuid();
    const result = await this.operations.writeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id, title, message, priority, payload
        )
        VALUES ($1, $2::uuid, $3, $4::jsonb, $5, $6, $7, $8, $9, 'normal', $10::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        userId,
        this.requestContext.getStore()?.role || 'teacher',
        JSON.stringify(targetRoles),
        type,
        entityType,
        entityId,
        title,
        message,
        JSON.stringify({ source_dashboard: 'class-teacher-command' }),
      ],
    );
    await this.operations.notifyRoles(tenantId, {
      key: `${type}-${entityId}-${Date.now()}`,
      type,
      title,
      body: message,
      targetRoles,
      metadata: { entityType, entityId },
    });
    await this.operations.recordAudit(tenantId, type, entityType, entityId, { title, message, targetRoles }, userId);
    return { success: true, message: 'Action routed', event: result.rows[0] };
  }

  private currentUserUuid(): string | null {
    return this.operations.uuidOrNull(this.requestContext.getStore()?.user_id);
  }
}
