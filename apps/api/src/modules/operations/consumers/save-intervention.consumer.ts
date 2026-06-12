import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveInterventionConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-intervention.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-intervention' && event.payload.action_id !== 'save-intervention') {
      return;
    }

    // TODO: Implement domain logic for save-intervention
    console.log('[SaveInterventionConsumer] Executing action:', event.payload);
  }
}
