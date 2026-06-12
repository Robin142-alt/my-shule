import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EscalateWelfareConcernConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'escalate-welfare-concern.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'escalate-welfare-concern' && event.payload.action_id !== 'escalate-welfare-concern') {
      return;
    }

    // TODO: Implement domain logic for escalate-welfare-concern
    console.log('[EscalateWelfareConcernConsumer] Executing action:', event.payload);
  }
}
