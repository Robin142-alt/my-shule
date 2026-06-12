import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveCurriculumSetupConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-curriculum-setup.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-curriculum-setup' && event.payload.action_id !== 'save-curriculum-setup') {
      return;
    }

    // TODO: Implement domain logic for save-curriculum-setup
    console.log('[SaveCurriculumSetupConsumer] Executing action:', event.payload);
  }
}
