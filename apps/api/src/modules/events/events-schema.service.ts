import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { AuthSchemaService } from '../../auth/auth-schema.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EventsSchemaService implements OnModuleInit {
  private static bootstrapPromise: Promise<void> | null = null;

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

  private readonly logger = new Logger(EventsSchemaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authSchemaService: AuthSchemaService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!EventsSchemaService.bootstrapPromise) {
      EventsSchemaService.bootstrapPromise = this.bootstrapSchema().catch((error) => {
        EventsSchemaService.bootstrapPromise = null;
        throw error;
      });
    }

    await EventsSchemaService.bootstrapPromise;
  }

  static resetBootstrapForTests(): void {
    EventsSchemaService.bootstrapPromise = null;
  }

  private async bootstrapSchema(): Promise<void> {
    await this.authSchemaService.onModuleInit();

    await this.prisma.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE OR REPLACE FUNCTION sync_event_school_columns()
      RETURNS trigger AS $$
      BEGIN
        NEW.tenant_id = COALESCE(NULLIF(NEW.tenant_id, ''), NULLIF(NEW.school_id, ''));
        NEW.school_id = COALESCE(NULLIF(NEW.school_id, ''), NULLIF(NEW.tenant_id, ''));
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        actor_user_id uuid,
        request_id text,
        action text NOT NULL,
        resource_type text NOT NULL,
        resource_id uuid,
        aggregate_id uuid,
        ip_address inet,
        user_agent text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        occurred_at timestamptz NOT NULL DEFAULT NOW(),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_audit_logs_action_not_blank CHECK (btrim(action) <> ''),
        CONSTRAINT ck_audit_logs_resource_type_not_blank CHECK (btrim(resource_type) <> ''),
        CONSTRAINT fk_audit_logs_actor_user
          FOREIGN KEY (actor_user_id)
          REFERENCES users (id)
          ON DELETE SET NULL
      );

      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id text;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_id text;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type text;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id uuid;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS aggregate_id uuid;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS occurred_at timestamptz;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();

      DO $$
      DECLARE
        has_invalid_ids boolean;
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'audit_logs'
            AND column_name = 'id'
            AND data_type = 'text'
        ) THEN
          SELECT EXISTS (
            SELECT 1 FROM audit_logs
            WHERE id IS NOT NULL
              AND id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          ) INTO has_invalid_ids;

          IF has_invalid_ids THEN
            RAISE EXCEPTION 'Cannot migrate audit_logs.id from text to uuid because non-UUID IDs exist';
          END IF;

          ALTER TABLE audit_logs ALTER COLUMN id DROP DEFAULT;
          ALTER TABLE audit_logs ALTER COLUMN id TYPE uuid USING id::uuid;
          ALTER TABLE audit_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'audit_logs'
            AND column_name = 'actor_user_id'
            AND data_type = 'text'
        ) THEN
          SELECT EXISTS (
            SELECT 1 FROM audit_logs
            WHERE actor_user_id IS NOT NULL
              AND actor_user_id <> ''
              AND actor_user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          ) INTO has_invalid_ids;

          IF has_invalid_ids THEN
            RAISE EXCEPTION 'Cannot migrate audit_logs.actor_user_id from text to uuid because non-UUID IDs exist';
          END IF;

          ALTER TABLE audit_logs ALTER COLUMN actor_user_id TYPE uuid USING NULLIF(actor_user_id, '')::uuid;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'audit_logs'
            AND column_name = 'ip_address'
            AND data_type = 'text'
        ) THEN
          ALTER TABLE audit_logs ALTER COLUMN ip_address TYPE inet USING NULLIF(ip_address, '')::inet;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'audit_logs'
            AND column_name = 'school_id'
        ) THEN
          UPDATE audit_logs
          SET tenant_id = COALESCE(NULLIF(tenant_id, ''), NULLIF(school_id, ''), 'global')
          WHERE tenant_id IS NULL OR tenant_id = '';
        ELSE
          UPDATE audit_logs
          SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'global')
          WHERE tenant_id IS NULL OR tenant_id = '';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'audit_logs'
            AND column_name = 'entity_type'
        ) THEN
          UPDATE audit_logs
          SET resource_type = COALESCE(NULLIF(resource_type, ''), NULLIF(entity_type, ''), 'unknown')
          WHERE resource_type IS NULL OR resource_type = '';
        ELSE
          UPDATE audit_logs
          SET resource_type = COALESCE(NULLIF(resource_type, ''), 'unknown')
          WHERE resource_type IS NULL OR resource_type = '';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'audit_logs'
            AND column_name = 'entity_id'
        ) THEN
          UPDATE audit_logs
          SET resource_id = entity_id::uuid
          WHERE resource_id IS NULL
            AND entity_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        END IF;

        UPDATE audit_logs
        SET aggregate_id = resource_id
        WHERE aggregate_id IS NULL
          AND resource_id IS NOT NULL;

        UPDATE audit_logs
        SET occurred_at = COALESCE(occurred_at, created_at, NOW())
        WHERE occurred_at IS NULL;

        ALTER TABLE audit_logs ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE audit_logs ALTER COLUMN resource_type SET NOT NULL;
        ALTER TABLE audit_logs ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
        ALTER TABLE audit_logs ALTER COLUMN metadata SET NOT NULL;
        ALTER TABLE audit_logs ALTER COLUMN occurred_at SET DEFAULT NOW();
        ALTER TABLE audit_logs ALTER COLUMN occurred_at SET NOT NULL;
        ALTER TABLE audit_logs ALTER COLUMN updated_at SET DEFAULT NOW();
        ALTER TABLE audit_logs ALTER COLUMN updated_at SET NOT NULL;
      END;
      $$;

      DROP TABLE IF EXISTS event_consumer_runs CASCADE;
      DROP TABLE IF EXISTS outbox_events CASCADE;

      CREATE TABLE IF NOT EXISTS outbox_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        school_id text NOT NULL,
        event_key text NOT NULL,
        event_name text NOT NULL,
        aggregate_type text NOT NULL,
        aggregate_id uuid NOT NULL,
        payload jsonb NOT NULL,
        headers jsonb NOT NULL DEFAULT '{}'::jsonb,
        status text NOT NULL DEFAULT 'pending',
        attempt_count integer NOT NULL DEFAULT 0,
        available_at timestamptz NOT NULL DEFAULT NOW(),
        published_at timestamptz,
        last_error text,
        actor_user_id uuid,
        actor_role text,
        source_dashboard text,
        correlation_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_outbox_events_event_key_not_blank CHECK (btrim(event_key) <> ''),
        CONSTRAINT ck_outbox_events_event_name_not_blank CHECK (btrim(event_name) <> ''),
        CONSTRAINT ck_outbox_events_aggregate_type_not_blank CHECK (btrim(aggregate_type) <> ''),
        CONSTRAINT ck_outbox_events_status CHECK (
          status IN ('pending', 'processing', 'published', 'failed', 'discarded')
        ),
        CONSTRAINT ck_outbox_events_attempt_count_non_negative CHECK (attempt_count >= 0),
        CONSTRAINT uq_outbox_events_tenant_event_key UNIQUE (tenant_id, event_key),
        CONSTRAINT uq_outbox_events_tenant_id_id UNIQUE (tenant_id, id)
      );

      CREATE TABLE IF NOT EXISTS event_consumer_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        school_id text NOT NULL,
        outbox_event_id uuid NOT NULL,
        event_key text NOT NULL,
        consumer_name text NOT NULL,
        status text NOT NULL DEFAULT 'processing',
        attempt_count integer NOT NULL DEFAULT 0,
        last_error text,
        processed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_event_consumer_runs_event_key_not_blank CHECK (btrim(event_key) <> ''),
        CONSTRAINT ck_event_consumer_runs_consumer_name_not_blank CHECK (btrim(consumer_name) <> ''),
        CONSTRAINT ck_event_consumer_runs_status CHECK (status IN ('processing', 'completed', 'failed')),
        CONSTRAINT ck_event_consumer_runs_attempt_count_non_negative CHECK (attempt_count >= 0),
        CONSTRAINT uq_event_consumer_runs_tenant_outbox_consumer
          UNIQUE (tenant_id, outbox_event_id, consumer_name),
        CONSTRAINT uq_event_consumer_runs_tenant_consumer_event_key
          UNIQUE (tenant_id, consumer_name, event_key),
        CONSTRAINT fk_event_consumer_runs_outbox_event
          FOREIGN KEY (tenant_id, outbox_event_id)
          REFERENCES outbox_events (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        notification_key text,
        recipient_user_id uuid,
        recipient_guardian_id uuid,
        recipient_role text,
        type text NOT NULL DEFAULT 'school.operation.recorded',
        title text NOT NULL,
        body text NOT NULL,
        status text NOT NULL DEFAULT 'unread',
        priority text,
        source_module text,
        source_record_id text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        read_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id text;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_key text;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_user_id uuid;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_guardian_id uuid;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_role text;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type text;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body text;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'id'
            AND data_type = 'text'
        ) THEN
          ALTER TABLE notifications
            ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'id'
            AND data_type = 'uuid'
        ) THEN
          ALTER TABLE notifications
            ALTER COLUMN id SET DEFAULT gen_random_uuid();
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'status'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE notifications
            ALTER COLUMN status DROP DEFAULT;
          ALTER TABLE notifications
            ALTER COLUMN status TYPE text USING lower(status::text);
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'school_id'
        ) THEN
          UPDATE notifications
          SET tenant_id = COALESCE(NULLIF(tenant_id, ''), NULLIF(school_id, ''))
          WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

          ALTER TABLE notifications
            ALTER COLUMN school_id DROP NOT NULL;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'event_type'
        ) THEN
          UPDATE notifications
          SET type = COALESCE(NULLIF(type, ''), NULLIF(event_type, ''), 'school.operation.recorded')
          WHERE type IS NULL OR btrim(type) = '';
        ELSE
          UPDATE notifications
          SET type = COALESCE(NULLIF(type, ''), 'school.operation.recorded')
          WHERE type IS NULL OR btrim(type) = '';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'message'
        ) THEN
          UPDATE notifications
          SET body = COALESCE(NULLIF(body, ''), NULLIF(message, ''), title, 'School update')
          WHERE body IS NULL OR btrim(body) = '';

          ALTER TABLE notifications
            ALTER COLUMN message SET DEFAULT '';
        ELSE
          UPDATE notifications
          SET body = COALESCE(NULLIF(body, ''), title, 'School update')
          WHERE body IS NULL OR btrim(body) = '';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'metadata_json'
        ) THEN
          UPDATE notifications
          SET metadata = COALESCE(metadata, metadata_json, '{}'::jsonb)
          WHERE metadata IS NULL;
        END IF;

        UPDATE notifications
        SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'legacy-unassigned')
        WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

        UPDATE notifications
        SET notification_key = COALESCE(NULLIF(notification_key, ''), concat('legacy-notification:', id::text))
        WHERE notification_key IS NULL OR btrim(notification_key) = '';

        UPDATE notifications
        SET updated_at = COALESCE(updated_at, created_at, NOW())
        WHERE updated_at IS NULL;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'channel'
        ) THEN
          ALTER TABLE notifications
            ALTER COLUMN channel SET DEFAULT 'IN_APP';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'priority'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE notifications
            ALTER COLUMN priority DROP DEFAULT;
          ALTER TABLE notifications
            ALTER COLUMN priority TYPE text USING lower(priority::text);
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'priority'
        ) THEN
          ALTER TABLE notifications
            ALTER COLUMN priority SET DEFAULT 'normal';
        END IF;

        ALTER TABLE notifications ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE notifications ALTER COLUMN notification_key SET NOT NULL;
        ALTER TABLE notifications ALTER COLUMN type SET DEFAULT 'school.operation.recorded';
        ALTER TABLE notifications ALTER COLUMN type SET NOT NULL;
        ALTER TABLE notifications ALTER COLUMN body SET NOT NULL;
        ALTER TABLE notifications ALTER COLUMN status SET DEFAULT 'unread';
        ALTER TABLE notifications ALTER COLUMN status SET NOT NULL;
        ALTER TABLE notifications ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
        ALTER TABLE notifications ALTER COLUMN metadata SET NOT NULL;
        ALTER TABLE notifications ALTER COLUMN updated_at SET DEFAULT NOW();
        ALTER TABLE notifications ALTER COLUMN updated_at SET NOT NULL;
      END;
      $$;

      CREATE UNIQUE INDEX IF NOT EXISTS ux_notifications_tenant_notification_key
        ON notifications (tenant_id, notification_key);
      CREATE INDEX IF NOT EXISTS ix_notifications_tenant_role_status_created
        ON notifications (tenant_id, recipient_role, status, created_at DESC);

      DROP FUNCTION IF EXISTS app.claim_outbox_events(integer, integer);

      CREATE FUNCTION app.claim_outbox_events(
        batch_size integer,
        stale_processing_after_ms integer
      )
      RETURNS TABLE (
        id uuid,
        tenant_id text,
        request_id text,
        trace_id text,
        span_id text,
        user_id text,
        role text,
        session_id text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, app, pg_temp
      AS $$
      BEGIN
        IF batch_size IS NULL OR batch_size < 1 THEN
          RAISE EXCEPTION 'batch_size must be greater than zero'
            USING ERRCODE = '22023';
        END IF;

        IF stale_processing_after_ms IS NULL OR stale_processing_after_ms < 0 THEN
          RAISE EXCEPTION 'stale_processing_after_ms must be zero or greater'
            USING ERRCODE = '22023';
        END IF;

        RETURN QUERY
        WITH candidate_events AS (
          SELECT outbox_events.id
          FROM outbox_events
          WHERE (
            outbox_events.status = 'pending'
            AND outbox_events.available_at <= NOW()
          )
          OR (
            outbox_events.status = 'failed'
            AND outbox_events.available_at <= NOW()
          )
          OR (
            outbox_events.status = 'processing'
            AND outbox_events.updated_at <= NOW() - (stale_processing_after_ms * INTERVAL '1 millisecond')
          )
          ORDER BY outbox_events.available_at ASC, outbox_events.created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT batch_size
        )
        UPDATE outbox_events AS target
        SET
          status = 'processing',
          attempt_count = target.attempt_count + 1,
          last_error = NULL,
          updated_at = NOW()
        FROM candidate_events
        WHERE target.id = candidate_events.id
        RETURNING
          target.id,
          target.tenant_id,
          COALESCE(NULLIF(target.headers ->> 'request_id', ''), format('outbox:%s', target.id)),
          COALESCE(
            NULLIF(target.headers ->> 'trace_id', ''),
            NULLIF(target.headers ->> 'request_id', ''),
            format('outbox:%s', target.id)
          ),
          NULLIF(target.headers ->> 'span_id', ''),
          COALESCE(NULLIF(target.headers ->> 'user_id', ''), 'anonymous'),
          COALESCE(NULLIF(target.headers ->> 'role', ''), 'system'),
          NULLIF(target.headers ->> 'session_id', '');
      END;
      $$;

      REVOKE ALL ON FUNCTION app.claim_outbox_events(integer, integer) FROM PUBLIC;

      CREATE INDEX IF NOT EXISTS ix_audit_logs_tenant_occurred_at
        ON audit_logs (tenant_id, occurred_at DESC);
      CREATE INDEX IF NOT EXISTS ix_audit_logs_tenant_actor_occurred_at
        ON audit_logs (tenant_id, actor_user_id, occurred_at DESC);
      CREATE INDEX IF NOT EXISTS ix_audit_logs_tenant_resource_occurred_at
        ON audit_logs (tenant_id, resource_type, resource_id, occurred_at DESC);
      CREATE INDEX IF NOT EXISTS ix_audit_logs_request_id
        ON audit_logs (request_id)
        WHERE request_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS ix_outbox_events_dispatch
        ON outbox_events (status, available_at, created_at);
      CREATE INDEX IF NOT EXISTS ix_outbox_events_tenant_status_available_at
        ON outbox_events (tenant_id, status, available_at, created_at);
      CREATE INDEX IF NOT EXISTS ix_outbox_events_tenant_status_created_id
        ON outbox_events (tenant_id, status, created_at, id);
      CREATE INDEX IF NOT EXISTS ix_event_consumer_runs_outbox_consumer
        ON event_consumer_runs (tenant_id, outbox_event_id, consumer_name);

      ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
      ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
      ALTER TABLE outbox_events FORCE ROW LEVEL SECURITY;
      ALTER TABLE event_consumer_runs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE event_consumer_runs FORCE ROW LEVEL SECURITY;
      ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
      ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS audit_logs_rls_policy ON audit_logs;
      CREATE POLICY audit_logs_rls_policy ON audit_logs
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS outbox_events_rls_policy ON outbox_events;
      CREATE POLICY outbox_events_rls_policy ON outbox_events
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS event_consumer_runs_rls_policy ON event_consumer_runs;
      CREATE POLICY event_consumer_runs_rls_policy ON event_consumer_runs
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS notifications_rls_policy ON notifications;
      CREATE POLICY notifications_rls_policy ON notifications
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP TRIGGER IF EXISTS trg_audit_logs_set_updated_at ON audit_logs;
      CREATE TRIGGER trg_audit_logs_set_updated_at
      BEFORE UPDATE ON audit_logs
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_outbox_events_set_updated_at ON outbox_events;
      CREATE TRIGGER trg_outbox_events_set_updated_at
      BEFORE UPDATE ON outbox_events
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_outbox_events_sync_school_columns ON outbox_events;
      CREATE TRIGGER trg_outbox_events_sync_school_columns
      BEFORE INSERT OR UPDATE ON outbox_events
      FOR EACH ROW
      EXECUTE FUNCTION sync_event_school_columns();

      DROP TRIGGER IF EXISTS trg_event_consumer_runs_sync_school_columns ON event_consumer_runs;
      CREATE TRIGGER trg_event_consumer_runs_sync_school_columns
      BEFORE INSERT OR UPDATE ON event_consumer_runs
      FOR EACH ROW
      EXECUTE FUNCTION sync_event_school_columns();

      DROP TRIGGER IF EXISTS trg_event_consumer_runs_set_updated_at ON event_consumer_runs;
      CREATE TRIGGER trg_event_consumer_runs_set_updated_at
      BEFORE UPDATE ON event_consumer_runs
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_notifications_set_updated_at ON notifications;
      CREATE TRIGGER trg_notifications_set_updated_at
      BEFORE UPDATE ON notifications
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    this.logger.log('Event schema, outbox, and consumer idempotency tables verified');
  }
}
