import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HodCommandService {
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

  async getOverview() {
    const tenantId = this.requireTenantId();
    const metrics = await this.executeSql(`
      SELECT 
        (SELECT COUNT(*)::int FROM subjects WHERE tenant_id = $1) as "departmentSubjects",
        (SELECT COUNT(*)::int FROM staff_profiles WHERE tenant_id = $1 AND status = 'active') as "departmentTeachers"
    `, [tenantId]);

    const row = metrics.rows[0] || { departmentSubjects: 0, departmentTeachers: 0 };
    return {
      metrics: {
        departmentSubjects: row.departmentSubjects || 0,
        departmentTeachers: row.departmentTeachers || 0,
        pendingApprovals: 0,
      },
      recentActivities: []
    };
  }

  async getDepartmentOverview() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM departments WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getReviewQueue() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM lesson_plans WHERE tenant_id = $1 AND status = 'submitted'`,
      [tenantId]
    );
    return res.rows;
  }

  async getSubjectAllocation() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM subject_teacher_allocations WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getDepartmentTeachers() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM staff_profiles WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getLessonPlans() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM lesson_plans WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getCoverageReview() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM curriculum_coverages WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getMarksModeration() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM exam_marks WHERE tenant_id = $1 AND status = 'needs_moderation'`,
      [tenantId]
    );
    return res.rows;
  }

  async getResourceRequests() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM resource_requests WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM hod_reports WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }
}
