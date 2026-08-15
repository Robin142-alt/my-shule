import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';

@Injectable()
export class StudentPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  private requireUserId(): string {
    const userId = this.requestContext.getStore()?.user_id;
    if (!userId) {
      throw new UnauthorizedException('Student context is required');
    }
    return userId;
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  private async executeTenantSql<T = any>(
    tenantId: string,
    userId: string,
    query: string,
    params: any[] = [],
  ): Promise<{ rows: T[]; rowCount: number }> {
    return this.prisma.executeWithTenant(tenantId, userId, async (tx: any) => {
      const result = await tx.$queryRawUnsafe(query, ...params);
      const rows = Array.isArray(result) ? result : [result];
      return { rows, rowCount: rows.length };
    });
  }

  private async resolveStudentId(tenantId: string, userId: string): Promise<string> {
    const access = await this.executeTenantSql<{ student_id: string }>(
      tenantId,
      userId,
      `
        SELECT access.student_id
        FROM student_portal_access access
        JOIN students student
          ON student.tenant_id = access.tenant_id
         AND student.id = access.student_id
        WHERE access.tenant_id = $1
          AND access.user_id = $2::uuid
          AND access.status = 'active'
          AND student.deleted_at IS NULL
        LIMIT 1
      `,
      [tenantId, userId],
    );

    if (access.rows[0]?.student_id) {
      return access.rows[0].student_id;
    }

    // Preserve access for older student accounts created before portal links
    // were introduced, but never allow the fallback across a school boundary.
    const legacyStudent = await this.prisma.executeWithTenant(tenantId, userId, (tx) =>
      tx.student.findUnique({
        where: { id: userId, schoolId: tenantId },
        select: { id: true },
      }),
    );
    if (!legacyStudent) {
      throw new UnauthorizedException('Student portal account is not linked in this school');
    }

    return legacyStudent.id;
  }

  private async listAssignments(tenantId: string, userId: string, studentId: string) {
    const result = await this.executeTenantSql<{
      id: string;
      title: string;
      description: string | null;
      subject: string;
      teacher: string;
      due_at: string;
      status: string;
      submission_status: string | null;
      submitted_at: string | null;
      completed_at: string | null;
    }>(
      tenantId,
      userId,
      `
        SELECT
          assignment.id::text,
          assignment.title,
          assignment.description,
          COALESCE(subject.name, 'Subject not linked') AS subject,
          COALESCE(
            NULLIF(actor.display_name, ''),
            NULLIF(actor.full_name, ''),
            actor.email::text,
            'Teacher not recorded'
          ) AS teacher,
          assignment.due_date::text AS due_at,
          assignment.status,
          submission.status AS submission_status,
          submission.submitted_at::text,
          submission.completed_at::text
        FROM academics_assignments assignment
        JOIN students student
          ON student.tenant_id = assignment.tenant_id
         AND student.id = $2
         AND student.deleted_at IS NULL
        LEFT JOIN subjects subject
          ON subject.tenant_id = assignment.tenant_id
         AND subject.id::text = assignment.subject_id
        LEFT JOIN users actor
          ON actor.id = assignment.teacher_id
        LEFT JOIN academics_assignment_submissions submission
          ON submission.tenant_id = assignment.tenant_id
         AND submission.assignment_id = assignment.id
         AND submission.student_id = student.id
        WHERE assignment.tenant_id = $1
          AND lower(assignment.status) IN ('published', 'open', 'active')
          AND (
            assignment.class_id = student.current_class_id::text
            OR EXISTS (
              SELECT 1
              FROM student_class_assignments enrollment
              WHERE enrollment.tenant_id = student.tenant_id
                AND enrollment.student_id = student.id
                AND enrollment.class_section_id = assignment.class_id
                AND enrollment.status = 'active'
            )
          )
        ORDER BY assignment.due_date ASC, assignment.created_at DESC
        LIMIT 250
      `,
      [tenantId, studentId],
    );

    return result.rows.map((assignment) => ({
      ...assignment,
      is_complete: ['submitted', 'completed', 'graded'].includes(
        String(assignment.submission_status ?? '').toLowerCase(),
      ),
    }));
  }

  private async countPendingAssignments(tenantId: string, userId: string, studentId: string): Promise<number> {
    const result = await this.executeTenantSql<{ pending_count: string | number }>(
      tenantId,
      userId,
      `
        SELECT COUNT(*)::text AS pending_count
        FROM academics_assignments assignment
        JOIN students student
          ON student.tenant_id = assignment.tenant_id
         AND student.id = $2
         AND student.deleted_at IS NULL
        WHERE assignment.tenant_id = $1
          AND lower(assignment.status) IN ('published', 'open', 'active')
          AND (
            assignment.class_id = student.current_class_id::text
            OR EXISTS (
              SELECT 1
              FROM student_class_assignments enrollment
              WHERE enrollment.tenant_id = student.tenant_id
                AND enrollment.student_id = student.id
                AND enrollment.class_section_id = assignment.class_id
                AND enrollment.status = 'active'
            )
          )
          AND NOT EXISTS (
            SELECT 1
            FROM academics_assignment_submissions submission
            WHERE submission.tenant_id = assignment.tenant_id
              AND submission.assignment_id = assignment.id
              AND submission.student_id = student.id
              AND lower(submission.status) IN ('submitted', 'completed', 'graded')
          )
      `,
      [tenantId, studentId],
    );

    return Number(result.rows[0]?.pending_count ?? 0);
  }

  async getDashboard() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const studentId = await this.resolveStudentId(tenantId, userId);

    const [portalData, pendingAssignments] = await Promise.all([
      this.prisma.executeWithTenant(tenantId, userId, async (tx) => {
        const student = await tx.student.findUnique({
          where: { id: studentId, schoolId: tenantId },
          include: {
            currentClass: true,
            currentStream: true,
          }
        });

        if (!student) {
          throw new UnauthorizedException('Student not found in this school');
        }

        const [attendanceRecords, latestReportCard, unreadMessages] = await Promise.all([
          tx.attendanceRecord.findMany({
            where: { studentId, schoolId: tenantId },
            orderBy: { createdAt: 'desc' },
            take: 30,
          }),
          tx.reportCard.findFirst({
            where: {
              studentId,
              schoolId: tenantId,
              status: 'RELEASED',
              releasedAt: { not: null },
            },
            include: {
              academicYear: true,
              term: true,
            },
            orderBy: [
              { academicYear: { startDate: 'desc' } },
              { term: { termNumber: 'desc' } },
            ],
          }),
          tx.notification.count({
            where: {
              schoolId: tenantId,
              targetUserId: userId,
              status: 'UNREAD',
            },
          }),
        ]);

        return { student, attendanceRecords, latestReportCard, unreadMessages };
      }),
      this.countPendingAssignments(tenantId, userId, studentId),
    ]);
    const { student, attendanceRecords, latestReportCard, unreadMessages } = portalData;

    const attendanceSummary = attendanceRecords.reduce(
      (summary, record) => {
        summary.total += 1;

        if (record.status === 'PRESENT') summary.present += 1;
        if (record.status === 'ABSENT') summary.absent += 1;
        if (record.status === 'LATE') summary.late += 1;

        return summary;
      },
      { total: 0, present: 0, absent: 0, late: 0 },
    );
    const attendanceRate = attendanceSummary.total > 0
      ? Math.round((attendanceSummary.present / attendanceSummary.total) * 100)
      : 0;

    return {
      metrics: {
        attendanceRate,
        averageGrade: latestReportCard?.meanGrade ?? null,
        pendingAssignments,
        unreadMessages,
      },
      attendanceSummary,
      profile: {
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        className: student.currentClass?.name || 'Unassigned',
        streamName: student.currentStream?.name || ''
      },
      academics: latestReportCard ? {
        meanScore: latestReportCard.meanScore,
        meanGrade: latestReportCard.meanGrade,
        term: latestReportCard.term?.name,
        academicYear: latestReportCard.academicYear?.name,
      } : null,
      recentActivity: []
    };
  }

  async getOverview() {
    return this.getDashboard(); // Same logic for now
  }

  async getAcademics() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const studentId = await this.resolveStudentId(tenantId, userId);

    const [reportCards, assignments] = await Promise.all([
      this.prisma.executeWithTenant(tenantId, userId, (tx) =>
        tx.reportCard.findMany({
          where: {
            studentId,
            schoolId: tenantId,
            status: 'RELEASED',
            releasedAt: { not: null },
          },
          orderBy: { term: { startDate: 'desc' } },
        }),
      ),
      this.listAssignments(tenantId, userId, studentId),
    ]);

    return {
      metrics: {
        assignments: assignments.length,
        pendingAssignments: assignments.filter((assignment) => !assignment.is_complete).length,
        reportCards: reportCards.length,
      },
      assignments,
      items: reportCards,
    };
  }

  async getAttendance() {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const studentId = await this.resolveStudentId(tenantId, userId);

    const records = await this.prisma.executeWithTenant(tenantId, userId, (tx) =>
      tx.attendanceRecord.findMany({
        where: { studentId, schoolId: tenantId },
        orderBy: { createdAt: 'desc' },
        take: 30
      }),
    );

    return {
      metrics: {
        present: records.filter(r => r.status === 'PRESENT').length,
        absent: records.filter(r => r.status === 'ABSENT').length,
        late: records.filter(r => r.status === 'LATE').length,
      },
      items: records
    };
  }

  async markAssignmentDone(assignmentId: string) {
    const normalizedAssignmentId = String(assignmentId ?? '').trim();

    if (!normalizedAssignmentId) {
      throw new BadRequestException('assignmentId is required');
    }

    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const studentId = await this.resolveStudentId(tenantId, userId);
    const actorRole = this.requestContext.getStore()?.role ?? 'student';
    const correlationId = randomUUID();

    const execute = async (tx: any) => {
      const assignments = await tx.$queryRawUnsafe(
        `
          SELECT
            assignment.id::text,
            assignment.title,
            assignment.teacher_id::text,
            submission.id::text AS submission_id,
            submission.status AS submission_status
          FROM academics_assignments assignment
          JOIN students student
            ON student.tenant_id = assignment.tenant_id
           AND student.id = $3
           AND student.deleted_at IS NULL
          LEFT JOIN academics_assignment_submissions submission
            ON submission.tenant_id = assignment.tenant_id
           AND submission.assignment_id = assignment.id
           AND submission.student_id = student.id
          WHERE assignment.tenant_id = $1
            AND assignment.id::text = $2
            AND lower(assignment.status) IN ('published', 'open', 'active')
            AND (
              assignment.class_id = student.current_class_id::text
              OR EXISTS (
                SELECT 1
                FROM student_class_assignments enrollment
                WHERE enrollment.tenant_id = student.tenant_id
                  AND enrollment.student_id = student.id
                  AND enrollment.class_section_id = assignment.class_id
                  AND enrollment.status = 'active'
              )
            )
          FOR UPDATE OF assignment
        `,
        tenantId,
        normalizedAssignmentId,
        studentId,
      );
      const assignment = Array.isArray(assignments) ? assignments[0] : null;

      if (!assignment) {
        throw new BadRequestException('Assignment was not found for this student and school');
      }

      if (['submitted', 'completed', 'graded'].includes(String(assignment.submission_status ?? '').toLowerCase())) {
        return {
          success: true,
          assignmentId: normalizedAssignmentId,
          alreadyCompleted: true,
          submission: {
            id: assignment.submission_id,
            status: assignment.submission_status,
          },
        };
      }

      const submissionRows = await tx.$queryRawUnsafe(
        `
          INSERT INTO academics_assignment_submissions (
            tenant_id,
            assignment_id,
            student_id,
            status,
            submitted_by_user_id,
            submitted_at,
            completed_at,
            metadata
          )
          VALUES ($1, $2::uuid, $3, 'completed', $4::uuid, NOW(), NOW(), $5::jsonb)
          ON CONFLICT (tenant_id, assignment_id, student_id)
          DO UPDATE SET
            status = 'completed',
            submitted_by_user_id = EXCLUDED.submitted_by_user_id,
            submitted_at = COALESCE(academics_assignment_submissions.submitted_at, NOW()),
            completed_at = NOW(),
            metadata = academics_assignment_submissions.metadata || EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING id::text, status, submitted_at::text, completed_at::text
        `,
        tenantId,
        normalizedAssignmentId,
        studentId,
        userId,
        JSON.stringify({
          source_dashboard: 'student',
          completion_mode: 'student_marked_done',
          correlation_id: correlationId,
        }),
      );
      const submission = Array.isArray(submissionRows) ? submissionRows[0] : submissionRows;

      await tx.$queryRawUnsafe(
        `
          INSERT INTO academic_audit_logs (
            school_id,
            tenant_id,
            entity_type,
            entity_id,
            action,
            actor_user_id,
            actor_role,
            new_values,
            metadata,
            correlation_id
          )
          VALUES (
            $1,
            $1,
            'assignment_submission',
            $2,
            'student.assignment_completed',
            $3::uuid,
            $4,
            $5::jsonb,
            $6::jsonb,
            $7
          )
        `,
        tenantId,
        submission.id,
        userId,
        actorRole,
        JSON.stringify({ status: 'completed', assignment_id: normalizedAssignmentId }),
        JSON.stringify({ student_id: studentId, source_dashboard: 'student' }),
        correlationId,
      );

      await tx.$queryRawUnsafe(
        `
          INSERT INTO workflow_events (
            tenant_id,
            source_user_id,
            source_role,
            target_roles,
            event_type,
            entity_type,
            entity_id,
            title,
            message,
            priority,
            payload,
            status
          )
          VALUES (
            $1,
            $2::uuid,
            $3,
            $4::jsonb,
            'student.assignment_completed',
            'assignment_submission',
            $5,
            $6,
            $7,
            'normal',
            $8::jsonb,
            'pending'
          )
        `,
        tenantId,
        userId,
        actorRole,
        JSON.stringify(['teacher', 'class_teacher']),
        submission.id,
        'Student completed assignment',
        `${assignment.title} was marked complete by a student.`,
        JSON.stringify({
          assignment_id: normalizedAssignmentId,
          submission_id: submission.id,
          student_id: studentId,
          teacher_id: assignment.teacher_id,
          source_dashboard: 'student',
          correlation_id: correlationId,
        }),
      );

      return {
        success: true,
        assignmentId: normalizedAssignmentId,
        alreadyCompleted: false,
        submission,
      };
    };

    return this.prisma.executeWithTenant(tenantId, userId, execute);
  }
}
