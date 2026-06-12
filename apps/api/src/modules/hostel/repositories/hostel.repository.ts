import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { SimpleOperationsRepository } from '../../implementation100/simple-operations';

@Injectable()
export class HostelRepository extends SimpleOperationsRepository {
  constructor(prisma: PrismaService) {
    super(prisma, {
      mainTable: 'hostels',
      auditTable: 'hostel_audit_logs',
    });
  }
}
