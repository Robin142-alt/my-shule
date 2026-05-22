import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from '../../src/config/configuration';
import { CommonModule } from '../../src/common/common.module';
import { DatabaseModule } from '../../src/database/database.module';
import { RedisService } from '../../src/infrastructure/redis/redis.service';
import { QueueService } from '../../src/queue/queue.service';
import { RequestContextMiddleware } from '../../src/middleware/request-context.middleware';
import { TenantMiddleware } from '../../src/middleware/tenant.middleware';
import { TenantModule } from '../../src/tenant/tenant.module';
import { BillingService } from '../../src/modules/billing/billing.service';
import { EventPublisherService } from '../../src/modules/events/event-publisher.service';
import { LedgerService } from '../../src/modules/finance/ledger.service';
import { TransactionService } from '../../src/modules/finance/transaction.service';
import { AccountsRepository } from '../../src/modules/finance/repositories/accounts.repository';
import { IdempotencyKeysRepository } from '../../src/modules/finance/repositories/idempotency-keys.repository';
import { LedgerEntriesRepository } from '../../src/modules/finance/repositories/ledger-entries.repository';
import { TransactionsRepository } from '../../src/modules/finance/repositories/transactions.repository';
import { AuditLogService } from '../../src/modules/observability/audit-log.service';
import { TenantFinanceConfigRepository } from '../../src/modules/tenant-finance/tenant-finance-config.repository';
import { TenantFinanceConfigService } from '../../src/modules/tenant-finance/tenant-finance-config.service';
import { MpesaCallbackController } from '../../src/modules/payments/mpesa-callback.controller';
import { MpesaCallbackProcessorService } from '../../src/modules/payments/mpesa-callback-processor.service';
import { MpesaPaymentRecoveryService } from '../../src/modules/payments/mpesa-payment-recovery.service';
import { MpesaReconciliationService } from '../../src/modules/payments/mpesa-reconciliation.service';
import { MpesaReplayProtectionService } from '../../src/modules/payments/mpesa-replay-protection.service';
import { MpesaService } from '../../src/modules/payments/mpesa.service';
import { MpesaPayloadVaultService } from '../../src/modules/payments/services/mpesa-payload-vault.service';
import {
  PAYMENTS_PROCESS_JOB,
  PAYMENTS_QUEUE_NAME,
  PAYMENTS_VERIFY_MPESA_JOB,
} from '../../src/modules/payments/payments.constants';
import { MpesaSignatureService } from '../../src/modules/payments/mpesa-signature.service';
import { CallbackLogsRepository } from '../../src/modules/payments/repositories/callback-logs.repository';
import { MpesaTransactionsRepository } from '../../src/modules/payments/repositories/mpesa-transactions.repository';
import { PaymentIntentIdempotencyRepository } from '../../src/modules/payments/repositories/payment-intent-idempotency.repository';
import { PaymentIntentsRepository } from '../../src/modules/payments/repositories/payment-intents.repository';
import { PaymentsJobProducerService } from '../../src/modules/payments/services/payments-job-producer.service';
import { FraudDetectionService } from '../../src/modules/security/fraud-detection.service';
import { PiiEncryptionService } from '../../src/modules/security/pii-encryption.service';
import { SyncOperationLogService } from '../../src/modules/sync/sync-operation-log.service';
import { InMemoryRedis } from './in-memory-redis';
import { CapturingQueueService } from './capturing-queue.service';
import { InMemoryMpesaReplayProtectionService } from './in-memory-mpesa-replay-protection.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      ignoreEnvFile: true,
      load: [configuration],
    }),
    CommonModule,
    TenantModule,
    DatabaseModule,
  ],
  controllers: [MpesaCallbackController],
  providers: [
    PiiEncryptionService,
    LedgerService,
    TransactionService,
    AccountsRepository,
    TransactionsRepository,
    LedgerEntriesRepository,
    IdempotencyKeysRepository,
    PaymentIntentIdempotencyRepository,
    PaymentIntentsRepository,
    TenantFinanceConfigRepository,
    TenantFinanceConfigService,
    CallbackLogsRepository,
    MpesaTransactionsRepository,
    MpesaSignatureService,
    MpesaPayloadVaultService,
    MpesaService,
    MpesaReconciliationService,
    MpesaPaymentRecoveryService,
    MpesaCallbackProcessorService,
    InMemoryMpesaReplayProtectionService,
    CapturingQueueService,
    {
      provide: MpesaReplayProtectionService,
      useExisting: InMemoryMpesaReplayProtectionService,
    },
    {
      provide: QueueService,
      useExisting: CapturingQueueService,
    },
    {
      provide: PaymentsJobProducerService,
      inject: [CapturingQueueService],
      useFactory: (queueService: CapturingQueueService) => ({
        enqueuePayment: async (data: {
          tenant_id: string;
          checkout_request_id: string;
          callback_log_id?: string;
        }) => {
          const payload = {
            ...data,
            enqueued_at: new Date().toISOString(),
          };
          const jobId = `${PAYMENTS_QUEUE_NAME}:${data.tenant_id}:${data.checkout_request_id}`;

          await queueService.add(
            PAYMENTS_PROCESS_JOB,
            payload,
            { jobId },
            PAYMENTS_QUEUE_NAME,
          );

          return {
            job_id: jobId,
            queue_name: PAYMENTS_QUEUE_NAME,
            tenant_id: data.tenant_id,
            checkout_request_id: data.checkout_request_id,
            deduplicated: false,
            state: 'waiting',
          };
        },
        enqueueMpesaVerification: async (data: {
          tenant_id: string;
          verification_job_id: string;
          checkout_request_id?: string | null;
        }) => {
          const payload = {
            ...data,
            enqueued_at: new Date().toISOString(),
          };
          const jobId = `${PAYMENTS_QUEUE_NAME}:verify:${data.tenant_id}:${data.verification_job_id}`;

          await queueService.add(
            PAYMENTS_VERIFY_MPESA_JOB,
            payload,
            { jobId },
            PAYMENTS_QUEUE_NAME,
          );

          return {
            job_id: jobId,
            queue_name: PAYMENTS_QUEUE_NAME,
            tenant_id: data.tenant_id,
            verification_job_id: data.verification_job_id,
            checkout_request_id: data.checkout_request_id ?? null,
            deduplicated: false,
            state: 'waiting',
          };
        },
      }),
    },
    {
      provide: RedisService,
      useValue: {
        client: new InMemoryRedis(),
        getClient(): InMemoryRedis {
          return this.client;
        },
      },
    },
    {
      provide: BillingService,
      useValue: {
        async handlePaymentIntentCompleted(): Promise<void> {
          return undefined;
        },
      },
    },
    {
      provide: EventPublisherService,
      useValue: {
        async publishPaymentCompleted(): Promise<void> {
          return undefined;
        },
      },
    },
    {
      provide: FraudDetectionService,
      useValue: {
        async inspectPaymentIntentCreation(): Promise<void> {
          return undefined;
        },
        async recordCallbackFailure(): Promise<void> {
          return undefined;
        },
        async recordCallbackMismatch(): Promise<void> {
          return undefined;
        },
      },
    },
    {
      provide: AuditLogService,
      useValue: {
        async recordFinanceTransactionPosted(): Promise<void> {
          return undefined;
        },
      },
    },
    {
      provide: SyncOperationLogService,
      useValue: {
        async recordServerOperation(): Promise<void> {
          return undefined;
        },
      },
    },
  ],
})
export class MpesaAdversarialTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestContextMiddleware, TenantMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
