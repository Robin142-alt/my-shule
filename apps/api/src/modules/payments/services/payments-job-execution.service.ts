import { Injectable } from '@nestjs/common';

import { MpesaCallbackProcessorService } from './mpesa-callback-processor.service';
import { MpesaVerificationProcessorService } from './mpesa-verification-processor.service';
import {
  ProcessMpesaVerificationJobData,
  ProcessMpesaVerificationJobResult,
  ProcessPaymentJobData,
  ProcessPaymentJobResult,
} from '../queue/payments-queue.types';

@Injectable()
export class PaymentsJobExecutionService {
  constructor(
    private readonly mpesaCallbackProcessorService: MpesaCallbackProcessorService,
    private readonly mpesaVerificationProcessorService: MpesaVerificationProcessorService,
  ) {}

  async processPayment(
    payload: ProcessPaymentJobData,
    jobId: string,
  ): Promise<ProcessPaymentJobResult> {
    return this.mpesaCallbackProcessorService.processPaymentJob(payload, jobId);
  }

  async processMpesaVerification(
    payload: ProcessMpesaVerificationJobData,
    jobId: string,
  ): Promise<ProcessMpesaVerificationJobResult> {
    return this.mpesaVerificationProcessorService.processVerificationJob(payload, jobId);
  }
}
