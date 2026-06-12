import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Optional,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { performance } from 'node:perf_hooks';

import { Public } from '../../../auth/decorators/public.decorator';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import { PrismaService } from '../../../database/prisma.service';
import { SloMetricsService } from '../../observability/slo-metrics.service';
import { StructuredLoggerService } from '../../observability/structured-logger.service';
import { TenantFinanceConfigService } from '../../tenant-finance/tenant-finance-config.service';
import { DarajaIntegrationService } from '../../integrations/daraja-integration.service';
import { MpesaCallbackResponseDto } from '../dto/mpesa-callback-response.dto';
import {
  PAYMENTS_PROCESS_JOB,
  PAYMENTS_QUEUE_NAME,
} from '../payments.constants';
import { CallbackLogsRepository } from '../repositories/callback-logs.repository';
import { MpesaVerificationJobsRepository } from '../repositories/mpesa-verification-jobs.repository';
import { PaymentsJobProducerService } from '../services/payments-job-producer.service';
import { MpesaReplayProtectionService } from '../services/mpesa-replay-protection.service';
import { MpesaService } from '../services/mpesa.service';
import {
  MpesaCallbackChannelService,
  ResolvedMpesaCallbackChannel,
} from '../services/mpesa-callback-channel.service';
import {
  MpesaPayloadVaultService,
  redactMpesaOperationalPayload,
} from '../services/mpesa-payload-vault.service';
import { MpesaCallbackTrustService } from '../services/mpesa-callback-trust.service';
import { MpesaSignatureService } from '../services/mpesa-signature.service';

@Public()
@Controller(['payments/mpesa', 'mpesa'])
export class MpesaCallbackController {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);
    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  constructor(private readonly prisma: PrismaService, private readonly requestContext: RequestContextService,
    private readonly callbackLogsRepository: CallbackLogsRepository,
    private readonly mpesaService: MpesaService,
    private readonly mpesaSignatureService: MpesaSignatureService,
    private readonly mpesaReplayProtectionService: MpesaReplayProtectionService,
    private readonly paymentsJobProducerService: PaymentsJobProducerService,
    @Optional() private readonly structuredLogger?: StructuredLoggerService,
    @Optional() private readonly sloMetrics?: SloMetricsService,
    @Optional() private readonly tenantFinanceConfigService?: TenantFinanceConfigService,
    @Optional() private readonly databaseService?: PrismaService,
    @Optional() private readonly darajaIntegrationService?: DarajaIntegrationService,
    @Optional() private readonly mpesaPayloadVaultService?: MpesaPayloadVaultService,
    @Optional() private readonly mpesaCallbackTrustService?: MpesaCallbackTrustService,
    @Optional() private readonly mpesaCallbackChannelService?: MpesaCallbackChannelService,
    @Optional() private readonly mpesaVerificationJobsRepository?: MpesaVerificationJobsRepository,
  ) {}

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleCallback(@Req() request: Request): Promise<MpesaCallbackResponseDto> {
    return this.handleCallbackInternal(request, null);
  }

  @Post('callback/:channelId/:secretRef')
  @HttpCode(HttpStatus.OK)
  async handleChannelCallback(
    @Param('channelId') channelId: string,
    @Param('secretRef') secretRef: string,
    @Req() request: Request,
  ): Promise<MpesaCallbackResponseDto> {
    const callbackChannel = await this.resolveCallbackChannel(channelId, secretRef);

    return this.handleCallbackInternal(request, null, callbackChannel);
  }

  @Post('callback/:integrationId')
  @HttpCode(HttpStatus.OK)
  async handleIntegrationCallback(
    @Param('integrationId') integrationId: string,
    @Req() request: Request,
  ): Promise<MpesaCallbackResponseDto> {
    return this.handleCallbackInternal(request, integrationId);
  }

  private async handleCallbackInternal(
    request: Request,
    integrationId: string | null,
    callbackChannel: ResolvedMpesaCallbackChannel | null = null,
  ): Promise<MpesaCallbackResponseDto> {
    const requestContext = this.requestContext.requireStore();
    const rawBody = this.getRawBody(request);
    const inspection = this.mpesaSignatureService.inspectCallback(rawBody, request.headers);

    let parsedCallback:
      | ReturnType<MpesaService['parseCallbackPayload']>
      | null = null;
    let payloadError: Error | null = null;
    let signatureError: Error | null = null;
    let signatureVerified = false;
    const requiresEdgeSignature = callbackChannel?.requires_edge_signature ?? this.requiresEdgeSignature();

    try {
      parsedCallback = this.mpesaService.parseCallbackPayload(request.body);
    } catch (error) {
      payloadError = error as Error;
    }

    try {
      if (requiresEdgeSignature || inspection.signature) {
        this.mpesaSignatureService.verifyCallback(rawBody, request.headers, inspection);
        signatureVerified = true;
      }
    } catch (error) {
      signatureError = error as Error;
    }

    const resolvedTenant = await this.resolveCallbackTenant(
      request.body,
      parsedCallback,
      requestContext.tenant_id,
      integrationId,
      callbackChannel,
    );
    const tenantId = resolvedTenant.tenant_id;
    const payloadVaultRecord =
      request.body && typeof request.body === 'object'
        ? await this.mpesaPayloadVaultService?.storePayload({
          tenant_id: tenantId,
          source: 'callback_logs',
          source_id: inspection.delivery_id,
          purpose: 'stk_callback',
          payload: request.body as Record<string, unknown>,
        })
        : null;

    if (requestContext.tenant_id !== tenantId) {
      this.requestContext.setTenantId(tenantId);
      await this.prisma?.synchronizeRequestSession(this.requestContext.requireStore());
    }

    const callbackLog = await this.callbackLogsRepository.createLog({
      tenant_id: tenantId,
      merchant_request_id: parsedCallback?.merchant_request_id ?? null,
      checkout_request_id: parsedCallback?.checkout_request_id ?? null,
      mpesa_short_code: resolvedTenant.shortcode,
      delivery_id: inspection.delivery_id,
      request_fingerprint: inspection.request_fingerprint,
      event_timestamp: inspection.event_timestamp,
      signature: inspection.signature,
      signature_verified: signatureVerified,
      headers: request.headers as Record<string, unknown>,
      raw_body: rawBody,
      raw_payload:
        payloadVaultRecord?.redacted_payload ??
        (
          request.body && typeof request.body === 'object'
            ? redactMpesaOperationalPayload(request.body as Record<string, unknown>)
            : null
        ),
      raw_payload_encrypted_ref: payloadVaultRecord?.raw_payload_encrypted_ref ?? null,
      payload_sha256: payloadVaultRecord?.payload_sha256 ?? null,
      source_ip: this.getSourceIp(request),
    });

    if (payloadError) {
      await this.callbackLogsRepository.markRejected(tenantId, callbackLog.id, payloadError.message);
      throw new BadRequestException(payloadError.message);
    }

    if (signatureError && requiresEdgeSignature) {
      await this.callbackLogsRepository.markRejected(
        tenantId,
        callbackLog.id,
        signatureError.message,
      );
      throw signatureError;
    }

    if (!parsedCallback) {
      throw new BadRequestException('MPESA callback is missing required fields');
    }

    if (!integrationId) {
      try {
        await this.tenantFinanceConfigService?.assertCallbackBelongsToTenant({
          tenant_id: tenantId,
          payload: request.body,
          checkout_request_id: parsedCallback.checkout_request_id,
          merchant_request_id: parsedCallback.merchant_request_id,
        });
      } catch (error) {
        await this.callbackLogsRepository.markRejected(
          tenantId,
          callbackLog.id,
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }
    }

    const accepted = await this.mpesaReplayProtectionService.registerDelivery(
      tenantId,
      inspection.delivery_id,
    );

    if (!accepted) {
      await this.callbackLogsRepository.markReplayed(tenantId, callbackLog.id);
      return Object.assign(new MpesaCallbackResponseDto(), {
        accepted: true,
        duplicate: true,
        callback_log_id: callbackLog.id,
        checkout_request_id: parsedCallback?.checkout_request_id ?? null,
      });
    }

    if (!signatureVerified) {
      if (this.resolveCallbackTrustMode() !== 'manual_review_only') {
        if (!this.mpesaVerificationJobsRepository) {
          throw new BadRequestException('M-PESA verification jobs are not configured');
        }

        const verificationJob = await this.mpesaVerificationJobsRepository.createForStkCallback({
          tenant_id: tenantId,
          callback_log_id: callbackLog.id,
          checkout_request_id: parsedCallback.checkout_request_id,
          mpesa_receipt_number: parsedCallback.mpesa_receipt_number,
        });
        await this.paymentsJobProducerService.enqueueMpesaVerification?.({
          tenant_id: tenantId,
          verification_job_id: verificationJob.id,
          callback_log_id: callbackLog.id,
          checkout_request_id: parsedCallback.checkout_request_id,
          request_id: requestContext.request_id,
          trace_id: requestContext.trace_id,
          parent_span_id: requestContext.span_id,
          user_id: requestContext.user_id,
          role: requestContext.role,
          session_id: requestContext.session_id,
        });
      }

      return Object.assign(new MpesaCallbackResponseDto(), {
        accepted: true,
        duplicate: false,
        callback_log_id: callbackLog.id,
        checkout_request_id: parsedCallback.checkout_request_id,
      });
    }

    const enqueueStartedAt = performance.now();
    let enqueueResult;

    try {
      enqueueResult = await this.paymentsJobProducerService.enqueuePayment({
        tenant_id: tenantId,
        checkout_request_id: parsedCallback.checkout_request_id,
        callback_log_id: callbackLog.id,
        request_id: requestContext.request_id,
        trace_id: requestContext.trace_id,
        parent_span_id: requestContext.span_id,
        user_id: requestContext.user_id,
        role: requestContext.role,
        session_id: requestContext.session_id,
      });
      this.sloMetrics?.recordQueueEnqueue({
        queue_name: PAYMENTS_QUEUE_NAME,
        job_name: PAYMENTS_PROCESS_JOB,
        outcome: 'success',
        duration_ms: performance.now() - enqueueStartedAt,
      });
      this.structuredLogger?.logEvent('queue.job.enqueued', {
        queue_name: PAYMENTS_QUEUE_NAME,
        job_name: PAYMENTS_PROCESS_JOB,
        job_id: enqueueResult.job_id,
        callback_log_id: callbackLog.id,
        checkout_request_id: parsedCallback.checkout_request_id,
        queue_lag_ms: 0,
      });
    } catch (error) {
      await this.callbackLogsRepository.markFailed(
        tenantId,
        callbackLog.id,
        error instanceof Error ? error.message : String(error),
      );
      this.sloMetrics?.recordQueueEnqueue({
        queue_name: PAYMENTS_QUEUE_NAME,
        job_name: PAYMENTS_PROCESS_JOB,
        outcome: 'failure',
        duration_ms: performance.now() - enqueueStartedAt,
        error_message: error instanceof Error ? error.message : String(error),
      });
      this.structuredLogger?.logEvent(
        'queue.job.enqueue_failed',
        {
          queue_name: PAYMENTS_QUEUE_NAME,
          job_name: PAYMENTS_PROCESS_JOB,
          callback_log_id: callbackLog.id,
          checkout_request_id: parsedCallback.checkout_request_id,
          error_message: error instanceof Error ? error.message : String(error),
        },
        'error',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }

    if (enqueueResult.deduplicated && enqueueResult.state === 'completed') {
      await this.callbackLogsRepository.markProcessed(tenantId, callbackLog.id);
    } else {
      await this.callbackLogsRepository.markQueued(
        tenantId,
        callbackLog.id,
        enqueueResult.job_id,
      );
    }

    return Object.assign(new MpesaCallbackResponseDto(), {
      accepted: true,
      duplicate: enqueueResult.deduplicated,
      callback_log_id: callbackLog.id,
      checkout_request_id: parsedCallback?.checkout_request_id ?? null,
    });
  }

  private getRawBody(request: Request): string {
    if ((request as any).rawBody) {
      return (request as any).rawBody.toString('utf8');
    }

    if (typeof request.body === 'string') {
      return request.body;
    }

    return JSON.stringify(request.body ?? {});
  }

  private requiresEdgeSignature(): boolean {
    return this.mpesaCallbackTrustService?.requiresEdgeSignature() ?? true;
  }

  private resolveCallbackTrustMode(): string {
    const trustService = this.mpesaCallbackTrustService as
      | { resolveMode?: () => string; requiresEdgeSignature?: () => boolean }
      | undefined;

    return trustService?.resolveMode?.() ??
      (trustService?.requiresEdgeSignature?.() === false ? 'daraja_direct' : 'edge_signed');
  }

  private async resolveCallbackChannel(
    channelId: string,
    secretRef: string,
  ): Promise<ResolvedMpesaCallbackChannel> {
    if (!this.mpesaCallbackChannelService) {
      throw new UnauthorizedException('M-PESA callback channel verification is unavailable');
    }

    return this.mpesaCallbackChannelService.resolveChannelBySecret({
      channel_id: channelId,
      secret_ref: secretRef,
    });
  }

  private getSourceIp(request: Request): string | null {
    const forwardedFor = request.headers['x-forwarded-for'];

    if (Array.isArray(forwardedFor)) {
      return forwardedFor[0] ?? null;
    }

    if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
      return forwardedFor.split(',')[0]?.trim() ?? null;
    }

    return request.ip || null;
  }

  private async resolveCallbackTenant(
    payload: unknown,
    parsedCallback:
      | ReturnType<MpesaService['parseCallbackPayload']>
      | null,
    fallbackTenantId: string | null,
    integrationId: string | null,
    callbackChannel: ResolvedMpesaCallbackChannel | null,
  ): Promise<{ tenant_id: string; shortcode: string | null }> {
    if (callbackChannel) {
      return {
        tenant_id: callbackChannel.tenant_id,
        shortcode: callbackChannel.shortcode,
      };
    }

    if (integrationId && this.darajaIntegrationService) {
      const integration = await this.darajaIntegrationService.getCredentialsForCallback(integrationId);

      if (!integration) {
        throw new UnauthorizedException('Daraja integration is not active');
      }

      return {
        tenant_id: integration.tenant_id,
        shortcode: integration.shortcode ?? integration.paybill_number ?? integration.till_number,
      };
    }

    if (this.tenantFinanceConfigService) {
      return this.tenantFinanceConfigService.resolveTenantForMpesaCallback({
        payload,
        checkout_request_id: parsedCallback?.checkout_request_id ?? null,
        merchant_request_id: parsedCallback?.merchant_request_id ?? null,
        fallback_tenant_id: fallbackTenantId,
      });
    }

    if (!fallbackTenantId) {
      throw new UnauthorizedException('Tenant context is required for MPESA callbacks');
    }

    return { tenant_id: fallbackTenantId, shortcode: null };
  }
}
