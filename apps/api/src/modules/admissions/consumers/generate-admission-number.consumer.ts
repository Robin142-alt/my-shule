import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class GenerateAdmissionNumberConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'generate-admission-number.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'generate-admission-number' && event.payload.action_id !== 'generate-admission-number') {
      return;
    }

    // TODO: Implement domain logic for generate-admission-number
    console.log('[GenerateAdmissionNumberConsumer] Executing action:', event.payload);
  }
}
