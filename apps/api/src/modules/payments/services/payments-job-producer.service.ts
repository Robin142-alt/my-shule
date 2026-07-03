import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';

import { QueueService } from '../../../queue/queue.service';
import {
  PAYMENTS_PROCESS_JOB,
  PAYMENTS_VERIFY_MPESA_JOB,
  PAYMENTS_QUEUE_NAME,
} from '../payments.constants';
import {
  EnqueueMpesaVerificationJobData,
  EnqueueMpesaVerificationJobResult,
  EnqueuePaymentJobData,
  EnqueuePaymentJobResult,
  PaymentsQueueJobData,
  PaymentsQueueJobResult,
  ProcessMpesaVerificationJobData,
  ProcessPaymentJobData,
} from '../queue/payments-queue.types';

@Injectable()
export class PaymentsJobProducerService {
  private readonly logger = new Logger(PaymentsJobProducerService.name);

  constructor(private readonly queueService: QueueService) {}

  async enqueuePayment(data: EnqueuePaymentJobData): Promise<EnqueuePaymentJobResult> {
    const payload: ProcessPaymentJobData = {
      ...data,
      enqueued_at: new Date().toISOString(),
    };
    const jobId = this.buildJobId(payload);
    const paymentsQueue = this.getPaymentsQueue();
    const existingJob = await paymentsQueue.getJob(jobId);

    if (existingJob) {
      return this.mapQueueResult(existingJob, payload, true);
    }

    try {
      const job = await paymentsQueue.add(PAYMENTS_PROCESS_JOB, payload, {
        jobId,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 24 * 60 * 60,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 60 * 60,
          count: 5000,
        },
      });

      this.logger.log(
        JSON.stringify({
          event: 'payments.queue.enqueued',
          queue_name: PAYMENTS_QUEUE_NAME,
          job_id: job.id,
          tenant_id: payload.tenant_id,
          checkout_request_id: payload.checkout_request_id,
          callback_log_id: payload.callback_log_id ?? null,
        }),
      );

      return this.mapQueueResult(job, payload, false);
    } catch (error) {
      if (this.isDuplicateJobError(error)) {
        const duplicatedJob = await paymentsQueue.getJob(jobId);

        if (duplicatedJob) {
          return this.mapQueueResult(duplicatedJob, payload, true);
        }
      }

      this.logger.error(
        `Failed to enqueue payment job "${jobId}": ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async enqueueMpesaVerification(
    data: EnqueueMpesaVerificationJobData,
  ): Promise<EnqueueMpesaVerificationJobResult> {
    const payload: ProcessMpesaVerificationJobData = {
      ...data,
      enqueued_at: new Date().toISOString(),
    };
    const jobId = this.buildMpesaVerificationJobId(payload);
    const paymentsQueue = this.getPaymentsQueue();
    const existingJob = await paymentsQueue.getJob(jobId);

    if (existingJob) {
      return this.mapMpesaVerificationQueueResult(existingJob, payload, true);
    }

    try {
      const job = await paymentsQueue.add(PAYMENTS_VERIFY_MPESA_JOB, payload, {
        jobId,
        attempts: 8,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 60 * 60,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 60 * 60,
          count: 5000,
        },
      });

      this.logger.log(
        JSON.stringify({
          event: 'payments.queue.mpesa_verification_enqueued',
          queue_name: PAYMENTS_QUEUE_NAME,
          job_id: job.id,
          tenant_id: payload.tenant_id,
          verification_job_id: payload.verification_job_id,
          checkout_request_id: payload.checkout_request_id ?? null,
          callback_log_id: payload.callback_log_id ?? null,
          c2b_payment_id: payload.c2b_payment_id ?? null,
          mpesa_receipt_number: payload.mpesa_receipt_number ?? null,
        }),
      );

      return this.mapMpesaVerificationQueueResult(job, payload, false);
    } catch (error) {
      if (this.isDuplicateJobError(error)) {
        const duplicatedJob = await paymentsQueue.getJob(jobId);

        if (duplicatedJob) {
          return this.mapMpesaVerificationQueueResult(duplicatedJob, payload, true);
        }
      }

      this.logger.error(
        `Failed to enqueue M-PESA verification job "${jobId}": ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  buildJobId(data: Pick<ProcessPaymentJobData, 'tenant_id' | 'checkout_request_id'>): string {
    return `${PAYMENTS_QUEUE_NAME}:${data.tenant_id}:${data.checkout_request_id}`;
  }

  buildMpesaVerificationJobId(
    data: Pick<ProcessMpesaVerificationJobData, 'tenant_id' | 'verification_job_id'>,
  ): string {
    return `${PAYMENTS_QUEUE_NAME}:verify:${data.tenant_id}:${data.verification_job_id}`;
  }

  private async mapQueueResult(
    job: Job<PaymentsQueueJobData, PaymentsQueueJobResult, typeof PAYMENTS_PROCESS_JOB | typeof PAYMENTS_VERIFY_MPESA_JOB>,
    payload: ProcessPaymentJobData,
    deduplicated: boolean,
  ): Promise<EnqueuePaymentJobResult> {
    return {
      job_id: String(job.id),
      queue_name: PAYMENTS_QUEUE_NAME,
      tenant_id: payload.tenant_id,
      checkout_request_id: payload.checkout_request_id,
      deduplicated,
      state: await job.getState(),
    };
  }

  private async mapMpesaVerificationQueueResult(
    job: Job<PaymentsQueueJobData, PaymentsQueueJobResult, typeof PAYMENTS_PROCESS_JOB | typeof PAYMENTS_VERIFY_MPESA_JOB>,
    payload: ProcessMpesaVerificationJobData,
    deduplicated: boolean,
  ): Promise<EnqueueMpesaVerificationJobResult> {
    return {
      job_id: String(job.id),
      queue_name: PAYMENTS_QUEUE_NAME,
      tenant_id: payload.tenant_id,
      verification_job_id: payload.verification_job_id,
      deduplicated,
      state: await job.getState(),
    };
  }

  private isDuplicateJobError(error: unknown): boolean {
    return (
      error instanceof Error &&
      /job.*exists|duplicated/i.test(error.message)
    );
  }

  private getPaymentsQueue(): Queue<
    PaymentsQueueJobData,
    PaymentsQueueJobResult,
    typeof PAYMENTS_PROCESS_JOB | typeof PAYMENTS_VERIFY_MPESA_JOB
  > {
    return this.queueService.getQueue(PAYMENTS_QUEUE_NAME) as Queue<
      PaymentsQueueJobData,
      PaymentsQueueJobResult,
      typeof PAYMENTS_PROCESS_JOB | typeof PAYMENTS_VERIFY_MPESA_JOB
    >;
  }
}
