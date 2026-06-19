import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';
import { StructuredLoggerService } from '../../observability/structured-logger.service';

@Injectable()
export class ExportAttendanceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-attendance.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLoggerService,
  ) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-attendance' && event.payload.action_id !== 'export-attendance') {
      return;
    }

    const tenant_id = event.tenant_id || event.payload?.tenant_id;
    const aggregate_id = event.aggregate_id || event.payload?.aggregate_id || (event.payload?.payload as any)?.id;

    this.logger.logEvent(this.event_name, {
      consumer: 'ExportAttendanceConsumer',
      tenant_id,
      aggregate_id,
      status: 'started',
    });

    try {
      if (aggregate_id) {
        const alloc = await this.prisma.boardingAllocation.findFirst({
          where: { id: aggregate_id, schoolId: tenant_id }
        });
        if (alloc) {
          let status: any = undefined;
          if (/active|activate|approve|accept/i.test('ExportAttendanceConsumer')) {
            status = 'ACTIVE';
          } else if (/end|cancel|void/i.test('ExportAttendanceConsumer')) {
            status = 'ENDED';
          }
          if (status) {
            await this.prisma.boardingAllocation.update({
              where: { id: alloc.id },
              data: { status }
            });
          }
        }
      } else {
        await this.prisma.boardingAllocation.findFirst({
          where: { schoolId: tenant_id }
        });
      }

      this.logger.logEvent(this.event_name, {
        consumer: 'ExportAttendanceConsumer',
        tenant_id,
        aggregate_id,
        status: 'success',
      });
    } catch (error: any) {
      this.logger.error(`ExportAttendanceConsumer failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
