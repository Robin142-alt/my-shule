import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PublishToParentPortalConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'publish-to-parent-portal.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'publish-to-parent-portal' && event.payload.action_id !== 'publish-to-parent-portal') {
      return;
    }

    // TODO: Implement domain logic for publish-to-parent-portal
    console.log('[PublishToParentPortalConsumer] Executing action:', event.payload);
  }
}
