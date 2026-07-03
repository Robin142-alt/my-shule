import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import format from 'pg-format';

import { FILE_OBJECT_STORAGE_SCHEMA_SQL } from '../../common/uploads/file-object-schema';
import { PrismaService } from '../../database/prisma.service';
import { SUPPORT_CATEGORIES } from './dto/support.dto';

@Injectable()
export class SupportSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(SupportSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS trigger AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      ${FILE_OBJECT_STORAGE_SCHEMA_SQL}

      CREATE SEQUENCE IF NOT EXISTS support_ticket_number_seq START 145;

      CREATE TABLE IF NOT EXISTS support_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        code text NOT NULL,
        name text NOT NULL,
        description text NOT NULL,
        response_sla_minutes integer NOT NULL DEFAULT 240,
        resolution_sla_minutes integer NOT NULL DEFAULT 2880,
        sort_order integer NOT NULL DEFAULT 100,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_support_categories_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_support_categories_tenant_code UNIQUE (tenant_id, code),
        CONSTRAINT ck_support_categories_response_sla CHECK (response_sla_minutes > 0),
        CONSTRAINT ck_support_categories_resolution_sla CHECK (resolution_sla_minutes > 0)
      );

      CREATE TABLE IF NOT EXISTS support_agents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL DEFAULT 'global',
        user_id uuid,
        display_name text NOT NULL,
        role text NOT NULL DEFAULT 'support_agent',
        skills text[] NOT NULL DEFAULT ARRAY[]::text[],
        max_open_tickets integer NOT NULL DEFAULT 12,
        active boolean NOT NULL DEFAULT TRUE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_support_agents_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_support_agents_user UNIQUE (tenant_id, user_id),
        CONSTRAINT ck_support_agents_role CHECK (role IN ('support_agent', 'support_lead', 'developer', 'platform_owner')),
        CONSTRAINT ck_support_agents_max_open CHECK (max_open_tickets > 0)
      );

      CREATE TABLE IF NOT EXISTS support_tickets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        ticket_number text NOT NULL,
        subject text NOT NULL,
        category text NOT NULL,
        priority text NOT NULL,
        module_affected text NOT NULL,
        description text NOT NULL,
        status text NOT NULL DEFAULT 'Open',
        requester_user_id uuid,
        assigned_agent_id uuid,
        merged_into_ticket_id uuid,
        first_response_due_at timestamptz NOT NULL,
        resolution_due_at timestamptz NOT NULL,
        first_responded_at timestamptz,
        resolved_at timestamptz,
        closed_at timestamptz,
        escalated_at timestamptz,
        last_school_reply_at timestamptz,
        last_support_reply_at timestamptz,
        context jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_support_tickets_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_support_tickets_number UNIQUE (ticket_number),
        CONSTRAINT ck_support_tickets_priority CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
        CONSTRAINT ck_support_tickets_status CHECK (status IN ('Open', 'In Progress', 'Waiting for School', 'Escalated', 'Resolved', 'Closed')),
        CONSTRAINT fk_support_tickets_assigned_agent
          FOREIGN KEY (assigned_agent_id)
          REFERENCES support_agents (id)
          ON DELETE SET NULL,
        CONSTRAINT fk_support_tickets_merged_into
          FOREIGN KEY (tenant_id, merged_into_ticket_id)
          REFERENCES support_tickets (tenant_id, id)
          ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS support_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        ticket_id uuid NOT NULL,
        author_user_id uuid,
        author_type text NOT NULL,
        body text NOT NULL,
        visibility text NOT NULL DEFAULT 'public',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_support_messages_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_support_messages_author_type CHECK (author_type IN ('school', 'support', 'system')),
        CONSTRAINT ck_support_messages_visibility CHECK (visibility = 'public'),
        CONSTRAINT fk_support_messages_ticket
          FOREIGN KEY (tenant_id, ticket_id)
          REFERENCES support_tickets (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS support_internal_notes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        ticket_id uuid NOT NULL,
        author_user_id uuid,
        note text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_support_internal_notes_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_support_internal_notes_ticket
          FOREIGN KEY (tenant_id, ticket_id)
          REFERENCES support_tickets (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS support_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        ticket_id uuid NOT NULL,
        message_id uuid,
        internal_note_id uuid,
        uploaded_by_user_id uuid,
        original_file_name text NOT NULL,
        stored_path text NOT NULL,
        mime_type text NOT NULL,
        size_bytes integer NOT NULL,
        attachment_type text NOT NULL DEFAULT 'ticket',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_support_attachments_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_support_attachments_type CHECK (attachment_type IN ('ticket', 'message', 'internal_note')),
        CONSTRAINT ck_support_attachments_size CHECK (size_bytes >= 0),
        CONSTRAINT fk_support_attachments_ticket
          FOREIGN KEY (tenant_id, ticket_id)
          REFERENCES support_tickets (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS support_status_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        ticket_id uuid NOT NULL,
        actor_user_id uuid,
        from_status text,
        to_status text NOT NULL,
        action text NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_support_status_logs_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_support_status_logs_ticket
          FOREIGN KEY (tenant_id, ticket_id)
          REFERENCES support_tickets (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS support_notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        ticket_id uuid,
        recipient_user_id uuid,
        recipient_type text NOT NULL,
        channel text NOT NULL,
        title text NOT NULL,
        body text NOT NULL,
        read_at timestamptz,
        delivery_status text NOT NULL DEFAULT 'queued',
        delivery_attempts integer NOT NULL DEFAULT 0,
        last_delivery_error text,
        next_delivery_attempt_at timestamptz,
        delivered_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_support_notifications_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_support_notifications_recipient_type CHECK (recipient_type IN ('school', 'support')),
        CONSTRAINT ck_support_notifications_channel CHECK (channel IN ('in_app', 'email', 'sms')),
        CONSTRAINT ck_support_notifications_delivery_status CHECK (delivery_status IN ('queued', 'sent', 'failed', 'read')),
        CONSTRAINT fk_support_notifications_ticket
          FOREIGN KEY (tenant_id, ticket_id)
          REFERENCES support_tickets (tenant_id, id)
          ON DELETE CASCADE
      );

      ALTER TABLE support_notifications
        ADD COLUMN IF NOT EXISTS read_at timestamptz;

      ALTER TABLE support_notifications
        ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'queued';

      ALTER TABLE support_notifications
        ADD COLUMN IF NOT EXISTS delivery_attempts integer NOT NULL DEFAULT 0;

      ALTER TABLE support_notifications
        ADD COLUMN IF NOT EXISTS last_delivery_error text;

      ALTER TABLE support_notifications
        ADD COLUMN IF NOT EXISTS next_delivery_attempt_at timestamptz;

      ALTER TABLE support_notifications
        ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

      CREATE TABLE IF NOT EXISTS support_kb_articles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL DEFAULT 'global',
        category text NOT NULL,
        slug text NOT NULL,
        title text NOT NULL,
        summary text NOT NULL,
        body text NOT NULL,
        tags text[] NOT NULL DEFAULT ARRAY[]::text[],
        published boolean NOT NULL DEFAULT TRUE,
        helpful_count integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_support_kb_articles_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_support_kb_articles_tenant_slug UNIQUE (tenant_id, slug)
      );

      CREATE TABLE IF NOT EXISTS support_system_components (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL DEFAULT 'global',
        name text NOT NULL,
        slug text NOT NULL,
        status text NOT NULL DEFAULT 'operational',
        uptime_percent numeric(5,2) NOT NULL DEFAULT 99.99,
        latency_ms integer NOT NULL DEFAULT 0,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_support_system_components_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_support_system_components_tenant_slug UNIQUE (tenant_id, slug),
        CONSTRAINT ck_support_system_components_status CHECK (status IN ('operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance'))
      );

      DO $$
      DECLARE
        existing_policy text;
      BEGIN
        IF to_regclass('public.support_system_components') IS NOT NULL THEN
          ALTER TABLE support_system_components NO FORCE ROW LEVEL SECURITY;
          ALTER TABLE support_system_components DISABLE ROW LEVEL SECURITY;

          FOR existing_policy IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'support_system_components'
          LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON support_system_components', existing_policy);
          END LOOP;

          ALTER TABLE support_system_components
            ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
          ALTER TABLE support_system_components
            ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
          ALTER TABLE support_system_components
            ALTER COLUMN uptime_percent TYPE numeric(5,2) USING COALESCE(NULLIF(uptime_percent::text, '')::numeric, 99.99);
          ALTER TABLE support_system_components
            ALTER COLUMN latency_ms TYPE integer USING COALESCE(NULLIF(latency_ms::text, '')::integer, 0);

          UPDATE support_system_components
          SET tenant_id = COALESCE(NULLIF(btrim(tenant_id), ''), 'global'),
              status = CASE
                WHEN status IN ('operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance') THEN status
                ELSE 'operational'
              END,
              metadata = COALESCE(metadata, '{}'::jsonb)
          WHERE tenant_id IS NULL
             OR btrim(tenant_id) = ''
             OR status NOT IN ('operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance')
             OR metadata IS NULL;

          ALTER TABLE support_system_components
            ALTER COLUMN tenant_id SET DEFAULT 'global';
          ALTER TABLE support_system_components
            ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
          ALTER TABLE support_system_components
            ALTER COLUMN metadata SET NOT NULL;
          ALTER TABLE support_system_components
            ALTER COLUMN uptime_percent SET DEFAULT 99.99;
          ALTER TABLE support_system_components
            ALTER COLUMN latency_ms SET DEFAULT 0;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'uq_support_system_components_tenant_id_id'
          ) THEN
            ALTER TABLE support_system_components
              ADD CONSTRAINT uq_support_system_components_tenant_id_id UNIQUE (tenant_id, id);
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'uq_support_system_components_tenant_slug'
          ) THEN
            ALTER TABLE support_system_components
              ADD CONSTRAINT uq_support_system_components_tenant_slug UNIQUE (tenant_id, slug);
          END IF;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS support_incidents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL DEFAULT 'global',
        component_id uuid,
        title text NOT NULL,
        impact text NOT NULL,
        status text NOT NULL DEFAULT 'investigating',
        started_at timestamptz NOT NULL DEFAULT NOW(),
        resolved_at timestamptz,
        update_summary text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_support_incidents_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_support_incidents_impact CHECK (impact IN ('minor', 'major', 'critical')),
        CONSTRAINT ck_support_incidents_status CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
        CONSTRAINT fk_support_incidents_component
          FOREIGN KEY (tenant_id, component_id)
          REFERENCES support_system_components (tenant_id, id)
          ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS support_status_subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL DEFAULT 'global',
        contact_hash text NOT NULL,
        contact_type text NOT NULL DEFAULT 'email',
        locale text,
        consent_source text NOT NULL,
        consent_at timestamptz NOT NULL,
        client_ip_hash text,
        status text NOT NULL DEFAULT 'active',
        unsubscribed_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_support_status_subscriptions_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_support_status_subscriptions_contact UNIQUE (tenant_id, contact_hash),
        CONSTRAINT ck_support_status_subscriptions_hash CHECK (contact_hash ~ '^[a-f0-9]{64}$'),
        CONSTRAINT ck_support_status_subscriptions_ip_hash CHECK (client_ip_hash IS NULL OR client_ip_hash ~ '^[a-f0-9]{64}$'),
        CONSTRAINT ck_support_status_subscriptions_contact_type CHECK (contact_type = 'email'),
        CONSTRAINT ck_support_status_subscriptions_status CHECK (status IN ('active', 'unsubscribed')),
        CONSTRAINT ck_support_status_subscriptions_consent CHECK (consent_source = 'public_status_page')
      );

      CREATE TABLE IF NOT EXISTS support_status_unsubscribe_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL DEFAULT 'global',
        contact_hash text NOT NULL,
        token_hash text NOT NULL,
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_support_status_unsubscribe_tokens_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_support_status_unsubscribe_tokens_hash UNIQUE (token_hash),
        CONSTRAINT ck_support_status_unsubscribe_contact_hash CHECK (contact_hash ~ '^[a-f0-9]{64}$'),
        CONSTRAINT ck_support_status_unsubscribe_token_hash CHECK (token_hash ~ '^[a-f0-9]{64}$')
      );

      CREATE TABLE IF NOT EXISTS support_status_notification_attempts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL DEFAULT 'global',
        incident_id uuid NOT NULL,
        subscription_id uuid NOT NULL,
        contact_hash text NOT NULL,
        channel text NOT NULL DEFAULT 'email',
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        delivery_status text NOT NULL DEFAULT 'queued',
        attempts integer NOT NULL DEFAULT 0,
        last_error text,
        next_attempt_at timestamptz,
        sent_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_support_status_notification_attempts_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_support_status_attempts_contact_hash CHECK (contact_hash ~ '^[a-f0-9]{64}$'),
        CONSTRAINT ck_support_status_attempts_channel CHECK (channel = 'email'),
        CONSTRAINT ck_support_status_attempts_delivery_status CHECK (delivery_status IN ('queued', 'sent', 'failed')),
        CONSTRAINT ck_support_status_attempts_count CHECK (attempts >= 0),
        CONSTRAINT fk_support_status_attempts_incident
          FOREIGN KEY (tenant_id, incident_id)
          REFERENCES support_incidents (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_support_status_attempts_subscription
          FOREIGN KEY (tenant_id, subscription_id)
          REFERENCES support_status_subscriptions (tenant_id, id)
          ON DELETE CASCADE
      );

      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS updated_by_user_id uuid;
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS merged_into_ticket_id uuid;
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS first_responded_at timestamptz;
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS closed_at timestamptz;
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS last_school_reply_at timestamptz;
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS last_support_reply_at timestamptz;

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'support_tickets'
            AND column_name = 'context'
            AND data_type <> 'jsonb'
        ) THEN
          ALTER TABLE support_tickets
            ALTER COLUMN context DROP DEFAULT;
          ALTER TABLE support_tickets
            ALTER COLUMN context TYPE jsonb
            USING CASE
              WHEN context IS NULL OR btrim(context::text) = '' THEN '{}'::jsonb
              ELSE jsonb_build_object('legacy_context', context::text)
            END;
          ALTER TABLE support_tickets
            ALTER COLUMN context SET DEFAULT '{}'::jsonb;
          ALTER TABLE support_tickets
            ALTER COLUMN context SET NOT NULL;
        END IF;
      END $$;

      ALTER TABLE support_kb_articles
        ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT TRUE;
      ALTER TABLE support_kb_articles
        ADD COLUMN IF NOT EXISTS helpful_count integer NOT NULL DEFAULT 0;
      ALTER TABLE support_kb_articles
        ALTER COLUMN tags TYPE text[] USING CASE
          WHEN tags IS NULL OR btrim(tags::text) = '' THEN ARRAY[]::text[]
          WHEN pg_typeof(tags)::text = 'text[]' THEN tags::text[]
          ELSE regexp_split_to_array(tags::text, '\\s*,\\s*')
        END;
      ALTER TABLE support_kb_articles
        ALTER COLUMN tags SET DEFAULT ARRAY[]::text[];
      ALTER TABLE support_kb_articles
        ALTER COLUMN tags SET NOT NULL;

      ALTER TABLE support_status_subscriptions
        ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE support_status_subscriptions
        ALTER COLUMN locale DROP NOT NULL;
      ALTER TABLE support_status_subscriptions
        ALTER COLUMN client_ip_hash DROP NOT NULL;
      ALTER TABLE support_status_subscriptions
        ALTER COLUMN unsubscribed_at DROP NOT NULL;

      ALTER TABLE support_status_unsubscribe_tokens
        ADD COLUMN IF NOT EXISTS used_at timestamptz;

      ALTER TABLE support_status_notification_attempts
        ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
      ALTER TABLE support_status_notification_attempts
        ADD COLUMN IF NOT EXISTS last_error text;
      ALTER TABLE support_status_notification_attempts
        ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz;
      ALTER TABLE support_status_notification_attempts
        ADD COLUMN IF NOT EXISTS sent_at timestamptz;
      ALTER TABLE support_status_notification_attempts
        ALTER COLUMN payload SET DEFAULT '{}'::jsonb;

      DO $$
      DECLARE
        target_table text;
        existing_policy text;
      BEGIN
        FOREACH target_table IN ARRAY ARRAY[
          'support_categories',
          'support_agents',
          'support_tickets',
          'support_messages',
          'support_internal_notes',
          'support_attachments',
          'support_status_logs',
          'support_notifications',
          'support_kb_articles',
          'support_system_components',
          'support_incidents',
          'support_status_subscriptions',
          'support_status_unsubscribe_tokens',
          'support_status_notification_attempts'
        ]
        LOOP
          IF to_regclass('public.' || target_table) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', target_table);
            EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', target_table);

            FOR existing_policy IN
              SELECT policyname
              FROM pg_policies
              WHERE schemaname = 'public'
                AND tablename = target_table
            LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON %I', existing_policy, target_table);
            END LOOP;

            IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = target_table
                AND column_name = 'tenant_id'
                AND data_type <> 'text'
            ) THEN
              EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id TYPE text USING tenant_id::text', target_table);
            END IF;

            EXECUTE format(
              'UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL OR btrim(tenant_id) = %L',
              target_table,
              'global',
              ''
            );
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', target_table);

            IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = target_table
                AND column_name = 'created_at'
            ) THEN
              EXECUTE format('UPDATE %I SET created_at = NOW() WHERE created_at IS NULL', target_table);
              EXECUTE format('ALTER TABLE %I ALTER COLUMN created_at SET DEFAULT NOW()', target_table);
              EXECUTE format('ALTER TABLE %I ALTER COLUMN created_at SET NOT NULL', target_table);
            END IF;

            IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = target_table
                AND column_name = 'updated_at'
            ) THEN
              EXECUTE format('UPDATE %I SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL', target_table);
              EXECUTE format('ALTER TABLE %I ALTER COLUMN updated_at SET DEFAULT NOW()', target_table);
              EXECUTE format('ALTER TABLE %I ALTER COLUMN updated_at SET NOT NULL', target_table);
            END IF;
          END IF;
        END LOOP;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_support_categories_tenant_id_id'
        ) THEN
          ALTER TABLE support_categories
            ADD CONSTRAINT uq_support_categories_tenant_id_id UNIQUE (tenant_id, id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_support_categories_tenant_code'
        ) THEN
          ALTER TABLE support_categories
            ADD CONSTRAINT uq_support_categories_tenant_code UNIQUE (tenant_id, code);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_support_kb_articles_tenant_id_id'
        ) THEN
          ALTER TABLE support_kb_articles
            ADD CONSTRAINT uq_support_kb_articles_tenant_id_id UNIQUE (tenant_id, id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_support_kb_articles_tenant_slug'
        ) THEN
          ALTER TABLE support_kb_articles
            ADD CONSTRAINT uq_support_kb_articles_tenant_slug UNIQUE (tenant_id, slug);
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS ix_support_tickets_queue
        ON support_tickets (tenant_id, status, priority, updated_at DESC);
      CREATE INDEX IF NOT EXISTS ix_support_tickets_sla
        ON support_tickets (status, first_response_due_at, resolution_due_at);
      CREATE INDEX IF NOT EXISTS ix_support_tickets_search
        ON support_tickets (ticket_number, tenant_id, module_affected, status);
      CREATE INDEX IF NOT EXISTS ix_support_tickets_search_vector
        ON support_tickets
        USING GIN (
          to_tsvector(
            'simple'::regconfig,
            ticket_number || ' ' ||
            subject || ' ' ||
            category || ' ' ||
            module_affected || ' ' ||
            description
          )
        );
      CREATE INDEX IF NOT EXISTS ix_support_messages_ticket
        ON support_messages (tenant_id, ticket_id, created_at ASC);
      CREATE INDEX IF NOT EXISTS ix_support_internal_notes_ticket
        ON support_internal_notes (tenant_id, ticket_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_support_status_logs_ticket
        ON support_status_logs (tenant_id, ticket_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_support_notifications_recipient
        ON support_notifications (tenant_id, recipient_type, read_at, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_support_notifications_delivery_queue
        ON support_notifications (delivery_status, channel, next_delivery_attempt_at, created_at ASC);
      CREATE INDEX IF NOT EXISTS ix_support_kb_articles_search
        ON support_kb_articles (tenant_id, category, published, title);
      CREATE INDEX IF NOT EXISTS ix_support_kb_articles_search_vector
        ON support_kb_articles
        USING GIN (
          to_tsvector(
            'simple'::regconfig,
            title || ' ' ||
            summary || ' ' ||
            body
          )
        );
      CREATE INDEX IF NOT EXISTS ix_support_kb_articles_tags
        ON support_kb_articles
        USING GIN (tags);
      CREATE INDEX IF NOT EXISTS ix_support_incidents_status
        ON support_incidents (tenant_id, status, started_at DESC);
      CREATE INDEX IF NOT EXISTS ix_support_status_subscriptions_rate_limit
        ON support_status_subscriptions (contact_hash, client_ip_hash, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_support_status_subscriptions_active
        ON support_status_subscriptions (tenant_id, status, created_at ASC);
      CREATE INDEX IF NOT EXISTS ix_support_status_unsubscribe_tokens_contact
        ON support_status_unsubscribe_tokens (tenant_id, contact_hash, used_at, expires_at);
      CREATE INDEX IF NOT EXISTS ix_support_status_notification_attempts_queue
        ON support_status_notification_attempts (delivery_status, next_attempt_at, created_at ASC);
      CREATE INDEX IF NOT EXISTS ix_support_status_notification_attempts_incident
        ON support_status_notification_attempts (tenant_id, incident_id, created_at DESC);

      ALTER TABLE support_categories ENABLE ROW LEVEL SECURITY;
      ALTER TABLE support_categories FORCE ROW LEVEL SECURITY;
      ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
      ALTER TABLE support_agents FORCE ROW LEVEL SECURITY;
      ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
      ALTER TABLE support_tickets FORCE ROW LEVEL SECURITY;
      ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
      ALTER TABLE support_messages FORCE ROW LEVEL SECURITY;
      ALTER TABLE support_internal_notes ENABLE ROW LEVEL SECURITY;
      ALTER TABLE support_internal_notes FORCE ROW LEVEL SECURITY;
      ALTER TABLE support_attachments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE support_attachments FORCE ROW LEVEL SECURITY;
      ALTER TABLE support_status_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE support_status_logs FORCE ROW LEVEL SECURITY;
      ALTER TABLE support_notifications ENABLE ROW LEVEL SECURITY;
      ALTER TABLE support_notifications FORCE ROW LEVEL SECURITY;
      ALTER TABLE support_kb_articles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE support_kb_articles FORCE ROW LEVEL SECURITY;
      ALTER TABLE support_system_components ENABLE ROW LEVEL SECURITY;
      ALTER TABLE support_system_components FORCE ROW LEVEL SECURITY;
      ALTER TABLE support_incidents ENABLE ROW LEVEL SECURITY;
      ALTER TABLE support_incidents FORCE ROW LEVEL SECURITY;
      ALTER TABLE support_status_subscriptions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE support_status_subscriptions FORCE ROW LEVEL SECURITY;
      ALTER TABLE support_status_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
      ALTER TABLE support_status_unsubscribe_tokens FORCE ROW LEVEL SECURITY;
      ALTER TABLE support_status_notification_attempts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE support_status_notification_attempts FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS support_reference_rls_policy ON support_categories;
      CREATE POLICY support_reference_rls_policy ON support_categories
      FOR ALL
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR tenant_id = 'global'
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      );

      DROP POLICY IF EXISTS support_agents_rls_policy ON support_agents;
      CREATE POLICY support_agents_rls_policy ON support_agents
      FOR ALL
      USING (current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system'))
      WITH CHECK (current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_lead', 'system'));

      DROP POLICY IF EXISTS support_tickets_rls_policy ON support_tickets;
      CREATE POLICY support_tickets_rls_policy ON support_tickets
      FOR ALL
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      );

      DROP POLICY IF EXISTS support_messages_rls_policy ON support_messages;
      CREATE POLICY support_messages_rls_policy ON support_messages
      FOR ALL
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      );

      DROP POLICY IF EXISTS support_private_notes_rls_policy ON support_internal_notes;
      CREATE POLICY support_private_notes_rls_policy ON support_internal_notes
      FOR ALL
      USING (current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system'))
      WITH CHECK (current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system'));

      DROP POLICY IF EXISTS support_attachments_rls_policy ON support_attachments;
      CREATE POLICY support_attachments_rls_policy ON support_attachments
      FOR ALL
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      );

      DROP POLICY IF EXISTS support_status_logs_rls_policy ON support_status_logs;
      CREATE POLICY support_status_logs_rls_policy ON support_status_logs
      FOR ALL
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      );

      DROP POLICY IF EXISTS support_notifications_rls_policy ON support_notifications;
      CREATE POLICY support_notifications_rls_policy ON support_notifications
      FOR ALL
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      );

      DROP POLICY IF EXISTS support_kb_rls_policy ON support_kb_articles;
      CREATE POLICY support_kb_rls_policy ON support_kb_articles
      FOR ALL
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR tenant_id = 'global'
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      );

      DROP POLICY IF EXISTS support_components_rls_policy ON support_system_components;
      CREATE POLICY support_components_rls_policy ON support_system_components
      FOR ALL
      USING (
        tenant_id = 'global'
        OR tenant_id = current_setting('app.tenant_id', true)
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      )
      WITH CHECK (current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_lead', 'system'));

      DROP POLICY IF EXISTS support_incidents_rls_policy ON support_incidents;
      CREATE POLICY support_incidents_rls_policy ON support_incidents
      FOR ALL
      USING (
        tenant_id = 'global'
        OR tenant_id = current_setting('app.tenant_id', true)
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      )
      WITH CHECK (current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_lead', 'system'));

      DROP POLICY IF EXISTS support_status_subscriptions_rls_policy ON support_status_subscriptions;
      CREATE POLICY support_status_subscriptions_rls_policy ON support_status_subscriptions
      FOR ALL
      USING (
        tenant_id = 'global'
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      )
      WITH CHECK (
        tenant_id = 'global'
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      );

      DROP POLICY IF EXISTS support_status_unsubscribe_tokens_rls_policy ON support_status_unsubscribe_tokens;
      CREATE POLICY support_status_unsubscribe_tokens_rls_policy ON support_status_unsubscribe_tokens
      FOR ALL
      USING (
        tenant_id = 'global'
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      )
      WITH CHECK (
        tenant_id = 'global'
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      );

      DROP POLICY IF EXISTS support_status_notification_attempts_rls_policy ON support_status_notification_attempts;
      CREATE POLICY support_status_notification_attempts_rls_policy ON support_status_notification_attempts
      FOR ALL
      USING (
        tenant_id = 'global'
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      )
      WITH CHECK (
        tenant_id = 'global'
        OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
      );

      DROP TRIGGER IF EXISTS trg_support_categories_set_updated_at ON support_categories;
      CREATE TRIGGER trg_support_categories_set_updated_at
      BEFORE UPDATE ON support_categories
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_support_agents_set_updated_at ON support_agents;
      CREATE TRIGGER trg_support_agents_set_updated_at
      BEFORE UPDATE ON support_agents
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_support_tickets_set_updated_at ON support_tickets;
      CREATE TRIGGER trg_support_tickets_set_updated_at
      BEFORE UPDATE ON support_tickets
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_support_messages_set_updated_at ON support_messages;
      CREATE TRIGGER trg_support_messages_set_updated_at
      BEFORE UPDATE ON support_messages
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_support_internal_notes_set_updated_at ON support_internal_notes;
      CREATE TRIGGER trg_support_internal_notes_set_updated_at
      BEFORE UPDATE ON support_internal_notes
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_support_attachments_set_updated_at ON support_attachments;
      CREATE TRIGGER trg_support_attachments_set_updated_at
      BEFORE UPDATE ON support_attachments
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_support_status_logs_set_updated_at ON support_status_logs;
      CREATE TRIGGER trg_support_status_logs_set_updated_at
      BEFORE UPDATE ON support_status_logs
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_support_notifications_set_updated_at ON support_notifications;
      CREATE TRIGGER trg_support_notifications_set_updated_at
      BEFORE UPDATE ON support_notifications
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_support_kb_articles_set_updated_at ON support_kb_articles;
      CREATE TRIGGER trg_support_kb_articles_set_updated_at
      BEFORE UPDATE ON support_kb_articles
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_support_system_components_set_updated_at ON support_system_components;
      CREATE TRIGGER trg_support_system_components_set_updated_at
      BEFORE UPDATE ON support_system_components
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_support_incidents_set_updated_at ON support_incidents;
      CREATE TRIGGER trg_support_incidents_set_updated_at
      BEFORE UPDATE ON support_incidents
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_support_status_subscriptions_set_updated_at ON support_status_subscriptions;
      CREATE TRIGGER trg_support_status_subscriptions_set_updated_at
      BEFORE UPDATE ON support_status_subscriptions
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_support_status_unsubscribe_tokens_set_updated_at ON support_status_unsubscribe_tokens;
      CREATE TRIGGER trg_support_status_unsubscribe_tokens_set_updated_at
      BEFORE UPDATE ON support_status_unsubscribe_tokens
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_support_status_notification_attempts_set_updated_at ON support_status_notification_attempts;
      CREATE TRIGGER trg_support_status_notification_attempts_set_updated_at
      BEFORE UPDATE ON support_status_notification_attempts
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);

    await this.seedGlobalSupportContent();
    this.logger.log('Support ticketing schema, RLS policies, and reference content verified');
  }

  private async seedGlobalSupportContent(): Promise<void> {
    const categoryValues = SUPPORT_CATEGORIES.map((category, index) => {
      const code = category.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');

      return format(
        `('global', %L, %L, %L, %L, %L, %L)`,
        code,
        category,
        `${category} support and troubleshooting requests.`,
        category === 'MPESA' || category === 'Login Issues' ? 30 : 240,
        category === 'MPESA' || category === 'Performance' ? 480 : 2880,
        index + 1,
      );
    }).join(',\n');

    const articles = [
      {
        slug: 'mpesa-receipts-not-matching',
        category: 'MPESA',
        title: 'MPESA receipts are paid but not matched',
        summary: 'Check callback status, account reference format, and reconciliation queue before opening an escalation.',
        body: 'Confirm the receipt exists in MPESA Transactions, verify the admission number or invoice reference, then use manual reconciliation if the callback arrived late.',
        tags: ['mpesa', 'payments', 'reconciliation'],
      },
      {
        slug: 'reset-school-admin-access',
        category: 'Login Issues',
        title: 'Reset a school administrator account',
        summary: 'Recover access safely without sharing passwords over chat.',
        body: 'Use the password recovery workflow or request a support-issued invitation reset if the original admin email is no longer available.',
        tags: ['login', 'admin', 'security'],
      },
      {
        slug: 'slow-dashboard-after-term-opening',
        category: 'Performance',
        title: 'Dashboard feels slow after term opening',
        summary: 'Term opening can create high SMS, payment, and reporting traffic. Review system status before filing duplicates.',
        body: 'Check System Status for queue lag, then capture the current page URL, browser, and affected module when opening a ticket.',
        tags: ['performance', 'queues', 'dashboard'],
      },
    ];

    const articleValues = articles.map((article) => {
      const tagsSql = article.tags.map((tag) => format('%L', tag)).join(', ');

      return format(
        `('global', %L, %L, %L, %L, %L, ARRAY[${tagsSql}]::text[])`,
        article.slug,
        article.category,
        article.title,
        article.summary,
        article.body,
      );
    }).join(',\n');

    const components = [
      ['api', 'API', 'operational', 99.98, 182],
      ['payments', 'Payment systems', 'operational', 99.96, 240],
      ['mpesa', 'MPESA integrations', 'operational', 99.90, 210],
      ['queues', 'Background queues', 'operational', 99.95, 95],
      ['uptime', 'School dashboards', 'operational', 99.99, 160],
    ] as const;

    const componentValues = components.map(([slug, name, status, uptime, latency]) =>
      format(
        `('global', %L, %L, %L, %L, %L)`,
        slug,
        name,
        status,
        uptime,
        latency,
      ),
    ).join(',\n');

    await this.prisma.runSchemaBootstrap(`
      SET LOCAL app.role = 'system';
      SET LOCAL app.tenant_id = 'global';

      INSERT INTO support_categories (
        tenant_id,
        code,
        name,
        description,
        response_sla_minutes,
        resolution_sla_minutes,
        sort_order
      )
      VALUES ${categoryValues}
      ON CONFLICT (tenant_id, code)
      DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        response_sla_minutes = EXCLUDED.response_sla_minutes,
        resolution_sla_minutes = EXCLUDED.resolution_sla_minutes,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW();

      INSERT INTO support_kb_articles (
        tenant_id,
        slug,
        category,
        title,
        summary,
        body,
        tags
      )
      VALUES ${articleValues}
      ON CONFLICT (tenant_id, slug)
      DO UPDATE SET
        category = EXCLUDED.category,
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        body = EXCLUDED.body,
        tags = EXCLUDED.tags,
        published = TRUE,
        updated_at = NOW();

      INSERT INTO support_system_components (
        tenant_id,
        slug,
        name,
        status,
        uptime_percent,
        latency_ms
      )
      VALUES ${componentValues}
      ON CONFLICT (tenant_id, slug)
      DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        uptime_percent = EXCLUDED.uptime_percent,
        latency_ms = EXCLUDED.latency_ms,
        updated_at = NOW();
    `);
  }
}
