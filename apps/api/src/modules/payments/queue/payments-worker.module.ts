import { Module } from '@nestjs/common';
import { WidgetRegistryModule } from '../../../common/widget-registry/widget-registry.module';

import { PaymentsModule } from '../payments.module';
import { PaymentsJobExecutionService } from '../services/payments-job-execution.service';
import { PaymentsQueueProcessor } from './payments-queue.processor';
import { PaymentsQueueRuntimeModule } from './payments-queue.runtime.module';
import { PaymentInboxRecoveryService } from '../services/payment-inbox-recovery.service';

@Module({
  imports: [PaymentsQueueRuntimeModule, WidgetRegistryModule, PaymentsModule],
  providers: [PaymentsQueueProcessor, PaymentsJobExecutionService, PaymentInboxRecoveryService],
})
export class PaymentsWorkerModule {}
