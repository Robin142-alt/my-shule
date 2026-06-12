import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class OpenSeriousCasesConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'open-serious-cases.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'open-serious-cases' && event.payload.action_id !== 'open-serious-cases') {
      return;
    }

    // TODO: Implement domain logic for open-serious-cases
    console.log('[OpenSeriousCasesConsumer] Executing action:', event.payload);
  }
}
