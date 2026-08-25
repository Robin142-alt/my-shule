import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { PiiEncryptionService } from '../security/pii-encryption.service';
import {
  CreatePlatformSmsProviderDto,
  UpdatePlatformSmsProviderDto,
} from './dto/integrations.dto';
import { PlatformSmsRepository } from './platform-sms.repository';
import type {
  PlatformSmsProviderRecord,
  PlatformSmsProviderResponse,
} from './integrations.types';
import {
  assertSafeSmsProviderUrl,
  parseAdditionalSmsProviderHosts,
  UnsafeSmsProviderUrlError,
} from './sms-provider-url';

@Injectable()
export class PlatformSmsService {
  constructor(
    private readonly platformSmsRepository: PlatformSmsRepository,
    private readonly piiEncryptionService: PiiEncryptionService,
    private readonly requestContext: RequestContextService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  async listProviders(): Promise<PlatformSmsProviderResponse[]> {
    const providers = await this.platformSmsRepository.listProviders();
    return providers.map((provider) => this.toProviderResponse(provider));
  }

  async createProvider(dto: CreatePlatformSmsProviderDto): Promise<PlatformSmsProviderResponse> {
    const actorUserId = this.getActorUserId();
    const baseUrl = this.validateProviderBaseUrl(dto.base_url, dto.provider_code);
    const provider = await this.platformSmsRepository.createProvider({
      provider_name: dto.provider_name.trim(),
      provider_code: dto.provider_code,
      api_key_ciphertext: this.piiEncryptionService.encrypt(
        dto.api_key.trim(),
        `platform-sms:${dto.provider_code}:api-key`,
      ),
      username_ciphertext: dto.username?.trim()
        ? this.piiEncryptionService.encrypt(
            dto.username.trim(),
            `platform-sms:${dto.provider_code}:username`,
          )
        : null,
      sender_id: dto.sender_id.trim(),
      base_url: baseUrl,
      is_active: dto.is_active ?? true,
      is_default: dto.is_default ?? false,
      actor_user_id: actorUserId,
    });

    await this.safePlatformLog('platform_sms_provider_created', 'success');
    return this.toProviderResponse(provider);
  }

  async updateProvider(
    providerId: string,
    dto: UpdatePlatformSmsProviderDto,
  ): Promise<PlatformSmsProviderResponse> {
    const existingProvider = (await this.platformSmsRepository.listProviders())
      .find((provider) => provider.id === providerId);

    if (!existingProvider) {
      throw new BadRequestException('SMS provider was not found');
    }

    const baseUrl = dto.base_url === undefined
      ? undefined
      : this.validateProviderBaseUrl(dto.base_url, existingProvider.provider_code);
    const provider = await this.platformSmsRepository.updateProvider({
      provider_id: providerId,
      provider_name: dto.provider_name?.trim(),
      api_key_ciphertext: dto.api_key?.trim()
        ? this.piiEncryptionService.encrypt(
            dto.api_key.trim(),
            `platform-sms:${existingProvider.provider_code}:api-key`,
          )
        : undefined,
      username_ciphertext: dto.username === undefined
        ? undefined
        : dto.username.trim()
          ? this.piiEncryptionService.encrypt(
              dto.username.trim(),
              `platform-sms:${existingProvider.provider_code}:username`,
            )
          : null,
      sender_id: dto.sender_id?.trim(),
      base_url: baseUrl,
      is_active: dto.is_active,
      actor_user_id: this.getActorUserId(),
    });

    await this.safePlatformLog('platform_sms_provider_updated', 'success');
    return this.toProviderResponse(provider);
  }

  async setDefaultProvider(providerId: string): Promise<PlatformSmsProviderResponse> {
    const provider = await this.platformSmsRepository.setDefaultProvider(
      providerId,
      this.getActorUserId(),
    );
    await this.safePlatformLog('platform_sms_default_changed', 'success');
    return this.toProviderResponse(provider);
  }

  async testProvider(providerId: string): Promise<{
    status: 'configuration_valid';
    provider_id: string;
    connectivity_tested: false;
  }> {
    const providers = await this.platformSmsRepository.listProviders();
    const provider = providers.find((item) => item.id === providerId);

    if (!provider) {
      throw new BadRequestException('SMS provider was not found');
    }

    const apiKey = this.decryptProviderCredential(provider, 'api-key');

    if (!apiKey.trim() || !provider.sender_id.trim()) {
      await this.platformSmsRepository.markProviderTest(providerId, 'failed');
      await this.safePlatformLog('platform_sms_provider_tested', 'failed');
      throw new BadRequestException('SMS provider credentials are incomplete');
    }

    if (provider.base_url) {
      this.validateProviderBaseUrl(provider.base_url, provider.provider_code);
    }

    await this.platformSmsRepository.markProviderTest(providerId, 'configuration_valid');
    await this.safePlatformLog('platform_sms_provider_configuration_validated', 'configuration_valid');

    return { status: 'configuration_valid', provider_id: providerId, connectivity_tested: false };
  }

  async getDefaultProviderForDispatch(): Promise<{
    provider: PlatformSmsProviderRecord;
    api_key: string;
    username: string | null;
  } | null> {
    const provider = await this.platformSmsRepository.findDefaultProvider();

    if (!provider) {
      return null;
    }

    return {
      provider,
      api_key: this.decryptProviderCredential(provider, 'api-key'),
      username: provider.username_ciphertext
        ? this.decryptProviderCredential(provider, 'username')
        : null,
    };
  }

  private toProviderResponse(provider: PlatformSmsProviderRecord): PlatformSmsProviderResponse {
    const apiKey = this.tryDecrypt(
      provider.api_key_ciphertext,
      `platform-sms:${provider.provider_code}:api-key`,
    );
    const username = provider.username_ciphertext
      ? this.tryDecrypt(
          provider.username_ciphertext,
          `platform-sms:${provider.provider_code}:username`,
        )
      : null;

    return {
      id: provider.id,
      provider_name: provider.provider_name,
      provider_code: provider.provider_code,
      api_key_masked: this.maskSecret(apiKey),
      username_masked: username ? this.maskSecret(username) : null,
      sender_id: provider.sender_id,
      base_url: provider.base_url,
      is_active: provider.is_active,
      is_default: provider.is_default,
      last_test_status: provider.last_test_status,
      last_tested_at: this.formatNullableDate(provider.last_tested_at),
      created_at: this.formatDate(provider.created_at),
      updated_at: this.formatDate(provider.updated_at),
    };
  }

  private tryDecrypt(value: string, aad: string): string {
    try {
      return this.piiEncryptionService.decrypt(value, aad);
    } catch {
      return value;
    }
  }

  private maskSecret(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const visible = value.length <= 4 ? value.slice(-2) : value.slice(-4);
    return `${'*'.repeat(Math.max(8, value.length - visible.length))}${visible}`;
  }

  private async safePlatformLog(operation: string, status: string): Promise<void> {
    try {
      await this.platformSmsRepository.appendPlatformIntegrationLog({
        integration_type: 'platform_sms',
        operation,
        status,
        request_id: this.requestContext.getStore()?.request_id ?? null,
        created_by_user_id: this.getActorUserId(),
      });
    } catch {
      // Platform logging should never leak secrets or block provider configuration.
    }
  }

  private getActorUserId(): string | null {
    const userId = this.requestContext.getStore()?.user_id;
    return userId && userId !== 'anonymous' ? userId : null;
  }

  private decryptProviderCredential(
    provider: PlatformSmsProviderRecord,
    field: 'api-key' | 'username',
  ): string {
    const ciphertext = field === 'api-key'
      ? provider.api_key_ciphertext
      : provider.username_ciphertext;

    if (!ciphertext) {
      return '';
    }

    try {
      return this.piiEncryptionService.decrypt(
        ciphertext,
        `platform-sms:${provider.provider_code}:${field}`,
      );
    } catch (canonicalError) {
      try {
        return this.piiEncryptionService.decrypt(
          ciphertext,
          `platform-sms:${provider.id}:${field}`,
        );
      } catch {
        throw canonicalError;
      }
    }
  }

  private validateProviderBaseUrl(
    value: string | null | undefined,
    providerCode: PlatformSmsProviderRecord['provider_code'],
  ): string | null {
    const normalized = value?.trim() || null;

    if (!normalized) {
      return null;
    }

    try {
      return assertSafeSmsProviderUrl(
        normalized,
        providerCode,
        parseAdditionalSmsProviderHosts(
          this.configService?.get<string>('communication.smsProviderAllowedHosts'),
        ),
      ).toString();
    } catch (error) {
      if (error instanceof UnsafeSmsProviderUrlError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private formatNullableDate(value: string | Date | null): string | null {
    return value ? this.formatDate(value) : null;
  }

  private formatDate(value: string | Date): string {
    return value instanceof Date ? value.toISOString() : value;
  }
}
