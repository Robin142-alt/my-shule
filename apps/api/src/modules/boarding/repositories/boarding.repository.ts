import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { SimpleOperationsRepository } from '../../implementation100/simple-operations';

@Injectable()
export class BoardingRepository extends SimpleOperationsRepository {
  constructor(databaseService: DatabaseService) {
    super(databaseService, {
      mainTable: 'boarding_houses',
      auditTable: 'boarding_audit_logs',
    });
  }
}
