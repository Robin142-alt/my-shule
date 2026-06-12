import { Injectable } from '@nestjs/common';

import { OperationalWorkflowCompletedConsumer } from './consumers/operational-workflow-completed.consumer';
import { OperationalWorkflowDispatchedConsumer } from './consumers/operational-workflow-dispatched.consumer';
import { OperationalWorkflowExecutionConsumer } from './consumers/operational-workflow-execution.consumer';
import { PaymentCompletedConsumer } from './consumers/payment-completed.consumer';
import { StudentCreatedConsumer } from './consumers/student-created.consumer';
import { AttendanceMarkedConsumer } from './consumers/attendance-marked.consumer';
import { DisciplineIncidentConsumer } from './consumers/discipline-incident.consumer';
import { WelfareCaseConsumer } from './consumers/welfare-case.consumer';
import { EventConsumerDescriptor, SupportedDomainEventName } from './events.types';

@Injectable()
export class EventConsumerRegistryService {
  private readonly consumersByEventName = new Map<
    SupportedDomainEventName,
    EventConsumerDescriptor[]
  >();

  constructor(
    studentCreatedConsumer: StudentCreatedConsumer,
    paymentCompletedConsumer: PaymentCompletedConsumer,
    operationalWorkflowDispatchedConsumer: OperationalWorkflowDispatchedConsumer,
    operationalWorkflowExecutionConsumer: OperationalWorkflowExecutionConsumer,
    operationalWorkflowCompletedConsumer: OperationalWorkflowCompletedConsumer,
    attendanceMarkedConsumer: AttendanceMarkedConsumer,
    disciplineIncidentConsumer: DisciplineIncidentConsumer,
    welfareCaseConsumer: WelfareCaseConsumer,
  ) {
    this.register(studentCreatedConsumer);
    this.register(paymentCompletedConsumer);
    this.register(operationalWorkflowDispatchedConsumer);
    this.register(operationalWorkflowExecutionConsumer);
    this.register(operationalWorkflowCompletedConsumer);
    this.register(attendanceMarkedConsumer);
    this.register(disciplineIncidentConsumer);
    this.register(welfareCaseConsumer);
  }

  getConsumersForEvent(eventName: SupportedDomainEventName): EventConsumerDescriptor[] {
    return this.consumersByEventName.get(eventName) ?? [];
  }

  public register(consumer: EventConsumerDescriptor): void {
    const existingConsumers = this.consumersByEventName.get(consumer.event_name) ?? [];
    this.consumersByEventName.set(consumer.event_name, [...existingConsumers, consumer]);
  }
}
