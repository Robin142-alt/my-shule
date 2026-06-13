import { Injectable } from '@nestjs/common';
import { EventConsumerDescriptor, DomainEvent } from '../events.types';
import { AuditLogsRepository } from '../repositories/audit-logs.repository';

@Injectable()
export class StudentEnrolledAuditConsumer implements EventConsumerDescriptor<'student.lifecycle.enrolled'> {
  readonly name = 'student-enrolled.audit';
  readonly event_name = 'student.lifecycle.enrolled' as const;

  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  async handle(event: DomainEvent<'student.lifecycle.enrolled'>): Promise<void> {
    await this.auditLogsRepository.createAuditLog({
      tenant_id: event.tenant_id,
      actor_user_id: typeof event.headers.user_id === 'string' ? event.headers.user_id : null,
      request_id: typeof event.headers.request_id === 'string' ? event.headers.request_id : null,
      action: 'student.lifecycle.enrolled',
      resource_type: 'student',
      resource_id: event.aggregate_id,
      metadata: { consumer: this.name, event_id: event.id, event_key: event.event_key, payload: event.payload as any },
    });
  }
}

@Injectable()
export class StudentSuspendedAuditConsumer implements EventConsumerDescriptor<'student.lifecycle.suspended'> {
  readonly name = 'student-suspended.audit';
  readonly event_name = 'student.lifecycle.suspended' as const;

  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  async handle(event: DomainEvent<'student.lifecycle.suspended'>): Promise<void> {
    await this.auditLogsRepository.createAuditLog({
      tenant_id: event.tenant_id,
      actor_user_id: typeof event.headers.user_id === 'string' ? event.headers.user_id : null,
      request_id: typeof event.headers.request_id === 'string' ? event.headers.request_id : null,
      action: 'student.lifecycle.suspended',
      resource_type: 'student',
      resource_id: event.aggregate_id,
      metadata: { consumer: this.name, event_id: event.id, event_key: event.event_key, payload: event.payload as any },
    });
  }
}

@Injectable()
export class StudentExitedAuditConsumer implements EventConsumerDescriptor<'student.lifecycle.exited'> {
  readonly name = 'student-exited.audit';
  readonly event_name = 'student.lifecycle.exited' as const;

  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  async handle(event: DomainEvent<'student.lifecycle.exited'>): Promise<void> {
    await this.auditLogsRepository.createAuditLog({
      tenant_id: event.tenant_id,
      actor_user_id: typeof event.headers.user_id === 'string' ? event.headers.user_id : null,
      request_id: typeof event.headers.request_id === 'string' ? event.headers.request_id : null,
      action: 'student.lifecycle.exited',
      resource_type: 'student',
      resource_id: event.aggregate_id,
      metadata: { consumer: this.name, event_id: event.id, event_key: event.event_key, payload: event.payload as any },
    });
  }
}
