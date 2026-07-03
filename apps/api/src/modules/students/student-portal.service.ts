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

    return {
      metrics: {
        attendanceRate: 95, // Stub until attendance implemented
        averageGrade: 'B+',
        pendingAssignments: 2,
        unreadMessages: 1
      },
      profile: {
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        className: student.currentClass?.name || 'Unassigned',
        streamName: student.currentStream?.name || ''
      },
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
      where: { studentId, schoolId: tenantId },
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
