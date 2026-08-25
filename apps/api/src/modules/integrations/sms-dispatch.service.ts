import { Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PlatformSmsService } from './platform-sms.service';
import type { PlatformSmsProviderRecord } from './integrations.types';
import {
  assertSafeSmsProviderUrl,
  parseAdditionalSmsProviderHosts,
  UnsafeSmsProviderUrlError,
} from './sms-provider-url';

export type SmsDispatchReadinessStatus =
  | 'configured'
  | 'missing_provider'
  | 'missing_credentials'
  | 'degraded';

export interface SmsDispatchReadiness {
  status: SmsDispatchReadinessStatus;
  provider: {
    id: string;
    provider_name: string;
    provider_code: string;
    is_active: boolean;
    is_default: boolean;
    sender_id_configured: boolean;
    base_url_configured: boolean;
    username_configured: boolean;
    last_test_status: string | null;
  } | null;
  missing: string[];
}

export interface SmsDispatchInput {
  tenant_id?: string | null;
  to: string;
  message: string;
  title?: string | null;
  metadata?: Record<string, unknown>;
  source?: string;
}

export interface SmsDispatchResult {
  status: 'provider_accepted';
  provider_id: string;
  provider_code: string;
  provider_message_id: string | null;
}

export class SmsProviderDispatchError extends ServiceUnavailableException {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly providerStatusCode: number | null = null,
    readonly acceptanceUnknown = false,
  ) {
    super(message);
  }
}

type DispatchProvider = {
  provider: PlatformSmsProviderRecord;
  api_key: string;
  username: string | null;
};

@Injectable()
export class SmsDispatchService {
  constructor(
    private readonly platformSmsService: PlatformSmsService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  async getReadiness(): Promise<SmsDispatchReadiness> {
    const dispatchProvider = await this.platformSmsService.getDefaultProviderForDispatch();

    if (!dispatchProvider) {
      return {
        status: 'missing_provider',
        provider: null,
        missing: ['default_provider'],
      };
    }

    const missing = this.getMissingDispatchFields(dispatchProvider);
    const provider = this.toReadinessProvider(dispatchProvider);

    if (missing.length > 0) {
      return {
        status: 'missing_credentials',
        provider,
        missing,
      };
    }

    if (dispatchProvider.provider.last_test_status === 'failed') {
      return {
        status: 'degraded',
        provider,
        missing: [],
      };
    }

    return {
      status: 'configured',
      provider,
      missing: [],
    };
  }

  async send(input: SmsDispatchInput): Promise<SmsDispatchResult> {
    const dispatchProvider = await this.platformSmsService.getDefaultProviderForDispatch();

    if (!dispatchProvider) {
      throw new ServiceUnavailableException('No active platform SMS provider is configured');
    }

    const missing = this.getMissingDispatchFields(dispatchProvider);

    if (missing.length > 0) {
      throw new ServiceUnavailableException(`Platform SMS provider is missing ${missing.join(', ')}`);
    }

    const responsePayload = await this.callProvider(dispatchProvider, input);
    this.assertProviderAccepted(responsePayload);

    return {
      status: 'provider_accepted',
      provider_id: dispatchProvider.provider.id,
      provider_code: dispatchProvider.provider.provider_code,
      provider_message_id: this.extractProviderMessageId(responsePayload),
    };
  }

  private async callProvider(
    dispatchProvider: DispatchProvider,
    input: SmsDispatchInput,
  ): Promise<unknown> {
    const provider = dispatchProvider.provider;
    const url = provider.base_url?.trim();

    if (!url) {
      throw new ServiceUnavailableException('Platform SMS provider endpoint is not configured');
    }

    this.assertSafeProviderUrl(url, provider.provider_code);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.getRequestTimeoutMs());

    try {
      const request = this.buildProviderRequest(dispatchProvider, input);
      const response = await fetch(url, {
        ...request,
        redirect: 'error',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new SmsProviderDispatchError(
          `SMS provider returned ${response.status}`,
          response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500,
          response.status,
          response.status === 408 || response.status >= 500,
        );
      }

      return this.readResponsePayload(response);
    } catch (error) {
      if (error instanceof SmsProviderDispatchError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new SmsProviderDispatchError('SMS provider request timed out', false, null, true);
      }

      throw new SmsProviderDispatchError('SMS provider request failed', false, null, true);
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildProviderRequest(
    dispatchProvider: DispatchProvider,
    input: SmsDispatchInput,
  ): RequestInit {
    const provider = dispatchProvider.provider;
    const message = input.message.trim();
    const to = input.to.trim();
    const senderId = provider.sender_id.trim();
    const idempotencyKey = typeof input.metadata?.dispatch_key === 'string'
      ? input.metadata.dispatch_key.trim()
      : '';
    const idempotencyHeaders: Record<string, string> = idempotencyKey
      ? { 'Idempotency-Key': idempotencyKey }
      : {};

    if (provider.provider_code === 'africas_talking') {
      const body = new URLSearchParams();
      body.set('username', dispatchProvider.username ?? 'sandbox');
      body.set('to', to);
      body.set('message', message);

      if (senderId) {
        body.set('from', senderId);
      }

      return {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          apiKey: dispatchProvider.api_key,
          ...idempotencyHeaders,
        },
        body,
      };
    }

    if (provider.provider_code === 'twilio') {
      const body = new URLSearchParams();
      body.set('To', to);
      body.set('From', senderId);
      body.set('Body', message);

      const authUsername = dispatchProvider.username ?? provider.sender_id;
      const authToken = Buffer.from(`${authUsername}:${dispatchProvider.api_key}`).toString('base64');

      return {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${authToken}`,
          ...idempotencyHeaders,
        },
        body,
      };
    }

    return {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dispatchProvider.api_key}`,
        ...idempotencyHeaders,
      },
      body: JSON.stringify({
        to,
        message,
        sender_id: senderId,
        tenant_id: input.tenant_id ?? null,
        source: input.source ?? 'myshule',
        metadata: input.metadata ?? {},
      }),
    };
  }

  private async readResponsePayload(response: Response): Promise<unknown> {
    const text = await response.text();

    if (!text.trim()) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private extractProviderMessageId(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const record = payload as Record<string, unknown>;
    const directId = record.message_id ?? record.messageId ?? record.id;

    if (typeof directId === 'string' && directId.trim()) {
      return directId;
    }

    const smsMessageData = record.SMSMessageData;

    if (smsMessageData && typeof smsMessageData === 'object') {
      const recipients = (smsMessageData as Record<string, unknown>).Recipients;

      if (Array.isArray(recipients)) {
        const first = recipients[0] as Record<string, unknown> | undefined;
        const messageId = first?.messageId ?? first?.message_id;

        if (typeof messageId === 'string' && messageId.trim()) {
          return messageId;
        }
      }
    }

    return null;
  }

  private assertProviderAccepted(payload: unknown): void {
    if (typeof payload === 'string') {
      if (/^\s*(?:error|failed|rejected|invalid)\b/i.test(payload)) {
        throw new SmsProviderDispatchError('SMS provider rejected the message', false);
      }
      return;
    }

    if (!payload || typeof payload !== 'object') {
      return;
    }

    const record = payload as Record<string, unknown>;

    if (
      record.success === false
      || record.accepted === false
      || record.error
      || (Array.isArray(record.errors) && record.errors.length > 0)
    ) {
      throw new SmsProviderDispatchError('SMS provider rejected the message', false);
    }

    const statuses: unknown[] = [record.status, record.delivery_status];
    const statusCodes: unknown[] = [record.statusCode, record.status_code, record.error_code];
    const smsMessageData = record.SMSMessageData;

    if (smsMessageData && typeof smsMessageData === 'object') {
      const recipients = (smsMessageData as Record<string, unknown>).Recipients;

      if (Array.isArray(recipients)) {
        for (const recipient of recipients) {
          if (!recipient || typeof recipient !== 'object') {
            continue;
          }

          const recipientRecord = recipient as Record<string, unknown>;
          if (recipientRecord.success === false || recipientRecord.accepted === false) {
            throw new SmsProviderDispatchError('SMS provider rejected the message', false);
          }
          statuses.push(recipientRecord.status);
          statusCodes.push(
            recipientRecord.statusCode,
            recipientRecord.status_code,
            recipientRecord.errorCode,
          );
        }
      }
    }

    const explicitlyRejected = statuses.some(
      (status) => typeof status === 'string'
        && /(?:fail|reject|invalid|undeliver|not[ _-]?sent|error)/i.test(status),
    );
    const rejectedCode = statusCodes.some((statusCode) => {
      if (statusCode === null || statusCode === undefined || statusCode === '') {
        return false;
      }

      const parsed = Number(statusCode);
      return Number.isFinite(parsed) && parsed >= 400;
    });

    if (explicitlyRejected || rejectedCode) {
      throw new SmsProviderDispatchError('SMS provider rejected the message', false);
    }
  }

  private getRequestTimeoutMs(): number {
    const configured = Number(
      this.configService?.get<number | string>('communication.smsProviderRequestTimeoutMs')
        ?? 10_000,
    );

    if (!Number.isFinite(configured)) {
      return 10_000;
    }

    return Math.min(Math.max(Math.trunc(configured), 1_000), 60_000);
  }

  private assertSafeProviderUrl(
    value: string,
    providerCode: PlatformSmsProviderRecord['provider_code'],
  ): void {
    try {
      assertSafeSmsProviderUrl(
        value,
        providerCode,
        parseAdditionalSmsProviderHosts(
          this.configService?.get<string>('communication.smsProviderAllowedHosts'),
        ),
      );
    } catch (error) {
      if (error instanceof UnsafeSmsProviderUrlError) {
        throw new SmsProviderDispatchError(error.message, false);
      }
      throw error;
    }
  }

  private getMissingDispatchFields(dispatchProvider: DispatchProvider): string[] {
    const missing: string[] = [];

    if (!dispatchProvider.api_key.trim()) {
      missing.push('api_key');
    }

    if (!dispatchProvider.provider.sender_id.trim()) {
      missing.push('sender_id');
    }

    if (!dispatchProvider.provider.base_url?.trim()) {
      missing.push('base_url');
    }

    if (dispatchProvider.provider.provider_code === 'africas_talking' && !dispatchProvider.username?.trim()) {
      missing.push('username');
    }

    return missing;
  }

  private toReadinessProvider(dispatchProvider: DispatchProvider): SmsDispatchReadiness['provider'] {
    const provider = dispatchProvider.provider;

    return {
      id: provider.id,
      provider_name: provider.provider_name,
      provider_code: provider.provider_code,
      is_active: provider.is_active,
      is_default: provider.is_default,
      sender_id_configured: provider.sender_id.trim().length > 0,
      base_url_configured: Boolean(provider.base_url?.trim()),
      username_configured: Boolean(dispatchProvider.username?.trim()),
      last_test_status: provider.last_test_status,
    };
  }
}
