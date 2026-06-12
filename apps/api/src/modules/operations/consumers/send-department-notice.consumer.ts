import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendDepartmentNoticeConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-department-notice.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-department-notice' && event.payload.action_id !== 'send-department-notice') {
      return;
    }

    // TODO: Implement domain logic for send-department-notice
    console.log('[SendDepartmentNoticeConsumer] Executing action:', event.payload);
  }
}
