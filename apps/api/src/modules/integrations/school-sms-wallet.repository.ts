import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type { ReservedSmsCredits, SmsWalletRecord } from './integrations.types';

@Injectable()
export class SchoolSmsWalletRepository {

  private async executeSql<T = any>(
    query: string,
    params: any[] = [],
    tx?: any,
  ): Promise<{ rows: T[], rowCount: number }> {
    const tenantId = typeof params[0] === 'string' ? params[0].trim() : '';

    if (!tenantId) {
      throw new Error('Tenant-owned SMS wallet SQL requires a tenant identifier');
    }

    const execute = async (client: any) => {
      const result = await client.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
      return { rows: arr as T[], rowCount: arr.length };
    };

    if (tx) {
      return execute(tx);
    }

    return this.prisma.executeWithTenant(tenantId, null, execute);
  }

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateWallet(tenantId: string, tx?: any): Promise<SmsWalletRecord> {
    const result = await this.executeSql<SmsWalletRecord>(
      `
        INSERT INTO school_sms_wallets (tenant_id)
        VALUES ($1)
        ON CONFLICT (tenant_id)
        DO UPDATE SET updated_at = school_sms_wallets.updated_at
        RETURNING id::text, tenant_id, sms_balance, monthly_used, monthly_limit, sms_plan,
                  low_balance_threshold, allow_negative_balance, billing_status,
                  last_reset_at, created_at, updated_at
      `,
      [tenantId],
      tx,
    );

    return this.mapWallet(result.rows[0]);
  }

  async adjustWallet(input: {
    tenant_id: string;
    quantity: number;
    reason: string;
    reference?: string | null;
    actor_user_id?: string | null;
  }): Promise<SmsWalletRecord> {
    const result = await this.executeSql<SmsWalletRecord>(
      `
        WITH wallet AS (
          INSERT INTO school_sms_wallets (tenant_id)
          VALUES ($1)
          ON CONFLICT (tenant_id)
          DO UPDATE SET updated_at = school_sms_wallets.updated_at
          RETURNING *
        ),
        updated_wallet AS (
          UPDATE school_sms_wallets
          SET sms_balance = sms_balance + $2,
              updated_at = NOW()
          WHERE tenant_id = $1
          RETURNING *
        ),
        ledger AS (
          INSERT INTO sms_wallet_transactions (
            tenant_id,
            transaction_type,
            quantity,
            balance_after,
            reference,
            reason,
            created_by_user_id
          )
          SELECT $1,
                 CASE WHEN $2 >= 0 THEN 'adjustment' ELSE 'deduction' END,
                 $2,
                 sms_balance,
                 $3,
                 $4,
                 $5
          FROM updated_wallet
        )
        SELECT id::text, tenant_id, sms_balance, monthly_used, monthly_limit, sms_plan,
               low_balance_threshold, allow_negative_balance, billing_status,
               last_reset_at, created_at, updated_at
        FROM updated_wallet
      `,
      [
        input.tenant_id,
        input.quantity,
        input.reference ?? null,
        input.reason,
        input.actor_user_id ?? null,
      ],
    );

    return this.mapWallet(result.rows[0]);
  }

  async reserveSmsCredits(input: {
    tenant_id: string;
    recipient_ciphertext: string;
    recipient_last4: string | null;
    recipient_hash: string;
    message_ciphertext?: string | null;
    message_preview?: string | null;
    message_type?: string | null;
    credit_cost: number;
    sent_by_user_id?: string | null;
  }): Promise<ReservedSmsCredits> {
    return this.prisma.executeWithTenant(input.tenant_id, input.sent_by_user_id, (tx) =>
      this.reserveSmsCreditsInTransaction(input, tx),
    );
  }

  private async reserveSmsCreditsInTransaction(input: {
    tenant_id: string;
    recipient_ciphertext: string;
    recipient_last4: string | null;
    recipient_hash: string;
    message_ciphertext?: string | null;
    message_preview?: string | null;
    message_type?: string | null;
    credit_cost: number;
    sent_by_user_id?: string | null;
  }, tx: any): Promise<ReservedSmsCredits> {
    const wallet = await this.getOrCreateWalletForUpdate(input.tenant_id, tx);

    if (
      wallet.monthly_limit !== null
      && wallet.monthly_used + input.credit_cost > wallet.monthly_limit
      && !wallet.allow_negative_balance
    ) {
      const log = await this.insertSmsLog({
        ...input,
        status: 'rejected',
        failure_reason: 'SMS monthly limit exceeded',
      }, tx);
      return {
        accepted: false,
        reason: 'SMS monthly limit exceeded',
        log_id: log.id,
        balance_after: wallet.sms_balance,
      };
    }

    if (wallet.sms_balance < input.credit_cost && !wallet.allow_negative_balance) {
      const log = await this.insertSmsLog({
        ...input,
        status: 'rejected',
        failure_reason: 'SMS balance exhausted',
      }, tx);
      return {
        accepted: false,
        reason: 'SMS balance exhausted',
        log_id: log.id,
        balance_after: wallet.sms_balance,
      };
    }

    const updated = await this.executeSql<{ sms_balance: number; monthly_used: number }>(
      `
        UPDATE school_sms_wallets
        SET sms_balance = sms_balance - $2,
            monthly_used = monthly_used + $2,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND (
            allow_negative_balance
            OR sms_balance >= $2
          )
          AND (
            monthly_limit IS NULL
            OR allow_negative_balance
            OR monthly_used + $2 <= monthly_limit
          )
        RETURNING sms_balance, monthly_used
      `,
      [input.tenant_id, input.credit_cost],
      tx,
    );

    if (!updated.rows[0]) {
      const currentWallet = await this.getOrCreateWallet(input.tenant_id, tx);
      const reason =
        currentWallet.monthly_limit !== null
        && currentWallet.monthly_used + input.credit_cost > currentWallet.monthly_limit
        && !currentWallet.allow_negative_balance
          ? 'SMS monthly limit exceeded'
          : 'SMS balance exhausted';
      const log = await this.insertSmsLog({
        ...input,
        status: 'rejected',
        failure_reason: reason,
      }, tx);

      return {
        accepted: false,
        reason,
        log_id: log.id,
        balance_after: currentWallet.sms_balance,
      };
    }

    const balanceAfter = updated.rows[0]?.sms_balance ?? wallet.sms_balance - input.credit_cost;

    const log = await this.insertSmsLog({ ...input, status: 'queued', failure_reason: null }, tx);

    await this.executeSql(
      `
        INSERT INTO sms_wallet_transactions (
          tenant_id,
          transaction_type,
          quantity,
          balance_after,
          reference,
          reason,
          created_by_user_id
        )
        VALUES ($1, 'deduction', $2, $3, $4, $5, $6)
      `,
      [
        input.tenant_id,
        -input.credit_cost,
        balanceAfter,
        log.id,
        input.message_type ?? 'sms_send',
        input.sent_by_user_id ?? null,
      ],
      tx,
    );

    return {
      accepted: true,
      log_id: log.id,
      balance_after: balanceAfter,
      credit_cost: input.credit_cost,
    };
  }

  async markSmsLogProviderAccepted(input: {
    log_id: string;
    tenant_id: string;
    provider_id?: string | null;
    provider_message_id?: string | null;
  }): Promise<void> {
    await this.executeSql(
      `
        UPDATE sms_logs
        SET status = 'provider_accepted',
            provider_id = $3::uuid,
            provider_message_id = $4,
            provider_accepted_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
      `,
      [
        input.tenant_id,
        input.log_id,
        input.provider_id ?? null,
        input.provider_message_id ?? null,
      ],
    );
  }

  async markSmsLogDeliveryUnknown(input: {
    log_id: string;
    tenant_id: string;
    provider_id?: string | null;
    provider_message_id?: string | null;
    failure_reason: string;
  }): Promise<void> {
    await this.executeSql(
      `
        UPDATE sms_logs
        SET status = 'delivery_unknown',
            provider_id = COALESCE($3::uuid, provider_id),
            provider_message_id = COALESCE($4, provider_message_id),
            failure_reason = $5,
            delivery_unknown_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
      `,
      [
        input.tenant_id,
        input.log_id,
        input.provider_id ?? null,
        input.provider_message_id ?? null,
        input.failure_reason,
      ],
    );
  }

  async markSmsLogFailed(input: {
    log_id: string;
    tenant_id: string;
    failure_reason: string;
  }): Promise<void> {
    await this.executeSql(
      `
        UPDATE sms_logs
        SET status = 'failed',
            failure_reason = $3,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
      `,
      [
        input.tenant_id,
        input.log_id,
        input.failure_reason,
      ],
    );
  }

  async markSmsLogFailedAndRefund(input: {
    tenant_id: string;
    log_id: string;
    credit_cost: number;
    failure_reason: string;
    reason: string;
    actor_user_id?: string | null;
  }): Promise<void> {
    await this.prisma.executeWithTenant(input.tenant_id, input.actor_user_id, async (tx) => {
      const failed = await this.executeSql<{ id: string }>(
        `
          UPDATE sms_logs
          SET status = 'failed',
              failure_reason = $3,
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
            AND status NOT IN ('provider_accepted', 'delivery_unknown', 'delivered')
          RETURNING id::text
        `,
        [input.tenant_id, input.log_id, input.failure_reason],
        tx,
      );

      if (failed.rows[0]) {
        await this.refundSmsCreditsInTransaction(input, tx);
      }
    });
  }

  async refundSmsCredits(input: {
    tenant_id: string;
    log_id: string;
    credit_cost: number;
    reason: string;
    actor_user_id?: string | null;
  }): Promise<void> {
    await this.prisma.executeWithTenant(input.tenant_id, input.actor_user_id, (tx) =>
      this.refundSmsCreditsInTransaction(input, tx),
    );
  }

  private async refundSmsCreditsInTransaction(input: {
    tenant_id: string;
    log_id: string;
    credit_cost: number;
    reason: string;
    actor_user_id?: string | null;
  }, tx: any): Promise<void> {
    await this.executeSql(
      `
        SELECT pg_advisory_xact_lock(hashtextextended($2, 0))
      `,
      [input.tenant_id, `sms-refund:${input.tenant_id}:${input.log_id}`],
      tx,
    );

    const existingRefund = await this.executeSql<{ id: string }>(
      `
        SELECT id::text
        FROM sms_wallet_transactions
        WHERE tenant_id = $1
          AND transaction_type = 'refund'
          AND reference = $2
        LIMIT 1
      `,
      [input.tenant_id, input.log_id],
      tx,
    );

    if (existingRefund.rows[0]) {
      return;
    }

    const updated = await this.executeSql<{ sms_balance: number; monthly_used: number }>(
      `
        UPDATE school_sms_wallets
        SET sms_balance = sms_balance + $2,
            monthly_used = GREATEST(monthly_used - $2, 0),
            updated_at = NOW()
        WHERE tenant_id = $1
        RETURNING sms_balance, monthly_used
      `,
      [input.tenant_id, input.credit_cost],
      tx,
    );
    const balanceAfter = updated.rows[0]?.sms_balance ?? 0;

    await this.executeSql(
      `
        INSERT INTO sms_wallet_transactions (
          tenant_id,
          transaction_type,
          quantity,
          balance_after,
          reference,
          reason,
          created_by_user_id
        )
        VALUES ($1, 'refund', $2, $3, $4, $5, $6)
      `,
      [
        input.tenant_id,
        input.credit_cost,
        balanceAfter,
        input.log_id,
        input.reason,
        input.actor_user_id ?? null,
      ],
      tx,
    );
  }

  async listLogs(tenantId: string, limit = 50): Promise<Array<Record<string, unknown>>> {
    const result = await this.executeSql(
      `
        SELECT id::text, recipient_last4, message_preview, message_type, status,
               credit_cost, provider_message_id, failure_reason,
               provider_accepted_at::text, delivery_unknown_at::text,
               sent_at::text, delivered_at::text, created_at::text
        FROM sms_logs
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [tenantId, Math.min(Math.max(limit, 1), 200)],
    );

    return result.rows;
  }

  async createPurchaseRequest(input: {
    tenant_id: string;
    quantity: number;
    note?: string | null;
    requested_by_user_id?: string | null;
  }): Promise<Record<string, unknown>> {
    const result = await this.executeSql(
      `
        INSERT INTO sms_purchase_requests (
          tenant_id,
          quantity,
          note,
          requested_by_user_id
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id::text, tenant_id, quantity, status, note, created_at::text
      `,
      [
        input.tenant_id,
        input.quantity,
        input.note ?? null,
        input.requested_by_user_id ?? null,
      ],
    );

    return result.rows[0];
  }

  hashRecipient(recipient: string): string {
    return createHash('sha256').update(recipient.replace(/\D/g, '')).digest('hex');
  }

  private async getOrCreateWalletForUpdate(tenantId: string, tx?: any): Promise<SmsWalletRecord> {
    await this.getOrCreateWallet(tenantId, tx);
    const result = await this.executeSql<SmsWalletRecord>(
      `
        SELECT id::text, tenant_id, sms_balance, monthly_used, monthly_limit, sms_plan,
               low_balance_threshold, allow_negative_balance, billing_status,
               last_reset_at, created_at, updated_at
        FROM school_sms_wallets
        WHERE tenant_id = $1
        FOR UPDATE
      `,
      [tenantId],
      tx,
    );

    return this.mapWallet(result.rows[0]);
  }

  private async insertSmsLog(input: {
    tenant_id: string;
    recipient_ciphertext: string;
    recipient_last4: string | null;
    recipient_hash: string;
    message_ciphertext?: string | null;
    message_preview?: string | null;
    message_type?: string | null;
    credit_cost: number;
    sent_by_user_id?: string | null;
    status: string;
    failure_reason?: string | null;
  }, tx?: any): Promise<{ id: string }> {
    const result = await this.executeSql<{ id: string }>(
      `
        INSERT INTO sms_logs (
          tenant_id,
          recipient_ciphertext,
          recipient_last4,
          recipient_hash,
          message_ciphertext,
          message_preview,
          message_type,
          status,
          credit_cost,
          failure_reason,
          sent_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id::text
      `,
      [
        input.tenant_id,
        input.recipient_ciphertext,
        input.recipient_last4,
        input.recipient_hash,
        input.message_ciphertext ?? null,
        input.message_preview ?? null,
        input.message_type ?? null,
        input.status,
        input.credit_cost,
        input.failure_reason ?? null,
        input.sent_by_user_id ?? null,
      ],
      tx,
    );

    return result.rows[0];
  }

  private mapWallet(row: SmsWalletRecord): SmsWalletRecord {
    return {
      ...row,
      sms_balance: Number(row.sms_balance),
      monthly_used: Number(row.monthly_used),
      monthly_limit: row.monthly_limit === null ? null : Number(row.monthly_limit),
      low_balance_threshold: Number(row.low_balance_threshold),
      allow_negative_balance: Boolean(row.allow_negative_balance),
      created_at: this.formatDate(row.created_at),
      updated_at: this.formatDate(row.updated_at),
      last_reset_at: row.last_reset_at ? this.formatDate(row.last_reset_at) : null,
    };
  }

  private formatDate(value: string | Date): string {
    return value instanceof Date ? value.toISOString() : value;
  }
}
