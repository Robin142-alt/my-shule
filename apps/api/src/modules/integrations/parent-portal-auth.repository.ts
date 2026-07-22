import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type {
  ParentAuthSubject,
  ParentOtpChallengeRecord,
  ParentPasswordAuthSubject,
  StudentPasswordAuthSubject,
  OtpIssuanceState,
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

  async findLinkedParentAuthSubject(input: {
    tenant_id: string | null;
    admission_number: string;
    phone_hash: string;
  }): Promise<ParentAuthSubject | null> {
    const result = await this.executeSql<ParentAuthSubject>(
      `
        SELECT user_id::text, tenant_id, role_id::text, role_code, email,
               display_name, phone_number_hash, phone_number_last4,
               force_password_change
        FROM app.find_linked_parent_auth_subject($1, $2, $3)
      `,
      [input.tenant_id, input.admission_number, input.phone_hash],
    );

    return result.rows[0] ?? null;
  }

  async findLinkedParentPasswordAuthSubject(input: {
    tenant_id: string | null;
    admission_number: string;
  }): Promise<ParentPasswordAuthSubject | null> {
    const result = await this.executeSql<ParentPasswordAuthSubject>(
      `
        SELECT user_id::text, tenant_id, role_id::text, role_code, email,
               display_name, phone_number_hash, phone_number_last4,
               password_hash, force_password_change
        FROM app.find_linked_parent_password_auth_subject($1, $2)
      `,
      [input.tenant_id, input.admission_number],
    );

    return result.rows[0] ?? null;
  }

  async findStudentAuthSubject(input: {
    tenant_id: string | null;
    username: string;
    phone_hash: string;
  }): Promise<ParentAuthSubject | null> {
    const result = await this.executeSql<ParentAuthSubject>(
      `
        SELECT user_id::text, tenant_id, role_id::text, role_code, email,
               display_name, phone_number_hash, phone_number_last4,
               force_password_change
        FROM app.find_student_auth_subject_for_otp($1, $2, $3)
      `,
      [input.tenant_id, input.username, input.phone_hash],
    );

    return result.rows[0] ?? null;
  }

  async findStudentPasswordAuthSubject(input: {
    tenant_id: string | null;
    username: string;
  }): Promise<StudentPasswordAuthSubject | null> {
    const result = await this.executeSql<StudentPasswordAuthSubject>(
      `
        SELECT user_id::text, tenant_id, role_id::text, role_code, email,
               display_name, phone_number_hash, phone_number_last4,
               password_hash, force_password_change
        FROM app.find_student_auth_subject_for_password($1, $2)
      `,
      [input.tenant_id, input.username],
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
    purpose?: 'parent_login' | 'student_login';
  }): Promise<ParentOtpChallengeRecord> {
    const result = await this.executeSql<ParentOtpChallengeRecord>(
      `
        WITH invalidated AS (
          UPDATE parent_otp_challenges
          SET consumed_at = NOW()
          WHERE tenant_id = $1
            AND user_id = $2::uuid
            AND purpose = $7
            AND consumed_at IS NULL
          RETURNING id
        )
        INSERT INTO parent_otp_challenges (
          tenant_id,
          user_id,
          email,
          phone_hash,
          phone_last4,
          otp_hash,
          purpose,
          expires_at
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8::timestamptz)
        RETURNING id::text, tenant_id, user_id::text, email, phone_hash, phone_last4,
                  otp_hash, purpose, expires_at, consumed_at, attempts
      `,
      [
        input.tenant_id,
        input.user_id,
        input.email,
        input.phone_hash,
        input.phone_last4,
        input.otp_hash,
        input.purpose ?? 'parent_login',
        input.expires_at,
      ],
    );

    return result.rows[0];
  }

  async getOtpIssuanceState(input: {
    tenant_id: string;
    user_id: string;
    purpose: 'parent_login' | 'student_login';
    window_seconds: number;
  }): Promise<OtpIssuanceState> {
    const result = await this.executeSql<{
      recent_count: number | string;
      latest_created_at: string | Date | null;
    }>(
      `
        SELECT COUNT(*)::integer AS recent_count,
               MAX(created_at) AS latest_created_at
        FROM parent_otp_challenges
        WHERE tenant_id = $1
          AND user_id = $2::uuid
          AND purpose = $3
          AND created_at > NOW() - make_interval(secs => $4::integer)
      `,
      [input.tenant_id, input.user_id, input.purpose, input.window_seconds],
    );

    return {
      recent_count: Number(result.rows[0]?.recent_count ?? 0),
      latest_created_at: result.rows[0]?.latest_created_at ?? null,
    };
  }

  async findChallengeForVerify(challengeId: string): Promise<ParentOtpChallengeRecord | null> {
    const result = await this.executeSql<ParentOtpChallengeRecord>(
      `
        SELECT id::text, tenant_id, user_id::text, email, phone_hash, phone_last4,
               otp_hash, purpose, expires_at, consumed_at, attempts
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

  async completeStudentPasswordSetup(input: {
    tenant_id: string;
    challenge_id: string;
    user_id: string;
    password_hash: string;
  }): Promise<boolean> {
    const result = await this.executeSql<{ completed: boolean }>(
      `
        WITH consumed AS (
          UPDATE parent_otp_challenges
          SET consumed_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
            AND user_id = $3::uuid
            AND purpose = 'student_login'
            AND consumed_at IS NULL
            AND expires_at > NOW()
          RETURNING user_id
        ), updated_user AS (
          UPDATE users
          SET password_hash = $4,
              password_changed_at = NOW(),
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = (SELECT user_id FROM consumed)
          RETURNING id
        ), updated_access AS (
          UPDATE student_portal_access
          SET force_password_change = FALSE,
              updated_at = NOW()
          WHERE tenant_id = $1
            AND user_id = (SELECT id FROM updated_user)
          RETURNING user_id
        ), audit_entry AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, action, resource_type, resource_id, metadata
          )
          SELECT $1, user_id, 'student_portal.password_set', 'student_portal_access',
                 user_id::text, jsonb_build_object('verification', 'guardian_otp')
          FROM updated_access
          RETURNING id
        )
        SELECT EXISTS(SELECT 1 FROM audit_entry) AS completed
      `,
      [input.tenant_id, input.challenge_id, input.user_id, input.password_hash],
    );

    return Boolean(result.rows[0]?.completed);
  }

  async completeParentPasswordSetup(input: {
    tenant_id: string;
    challenge_id: string;
    user_id: string;
    password_hash: string;
  }): Promise<boolean> {
    const result = await this.executeSql<{ completed: boolean }>(
      `
        WITH consumed AS (
          UPDATE parent_otp_challenges
          SET consumed_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
            AND user_id = $3::uuid
            AND purpose = 'parent_login'
            AND consumed_at IS NULL
            AND expires_at > NOW()
          RETURNING user_id
        ), updated_user AS (
          UPDATE users
          SET password_hash = $4,
              password_changed_at = NOW(),
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = (SELECT user_id FROM consumed)
          RETURNING id
        ), audit_entry AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, action, resource_type, resource_id, metadata
          )
          SELECT $1, id, 'parent_portal.password_set', 'guardian_profile',
                 id::text, jsonb_build_object('verification', 'child_admission_guardian_otp')
          FROM updated_user
          RETURNING id
        )
        SELECT EXISTS(SELECT 1 FROM audit_entry) AS completed
      `,
      [input.tenant_id, input.challenge_id, input.user_id, input.password_hash],
    );

    return Boolean(result.rows[0]?.completed);
  }
}
