import { AgpModule } from './common/platform-governance/agp.module';
import { WidgetRegistryModule } from './common/widget-registry/widget-registry.module';
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { ResilienceModule } from './infrastructure/resilience/resilience.module';
import { LifecycleModule } from './infrastructure/lifecycle/lifecycle.module';
import { QueueModule } from './queue/queue.module';
import { HealthModule } from './modules/health/health.module';
import { EventsModule } from './modules/events/events.module';
import { FinanceModule } from './modules/finance/finance.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SyncModule } from './modules/sync/sync.module';
import { StudentsModule } from './modules/students/students.module';
import { AuthContextMiddleware } from './middleware/auth-context.middleware';
import { BillingFeatureMiddleware } from './middleware/billing-feature.middleware';
import { CompressionMiddleware } from './middleware/compression.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { RequestContextMiddleware } from './middleware/request-context.middleware';
import { RequestLoggingMiddleware } from './middleware/request-logging.middleware';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { RequestIdInterceptor } from './interceptors/request-id.interceptor';
import { TenantModule } from './tenant/tenant.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MaintenanceModeGuard } from './guards/maintenance-mode.guard';
import { RbacGuard } from './guards/rbac.guard';
import { AbacGuard } from './guards/abac.guard';
import { BillingModule } from './modules/billing/billing.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { SecurityModule } from './modules/security/security.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { AdmissionsModule } from './modules/admissions/admissions.module';
import { SupportModule } from './modules/support/support.module';
import { PlatformModule } from './modules/platform/platform.module';
import { AcademicsModule } from './modules/academics/academics.module';
import { ExamsModule } from './modules/exams/exams.module';
import { HrModule } from './modules/hr/hr.module';
import { LibraryModule } from './modules/library/library.module';
import { TimetableModule } from './modules/timetable/timetable.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { DisciplineModule } from './modules/discipline/discipline.module';
import { ModuleAccessModule } from './modules/module-access/module-access.module';
import { ModuleAccessGuard } from './modules/module-access/module-access.guard';
import { LabsModule } from './modules/labs/labs.module';
import { AdminCommandModule } from './modules/admin-command/admin-command.module';
import { AiInsightsModule } from './modules/ai-insights/ai-insights.module';
import { AssetsModule } from './modules/assets/assets.module';
import { BiometricAttendanceModule } from './modules/biometric-attendance/biometric-attendance.module';
import { BoardingModule } from './modules/boarding/boarding.module';
import { CbtModule } from './modules/cbt/cbt.module';
import { ClinicModule } from './modules/clinic/clinic.module';
import { HostelModule } from './modules/hostel/hostel.module';
import { IotModule } from './modules/iot/iot.module';
import { LmsModule } from './modules/lms/lms.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { TransportModule } from './modules/transport/transport.module';
import { VisitorsModule } from './modules/visitors/visitors.module';
import { OperationsModule } from './modules/operations/operations.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { ParentPortalModule } from './parent-portal/parent-portal.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { GradeMasterModule } from './modules/grade-master/grade-master.module';
import { ClassTeacherModule } from './modules/class-teacher/class-teacher.module';
import { SecretaryModule } from './modules/secretary/secretary.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
@Module({
  imports: [
    AgpModule,
    WidgetRegistryModule,
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [configuration],
      validate: validateEnv,
    }),
    CommonModule,
    AuthModule,
    TenantModule,
    DatabaseModule,
    RedisModule,
    ResilienceModule,
    LifecycleModule,
    QueueModule,
    HealthModule,
    EventsModule,
    ObservabilityModule,
    SecurityModule,
    ApprovalsModule,
    ModuleAccessModule,
    InventoryModule,
    AdmissionsModule,
    SupportModule,
    PlatformModule,
    AcademicsModule,
    ExamsModule,
    HrModule,
    LibraryModule,
    TimetableModule,
    IntegrationsModule,
    DisciplineModule,
    LabsModule,
    AdminCommandModule,
    DashboardModule,
    AiInsightsModule,
    AssetsModule,
    BiometricAttendanceModule,
    BoardingModule,
    CbtModule,
    FinanceModule,
    HostelModule,
    IotModule,
    LmsModule,
    SyncModule,
    StudentsModule,
    ClinicModule,
    ProcurementModule,
    TransportModule,
    VisitorsModule,
    PaymentsModule,
    BillingModule,
    ComplianceModule,
    OperationsModule,
    CommunicationModule,
    ParentPortalModule,
    GradeMasterModule,
    ClassTeacherModule,
    SecretaryModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestIdInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: MaintenanceModeGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AbacGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ModuleAccessGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        CompressionMiddleware,
        RequestContextMiddleware,
        TenantMiddleware,
        AuthContextMiddleware,
        RequestLoggingMiddleware,
        RateLimitMiddleware,
        BillingFeatureMiddleware,
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
