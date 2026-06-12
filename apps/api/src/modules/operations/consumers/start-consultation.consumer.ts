import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class StartConsultationConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'start-consultation.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'start-consultation' && event.payload.action_id !== 'start-consultation') {
      return;
    }

    // TODO: Implement domain logic for start-consultation
    console.log('[StartConsultationConsumer] Executing action:', event.payload);
  }
}
