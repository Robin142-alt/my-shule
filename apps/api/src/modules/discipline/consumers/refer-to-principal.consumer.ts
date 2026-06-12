import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReferToPrincipalConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'refer-to-principal.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'refer-to-principal' && event.payload.action_id !== 'refer-to-principal') {
      return;
    }

    // TODO: Implement domain logic for refer-to-principal
    console.log('[ReferToPrincipalConsumer] Executing action:', event.payload);
  }
}
