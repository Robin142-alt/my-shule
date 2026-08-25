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
        NEW.tenant_id = COALESCE(NULLIF(NEW.tenant_id::text, ''), NULLIF(NEW.school_id, ''));
        NEW.school_id = NEW.tenant_id::text;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        school_id text,
        actor_user_id uuid,
        request_id text,
        action text NOT NULL,
        module text NOT NULL DEFAULT 'system',
        entity_type text NOT NULL DEFAULT 'unknown',
        entity_id text NOT NULL DEFAULT '',
        old_values_json jsonb,
        new_values_json jsonb,
        resource_type text NOT NULL,
        resource_id uuid,
        aggregate_id uuid,
        ip_address inet,
        user_agent text,
        reason text,
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
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS school_id text;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_id text;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS module text;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type text;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id text;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_values_json jsonb;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values_json jsonb;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type text;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id uuid;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS aggregate_id uuid;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS occurred_at timestamptz;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason text;

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
        SET module = COALESCE(NULLIF(module, ''), split_part(action, '.', 1), 'system')
        WHERE module IS NULL OR module = '';

        UPDATE audit_logs
        SET entity_type = COALESCE(NULLIF(entity_type, ''), NULLIF(resource_type, ''), 'unknown')
        WHERE entity_type IS NULL OR entity_type = '';

        UPDATE audit_logs
        SET entity_id = COALESCE(NULLIF(entity_id, ''), resource_id::text, aggregate_id::text, '')
        WHERE entity_id IS NULL;

        UPDATE audit_logs
        SET occurred_at = COALESCE(occurred_at, created_at, NOW())
        WHERE occurred_at IS NULL;

        ALTER TABLE audit_logs ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE audit_logs ALTER COLUMN module SET DEFAULT 'system';
        ALTER TABLE audit_logs ALTER COLUMN module SET NOT NULL;
        ALTER TABLE audit_logs ALTER COLUMN entity_type SET DEFAULT 'unknown';
        ALTER TABLE audit_logs ALTER COLUMN entity_type SET NOT NULL;
        ALTER TABLE audit_logs ALTER COLUMN entity_id SET DEFAULT '';
        ALTER TABLE audit_logs ALTER COLUMN entity_id SET NOT NULL;
        ALTER TABLE audit_logs ALTER COLUMN resource_type SET NOT NULL;
        ALTER TABLE audit_logs ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
        ALTER TABLE audit_logs ALTER COLUMN metadata SET NOT NULL;
        ALTER TABLE audit_logs ALTER COLUMN occurred_at SET DEFAULT NOW();
        ALTER TABLE audit_logs ALTER COLUMN occurred_at SET NOT NULL;
        ALTER TABLE audit_logs ALTER COLUMN updated_at SET DEFAULT NOW();
        ALTER TABLE audit_logs ALTER COLUMN updated_at SET NOT NULL;
      END;
      $$;

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

      -- Older installations were created from database/schema.sql before the
      -- school/actor event envelope was added. CREATE TABLE IF NOT EXISTS does
      -- not add columns to those installations, so keep this migration
      -- additive and complete before any dependent indexes, functions, or
      -- triggers are created.
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS tenant_id text;
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS school_id text;
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS event_key text;
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS event_name text;
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS aggregate_type text;
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS aggregate_id uuid;
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb;
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS headers jsonb DEFAULT '{}'::jsonb;
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 0;
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS available_at timestamptz DEFAULT NOW();
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS published_at timestamptz;
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS last_error text;
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS actor_user_id uuid;
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS actor_role text;
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS source_dashboard text;
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS correlation_id uuid;
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW();
      ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

      UPDATE outbox_events
      SET tenant_id = NULLIF(school_id, '')
      WHERE (tenant_id IS NULL OR btrim(tenant_id::text) = '')
        AND NULLIF(school_id, '') IS NOT NULL;

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM outbox_events
          WHERE tenant_id IS NULL OR btrim(tenant_id::text) = ''
        ) THEN
          RAISE EXCEPTION 'Cannot migrate outbox_events without a tenant_id or school_id ownership key';
        END IF;
      END;
      $$;

      UPDATE outbox_events
      SET id = gen_random_uuid()
      WHERE id IS NULL;

      UPDATE outbox_events
      SET school_id = tenant_id::text
      WHERE school_id IS DISTINCT FROM tenant_id::text;

      UPDATE outbox_events
      SET event_key = 'legacy-outbox:' || id::text
      WHERE event_key IS NULL OR btrim(event_key) = '';

      UPDATE outbox_events
      SET event_name = 'legacy.event'
      WHERE event_name IS NULL OR btrim(event_name) = '';

      UPDATE outbox_events
      SET aggregate_type = 'legacy'
      WHERE aggregate_type IS NULL OR btrim(aggregate_type) = '';

      UPDATE outbox_events
      SET aggregate_id = id
      WHERE aggregate_id IS NULL;

      UPDATE outbox_events
      SET payload = COALESCE(payload, '{}'::jsonb),
          headers = COALESCE(headers, '{}'::jsonb),
          status = CASE
            WHEN lower(COALESCE(status, '')) IN ('pending', 'processing', 'published', 'failed', 'discarded')
              THEN lower(status)
            ELSE 'pending'
          END,
          attempt_count = GREATEST(COALESCE(attempt_count, 0), 0),
          available_at = COALESCE(available_at, created_at, NOW()),
          created_at = COALESCE(created_at, NOW()),
          updated_at = COALESCE(updated_at, created_at, NOW());

      ALTER TABLE outbox_events ALTER COLUMN id SET DEFAULT gen_random_uuid();
      ALTER TABLE outbox_events ALTER COLUMN id SET NOT NULL;
      ALTER TABLE outbox_events ALTER COLUMN tenant_id SET NOT NULL;
      ALTER TABLE outbox_events ALTER COLUMN school_id SET NOT NULL;
      ALTER TABLE outbox_events ALTER COLUMN event_key SET NOT NULL;
      ALTER TABLE outbox_events ALTER COLUMN event_name SET NOT NULL;
      ALTER TABLE outbox_events ALTER COLUMN aggregate_type SET NOT NULL;
      ALTER TABLE outbox_events ALTER COLUMN aggregate_id SET NOT NULL;
      ALTER TABLE outbox_events ALTER COLUMN payload SET DEFAULT '{}'::jsonb;
      ALTER TABLE outbox_events ALTER COLUMN payload SET NOT NULL;
      ALTER TABLE outbox_events ALTER COLUMN headers SET DEFAULT '{}'::jsonb;
      ALTER TABLE outbox_events ALTER COLUMN headers SET NOT NULL;
      ALTER TABLE outbox_events ALTER COLUMN status SET DEFAULT 'pending';
      ALTER TABLE outbox_events ALTER COLUMN status SET NOT NULL;
      ALTER TABLE outbox_events ALTER COLUMN attempt_count SET DEFAULT 0;
      ALTER TABLE outbox_events ALTER COLUMN attempt_count SET NOT NULL;
      ALTER TABLE outbox_events ALTER COLUMN available_at SET DEFAULT NOW();
      ALTER TABLE outbox_events ALTER COLUMN available_at SET NOT NULL;
      ALTER TABLE outbox_events ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE outbox_events ALTER COLUMN created_at SET NOT NULL;
      ALTER TABLE outbox_events ALTER COLUMN updated_at SET DEFAULT NOW();
      ALTER TABLE outbox_events ALTER COLUMN updated_at SET NOT NULL;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'outbox_events'::regclass AND contype = 'p'
        ) THEN
          ALTER TABLE outbox_events
            ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'outbox_events'::regclass
            AND conname = 'ck_outbox_events_school_matches_tenant'
        ) THEN
          ALTER TABLE outbox_events
            ADD CONSTRAINT ck_outbox_events_school_matches_tenant
            CHECK (school_id = tenant_id::text);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'outbox_events'::regclass
            AND conname = 'ck_outbox_events_event_key_not_blank'
        ) THEN
          ALTER TABLE outbox_events
            ADD CONSTRAINT ck_outbox_events_event_key_not_blank CHECK (btrim(event_key) <> '');
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'outbox_events'::regclass
            AND conname = 'ck_outbox_events_event_name_not_blank'
        ) THEN
          ALTER TABLE outbox_events
            ADD CONSTRAINT ck_outbox_events_event_name_not_blank CHECK (btrim(event_name) <> '');
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'outbox_events'::regclass
            AND conname = 'ck_outbox_events_aggregate_type_not_blank'
        ) THEN
          ALTER TABLE outbox_events
            ADD CONSTRAINT ck_outbox_events_aggregate_type_not_blank CHECK (btrim(aggregate_type) <> '');
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'outbox_events'::regclass
            AND conname = 'ck_outbox_events_status'
        ) THEN
          ALTER TABLE outbox_events
            ADD CONSTRAINT ck_outbox_events_status
            CHECK (status IN ('pending', 'processing', 'published', 'failed', 'discarded'));
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'outbox_events'::regclass
            AND conname = 'ck_outbox_events_attempt_count_non_negative'
        ) THEN
          ALTER TABLE outbox_events
            ADD CONSTRAINT ck_outbox_events_attempt_count_non_negative CHECK (attempt_count >= 0);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'outbox_events'::regclass
            AND conname = 'uq_outbox_events_tenant_event_key'
        ) THEN
          ALTER TABLE outbox_events
            ADD CONSTRAINT uq_outbox_events_tenant_event_key UNIQUE (tenant_id, event_key);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'outbox_events'::regclass
            AND conname = 'uq_outbox_events_tenant_id_id'
        ) THEN
          ALTER TABLE outbox_events
            ADD CONSTRAINT uq_outbox_events_tenant_id_id UNIQUE (tenant_id, id);
        END IF;
      END;
      $$;

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

      ALTER TABLE event_consumer_runs ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
      ALTER TABLE event_consumer_runs ADD COLUMN IF NOT EXISTS tenant_id text;
      ALTER TABLE event_consumer_runs ADD COLUMN IF NOT EXISTS school_id text;
      ALTER TABLE event_consumer_runs ADD COLUMN IF NOT EXISTS outbox_event_id uuid;
      ALTER TABLE event_consumer_runs ADD COLUMN IF NOT EXISTS event_key text;
      ALTER TABLE event_consumer_runs ADD COLUMN IF NOT EXISTS consumer_name text;
      ALTER TABLE event_consumer_runs ADD COLUMN IF NOT EXISTS status text DEFAULT 'processing';
      ALTER TABLE event_consumer_runs ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 0;
      ALTER TABLE event_consumer_runs ADD COLUMN IF NOT EXISTS last_error text;
      ALTER TABLE event_consumer_runs ADD COLUMN IF NOT EXISTS processed_at timestamptz;
      ALTER TABLE event_consumer_runs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW();
      ALTER TABLE event_consumer_runs ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

      UPDATE event_consumer_runs
      SET tenant_id = NULLIF(school_id, '')
      WHERE (tenant_id IS NULL OR btrim(tenant_id::text) = '')
        AND NULLIF(school_id, '') IS NOT NULL;

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM event_consumer_runs
          WHERE tenant_id IS NULL OR btrim(tenant_id::text) = ''
        ) THEN
          RAISE EXCEPTION 'Cannot migrate event_consumer_runs without a tenant_id or school_id ownership key';
        END IF;
      END;
      $$;

      UPDATE event_consumer_runs
      SET id = gen_random_uuid()
      WHERE id IS NULL;

      UPDATE event_consumer_runs
      SET school_id = tenant_id::text
      WHERE school_id IS DISTINCT FROM tenant_id::text;

      UPDATE event_consumer_runs AS consumer
      SET event_key = outbox.event_key
      FROM outbox_events AS outbox
      WHERE consumer.outbox_event_id = outbox.id
        AND consumer.tenant_id::text = outbox.tenant_id::text
        AND (consumer.event_key IS NULL OR btrim(consumer.event_key) = '');

      UPDATE event_consumer_runs
      SET status = CASE
            WHEN lower(COALESCE(status, '')) IN ('processing', 'completed', 'failed')
              THEN lower(status)
            ELSE 'processing'
          END,
          attempt_count = GREATEST(COALESCE(attempt_count, 0), 0),
          created_at = COALESCE(created_at, NOW()),
          updated_at = COALESCE(updated_at, created_at, NOW());

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM event_consumer_runs
          WHERE outbox_event_id IS NULL
            OR event_key IS NULL OR btrim(event_key) = ''
            OR consumer_name IS NULL OR btrim(consumer_name) = ''
        ) THEN
          RAISE EXCEPTION 'Cannot migrate event_consumer_runs with an unlinked or unaddressed legacy consumer record';
        END IF;
      END;
      $$;

      ALTER TABLE event_consumer_runs ALTER COLUMN id SET DEFAULT gen_random_uuid();
      ALTER TABLE event_consumer_runs ALTER COLUMN id SET NOT NULL;
      ALTER TABLE event_consumer_runs ALTER COLUMN tenant_id SET NOT NULL;
      ALTER TABLE event_consumer_runs ALTER COLUMN school_id SET NOT NULL;
      ALTER TABLE event_consumer_runs ALTER COLUMN outbox_event_id SET NOT NULL;
      ALTER TABLE event_consumer_runs ALTER COLUMN event_key SET NOT NULL;
      ALTER TABLE event_consumer_runs ALTER COLUMN consumer_name SET NOT NULL;
      ALTER TABLE event_consumer_runs ALTER COLUMN status SET DEFAULT 'processing';
      ALTER TABLE event_consumer_runs ALTER COLUMN status SET NOT NULL;
      ALTER TABLE event_consumer_runs ALTER COLUMN attempt_count SET DEFAULT 0;
      ALTER TABLE event_consumer_runs ALTER COLUMN attempt_count SET NOT NULL;
      ALTER TABLE event_consumer_runs ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE event_consumer_runs ALTER COLUMN created_at SET NOT NULL;
      ALTER TABLE event_consumer_runs ALTER COLUMN updated_at SET DEFAULT NOW();
      ALTER TABLE event_consumer_runs ALTER COLUMN updated_at SET NOT NULL;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'event_consumer_runs'::regclass AND contype = 'p'
        ) THEN
          ALTER TABLE event_consumer_runs
            ADD CONSTRAINT event_consumer_runs_pkey PRIMARY KEY (id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'event_consumer_runs'::regclass
            AND conname = 'ck_event_consumer_runs_school_matches_tenant'
        ) THEN
          ALTER TABLE event_consumer_runs
            ADD CONSTRAINT ck_event_consumer_runs_school_matches_tenant
            CHECK (school_id = tenant_id::text);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'event_consumer_runs'::regclass
            AND conname = 'ck_event_consumer_runs_event_key_not_blank'
        ) THEN
          ALTER TABLE event_consumer_runs
            ADD CONSTRAINT ck_event_consumer_runs_event_key_not_blank CHECK (btrim(event_key) <> '');
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'event_consumer_runs'::regclass
            AND conname = 'ck_event_consumer_runs_consumer_name_not_blank'
        ) THEN
          ALTER TABLE event_consumer_runs
            ADD CONSTRAINT ck_event_consumer_runs_consumer_name_not_blank CHECK (btrim(consumer_name) <> '');
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'event_consumer_runs'::regclass
            AND conname = 'ck_event_consumer_runs_status'
        ) THEN
          ALTER TABLE event_consumer_runs
            ADD CONSTRAINT ck_event_consumer_runs_status CHECK (status IN ('processing', 'completed', 'failed'));
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'event_consumer_runs'::regclass
            AND conname = 'ck_event_consumer_runs_attempt_count_non_negative'
        ) THEN
          ALTER TABLE event_consumer_runs
            ADD CONSTRAINT ck_event_consumer_runs_attempt_count_non_negative CHECK (attempt_count >= 0);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'event_consumer_runs'::regclass
            AND conname = 'uq_event_consumer_runs_tenant_outbox_consumer'
        ) THEN
          ALTER TABLE event_consumer_runs
            ADD CONSTRAINT uq_event_consumer_runs_tenant_outbox_consumer
            UNIQUE (tenant_id, outbox_event_id, consumer_name);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'event_consumer_runs'::regclass
            AND conname = 'uq_event_consumer_runs_tenant_consumer_event_key'
        ) THEN
          ALTER TABLE event_consumer_runs
            ADD CONSTRAINT uq_event_consumer_runs_tenant_consumer_event_key
            UNIQUE (tenant_id, consumer_name, event_key);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'event_consumer_runs'::regclass
            AND conname = 'fk_event_consumer_runs_outbox_event'
        ) THEN
          ALTER TABLE event_consumer_runs
            ADD CONSTRAINT fk_event_consumer_runs_outbox_event
            FOREIGN KEY (tenant_id, outbox_event_id)
            REFERENCES outbox_events (tenant_id, id)
            ON DELETE CASCADE;
        END IF;
      END;
      $$;

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
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_module text;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_record_id text;
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
            AND column_name = 'target_user_id'
        ) THEN
          UPDATE notifications
          SET recipient_user_id = target_user_id::text::uuid
          WHERE recipient_user_id IS NULL
            AND target_user_id IS NOT NULL
            AND target_user_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            AND EXISTS (
              SELECT 1
              FROM users recipient
              WHERE recipient.id::text = target_user_id::text
            );
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'target_role'
        ) THEN
          UPDATE notifications
          SET recipient_role = COALESCE(NULLIF(recipient_role, ''), NULLIF(target_role, ''))
          WHERE recipient_role IS NULL OR btrim(recipient_role) = '';
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
          SET metadata = COALESCE(NULLIF(metadata, '{}'::jsonb), metadata_json, '{}'::jsonb)
          WHERE metadata IS NULL OR metadata = '{}'::jsonb;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'target_user_id'
        ) THEN
          -- A malformed or orphaned legacy explicit target must not broaden to
          -- the row's role audience. Preserve it in the canonical metadata
          -- field so recipient matching fails closed for every other user.
          UPDATE notifications
          SET metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{targetUserId}',
            to_jsonb(target_user_id::text),
            true
          )
          WHERE recipient_user_id IS NULL
            AND target_user_id IS NOT NULL
            AND btrim(target_user_id::text) <> '';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'module'
        ) THEN
          UPDATE notifications
          SET source_module = COALESCE(NULLIF(source_module, ''), NULLIF(module, ''))
          WHERE source_module IS NULL OR btrim(source_module) = '';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'entity_id'
        ) THEN
          UPDATE notifications
          SET source_record_id = COALESCE(NULLIF(source_record_id, ''), NULLIF(entity_id::text, ''))
          WHERE source_record_id IS NULL OR btrim(source_record_id) = '';
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
      CREATE INDEX IF NOT EXISTS ix_notifications_tenant_user_status_created
        ON notifications (tenant_id, recipient_user_id, status, created_at DESC);

      CREATE TABLE IF NOT EXISTS tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        task_key text NOT NULL,
        assigned_to_user_id uuid,
        assigned_to_role text,
        created_by_user_id uuid,
        title text NOT NULL,
        description text,
        module text,
        record_id text,
        status text NOT NULL DEFAULT 'OPEN',
        priority text NOT NULL DEFAULT 'normal',
        due_date timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      DROP POLICY IF EXISTS tasks_rls_policy ON tasks;
      DROP POLICY IF EXISTS tasks_tenant_policy ON tasks;

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'tasks'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE tasks
            ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'tasks'
            AND column_name = 'record_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE tasks
            ALTER COLUMN record_id TYPE text USING record_id::text;
        END IF;
      END;
      $$;

      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_key text;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to_role text;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description text;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS module text;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS record_id text;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status text DEFAULT 'OPEN';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date timestamptz;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

      ALTER TABLE tasks ALTER COLUMN assigned_to_user_id DROP NOT NULL;
      ALTER TABLE tasks ALTER COLUMN assigned_to_role DROP NOT NULL;
      ALTER TABLE tasks ALTER COLUMN created_by_user_id DROP NOT NULL;
      ALTER TABLE tasks ALTER COLUMN description DROP NOT NULL;
      ALTER TABLE tasks ALTER COLUMN module DROP NOT NULL;
      ALTER TABLE tasks ALTER COLUMN record_id DROP NOT NULL;

      DO $$
      BEGIN
        IF to_regclass('public.dashboard_tasks') IS NOT NULL THEN
          INSERT INTO tasks (
            tenant_id,
            task_key,
            assigned_to_user_id,
            assigned_to_role,
            title,
            description,
            status,
            due_date,
            metadata,
            created_at,
            updated_at
          )
          SELECT
            legacy.tenant_id::text,
            'legacy-dashboard:' || legacy.id::text,
            CASE
              WHEN COALESCE(
                NULLIF(to_jsonb(legacy) ->> 'assigned_to_user_id', ''),
                NULLIF(to_jsonb(legacy) ->> 'target_user_id', '')
              ) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              THEN COALESCE(
                NULLIF(to_jsonb(legacy) ->> 'assigned_to_user_id', ''),
                NULLIF(to_jsonb(legacy) ->> 'target_user_id', '')
              )::uuid
              ELSE NULL
            END,
            NULLIF(to_jsonb(legacy) ->> 'target_role', ''),
            legacy.title,
            legacy.description,
            upper(COALESCE(NULLIF(to_jsonb(legacy) ->> 'status', ''), 'open')),
            NULL::timestamptz,
            jsonb_strip_nulls(jsonb_build_object(
              'legacyDashboardTaskId', legacy.id::text,
              'legacyDueDate', to_jsonb(legacy) -> 'due_date'
            )),
            legacy.created_at,
            legacy.updated_at
          FROM dashboard_tasks legacy
          WHERE NOT EXISTS (
            SELECT 1
            FROM tasks canonical
            WHERE canonical.tenant_id::text = legacy.tenant_id::text
              AND canonical.task_key = 'legacy-dashboard:' || legacy.id::text
          );
        END IF;

        UPDATE tasks
        SET task_key = 'legacy-task:' || id::text
        WHERE task_key IS NULL OR btrim(task_key) = '';

        UPDATE tasks
        SET status = COALESCE(NULLIF(status, ''), 'OPEN'),
            priority = COALESCE(NULLIF(priority, ''), 'normal'),
            metadata = COALESCE(metadata, '{}'::jsonb),
            updated_at = COALESCE(updated_at, created_at, NOW());

        WITH ranked_task_keys AS (
          SELECT
            id,
            ROW_NUMBER() OVER (
              PARTITION BY tenant_id, task_key
              ORDER BY created_at, id
            ) AS duplicate_position
          FROM tasks
        )
        UPDATE tasks task
        SET task_key = task.task_key || ':duplicate:' || task.id::text
        FROM ranked_task_keys ranked
        WHERE task.id = ranked.id
          AND ranked.duplicate_position > 1;

        ALTER TABLE tasks ALTER COLUMN task_key SET NOT NULL;
        ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'OPEN';
        ALTER TABLE tasks ALTER COLUMN status SET NOT NULL;
        ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT 'normal';
        ALTER TABLE tasks ALTER COLUMN priority SET NOT NULL;
        ALTER TABLE tasks ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
        ALTER TABLE tasks ALTER COLUMN metadata SET NOT NULL;
        ALTER TABLE tasks ALTER COLUMN updated_at SET DEFAULT NOW();
        ALTER TABLE tasks ALTER COLUMN updated_at SET NOT NULL;
      END;
      $$;

      CREATE UNIQUE INDEX IF NOT EXISTS ux_tasks_tenant_task_key
        ON tasks (tenant_id, task_key);
      CREATE INDEX IF NOT EXISTS ix_tasks_tenant_user_status_created
        ON tasks (tenant_id, assigned_to_user_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_tasks_tenant_role_status_created
        ON tasks (tenant_id, assigned_to_role, status, created_at DESC);

      CREATE TABLE IF NOT EXISTS dashboard_approval_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        approval_key text NOT NULL,
        requested_by_user_id uuid,
        approver_role text,
        approver_user_id uuid,
        module text,
        record_id text,
        approval_type text,
        reason text,
        status text NOT NULL DEFAULT 'PENDING',
        decision_note text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        decided_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS ux_dashboard_approvals_tenant_key
        ON dashboard_approval_requests (tenant_id, approval_key);
      CREATE INDEX IF NOT EXISTS ix_dashboard_approvals_tenant_user_status_created
        ON dashboard_approval_requests (tenant_id, approver_user_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_dashboard_approvals_tenant_role_status_created
        ON dashboard_approval_requests (tenant_id, approver_role, status, created_at DESC);

      CREATE TABLE IF NOT EXISTS workflow_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        source_user_id uuid,
        source_role text,
        target_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
        event_type text NOT NULL,
        entity_type text NOT NULL,
        entity_id text,
        title text NOT NULL,
        message text,
        priority text NOT NULL DEFAULT 'normal',
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        status text NOT NULL DEFAULT 'pending',
        handled_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      DROP POLICY IF EXISTS workflow_events_rls_policy ON workflow_events;
      DROP POLICY IF EXISTS workflow_events_tenant_policy ON workflow_events;

      ALTER TABLE workflow_events ADD COLUMN IF NOT EXISTS source_user_id uuid;
      ALTER TABLE workflow_events ADD COLUMN IF NOT EXISTS source_role text;
      ALTER TABLE workflow_events ADD COLUMN IF NOT EXISTS target_roles jsonb DEFAULT '[]'::jsonb;
      ALTER TABLE workflow_events ADD COLUMN IF NOT EXISTS event_type text;
      ALTER TABLE workflow_events ADD COLUMN IF NOT EXISTS entity_type text;
      ALTER TABLE workflow_events ADD COLUMN IF NOT EXISTS entity_id text;
      ALTER TABLE workflow_events ADD COLUMN IF NOT EXISTS title text;
      ALTER TABLE workflow_events ADD COLUMN IF NOT EXISTS message text;
      ALTER TABLE workflow_events ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';
      ALTER TABLE workflow_events ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb;
      ALTER TABLE workflow_events ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
      ALTER TABLE workflow_events ADD COLUMN IF NOT EXISTS handled_by_user_id uuid;
      ALTER TABLE workflow_events ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW();
      ALTER TABLE workflow_events ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'workflow_events'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE workflow_events
            ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'workflow_events'
            AND column_name = 'target_roles'
            AND data_type <> 'jsonb'
        ) THEN
          ALTER TABLE workflow_events
            ALTER COLUMN target_roles DROP DEFAULT;
          ALTER TABLE workflow_events
            ALTER COLUMN target_roles TYPE jsonb
            USING CASE
              WHEN target_roles IS NULL OR btrim(target_roles::text) = '' THEN '[]'::jsonb
              WHEN left(btrim(target_roles::text), 1) = '[' THEN target_roles::text::jsonb
              ELSE jsonb_build_array(target_roles::text)
            END;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'workflow_events'
            AND column_name = 'entity_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE workflow_events
            ALTER COLUMN entity_id TYPE text USING entity_id::text;
        END IF;
      END;
      $$;

      UPDATE workflow_events
      SET target_roles = '[]'::jsonb
      WHERE target_roles IS NULL OR jsonb_typeof(target_roles) <> 'array';

      UPDATE workflow_events
      SET payload = '{}'::jsonb
      WHERE payload IS NULL;

      UPDATE workflow_events
      SET status = COALESCE(NULLIF(status, ''), 'pending'),
          priority = COALESCE(NULLIF(priority, ''), 'normal'),
          updated_at = COALESCE(updated_at, created_at, NOW());

      ALTER TABLE workflow_events ALTER COLUMN source_user_id DROP NOT NULL;
      ALTER TABLE workflow_events ALTER COLUMN source_role DROP NOT NULL;
      ALTER TABLE workflow_events ALTER COLUMN entity_id DROP NOT NULL;
      ALTER TABLE workflow_events ALTER COLUMN message DROP NOT NULL;
      ALTER TABLE workflow_events ALTER COLUMN target_roles SET DEFAULT '[]'::jsonb;
      ALTER TABLE workflow_events ALTER COLUMN target_roles SET NOT NULL;
      ALTER TABLE workflow_events ALTER COLUMN payload SET DEFAULT '{}'::jsonb;
      ALTER TABLE workflow_events ALTER COLUMN payload SET NOT NULL;
      ALTER TABLE workflow_events ALTER COLUMN priority SET DEFAULT 'normal';
      ALTER TABLE workflow_events ALTER COLUMN priority SET NOT NULL;
      ALTER TABLE workflow_events ALTER COLUMN status SET DEFAULT 'pending';
      ALTER TABLE workflow_events ALTER COLUMN status SET NOT NULL;
      ALTER TABLE workflow_events ALTER COLUMN updated_at SET DEFAULT NOW();
      ALTER TABLE workflow_events ALTER COLUMN updated_at SET NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_workflow_events_tenant_id
        ON workflow_events (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_events_status
        ON workflow_events (tenant_id, status);

      CREATE OR REPLACE FUNCTION app.claim_outbox_events(
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

      ALTER FUNCTION app.claim_outbox_events(integer, integer) OWNER TO CURRENT_USER;
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
      ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
      ALTER TABLE dashboard_approval_requests ENABLE ROW LEVEL SECURITY;
      ALTER TABLE dashboard_approval_requests FORCE ROW LEVEL SECURITY;
      ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;
      ALTER TABLE workflow_events FORCE ROW LEVEL SECURITY;

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

      DROP POLICY IF EXISTS tasks_rls_policy ON tasks;
      DROP POLICY IF EXISTS tasks_tenant_policy ON tasks;
      CREATE POLICY tasks_rls_policy ON tasks
      FOR ALL
      USING (tenant_id::text = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS dashboard_approval_requests_rls_policy ON dashboard_approval_requests;
      CREATE POLICY dashboard_approval_requests_rls_policy ON dashboard_approval_requests
      FOR ALL
      USING (tenant_id::text = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS workflow_events_rls_policy ON workflow_events;
      CREATE POLICY workflow_events_rls_policy ON workflow_events
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

      DROP TRIGGER IF EXISTS trg_tasks_set_updated_at ON tasks;
      DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
      CREATE TRIGGER trg_tasks_set_updated_at
      BEFORE UPDATE ON tasks
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_dashboard_approvals_updated_at ON dashboard_approval_requests;
      CREATE TRIGGER trg_dashboard_approvals_updated_at
      BEFORE UPDATE ON dashboard_approval_requests
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_workflow_events_updated_at ON workflow_events;
      CREATE TRIGGER trg_workflow_events_updated_at
      BEFORE UPDATE ON workflow_events
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    this.logger.log('Event schema, outbox, and consumer idempotency tables verified');
  }
}
