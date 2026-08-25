import { BadRequestException, Injectable, Optional, UnauthorizedException } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { PiiEncryptionService } from '../security/pii-encryption.service';
import {
  CreateSmsPurchaseRequestDto,
  SendBulkSmsDto,
  SendSmsDto,
} from './dto/integrations.dto';
import { PlatformSmsService } from './platform-sms.service';
import { SchoolSmsWalletRepository } from './school-sms-wallet.repository';
import { SmsDispatchService, SmsProviderDispatchError } from './sms-dispatch.service';

class SmsDeliveryUnknownException extends BadRequestException {}

@Injectable()
export class SchoolSmsWalletService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly schoolSmsWalletRepository: SchoolSmsWalletRepository,
    @Optional() private readonly piiEncryptionService?: PiiEncryptionService,
    @Optional() private readonly platformSmsService?: PlatformSmsService,
    @Optional() private readonly smsDispatchService?: SmsDispatchService,
  ) {}

  async getWallet(): Promise<Record<string, unknown>> {
    const wallet = await this.schoolSmsWalletRepository.getOrCreateWallet(this.requireTenantId());

    return {
      tenant_id: wallet.tenant_id,
      sms_balance: wallet.sms_balance,
      monthly_used: wallet.monthly_used,
      monthly_limit: wallet.monthly_limit,
      sms_plan: wallet.sms_plan,
      low_balance_threshold: wallet.low_balance_threshold,
      allow_negative_balance: wallet.allow_negative_balance,
      billing_status: wallet.billing_status,
      low_balance: wallet.sms_balance <= wallet.low_balance_threshold,
      updated_at: wallet.updated_at,
    };
  }

  async listLogs(limit?: number): Promise<Array<Record<string, unknown>>> {
    return this.schoolSmsWalletRepository.listLogs(this.requireTenantId(), limit);
  }

  async getReadiness(): Promise<Record<string, unknown>> {
    const readiness = await this.smsDispatchService?.getReadiness();

    if (!readiness) {
      return {
        status: 'missing_provider',
        can_send: false,
        disabled_reason: this.describeSmsReadinessFailure('missing_provider'),
      };
    }

    return {
      status: readiness.status,
      can_send: readiness.status === 'configured',
      disabled_reason:
        readiness.status === 'configured'
          ? null
          : this.describeSmsReadinessFailure(readiness.status),
      missing: readiness.missing ?? [],
    };
  }

  async createPurchaseRequest(dto: CreateSmsPurchaseRequestDto): Promise<Record<string, unknown>> {
    return this.schoolSmsWalletRepository.createPurchaseRequest({
      tenant_id: this.requireTenantId(),
      quantity: dto.quantity,
      note: dto.note?.trim() || null,
      requested_by_user_id: this.getActorUserId(),
    });
  }

  async sendSms(dto: SendSmsDto): Promise<Record<string, unknown>> {
    const tenantId = this.requireTenantId();
    const recipient = dto.recipient.trim();
    const message = dto.message.trim();
    const creditCost = this.calculateCreditCost(message);

    if (!this.smsDispatchService) {
      throw new BadRequestException('SMS dispatch service is unavailable; no credits were reserved');
    }

    const dispatchReadiness = await this.smsDispatchService?.getReadiness();

    if (dispatchReadiness && dispatchReadiness.status !== 'configured') {
      throw new BadRequestException(this.describeSmsReadinessFailure(dispatchReadiness.status));
    }

    const reserved = await this.schoolSmsWalletRepository.reserveSmsCredits({
      tenant_id: tenantId,
      recipient_ciphertext: this.encrypt(recipient, `sms:${tenantId}:recipient`),
      recipient_last4: this.last4(recipient),
      recipient_hash: this.schoolSmsWalletRepository.hashRecipient
        ? this.schoolSmsWalletRepository.hashRecipient(recipient)
        : this.fallbackHash(recipient),
      message_ciphertext: this.encrypt(message, `sms:${tenantId}:message`),
      message_preview: this.preview(message),
      message_type: dto.message_type?.trim() || 'general',
      credit_cost: creditCost,
      sent_by_user_id: this.getActorUserId(),
    });

    if (!reserved.accepted) {
      throw new BadRequestException(reserved.reason ?? 'SMS balance exhausted');
    }

    let dispatchResult: Awaited<ReturnType<SmsDispatchService['send']>>;
    try {
      dispatchResult = await this.smsDispatchService.send({
        tenant_id: tenantId,
        to: recipient,
        message,
        source: dto.message_type?.trim() || 'school_sms',
        metadata: { dispatch_key: `sms-wallet:${tenantId}:${reserved.log_id}` },
      });
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : 'SMS dispatch failed';

      if (error instanceof SmsProviderDispatchError && error.acceptanceUnknown) {
        await this.schoolSmsWalletRepository.markSmsLogDeliveryUnknown?.({
          tenant_id: tenantId,
          log_id: reserved.log_id,
          failure_reason: failureReason,
        });
        throw new SmsDeliveryUnknownException(
          'SMS provider outcome is unknown. Credits remain reserved and the message requires delivery review.',
        );
      }

      await this.schoolSmsWalletRepository.markSmsLogFailedAndRefund({
        tenant_id: tenantId,
        log_id: reserved.log_id,
        credit_cost: reserved.credit_cost ?? creditCost,
        failure_reason: failureReason,
        reason: 'sms_dispatch_failed',
        actor_user_id: this.getActorUserId(),
      });
      throw new BadRequestException('SMS provider rejected the message. Credits were not used.');
    }

    const providerMessageId = dispatchResult.provider_message_id
      ?? `${dispatchResult.provider_code}:${reserved.log_id}`;

    try {
      await this.schoolSmsWalletRepository.markSmsLogProviderAccepted({
        tenant_id: tenantId,
        log_id: reserved.log_id,
        provider_id: dispatchResult.provider_id,
        provider_message_id: providerMessageId,
      });
    } catch (error) {
      const failureReason = error instanceof Error
        ? `Provider accepted SMS but receipt persistence failed: ${error.message}`
        : 'Provider accepted SMS but receipt persistence failed';

      await this.schoolSmsWalletRepository.markSmsLogDeliveryUnknown({
        tenant_id: tenantId,
        log_id: reserved.log_id,
        provider_id: dispatchResult.provider_id,
        provider_message_id: providerMessageId,
        failure_reason: failureReason,
      });
      throw new SmsDeliveryUnknownException(
        'SMS was accepted by the provider, but receipt persistence failed. Credits remain reserved and delivery requires review.',
      );
    }

    return {
      status: 'provider_accepted',
      log_id: reserved.log_id,
      balance_after: reserved.balance_after,
      credit_cost: reserved.credit_cost ?? creditCost,
      low_balance: reserved.balance_after <= 100,
    };
  }

  async sendBulkSms(dto: SendBulkSmsDto): Promise<Record<string, unknown>> {
    const message = dto.message.trim();
    const messageType = dto.message_type?.trim() || 'bulk';
    const providerAccepted: Array<Record<string, unknown>> = [];
    const deliveryUnknown: Array<Record<string, unknown>> = [];
    const failed: Array<Record<string, unknown>> = [];
    const skipped: Array<Record<string, unknown>> = [];

    for (const [index, recipientInput] of dto.recipients.entries()) {
      const recipient = recipientInput.recipient?.trim() ?? '';
      const recipientId = recipientInput.recipient_id?.trim() || `recipient-${index + 1}`;

      if (!recipient) {
        skipped.push({
          recipient_id: recipientId,
          name: recipientInput.name?.trim() || null,
          reason: 'missing_phone_number',
        });
        continue;
      }

      try {
        const result = await this.sendSms({
          recipient,
          message,
          message_type: messageType,
        });

        providerAccepted.push({
          recipient_id: recipientId,
          name: recipientInput.name?.trim() || null,
          recipient_last4: this.last4(recipient),
          status: result.status,
          log_id: result.log_id,
          credit_cost: result.credit_cost,
        });
      } catch (error) {
        if (error instanceof SmsDeliveryUnknownException) {
          deliveryUnknown.push({
            recipient_id: recipientId,
            name: recipientInput.name?.trim() || null,
            recipient_last4: this.last4(recipient),
            status: 'delivery_unknown',
            reason: error.message,
          });
          continue;
        }

        failed.push({
          recipient_id: recipientId,
          name: recipientInput.name?.trim() || null,
          recipient_last4: this.last4(recipient),
          reason: error instanceof Error ? error.message : 'SMS send failed',
        });
      }
    }

    return {
      status: failed.length
        ? (providerAccepted.length || deliveryUnknown.length ? 'partial' : 'failed')
        : deliveryUnknown.length
          ? (providerAccepted.length ? 'partial' : 'review_required')
          : 'processed',
      message_type: messageType,
      total: dto.recipients.length,
      provider_accepted_count: providerAccepted.length,
      delivery_unknown_count: deliveryUnknown.length,
      failed_count: failed.length,
      skipped_count: skipped.length,
      provider_accepted: providerAccepted,
      delivery_unknown: deliveryUnknown,
      failed,
      skipped,
    };
  }

  calculateCreditCost(message: string): number {
    const normalized = message.trim();

    if (!normalized) {
      return 1;
    }

    const singleSegmentLimit = 160;
    const multipartSegmentLimit = 153;

    if (normalized.length <= singleSegmentLimit) {
      return 1;
    }

    return Math.ceil(normalized.length / multipartSegmentLimit);
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for SMS operations');
    }

    return tenantId;
  }

  private getActorUserId(): string | null {
    const userId = this.requestContext.getStore()?.user_id;
    return userId && userId !== 'anonymous' ? userId : null;
  }

  private encrypt(value: string, aad: string): string {
    return this.piiEncryptionService?.encrypt(value, aad) ?? value;
  }

  private last4(value: string): string | null {
    const digits = value.replace(/\D/g, '');
    return digits ? digits.slice(-4) : null;
  }

  private preview(message: string): string {
    return message.replace(/\s+/g, ' ').slice(0, 120);
  }

  private fallbackHash(value: string): string {
    return value.replace(/\D/g, '');
  }

  private describeSmsReadinessFailure(status: string): string {
    if (status === 'missing_provider') {
      return 'SMS provider is not configured by the platform owner';
    }

    if (status === 'missing_credentials') {
      return 'SMS provider credentials are incomplete';
    }

    if (status === 'degraded') {
      return 'SMS provider is degraded. Try again after support confirms delivery is healthy';
    }

    return 'SMS provider is not ready';
  }
}
