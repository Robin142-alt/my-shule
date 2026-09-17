import { Injectable, Optional, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { ExamsService } from '../exams/exams.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';
import { AcademicsService } from '../academics/academics.service';
import { CURRICULUM_COVERAGE_SQL } from './academic-workspace-queries';

@Injectable()
export class HodCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly operations: AdminCommandOperationsService,
    @Optional() private readonly examsService?: ExamsService,
    @Optional() private readonly academicsService?: AcademicsService,
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
      `SELECT assignment.*, subject.name AS subject_name,
         CONCAT_WS(' / ',section.name,stream.name) AS class_name, stream.name AS stream_name,
         staff.display_name AS teacher_name, offering.lessons_per_week
       FROM teacher_subject_assignments assignment
       JOIN academic_cohort_placements placement ON placement.tenant_id=assignment.tenant_id
         AND placement.id::text = assignment.cohort_placement_id::text AND placement.status='active'
       JOIN subjects subject ON subject.tenant_id=assignment.tenant_id AND subject.id::text = assignment.subject_id::text
       JOIN class_sections section ON section.tenant_id=assignment.tenant_id AND section.id::text = assignment.class_section_id::text
       LEFT JOIN class_streams stream ON stream.tenant_id=assignment.tenant_id AND stream.id::text = assignment.stream_id::text
       LEFT JOIN LATERAL (SELECT profile.display_name FROM staff_profiles profile
         WHERE profile.tenant_id=assignment.tenant_id AND profile.user_id::text = assignment.teacher_user_id::text LIMIT 1) staff ON TRUE
       LEFT JOIN class_subject_assignments offering ON offering.tenant_id=assignment.tenant_id
         AND offering.cohort_placement_id::text = assignment.cohort_placement_id::text AND offering.subject_id::text = assignment.subject_id::text AND offering.status='active'
       WHERE assignment.tenant_id=$1 AND assignment.status='active'`,
      [tenantId]
    );
    return res.rows;
  }

  async getSubjectAllocationOptions() {
    const tenantId = this.requireTenantId();
    const [teachers, subjects, classes, streams] = await Promise.all([
      this.executeSql(
        `SELECT id::text, user_id::text, display_name AS label
         FROM staff_profiles
         WHERE tenant_id = $1
           AND status = 'active' AND user_id IS NOT NULL
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
        `SELECT id::text, name AS label, class_section_id::text
         FROM class_streams
         WHERE tenant_id = $1
           AND status='active' AND is_active=TRUE
         ORDER BY name`,
        [tenantId],
      ),
    ]);

    return {
      teachers: teachers.rows,
      subjects: subjects.rows,
      classes: classes.rows,
      streams: streams.rows,
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
    return this.examsService.getAnalytics();
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

  private async upsertSubjectAllocation(dto: any = {}): Promise<Record<string, any> | null> {
    const tenantId = this.requireTenantId();
    const subjectId = this.operations.uuidOrNull(dto?.subject_id ?? dto?.subjectId);
    const classSectionId = this.operations.uuidOrNull(dto?.class_section_id ?? dto?.classSectionId);
    const teacherId = this.operations.uuidOrNull(dto?.teacher_id ?? dto?.teacherId ?? dto?.staff_member_id ?? dto?.staffMemberId);

    if (!subjectId || !classSectionId) {
      return null;
    }

    if (!this.academicsService) throw new ServiceUnavailableException('Academic configuration is unavailable.');
    const scope = {class_section_id:classSectionId,subject_id:subjectId,
      lessons_per_week:dto?.lessons_per_week ? Number(dto.lessons_per_week) : undefined,
      stream_id:this.operations.uuidOrNull(dto?.stream_id ?? dto?.streamId) ?? undefined,
      reason:String(dto?.reason ?? dto?.notes ?? 'Department teaching configuration')};
    if (!teacherId) return this.academicsService.createClassSubjectAssignment(scope);
    const staff = await this.executeSql(`SELECT user_id::text FROM staff_profiles
      WHERE tenant_id=$1 AND (id::text=$2 OR user_id::text=$2) AND status='active'`,[tenantId,teacherId]);
    if (!staff.rows[0]?.user_id) throw new ServiceUnavailableException('Select an active teacher with a linked staff account.');
    return this.academicsService.assignTeacher({...scope,teacher_user_id:staff.rows[0].user_id});
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
