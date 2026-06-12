import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddCommentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-comment.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-comment' && event.payload.action_id !== 'add-comment') {
      return;
    }

    // TODO: Implement domain logic for add-comment
    console.log('[AddCommentConsumer] Executing action:', event.payload);
  }
}
