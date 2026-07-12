import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';

import { RequestContextService } from '../common/request-context/request-context.service';
import { DatabaseService } from '../database/database.service';
import { AuthEmailService, EmailDeliveryError } from './auth-email.service';
import { AuthRequestMetadata } from './auth.interfaces';
import {
  AuthActionResponseDto,
  RequestPasswordRecoveryDto,
  ResetPasswordDto,
} from './dto/password-recovery.dto';
import { PasswordService } from './password.service';

type RecoveryUserRow = {
  id: string;
  tenant_id: string | null;
  email: string;
  display_name: string;
};

type RecoveryActionRow = {
  token_id: string;
  outbox_id: string;
};

type AuthEmailDeliveryMarkOptions = {
  errorCode?: string | null;
  errorSummary?: string | null;
  providerStatusCode?: number | null;
};

const GENERIC_RECOVERY_MESSAGE =
  'If the account is eligible, password recovery instructions have been sent.';

@Injectable()
export class AuthRecoveryService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly databaseService: DatabaseService,
    private readonly passwordService: PasswordService,
    private readonly emailService: AuthEmailService,
    private readonly configService: ConfigService,
  ) {}

  async requestPasswordRecovery(
    dto: RequestPasswordRecoveryDto,
    metadata: AuthRequestMetadata,
  ): Promise<AuthActionResponseDto> {
    void metadata;
    this.emailService.assertPasswordRecoveryConfigured();

    const audience = dto.audience ?? 'school';
    const email = dto.email.trim().toLowerCase();
    const tenantId = audience === 'superadmin'
      ? null
      : this.requestContext.getStore()?.tenant_id ?? null;
    const ownerEmail = this.configService.get<string>('auth.systemOwnerEmail')?.trim().toLowerCase() ?? '';
    const user = await this.findRecoveryUser({
      audience,
      email,
      tenantId,
      ownerEmail,
    });

    if (!user) {
      return {
        success: true,
        message: GENERIC_RECOVERY_MESSAGE,
      };
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + this.getRecoveryTtlMs());
    const resetUrl = this.buildResetUrl(audience, token);
    const subject = 'Reset your My Shule ERP password';
    const payload = {
      display_name: user.display_name,
      expires_at: expiresAt.toISOString(),
      purpose: 'password_recovery',
    };
    const recoveryAction = await this.createRecoveryAction({
      tenantId: user.tenant_id,
      userId: user.id,
      email: user.email,
      tokenHash,
      expiresAt,
      subject,
      payload,
    });

    try {
      await this.emailService.sendPasswordRecoveryEmail({
        to: user.email,
        displayName: user.display_name,
        resetUrl,
        expiresAt,
      });
      await this.markOutboxDeliverySafely(recoveryAction.outbox_id, 'sent');
    } catch (error) {
      await this.markOutboxDeliverySafely(recoveryAction.outbox_id, 'failed', {
        errorCode: error instanceof EmailDeliveryError ? error.code : 'provider_rejected',
        errorSummary: error instanceof EmailDeliveryError
          ? error.safeMessage
          : 'Password recovery email could not be sent right now.',
        providerStatusCode: error instanceof EmailDeliveryError ? error.providerStatus : null,
      });
      throw error;
    }

    return {
      success: true,
      message: GENERIC_RECOVERY_MESSAGE,
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<AuthActionResponseDto> {
    const passwordHash = await this.passwordService.hash(dto.password);
    const tokenHash = this.hashToken(dto.token.trim());
    let result: Awaited<ReturnType<DatabaseService['query']>>;

    try {
      result = await this.databaseService.query(
        `
          SELECT user_id, email, tenant_id
          FROM app.consume_password_recovery_action($1, $2)
        `,
        [tokenHash, passwordHash],
      );
    } catch (error) {
      if (this.isInvalidRecoveryTokenError(error)) {
        throw new UnauthorizedException('Invalid or expired recovery token');
      }

      throw error;
    }

    if (!result.rows[0]) {
      throw new UnauthorizedException('Invalid or expired recovery token');
    }

    return {
      success: true,
      message: 'Password updated successfully.',
    };
  }

  private async findRecoveryUser(input: {
    audience: 'superadmin' | 'school' | 'portal';
    email: string;
    tenantId: string | null;
    ownerEmail: string;
  }): Promise<RecoveryUserRow | null> {
    const result = await this.databaseService.query<RecoveryUserRow>(
      `
        SELECT id, tenant_id, email, display_name
        FROM app.find_user_for_password_recovery($1, $2, $3, $4)
      `,
      [input.email, input.audience, input.tenantId, input.ownerEmail],
    );

    return result.rows[0] ?? null;
  }

  private async createRecoveryAction(input: {
    tenantId: string | null;
    userId: string;
    email: string;
    tokenHash: string;
    expiresAt: Date;
    subject: string;
    payload: Record<string, unknown>;
  }): Promise<RecoveryActionRow> {
    const result = await this.databaseService.query<RecoveryActionRow>(
      `
        SELECT token_id, outbox_id
        FROM app.create_password_recovery_action($1, $2, $3, $4, $5, $6, $7::jsonb)
      `,
      [
        input.tenantId,
        input.userId,
        input.email,
        input.tokenHash,
        input.expiresAt,
        input.subject,
        JSON.stringify(input.payload),
      ],
    );

    return result.rows[0];
  }

  private async markOutboxDelivery(
    outboxId: string,
    status: 'sent' | 'failed',
    options: AuthEmailDeliveryMarkOptions = {},
  ): Promise<void> {
    const errorCode = options.errorCode ?? null;
    const errorSummary = options.errorSummary ?? null;
    const providerStatusCode = options.providerStatusCode ?? null;

    try {
      await this.databaseService.query(
        'SELECT app.mark_auth_email_outbox_delivery($1::uuid, $2::text, $3::text, $4::text, $5::integer)',
        [outboxId, status, errorCode, errorSummary, providerStatusCode],
      );
    } catch (error) {
      await this.databaseService.query(
        `
          WITH _operation AS (
            SELECT set_config('app.auth_email_outbox_operation', 'mark_delivery', true)
          )
          UPDATE auth_email_outbox
          SET
            status = $1,
            attempts = attempts + 1,
            sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE sent_at END,
            last_error_code = CASE WHEN $1 = 'failed' THEN $3 ELSE NULL END,
            last_error_summary = CASE WHEN $1 = 'failed' THEN $4 ELSE NULL END,
            provider_status_code = CASE WHEN $1 = 'failed' THEN $5 ELSE NULL END,
            last_attempt_at = NOW(),
            next_attempt_at = CASE WHEN $1 = 'failed' THEN NOW() + INTERVAL '5 minutes' ELSE NULL END
          FROM _operation
          WHERE id = $2::uuid
          RETURNING id
        `,
        [status, outboxId, errorCode, errorSummary, providerStatusCode],
      ).catch(() => {
        throw error;
      });
    }
  }

  private async markOutboxDeliverySafely(
    outboxId: string,
    status: 'sent' | 'failed',
    options: AuthEmailDeliveryMarkOptions = {},
  ): Promise<void> {
    try {
      await this.markOutboxDelivery(outboxId, status, options);
    } catch {
      // Preserve the user-facing auth action result; provider failures are already surfaced by the caller.
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private isInvalidRecoveryTokenError(error: unknown): boolean {
    return (
      error instanceof Error &&
      error.message.includes('Invalid or expired recovery token')
    );
  }

  private getRecoveryTtlMs(): number {
    const ttlMinutes = Number(
      this.configService.get<number>('email.passwordRecoveryTtlMinutes') ?? 30,
    );
    const safeMinutes = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? ttlMinutes : 30;

    return safeMinutes * 60 * 1000;
  }

  private buildResetUrl(
    audience: 'superadmin' | 'school' | 'portal',
    token: string,
  ): string {
    const baseUrl = (
      this.configService.get<string>('email.publicAppUrl') ??
      'https://my-shule-erp.vercel.app'
    ).replace(/\/$/, '');
    const path = audience === 'superadmin'
      ? '/superadmin/reset-password'
      : audience === 'portal'
        ? '/portal/reset-password'
        : '/school/reset-password';

    return `${baseUrl}${path}?token=${encodeURIComponent(token)}`;
  }
}
