import { Injectable } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { SimpleOperationsService } from '../implementation100/simple-operations';
import { AiInsightsRepository } from './repositories/ai-insights.repository';

@Injectable()
export class AiInsightsService extends SimpleOperationsService {
  constructor(requestContext: RequestContextService, repository: AiInsightsRepository) {
    super(requestContext, repository, {
      permissionPrefix: 'ai-insights',
      moduleName: 'AI Insights',
      entityName: 'ai_insights',
      defaultStatus: 'open',
    });
  }
}
