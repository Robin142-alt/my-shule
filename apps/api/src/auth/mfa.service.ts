import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'node:crypto';

import { DatabaseService } from '../database/database.service';
import { AuthEmailService } from './auth-email.service';

export interface EnforceMfaLoginInput {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  permissions: string[];
  mfaEnabled: boolean;
  mfaCode?: string;
  trustedDevice?: boolean;
}

export interface EnforceMfaLoginResult {
  status: 'not_required' | 'trusted_device' | 'verified';
}

const HIGH_PRIVILEGE_ROLES = new Set([
  'admin',
  'owner',
  'platform_owner',
  'principal',
  'support_lead',
  'superadmin',
]);

const MFA_CODE_LENGTH = 6;

@Injectable()
export class MfaService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly emailService: AuthEmailService,
    private readonly configService: ConfigService,
  ) {}

  async enforceLoginChallenge(input: EnforceMfaLoginInput): Promise<EnforceMfaLoginResult> {
    if (!this.requiresChallenge(input.role, input.permissions)) {
      return { status: 'not_required' };
    }

    if (input.trustedDevice) {
      return { status: 'trusted_device' };
    }

    const hasSubmittedMfaCode = Boolean(input.mfaCode?.trim());
    const normalizedMfaCode = this.normalizeMfaCode(input.mfaCode ?? '');

    if (!hasSubmittedMfaCode) {
      await this.issueLoginChallenge(input);
      throw new UnauthorizedException('MFA challenge required for this role');
    }

    if (normalizedMfaCode.length !== MFA_CODE_LENGTH) {
      throw new UnauthorizedException('MFA challenge is invalid or expired');
    }

    const result = await this.databaseService.query<{ verified: boolean }>(
      `
        UPDATE auth_mfa_challenges
        SET consumed_at = NOW()
        WHERE user_id = $1::uuid
          AND code_hash = $2
          AND consumed_at IS NULL
          AND expires_at > NOW()
        RETURNING TRUE AS verified
      `,
      [input.userId, this.hashSecret(normalizedMfaCode)],
    );

    if (!result.rows[0]?.verified) {
      throw new UnauthorizedException('MFA challenge is invalid or expired');
    }

    return { status: 'verified' };
  }

  requiresChallenge(role: string, permissions: string[]): boolean {
    return HIGH_PRIVILEGE_ROLES.has(role)
      || permissions.some((permission) =>
        permission === '*:*'
        || permission.endsWith(':write')
        || permission.endsWith(':manage')
        || permission.endsWith(':delete')
        || permission.endsWith(':*'),
      );
  }

  private hashSecret(value: string): string {
    return createHash('sha256').update(this.normalizeMfaCode(value)).digest('hex');
  }

  private normalizeMfaCode(value: string): string {
    return value.replace(/\D/g, '').slice(0, MFA_CODE_LENGTH);
  }

  private async issueLoginChallenge(input: EnforceMfaLoginInput): Promise<void> {
    this.emailService.assertMfaConfigured();

    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + this.getMfaTtlMs());

    await this.databaseService.query(
      `
        INSERT INTO auth_mfa_challenges (user_id, code_hash, purpose, expires_at)
        VALUES ($1::uuid, $2, 'login', $3)
        RETURNING id
      `,
      [input.userId, this.hashSecret(code), expiresAt],
    );

    await this.emailService.sendMfaLoginCodeEmail({
      to: input.email,
      displayName: input.displayName,
      code,
      expiresAt,
    });
  }

  private getMfaTtlMs(): number {
    const ttlMinutes = Number(
      this.configService.get<number>('email.mfaCodeTtlMinutes') ?? 10,
    );
    const safeMinutes = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? ttlMinutes : 10;

    return safeMinutes * 60 * 1000;
  }
}
