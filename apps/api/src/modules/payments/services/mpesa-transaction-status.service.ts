import { BadGatewayException, BadRequestException, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { MpesaAsyncStatusService } from '../mpesa-async-status.service';
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
    @Optional() private readonly asyncStatus?: MpesaAsyncStatusService,
    @Optional() private readonly db?: PrismaService,
  ) {}

  async verifyStkPushStatus(input: {
    tenant_id: string;
    checkout_request_id: string;
  }): Promise<MpesaTransactionStatusResult> {
    const intent = this.db ? (await this.db.query<{mpesa_config_id:string|null;payment_owner:string}>(
      `SELECT mpesa_config_id,payment_owner FROM payment_intents WHERE tenant_id=$1 AND checkout_request_id=$2`,
      [input.tenant_id,input.checkout_request_id])).rows[0] : undefined;
    if (this.db && !intent) throw new BadRequestException('The school payment request was not found');
    const mpesaConfig = intent?.payment_owner === 'platform'
      ? this.tenantFinanceConfigService.resolvePlatformMpesaConfig(input.tenant_id)
      : await this.tenantFinanceConfigService.resolveMpesaConfigForTenant(input.tenant_id,intent?.mpesa_config_id ?? undefined);
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
    if (this.asyncStatus) return this.asyncStatus.verify(input.tenant_id,input.trans_id);
    // An accepted TransactionStatusQuery is not proof of settlement. Never fall
    // back to a global credential or a synchronous interpretation of this API.
    throw new BadGatewayException('School-scoped asynchronous verification is unavailable');
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

  private tryParseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
}
