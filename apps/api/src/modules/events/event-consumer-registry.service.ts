import { Injectable } from '@nestjs/common';

import { OperationalWorkflowCompletedConsumer } from './consumers/operational-workflow-completed.consumer';
import { OperationalWorkflowDispatchedConsumer } from './consumers/operational-workflow-dispatched.consumer';
import { OperationalWorkflowExecutionConsumer } from './consumers/operational-workflow-execution.consumer';
import { PaymentCompletedConsumer } from './consumers/payment-completed.consumer';
import { StudentCreatedConsumer } from './consumers/student-created.consumer';
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
  ) {
    this.register(studentCreatedConsumer);
    this.register(paymentCompletedConsumer);
    this.register(operationalWorkflowDispatchedConsumer);
    this.register(operationalWorkflowExecutionConsumer);
    this.register(operationalWorkflowCompletedConsumer);
  }

  getConsumersForEvent(eventName: SupportedDomainEventName): EventConsumerDescriptor[] {
    return this.consumersByEventName.get(eventName) ?? [];
  }

  private register(consumer: EventConsumerDescriptor): void {
    const existingConsumers = this.consumersByEventName.get(consumer.event_name) ?? [];
    this.consumersByEventName.set(consumer.event_name, [...existingConsumers, consumer]);
  }
}
