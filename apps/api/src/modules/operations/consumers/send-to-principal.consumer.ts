import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendToPrincipalConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-to-principal.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-to-principal' && event.payload.action_id !== 'send-to-principal') {
      return;
    }

    // TODO: Implement domain logic for send-to-principal
    console.log('[SendToPrincipalConsumer] Executing action:', event.payload);
  }
}
