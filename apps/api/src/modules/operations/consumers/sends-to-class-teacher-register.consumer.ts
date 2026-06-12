import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendsToClassTeacherRegisterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'sends-to-class-teacher-register.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'sends-to-class-teacher-register' && event.payload.action_id !== 'sends-to-class-teacher-register') {
      return;
    }

    // TODO: Implement domain logic for sends-to-class-teacher-register
    console.log('[SendsToClassTeacherRegisterConsumer] Executing action:', event.payload);
  }
}
