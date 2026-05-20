import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import { TenantFinanceConfigService } from '../../tenant-finance/tenant-finance-config.service';
import { ResolvedTenantMpesaConfig } from '../../tenant-finance/tenant-finance.types';
import { MPESA_ACCESS_TOKEN_CACHE_KEY } from '../payments.constants';

interface OAuthTokenResponse {
  access_token?: string;
  expires_in?: string | number;
}

interface StkPushQueryResponse {
  ResponseCode?: string | number;
  ResponseDescription?: string;
  ResultCode?: string | number;
  ResultDesc?: string;
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
}

interface C2bTransactionStatusResponse {
  ResponseCode?: string | number;
  ResponseDescription?: string;
  ResultCode?: string | number;
  ResultDesc?: string;
  TransID?: string;
  TransactionID?: string;
  TransAmount?: string | number;
  Amount?: string | number;
}

export type MpesaProviderVerificationStatus =
  | 'provider_verified'
  | 'provider_failed'
  | 'provider_pending';

export interface MpesaTransactionStatusResult {
  provider_status: MpesaProviderVerificationStatus;
  checkout_request_id: string;
  merchant_request_id: string | null;
  result_code: string | null;
  result_desc: string | null;
  raw_provider_response: Record<string, unknown>;
}

export interface MpesaC2bTransactionStatusResult {
  provider_status: MpesaProviderVerificationStatus;
  trans_id: string;
  result_code: string | null;
  result_desc: string | null;
  amount_minor: string | null;
  raw_provider_response: Record<string, unknown>;
}

@Injectable()
export class MpesaTransactionStatusService {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly tenantFinanceConfigService: TenantFinanceConfigService,
  ) {}

  async verifyStkPushStatus(input: {
    tenant_id: string;
    checkout_request_id: string;
  }): Promise<MpesaTransactionStatusResult> {
    const mpesaConfig = await this.tenantFinanceConfigService.resolveMpesaConfigForTenant(
      input.tenant_id,
    );
    const accessToken = await this.getAccessToken(mpesaConfig);
    const timestamp = this.buildNairobiTimestamp();
    const response = await fetch(
      new URL('/mpesa/stkpushquery/v1/query', mpesaConfig.base_url).toString(),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: mpesaConfig.shortcode,
          Password: Buffer.from(`${mpesaConfig.shortcode}${mpesaConfig.passkey}${timestamp}`).toString(
            'base64',
          ),
          Timestamp: timestamp,
          CheckoutRequestID: input.checkout_request_id,
        }),
        signal: AbortSignal.timeout(
          Number(this.configService.get<number>('mpesa.requestTimeoutMs') ?? 15000),
        ),
      },
    );
    const responseText = await response.text();
    const responseBody = this.tryParseJson(responseText) as StkPushQueryResponse | null;

    if (!response.ok || !responseBody) {
      throw new BadGatewayException(
        `M-PESA STK status query failed: ${response.status} ${responseText}`,
      );
    }

    const responseCode = responseBody.ResponseCode == null ? null : String(responseBody.ResponseCode);
    const resultCode = responseBody.ResultCode == null ? null : String(responseBody.ResultCode);

    if (responseCode !== '0') {
      return this.toResult(input.checkout_request_id, responseBody, 'provider_pending');
    }

    return this.toResult(
      input.checkout_request_id,
      responseBody,
      resultCode === '0' ? 'provider_verified' : 'provider_failed',
    );
  }

  async verifyC2bTransactionStatus(input: {
    tenant_id: string;
    trans_id: string;
  }): Promise<MpesaC2bTransactionStatusResult> {
    const mpesaConfig = await this.tenantFinanceConfigService.resolveMpesaConfigForTenant(
      input.tenant_id,
    );
    const accessToken = await this.getAccessToken(mpesaConfig);
    const response = await fetch(
      new URL('/mpesa/transactionstatus/v1/query', mpesaConfig.base_url).toString(),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Initiator: mpesaConfig.initiator_name ?? mpesaConfig.shortcode,
          SecurityCredential:
            this.configService.get<string>('mpesa.transactionStatusSecurityCredential') ?? '',
          CommandID: 'TransactionStatusQuery',
          TransactionID: input.trans_id,
          PartyA: mpesaConfig.shortcode,
          IdentifierType: mpesaConfig.till_number ? '2' : '4',
          ResultURL: this.buildTransactionStatusResultUrl(mpesaConfig.callback_url),
          QueueTimeOutURL: this.buildTransactionStatusTimeoutUrl(mpesaConfig.callback_url),
          Remarks: 'School fee payment verification',
          Occasion: 'fee-payment',
        }),
        signal: AbortSignal.timeout(
          Number(this.configService.get<number>('mpesa.requestTimeoutMs') ?? 15000),
        ),
      },
    );
    const responseText = await response.text();
    const responseBody = this.tryParseJson(responseText) as C2bTransactionStatusResponse | null;

    if (!response.ok || !responseBody) {
      throw new BadGatewayException(
        `M-PESA C2B transaction status query failed: ${response.status} ${responseText}`,
      );
    }

    const responseCode = responseBody.ResponseCode == null ? null : String(responseBody.ResponseCode);
    const resultCode = responseBody.ResultCode == null ? null : String(responseBody.ResultCode);
    const transId = responseBody.TransID ?? responseBody.TransactionID ?? input.trans_id;

    if (resultCode != null) {
      return {
        provider_status: resultCode === '0' ? 'provider_verified' : 'provider_failed',
        trans_id: transId,
        result_code: resultCode,
        result_desc: responseBody.ResultDesc ?? responseBody.ResponseDescription ?? null,
        amount_minor: this.parseProviderAmountMinor(responseBody.TransAmount ?? responseBody.Amount),
        raw_provider_response: responseBody as Record<string, unknown>,
      };
    }

    return {
      provider_status: responseCode === '0' ? 'provider_pending' : 'provider_failed',
      trans_id: transId,
      result_code: responseCode,
      result_desc: responseBody.ResponseDescription ?? null,
      amount_minor: this.parseProviderAmountMinor(responseBody.TransAmount ?? responseBody.Amount),
      raw_provider_response: responseBody as Record<string, unknown>,
    };
  }

  private async getAccessToken(mpesaConfig: ResolvedTenantMpesaConfig): Promise<string> {
    const redisClient = this.redisService.getClient();
    const cacheKey = [
      MPESA_ACCESS_TOKEN_CACHE_KEY,
      'transaction-status',
      mpesaConfig.owner,
      mpesaConfig.tenant_id,
      mpesaConfig.environment,
      mpesaConfig.shortcode,
    ].join(':');
    const cachedToken = await redisClient.get(cacheKey);

    if (cachedToken) {
      return cachedToken;
    }

    const basicCredentials = Buffer.from(
      `${mpesaConfig.consumer_key}:${mpesaConfig.consumer_secret}`,
    ).toString('base64');
    const response = await fetch(
      new URL('/oauth/v1/generate?grant_type=client_credentials', mpesaConfig.base_url).toString(),
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${basicCredentials}`,
        },
        signal: AbortSignal.timeout(
          Number(this.configService.get<number>('mpesa.requestTimeoutMs') ?? 15000),
        ),
      },
    );
    const responseText = await response.text();
    const responseBody = this.tryParseJson(responseText) as OAuthTokenResponse | null;

    if (!response.ok || !responseBody?.access_token) {
      throw new BadGatewayException(
        `Unable to obtain M-PESA OAuth token: ${response.status} ${responseText}`,
      );
    }

    const expiresInSeconds = Number(responseBody.expires_in ?? 3599);
    const ttlSeconds = Math.max(60, expiresInSeconds - 60);
    await redisClient.set(cacheKey, responseBody.access_token, 'EX', ttlSeconds);

    return responseBody.access_token;
  }

  private toResult(
    fallbackCheckoutRequestId: string,
    responseBody: StkPushQueryResponse,
    providerStatus: MpesaProviderVerificationStatus,
  ): MpesaTransactionStatusResult {
    return {
      provider_status: providerStatus,
      checkout_request_id: responseBody.CheckoutRequestID ?? fallbackCheckoutRequestId,
      merchant_request_id: responseBody.MerchantRequestID ?? null,
      result_code: responseBody.ResultCode == null ? null : String(responseBody.ResultCode),
      result_desc: responseBody.ResultDesc ?? responseBody.ResponseDescription ?? null,
      raw_provider_response: responseBody as Record<string, unknown>,
    };
  }

  private buildNairobiTimestamp(): string {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const partsMap = new Map(parts.map((part) => [part.type, part.value]));

    return `${partsMap.get('year')}${partsMap.get('month')}${partsMap.get('day')}${partsMap.get('hour')}${partsMap.get('minute')}${partsMap.get('second')}`;
  }

  private buildTransactionStatusResultUrl(callbackUrl: string): string {
    return this.buildRelatedCallbackUrl(callbackUrl, '/transaction-status/result');
  }

  private buildTransactionStatusTimeoutUrl(callbackUrl: string): string {
    return this.buildRelatedCallbackUrl(callbackUrl, '/transaction-status/timeout');
  }

  private buildRelatedCallbackUrl(callbackUrl: string, suffix: string): string {
    const parsedUrl = new URL(callbackUrl);
    const basePath = parsedUrl.pathname.replace(/\/c2b\/confirmation.*$/, '');
    parsedUrl.pathname = `${basePath.replace(/\/$/, '')}${suffix}`;
    parsedUrl.search = '';

    return parsedUrl.toString();
  }

  private parseProviderAmountMinor(value: unknown): string | null {
    if (value == null) {
      return null;
    }

    const normalized = String(value).trim().replace(/,/g, '');

    if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(normalized)) {
      return null;
    }

    const [major, fractional = ''] = normalized.split('.');
    return (BigInt(major) * 100n + BigInt((fractional + '00').slice(0, 2))).toString();
  }

  private tryParseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
}
