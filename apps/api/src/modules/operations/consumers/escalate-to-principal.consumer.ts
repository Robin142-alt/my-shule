import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EscalateToPrincipalConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'escalate-to-principal.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'escalate-to-principal' && event.payload.action_id !== 'escalate-to-principal') {
      return;
    }

    // TODO: Implement domain logic for escalate-to-principal
    console.log('[EscalateToPrincipalConsumer] Executing action:', event.payload);
  }
}
