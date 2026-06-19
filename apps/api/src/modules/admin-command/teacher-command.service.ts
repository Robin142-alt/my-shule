import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TeacherCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
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
