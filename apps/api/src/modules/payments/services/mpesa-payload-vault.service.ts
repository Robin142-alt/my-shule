import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';

import { PrismaService } from '../../../database/prisma.service';
import { PiiEncryptionService } from '../../security/pii-encryption.service';

const PHONE_KEYS = new Set(['msisdn', 'phonenumber', 'phone_number']);
const NAME_KEYS = new Set(['firstname', 'middlename', 'lastname', 'payer_name', 'payername']);
const SUPPORT_PAYLOAD_PERMISSION = 'payments:mpesa_payload:read';
const SUPPORT_PII_PERMISSION = 'support:pii:read';

export interface StoredMpesaPayload {
  raw_payload_encrypted_ref: string;
  payload_sha256: string;
  redacted_payload: Record<string, unknown>;
}

@Injectable()
export class MpesaPayloadVaultService {

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly piiEncryptionService: PiiEncryptionService,
  ) {}

  redactOperationalPayload<T>(payload: T): T {
    return redactMpesaOperationalPayload(payload);
  }

  async storePayload(input: {
    tenant_id: string;
    source: 'callback_logs' | 'mpesa_transactions' | 'mpesa_c2b_payments';
    source_id: string;
    purpose: 'stk_callback' | 'c2b_confirmation' | 'transaction_snapshot';
    payload: Record<string, unknown>;
  }): Promise<StoredMpesaPayload> {
    const payloadJson = stableStringify(input.payload);
    const payloadSha256 = createHash('sha256').update(payloadJson).digest('hex');
    const rawPayloadEncryptedRef = [
      'mpesa-payload',
      normalizeRefPart(input.tenant_id),
      input.source,
      payloadSha256.slice(0, 24),
    ].join(':');
    const encryptedPayload = this.piiEncryptionService.encrypt(
      payloadJson,
      this.payloadAad(input.tenant_id, rawPayloadEncryptedRef),
    );
    const redactedPayload = redactMpesaOperationalPayload(input.payload);

    await this.executeSql(
      `
        INSERT INTO mpesa_payload_vault (
          tenant_id,
          raw_payload_encrypted_ref,
          source,
          source_id,
          payload_sha256,
          encrypted_payload,
          redacted_payload,
          purpose
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
        ON CONFLICT (tenant_id, raw_payload_encrypted_ref)
        DO UPDATE SET
          source = EXCLUDED.source,
          source_id = EXCLUDED.source_id,
          redacted_payload = EXCLUDED.redacted_payload,
          purpose = EXCLUDED.purpose,
          updated_at = NOW()
      `,
      [
        input.tenant_id,
        rawPayloadEncryptedRef,
        input.source,
        input.source_id,
        payloadSha256,
        encryptedPayload,
        JSON.stringify(redactedPayload),
        input.purpose,
      ],
    );

    return {
      raw_payload_encrypted_ref: rawPayloadEncryptedRef,
      payload_sha256: payloadSha256,
      redacted_payload: redactedPayload,
    };
  }

  async retrieveForSupport(input: {
    tenant_id: string;
    raw_payload_encrypted_ref: string;
    actor_user_id: string;
    permissions: string[];
    ticket_id: string;
    reason: string;
    access_expires_at: string;
    now?: string;
  }): Promise<Record<string, unknown>> {
    if (
      !input.permissions.includes(SUPPORT_PAYLOAD_PERMISSION) &&
      !input.permissions.includes(SUPPORT_PII_PERMISSION)
    ) {
      throw new UnauthorizedException('Support payload retrieval requires elevated permission');
    }

    const ticketId = input.ticket_id.trim();
    const reason = input.reason.trim();

    if (!ticketId || !reason) {
      throw new BadRequestException('Support payload retrieval requires a ticket id and reason');
    }

    const accessExpiresAt = this.requireSupportAccessExpiry(input.access_expires_at, input.now);

    const result = await this.executeSql<{
      raw_payload_encrypted_ref: string;
      encrypted_payload: string;
      payload_sha256: string;
    }>(
      `
        SELECT raw_payload_encrypted_ref, encrypted_payload, payload_sha256
        FROM mpesa_payload_vault
        WHERE tenant_id = $1
          AND raw_payload_encrypted_ref = $2
        LIMIT 1
      `,
      [input.tenant_id, input.raw_payload_encrypted_ref],
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException('M-PESA payload vault record was not found');
    }

    await this.executeSql(
      `
        INSERT INTO mpesa_payload_support_access_logs (
          tenant_id,
          raw_payload_encrypted_ref,
          actor_user_id,
          ticket_id,
          reason,
          payload_sha256,
          access_expires_at
        )
        VALUES ($1, $2, $3::uuid, $4, $5, $6, $7::timestamptz)
      `,
      [
        input.tenant_id,
        input.raw_payload_encrypted_ref,
        input.actor_user_id,
        ticketId,
        reason,
        row.payload_sha256,
        accessExpiresAt,
      ],
    );

    return JSON.parse(
      this.piiEncryptionService.decrypt(
        row.encrypted_payload,
        this.payloadAad(input.tenant_id, row.raw_payload_encrypted_ref),
      ),
    ) as Record<string, unknown>;
  }

  async retrieveForSupportExport(input: {
    tenant_id: string;
    raw_payload_encrypted_ref: string;
    actor_user_id: string;
    permissions: string[];
    ticket_id: string;
    reason: string;
    access_expires_at: string;
    now?: string;
  }): Promise<Record<string, unknown>> {
    if (
      !input.permissions.includes(SUPPORT_PAYLOAD_PERMISSION) &&
      !input.permissions.includes(SUPPORT_PII_PERMISSION)
    ) {
      throw new UnauthorizedException('Support payload export requires elevated permission');
    }

    const ticketId = input.ticket_id.trim();
    const reason = input.reason.trim();

    if (!ticketId || !reason) {
      throw new BadRequestException('Support payload export requires a ticket id and reason');
    }

    const accessExpiresAt = this.requireSupportAccessExpiry(input.access_expires_at, input.now);

    const result = await this.executeSql<{
      raw_payload_encrypted_ref: string;
      payload_sha256: string;
      redacted_payload: Record<string, unknown> | string;
    }>(
      `
        SELECT raw_payload_encrypted_ref, payload_sha256, redacted_payload
        FROM mpesa_payload_vault
        WHERE tenant_id = $1
          AND raw_payload_encrypted_ref = $2
        LIMIT 1
      `,
      [input.tenant_id, input.raw_payload_encrypted_ref],
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException('M-PESA payload vault record was not found');
    }

    await this.executeSql(
      `
        INSERT INTO mpesa_payload_support_access_logs (
          tenant_id,
          raw_payload_encrypted_ref,
          actor_user_id,
          ticket_id,
          reason,
          payload_sha256,
          access_expires_at
        )
        VALUES ($1, $2, $3::uuid, $4, $5, $6, $7::timestamptz)
      `,
      [
        input.tenant_id,
        input.raw_payload_encrypted_ref,
        input.actor_user_id,
        ticketId,
        reason,
        row.payload_sha256,
        accessExpiresAt,
      ],
    );

    const redactedPayload =
      typeof row.redacted_payload === 'string'
        ? JSON.parse(row.redacted_payload) as Record<string, unknown>
        : row.redacted_payload;

    return redactMpesaOperationalPayload(redactedPayload ?? {});
  }

  async retrieveForProcessing(input: {
    tenant_id: string;
    raw_payload_encrypted_ref: string;
  }): Promise<Record<string, unknown>> {
    const result = await this.executeSql<{
      raw_payload_encrypted_ref: string;
      encrypted_payload: string;
    }>(
      `
        SELECT raw_payload_encrypted_ref, encrypted_payload
        FROM mpesa_payload_vault
        WHERE tenant_id = $1
          AND raw_payload_encrypted_ref = $2
        LIMIT 1
      `,
      [input.tenant_id, input.raw_payload_encrypted_ref],
    );
    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException('M-PESA payload vault record was not found');
    }

    return JSON.parse(
      this.piiEncryptionService.decrypt(
        row.encrypted_payload,
        this.payloadAad(input.tenant_id, row.raw_payload_encrypted_ref),
      ),
    ) as Record<string, unknown>;
  }

  private payloadAad(tenantId: string, rawPayloadEncryptedRef: string): string {
    return `mpesa_payload_vault:${tenantId}:${rawPayloadEncryptedRef}`;
  }

  private requireSupportAccessExpiry(value: string, nowValue?: string): string {
    const expiresAt = value.trim();
    const expiresAtMs = Date.parse(expiresAt);

    if (!expiresAt || Number.isNaN(expiresAtMs)) {
      throw new BadRequestException('Support payload retrieval requires a time-limited access expiry');
    }

    const nowMs = nowValue ? Date.parse(nowValue) : Date.now();

    if (Number.isNaN(nowMs)) {
      throw new BadRequestException('Support payload retrieval timestamp is invalid');
    }

    if (expiresAtMs <= nowMs) {
      throw new BadRequestException('Support payload retrieval access window has expired');
    }

    if (expiresAtMs - nowMs > 60 * 60 * 1000) {
      throw new BadRequestException('Support payload retrieval access window cannot exceed 60 minutes');
    }

    return new Date(expiresAtMs).toISOString();
  }
}

export function redactMpesaOperationalPayload<T>(payload: T): T {
  return redactValue(payload) as T;
}

export function maskMpesaPhoneNumber(value: unknown): string | null {
  return maskPhoneNumber(value);
}

export function maskMpesaName(value: unknown): string | null {
  return maskName(value);
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.Name === 'string' && Object.hasOwn(record, 'Value')) {
    const itemName = normalizeKey(record.Name);

    if (PHONE_KEYS.has(itemName)) {
      return {
        ...record,
        Value: maskPhoneNumber(record.Value),
      };
    }

    if (NAME_KEYS.has(itemName)) {
      return {
        ...record,
        Value: maskName(record.Value),
      };
    }
  }

  const redacted: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(record)) {
    const normalizedKey = normalizeKey(key);

    if (PHONE_KEYS.has(normalizedKey)) {
      redacted[key] = maskPhoneNumber(nestedValue);
      continue;
    }

    if (NAME_KEYS.has(normalizedKey)) {
      redacted[key] = maskName(nestedValue);
      continue;
    }

    redacted[key] = redactValue(nestedValue);
  }

  return redacted;
}

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

function normalizeRefPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableStringify(nestedValue)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function maskPhoneNumber(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();

  if (normalized.includes('*')) {
    return normalized;
  }

  const digitsOnly = normalized.replace(/\D/g, '');

  if (digitsOnly.length <= 4) {
    return '*'.repeat(digitsOnly.length);
  }

  return `${digitsOnly.slice(0, 4)}${'*'.repeat(Math.max(0, digitsOnly.length - 6))}${digitsOnly.slice(-2)}`;
}

function maskName(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();

  if (!normalized) {
    return null;
  }

  if (normalized.includes('*')) {
    return normalized;
  }

  return `${normalized.slice(0, 1)}${'*'.repeat(Math.max(2, normalized.length - 1))}`;
}
