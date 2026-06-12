import * as moduleConsumers from './consumers';
import { Module } from '@nestjs/common';

import { OperationalWorkflowCompletedConsumer } from './consumers/operational-workflow-completed.consumer';
import { OperationalWorkflowDispatchedConsumer } from './consumers/operational-workflow-dispatched.consumer';
import { OperationalWorkflowExecutionConsumer } from './consumers/operational-workflow-execution.consumer';
import { PaymentCompletedConsumer } from './consumers/payment-completed.consumer';
import { BoardingEventConsumer } from './consumers/boarding-event.consumer';
import { TransportEventConsumer } from './consumers/transport-event.consumer';
import { CounsellingEventConsumer } from './consumers/counselling-event.consumer';
import { ProcurementEventConsumer } from './consumers/procurement-event.consumer';
import { LabEventConsumer } from './consumers/lab-event.consumer';
import { AssetEventConsumer } from './consumers/asset-event.consumer';
import { AttendanceMarkedConsumer } from './consumers/attendance-marked.consumer';
import { DisciplineIncidentConsumer } from './consumers/discipline-incident.consumer';
import { WelfareCaseConsumer } from './consumers/welfare-case.consumer';
import { ApprovalChainService } from './approval-chain.service';
import { NotificationRouterController } from './notification-router.controller';
import { NotificationRouterService } from './notification-router.service';
import { AuditTrailController } from './audit-trail.controller';
import { AuditTrailService } from './audit-trail.service';
import { DashboardRealtimeController } from './dashboard-realtime.controller';
import { DashboardRealtimeService } from './dashboard-realtime.service';
import { OperationalWorkflowDispatcherController } from './operational-workflow-dispatcher.controller';
import { OperationalWorkflowDispatcherService } from './operational-workflow-dispatcher.service';
import { SchoolOperationalEventsController } from './school-operational-events.controller';
import { SchoolOperationalEventsService } from './school-operational-events.service';
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
import { SchoolOperationNotificationsRepository } from './repositories/school-operation-notifications.repository';
import { WorkflowRepository } from './repositories/workflow.repository';

@Module({
  controllers: [
    DashboardRealtimeController,
    OperationalWorkflowDispatcherController,
    SchoolOperationalEventsController,
    NotificationRouterController,
    AuditTrailController,
  ],
  providers: [
    ...Object.values(moduleConsumers),
    EventsSchemaService,
    EventPublisherService,
    DashboardRealtimeService,
    OperationalWorkflowDispatcherService,
    SchoolOperationalEventsService,
    StudentEventsService,
    OutboxDispatcherService,
    EventConsumerService,
    EventConsumerRegistryService,
    EventsConsumerWorker,
    OutboxEventsRepository,
    SchoolOperationNotificationsRepository,
    EventConsumerRunsRepository,
    AuditLogsRepository,
    OperationalWorkflowCompletedConsumer,
    OperationalWorkflowDispatchedConsumer,
    OperationalWorkflowExecutionConsumer,
    StudentCreatedConsumer,
    PaymentCompletedConsumer,
    BoardingEventConsumer,
    TransportEventConsumer,
    CounsellingEventConsumer,
    ProcurementEventConsumer,
    LabEventConsumer,
    AssetEventConsumer,
    AttendanceMarkedConsumer,
    DisciplineIncidentConsumer,
    WelfareCaseConsumer,
    WorkflowRepository,
    ApprovalChainService,
    NotificationRouterService,
    AuditTrailService,
  ],
  exports: [
    EventPublisherService,
    StudentEventsService,
    AuditLogsRepository,
    DashboardRealtimeService,
    OperationalWorkflowDispatcherService,
    SchoolOperationalEventsService,
    SchoolOperationNotificationsRepository,
    WorkflowRepository,
    ApprovalChainService,
    NotificationRouterService,
    AuditTrailService,
  ],
})
export class EventsModule {}
