import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

import { AuditLogService } from '../observability/audit-log.service';
import { TenantFinanceConfigRepository } from './tenant-finance-config.repository';
import {
  TenantMpesaGoLiveCheck,
  TenantMpesaGoLiveValidation,
  TenantMpesaSetupState,
  ResolvedTenantMpesaConfig,
  TenantMpesaConfigRecord,
  TenantFinanceStatus,
  TenantFinanceSummary,
  TenantPaymentChannelStatus,
} from './tenant-finance.types';

@Injectable()
export class TenantFinanceConfigService {
  constructor(
    private readonly repository: TenantFinanceConfigRepository,
    private readonly configService: ConfigService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  async resolveMpesaConfigForTenant(tenantId: string): Promise<ResolvedTenantMpesaConfig> {
    const mpesaConfig = await this.repository.findActiveMpesaConfigForTenant(tenantId);

    if (!mpesaConfig) {
      throw new NotFoundException(
        `Tenant "${tenantId}" does not have an active school-owned MPESA configuration`,
      );
    }

    const financialAccounts =
      (await this.repository.findFinancialAccountsForTenant(tenantId)) ?? {
        tenant_id: tenantId,
        mpesa_clearing_account_code:
          this.configService.get<string>('mpesa.ledgerDebitAccountCode') ??
          '1110-MPESA-CLEARING',
        fee_control_account_code:
          this.configService.get<string>('mpesa.ledgerCreditAccountCode') ??
          '1100-AR-FEES',
        currency_code: 'KES',
      };
    const paymentChannel = await this.repository.findActivePaymentChannelForMpesaConfig(
      tenantId,
      mpesaConfig.id,
    );
    const isTillChannel = Boolean(mpesaConfig.till_number);

    return {
      owner: 'tenant',
      tenant_id: tenantId,
      mpesa_config_id: mpesaConfig.id,
      payment_channel_id: paymentChannel?.id ?? null,
      shortcode: mpesaConfig.shortcode,
      paybill_number: mpesaConfig.paybill_number,
      till_number: mpesaConfig.till_number,
      consumer_key: mpesaConfig.consumer_key,
      consumer_secret: mpesaConfig.consumer_secret,
      passkey: mpesaConfig.passkey,
      initiator_name: mpesaConfig.initiator_name,
      environment: mpesaConfig.environment,
      base_url: this.resolveBaseUrl(mpesaConfig.environment),
      callback_url: mpesaConfig.callback_url,
      transaction_type: isTillChannel ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline',
      ledger_debit_account_code: financialAccounts.mpesa_clearing_account_code,
      ledger_credit_account_code: financialAccounts.fee_control_account_code,
    };
  }

  async resolveMpesaConfigByShortcode(shortcode: string): Promise<ResolvedTenantMpesaConfig> {
    const normalizedShortcode = shortcode.trim();

    if (normalizedShortcode.length === 0) {
      throw new BadRequestException('MPESA shortcode is required');
    }

    const mpesaConfig =
      await this.repository.findActiveMpesaConfigByShortcode(normalizedShortcode);

    if (!mpesaConfig) {
      throw new NotFoundException(
        `No active school-owned MPESA configuration was found for shortcode "${normalizedShortcode}"`,
      );
    }

    const tenantId = mpesaConfig.tenant_id;
    const financialAccounts =
      (await this.repository.findFinancialAccountsForTenant(tenantId)) ?? {
        tenant_id: tenantId,
        mpesa_clearing_account_code:
          this.configService.get<string>('mpesa.ledgerDebitAccountCode') ??
          '1110-MPESA-CLEARING',
        fee_control_account_code:
          this.configService.get<string>('mpesa.ledgerCreditAccountCode') ??
          '1100-AR-FEES',
        currency_code: 'KES',
      };
    const paymentChannel = await this.repository.findActivePaymentChannelForMpesaConfig(
      tenantId,
      mpesaConfig.id,
    );
    const isTillChannel = Boolean(mpesaConfig.till_number);

    return {
      owner: 'tenant',
      tenant_id: tenantId,
      mpesa_config_id: mpesaConfig.id,
      payment_channel_id: paymentChannel?.id ?? null,
      shortcode: mpesaConfig.shortcode,
      paybill_number: mpesaConfig.paybill_number,
      till_number: mpesaConfig.till_number,
      consumer_key: mpesaConfig.consumer_key,
      consumer_secret: mpesaConfig.consumer_secret,
      passkey: mpesaConfig.passkey,
      initiator_name: mpesaConfig.initiator_name,
      environment: mpesaConfig.environment,
      base_url: this.resolveBaseUrl(mpesaConfig.environment),
      callback_url: mpesaConfig.callback_url,
      transaction_type: isTillChannel ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline',
      ledger_debit_account_code: financialAccounts.mpesa_clearing_account_code,
      ledger_credit_account_code: financialAccounts.fee_control_account_code,
    };
  }

  resolvePlatformMpesaConfig(tenantId: string): ResolvedTenantMpesaConfig {
    const shortCode = this.requireConfig('mpesa.shortCode');

    return {
      owner: 'platform',
      tenant_id: tenantId,
      mpesa_config_id: null,
      payment_channel_id: null,
      shortcode: shortCode,
      paybill_number: shortCode,
      till_number: null,
      consumer_key: this.requireConfig('mpesa.consumerKey'),
      consumer_secret: this.requireConfig('mpesa.consumerSecret'),
      passkey: this.requireConfig('mpesa.passkey'),
      initiator_name: null,
      environment: this.inferEnvironmentFromBaseUrl(this.requireConfig('mpesa.baseUrl')),
      base_url: this.requireConfig('mpesa.baseUrl'),
      callback_url: this.requireConfig('mpesa.callbackUrl'),
      transaction_type:
        (this.configService.get<string>('mpesa.transactionType') as
          | 'CustomerPayBillOnline'
          | 'CustomerBuyGoodsOnline'
          | undefined) ?? 'CustomerPayBillOnline',
      ledger_debit_account_code:
        this.configService.get<string>('mpesa.ledgerDebitAccountCode') ??
        '1110-MPESA-CLEARING',
      ledger_credit_account_code:
        this.configService.get<string>('mpesa.ledgerCreditAccountCode') ??
        '1100-AR-FEES',
    };
  }

  async resolveTenantForMpesaCallback(input: {
    payload: unknown;
    checkout_request_id?: string | null;
    merchant_request_id?: string | null;
    fallback_tenant_id?: string | null;
  }): Promise<{ tenant_id: string; shortcode: string | null }> {
    const shortcode = this.extractShortcode(input.payload);
    const fallbackTenantId = input.fallback_tenant_id?.trim() || null;

    if (shortcode && fallbackTenantId) {
      const config = await this.repository.findMpesaConfigForTenantByShortcode(
        fallbackTenantId,
        shortcode,
      );

      if (config) {
        return { tenant_id: fallbackTenantId, shortcode };
      }
    }

    if (input.checkout_request_id && input.merchant_request_id) {
      const tenantId = await this.repository.findTenantIdByPaymentRequest(
        input.checkout_request_id,
        input.merchant_request_id,
      );

      if (tenantId) {
        return { tenant_id: tenantId, shortcode };
      }
    }

    if (fallbackTenantId) {
      return { tenant_id: fallbackTenantId, shortcode };
    }

    throw new BadRequestException('Unable to resolve tenant for MPESA callback');
  }

  async assertCallbackBelongsToTenant(input: {
    tenant_id: string;
    payload: unknown;
    checkout_request_id: string;
    merchant_request_id: string;
  }): Promise<void> {
    const shortcode = this.extractShortcode(input.payload);

    if (shortcode) {
      const matchingConfig = await this.repository.findMpesaConfigForTenantByShortcode(
        input.tenant_id,
        shortcode,
      );

      if (!matchingConfig) {
        throw new BadRequestException(
          `MPESA callback shortcode "${shortcode}" is not active for tenant "${input.tenant_id}"`,
        );
      }
    }

    const tenantId = await this.repository.findTenantIdByPaymentRequest(
      input.checkout_request_id,
      input.merchant_request_id,
    );

    if (tenantId && tenantId !== input.tenant_id) {
      throw new BadRequestException(
        `MPESA callback "${input.checkout_request_id}" belongs to tenant "${tenantId}", not "${input.tenant_id}"`,
      );
    }
  }

  extractShortcode(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const objectPayload = payload as Record<string, unknown>;
    const candidateKeys = [
      'BusinessShortCode',
      'ShortCode',
      'shortcode',
      'PayBillNumber',
      'paybill_number',
      'TillNumber',
      'till_number',
    ];

    for (const key of candidateKeys) {
      const value = objectPayload[key];

      if (typeof value === 'string' || typeof value === 'number') {
        return String(value).trim();
      }
    }

    const nestedCandidates = [
      objectPayload.Body,
      objectPayload.Result,
      objectPayload.CallbackMetadata,
    ];

    for (const nested of nestedCandidates) {
      const shortcode = this.extractShortcode(nested);

      if (shortcode) {
        return shortcode;
      }
    }

    return null;
  }

  async getSummary(tenantId: string): Promise<TenantFinanceSummary> {
    return this.repository.getSummary(tenantId);
  }

  async validateMpesaGoLive(tenantId: string): Promise<TenantMpesaGoLiveValidation> {
    const mpesaConfig = await this.repository.findActiveMpesaConfigForTenant(tenantId);

    if (!mpesaConfig) {
      return {
        tenant_id: tenantId,
        state: 'not_configured',
        eligible_for_production: false,
        checked_at: new Date().toISOString(),
        checks: [
          this.goLiveCheck(
            'active_config',
            'Active M-PESA config',
            false,
            'No active school-owned M-PESA configuration is available.',
          ),
        ],
      };
    }

    const [financialAccounts, paymentChannel] = await Promise.all([
      this.repository.findFinancialAccountsForTenant(tenantId),
      this.repository.findActivePaymentChannelForMpesaConfig(tenantId, mpesaConfig.id),
    ]);
    const channelMetadata = paymentChannel?.metadata ?? {};
    const checks = [
      this.goLiveCheck(
        'credentials_present',
        'Credentials present',
        this.hasText(mpesaConfig.consumer_key) &&
          this.hasText(mpesaConfig.consumer_secret) &&
          this.hasText(mpesaConfig.passkey),
        'Consumer key, consumer secret, and passkey must be present before go-live.',
      ),
      this.goLiveCheck(
        'shortcode_approved',
        'Shortcode or receiving channel approved',
        this.hasText(mpesaConfig.shortcode) &&
          (this.hasText(mpesaConfig.paybill_number) || this.hasText(mpesaConfig.till_number)),
        'A Safaricom-approved shortcode, paybill, or till must be configured.',
      ),
      this.goLiveCheck(
        'stk_enabled',
        'STK enabled where required',
        channelMetadata.stk_enabled !== false,
        'STK must be enabled where the school accepts STK payments.',
      ),
      this.goLiveCheck(
        'callback_https',
        'Callback URL is HTTPS and non-local',
        this.isProductionSafeHttpsUrl(mpesaConfig.callback_url),
        'M-PESA callbacks must use a public HTTPS URL.',
      ),
      this.goLiveCheck(
        'callback_registered',
        'C2B and STK callbacks registered',
        channelMetadata.c2b_confirmation_url_registered === true &&
          channelMetadata.c2b_validation_url_registered === true,
        'Safaricom C2B validation and confirmation URLs must be registered.',
      ),
      this.goLiveCheck(
        'sandbox_smoke_test',
        'Sandbox smoke test passed',
        channelMetadata.sandbox_smoke_test_passed === true,
        'A sandbox smoke test must pass before production activation.',
      ),
      this.goLiveCheck(
        'production_credentials',
        'Production credentials are not sandbox placeholders',
        mpesaConfig.environment !== 'production' ||
          !this.looksLikeSandboxCredential(mpesaConfig),
        'Production M-PESA configs must not use sandbox credentials or Safaricom test shortcodes.',
      ),
      this.goLiveCheck(
        'reconciliation_permissions',
        'Reconciliation API permissions configured',
        channelMetadata.reconciliation_api_permissions_configured === true,
        'Daraja transaction-status or reconciliation permissions must be enabled.',
      ),
      this.goLiveCheck(
        'ledger_accounts',
        'Ledger accounts configured',
        Boolean(
          financialAccounts?.mpesa_clearing_account_code?.trim() &&
            financialAccounts?.fee_control_account_code?.trim(),
        ),
        'M-PESA clearing and fee-control ledger accounts must be configured.',
      ),
    ];
    const allChecksPass = checks.every((check) => check.status === 'pass');
    const state = this.resolveGoLiveState(mpesaConfig.environment, allChecksPass);

    return {
      tenant_id: tenantId,
      state,
      eligible_for_production: state === 'production_ready',
      checked_at: new Date().toISOString(),
      checks,
    };
  }

  async upsertMpesaConfig(
    tenantId: string,
    input: {
      shortcode: string;
      paybill_number?: string | null;
      till_number?: string | null;
      consumer_key: string;
      consumer_secret: string;
      passkey: string;
      initiator_name?: string | null;
      environment: 'sandbox' | 'production';
      callback_url: string;
      status?: TenantFinanceStatus;
      mpesa_clearing_account_code?: string;
      fee_control_account_code?: string;
    },
  ): Promise<TenantFinanceSummary> {
    const previousMpesaConfig = await this.repository.findMpesaConfigForTenantByShortcode(
      tenantId,
      input.shortcode,
    );
    const mpesaConfig = await this.repository.upsertMpesaConfig({
      tenant_id: tenantId,
      shortcode: input.shortcode,
      paybill_number: input.paybill_number ?? null,
      till_number: input.till_number ?? null,
      consumer_key: input.consumer_key,
      consumer_secret: input.consumer_secret,
      passkey: input.passkey,
      initiator_name: input.initiator_name ?? null,
      environment: input.environment,
      callback_url: input.callback_url,
      status: input.status ?? 'active',
    });

    if (input.mpesa_clearing_account_code || input.fee_control_account_code) {
      await this.repository.upsertFinancialAccounts({
        tenant_id: tenantId,
        mpesa_clearing_account_code:
          input.mpesa_clearing_account_code ?? '1110-MPESA-CLEARING',
        fee_control_account_code: input.fee_control_account_code ?? '1100-AR-FEES',
        currency_code: 'KES',
      });
    }

    const channel = await this.repository.ensureMpesaPaymentChannel({
      tenant_id: tenantId,
      mpesa_config_id: mpesaConfig.id,
      channel_type: mpesaConfig.till_number ? 'mpesa_till' : 'mpesa_paybill',
      name: mpesaConfig.till_number
        ? `M-PESA Till ${mpesaConfig.till_number}`
        : `M-PESA Paybill ${mpesaConfig.paybill_number ?? mpesaConfig.shortcode}`,
      status: input.status === 'active' || input.status == null ? 'active' : 'inactive',
    });

    await this.recordMpesaConfigAuditLog(tenantId, previousMpesaConfig, mpesaConfig);

    await this.auditLogService?.record({
      tenant_id: tenantId,
      action: 'tenant_finance.mpesa_config.upserted',
      resource_type: 'tenant_mpesa_config',
      resource_id: mpesaConfig.id,
      metadata: {
        shortcode: mpesaConfig.shortcode,
        paybill_number: mpesaConfig.paybill_number,
        till_number: mpesaConfig.till_number,
        environment: mpesaConfig.environment,
        channel_id: channel.id,
      },
    });

    return this.getSummary(tenantId);
  }

  async rotateMpesaCredentials(
    tenantId: string,
    mpesaConfigId: string,
    input: {
      consumer_key?: string;
      consumer_secret?: string;
      passkey?: string;
      callback_secret?: string;
      initiator_name?: string | null;
    },
  ): Promise<TenantFinanceSummary> {
    const previousConfig = await this.repository.findMpesaConfigForTenantById(
      tenantId,
      mpesaConfigId,
    );

    if (!previousConfig) {
      throw new NotFoundException('M-PESA config was not found for this school');
    }

    const callbackSecret = this.normalizeOptionalSecret(input.callback_secret);

    if (input.callback_secret !== undefined && !callbackSecret) {
      throw new BadRequestException('Callback secret must not be blank when provided');
    }

    if (callbackSecret && callbackSecret.length < 32) {
      throw new BadRequestException('Callback secret must be at least 32 characters');
    }

    const nextConsumerKey = this.normalizeOptionalSecret(input.consumer_key) ?? previousConfig.consumer_key;
    const nextConsumerSecret =
      this.normalizeOptionalSecret(input.consumer_secret) ?? previousConfig.consumer_secret;
    const nextPasskey = this.normalizeOptionalSecret(input.passkey) ?? previousConfig.passkey;
    const nextInitiatorName =
      input.initiator_name === undefined
        ? previousConfig.initiator_name
        : input.initiator_name?.trim() || null;
    const callbackSecretHash = callbackSecret
      ? this.hashCallbackSecret(tenantId, mpesaConfigId, callbackSecret)
      : null;

    const hasCredentialChange =
      nextConsumerKey !== previousConfig.consumer_key ||
      nextConsumerSecret !== previousConfig.consumer_secret ||
      nextPasskey !== previousConfig.passkey ||
      nextInitiatorName !== previousConfig.initiator_name ||
      callbackSecretHash !== null;

    if (!hasCredentialChange) {
      throw new BadRequestException('At least one M-PESA credential must change for rotation');
    }

    const currentConfig = await this.repository.rotateMpesaCredentials({
      tenant_id: tenantId,
      mpesa_config_id: mpesaConfigId,
      shortcode: previousConfig.shortcode,
      consumer_key: nextConsumerKey,
      consumer_secret: nextConsumerSecret,
      passkey: nextPasskey,
      callback_secret_hash: callbackSecretHash,
      initiator_name: nextInitiatorName,
    });

    await this.recordMpesaCredentialRotationAuditLog(
      tenantId,
      previousConfig,
      currentConfig,
      callbackSecret,
    );

    await this.auditLogService?.record({
      tenant_id: tenantId,
      action: 'tenant_finance.mpesa_credentials.rotated',
      resource_type: 'tenant_mpesa_config',
      resource_id: currentConfig.id,
      metadata: {
        shortcode: currentConfig.shortcode,
        environment: currentConfig.environment,
        credential_version: currentConfig.credential_version,
        callback_secret_rotated: Boolean(callbackSecret),
      },
    });

    return this.getSummary(tenantId);
  }

  async createBankAccount(
    tenantId: string,
    input: {
      bank_name: string;
      branch_name?: string | null;
      account_name: string;
      account_number: string;
      currency: string;
      status?: TenantFinanceStatus;
    },
  ): Promise<void> {
    const bankAccount = await this.repository.createBankAccount({
      tenant_id: tenantId,
      bank_name: input.bank_name,
      branch_name: input.branch_name ?? null,
      account_name: input.account_name,
      account_number: input.account_number,
      currency: input.currency,
      status: input.status ?? 'active',
    });

    await this.auditLogService?.record({
      tenant_id: tenantId,
      action: 'tenant_finance.bank_account.upserted',
      resource_type: 'tenant_bank_account',
      resource_id: bankAccount.id,
      metadata: {
        bank_name: bankAccount.bank_name,
        branch_name: bankAccount.branch_name,
        account_name: bankAccount.account_name,
        currency: bankAccount.currency,
        status: bankAccount.status,
      },
    });
  }

  async updatePaymentChannelStatus(
    tenantId: string,
    channelId: string,
    status: TenantPaymentChannelStatus,
  ): Promise<void> {
    await this.repository.updatePaymentChannelStatus({
      tenant_id: tenantId,
      channel_id: channelId,
      status,
    });
    await this.auditLogService?.record({
      tenant_id: tenantId,
      action: 'tenant_finance.payment_channel.status_updated',
      resource_type: 'tenant_payment_channel',
      resource_id: channelId,
      metadata: { status },
    });
  }

  private resolveBaseUrl(environment: 'sandbox' | 'production'): string {
    if (environment === 'production') {
      return (
        this.configService.get<string>('mpesa.productionBaseUrl') ??
        'https://api.safaricom.co.ke'
      );
    }

    return (
      this.configService.get<string>('mpesa.sandboxBaseUrl') ??
      this.configService.get<string>('mpesa.baseUrl') ??
      'https://sandbox.safaricom.co.ke'
    );
  }

  private inferEnvironmentFromBaseUrl(value: string): 'sandbox' | 'production' {
    return value.includes('sandbox') ? 'sandbox' : 'production';
  }

  private resolveGoLiveState(
    environment: 'sandbox' | 'production',
    allChecksPass: boolean,
  ): TenantMpesaSetupState {
    if (environment === 'production' && allChecksPass) {
      return 'production_ready';
    }

    if (environment === 'sandbox' && allChecksPass) {
      return 'sandbox_ready';
    }

    return 'awaiting_safaricom_registration';
  }

  private goLiveCheck(
    id: string,
    label: string,
    passed: boolean,
    failureMessage: string,
  ): TenantMpesaGoLiveCheck {
    return {
      id,
      label,
      status: passed ? 'pass' : 'fail',
      message: passed ? `${label} is ready.` : failureMessage,
    };
  }

  private isProductionSafeHttpsUrl(value: string): boolean {
    try {
      const url = new URL(value);
      const hostname = url.hostname.toLowerCase();

      return url.protocol === 'https:' &&
        hostname !== 'localhost' &&
        hostname !== '127.0.0.1' &&
        !hostname.endsWith('.localhost');
    } catch {
      return false;
    }
  }

  private looksLikeSandboxCredential(config: {
    shortcode: string;
    paybill_number: string | null;
    till_number: string | null;
    consumer_key: string;
    consumer_secret: string;
    passkey: string;
  }): boolean {
    const values = [
      config.shortcode,
      config.paybill_number,
      config.till_number,
      config.consumer_key,
      config.consumer_secret,
      config.passkey,
    ].filter((value): value is string => typeof value === 'string');

    return values.some((value) => /sandbox|test|demo|174379/i.test(value));
  }

  private hasText(value: string | null | undefined): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private async recordMpesaConfigAuditLog(
    tenantId: string,
    previousConfig: TenantMpesaConfigRecord | null,
    currentConfig: TenantMpesaConfigRecord,
  ): Promise<void> {
    const trackedFields: Array<keyof Pick<
      TenantMpesaConfigRecord,
      | 'consumer_key'
      | 'consumer_secret'
      | 'passkey'
      | 'initiator_name'
      | 'environment'
      | 'callback_url'
      | 'paybill_number'
      | 'till_number'
      | 'status'
    >> = [
      'consumer_key',
      'consumer_secret',
      'passkey',
      'initiator_name',
      'environment',
      'callback_url',
      'paybill_number',
      'till_number',
      'status',
    ];
    const changedFields = trackedFields.filter(
      (field) => previousConfig?.[field] !== currentConfig[field],
    );

    if (changedFields.length === 0) {
      return;
    }

    await this.repository.insertMpesaConfigAuditLog({
      tenant_id: tenantId,
      mpesa_config_id: currentConfig.id,
      action: previousConfig
        ? 'tenant_finance.mpesa_config.updated'
        : 'tenant_finance.mpesa_config.created',
      changed_fields: changedFields,
      old_values: previousConfig
        ? this.toMaskedMpesaConfigSnapshot(previousConfig)
        : {},
      new_values: this.toMaskedMpesaConfigSnapshot(currentConfig),
    });
  }

  private async recordMpesaCredentialRotationAuditLog(
    tenantId: string,
    previousConfig: TenantMpesaConfigRecord,
    currentConfig: TenantMpesaConfigRecord,
    newCallbackSecret: string | null,
  ): Promise<void> {
    const changedFields = [
      previousConfig.consumer_key !== currentConfig.consumer_key ? 'consumer_key' : null,
      previousConfig.consumer_secret !== currentConfig.consumer_secret ? 'consumer_secret' : null,
      previousConfig.passkey !== currentConfig.passkey ? 'passkey' : null,
      newCallbackSecret ? 'callback_secret' : null,
      previousConfig.initiator_name !== currentConfig.initiator_name ? 'initiator_name' : null,
    ].filter((field): field is string => Boolean(field));

    if (changedFields.length === 0) {
      return;
    }

    await this.repository.insertMpesaConfigAuditLog({
      tenant_id: tenantId,
      mpesa_config_id: currentConfig.id,
      action: 'tenant_finance.mpesa_credentials.rotated',
      changed_fields: changedFields,
      old_values: this.toMaskedMpesaConfigSnapshot(previousConfig),
      new_values: this.toMaskedMpesaConfigSnapshot(
        currentConfig,
        newCallbackSecret ? this.maskSecret(newCallbackSecret) : undefined,
      ),
    });
  }

  private toMaskedMpesaConfigSnapshot(
    config: TenantMpesaConfigRecord,
    callbackSecretMask?: string | null,
  ): Record<string, unknown> {
    return {
      shortcode: config.shortcode,
      paybill_number: config.paybill_number,
      till_number: config.till_number,
      consumer_key_masked: this.maskSecret(config.consumer_key),
      consumer_secret_masked: this.maskSecret(config.consumer_secret),
      passkey_masked: this.maskSecret(config.passkey),
      callback_secret_masked:
        callbackSecretMask ?? (config.callback_secret_hash ? '[configured]' : null),
      initiator_name: config.initiator_name,
      environment: config.environment,
      callback_url: config.callback_url,
      status: config.status,
      credential_version: config.credential_version,
    };
  }

  private normalizeOptionalSecret(value: string | undefined): string | null {
    if (value === undefined) {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private hashCallbackSecret(
    tenantId: string,
    mpesaConfigId: string,
    callbackSecret: string,
  ): string {
    return createHash('sha256')
      .update(`${tenantId}:${mpesaConfigId}:${callbackSecret}`)
      .digest('hex');
  }

  private maskSecret(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    if (value.length <= 6) {
      return '*'.repeat(value.length);
    }

    return `${value.slice(0, 3)}${'*'.repeat(Math.max(4, value.length - 6))}${value.slice(-3)}`;
  }

  private requireConfig(key: string): string {
    const value = this.configService.get<string>(key) ?? '';

    if (value.trim().length === 0) {
      throw new BadGatewayException(`Missing MPESA configuration value "${key}"`);
    }

    return value;
  }
}
