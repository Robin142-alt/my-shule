import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class LinksParentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'links-parent.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'links-parent' && event.payload.action_id !== 'links-parent') {
      return;
    }

    // TODO: Implement domain logic for links-parent
    console.log('[LinksParentConsumer] Executing action:', event.payload);
  }
}
