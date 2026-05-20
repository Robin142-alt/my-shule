import { forwardRef, Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { EventsModule } from '../events/events.module';
import { FinanceModule } from '../finance/finance.module';
import { ObservabilityModule } from '../observability/observability.module';
import { SecurityModule } from '../security/security.module';
import { TenantFinanceModule } from '../tenant-finance/tenant-finance.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { MpesaCallbackController } from './controllers/mpesa-callback.controller';
import { MpesaC2bController } from './controllers/mpesa-c2b.controller';
import { PaymentsController } from './controllers/payments.controller';
import { PaymentsSchemaService } from './payments-schema.service';
import { CallbackLogsRepository } from './repositories/callback-logs.repository';
import { MpesaC2bPaymentsRepository } from './repositories/mpesa-c2b-payments.repository';
import { MpesaTransactionsRepository } from './repositories/mpesa-transactions.repository';
import { MpesaVerificationJobsRepository } from './repositories/mpesa-verification-jobs.repository';
import { PaymentIntentIdempotencyRepository } from './repositories/payment-intent-idempotency.repository';
import { PaymentIntentsRepository } from './repositories/payment-intents.repository';
import { PaymentsQueueModule } from './queue/payments-queue.module';
import { MpesaCallbackChannelService } from './services/mpesa-callback-channel.service';
import { MpesaCallbackProcessorService } from './services/mpesa-callback-processor.service';
import { MpesaC2bService } from './services/mpesa-c2b.service';
import { MpesaCallbackTrustService } from './services/mpesa-callback-trust.service';
import { MpesaPaymentRecoveryService } from './services/mpesa-payment-recovery.service';
import { MpesaPayloadVaultService } from './services/mpesa-payload-vault.service';
import { MpesaReconciliationService } from './services/mpesa-reconciliation.service';
import { MpesaReplayProtectionService } from './services/mpesa-replay-protection.service';
import { MpesaTransactionStatusService } from './services/mpesa-transaction-status.service';
import { MpesaVerificationProcessorService } from './services/mpesa-verification-processor.service';
import { MpesaService } from './services/mpesa.service';
import { MpesaSignatureService } from './services/mpesa-signature.service';
import { PaymentAllocationService } from './services/payment-allocation.service';

@Module({
  imports: [
    AuthModule,
    FinanceModule,
    EventsModule,
    ObservabilityModule,
    SecurityModule,
    TenantFinanceModule,
    IntegrationsModule,
    PaymentsQueueModule,
    forwardRef(() => BillingModule),
  ],
  controllers: [PaymentsController, MpesaCallbackController, MpesaC2bController],
  providers: [
    PaymentsSchemaService,
    MpesaService,
    MpesaCallbackChannelService,
    MpesaC2bService,
    MpesaCallbackTrustService,
    MpesaTransactionStatusService,
    MpesaVerificationProcessorService,
    MpesaSignatureService,
    MpesaPayloadVaultService,
    MpesaReplayProtectionService,
    MpesaReconciliationService,
    MpesaPaymentRecoveryService,
    MpesaCallbackProcessorService,
    PaymentAllocationService,
    PaymentIntentIdempotencyRepository,
    PaymentIntentsRepository,
    CallbackLogsRepository,
    MpesaC2bPaymentsRepository,
    MpesaTransactionsRepository,
    MpesaVerificationJobsRepository,
  ],
  exports: [
    MpesaService,
    MpesaCallbackChannelService,
    MpesaPayloadVaultService,
    MpesaCallbackTrustService,
    MpesaTransactionStatusService,
    MpesaVerificationProcessorService,
    MpesaC2bService,
    MpesaCallbackProcessorService,
    MpesaReconciliationService,
    MpesaPaymentRecoveryService,
    MpesaVerificationJobsRepository,
    PaymentAllocationService,
    PaymentsQueueModule,
  ],
})
export class PaymentsModule {}
