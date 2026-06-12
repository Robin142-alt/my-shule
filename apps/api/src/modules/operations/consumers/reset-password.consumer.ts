import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ResetPasswordConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reset-password.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reset-password' && event.payload.action_id !== 'reset-password') {
      return;
    }

    // TODO: Implement domain logic for reset-password
    console.log('[ResetPasswordConsumer] Executing action:', event.payload);
  }
}
