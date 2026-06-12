import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewDisciplineConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-discipline.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-discipline' && event.payload.action_id !== 'view-discipline') {
      return;
    }

    // TODO: Implement domain logic for view-discipline
    console.log('[ViewDisciplineConsumer] Executing action:', event.payload);
  }
}
