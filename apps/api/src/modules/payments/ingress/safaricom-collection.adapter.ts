import { BadGatewayException, BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { MpesaSignatureService } from '../services/mpesa-signature.service';
import { normalizeCollectionInput, CollectionPaymentInput } from '../collection-payment.types';
import type { CollectionAdapter, CollectionAdapterChannel, CollectionVerification } from './collection-adapter';

function text(value: unknown, name: string): string {
  if (!['string', 'number'].includes(typeof value) || !String(value).trim() || String(value).length > 120)
    throw new BadRequestException(`Invalid Safaricom ${name}`);
  return String(value).trim();
}
export function safaricomMinor(value: unknown): string {
  const amount = String(value ?? '');
  if (!/^\d{1,16}(\.\d{1,2})?$/.test(amount)) throw new BadRequestException('Invalid Safaricom amount');
  const [major, fraction = ''] = amount.split('.');
  return (BigInt(major) * 100n + BigInt(fraction.padEnd(2, '0'))).toString();
}

@Injectable()
export class SafaricomCollectionAdapter implements CollectionAdapter {
  readonly provider = 'safaricom';
  constructor(private readonly signature: MpesaSignatureService) {}

  authenticate(channel: CollectionAdapterChannel, raw: string, headers: IncomingHttpHeaders) {
    // The controller has already checked the revision-specific bearer capability.
    // Neither that capability nor a gateway HMAC alone proves settlement.
    if (channel.credentials._callback_trust_mode === 'edge_signed') this.signature.verifyCallback(raw, headers);
    else if (channel.credentials._callback_trust_mode !== 'daraja_direct') throw new UnauthorizedException('Callback authentication mode is not configured');
  }

  parse(payload: unknown): CollectionPaymentInput {
    const body = payload as Record<string, unknown>;
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Invalid Safaricom confirmation');
    const time = text(body.TransTime, 'TransTime');
    if (!/^\d{14}$/.test(time)) throw new BadRequestException('Invalid Safaricom transaction time');
    const date = `${time.slice(0,4)}-${time.slice(4,6)}-${time.slice(6,8)}T${time.slice(8,10)}:${time.slice(10,12)}:${time.slice(12,14)}+03:00`;
    const instant = new Date(date);
    if (!Number.isFinite(instant.getTime()) ||
        new Date(instant.getTime() + 10800000).toISOString().slice(0,19).replace(/[-:T]/g, '') !== time)
      throw new BadRequestException('Invalid Safaricom transaction time');
    return normalizeCollectionInput({ provider_code: this.provider,
      provider_transaction_id: text(body.TransID, 'TransID'),
      destination_account: text(body.BusinessShortCode, 'BusinessShortCode'),
      amount_minor: safaricomMinor(body.TransAmount), currency_code: 'KES',
      account_reference: String(body.BillRefNumber || body.InvoiceNumber || '').trim(), occurred_at: instant.toISOString() });
  }

  async requestVerification(channel: CollectionAdapterChannel, payment: CollectionPaymentInput, urls: { result: string; timeout: string }) {
    const c = channel.credentials;
    if (!c.consumer_key || !c.consumer_secret || !c.initiator_name || !c.security_credential)
      throw new BadRequestException('School transaction-status credentials are incomplete');
    const base = channel.revision.environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
    const auth = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${Buffer.from(`${c.consumer_key}:${c.consumer_secret}`).toString('base64')}` },
      redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    if (!auth.ok) throw new BadGatewayException('Safaricom authentication is unavailable');
    const token = await auth.json() as { access_token?: string };
    if (!token.access_token) throw new BadGatewayException('Safaricom did not return an access token');
    const response = await fetch(`${base}/mpesa/transactionstatus/v1/query`, {
      method: 'POST', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
      redirect: 'error', signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ Initiator: c.initiator_name, SecurityCredential: c.security_credential,
        CommandID: 'TransactionStatusQuery', TransactionID: payment.provider_transaction_id,
        PartyA: channel.revision.account_number, IdentifierType: '4', ResultURL: urls.result,
        QueueTimeOutURL: urls.timeout, Remarks: 'School fee verification', Occasion: 'fee-payment' }),
    });
    const result = await response.json() as { ResponseCode?: string; ConversationID?: string };
    if (!response.ok || String(result.ResponseCode) !== '0' || !result.ConversationID)
      throw new BadGatewayException('Safaricom did not accept the verification request');
    return { conversation_id: result.ConversationID };
  }

  parseVerification(payload: unknown): CollectionVerification {
    const result = (payload as { Result?: Record<string, any> })?.Result;
    if (!result || typeof result.ConversationID !== 'string' || result.ResultCode === undefined)
      throw new BadRequestException('Invalid Safaricom verification result');
    const items = result.ResultParameters?.ResultParameter ?? [];
    if (!Array.isArray(items) || items.length > 100) throw new BadRequestException('Invalid verification parameters');
    const params = new Map<string, unknown>();
    for (const item of items) {
      if (typeof item?.Key !== 'string' || params.has(item.Key)) throw new BadRequestException('Ambiguous verification parameters');
      params.set(item.Key, item.Value);
    }
    const amount = params.get('Amount') ?? params.get('TransactionAmount');
    return { conversation_id: result.ConversationID,
      settled: String(result.ResultCode) === '0' && params.get('TransactionStatus') === 'Completed',
      provider_transaction_id: String(params.get('ReceiptNo') ?? '').toUpperCase(),
      destination_account: String(params.get('CreditPartyName') ?? params.get('ReceiverPartyPublicName') ?? '').split(/\s+-\s+/)[0].trim(),
      amount_minor: amount == null ? '' : safaricomMinor(amount), currency_code: 'KES',
      ...(params.has('BillRefNumber') ? { account_reference: String(params.get('BillRefNumber')) } : {}),
    };
  }
}
