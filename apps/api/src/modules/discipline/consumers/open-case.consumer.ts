import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class OpenCaseConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'open-case.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'open-case' && event.payload.action_id !== 'open-case') {
      return;
    }

    // TODO: Implement domain logic for open-case
    console.log('[OpenCaseConsumer] Executing action:', event.payload);
  }
}
