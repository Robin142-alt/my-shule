import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ImportSubjectsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'import-subjects.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'import-subjects' && event.payload.action_id !== 'import-subjects') {
      return;
    }

    // TODO: Implement domain logic for import-subjects
    console.log('[ImportSubjectsConsumer] Executing action:', event.payload);
  }
}
