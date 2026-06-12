import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateWelfareCaseConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-welfare-case.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-welfare-case' && event.payload.action_id !== 'create-welfare-case') {
      return;
    }

    // TODO: Implement domain logic for create-welfare-case
    console.log('[CreateWelfareCaseConsumer] Executing action:', event.payload);
  }
}
