import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AcknowledgeConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'acknowledge.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'acknowledge' && event.payload.action_id !== 'acknowledge') {
      return;
    }

    // TODO: Implement domain logic for acknowledge
    console.log('[AcknowledgeConsumer] Executing action:', event.payload);
  }
}
