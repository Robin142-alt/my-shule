import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

@Injectable()
export class ExamsManagerCommandService {
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
    return this.operations.listReportSnapshots(tenantId, 'exams-manager-command');
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.requestContext.getStore()?.user_id);
    const [overview, examSetup, examTimetable, marksEntry, moderation, publishing, reportCards, analysis] = await Promise.all([
      this.getOverview(),
      this.getExamSetup(),
      this.getExamTimetable(),
      this.getMarksEntry(),
      this.getModeration(),
      this.getPublishing(),
      this.getReportCards(),
      this.getAnalysis(),
    ]);
    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'exams-manager-command',
      reportId: 'exams-operations',
      title: String(dto?.name || dto?.title || 'Exams operations report'),
      format: dto?.format,
      generatedByUserId: userId,
      sections: { overview, examSetup, examTimetable, marksEntry, moderation, publishing, reportCards, analysis },
      filters: { requested_from: 'exams-manager-dashboard' },
      targetRoles: ['principal', 'dean_academics', 'exams_manager'],
    });
  }

  async recordExamAction(action: string, dto: any = {}, entityId?: string | null) {
    const tenantId = this.requireTenantId();
    const eventType = `exams.${action}`;
    return this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.requestContext.getStore()?.user_id,
      sourceRole: 'exams_manager',
      targetRoles: ['principal', 'dean_academics', 'hod', 'teacher'],
      eventType,
      entityType: 'exam_workflow',
      entityId: entityId ?? dto?.id ?? null,
      title: this.titleForAction('Exams', action),
      message: dto?.reason ?? dto?.notes ?? dto?.title ?? null,
      priority: ['publish', 'unpublish', 'reject'].some((part) => action.includes(part)) ? 'high' : 'normal',
      payload: { action, ...dto },
    });
  }

  private titleForAction(prefix: string, action: string) {
    return `${prefix}: ${action.replace(/[-_.]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}`;
  }
}
