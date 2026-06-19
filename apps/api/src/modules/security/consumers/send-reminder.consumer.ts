import { PrismaService } from '../../../database/prisma.service';
import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { StructuredLoggerService } from '../../observability/structured-logger.service';

@Injectable()
export class SendReminderConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-reminder.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(private readonly prisma: PrismaService, private readonly logger: StructuredLoggerService) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-reminder' && event.payload.action_id !== 'send-reminder') {
      return;
    }

    this.logger.logEvent(this.event_name, {
      consumer: 'SendReminderConsumer',
      tenant_id: event.tenant_id || event.payload?.tenant_id,
      payload: event.payload,
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          schoolId: event.tenant_id || (event.payload as any)?.tenant_id || 'system',
          action: this.event_name,
          module: 'SendReminderConsumer',
          entityType: 'event',
          entityId: event.id || 'unknown',
          newValuesJson: event.payload as any,
        }
      });
    } catch (err) {
      this.logger.error(`Failed to persist audit log for ${this.event_name}`, err instanceof Error ? err.stack : String(err));
    }

  }
}
