import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';
import { StructuredLoggerService } from '../../observability/structured-logger.service';

@Injectable()
export class RejectWaiverConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reject-waiver.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLoggerService,
  ) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reject-waiver' && event.payload.action_id !== 'reject-waiver') {
      return;
    }

    const tenant_id = event.tenant_id || event.payload?.tenant_id;
    const aggregate_id = event.aggregate_id || event.payload?.aggregate_id || (event.payload?.payload as any)?.id;

    this.logger.logEvent(this.event_name, {
      consumer: 'RejectWaiverConsumer',
      tenant_id,
      aggregate_id,
      status: 'started',
    });

    try {
      if (aggregate_id) {
        const inv = await this.prisma.invoice.findFirst({
          where: { id: aggregate_id, schoolId: tenant_id }
        });
        if (inv) {
          let status: any = undefined;
          if (/approve|accept|issue/i.test('RejectWaiverConsumer')) {
            status = 'ISSUED';
          } else if (/cancel|void/i.test('RejectWaiverConsumer')) {
            status = 'CANCELLED';
          }
          if (status) {
            await this.prisma.invoice.update({
              where: { id: inv.id },
              data: { status }
            });
          }
        } else {
          const waiver = await this.prisma.feeWaiver.findFirst({
            where: { id: aggregate_id, schoolId: tenant_id }
          });
          if (waiver) {
            let status: any = undefined;
            if (/approve|accept/i.test('RejectWaiverConsumer')) {
              status = 'APPROVED';
            } else if (/reject|decline/i.test('RejectWaiverConsumer')) {
              status = 'REJECTED';
            }
            if (status) {
              await this.prisma.feeWaiver.update({
                where: { id: waiver.id },
                data: { status }
              });
            }
          }
        }
      } else {
        await this.prisma.invoice.findFirst({
          where: { schoolId: tenant_id }
        });
      }

      this.logger.logEvent(this.event_name, {
        consumer: 'RejectWaiverConsumer',
        tenant_id,
        aggregate_id,
        status: 'success',
      });
    } catch (error: any) {
      this.logger.error(`RejectWaiverConsumer failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
