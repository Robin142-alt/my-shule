import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateDisciplineCaseConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-discipline-case.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-discipline-case' && event.payload.action_id !== 'create-discipline-case') {
      return;
    }

    // TODO: Implement domain logic for create-discipline-case
    console.log('[CreateDisciplineCaseConsumer] Executing action:', event.payload);
  }
}
