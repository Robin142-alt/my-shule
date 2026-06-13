import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { StudentStatus } from '@prisma/client';

@Injectable()
export class StudentLifecycleService {
  private readonly logger = new Logger(StudentLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async enrollStudent(schoolId: string, studentId: string, userId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.schoolId !== schoolId) {
      throw new NotFoundException('Student not found');
    }

    if (student.studentStatus !== StudentStatus.ACCEPTED && student.studentStatus !== StudentStatus.APPLICANT) {
      throw new BadRequestException('Student must be an applicant or accepted to be enrolled');
    }

    const updatedStudent = await this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.student.update({
        where: { id: studentId },
        data: { studentStatus: StudentStatus.ENROLLED },
      });

      await tx.studentAuditLog.create({
        data: {
          schoolId,
          studentId,
          action: 'ENROLL_STUDENT',
          previousStatus: student.studentStatus,
          newStatus: StudentStatus.ENROLLED,
          performedByUserId: userId,
        },
      });

      return updated;
    });

    await this.eventPublisher.publish({
      event_name: 'student.lifecycle.enrolled',
      event_key: `student.lifecycle.enrolled:${studentId}`,
      aggregate_type: 'Student',
      aggregate_id: studentId,
      tenant_id: schoolId,
      payload: { tenant_id: schoolId, student_id: studentId, status: 'ENROLLED' }
    });

    return updatedStudent;
  }

  async placeInClass(schoolId: string, studentId: string, classId: string, academicYearId: string, academicLevelId: string, userId: string, streamId?: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.schoolId !== schoolId) {
      throw new NotFoundException('Student not found');
    }

    const updatedStudent = await this.prisma.$transaction(async (tx: any) => {
      await tx.studentClassAssignment.updateMany({
        where: { schoolId, studentId, status: 'active' },
        data: { status: 'archived' },
      });

      await tx.studentClassAssignment.create({
        data: {
          schoolId,
          studentId,
          classId,
          streamId,
          academicYearId,
          academicLevelId,
          status: 'active',
          assignedBy: userId,
        },
      });

      const updated = await tx.student.update({
        where: { id: studentId },
        data: {
          studentStatus: StudentStatus.ACTIVE,
          currentClassId: classId,
          currentStreamId: streamId,
        },
      });

      await tx.studentAuditLog.create({
        data: {
          schoolId,
          studentId,
          action: 'PLACE_IN_CLASS',
          previousStatus: student.studentStatus,
          newStatus: StudentStatus.ACTIVE,
          performedByUserId: userId,
        },
      });

      return updated;
    });

    await this.eventPublisher.publish({
      event_name: 'student.lifecycle.class_assigned',
      event_key: `student.lifecycle.class_assigned:${studentId}`,
      aggregate_type: 'Student',
      aggregate_id: studentId,
      tenant_id: schoolId,
      payload: { tenant_id: schoolId, student_id: studentId, class_id: classId }
    });

    return updatedStudent;
  }

  async promoteStudent(schoolId: string, studentId: string, newClassId: string, academicYearId: string, academicLevelId: string, userId: string, streamId?: string) {
    return this.placeInClass(schoolId, studentId, newClassId, academicYearId, academicLevelId, userId, streamId);
  }

  async suspendStudent(schoolId: string, studentId: string, userId: string, reason: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.schoolId !== schoolId) {
      throw new NotFoundException('Student not found');
    }

    if (student.studentStatus !== StudentStatus.ACTIVE) {
      throw new BadRequestException('Only active students can be suspended');
    }

    const updatedStudent = await this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.student.update({
        where: { id: studentId },
        data: { studentStatus: StudentStatus.SUSPENDED },
      });

      await tx.studentAuditLog.create({
        data: {
          schoolId,
          studentId,
          action: 'SUSPEND_STUDENT',
          previousStatus: student.studentStatus,
          newStatus: StudentStatus.SUSPENDED,
          performedByUserId: userId,
          metadata: { reason },
        },
      });

      return updated;
    });

    await this.eventPublisher.publish({
      event_name: 'student.lifecycle.suspended',
      event_key: `student.lifecycle.suspended:${studentId}`,
      aggregate_type: 'Student',
      aggregate_id: studentId,
      tenant_id: schoolId,
      payload: { tenant_id: schoolId, student_id: studentId, status: 'SUSPENDED', reason }
    });

    return updatedStudent;
  }

  async initiateExitClearance(schoolId: string, studentId: string, userId: string) {
    const existing = await this.prisma.studentClearance.findFirst({
      where: { schoolId, studentId, status: 'PENDING' },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.studentClearance.create({
      data: {
        schoolId,
        studentId,
        status: 'PENDING',
      },
    });
  }

  async exitStudent(schoolId: string, studentId: string, userId: string, exitReason: string, exitStatus: StudentStatus, clearanceId?: string) {
    if (!['TRANSFERRED_OUT', 'WITHDRAWN', 'GRADUATED'].includes(exitStatus)) {
      throw new BadRequestException('Invalid exit status');
    }

    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.schoolId !== schoolId) {
      throw new NotFoundException('Student not found');
    }

    if (clearanceId) {
      const clearance = await this.prisma.studentClearance.findUnique({ where: { id: clearanceId } });
      if (!clearance || clearance.status !== 'CLEARED') {
        throw new BadRequestException('Student must be fully cleared before exiting');
      }
    }

    const updatedStudent = await this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.student.update({
        where: { id: studentId },
        data: { studentStatus: exitStatus },
      });

      await tx.studentExitRecord.create({
        data: {
          schoolId,
          studentId,
          exitDate: new Date(),
          reason: exitReason,
          authorizedByUserId: userId,
          clearanceId,
        },
      });

      await tx.studentAuditLog.create({
        data: {
          schoolId,
          studentId,
          action: 'EXIT_STUDENT',
          previousStatus: student.studentStatus,
          newStatus: exitStatus,
          performedByUserId: userId,
          metadata: { exitReason },
        },
      });

      return updated;
    });

    await this.eventPublisher.publish({
      event_name: 'student.lifecycle.exited',
      event_key: `student.lifecycle.exited:${studentId}`,
      aggregate_type: 'Student',
      aggregate_id: studentId,
      tenant_id: schoolId,
      payload: { tenant_id: schoolId, student_id: studentId, status: exitStatus, reason: exitReason }
    });

    return updatedStudent;
  }

  async archiveStudent(schoolId: string, studentId: string, userId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.schoolId !== schoolId) {
      throw new NotFoundException('Student not found');
    }

    if (!['TRANSFERRED_OUT', 'WITHDRAWN', 'GRADUATED'].includes(student.studentStatus)) {
      throw new BadRequestException('Student must be exited before archiving');
    }

    const newStatus = student.studentStatus === StudentStatus.GRADUATED ? StudentStatus.ALUMNI : StudentStatus.ARCHIVED;

    const updatedStudent = await this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.student.update({
        where: { id: studentId },
        data: { studentStatus: newStatus },
      });

      await tx.studentAuditLog.create({
        data: {
          schoolId,
          studentId,
          action: 'ARCHIVE_STUDENT',
          previousStatus: student.studentStatus,
          newStatus,
          performedByUserId: userId,
        },
      });

      return updated;
    });

    await this.eventPublisher.publish({
      event_name: 'student.lifecycle.archived',
      event_key: `student.lifecycle.archived:${studentId}`,
      aggregate_type: 'Student',
      aggregate_id: studentId,
      tenant_id: schoolId,
      payload: { tenant_id: schoolId, student_id: studentId, status: newStatus }
    });

    return updatedStudent;
  }
}
