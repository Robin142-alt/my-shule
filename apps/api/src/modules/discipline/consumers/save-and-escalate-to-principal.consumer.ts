import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveAndEscalateToPrincipalConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-and-escalate-to-principal.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-and-escalate-to-principal' && event.payload.action_id !== 'save-and-escalate-to-principal') {
      return;
    }

    // TODO: Implement domain logic for save-and-escalate-to-principal
    console.log('[SaveAndEscalateToPrincipalConsumer] Executing action:', event.payload);
  }
}
