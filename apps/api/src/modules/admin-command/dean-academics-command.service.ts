import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { ExamsService } from '../exams/exams.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

@Injectable()
export class DeanAcademicsCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly operations: AdminCommandOperationsService,
    private readonly examsService: ExamsService,
  ) {}

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    return this.prisma.query<T>(query, params);
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
    return this.examsService.listAcademicInterventions();
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
    return this.operations.listReportSnapshots(tenantId, 'dean-academics-command');
  }

  async generateReport(dto: any = {}) {
    const tenantId = this.requireTenantId();
    const [overview, workload, lessonLogs, coverage, interventions] = await Promise.all([
      this.getOverview(),
      this.getTeacherWorkload(),
      this.getLessonLogs(),
      this.getCurriculumCoverage(),
      this.getAcademicInterventions(),
    ]);

    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'dean-academics-command',
      reportId: String(dto?.reportId || dto?.type || 'dean-academic-report'),
      title: String(dto?.title || dto?.name || 'Dean academic operations report'),
      format: dto?.format || 'pdf',
      generatedByUserId: this.requestContext.getStore()?.user_id,
      sections: {
        overview,
        teacher_workload: workload,
        lesson_logs: lessonLogs,
        curriculum_coverage: coverage,
        academic_interventions: interventions,
      },
      filters: { scope: dto?.scope ?? 'whole_school', requested_from: 'dean-dashboard' },
      targetRoles: ['dean_academics', 'principal', 'hod', 'exams_manager'],
    });
  }

  async recordDeanAction(action: string, dto: any = {}) {
    const tenantId = this.requireTenantId();
    const normalized = String(action || 'dean_action').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    return this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.requestContext.getStore()?.user_id,
      sourceRole: 'dean_academics',
      targetRoles: ['dean_academics', 'hod', 'exams_manager', 'principal'],
      eventType: `dean_academics.${normalized}`,
      entityType: 'dean_academics_workflow',
      entityId: dto?.taskId ?? dto?.batchId ?? dto?.id ?? null,
      title: String(dto?.title || normalized.replace(/_/g, ' ')).replace(/\b\w/g, (char) => char.toUpperCase()).slice(0, 160),
      message: String(dto?.message || dto?.notes || dto?.reason || 'Dean of Academics workflow saved.').slice(0, 500),
      priority: normalized.includes('reject') || normalized.includes('lock') ? 'high' : 'normal',
      payload: { action: normalized, ...dto },
    });
  }
}
