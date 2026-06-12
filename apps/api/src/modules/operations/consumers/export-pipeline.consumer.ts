import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportPipelineConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-pipeline.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-pipeline' && event.payload.action_id !== 'export-pipeline') {
      return;
    }

    // TODO: Implement domain logic for export-pipeline
    console.log('[ExportPipelineConsumer] Executing action:', event.payload);
  }
}
