import { createHash, randomBytes } from 'node:crypto';

import { BadRequestException, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DatabaseService } from '../../../database/database.service';

export interface MpesaCallbackUrls {
  stk_callback_url: string;
  c2b_validation_url: string;
  c2b_confirmation_url: string;
}

export interface ResolvedMpesaCallbackChannel {
  tenant_id: string;
  channel_id: string;
  shortcode: string;
  environment: 'sandbox' | 'production';
  requires_edge_signature: boolean;
  requires_transaction_status: boolean;
  secret_version?: number;
}

export interface RotatedMpesaCallbackChannel extends ResolvedMpesaCallbackChannel {
  callback_secret_hash: string;
  overlap_accepts_until: string;
}

@Injectable()
export class MpesaCallbackChannelService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  buildCallbackUrls(input: {
    channel_id: string;
    secret_ref: string;
    base_url?: string | null;
  }): MpesaCallbackUrls {
    const apiBaseUrl = this.resolveMpesaApiBaseUrl(input.base_url);
    const channelId = encodeURIComponent(this.requirePathValue(input.channel_id, 'channel_id'));
    const secretRef = encodeURIComponent(this.requirePathValue(input.secret_ref, 'secret_ref'));

    return {
      stk_callback_url: `${apiBaseUrl}/callback/${channelId}/${secretRef}`,
      c2b_validation_url: `${apiBaseUrl}/c2b/validation/${channelId}/${secretRef}`,
      c2b_confirmation_url: `${apiBaseUrl}/c2b/confirmation/${channelId}/${secretRef}`,
    };
  }

  hashSecretRef(secretRef: string): string {
    return createHash('sha256')
      .update(this.requirePathValue(secretRef, 'secret_ref'), 'utf8')
      .digest('hex');
  }

  generateSecretRef(bytes = 32): string {
    if (!Number.isInteger(bytes) || bytes < 16) {
      throw new BadRequestException('M-PESA callback secret refs must contain at least 128 bits');
    }

    return randomBytes(bytes).toString('base64url');
  }

  async rotateChannelSecret(input: {
    tenant_id: string;
    channel_id: string;
    environment: 'sandbox' | 'production';
    new_secret_ref: string;
    overlap_seconds?: number;
  }): Promise<RotatedMpesaCallbackChannel> {
    const tenantId = this.requirePathValue(input.tenant_id, 'tenant_id');
    const channelId = this.requireUuid(input.channel_id);
    const environment = this.requireEnvironment(input.environment);
    const newSecretHash = this.hashSecretRef(input.new_secret_ref);
    const overlapSeconds = this.normalizeOverlapSeconds(input.overlap_seconds);
    const current = await this.databaseService.query<{
      tenant_id: string;
      channel_id: string;
      shortcode: string;
      environment: 'sandbox' | 'production';
      requires_edge_signature: boolean;
      requires_transaction_status: boolean;
      secret_version: number;
    }>(
      `
        SELECT
          tenant_id,
          channel_id::text AS channel_id,
          shortcode,
          environment,
          requires_edge_signature,
          requires_transaction_status,
          secret_version
        FROM mpesa_callback_channels
        WHERE tenant_id = $1
          AND channel_id = $2::uuid
          AND environment = $3
          AND disabled_at IS NULL
          AND is_current = TRUE
        ORDER BY secret_version DESC, created_at DESC
        LIMIT 1
      `,
      [tenantId, channelId, environment],
    );
    const currentChannel = current.rows[0];

    if (!currentChannel) {
      throw new UnauthorizedException('M-PESA callback channel is not active');
    }

    await this.databaseService.query(
      `
        UPDATE mpesa_callback_channels
        SET
          is_current = FALSE,
          accepts_until = COALESCE(accepts_until, NOW() + ($4::integer * INTERVAL '1 second')),
          rotated_at = NOW()
        WHERE tenant_id = $1
          AND channel_id = $2::uuid
          AND environment = $3
          AND disabled_at IS NULL
          AND is_current = TRUE
      `,
      [tenantId, channelId, environment, overlapSeconds],
    );

    const inserted = await this.databaseService.query<{
      tenant_id: string;
      channel_id: string;
      shortcode: string;
      environment: 'sandbox' | 'production';
      requires_edge_signature: boolean;
      requires_transaction_status: boolean;
      secret_version: number;
      callback_secret_hash: string;
      overlap_accepts_until: string;
    }>(
      `
        INSERT INTO mpesa_callback_channels (
          tenant_id,
          channel_id,
          shortcode,
          environment,
          callback_secret_hash,
          requires_edge_signature,
          requires_transaction_status,
          secret_version,
          is_current
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, TRUE)
        RETURNING
          tenant_id,
          channel_id::text AS channel_id,
          shortcode,
          environment,
          requires_edge_signature,
          requires_transaction_status,
          secret_version,
          callback_secret_hash,
          (NOW() + ($9::integer * INTERVAL '1 second'))::text AS overlap_accepts_until
      `,
      [
        tenantId,
        channelId,
        currentChannel.shortcode,
        environment,
        newSecretHash,
        currentChannel.requires_edge_signature,
        currentChannel.requires_transaction_status,
        currentChannel.secret_version + 1,
        overlapSeconds,
      ],
    );

    return inserted.rows[0];
  }

  async resolveChannelBySecret(input: {
    channel_id: string;
    secret_ref: string;
    shortcode?: string | null;
  }): Promise<ResolvedMpesaCallbackChannel> {
    const channelId = this.requireUuid(input.channel_id);
    const secretHash = this.hashSecretRef(input.secret_ref);
    const shortcode = input.shortcode?.trim() || null;

    const result = await this.databaseService.query<{
      tenant_id: string;
      channel_id: string;
      shortcode: string;
      environment: 'sandbox' | 'production';
      requires_edge_signature: boolean;
      requires_transaction_status: boolean;
    }>(
      `
        SELECT
          tenant_id,
          channel_id::text AS channel_id,
          shortcode,
          environment,
          requires_edge_signature,
          requires_transaction_status,
          secret_version
        FROM mpesa_callback_channels
        WHERE channel_id = $1::uuid
          AND callback_secret_hash = $2
          AND disabled_at IS NULL
          AND (
            is_current = TRUE
            OR accepts_until IS NULL
            OR accepts_until > NOW()
          )
          AND ($3::text IS NULL OR shortcode = $3::text)
        LIMIT 1
      `,
      [channelId, secretHash, shortcode],
    );

    const channel = result.rows[0];

    if (!channel) {
      throw new UnauthorizedException('M-PESA callback channel is not authorized');
    }

    return channel;
  }

  private resolveMpesaApiBaseUrl(baseUrl?: string | null): string {
    const configuredUrl = (
      baseUrl ??
      this.configService?.get<string>('mpesa.callbackUrl') ??
      process.env.MPESA_CALLBACK_URL ??
      ''
    ).trim();

    if (!configuredUrl) {
      throw new BadRequestException('MPESA callback URL must be configured');
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(configuredUrl);
    } catch {
      throw new BadRequestException('MPESA callback URL must be an absolute HTTPS URL');
    }

    if (parsedUrl.protocol !== 'https:') {
      throw new BadRequestException('MPESA callback URL must use HTTPS');
    }

    const path = parsedUrl.pathname
      .replace(/\/payments\/mpesa\/callback\/?$/, '/payments/mpesa')
      .replace(/\/$/, '');

    return `${parsedUrl.origin}${path || '/payments/mpesa'}`;
  }

  private requirePathValue(value: string, field: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${field} is required`);
    }

    return normalized;
  }

  private requireUuid(value: string): string {
    const normalized = this.requirePathValue(value, 'channel_id');

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
      throw new UnauthorizedException('M-PESA callback channel is not authorized');
    }

    return normalized;
  }

  private requireEnvironment(value: string): 'sandbox' | 'production' {
    if (value === 'sandbox' || value === 'production') {
      return value;
    }

    throw new BadRequestException('M-PESA callback environment is invalid');
  }

  private normalizeOverlapSeconds(value: number | undefined): number {
    if (value == null) {
      return 24 * 60 * 60;
    }

    if (!Number.isInteger(value) || value < 300 || value > 30 * 24 * 60 * 60) {
      throw new BadRequestException(
        'M-PESA callback secret overlap must be between 5 minutes and 30 days',
      );
    }

    return value;
  }
}
