import { PrismaService } from '../../../database/prisma.service';
import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { StructuredLoggerService } from '../../observability/structured-logger.service';

@Injectable()
export class UpdateServiceDateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'update-service-date.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(private readonly prisma: PrismaService, private readonly logger: StructuredLoggerService) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'update-service-date' && event.payload.action_id !== 'update-service-date') {
      return;
    }

    this.logger.logEvent(this.event_name, {
      consumer: 'UpdateServiceDateConsumer',
      tenant_id: event.tenant_id || event.payload?.tenant_id,
      payload: event.payload,
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          schoolId: event.tenant_id || (event.payload as any)?.tenant_id || 'system',
          action: this.event_name,
          module: 'UpdateServiceDateConsumer',
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
