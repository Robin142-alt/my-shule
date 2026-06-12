import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateSchoolConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-school.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-school' && event.payload.action_id !== 'create-school') {
      return;
    }

    // TODO: Implement domain logic for create-school
    console.log('[CreateSchoolConsumer] Executing action:', event.payload);
  }
}
