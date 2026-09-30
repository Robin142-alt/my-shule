import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isIP } from 'node:net';
import type { PaymentChannelRevision } from './payment-channel-workflow.types';

export function canonicalPaymentBase(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new BadRequestException('Configure PAYMENT_CALLBACK_BASE_URL'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      isIP(host.replace(/^\[|\]$/g, '')) || !host.includes('.') ||
      /(^|\.)(localhost|local|internal|test|invalid)$/.test(host) ||
      /%|\/\//.test(url.pathname) || !url.pathname.endsWith('/payments/ingress')) {
    throw new BadRequestException('PAYMENT_CALLBACK_BASE_URL must be the public HTTPS URL ending in /payments/ingress');
  }
  return url.toString().replace(/\/$/, '');
}

@Injectable()
export class PaymentIngressConfigService {
  constructor(private readonly config: ConfigService) {}

  base(): string {
    return canonicalPaymentBase(this.config.get<string>('payments.callbackBaseUrl') ?? process.env.PAYMENT_CALLBACK_BASE_URL ?? '');
  }

  urls(revision: Pick<PaymentChannelRevision, 'id' | 'tenant_id' | 'provider_code' | 'environment'>, token: string) {
    if (!revision.environment || !/^[a-f0-9]{64}$/.test(token))
      throw new BadRequestException('Connect the approved channel before registering callbacks');
    const path = [revision.provider_code, revision.environment, revision.tenant_id, revision.id, token]
      .map(encodeURIComponent).join('/');
    const base = `${this.base()}/${path}`;
    return { confirmation_url: `${base}/confirmation`, validation_url: `${base}/validation` };
  }

  resultUrl(tenant: string, requestId: string, token: string, kind: 'result' | 'timeout') {
    return `${this.base()}/verification/${encodeURIComponent(tenant)}/${requestId}/${token}/${kind}`;
  }

  stkUrl(revision: PaymentChannelRevision, token: string) {
    this.urls(revision,token); // Validate the canonical base and capability.
    return `${this.base().replace(/\/payments\/ingress$/, '/payments/mpesa/callback')}/${encodeURIComponent(revision.tenant_id)}/${revision.id}/${token}`;
  }
}
