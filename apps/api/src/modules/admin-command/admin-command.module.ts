import { Module } from '@nestjs/common';

import { AdminCommandController } from './admin-command.controller';
import { AdminCommandSchemaService } from './admin-command-schema.service';
import { AdminCommandService } from './admin-command.service';
import { PrincipalInsightsCacheService } from './principal-insights-cache.service';
import { PrincipalInsightsService } from './principal-insights.service';
import { AdminCommandRepository } from './repositories/admin-command.repository';

@Module({
  controllers: [AdminCommandController],
  providers: [
    AdminCommandSchemaService,
    AdminCommandService,
    AdminCommandRepository,
    PrincipalInsightsCacheService,
    PrincipalInsightsService,
  ],
  exports: [
    AdminCommandService,
    AdminCommandRepository,
    PrincipalInsightsCacheService,
    PrincipalInsightsService,
  ],
})
export class AdminCommandModule {}
