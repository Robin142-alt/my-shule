import { PrismaService } from '../../../database/prisma.service';
import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { StructuredLoggerService } from '../../observability/structured-logger.service';

@Injectable()
export class MarkUnmatchedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-unmatched.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(private readonly prisma: PrismaService, private readonly logger: StructuredLoggerService) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-unmatched' && event.payload.action_id !== 'mark-unmatched') {
      return;
    }

    this.logger.logEvent(this.event_name, {
      consumer: 'MarkUnmatchedConsumer',
      tenant_id: event.tenant_id || event.payload?.tenant_id,
      payload: event.payload,
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          schoolId: event.tenant_id || (event.payload as any)?.tenant_id || 'system',
          action: this.event_name,
          module: 'MarkUnmatchedConsumer',
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
