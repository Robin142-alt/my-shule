import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { StudentStatus } from '@prisma/client';
import { continueSubjectTeachersAfterPromotion } from './subject-teacher-continuity';

@Injectable()
export class StudentLifecycleService {
  private readonly logger = new Logger(StudentLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async enrollStudent(schoolId: string, studentId: string, userId: string) {
    return this.prisma.executeWithTenant(schoolId, userId, async (tx: any) => {
      const student = await tx.student.findUnique({ where: { id: studentId } });
      if (!student || student.schoolId !== schoolId) {
        throw new NotFoundException('Student not found');
      }

      if (student.studentStatus !== StudentStatus.ACCEPTED && student.studentStatus !== StudentStatus.APPLICANT) {
        throw new BadRequestException('Student must be an applicant or accepted to be enrolled');
      }

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

      await this.eventPublisher.publish({
        event_name: 'student.lifecycle.enrolled',
        event_key: `student.lifecycle.enrolled:${studentId}`,
        aggregate_type: 'Student',
        aggregate_id: studentId,
        tenant_id: schoolId,
        payload: { tenant_id: schoolId, student_id: studentId, status: 'ENROLLED' }
      });

      return updated;
    });
  }

  async placeInClass(schoolId: string, studentId: string, classId: string, academicYearId: string, academicLevelId: string, userId: string, streamId?: string, promotion = false) {
    return this.prisma.executeWithTenant(schoolId, userId, async (tx: any) => {
      const [student, classSection, academicYear, academicLevel, stream] = await Promise.all([
        tx.student.findFirst({ where: { id: studentId, schoolId } }),
        tx.class.findFirst({ where: { id: classId, schoolId, deletedAt: null } }),
        tx.academicYear.findFirst({ where: { id: academicYearId, schoolId, deletedAt: null } }),
        tx.academicLevel.findFirst({ where: { id: academicLevelId, schoolId, isActive: true } }),
        streamId
          ? tx.stream.findFirst({ where: { id: streamId, schoolId, classId, deletedAt: null } })
          : Promise.resolve(null),
      ]);

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      if (!classSection || !academicYear || !academicLevel) {
        throw new NotFoundException('Class placement references were not found for this school');
      }

      if (streamId && !stream) {
        throw new NotFoundException('Stream was not found in the selected school class');
      }

      if (classSection.academicLevelId && classSection.academicLevelId !== academicLevelId) {
        throw new BadRequestException('Selected academic level does not match the class');
      }

      const previousPlacement = promotion
        ? await tx.studentClassAssignment.findFirst({
          where: { schoolId, studentId, status: 'active' },
          orderBy: { createdAt: 'desc' },
        })
        : null;
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

      if (promotion && previousPlacement) {
        await continueSubjectTeachersAfterPromotion(tx, {
          tenantId: schoolId, studentId, sourceClassId: previousPlacement.classId,
          sourceStreamId: previousPlacement.streamId, targetClassId: classId,
          targetStreamId: streamId, actorUserId: userId,
        }, this.eventPublisher);
      }

      await tx.studentAuditLog.create({
        data: {
          schoolId,
          studentId,
          action: promotion ? 'PROMOTE_STUDENT' : 'PLACE_IN_CLASS',
          previousStatus: student.studentStatus,
          newStatus: StudentStatus.ACTIVE,
          performedByUserId: userId,
        },
      });

      await this.eventPublisher.publish({
        event_name: 'student.lifecycle.class_assigned',
        event_key: `student.lifecycle.class_assigned:${studentId}`,
        aggregate_type: 'Student',
        aggregate_id: studentId,
        tenant_id: schoolId,
        payload: { tenant_id: schoolId, student_id: studentId, class_id: classId }
      }, tx);

      return updated;
    });
  }

  async promoteStudent(schoolId: string, studentId: string, newClassId: string, academicYearId: string, academicLevelId: string, userId: string, streamId?: string) {
    return this.placeInClass(schoolId, studentId, newClassId, academicYearId, academicLevelId, userId, streamId, true);
  }

  async suspendStudent(schoolId: string, studentId: string, userId: string, reason: string) {
    return this.prisma.executeWithTenant(schoolId, userId, async (tx: any) => {
      const student = await tx.student.findUnique({ where: { id: studentId } });
      if (!student || student.schoolId !== schoolId) {
        throw new NotFoundException('Student not found');
      }

      if (student.studentStatus !== StudentStatus.ACTIVE) {
        throw new BadRequestException('Only active students can be suspended');
      }

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

      await this.eventPublisher.publish({
        event_name: 'student.lifecycle.suspended',
        event_key: `student.lifecycle.suspended:${studentId}`,
        aggregate_type: 'Student',
        aggregate_id: studentId,
        tenant_id: schoolId,
        payload: { tenant_id: schoolId, student_id: studentId, status: 'SUSPENDED', reason }
      });

      return updated;
    });
  }

  async initiateExitClearance(schoolId: string, studentId: string, userId: string) {
    return this.prisma.executeWithTenant(schoolId, userId, async (tx: any) => {
      const existing = await tx.studentClearance.findFirst({
        where: { schoolId, studentId, status: 'PENDING' },
      });

      if (existing) {
        return existing;
      }

      return tx.studentClearance.create({
        data: {
          schoolId,
          studentId,
          status: 'PENDING',
        },
      });
    });
  }

  async exitStudent(schoolId: string, studentId: string, userId: string, exitReason: string, exitStatus: StudentStatus, clearanceId?: string) {
    if (!['TRANSFERRED_OUT', 'WITHDRAWN', 'GRADUATED'].includes(exitStatus)) {
      throw new BadRequestException('Invalid exit status');
    }

    return this.prisma.executeWithTenant(schoolId, userId, async (tx: any) => {
      const student = await tx.student.findUnique({ where: { id: studentId } });
      if (!student || student.schoolId !== schoolId) {
        throw new NotFoundException('Student not found');
      }

      if (clearanceId) {
        const clearance = await tx.studentClearance.findUnique({ where: { id: clearanceId } });
        if (!clearance || clearance.schoolId !== schoolId || clearance.studentId !== studentId || clearance.status !== 'CLEARED') {
          throw new BadRequestException('Student must be fully cleared before exiting');
        }
      }

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

      await this.eventPublisher.publish({
        event_name: 'student.lifecycle.exited',
        event_key: `student.lifecycle.exited:${studentId}`,
        aggregate_type: 'Student',
        aggregate_id: studentId,
        tenant_id: schoolId,
        payload: { tenant_id: schoolId, student_id: studentId, status: exitStatus, reason: exitReason }
      });

      return updated;
    });
  }

  async archiveStudent(schoolId: string, studentId: string, userId: string) {
    return this.prisma.executeWithTenant(schoolId, userId, async (tx: any) => {
      const student = await tx.student.findUnique({ where: { id: studentId } });
      if (!student || student.schoolId !== schoolId) {
        throw new NotFoundException('Student not found');
      }

      if (!['TRANSFERRED_OUT', 'WITHDRAWN', 'GRADUATED'].includes(student.studentStatus)) {
        throw new BadRequestException('Student must be exited before archiving');
      }

      const newStatus = student.studentStatus === StudentStatus.GRADUATED ? StudentStatus.ALUMNI : StudentStatus.ARCHIVED;

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

      await this.eventPublisher.publish({
        event_name: 'student.lifecycle.archived',
        event_key: `student.lifecycle.archived:${studentId}`,
        aggregate_type: 'Student',
        aggregate_id: studentId,
        tenant_id: schoolId,
        payload: { tenant_id: schoolId, student_id: studentId, status: newStatus }
      });

      return updated;
    });
  }
}
