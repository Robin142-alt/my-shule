import { Injectable, Optional, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { ExamsService } from '../exams/exams.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';
import { CURRICULUM_COVERAGE_SQL } from './academic-workspace-queries';

@Injectable()
export class HodCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly operations: AdminCommandOperationsService,
    @Optional() private readonly examsService?: ExamsService,
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
      `SELECT * FROM academics_departments WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }

  async getReviewQueue() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM academics_lesson_plans WHERE tenant_id = $1 AND lower(status::text) = 'submitted'`,
      [tenantId]
    );
    return res.rows;
  }

  async getSubjectAllocation() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT assignment.*, subject.name AS subject_name, section.name AS class_name, staff.display_name AS teacher_name
       FROM teacher_subject_assignments assignment
       JOIN subjects subject ON subject.tenant_id = assignment.tenant_id AND subject.id::text = assignment.subject_id::text
       JOIN class_sections section ON section.tenant_id = assignment.tenant_id AND section.id::text = assignment.class_section_id::text
       LEFT JOIN LATERAL (SELECT profile.display_name FROM staff_profiles profile
         WHERE profile.tenant_id = assignment.tenant_id AND profile.user_id::text = assignment.teacher_user_id::text LIMIT 1) staff ON TRUE
       WHERE assignment.tenant_id = $1 AND assignment.status = 'active'`,
      [tenantId]
    );
    return res.rows;
  }

  async getSubjectAllocationOptions() {
    const tenantId = this.requireTenantId();
    const [teachers, subjects, classes, terms] = await Promise.all([
      this.executeSql(
        `SELECT id::text, user_id::text, display_name AS label
         FROM staff_profiles
         WHERE tenant_id = $1
           AND status IN ('active', 'pending_acceptance', 'profile_incomplete')
         ORDER BY display_name ASC`,
        [tenantId],
      ),
      this.executeSql(
        `SELECT id::text, name AS label, code
         FROM subjects
         WHERE tenant_id = $1
           AND status = 'active'
         ORDER BY name ASC`,
        [tenantId],
      ),
      this.executeSql(
        `SELECT id::text,
                COALESCE(custom_label, name || COALESCE(' ' || NULLIF(stream, ''), '')) AS label,
                grade_level,
                stream
         FROM class_sections
         WHERE tenant_id = $1
           AND is_active = true
           AND status = 'active'
         ORDER BY grade_level ASC, stream ASC, name ASC`,
        [tenantId],
      ),
      this.executeSql(
        `SELECT id::text, name AS label, status
         FROM academic_terms
         WHERE tenant_id = $1
           AND status IN ('active', 'draft')
         ORDER BY starts_on DESC`,
        [tenantId],
      ),
    ]);

    return {
      teachers: teachers.rows,
      subjects: subjects.rows,
      classes: classes.rows,
      terms: terms.rows,
    };
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
      `SELECT * FROM academics_lesson_plans WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getCoverageReview() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      CURRICULUM_COVERAGE_SQL,
      [tenantId]
    );
    return res.rows;
  }

  async getMarksModeration() {
    if (!this.examsService) {
      throw new ServiceUnavailableException('Published exam analytics are not available');
    }
    return this.examsService.getAnalytics({ scope: 'department' });
  }

  async getResourceRequests() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM inventory_requests WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    return this.operations.listReportSnapshots(tenantId, 'hod-command');
  }

  async recordHodAction(action: string, dto: any = {}, entityId?: string | null) {
    const tenantId = this.requireTenantId();
    const normalizedAction = String(action || 'action_recorded').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    const eventType = normalizedAction === 'subject_allocation'
      ? 'hod.subject_allocation'
      : normalizedAction === 'subject_allocation_revoke_requested'
        ? 'hod.subject_allocation.revoke_requested'
      : normalizedAction === 'department_meeting'
        ? 'hod.department_meeting'
        : `hod.${normalizedAction}`;
    const title = String(dto?.title || dto?.subject || dto?.meetingTitle || this.titleize(normalizedAction)).slice(0, 160);
    const message = String(dto?.message || dto?.summary || dto?.notes || dto?.reason || `${title} recorded by Head of Department`).slice(0, 500);
    return this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.requestContext.getStore()?.user_id,
      sourceRole: 'hod',
      targetRoles: ['hod', 'teacher', 'dean_academics', 'principal'],
      eventType,
      entityType: 'hod_workflow',
      entityId: entityId ?? dto?.id ?? null,
      title,
      message,
      priority: normalizedAction.includes('reject') || normalizedAction.includes('missing') || normalizedAction.includes('escalat') ? 'high' : 'normal',
      payload: {
        action: normalizedAction,
        ...dto,
      },
    });
  }

  async createSubjectAllocation(dto: any = {}) {
    const assignment = await this.upsertSubjectAllocation(dto);
    const event = await this.recordHodAction('subject_allocation', {
      ...dto,
      title: dto?.title || 'Subject allocation updated',
      message: assignment
        ? 'Teacher, subject, and class allocation was persisted and routed for department visibility.'
        : 'Subject allocation request was routed for verification because some assignment IDs were incomplete.',
      persisted_assignment_id: assignment?.id ?? null,
    }, assignment?.id ?? dto?.assignment_id ?? dto?.id ?? null);

    return {
      success: true,
      message: assignment ? 'Subject allocation persisted' : 'Subject allocation routed for verification',
      assignment,
      event,
    };
  }

  async requestSubjectAllocationRevocation(dto: any = {}) {
    const assignmentId = this.operations.uuidOrNull(dto?.assignment_id ?? dto?.assignmentId ?? dto?.id);
    const subjectId = this.operations.uuidOrNull(dto?.subject_id ?? dto?.subjectId);
    const teacherId = this.operations.uuidOrNull(dto?.teacher_id ?? dto?.teacherId);
    const classSectionId = this.operations.uuidOrNull(dto?.class_section_id ?? dto?.classSectionId);
    const reason = String(dto?.reason ?? dto?.notes ?? 'HOD requested subject allocation revocation for department review.').trim().slice(0, 500);
    const event = await this.recordHodAction('subject_allocation_revoke_requested', {
      ...dto,
      title: dto?.title || 'Subject allocation revoke requested',
      message: reason,
      assignment_id: assignmentId,
      subject_id: subjectId,
      teacher_id: teacherId,
      class_section_id: classSectionId,
      requires_review: true,
    }, assignmentId);

    return {
      success: true,
      message: 'Subject allocation revoke request routed for academic review',
      event,
    };
  }

  async recordRosterReview(dto: any = {}) {
    const subjectName = String(dto?.subject_name ?? dto?.subjectName ?? dto?.subject ?? 'Department subject').trim().slice(0, 120);
    const className = String(dto?.class_name ?? dto?.className ?? dto?.class_section_name ?? dto?.classSectionName ?? 'assigned class').trim().slice(0, 120);
    const assignmentId = this.operations.uuidOrNull(dto?.assignment_id ?? dto?.assignmentId ?? dto?.id);
    const event = await this.operations.recordWorkflowAction({
      tenantId: this.requireTenantId(),
      actorUserId: this.requestContext.getStore()?.user_id,
      sourceRole: 'hod',
      targetRoles: ['hod', 'teacher', 'dean_academics', 'principal'],
      eventType: 'hod.roster_review.requested',
      entityType: 'department_roster_review',
      entityId: assignmentId,
      title: dto?.title || 'Class roster review requested',
      message: `${subjectName} roster for ${className} was requested by the HOD.`,
      priority: 'normal',
      payload: {
        ...dto,
        assignment_id: assignmentId,
        subject_name: subjectName,
        class_name: className,
        source_workspace: dto?.sourceWorkspace ?? dto?.source_workspace ?? 'my-teaching',
      },
    });

    return {
      success: true,
      message: 'Roster review request routed to department workflow',
      event,
    };
  }

  async logDepartmentMeeting(dto: any = {}) {
    const event = await this.recordHodAction('department_meeting', {
      ...dto,
      title: dto?.meetingTitle || dto?.title || 'Department meeting logged',
      message: dto?.summary || dto?.minutes || 'Department meeting minutes recorded by Head of Department.',
      scheduled_at: dto?.scheduledAt ?? dto?.scheduled_at ?? null,
    });

    return { success: true, message: 'Department meeting logged and routed', event };
  }

  private async upsertSubjectAllocation(dto: any = {}) {
    const tenantId = this.requireTenantId();
    const subjectId = this.operations.uuidOrNull(dto?.subject_id ?? dto?.subjectId);
    const classSectionId = this.operations.uuidOrNull(dto?.class_section_id ?? dto?.classSectionId);
    const academicTermId = this.operations.uuidOrNull(dto?.academic_term_id ?? dto?.academicTermId);
    const teacherId = this.operations.uuidOrNull(dto?.teacher_id ?? dto?.teacherId ?? dto?.staff_member_id ?? dto?.staffMemberId);

    if (!subjectId || !classSectionId || !academicTermId) {
      return null;
    }

    const result = await this.executeSql(
      `
        INSERT INTO class_subject_assignments (
          tenant_id, academic_term_id, class_section_id, subject_id, staff_member_id, created_by_user_id, metadata
        )
        VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $7::jsonb)
        ON CONFLICT (tenant_id, academic_term_id, class_section_id, subject_id)
        DO UPDATE SET
          staff_member_id = COALESCE(EXCLUDED.staff_member_id, class_subject_assignments.staff_member_id),
          metadata = class_subject_assignments.metadata || EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id::text, tenant_id, academic_term_id::text, class_section_id::text, subject_id::text, staff_member_id::text
      `,
      [
        tenantId,
        academicTermId,
        classSectionId,
        subjectId,
        teacherId,
        this.operations.uuidOrNull(this.requestContext.getStore()?.user_id),
        JSON.stringify({
          source_dashboard: 'hod-command-center',
          lessons_per_week: dto?.lessons_per_week ?? dto?.lessonsPerWeek ?? null,
          notes: dto?.notes ?? null,
        }),
      ],
    );

    return result.rows[0] ?? null;
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    const [overview, teachers, allocations, lessonPlans, coverage, marks, resources] = await Promise.all([
      this.getOverview(),
      this.getDepartmentTeachers(),
      this.getSubjectAllocation(),
      this.getLessonPlans(),
      this.getCoverageReview(),
      this.getMarksModeration(),
      this.getResourceRequests(),
    ]);
    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'hod-command',
      reportId: 'hod-department-report',
      title: String(dto?.title || dto?.name || 'HOD department operations report'),
      format: dto?.format,
      generatedByUserId: this.operations.uuidOrNull(this.requestContext.getStore()?.user_id),
      sections: { overview, teachers, allocations, lessonPlans, coverage, marks, resources },
      filters: { requested_from: 'hod-dashboard' },
      targetRoles: ['hod', 'dean_academics', 'principal'],
    });
  }

  private titleize(value: string) {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
