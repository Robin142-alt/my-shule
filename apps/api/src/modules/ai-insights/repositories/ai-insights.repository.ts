import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { SimpleOperationsRepository } from '../../implementation100/simple-operations';

@Injectable()
export class AiInsightsRepository extends SimpleOperationsRepository {
  constructor(databaseService: DatabaseService) {
    super(databaseService, {
      mainTable: 'ai_insight_runs',
      auditTable: 'ai_insight_audit_logs',
    });
  }
}
