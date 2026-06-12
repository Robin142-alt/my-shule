import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddVisitConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-visit.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-visit' && event.payload.action_id !== 'add-visit') {
      return;
    }

    // TODO: Implement domain logic for add-visit
    console.log('[AddVisitConsumer] Executing action:', event.payload);
  }
}
