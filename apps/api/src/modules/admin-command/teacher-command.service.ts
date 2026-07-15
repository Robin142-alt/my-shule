import { Injectable, UnauthorizedException } from '@nestjs/common';
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
    const userId = this.requestContext.getStore()?.user_id;
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
    const res = await this.executeSql(
      `SELECT * FROM subject_teacher_allocations WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getSyllabusCoverage() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM curriculum_coverages WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getLessonPlans() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM lesson_plans WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getResources() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM teacher_resources WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
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
    const res = await this.executeSql(
      `SELECT * FROM cbc_assessment_logs WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getLearnerProgress() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM students WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getAttendance() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM student_attendance_logs WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getStudentNotes() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM student_notes WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getClubs() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM school_clubs WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getInvigilation() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM exam_invigilation_schedules WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getStoreRequests() {
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
            requested_by = $2
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(lines) AS line
              WHERE line->>'requested_by_user_id' = $2
            )
          )
        ORDER BY created_at DESC
      `,
      [tenantId, userId]
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
        'Teacher request',
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
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM resource_requests WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getMessages() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM parent_messages WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async sendParentMessage(dto: any = {}) {
    const tenantId = this.requireTenantId();
    const userId = this.requestContext.getStore()?.user_id;
    const audience = this.operations.requiredText(dto?.audience, 'Audience');
    const message = this.operations.requiredText(dto?.message, 'Message');
    const recipient = String(dto?.recipient ?? '').trim();
    const subject = String(dto?.subject ?? 'Teacher parent communication').trim();
    const event = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: userId,
      sourceRole: 'teacher',
      targetRoles: ['parent', 'class_teacher', 'secretary', 'principal'],
      eventType: 'teacher.parent_message_sent',
      entityType: 'parent_message',
      entityId: recipient || null,
      title: subject,
      message,
      priority: audience === 'class_parents' ? 'normal' : 'low',
      payload: {
        audience,
        recipient,
        source_dashboard: 'teacher-parent-communication',
      },
    });

    await this.executeSql(
      `
        INSERT INTO parent_messages (tenant_id, sender_user_id, recipient, audience, message, status, payload)
        VALUES ($1, $2::uuid, $3, $4, $5, 'queued', $6::jsonb)
      `,
      [
        tenantId,
        this.operations.uuidOrNull(userId),
        recipient || null,
        audience,
        message,
        JSON.stringify({ subject, source_dashboard: 'teacher-parent-communication' }),
      ],
    );

    return { success: true, message: 'Parent message queued for delivery', event };
  }

  async getNotifications() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM notifications WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM teacher_reports WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
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
