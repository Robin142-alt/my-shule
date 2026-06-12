import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class VerifyConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'verify.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'verify' && event.payload.action_id !== 'verify') {
      return;
    }

    // TODO: Implement domain logic for verify
    console.log('[VerifyConsumer] Executing action:', event.payload);
  }
}
