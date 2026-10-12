import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { ApprovalsExecutor } from '../approvals/approvals.executor';

@Injectable()
export class FinanceApprovalsHandler implements OnModuleInit {
  constructor(private readonly approvalsExecutor: ApprovalsExecutor) {}

  onModuleInit() {
    this.approvalsExecutor.registerHandler('FINANCE', 'FEE_WAIVER', async () => {
      // Old approvals refer to a different invoice ledger. Never silently apply
      // them to current accounts or mark money as collected.
      throw new ConflictException('Legacy fee waivers need administrator review. Submit current requests from the Accountant waiver workspace.');
    });
  }
}
