import { Module } from '@nestjs/common';

import { AdminCommandController } from './admin-command.controller';
import { AdminCommandSchemaService } from './admin-command-schema.service';
import { AdminCommandService } from './admin-command.service';
import { DeputyCommandController } from './deputy-command.controller';
import { DeputyCommandService } from './deputy-command.service';
import { AdmissionsCommandController } from './admissions-command.controller';
import { AdmissionsCommandService } from './admissions-command.service';
import { PrincipalInsightsCacheService } from './principal-insights-cache.service';
import { PrincipalInsightsService } from './principal-insights.service';
import { AdminCommandRepository } from './repositories/admin-command.repository';
import { DeputyCommandRepository } from './repositories/deputy-command.repository';
import { AdmissionsCommandRepository } from './repositories/admissions-command.repository';

@Module({
  controllers: [AdminCommandController, DeputyCommandController, AdmissionsCommandController],
  providers: [
    AdminCommandSchemaService,
    AdminCommandService,
    AdminCommandRepository,
    DeputyCommandService,
    DeputyCommandRepository,
    AdmissionsCommandService,
    AdmissionsCommandRepository,
    PrincipalInsightsCacheService,
    PrincipalInsightsService,
  ],
  exports: [
    AdminCommandService,
    AdminCommandRepository,
    DeputyCommandService,
    DeputyCommandRepository,
    AdmissionsCommandService,
    AdmissionsCommandRepository,
    PrincipalInsightsCacheService,
    PrincipalInsightsService,
  ],
})
export class AdminCommandModule {}
