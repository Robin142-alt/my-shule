import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DeanAcademicsCommandService {
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
        (SELECT COUNT(*)::int FROM subjects WHERE tenant_id = $1) as "totalSubjects",
        (SELECT COUNT(*)::int FROM staff_profiles WHERE tenant_id = $1 AND status = 'active') as "totalTeachers"
    `, [tenantId]);

    const row = metrics.rows[0] || { totalSubjects: 0, totalTeachers: 0 };
    return {
      metrics: {
        totalSubjects: row.totalSubjects || 0,
        totalTeachers: row.totalTeachers || 0,
        curriculumCoverage: 0,
      },
      academicCalendar: []
    };
  }

  async getTeacherWorkload() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM teacher_workloads WHERE tenant_id = $1`,
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

  async getLessonLogs() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM lesson_logs WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getCurriculumCoverage() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM curriculum_coverages WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getAssessments() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM exam_marks WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getAcademicInterventions() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM academic_interventions WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getDepartmentPerformance() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM department_performances WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM dean_reports WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }
}
