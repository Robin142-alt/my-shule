import { Module } from '@nestjs/common';

import { AiInsightsController } from './ai-insights.controller';
import { AiInsightsSchemaService } from './ai-insights-schema.service';
import { AiInsightsService } from './ai-insights.service';
import { AiInsightsRepository } from './repositories/ai-insights.repository';

@Module({
  controllers: [AiInsightsController],
  providers: [AiInsightsSchemaService, AiInsightsService, AiInsightsRepository],
  exports: [AiInsightsService, AiInsightsRepository],
})
export class AiInsightsModule {}
