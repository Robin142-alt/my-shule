import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type {
  ParentAuthSubject,
  ParentOtpChallengeRecord,
} from './integrations.types';

@Injectable()
export class ParentPortalAuthRepository {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  constructor(private readonly prisma: PrismaService) {}

  async findParentAuthSubject(input: {
    identifier: string;
    phone_hash: string | null;
  }): Promise<ParentAuthSubject | null> {
    const result = await this.executeSql<ParentAuthSubject>(
      `
        SELECT user_id::text, tenant_id, role_id::text, role_code, email,
               display_name, phone_number_hash, phone_number_last4
        FROM app.find_parent_auth_subject_for_otp($1, $2)
      `,
      [input.identifier, input.phone_hash],
    );

    return result.rows[0] ?? null;
  }

  async createOtpChallenge(input: {
    tenant_id: string;
    user_id: string;
    email: string | null;
    phone_hash: string | null;
    phone_last4: string | null;
    otp_hash: string;
    expires_at: string;
  }): Promise<ParentOtpChallengeRecord> {
    const result = await this.executeSql<ParentOtpChallengeRecord>(
      `
        INSERT INTO parent_otp_challenges (
          tenant_id,
          user_id,
          email,
          phone_hash,
          phone_last4,
          otp_hash,
          expires_at
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7::timestamptz)
        RETURNING id::text, tenant_id, user_id::text, email, phone_hash, phone_last4,
                  otp_hash, expires_at, consumed_at, attempts
      `,
      [
        input.tenant_id,
        input.user_id,
        input.email,
        input.phone_hash,
        input.phone_last4,
        input.otp_hash,
        input.expires_at,
      ],
    );

    return result.rows[0];
  }

  async findChallengeForVerify(challengeId: string): Promise<ParentOtpChallengeRecord | null> {
    const result = await this.executeSql<ParentOtpChallengeRecord>(
      `
        SELECT id::text, tenant_id, user_id::text, email, phone_hash, phone_last4,
               otp_hash, expires_at, consumed_at, attempts
        FROM app.find_parent_otp_challenge_for_verify($1::uuid)
      `,
      [challengeId],
    );

    return result.rows[0] ?? null;
  }

  async consumeChallenge(tenantId: string, challengeId: string): Promise<boolean> {
    const result = await this.executeSql<{ id: string }>(
      `
        UPDATE parent_otp_challenges
        SET consumed_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND consumed_at IS NULL
          AND expires_at > NOW()
        RETURNING id::text
      `,
      [tenantId, challengeId],
    );

    return Boolean(result.rows[0]);
  }

  async incrementAttempts(tenantId: string, challengeId: string): Promise<void> {
    await this.executeSql(
      `
        UPDATE parent_otp_challenges
        SET attempts = attempts + 1
        WHERE tenant_id = $1
          AND id = $2::uuid
      `,
      [tenantId, challengeId],
    );
  }
}
