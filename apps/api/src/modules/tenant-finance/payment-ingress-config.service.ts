import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isIP } from 'node:net';
import type { PaymentChannelRevision } from './payment-channel-workflow.types';

// Hex avoids provider-blocked words in school slugs without changing school identity.
export function decodeCallbackSchool(value: string): string {
  if (!/^(?:[a-f0-9]{2}){3,64}$/.test(value)) throw new UnauthorizedException('Unknown school callback');
  const school = Buffer.from(value, 'hex').toString('utf8');
  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(school)) throw new UnauthorizedException('Unknown school callback');
  return school;
}

function darajaCallbackUrl(value: string): string {
  // Daraja C2B URL restrictions apply to the entire URL, including host and prefix.
  // https://developer.safaricom.co.ke/apis/CustomerToBusiness (Register URL v2)
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (/safaricom|mpesa|exe|cmd|sql|query|ngrok|mockbin|requestbin/.test(normalized)) {
    throw new BadRequestException('The payment callback address contains a provider-blocked term or URL testing service. Configure a public school-platform callback URL.');
  }
  return value;
}

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
    const daraja = revision.provider_code === 'safaricom';
    const path = [daraja ? 'c2b' : revision.provider_code, revision.environment,
      daraja ? Buffer.from(revision.tenant_id, 'utf8').toString('hex') : revision.tenant_id, revision.id, token]
      .map(encodeURIComponent).join('/');
    const base = `${this.base()}/${path}`;
    return { confirmation_url: daraja ? darajaCallbackUrl(`${base}/confirmation`) : `${base}/confirmation`,
      validation_url: daraja ? darajaCallbackUrl(`${base}/validation`) : `${base}/validation` };
  }

  resultUrl(tenant: string, requestId: string, token: string, kind: 'result' | 'timeout') {
    return darajaCallbackUrl(`${this.base()}/check/${Buffer.from(tenant, 'utf8').toString('hex')}/${requestId}/${token}/${kind}`);
  }

  stkUrl(revision: PaymentChannelRevision, token: string) {
    if (!revision.environment || !/^[a-f0-9]{64}$/.test(token))
      throw new BadRequestException('Connect the approved channel before registering callbacks');
    return `${this.base().replace(/\/payments\/ingress$/, '/payments/mpesa/callback')}/${encodeURIComponent(revision.tenant_id)}/${revision.id}/${token}`;
  }
}
