import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateInterventionConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-intervention.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-intervention' && event.payload.action_id !== 'create-intervention') {
      return;
    }

    // TODO: Implement domain logic for create-intervention
    console.log('[CreateInterventionConsumer] Executing action:', event.payload);
  }
}
