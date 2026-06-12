import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewAcademicsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-academics.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-academics' && event.payload.action_id !== 'view-academics') {
      return;
    }

    // TODO: Implement domain logic for view-academics
    console.log('[ViewAcademicsConsumer] Executing action:', event.payload);
  }
}
