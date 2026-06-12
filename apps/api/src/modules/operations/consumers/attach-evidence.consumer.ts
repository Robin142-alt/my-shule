import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AttachEvidenceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'attach-evidence.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'attach-evidence' && event.payload.action_id !== 'attach-evidence') {
      return;
    }

    // TODO: Implement domain logic for attach-evidence
    console.log('[AttachEvidenceConsumer] Executing action:', event.payload);
  }
}
