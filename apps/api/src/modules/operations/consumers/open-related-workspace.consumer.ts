import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class OpenRelatedWorkspaceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'open-related-workspace.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'open-related-workspace' && event.payload.action_id !== 'open-related-workspace') {
      return;
    }

    // TODO: Implement domain logic for open-related-workspace
    console.log('[OpenRelatedWorkspaceConsumer] Executing action:', event.payload);
  }
}
