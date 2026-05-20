import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import {
  PAYMENTS_PROCESS_JOB,
  PAYMENTS_VERIFY_MPESA_JOB,
  PAYMENTS_QUEUE_NAME,
} from '../payments.constants';
import { PaymentsJobExecutionService } from '../services/payments-job-execution.service';
import {
  PaymentsQueueJobData,
  PaymentsQueueJobResult,
  ProcessMpesaVerificationJobData,
  ProcessPaymentJobData,
} from './payments-queue.types';

@Processor(PAYMENTS_QUEUE_NAME, { concurrency: 5 })
export class PaymentsQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentsQueueProcessor.name);

  constructor(
    private readonly paymentsJobExecutionService: PaymentsJobExecutionService,
  ) {
    super();
  }

  async process(
    job: Job<PaymentsQueueJobData, PaymentsQueueJobResult, typeof PAYMENTS_PROCESS_JOB | typeof PAYMENTS_VERIFY_MPESA_JOB>,
  ): Promise<PaymentsQueueJobResult> {
    if (job.name === PAYMENTS_PROCESS_JOB) {
      return this.paymentsJobExecutionService.processPayment(
        job.data as ProcessPaymentJobData,
        String(job.id),
      );
    }

    if (job.name === PAYMENTS_VERIFY_MPESA_JOB) {
      return this.paymentsJobExecutionService.processMpesaVerification(
        job.data as ProcessMpesaVerificationJobData,
        String(job.id),
      );
    }

    throw new Error(`Unsupported payment job "${job.name}"`);
  }

  @OnWorkerEvent('active')
  onActive(job: Job<PaymentsQueueJobData, PaymentsQueueJobResult>): void {
    this.logger.log(
      JSON.stringify({
        event: 'payments.queue.active',
        queue_name: PAYMENTS_QUEUE_NAME,
        job_name: job.name,
        job_id: job.id,
        tenant_id: job.data.tenant_id,
        checkout_request_id: 'checkout_request_id' in job.data ? job.data.checkout_request_id ?? null : null,
        callback_log_id: job.data.callback_log_id ?? null,
        verification_job_id: 'verification_job_id' in job.data ? job.data.verification_job_id : null,
        c2b_payment_id: 'c2b_payment_id' in job.data ? job.data.c2b_payment_id ?? null : null,
      }),
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(
    job: Job<PaymentsQueueJobData, PaymentsQueueJobResult>,
    result: PaymentsQueueJobResult,
  ): void {
    this.logger.log(
      JSON.stringify({
        event: 'payments.queue.completed',
        queue_name: PAYMENTS_QUEUE_NAME,
        job_name: job.name,
        job_id: job.id,
        tenant_id: result.tenant_id,
        checkout_request_id: 'checkout_request_id' in result ? result.checkout_request_id : null,
        callback_log_id: result.callback_log_id,
        verification_job_id: 'verification_job_id' in result ? result.verification_job_id : null,
        c2b_payment_id: 'c2b_payment_id' in result ? result.c2b_payment_id : null,
        payment_intent_id: 'payment_intent_id' in result ? result.payment_intent_id : null,
        ledger_transaction_id: 'ledger_transaction_id' in result ? result.ledger_transaction_id : null,
        status: 'status' in result ? result.status : result.provider_status,
      }),
    );
  }

  @OnWorkerEvent('failed')
  onFailed(
    job: Job<PaymentsQueueJobData, PaymentsQueueJobResult> | undefined,
    error: Error,
  ): void {
    this.logger.error(
      JSON.stringify({
        event: 'payments.queue.failed',
        queue_name: PAYMENTS_QUEUE_NAME,
        job_name: job?.name ?? PAYMENTS_PROCESS_JOB,
        job_id: job?.id ?? 'unknown',
        tenant_id: job?.data.tenant_id ?? null,
        checkout_request_id:
          job?.data && 'checkout_request_id' in job.data ? job.data.checkout_request_id ?? null : null,
        callback_log_id: job?.data.callback_log_id ?? null,
        verification_job_id:
          job?.data && 'verification_job_id' in job.data ? job.data.verification_job_id : null,
        c2b_payment_id:
          job?.data && 'c2b_payment_id' in job.data ? job.data.c2b_payment_id ?? null : null,
        error_message: error.message,
      }),
      error.stack,
    );
  }
}
