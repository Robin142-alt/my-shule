import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CommentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'comment.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'comment' && event.payload.action_id !== 'comment') {
      return;
    }

    // TODO: Implement domain logic for comment
    console.log('[CommentConsumer] Executing action:', event.payload);
  }
}
