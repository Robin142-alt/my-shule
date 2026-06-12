import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class LinkParentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'link-parent.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'link-parent' && event.payload.action_id !== 'link-parent') {
      return;
    }

    // TODO: Implement domain logic for link-parent
    console.log('[LinkParentConsumer] Executing action:', event.payload);
  }
}
