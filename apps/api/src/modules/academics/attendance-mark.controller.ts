import { Body, Controller, Post, InternalServerErrorException } from '@nestjs/common';
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
      return { success: false };
    }

    const { studentId, attendanceSessionId, sessionId, status, remarks } = body;
    const resolvedSessionId = attendanceSessionId || sessionId;

    try {
      const record = await this.prisma.attendanceRecord.upsert({
        where: {
          schoolId_attendanceSessionId_studentId: {
            schoolId: tenantId,
            attendanceSessionId: resolvedSessionId,
            studentId,
          }
        },
        update: {
          status: status || 'PRESENT',
          remarks: remarks || '',
          updatedAt: new Date(),
        },
        create: {
          schoolId: tenantId,
          attendanceSessionId: resolvedSessionId,
          studentId,
          status: status || 'PRESENT',
          remarks: remarks || '',
        }
      });
      return { success: true, recordId: record.id };
    } catch (error: any) {
      console.error('markAttendance error:', error);
      throw new InternalServerErrorException(error.message || 'Database error occurred');
    }
  }
}

