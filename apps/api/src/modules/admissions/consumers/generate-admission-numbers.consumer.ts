import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class GenerateAdmissionNumbersConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'generate-admission-numbers.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'generate-admission-numbers' && event.payload.action_id !== 'generate-admission-numbers') {
      return;
    }

    // TODO: Implement domain logic for generate-admission-numbers
    console.log('[GenerateAdmissionNumbersConsumer] Executing action:', event.payload);
  }
}
