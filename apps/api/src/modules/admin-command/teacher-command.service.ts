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

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    try {
      return await this.prisma.query<T>(query, params);
    } catch (e) {
      return { rows: [], rowCount: 0 };
    }
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
    const res = await this.executeSql(
      `SELECT * FROM exam_marks WHERE tenant_id = $1`,
      [tenantId]
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
    const res = await this.executeSql(
      `SELECT * FROM inventory_requests WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
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
