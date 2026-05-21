import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { SimpleOperationsRepository } from '../../implementation100/simple-operations';

@Injectable()
export class HostelRepository extends SimpleOperationsRepository {
  constructor(databaseService: DatabaseService) {
    super(databaseService, {
      mainTable: 'hostels',
      auditTable: 'hostel_audit_logs',
    });
  }
}
