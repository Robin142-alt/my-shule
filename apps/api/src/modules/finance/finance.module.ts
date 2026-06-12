import { FinanceWidgetProvider } from './widgets/finance-widget.provider';
import * as moduleConsumers from './consumers';
import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { ObservabilityModule } from '../observability/observability.module';
import { SyncModule } from '../sync/sync.module';
import { FinanceSchemaService } from './finance-schema.service';
import { FinanceController } from './finance.controller';
import { LedgerService } from './ledger.service';
import { TransactionService } from './transaction.service';
import { FinanceTasksService } from './finance-tasks.service';
import { FinancePaymentCompletedConsumer } from './finance-events.handler';
import { AccountsRepository } from './repositories/accounts.repository';
import { TransactionsRepository } from './repositories/transactions.repository';
import { LedgerEntriesRepository } from './repositories/ledger-entries.repository';
import { IdempotencyKeysRepository } from './repositories/idempotency-keys.repository';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [AuthModule, SyncModule, ObservabilityModule, EventsModule],
  controllers: [FinanceController],
  providers: [
    FinanceWidgetProvider,
    ...Object.values(moduleConsumers),
    FinanceSchemaService,
    LedgerService,
    TransactionService,
    FinanceTasksService,
    FinancePaymentCompletedConsumer,
    AccountsRepository,
    TransactionsRepository,
    LedgerEntriesRepository,
    IdempotencyKeysRepository,
  ],
  exports: [
    FinanceSchemaService, 
    LedgerService, 
    TransactionService, 
    FinanceTasksService, 
    FinancePaymentCompletedConsumer, 
    AccountsRepository
  ],
})
export class FinanceModule {}
