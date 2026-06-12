import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkUnderMaintenanceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-under-maintenance.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-under-maintenance' && event.payload.action_id !== 'mark-under-maintenance') {
      return;
    }

    // TODO: Implement domain logic for mark-under-maintenance
    console.log('[MarkUnderMaintenanceConsumer] Executing action:', event.payload);
  }
}
