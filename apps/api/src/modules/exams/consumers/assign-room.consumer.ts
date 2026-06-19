import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';
import { StructuredLoggerService } from '../../observability/structured-logger.service';

@Injectable()
export class AssignRoomConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-room.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLoggerService,
  ) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-room' && event.payload.action_id !== 'assign-room') {
      return;
    }

    const tenant_id = event.tenant_id || event.payload?.tenant_id;
    const aggregate_id = event.aggregate_id || event.payload?.aggregate_id || (event.payload?.payload as any)?.id;

    this.logger.logEvent(this.event_name, {
      consumer: 'AssignRoomConsumer',
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
          if (/active|activate/i.test('AssignRoomConsumer')) {
            status = 'ACTIVE';
          } else if (/close|complete/i.test('AssignRoomConsumer')) {
            status = 'CLOSED';
          } else if (/release|publish/i.test('AssignRoomConsumer')) {
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
        consumer: 'AssignRoomConsumer',
        tenant_id,
        aggregate_id,
        status: 'success',
      });
    } catch (error: any) {
      this.logger.error(`AssignRoomConsumer failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
