import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../events.types';
import { WorkflowRepository } from '../repositories/workflow.repository';

@Injectable()
export class CounsellingEventConsumer implements EventConsumerDescriptor<'counselling.referral.submitted'> {
  readonly name = 'counselling-event.workflow';
  readonly event_name = 'counselling.referral.submitted' as const;

  constructor(private readonly workflowRepository: WorkflowRepository) {}

  async handle(event: DomainEvent<'counselling.referral.submitted'>): Promise<void> {
    const payload = event.payload;
    
    await this.workflowRepository.createTask({
      tenant_id: event.tenant_id,
      task_key: `counselling-referral-${payload.referral_id}`,
      assigned_to_role: 'COUNSELLOR',
      created_by_user_id: payload.referred_by_user_id,
      title: 'New Counselling Referral',
      description: `Student ${payload.student_id} has been referred for counselling. Reason: ${payload.reason}`,
      module: 'counselling',
      record_id: payload.referral_id,
      priority: payload.priority === 'critical' || payload.priority === 'high' ? 'high' : 'normal',
    });

    await this.workflowRepository.createNotification({
      tenant_id: event.tenant_id,
      notification_key: `counselling-referral-notification-${payload.referral_id}`,
      recipient_role: 'COUNSELLOR',
      type: 'COUNSELLING_REFERRAL',
      title: `New Counselling Referral (${payload.priority})`,
      body: `A new counselling referral has been submitted for student ${payload.student_id}.`,
      source_module: 'counselling',
      source_record_id: payload.referral_id,
      priority: payload.priority,
    });
  }
}
