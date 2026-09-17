import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { ExamsService } from '../exams/exams.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';
import { CURRICULUM_COVERAGE_SQL, DEPARTMENT_PERFORMANCE_SQL, TEACHER_WORKLOAD_SQL } from './academic-workspace-queries';

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
      TEACHER_WORKLOAD_SQL,
      [tenantId]
    );
    return res.rows;
  }

  async getLessonPlans() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM academics_lesson_plans WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getLessonLogs() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM academics_lesson_logs WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getCurriculumCoverage() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      CURRICULUM_COVERAGE_SQL,
      [tenantId]
    );
    return res.rows;
  }

  async getAssessments() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT
          concat_ws(
            ':',
            mark.exam_series_id::text,
            mark.assessment_id::text,
            mark.class_section_id::text,
            mark.status
          ) AS id,
          series.name AS title,
          assessment.name AS assessment_name,
          COALESCE(subject.name, assessment.name) AS subject,
          COALESCE(
            NULLIF(class_section.custom_label, ''),
            NULLIF(class_section.name, ''),
            'Unassigned class'
          ) AS class_name,
          MAX(mark.updated_at)::text AS date,
          assessment.max_score::float AS total_marks,
          COUNT(mark.id)::int AS submissions,
          mark.status,
          array_agg(mark.id::text ORDER BY mark.id::text) AS mark_ids
        FROM exam_marks mark
        INNER JOIN exam_assessments assessment
          ON assessment.tenant_id = mark.tenant_id
         AND assessment.id = mark.assessment_id
        INNER JOIN exam_series series
          ON series.tenant_id = mark.tenant_id
         AND series.id = mark.exam_series_id
        LEFT JOIN subjects subject
          ON subject.tenant_id = mark.tenant_id
         AND subject.id = mark.subject_id::text
        LEFT JOIN class_sections class_section
          ON class_section.tenant_id = mark.tenant_id
         AND class_section.id = mark.class_section_id::text
        WHERE mark.tenant_id = $1
          AND mark.status IN ('submitted', 'reviewed')
        GROUP BY
          mark.exam_series_id,
          mark.assessment_id,
          mark.class_section_id,
          mark.status,
          series.name,
          assessment.name,
          assessment.max_score,
          subject.name,
          class_section.custom_label,
          class_section.name
        ORDER BY MAX(mark.updated_at) DESC
        LIMIT 100
      `,
      [tenantId]
    );
    const assessmentsList = res.rows;
    return {
      metrics: {
        active_assessments: assessmentsList.length,
        pending_marking: assessmentsList.filter((row: any) => row.status === 'submitted').length,
        completed: assessmentsList.filter((row: any) => row.status === 'reviewed').length,
      },
      assessmentsList,
    };
  }

  async lockAssessmentBatch(dto: any = {}) {
    const rawMarkIds: unknown[] = Array.isArray(dto?.markIds)
      ? dto.markIds
      : Array.isArray(dto?.mark_ids)
        ? dto.mark_ids
        : [];
    const markIds = [
      ...new Set(
        rawMarkIds
          .filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
          .map((id) => id.trim()),
      ),
    ];
    if (markIds.length === 0 || markIds.length > 500) {
      throw new BadRequestException('Provide between 1 and 500 reviewed mark IDs');
    }
    return this.examsService.lockMarks({ mark_ids: markIds });
  }

  async getAcademicInterventions() {
    return this.examsService.listAcademicInterventions();
  }

  async getDepartmentPerformance() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      DEPARTMENT_PERFORMANCE_SQL,
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
