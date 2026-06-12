import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { SimpleOperationsRepository } from '../../implementation100/simple-operations';

@Injectable()
export class AiInsightsRepository extends SimpleOperationsRepository {
  constructor(prisma: PrismaService) {
    super(prisma, {
      mainTable: 'ai_insight_runs',
      auditTable: 'ai_insight_audit_logs',
    });
  }
}
