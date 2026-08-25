import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import {
  ClaimedOutboxEvent,
  DomainEvent,
  OutboxEventStatus,
  PublishDomainEventInput,
} from '../events.types';

interface OutboxEventRow {
  id: string;
  tenant_id: string;
  school_id: string;
  event_key: string;
  event_name: DomainEvent['event_name'];
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  headers: Record<string, unknown> | null;
  status: OutboxEventStatus;
  attempt_count: number;
  available_at: Date;
  published_at: Date | null;
  last_error: string | null;
  actor_user_id: string | null;
  actor_role: string | null;
  source_dashboard: string | null;
  correlation_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ClaimedOutboxEventRow {
  id: string;
  tenant_id: string;
  request_id: string;
  trace_id: string;
  span_id: string | null;
  user_id: string;
  role: string | null;
  session_id: string | null;
}

interface DashboardStreamCursor {
  createdAt: string | null;
  eventId: string | null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class OutboxEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async executeSql<T = any>(query: string, params: any[] = [], tx?: any): Promise<{ rows: T[], rowCount: number }> {
    if (tx) {
      const result = await tx.$queryRawUnsafe(query, ...params);
      const rows = Array.isArray(result) ? result : [result];
      return { rows, rowCount: rows.length };
    }

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

  async createEvent<TName extends DomainEvent['event_name']>(
    input: PublishDomainEventInput<TName>,
    tx?: any,
  ): Promise<DomainEvent<TName>> {
    const result = await this.executeSql<OutboxEventRow>(
      `
        INSERT INTO outbox_events (
          tenant_id,
          school_id,
          event_key,
          event_name,
          aggregate_type,
          aggregate_id,
          payload,
          headers,
          status,
          available_at,
          actor_user_id,
          actor_role,
          source_dashboard,
          correlation_id
        )
        VALUES ($1, $2, $3, $4, $5, $6::uuid, $7::jsonb, $8::jsonb, 'pending', COALESCE($9::timestamptz, NOW()), $10::uuid, $11, $12, $13::uuid)
        ON CONFLICT (tenant_id, event_key)
        DO UPDATE SET
          headers = COALESCE(outbox_events.headers, '{}'::jsonb) || EXCLUDED.headers,
          actor_user_id = EXCLUDED.actor_user_id,
          actor_role = EXCLUDED.actor_role,
          source_dashboard = EXCLUDED.source_dashboard,
          correlation_id = EXCLUDED.correlation_id
        RETURNING
          id,
          tenant_id,
          school_id,
          event_key,
          event_name,
          aggregate_type,
          aggregate_id,
          payload,
          headers,
          status,
          attempt_count,
          available_at,
          published_at,
          last_error,
          actor_user_id,
          actor_role,
          source_dashboard,
          correlation_id,
          created_at,
          updated_at
      `,
      [
        input.tenant_id,
        input.school_id,
        input.event_key,
        input.event_name,
        input.aggregate_type,
        input.aggregate_id,
        JSON.stringify(input.payload),
        JSON.stringify(input.headers ?? {}),
        input.available_at ?? null,
        input.actor_user_id ?? null,
        input.actor_role ?? null,
        input.source_dashboard ?? null,
        input.correlation_id ?? null,
      ],
      tx,
    );

    return this.mapRow(result.rows[0]) as DomainEvent<TName>;
  }

  async lockPendingBatch(
    batchSize: number,
    staleProcessingAfterMs: number,
    tx?: any,
  ): Promise<ClaimedOutboxEvent[]> {
    const result = await this.executeSql<ClaimedOutboxEventRow>(
      `
        SELECT
          id,
          tenant_id,
          request_id,
          trace_id,
          span_id,
          user_id,
          role,
          session_id
        FROM app.claim_outbox_events($1::integer, $2::integer)
      `,
      [batchSize, staleProcessingAfterMs],
      tx,
    );

    return result.rows.map((row) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      request_id: row.request_id,
      trace_id: row.trace_id,
      span_id: row.span_id,
      user_id: row.user_id,
      role: row.role,
      session_id: row.session_id,
    }));
  }

  async findById(tenantId: string, outboxEventId: string, forUpdate = false): Promise<DomainEvent | null> {
    const result = await this.executeSql<OutboxEventRow>(
      `
        SELECT
          id,
          tenant_id,
          school_id,
          event_key,
          event_name,
          aggregate_type,
          aggregate_id,
          payload,
          headers,
          status,
          attempt_count,
          available_at,
          published_at,
          last_error,
          actor_user_id,
          actor_role,
          source_dashboard,
          correlation_id,
          created_at,
          updated_at
        FROM outbox_events
        WHERE tenant_id = $1
          AND id = $2::uuid
        LIMIT 1
        ${forUpdate ? 'FOR UPDATE' : ''}
      `,
      [tenantId, outboxEventId],
    );

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async listDashboardStreamEvents(
    tenantId: string,
    options: { since?: string | null; limit?: number } = {},
  ): Promise<DomainEvent[]> {
    const limit = this.normalizeDashboardStreamLimit(options.limit);
    const cursor = this.parseDashboardStreamCursor(options.since);
    const result = await this.executeSql<OutboxEventRow>(
      `
        SELECT
          id,
          tenant_id,
          school_id,
          event_key,
          event_name,
          aggregate_type,
          aggregate_id,
          payload,
          headers,
          status,
          attempt_count,
          available_at,
          published_at,
          last_error,
          actor_user_id,
          actor_role,
          source_dashboard,
          correlation_id,
          created_at,
          updated_at
        FROM outbox_events
        WHERE tenant_id = $1
          AND status = 'published'
          AND (
            $2::timestamptz IS NULL
            OR ($3::uuid IS NULL AND created_at > $2::timestamptz)
            OR ($3::uuid IS NOT NULL AND (created_at, id) > ($2::timestamptz, $3::uuid))
          )
        ORDER BY created_at ASC, id ASC
        LIMIT $4::integer
      `,
      [tenantId, cursor.createdAt, cursor.eventId, limit],
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async markPublished(tenantId: string, outboxEventId: string): Promise<void> {
    await this.executeSql(
      `
        UPDATE outbox_events
        SET
          status = 'published',
          published_at = NOW(),
          last_error = NULL,
          updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
      `,
      [tenantId, outboxEventId],
    );
  }

  async markFailed(
    tenantId: string,
    outboxEventId: string,
    errorMessage: string,
    retryDelayMs: number,
    maxAttempts: number,
    tx?: any,
  ): Promise<void> {
    await this.executeSql(
      `
        UPDATE outbox_events
        SET
          status = CASE
            WHEN attempt_count >= $4 THEN 'discarded'
            ELSE 'failed'
          END,
          available_at = CASE
            WHEN attempt_count >= $4 THEN NOW()
            ELSE NOW() + ($3 * INTERVAL '1 millisecond')
          END,
          last_error = $5,
          updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
      `,
      [tenantId, outboxEventId, retryDelayMs, maxAttempts, errorMessage],
      tx,
    );
  }

  private mapRow(row: OutboxEventRow): DomainEvent {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      school_id: row.school_id,
      event_key: row.event_key,
      event_name: row.event_name,
      aggregate_type: row.aggregate_type,
      aggregate_id: row.aggregate_id,
      payload: row.payload as unknown as DomainEvent['payload'],
      headers: row.headers ?? {},
      status: row.status,
      attempt_count: row.attempt_count,
      available_at: row.available_at.toISOString(),
      published_at: row.published_at?.toISOString() ?? null,
      last_error: row.last_error,
      actor_user_id: row.actor_user_id,
      actor_role: row.actor_role,
      source_dashboard: row.source_dashboard,
      correlation_id: row.correlation_id,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  private parseDashboardStreamCursor(cursor: string | null | undefined): DashboardStreamCursor {
    if (!cursor) {
      return { createdAt: null, eventId: null };
    }

    const [createdAt, eventId] = cursor.split('|');
    const normalizedCreatedAt = this.normalizeCursorTimestamp(createdAt);

    return {
      createdAt: normalizedCreatedAt,
      eventId: normalizedCreatedAt && eventId && UUID_PATTERN.test(eventId.trim()) ? eventId.trim() : null,
    };
  }

  private normalizeCursorTimestamp(value: string | undefined): string | null {
    const timestamp = value?.trim();

    if (!timestamp || !Number.isFinite(Date.parse(timestamp))) {
      return null;
    }

    return timestamp;
  }

  private normalizeDashboardStreamLimit(limit: number | undefined): number {
    const parsedLimit = Number(limit ?? 50);

    if (!Number.isFinite(parsedLimit)) {
      return 50;
    }

    return Math.min(Math.max(Math.trunc(parsedLimit), 1), 100);
  }
}
