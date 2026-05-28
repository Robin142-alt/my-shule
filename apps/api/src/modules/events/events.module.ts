import { Module } from '@nestjs/common';

import { OperationalWorkflowCompletedConsumer } from './consumers/operational-workflow-completed.consumer';
import { OperationalWorkflowDispatchedConsumer } from './consumers/operational-workflow-dispatched.consumer';
import { OperationalWorkflowExecutionConsumer } from './consumers/operational-workflow-execution.consumer';
import { PaymentCompletedConsumer } from './consumers/payment-completed.consumer';
import { DashboardRealtimeController } from './dashboard-realtime.controller';
import { DashboardRealtimeService } from './dashboard-realtime.service';
import { OperationalWorkflowDispatcherController } from './operational-workflow-dispatcher.controller';
import { OperationalWorkflowDispatcherService } from './operational-workflow-dispatcher.service';
import { StudentCreatedConsumer } from './consumers/student-created.consumer';
import { EventConsumerRegistryService } from './event-consumer-registry.service';
import { EventConsumerService } from './event-consumer.service';
import { EventPublisherService } from './event-publisher.service';
import { EventsSchemaService } from './events-schema.service';
import { OutboxDispatcherService } from './outbox-dispatcher.service';
import { StudentEventsService } from './student-events.service';
import { EventsConsumerWorker } from './queue/events-consumer.worker';
import { AuditLogsRepository } from './repositories/audit-logs.repository';
import { EventConsumerRunsRepository } from './repositories/event-consumer-runs.repository';
import { OutboxEventsRepository } from './repositories/outbox-events.repository';

@Module({
  controllers: [DashboardRealtimeController, OperationalWorkflowDispatcherController],
  providers: [
    EventsSchemaService,
    EventPublisherService,
    DashboardRealtimeService,
    OperationalWorkflowDispatcherService,
    StudentEventsService,
    OutboxDispatcherService,
    EventConsumerService,
    EventConsumerRegistryService,
    EventsConsumerWorker,
    OutboxEventsRepository,
    EventConsumerRunsRepository,
    AuditLogsRepository,
    OperationalWorkflowCompletedConsumer,
    OperationalWorkflowDispatchedConsumer,
    OperationalWorkflowExecutionConsumer,
    StudentCreatedConsumer,
    PaymentCompletedConsumer,
  ],
  exports: [
    EventPublisherService,
    StudentEventsService,
    AuditLogsRepository,
    DashboardRealtimeService,
    OperationalWorkflowDispatcherService,
  ],
})
export class EventsModule {}
