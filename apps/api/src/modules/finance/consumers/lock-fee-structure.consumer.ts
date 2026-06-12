import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class LockFeeStructureConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'lock-fee-structure.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'lock-fee-structure' && event.payload.action_id !== 'lock-fee-structure') {
      return;
    }

    // TODO: Implement domain logic for lock-fee-structure
    console.log('[LockFeeStructureConsumer] Executing action:', event.payload);
  }
}
