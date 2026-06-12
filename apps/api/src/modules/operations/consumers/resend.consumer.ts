import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ResendConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'resend.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'resend' && event.payload.action_id !== 'resend') {
      return;
    }

    // TODO: Implement domain logic for resend
    console.log('[ResendConsumer] Executing action:', event.payload);
  }
}
