import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CommunicationSchemaService implements OnModuleInit {
  private readonly logger = new Logger(CommunicationSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE TABLE IF NOT EXISTS communication_sms_outbox (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        recipient_phone text NOT NULL,
        message text NOT NULL,
        status text NOT NULL DEFAULT 'Pending',
        sent_by uuid,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE communication_sms_outbox DISABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS communication_sms_outbox_tenant_policy ON communication_sms_outbox;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS tenant_id text;
      DO $$
      DECLARE
        legacy_constraint_name text;
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns c
          WHERE c.table_name = 'communication_sms_outbox'
            AND c.column_name = 'tenant_id'
            AND c.data_type <> 'text'
        ) THEN
          FOR legacy_constraint_name IN
            SELECT constraint_record.conname
            FROM pg_constraint constraint_record
            JOIN pg_class relation ON relation.oid = constraint_record.conrelid
            JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
            JOIN pg_attribute attribute
              ON attribute.attrelid = relation.oid
             AND attribute.attnum = ANY(constraint_record.conkey)
            WHERE namespace.nspname = 'public'
              AND relation.relname = 'communication_sms_outbox'
              AND constraint_record.contype = 'f'
              AND attribute.attname = 'tenant_id'
          LOOP
            EXECUTE format(
              'ALTER TABLE public.communication_sms_outbox DROP CONSTRAINT %I',
              legacy_constraint_name
            );
          END LOOP;

          ALTER TABLE communication_sms_outbox ALTER COLUMN tenant_id DROP DEFAULT;
          ALTER TABLE communication_sms_outbox
            ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns c
          WHERE c.table_schema = 'public'
            AND c.table_name = 'communication_sms_outbox'
            AND c.column_name = 'sent_by'
            AND c.udt_name <> 'uuid'
        ) THEN
          ALTER TABLE communication_sms_outbox ALTER COLUMN sent_by DROP NOT NULL;
          ALTER TABLE communication_sms_outbox ALTER COLUMN sent_by DROP DEFAULT;
          ALTER TABLE communication_sms_outbox
            ALTER COLUMN sent_by TYPE uuid
            USING CASE
              WHEN sent_by::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              THEN sent_by::text::uuid
              ELSE NULL
            END;
        END IF;
      END $$;
      UPDATE communication_sms_outbox
      SET tenant_id = COALESCE(NULLIF(tenant_id, ''), NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')
      WHERE tenant_id IS NULL OR tenant_id = '';
      ALTER TABLE communication_sms_outbox ALTER COLUMN tenant_id DROP DEFAULT;
      ALTER TABLE communication_sms_outbox ALTER COLUMN tenant_id SET NOT NULL;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS recipient_phone text NOT NULL DEFAULT '';
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS message text NOT NULL DEFAULT '';
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Pending';
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS sent_by uuid;
      ALTER TABLE communication_sms_outbox ALTER COLUMN sent_by DROP NOT NULL;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT NOW();
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS available_at timestamptz NOT NULL DEFAULT NOW();
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS dispatch_started_at timestamptz;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS lease_token uuid;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS last_error text;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS provider_id uuid;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS provider_code text;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS provider_reference text;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS provider_accepted_at timestamptz;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS sent_at timestamptz;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS failed_at timestamptz;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS delivery_unknown_at timestamptz;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS dispatch_key text;

      UPDATE communication_sms_outbox
      SET attempt_count = GREATEST(COALESCE(attempt_count, 0), 0),
          available_at = COALESCE(available_at, created_at, NOW()),
          dispatch_key = COALESCE(NULLIF(dispatch_key, ''), 'communication-sms:' || id::text),
          updated_at = COALESCE(updated_at, created_at, NOW())
      WHERE attempt_count IS NULL
         OR attempt_count < 0
         OR available_at IS NULL
         OR dispatch_key IS NULL
         OR btrim(dispatch_key) = ''
         OR updated_at IS NULL;

      UPDATE communication_sms_outbox
      SET status = 'Failed',
          failed_at = COALESCE(failed_at, NOW()),
          last_error = COALESCE(last_error, 'Quarantined because the SMS row has no valid school owner'),
          lease_expires_at = NULL,
          lease_token = NULL,
          updated_at = NOW()
      WHERE tenant_id IN ('', 'global', '00000000-0000-0000-0000-000000000000');

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint constraint_record
          WHERE constraint_record.conrelid = 'public.communication_sms_outbox'::regclass
            AND constraint_record.conname = 'ck_communication_sms_outbox_tenant_owner'
        ) THEN
          ALTER TABLE communication_sms_outbox
            ADD CONSTRAINT ck_communication_sms_outbox_tenant_owner
            CHECK (
              btrim(tenant_id) <> ''
              AND lower(btrim(tenant_id)) <> 'global'
              AND tenant_id <> '00000000-0000-0000-0000-000000000000'
            ) NOT VALID;
        END IF;
      END $$;

      ALTER TABLE communication_sms_outbox ALTER COLUMN attempt_count SET DEFAULT 0;
      ALTER TABLE communication_sms_outbox ALTER COLUMN attempt_count SET NOT NULL;
      ALTER TABLE communication_sms_outbox ALTER COLUMN available_at SET DEFAULT NOW();
      ALTER TABLE communication_sms_outbox ALTER COLUMN available_at SET NOT NULL;
      ALTER TABLE communication_sms_outbox ALTER COLUMN dispatch_key SET DEFAULT ('communication-sms:' || gen_random_uuid()::text);
      ALTER TABLE communication_sms_outbox ALTER COLUMN dispatch_key SET NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS ux_communication_sms_outbox_tenant_dispatch_key
        ON communication_sms_outbox (tenant_id, dispatch_key);
      CREATE INDEX IF NOT EXISTS ix_communication_sms_outbox_dispatch
        ON communication_sms_outbox (lower(status), available_at, lease_expires_at, created_at);

      CREATE SCHEMA IF NOT EXISTS app;
      CREATE OR REPLACE FUNCTION app.claim_communication_sms_outbox(
        batch_size integer,
        lease_ms integer
      )
      RETURNS TABLE (
        id uuid,
        tenant_id text,
        attempt_count integer,
        dispatch_key text,
        lease_token uuid
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = pg_catalog, pg_temp
      SET row_security = on
      AS $$
      DECLARE
        stale_message record;
        active_tenant record;
        candidate_message record;
        claimed_message record;
        original_tenant text;
        original_role text;
        candidate_ids uuid[] := ARRAY[]::uuid[];
        candidate_tenants text[] := ARRAY[]::text[];
        candidate_available_at timestamptz[] := ARRAY[]::timestamptz[];
        candidate_created_at timestamptz[] := ARRAY[]::timestamptz[];
      BEGIN
        IF batch_size IS NULL OR batch_size < 1 OR batch_size > 250 THEN
          RAISE EXCEPTION 'batch_size must be between 1 and 250'
            USING ERRCODE = '22023';
        END IF;

        IF lease_ms IS NULL OR lease_ms < 30000 OR lease_ms > 900000 THEN
          RAISE EXCEPTION 'lease_ms must be between 30000 and 900000'
            USING ERRCODE = '22023';
        END IF;

        original_tenant := current_setting('app.tenant_id', true);
        original_role := current_setting('app.role', true);
        PERFORM set_config('app.role', 'platform_owner', true);

        -- Claim transactions are short. Serializing only candidate selection
        -- prevents concurrent worker replicas from choosing the same oldest
        -- rows and returning under-filled batches after one replica wins the
        -- conditional UPDATE.
        PERFORM pg_advisory_xact_lock(
          hashtextextended('app.claim_communication_sms_outbox', 0)
        );

        FOR active_tenant IN
          SELECT
            tenant.tenant_id,
            lower(COALESCE(tenant.status, 'active')) AS tenant_status
          FROM public.tenants tenant
          WHERE btrim(tenant.tenant_id) <> ''
            AND lower(btrim(tenant.tenant_id)) <> 'global'
          ORDER BY tenant.tenant_id
        LOOP
          PERFORM set_config('app.tenant_id', active_tenant.tenant_id, true);

          FOR stale_message IN
          UPDATE public.communication_sms_outbox AS stale
          SET status = CASE
                WHEN stale.dispatch_started_at IS NULL THEN 'Pending'
                ELSE 'DeliveryUnknown'
              END,
              available_at = CASE
                WHEN stale.dispatch_started_at IS NULL THEN NOW() + INTERVAL '5 seconds'
                ELSE stale.available_at
              END,
              delivery_unknown_at = CASE
                WHEN stale.dispatch_started_at IS NULL THEN NULL
                ELSE COALESCE(stale.delivery_unknown_at, NOW())
              END,
              last_error = CASE
                WHEN stale.dispatch_started_at IS NULL
                  THEN 'Dispatch claim expired before a provider request started; safely returned to the queue'
                ELSE COALESCE(
                  stale.last_error,
                  'Provider acceptance is unknown because the previous dispatch lease expired; manual review is required'
                )
              END,
              lease_expires_at = NULL,
              lease_token = NULL,
              updated_at = NOW()
          WHERE lower(stale.status) = 'processing'
            AND stale.tenant_id = active_tenant.tenant_id
            AND stale.lease_expires_at IS NOT NULL
            AND stale.lease_expires_at <= NOW()
          RETURNING
            stale.id,
            stale.tenant_id,
            stale.attempt_count,
            stale.dispatch_started_at,
            stale.delivery_unknown_at,
            stale.updated_at
          LOOP
          IF to_regclass('public.audit_logs') IS NOT NULL THEN
            INSERT INTO public.audit_logs (
              tenant_id,
              actor_user_id,
              action,
              module,
              entity_type,
              entity_id,
              resource_type,
              resource_id,
              aggregate_id,
              metadata,
              occurred_at,
              created_at,
              updated_at
            )
            VALUES (
              stale_message.tenant_id,
              NULL,
              CASE
                WHEN stale_message.dispatch_started_at IS NULL
                  THEN 'communication.sms.claim_released'
                ELSE 'communication.sms.delivery_unknown'
              END,
              'communication',
              'communication_sms',
              stale_message.id::text,
              'communication_sms',
              stale_message.id,
              stale_message.id,
              jsonb_build_object(
                'attempt_count', stale_message.attempt_count,
                'delivery_status', CASE
                  WHEN stale_message.dispatch_started_at IS NULL THEN 'retry_scheduled'
                  ELSE 'unknown'
                END,
                'reason', CASE
                  WHEN stale_message.dispatch_started_at IS NULL
                    THEN 'dispatch_claim_expired_before_provider_request'
                  ELSE 'dispatch_lease_expired_without_provider_outcome'
                END
              ),
              COALESCE(stale_message.delivery_unknown_at, stale_message.updated_at),
              COALESCE(stale_message.delivery_unknown_at, stale_message.updated_at),
              COALESCE(stale_message.delivery_unknown_at, stale_message.updated_at)
            );
          END IF;

          IF stale_message.dispatch_started_at IS NOT NULL
             AND to_regclass('public.outbox_events') IS NOT NULL THEN
            INSERT INTO public.outbox_events (
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
              actor_role,
              source_dashboard,
              created_at,
              updated_at
            )
            VALUES (
              stale_message.tenant_id,
              stale_message.tenant_id,
              'communication.sms.delivery_unknown:' || stale_message.id::text,
              'communication.sms.delivery_unknown',
              'communication_sms',
              stale_message.id,
              jsonb_build_object(
                'tenant_id', stale_message.tenant_id,
                'sms_id', stale_message.id::text,
                'recipient_phone_last4', NULL,
                'requested_by_user_id', NULL,
                'attempt_count', stale_message.attempt_count,
                'failure_reason', 'Provider acceptance is unknown because the dispatch lease expired',
                'outcome_recorded_at', stale_message.delivery_unknown_at
              ),
              jsonb_build_object(
                'request_id', 'communication-sms-stale-lease:' || stale_message.id::text,
                'role', 'system',
                'tenant_id', stale_message.tenant_id,
                'school_id', stale_message.tenant_id,
                'source_dashboard', 'system:communication-sms-outbox'
              ),
              'pending',
              NOW(),
              'system',
              'system:communication-sms-outbox',
              stale_message.delivery_unknown_at,
              stale_message.delivery_unknown_at
            )
            ON CONFLICT ON CONSTRAINT uq_outbox_events_tenant_event_key DO NOTHING;
          END IF;
          END LOOP;

          -- Suspended/inactive schools must still have ambiguous expired
          -- leases reconciled above, but no new messages may be dispatched.
          IF active_tenant.tenant_status = 'active' THEN
            FOR candidate_message IN
              SELECT sms.id, sms.tenant_id, sms.available_at, sms.created_at
              FROM public.communication_sms_outbox sms
              WHERE lower(sms.status) IN ('pending', 'queued')
                AND sms.available_at <= NOW()
                AND sms.tenant_id = active_tenant.tenant_id
              ORDER BY sms.available_at ASC, sms.created_at ASC, sms.id ASC
              LIMIT batch_size
            LOOP
              candidate_ids := array_append(candidate_ids, candidate_message.id);
              candidate_tenants := array_append(candidate_tenants, candidate_message.tenant_id);
              candidate_available_at := array_append(candidate_available_at, candidate_message.available_at);
              candidate_created_at := array_append(candidate_created_at, candidate_message.created_at);
            END LOOP;
          END IF;
        END LOOP;

        FOR candidate_message IN
          SELECT candidate.*
          FROM unnest(
            candidate_ids,
            candidate_tenants,
            candidate_available_at,
            candidate_created_at
          ) AS candidate(id, tenant_id, available_at, created_at)
          ORDER BY candidate.available_at ASC, candidate.created_at ASC, candidate.id ASC
          LIMIT batch_size
        LOOP
          PERFORM set_config('app.tenant_id', candidate_message.tenant_id, true);

          FOR claimed_message IN
            UPDATE public.communication_sms_outbox AS target
            SET status = 'Processing',
                attempt_count = target.attempt_count + 1,
                last_attempt_at = NOW(),
                lease_expires_at = NOW() + (lease_ms * INTERVAL '1 millisecond'),
                lease_token = gen_random_uuid(),
                dispatch_started_at = NULL,
                last_error = NULL,
                updated_at = NOW()
            WHERE target.id = candidate_message.id
              AND target.tenant_id = candidate_message.tenant_id
              AND lower(target.status) IN ('pending', 'queued')
              AND target.available_at <= NOW()
            RETURNING
              target.id,
              target.tenant_id,
              target.attempt_count,
              target.dispatch_key,
              target.lease_token
          LOOP
            id := claimed_message.id;
            tenant_id := claimed_message.tenant_id;
            attempt_count := claimed_message.attempt_count;
            dispatch_key := claimed_message.dispatch_key;
            lease_token := claimed_message.lease_token;
            RETURN NEXT;
          END LOOP;
        END LOOP;

        PERFORM set_config('app.tenant_id', COALESCE(original_tenant, ''), true);
        PERFORM set_config('app.role', COALESCE(original_role, ''), true);
        RETURN;
      END;
      $$;

      ALTER FUNCTION app.claim_communication_sms_outbox(integer, integer) OWNER TO CURRENT_USER;
      REVOKE ALL ON FUNCTION app.claim_communication_sms_outbox(integer, integer) FROM PUBLIC;

      ALTER TABLE communication_sms_outbox ENABLE ROW LEVEL SECURITY;
      ALTER TABLE communication_sms_outbox FORCE ROW LEVEL SECURITY;

      CREATE POLICY communication_sms_outbox_tenant_policy ON communication_sms_outbox
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
    `);

    this.logger.log('Communication schema and RLS policies verified');
  }
}
