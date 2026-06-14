import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class SubmitAttendanceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  private readonly logger = new Logger(SubmitAttendanceConsumer.name);
  readonly name = 'submit-attendance.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    if (event.payload.workflow_id !== 'submit-attendance' && event.payload.action_id !== 'submit-attendance') {
      return;
    }

    const tenant_id = event.payload.tenant_id; const data = event.payload.payload as any;
    if (!data?.classId || !data?.date || !data?.records) {
      this.logger.warn(`Missing attendance data for tenant ${tenant_id}`);
      return;
    }

    this.logger.log(`Submitting attendance for class ${data.classId} on ${data.date} for tenant ${tenant_id}`);

    try {
      await this.prisma.$transaction(async (tx: any) => {
        const session = await tx.attendanceSession.create({
          data: {
            schoolId: tenant_id,
            academicYearId: data.academicYearId || 'temp-year',
            termId: data.termId || 'temp-term',
            classId: data.classId,
            streamId: data.streamId || 'temp-stream',
            date: new Date(data.date),
            sessionType: data.sessionType || 'LESSON',
            takenByUserId: data.takenByUserId || 'system',
            status: 'SUBMITTED'
          }
        });

        if (data.records && Array.isArray(data.records)) {
          const recordsToInsert = data.records.map((r: any) => ({
            schoolId: tenant_id,
            attendanceSessionId: session.id,
            studentId: r.studentId,
            status: r.status || 'PRESENT',
            remarks: r.remarks || null,
          }));
          
          await tx.attendanceRecord.createMany({ data: recordsToInsert });
        }
      });
      
      this.logger.log(`Successfully submitted attendance session`);
    } catch (error: any) {
      this.logger.error(`Failed to submit attendance: ${error.message}`, error.stack);
      throw error;
    }
  }
}
