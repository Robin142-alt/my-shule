import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MoveStageConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'move-stage.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'move-stage' && event.payload.action_id !== 'move-stage') {
      return;
    }

    // TODO: Implement domain logic for move-stage
    console.log('[MoveStageConsumer] Executing action:', event.payload);
  }
}
