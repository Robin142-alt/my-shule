import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveIncidentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-incident.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-incident' && event.payload.action_id !== 'save-incident') {
      return;
    }

    // TODO: Implement domain logic for save-incident
    console.log('[SaveIncidentConsumer] Executing action:', event.payload);
  }
}
