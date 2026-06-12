import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateLeaveRequestConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-leave-request.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-leave-request' && event.payload.action_id !== 'create-leave-request') {
      return;
    }

    // TODO: Implement domain logic for create-leave-request
    console.log('[CreateLeaveRequestConsumer] Executing action:', event.payload);
  }
}
