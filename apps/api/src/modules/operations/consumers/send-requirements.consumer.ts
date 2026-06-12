import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendRequirementsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-requirements.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-requirements' && event.payload.action_id !== 'send-requirements') {
      return;
    }

    // TODO: Implement domain logic for send-requirements
    console.log('[SendRequirementsConsumer] Executing action:', event.payload);
  }
}
