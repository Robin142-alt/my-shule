import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import configuration from '../../src/config/configuration';
import { AuthModule } from '../../src/auth/auth.module';
import { CommonModule } from '../../src/common/common.module';
import { DatabaseModule } from '../../src/database/database.module';
import { JwtAuthGuard } from '../../src/guards/jwt-auth.guard';
import { RbacGuard } from '../../src/guards/rbac.guard';
import { AbacGuard } from '../../src/guards/abac.guard';
import { AuthContextMiddleware } from '../../src/middleware/auth-context.middleware';
import { RequestContextMiddleware } from '../../src/middleware/request-context.middleware';
import { TenantMiddleware } from '../../src/middleware/tenant.middleware';
import { TenantModule } from '../../src/tenant/tenant.module';
import { AuditLogService } from '../../src/modules/observability/audit-log.service';
import { PiiEncryptionService } from '../../src/modules/security/pii-encryption.service';
import { AcademicsModule } from '../../src/modules/academics/academics.module';
import { ExamsModule } from '../../src/modules/exams/exams.module';
import { TimetableModule } from '../../src/modules/timetable/timetable.module';
import { StudentsModule } from '../../src/modules/students/students.module';
import { ModuleAccessModule } from '../../src/modules/module-access/module-access.module';
import { DashboardModule } from '../../src/modules/dashboard/dashboard.module';
import { ObservabilityModule } from '../../src/modules/observability/observability.module';
import { EventsModule } from '../../src/modules/events/events.module';
import { SecurityModule } from '../../src/modules/security/security.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      ignoreEnvFile: true,
      load: [configuration],
    }),
    CommonModule,
    TenantModule,
    DatabaseModule,
    AuthModule,
    AcademicsModule,
    ExamsModule,
    TimetableModule,
    StudentsModule,
    EventsModule,
    ModuleAccessModule,
    DashboardModule,
    ObservabilityModule,
    SecurityModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AbacGuard,
    },
  ],
})
export class AcademicsWorkflowTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        RequestContextMiddleware,
        TenantMiddleware,
        AuthContextMiddleware,
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
