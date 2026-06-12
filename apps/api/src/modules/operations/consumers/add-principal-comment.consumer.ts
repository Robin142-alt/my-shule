import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddPrincipalCommentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-principal-comment.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-principal-comment' && event.payload.action_id !== 'add-principal-comment') {
      return;
    }

    // TODO: Implement domain logic for add-principal-comment
    console.log('[AddPrincipalCommentConsumer] Executing action:', event.payload);
  }
}
