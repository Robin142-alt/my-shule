import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { LmsService } from '../lms/lms.service';

@Injectable()
export class StudentPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly lmsService: LmsService,
  ) {}

  private requireStudentId(): string {
    const studentId = this.requestContext.getStore()?.user_id; // In student portal, the user ID maps to student profile ID or is linked.
    // For now we assume user_id is the student ID.
    if (!studentId) {
      throw new UnauthorizedException('Student context is required');
    }
    return studentId;
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    if ((this.prisma as any).executeWithTenant) {
      return (this.prisma as any).executeWithTenant(params[0], null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const rows = Array.isArray(result) ? result : [result];
        return { rows, rowCount: rows.length };
      });
    }

    const result = await (this.prisma as any).$queryRawUnsafe(query, ...params);
    const rows = Array.isArray(result) ? result : [result];
    return { rows, rowCount: rows.length };
  }

  private async countPendingAssignments(tenantId: string, studentId: string): Promise<number> {
    let result: { rows: { pending_count: string | number }[] };

    try {
      result = await this.executeSql<{ pending_count: string | number }>(
        `
          SELECT COUNT(*)::text AS pending_count
          FROM lms_assignments assignment
          WHERE assignment.tenant_id = $1
            AND COALESCE(assignment.status, 'open') NOT IN ('closed', 'archived', 'locked')
            AND NOT EXISTS (
              SELECT 1
              FROM lms_submissions submission
              WHERE submission.tenant_id = assignment.tenant_id
                AND submission.assignment_id = assignment.id
                AND submission.student_id = $2::uuid
                AND COALESCE(submission.status, 'submitted') IN ('submitted', 'graded', 'complete', 'completed')
            )
        `,
        [tenantId, studentId],
      );
    } catch (error: any) {
      if (error?.code === '42P01' || /lms_(assignments|submissions).*does not exist/i.test(String(error?.message))) {
        return 0;
      }

      throw error;
    }

    return Number(result.rows[0]?.pending_count ?? 0);
  }

  async getDashboard() {
    const tenantId = this.requireTenantId();
    const studentId = this.requireStudentId();

    const student = await this.prisma.student.findUnique({
      where: { id: studentId, schoolId: tenantId },
      include: {
        currentClass: true,
        currentStream: true,
      }
    });

    if (!student) {
      throw new UnauthorizedException('Student not found in this school');
    }

    const [attendanceRecords, latestReportCard, unreadMessages, pendingAssignments] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: { studentId, schoolId: tenantId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.reportCard.findFirst({
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
      this.prisma.notification.count({
        where: {
          schoolId: tenantId,
          targetUserId: studentId,
          status: 'UNREAD',
        },
      }),
      this.countPendingAssignments(tenantId, studentId),
    ]);

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
    const studentId = this.requireStudentId();

    const reportCards = await this.prisma.reportCard.findMany({
      where: {
        studentId,
        schoolId: tenantId,
        status: 'RELEASED',
        releasedAt: { not: null },
      },
      orderBy: { term: { startDate: 'desc' } }
    });

    return {
      metrics: {},
      items: reportCards
    };
  }

  async getAttendance() {
    const tenantId = this.requireTenantId();
    const studentId = this.requireStudentId();

    const records = await this.prisma.attendanceRecord.findMany({
      where: { studentId, schoolId: tenantId },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

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
    const studentId = this.requireStudentId();
    const student = await this.prisma.student.findUnique({
      where: { id: studentId, schoolId: tenantId },
      select: { id: true },
    });

    if (!student) {
      throw new UnauthorizedException('Student not found in this school');
    }

    const submission = await this.lmsService.submitAssignment(normalizedAssignmentId, {
      student_id: studentId,
      status: 'submitted',
      answer_text: 'Marked complete from the student portal.',
    });

    return {
      success: true,
      assignmentId: normalizedAssignmentId,
      submission,
    };
  }
}
