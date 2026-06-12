import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class TestEmailConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'test-email.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'test-email' && event.payload.action_id !== 'test-email') {
      return;
    }

    // TODO: Implement domain logic for test-email
    console.log('[TestEmailConsumer] Executing action:', event.payload);
  }
}
