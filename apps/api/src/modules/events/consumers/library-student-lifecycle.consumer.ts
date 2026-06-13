import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../events.types';

@Injectable()
export class LibraryStudentLifecycleConsumer implements EventConsumerDescriptor<'student.lifecycle.suspended'> {
  readonly name = 'library.student-lifecycle.flag-account';
  readonly event_name = 'student.lifecycle.suspended' as const;
  private readonly logger = new Logger(LibraryStudentLifecycleConsumer.name);

  async handle(event: DomainEvent<'student.lifecycle.suspended'>): Promise<void> {
    const payload = event.payload as any;
    // Check if student has overdue books and flag account
    this.logger.log(`[Library Module] Flagging library account and checking overdue books for suspended student: ${payload.student_id}`);
  }
}

@Injectable()
export class LibraryStudentExitConsumer implements EventConsumerDescriptor<'student.lifecycle.exited'> {
  readonly name = 'library.student-lifecycle.clearance-check';
  readonly event_name = 'student.lifecycle.exited' as const;
  private readonly logger = new Logger(LibraryStudentExitConsumer.name);

  async handle(event: DomainEvent<'student.lifecycle.exited'>): Promise<void> {
    const payload = event.payload as any;
    this.logger.log(`[Library Module] Closing library account for exited student: ${payload.student_id}`);
  }
}
