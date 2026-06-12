import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateWaiverRequestConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-waiver-request.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-waiver-request' && event.payload.action_id !== 'create-waiver-request') {
      return;
    }

    // TODO: Implement domain logic for create-waiver-request
    console.log('[CreateWaiverRequestConsumer] Executing action:', event.payload);
  }
}
