import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';
import { StructuredLoggerService } from '../../observability/structured-logger.service';

@Injectable()
export class SubmitMarksConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'submit-marks.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLoggerService,
  ) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'submit-marks' && event.payload.action_id !== 'submit-marks') {
      return;
    }

    const tenant_id = event.tenant_id || event.payload?.tenant_id;
    const aggregate_id = event.aggregate_id || event.payload?.aggregate_id || (event.payload?.payload as any)?.id;

    this.logger.logEvent(this.event_name, {
      consumer: 'SubmitMarksConsumer',
      tenant_id,
      aggregate_id,
      status: 'started',
    });

    try {
      if (aggregate_id) {
        const cycle = await this.prisma.examCycle.findFirst({
          where: { id: aggregate_id, schoolId: tenant_id }
        });
        if (cycle) {
          let status: any = undefined;
          if (/active|activate/i.test('SubmitMarksConsumer')) {
            status = 'ACTIVE';
          } else if (/close|complete/i.test('SubmitMarksConsumer')) {
            status = 'CLOSED';
          } else if (/release|publish/i.test('SubmitMarksConsumer')) {
            status = 'RELEASED';
          }
          if (status) {
            await this.prisma.examCycle.update({
              where: { id: cycle.id },
              data: { status }
            });
          }
        }
      } else {
        await this.prisma.examCycle.findFirst({
          where: { schoolId: tenant_id }
        });
      }

      this.logger.logEvent(this.event_name, {
        consumer: 'SubmitMarksConsumer',
        tenant_id,
        aggregate_id,
        status: 'success',
      });
    } catch (error: any) {
      this.logger.error(`SubmitMarksConsumer failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
