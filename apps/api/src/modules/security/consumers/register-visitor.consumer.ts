import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RegisterVisitorConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'register-visitor.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'register-visitor' && event.payload.action_id !== 'register-visitor') {
      return;
    }

    // TODO: Implement domain logic for register-visitor
    console.log('[RegisterVisitorConsumer] Executing action:', event.payload);
  }
}
