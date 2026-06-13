import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../events.types';

@Injectable()
export class FinanceStudentLifecycleConsumer implements EventConsumerDescriptor<'student.lifecycle.suspended'> {
  readonly name = 'finance.student-lifecycle.pause-billing';
  readonly event_name = 'student.lifecycle.suspended' as const;
  private readonly logger = new Logger(FinanceStudentLifecycleConsumer.name);

  async handle(event: DomainEvent<'student.lifecycle.suspended'>): Promise<void> {
    const payload = event.payload as any;
    // In a full implementation, this would inject FinanceService or PrismaService 
    // to mark the StudentFeeAccount as paused to prevent future automated billing.
    this.logger.log(`[Finance Module] Pausing automated billing for suspended student: ${payload.student_id}`);
  }
}

@Injectable()
export class FinanceStudentExitConsumer implements EventConsumerDescriptor<'student.lifecycle.exited'> {
  readonly name = 'finance.student-lifecycle.close-account';
  readonly event_name = 'student.lifecycle.exited' as const;
  private readonly logger = new Logger(FinanceStudentExitConsumer.name);

  async handle(event: DomainEvent<'student.lifecycle.exited'>): Promise<void> {
    const payload = event.payload as any;
    // Close the StudentFeeAccount or finalize any outstanding invoices
    this.logger.log(`[Finance Module] Finalizing fee account for exited student: ${payload.student_id}`);
  }
}
