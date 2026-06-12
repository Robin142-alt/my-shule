import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddPaperConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-paper.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-paper' && event.payload.action_id !== 'add-paper') {
      return;
    }

    // TODO: Implement domain logic for add-paper
    console.log('[AddPaperConsumer] Executing action:', event.payload);
  }
}
