import { BadGatewayException, BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  AUTH_ANONYMOUS_USER_ID,
  AUTH_GUEST_ROLE,
} from '../../../auth/auth.constants';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import { CallbackLogsRepository } from '../repositories/callback-logs.repository';
import { MpesaC2bPaymentsRepository } from '../repositories/mpesa-c2b-payments.repository';
import { MpesaVerificationJobsRepository } from '../repositories/mpesa-verification-jobs.repository';
import {
  ProcessMpesaVerificationJobData,
  ProcessMpesaVerificationJobResult,
} from '../queue/payments-queue.types';
import { PaymentsJobProducerService } from './payments-job-producer.service';
import { MpesaTransactionStatusService } from './mpesa-transaction-status.service';

@Injectable()
export class MpesaVerificationProcessorService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly mpesaVerificationJobsRepository: MpesaVerificationJobsRepository,
    private readonly mpesaTransactionStatusService: MpesaTransactionStatusService,
    private readonly callbackLogsRepository: CallbackLogsRepository,
    private readonly paymentsJobProducerService: PaymentsJobProducerService,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly mpesaC2bPaymentsRepository?: MpesaC2bPaymentsRepository,
  ) {}

  async processVerificationJob(
    payload: ProcessMpesaVerificationJobData,
    jobId: string,
  ): Promise<ProcessMpesaVerificationJobResult> {
    return this.requestContext.run(
      {
        request_id: payload.request_id,
        trace_id: payload.trace_id,
        parent_span_id: payload.parent_span_id,
        tenant_id: payload.tenant_id,
        user_id: payload.user_id ?? AUTH_ANONYMOUS_USER_ID,
        role: payload.role ?? AUTH_GUEST_ROLE,
        session_id: payload.session_id ?? null,
        permissions: ['*:*'],
        is_authenticated: true,
        client_ip: null,
        user_agent: 'system:mpesa-verification-processor',
        method: 'WORKER',
        path: `/internal/payments/mpesa/verification/${payload.verification_job_id}`,
        started_at: new Date().toISOString(),
      },
      async () => this.processVerificationJobInContext(payload, jobId),
    );
  }

  private async processVerificationJobInContext(
    payload: ProcessMpesaVerificationJobData,
    jobId: string,
  ): Promise<ProcessMpesaVerificationJobResult> {
    if (payload.c2b_payment_id || payload.mpesa_receipt_number) {
      return this.processC2bVerificationJob(payload, jobId);
    }

    if (!payload.checkout_request_id || !payload.callback_log_id) {
      throw new BadRequestException(
        'STK verification jobs require callback_log_id and checkout_request_id',
      );
    }

    const verification = await this.mpesaTransactionStatusService.verifyStkPushStatus({
      tenant_id: payload.tenant_id,
      checkout_request_id: payload.checkout_request_id,
    });

    if (verification.provider_status === 'provider_pending') {
      await this.mpesaVerificationJobsRepository.markProviderResponse({
        tenant_id: payload.tenant_id,
        verification_job_id: payload.verification_job_id,
        transaction_status: 'retry_scheduled',
        provider_response: verification.raw_provider_response,
        next_retry_at: this.nextRetryAt(),
      });

      throw new BadGatewayException('M-PESA provider status is still pending');
    }

    await this.mpesaVerificationJobsRepository.markProviderResponse({
      tenant_id: payload.tenant_id,
      verification_job_id: payload.verification_job_id,
      transaction_status: verification.provider_status,
      provider_response: verification.raw_provider_response,
      next_retry_at: null,
    });

    if (verification.provider_status === 'provider_verified') {
      await this.callbackLogsRepository.markProviderVerified(
        payload.tenant_id,
        payload.callback_log_id,
        {
          result_code: verification.result_code,
          result_desc: verification.result_desc,
        },
      );
    } else {
      await this.callbackLogsRepository.markProviderFailed(
        payload.tenant_id,
        payload.callback_log_id,
        {
          result_code: verification.result_code,
          result_desc: verification.result_desc,
        },
      );
    }

    const enqueueResult = await this.paymentsJobProducerService.enqueuePayment({
      tenant_id: payload.tenant_id,
      checkout_request_id: payload.checkout_request_id,
      callback_log_id: payload.callback_log_id,
      request_id: payload.request_id,
      trace_id: payload.trace_id,
      parent_span_id: payload.parent_span_id,
      user_id: payload.user_id,
      role: payload.role,
      session_id: payload.session_id,
    });

    return {
      job_id: jobId,
      tenant_id: payload.tenant_id,
      verification_job_id: payload.verification_job_id,
      callback_log_id: payload.callback_log_id,
      checkout_request_id: payload.checkout_request_id,
      c2b_payment_id: null,
      c2b_payment_status: null,
      provider_status: verification.provider_status,
      payment_queue_job_id: enqueueResult.job_id,
      processed_at: new Date().toISOString(),
      failure_reason: null,
    };
  }

  private async processC2bVerificationJob(
    payload: ProcessMpesaVerificationJobData,
    jobId: string,
  ): Promise<ProcessMpesaVerificationJobResult> {
    if (!payload.c2b_payment_id || !payload.mpesa_receipt_number) {
      throw new BadRequestException(
        'C2B verification jobs require c2b_payment_id and mpesa_receipt_number',
      );
    }

    if (!this.mpesaC2bPaymentsRepository) {
      throw new BadRequestException('M-PESA C2B payment repository is not configured');
    }

    const verification = await this.mpesaTransactionStatusService.verifyC2bTransactionStatus({
      tenant_id: payload.tenant_id,
      trans_id: payload.mpesa_receipt_number,
    });

    if (verification.provider_status === 'provider_pending') {
      await this.mpesaVerificationJobsRepository.markProviderResponse({
        tenant_id: payload.tenant_id,
        verification_job_id: payload.verification_job_id,
        transaction_status: 'retry_scheduled',
        provider_response: verification.raw_provider_response,
        next_retry_at: this.nextRetryAt(),
      });

      throw new BadGatewayException('M-PESA C2B provider status is still pending');
    }

    await this.mpesaVerificationJobsRepository.markProviderResponse({
      tenant_id: payload.tenant_id,
      verification_job_id: payload.verification_job_id,
      transaction_status: verification.provider_status,
      provider_response: verification.raw_provider_response,
      next_retry_at: null,
    });

    const payment =
      verification.provider_status === 'provider_verified'
        ? await this.mpesaC2bPaymentsRepository.markProviderVerified({
            tenant_id: payload.tenant_id,
            payment_id: payload.c2b_payment_id,
            provider_result_code: verification.result_code,
            provider_result_desc: verification.result_desc,
            provider_amount_minor: verification.amount_minor,
            metadata: {
              provider_trans_id: verification.trans_id,
            },
          })
        : await this.mpesaC2bPaymentsRepository.markProviderFailed({
            tenant_id: payload.tenant_id,
            payment_id: payload.c2b_payment_id,
            provider_result_code: verification.result_code,
            provider_result_desc: verification.result_desc,
            metadata: {
              provider_trans_id: verification.trans_id,
            },
          });

    return {
      job_id: jobId,
      tenant_id: payload.tenant_id,
      verification_job_id: payload.verification_job_id,
      callback_log_id: null,
      checkout_request_id: null,
      c2b_payment_id: payload.c2b_payment_id,
      c2b_payment_status: payment.status,
      provider_status: verification.provider_status,
      payment_queue_job_id: null,
      processed_at: new Date().toISOString(),
      failure_reason: null,
    };
  }

  private nextRetryAt(): string {
    const delayMs = Number(
      this.configService?.get<number | string>('mpesa.verificationRetryDelayMs') ?? 60_000,
    );

    return new Date(Date.now() + Math.max(5000, delayMs)).toISOString();
  }
}
