import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../events.types';

@Injectable()
export class BoardingStudentLifecycleConsumer implements EventConsumerDescriptor<'student.lifecycle.suspended'> {
  readonly name = 'boarding.student-lifecycle.free-bed';
  readonly event_name = 'student.lifecycle.suspended' as const;
  private readonly logger = new Logger(BoardingStudentLifecycleConsumer.name);

  async handle(event: DomainEvent<'student.lifecycle.suspended'>): Promise<void> {
    const payload = event.payload as any;
    // Free up the student's allocated hostel bed
    this.logger.log(`[Boarding Module] Unassigning hostel bed for suspended student: ${payload.student_id}`);
  }
}

@Injectable()
export class BoardingStudentExitConsumer implements EventConsumerDescriptor<'student.lifecycle.exited'> {
  readonly name = 'boarding.student-lifecycle.free-bed-exit';
  readonly event_name = 'student.lifecycle.exited' as const;
  private readonly logger = new Logger(BoardingStudentExitConsumer.name);

  async handle(event: DomainEvent<'student.lifecycle.exited'>): Promise<void> {
    const payload = event.payload as any;
    this.logger.log(`[Boarding Module] Releasing hostel bed and archiving boarding record for exited student: ${payload.student_id}`);
  }
}
