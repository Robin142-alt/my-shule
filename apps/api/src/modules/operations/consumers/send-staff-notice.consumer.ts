import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendStaffNoticeConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-staff-notice.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-staff-notice' && event.payload.action_id !== 'send-staff-notice') {
      return;
    }

    // TODO: Implement domain logic for send-staff-notice
    console.log('[SendStaffNoticeConsumer] Executing action:', event.payload);
  }
}
