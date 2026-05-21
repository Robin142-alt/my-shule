import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { SimpleOperationsRepository } from '../../implementation100/simple-operations';

@Injectable()
export class LmsRepository extends SimpleOperationsRepository {
  constructor(databaseService: DatabaseService) {
    super(databaseService, {
      mainTable: 'lms_courses',
      auditTable: 'lms_audit_logs',
    });
  }
}
