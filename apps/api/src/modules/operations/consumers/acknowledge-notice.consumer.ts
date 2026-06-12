import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AcknowledgeNoticeConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'acknowledge-notice.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'acknowledge-notice' && event.payload.action_id !== 'acknowledge-notice') {
      return;
    }

    // TODO: Implement domain logic for acknowledge-notice
    console.log('[AcknowledgeNoticeConsumer] Executing action:', event.payload);
  }
}
