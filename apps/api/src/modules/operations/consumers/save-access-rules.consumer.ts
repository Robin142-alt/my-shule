import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveAccessRulesConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-access-rules.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-access-rules' && event.payload.action_id !== 'save-access-rules') {
      return;
    }

    // TODO: Implement domain logic for save-access-rules
    console.log('[SaveAccessRulesConsumer] Executing action:', event.payload);
  }
}
