import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class LinkExistingGuardianConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'link-existing-guardian.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'link-existing-guardian' && event.payload.action_id !== 'link-existing-guardian') {
      return;
    }

    // TODO: Implement domain logic for link-existing-guardian
    console.log('[LinkExistingGuardianConsumer] Executing action:', event.payload);
  }
}
