import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SubmitToPrincipalConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'submit-to-principal.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'submit-to-principal' && event.payload.action_id !== 'submit-to-principal') {
      return;
    }

    // TODO: Implement domain logic for submit-to-principal
    console.log('[SubmitToPrincipalConsumer] Executing action:', event.payload);
  }
}
