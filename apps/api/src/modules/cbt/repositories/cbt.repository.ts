import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { SimpleOperationsRepository } from '../../implementation100/simple-operations';

@Injectable()
export class CbtRepository extends SimpleOperationsRepository {
  constructor(databaseService: DatabaseService) {
    super(databaseService, {
      mainTable: 'cbt_exam_sessions',
      auditTable: 'cbt_audit_logs',
    });
  }
}
