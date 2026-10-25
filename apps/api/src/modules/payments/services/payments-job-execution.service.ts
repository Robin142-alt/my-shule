import { Injectable, Optional } from '@nestjs/common';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import { AUTH_ANONYMOUS_USER_ID, SUPERADMIN_ROLE_OWNER } from '../../../auth/auth.constants';
import { BankSynchronizationService } from '../ingress/bank-synchronization.service';

import { MpesaCallbackProcessorService } from './mpesa-callback-processor.service';
import { MpesaVerificationProcessorService } from './mpesa-verification-processor.service';
import {
  ProcessMpesaVerificationJobData,
  ProcessMpesaVerificationJobResult,
  ProcessPaymentJobData,
  ProcessPaymentJobResult,
  ProcessBankRetrievalJobData,
  ProcessBankRetrievalJobResult,
} from '../queue/payments-queue.types';

@Injectable()
export class PaymentsJobExecutionService {
  constructor(
    private readonly mpesaCallbackProcessorService: MpesaCallbackProcessorService,
    private readonly mpesaVerificationProcessorService: MpesaVerificationProcessorService,
    @Optional() private readonly banks?:BankSynchronizationService,
    @Optional() private readonly context?:RequestContextService,
  ) {}

  async processBankRetrieval(payload:ProcessBankRetrievalJobData,jobId:string):Promise<ProcessBankRetrievalJobResult> {
    if(!this.banks || !this.context || !/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(payload.tenant_id))
      throw new Error('Bank retrieval worker is not configured for this school');
    await this.context.run({tenant_id:payload.tenant_id,request_id:payload.request_id,user_id:AUTH_ANONYMOUS_USER_ID,
      role:SUPERADMIN_ROLE_OWNER,audience:'superadmin',is_authenticated:true,permissions:['*:*'],session_id:null,
      client_ip:null,user_agent:'system:bank-retrieval',method:'WORKER',path:'/internal/payments/bank-retrieval',started_at:new Date().toISOString()},
      ()=>this.banks!.recoverSchool(payload.tenant_id));
    return {job_id:jobId,tenant_id:payload.tenant_id,callback_log_id:null,status:'completed',processed_at:new Date().toISOString()};
  }

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
