import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewChecklistConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-checklist.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-checklist' && event.payload.action_id !== 'view-checklist') {
      return;
    }

    // TODO: Implement domain logic for view-checklist
    console.log('[ViewChecklistConsumer] Executing action:', event.payload);
  }
}
