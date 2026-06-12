import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SubmitCommentsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'submit-comments.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'submit-comments' && event.payload.action_id !== 'submit-comments') {
      return;
    }

    // TODO: Implement domain logic for submit-comments
    console.log('[SubmitCommentsConsumer] Executing action:', event.payload);
  }
}
