import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { ObservabilityModule } from '../observability/observability.module';
import { SyncModule } from '../sync/sync.module';
import { FinanceSchemaService } from './finance-schema.service';
import { FinanceController } from './finance.controller';
import { LedgerService } from './ledger.service';
import { TransactionService } from './transaction.service';
import { FinanceTasksService } from './finance-tasks.service';
import { AccountsRepository } from './repositories/accounts.repository';
import { TransactionsRepository } from './repositories/transactions.repository';
import { LedgerEntriesRepository } from './repositories/ledger-entries.repository';
import { IdempotencyKeysRepository } from './repositories/idempotency-keys.repository';

@Module({
  imports: [AuthModule, SyncModule, ObservabilityModule],
  controllers: [FinanceController],
  providers: [
    FinanceSchemaService,
    LedgerService,
    TransactionService,
    FinanceTasksService,
    AccountsRepository,
    TransactionsRepository,
    LedgerEntriesRepository,
    IdempotencyKeysRepository,
  ],
  exports: [FinanceSchemaService, LedgerService, TransactionService, FinanceTasksService, AccountsRepository],
})
export class FinanceModule {}
