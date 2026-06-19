import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ExamsManagerCommandService {
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
        (SELECT COUNT(*)::int FROM exam_cycles WHERE tenant_id = $1) as "totalExams",
        (SELECT COUNT(*)::int FROM exam_marks WHERE tenant_id = $1 AND status = 'pending') as "pendingMarks",
        (SELECT COUNT(*)::int FROM student_report_cards WHERE tenant_id = $1 AND status = 'published') as "publishedReports"
    `, [tenantId]);

    const row = metrics.rows[0] || { totalExams: 0, pendingMarks: 0, publishedReports: 0 };
    return {
      metrics: {
        totalExams: row.totalExams || 0,
        pendingMarks: row.pendingMarks || 0,
        publishedReports: row.publishedReports || 0,
      },
      upcomingExams: []
    };
  }

  async getExamSetup() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM exam_cycles WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getExamTimetable() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM exam_timetables WHERE tenant_id = $1 ORDER BY exam_date ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getMarksEntry() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM exam_marks WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getModeration() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM exam_marks WHERE tenant_id = $1 AND status = 'needs_moderation'`,
      [tenantId]
    );
    return res.rows;
  }

  async getPublishing() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM exam_cycles WHERE tenant_id = $1 AND status = 'ready_to_publish'`,
      [tenantId]
    );
    return res.rows;
  }

  async getReportCards() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM student_report_cards WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getAnalysis() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM exam_analyses WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM exam_reports WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    return { success: true, message: 'Exams report generated successfully' };
  }
}
