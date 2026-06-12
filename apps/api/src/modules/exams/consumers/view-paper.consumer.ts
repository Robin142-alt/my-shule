import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewPaperConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-paper.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-paper' && event.payload.action_id !== 'view-paper') {
      return;
    }

    // TODO: Implement domain logic for view-paper
    console.log('[ViewPaperConsumer] Executing action:', event.payload);
  }
}
