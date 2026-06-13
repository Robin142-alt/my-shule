import { Module } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsExecutor } from './approvals.executor';
import { DatabaseModule } from '../../database/database.module';

import { ApprovalsCronService } from './approvals.cron';

@Module({
  imports: [DatabaseModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService, ApprovalsExecutor, ApprovalsCronService],
  exports: [ApprovalsService, ApprovalsExecutor, ApprovalsCronService],
})
export class ApprovalsModule {}
