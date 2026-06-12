import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateAcademicInterventionConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-academic-intervention.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-academic-intervention' && event.payload.action_id !== 'create-academic-intervention') {
      return;
    }

    // TODO: Implement domain logic for create-academic-intervention
    console.log('[CreateAcademicInterventionConsumer] Executing action:', event.payload);
  }
}
