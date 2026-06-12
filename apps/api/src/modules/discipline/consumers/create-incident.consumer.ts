import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateIncidentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-incident.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-incident' && event.payload.action_id !== 'create-incident') {
      return;
    }

    // TODO: Implement domain logic for create-incident
    console.log('[CreateIncidentConsumer] Executing action:', event.payload);
  }
}
