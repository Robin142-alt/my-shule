import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class GenerateAdmissionNoConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'generate-admission-no.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'generate-admission-no' && event.payload.action_id !== 'generate-admission-no') {
      return;
    }

    // TODO: Implement domain logic for generate-admission-no
    console.log('[GenerateAdmissionNoConsumer] Executing action:', event.payload);
  }
}
