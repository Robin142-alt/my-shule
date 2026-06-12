import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateNoticeConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-notice.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-notice' && event.payload.action_id !== 'create-notice') {
      return;
    }

    // TODO: Implement domain logic for create-notice
    console.log('[CreateNoticeConsumer] Executing action:', event.payload);
  }
}
