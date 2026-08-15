import { BadRequestException, Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';

@Controller('attendance')
@RequiresModule('academics')
export class AttendanceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Post('mark')
  @Permissions('academics:write')
  async markAttendance(@Body() body: any) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID required');
    }
    if (!store.user_id) throw new UnauthorizedException('User ID required');

    const { studentId, attendanceSessionId, sessionId, status, remarks } = body;
    const resolvedStudentId = String(studentId ?? '').trim();
    const resolvedSessionId = String(attendanceSessionId || sessionId || '').trim();
    const resolvedStatus = String(status || 'PRESENT').trim().toUpperCase();
    const allowedStatuses = new Set(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'SICK']);

    if (!resolvedStudentId || !resolvedSessionId) {
      throw new BadRequestException('studentId and attendanceSessionId are required');
    }
    if (!allowedStatuses.has(resolvedStatus)) {
      throw new BadRequestException('Attendance status is invalid');
    }

    return this.prisma.executeWithTenant(tenantId, store.user_id, async (tx) => {
      const [student, session] = await Promise.all([
        tx.student.findFirst({
          where: {
            id: resolvedStudentId,
            schoolId: tenantId,
            studentStatus: { in: ['ACCEPTED', 'ENROLLED', 'ACTIVE'] },
            deletedAt: null,
          },
          select: { id: true, currentClassId: true, currentStreamId: true },
        }),
        tx.attendanceSession.findFirst({
          where: {
            id: resolvedSessionId,
            schoolId: tenantId,
            deletedAt: null,
          },
          select: { id: true, classId: true, streamId: true, status: true },
        }),
      ]);

      if (!student || !session || session.status !== 'DRAFT') {
        throw new BadRequestException('Student or open attendance session was not found in this school');
      }

      const [activeClass, activeStream, activeEnrollment] = await Promise.all([
        tx.class.findFirst({
          where: {
            id: session.classId,
            schoolId: tenantId,
            status: 'ACTIVE',
            deletedAt: null,
          },
          select: { id: true },
        }),
        tx.stream.findFirst({
          where: {
            id: session.streamId,
            schoolId: tenantId,
            classId: session.classId,
            deletedAt: null,
          },
          select: { id: true },
        }),
        tx.studentEnrollment.findFirst({
          where: {
            schoolId: tenantId,
            studentId: resolvedStudentId,
            classId: session.classId,
            streamId: session.streamId,
            enrollmentStatus: 'ACTIVE',
            deletedAt: null,
          },
          select: { id: true },
        }),
      ]);
      const currentPlacementMatches = student.currentClassId === session.classId
        && student.currentStreamId === session.streamId;

      if (!activeClass || !activeStream || (!currentPlacementMatches && !activeEnrollment)) {
        throw new BadRequestException('Student is not actively assigned to this session class in this school');
      }

      const record = await tx.attendanceRecord.upsert({
        where: {
          schoolId_attendanceSessionId_studentId: {
            schoolId: tenantId,
            attendanceSessionId: resolvedSessionId,
            studentId: resolvedStudentId,
          }
        },
        update: {
          status: resolvedStatus as any,
          remarks: remarks || '',
          updatedAt: new Date(),
        },
        create: {
          schoolId: tenantId,
          attendanceSessionId: resolvedSessionId,
          studentId: resolvedStudentId,
          status: resolvedStatus as any,
          remarks: remarks || '',
        }
      });
      return { success: true, recordId: record.id };
    });
  }
}
