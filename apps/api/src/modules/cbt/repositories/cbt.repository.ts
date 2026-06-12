import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { SimpleOperationsRepository } from '../../implementation100/simple-operations';

@Injectable()
export class CbtRepository extends SimpleOperationsRepository {
  constructor(prisma: PrismaService) {
    super(prisma, {
      mainTable: 'cbt_exam_sessions',
      auditTable: 'cbt_audit_logs',
    });
  }
}
