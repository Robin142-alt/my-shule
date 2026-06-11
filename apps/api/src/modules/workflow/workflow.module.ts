import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ObservabilityModule } from '../observability/observability.module';

// Services
import { WorkflowService } from './services/workflow.service';
import { NotificationService } from './services/notification.service';
import { ApprovalService } from './services/approval.service';
import { AuditService } from './services/audit.service';
import { PermissionService } from './services/permission.service';
import { DashboardFeedService } from './services/dashboard-feed.service';

// Controllers
import { WorkflowController } from './controllers/workflow.controller';
import { NotificationController } from './controllers/notification.controller';
import { TaskController } from './controllers/task.controller';
import { ApprovalController } from './controllers/approval.controller';
import { DashboardController } from './controllers/dashboard.controller';

@Module({
  imports: [DatabaseModule, ObservabilityModule],
  controllers: [
    WorkflowController,
    NotificationController,
    TaskController,
    ApprovalController,
    DashboardController
  ],
  providers: [
    WorkflowService,
    NotificationService,
    ApprovalService,
    AuditService,
    PermissionService,
    DashboardFeedService
  ],
  exports: [
    WorkflowService,
    NotificationService,
    ApprovalService,
    AuditService,
    PermissionService,
    DashboardFeedService
  ]
})
export class WorkflowModule {}
