import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthSchemaService implements OnModuleInit {
  private readonly logger = new Logger(AuthSchemaService.name);
  private bootstrapPromise: Promise<void> | null = null;

  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrapSchema().catch((error) => {
        this.bootstrapPromise = null;
        throw error;
      });
    }

    await this.bootstrapPromise;
  }

  private async bootstrapSchema(): Promise<void> {
    await this.databaseService.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE SCHEMA IF NOT EXISTS app;

      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS trigger AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL DEFAULT 'global',
        email text NOT NULL,
        password_hash text NOT NULL,
        display_name text NOT NULL,
        user_type text NOT NULL DEFAULT 'member' CHECK (user_type IN ('member', 'platform_owner')),
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'locked')),
        email_verified_at timestamptz,
        recovery_email text,
        mfa_enabled boolean NOT NULL DEFAULT FALSE,
        mfa_verified_at timestamptz,
        password_changed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      DO $$
      DECLARE
        legacy_fk record;
        has_invalid_ids boolean;
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'id'
            AND data_type = 'text'
        ) THEN
          CREATE TEMP TABLE IF NOT EXISTS legacy_user_fk_migrations (
            table_name text NOT NULL,
            column_name text NOT NULL,
            constraint_name text NOT NULL
          ) ON COMMIT DROP;
          TRUNCATE legacy_user_fk_migrations;

          INSERT INTO legacy_user_fk_migrations (table_name, column_name, constraint_name)
          SELECT con.conrelid::regclass::text, att.attname, con.conname
          FROM pg_constraint con
          JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
          JOIN pg_class ref ON ref.oid = con.confrelid
          JOIN information_schema.columns cols
            ON cols.table_schema = 'public'
            AND cols.table_name = con.conrelid::regclass::text
            AND cols.column_name = att.attname
          WHERE con.contype = 'f'
            AND ref.relname = 'users'
            AND cols.data_type = 'text';

          FOR legacy_fk IN SELECT * FROM legacy_user_fk_migrations LOOP
            EXECUTE format(
              'SELECT EXISTS (SELECT 1 FROM %s WHERE %I IS NOT NULL AND %I !~* %L)',
              legacy_fk.table_name,
              legacy_fk.column_name,
              legacy_fk.column_name,
              '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            )
            INTO has_invalid_ids;

            IF has_invalid_ids THEN
              RAISE EXCEPTION 'Cannot migrate %.% from text to uuid because non-UUID user IDs exist',
                legacy_fk.table_name,
                legacy_fk.column_name;
            END IF;

            EXECUTE format(
              'ALTER TABLE %s DROP CONSTRAINT %I',
              legacy_fk.table_name,
              legacy_fk.constraint_name
            );
            EXECUTE format(
              'ALTER TABLE %s ALTER COLUMN %I TYPE uuid USING %I::uuid',
              legacy_fk.table_name,
              legacy_fk.column_name,
              legacy_fk.column_name
            );
          END LOOP;

          IF EXISTS (
            SELECT 1
            FROM users
            WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          ) THEN
            RAISE EXCEPTION 'Cannot migrate users.id from text to uuid because non-UUID user IDs exist';
          END IF;

          ALTER TABLE users ALTER COLUMN id DROP DEFAULT;
          ALTER TABLE users ALTER COLUMN id TYPE uuid USING id::uuid;
          ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();

          FOR legacy_fk IN SELECT * FROM legacy_user_fk_migrations LOOP
            EXECUTE format(
              'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES users(id) ON DELETE RESTRICT',
              legacy_fk.table_name,
              legacy_fk.constraint_name,
              legacy_fk.column_name
            );
          END LOOP;
        END IF;
      END;
      $$;

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'status'
            AND data_type = 'USER-DEFINED'
        ) THEN
          ALTER TABLE users ALTER COLUMN status DROP DEFAULT;
          ALTER TABLE users ALTER COLUMN status TYPE text USING
            CASE lower(status::text)
              WHEN 'active' THEN 'active'
              WHEN 'disabled' THEN 'disabled'
              WHEN 'locked' THEN 'locked'
              WHEN 'invited' THEN 'disabled'
              WHEN 'suspended' THEN 'disabled'
              ELSE 'disabled'
            END;
        END IF;

        UPDATE users
        SET status = CASE lower(status)
          WHEN 'active' THEN 'active'
          WHEN 'disabled' THEN 'disabled'
          WHEN 'locked' THEN 'locked'
          WHEN 'invited' THEN 'disabled'
          WHEN 'suspended' THEN 'disabled'
          ELSE 'disabled'
        END
        WHERE status IS NULL
          OR status <> lower(status)
          OR lower(status) NOT IN ('active', 'disabled', 'locked');

        ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active';
        ALTER TABLE users ALTER COLUMN status SET NOT NULL;
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
        ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_status;
        ALTER TABLE users ADD CONSTRAINT ck_users_status CHECK (status IN ('active', 'disabled', 'locked'));
      END;
      $$;

      ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'global';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'member';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_email text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_verified_at timestamptz;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

      DO $$
      DECLARE
        auth_timestamp_column record;
      BEGIN
        FOR auth_timestamp_column IN
          SELECT table_name, column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name IN ('users', 'roles', 'permissions', 'role_permissions', 'tenant_memberships')
            AND column_name IN (
              'created_at',
              'updated_at',
              'email_verified_at',
              'mfa_verified_at',
              'password_changed_at'
            )
            AND data_type = 'timestamp without time zone'
        LOOP
          EXECUTE format(
            'ALTER TABLE %I ALTER COLUMN %I TYPE timestamptz USING %I AT TIME ZONE %L',
            auth_timestamp_column.table_name,
            auth_timestamp_column.column_name,
            auth_timestamp_column.column_name,
            'UTC'
          );
        END LOOP;
      END;
      $$;

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'full_name'
        ) THEN
          UPDATE users
          SET display_name = COALESCE(NULLIF(display_name, ''), NULLIF(full_name, ''), NULLIF(email, ''), 'User')
          WHERE display_name IS NULL OR display_name = '';
        ELSE
          UPDATE users
          SET display_name = COALESCE(NULLIF(display_name, ''), NULLIF(email, ''), 'User')
          WHERE display_name IS NULL OR display_name = '';
        END IF;

        ALTER TABLE users ALTER COLUMN display_name SET NOT NULL;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_users_user_type'
        ) THEN
          ALTER TABLE users
          ADD CONSTRAINT ck_users_user_type
          CHECK (user_type IN ('member', 'platform_owner'));
        END IF;
      END;
      $$;

      CREATE TABLE IF NOT EXISTS roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        code text NOT NULL,
        name text NOT NULL,
        description text,
        is_system boolean NOT NULL DEFAULT FALSE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        code text,
        module text,
        resource text NOT NULL,
        action text NOT NULL,
        scope text NOT NULL DEFAULT 'tenant',
        key text,
        description text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE roles ADD COLUMN IF NOT EXISTS tenant_id text;
      ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT FALSE;
      ALTER TABLE permissions ADD COLUMN IF NOT EXISTS tenant_id text;
      ALTER TABLE permissions ADD COLUMN IF NOT EXISTS code text;
      ALTER TABLE permissions ADD COLUMN IF NOT EXISTS module text;
      ALTER TABLE permissions ADD COLUMN IF NOT EXISTS scope text DEFAULT 'tenant';
      ALTER TABLE permissions ADD COLUMN IF NOT EXISTS key text;

      DO $$
      BEGIN
        IF to_regclass('public.role_permissions') IS NOT NULL THEN
          ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS tenant_id text;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'roles'
            AND column_name = 'school_id'
        ) THEN
          UPDATE roles SET tenant_id = COALESCE(tenant_id, school_id, 'global') WHERE tenant_id IS NULL OR tenant_id = '';
        ELSE
          UPDATE roles SET tenant_id = COALESCE(tenant_id, 'global') WHERE tenant_id IS NULL OR tenant_id = '';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'roles'
            AND column_name = 'is_system_role'
        ) THEN
          UPDATE roles SET is_system = COALESCE(is_system, is_system_role, FALSE);
        END IF;

        UPDATE permissions
        SET tenant_id = COALESCE(tenant_id, 'global'),
            module = COALESCE(NULLIF(btrim(module), ''), resource),
            scope = COALESCE(NULLIF(btrim(scope), ''), 'tenant'),
            key = COALESCE(
              NULLIF(btrim(key), ''),
              lower(
                COALESCE(tenant_id, 'global') || '.' ||
                regexp_replace(resource, '[^a-zA-Z0-9]+', '_', 'g') || '.' ||
                regexp_replace(action, '[^a-zA-Z0-9]+', '_', 'g') || '.tenant'
              )
            ),
            code = COALESCE(
              NULLIF(btrim(code), ''),
              upper(
                regexp_replace(COALESCE(tenant_id, 'global'), '[^a-zA-Z0-9]+', '_', 'g') || '_' ||
                regexp_replace(resource, '[^a-zA-Z0-9]+', '_', 'g') || '_' ||
                regexp_replace(action, '[^a-zA-Z0-9]+', '_', 'g')
              )
            )
        WHERE tenant_id IS NULL
           OR tenant_id = ''
           OR module IS NULL
           OR btrim(module) = ''
           OR scope IS NULL
           OR btrim(scope) = ''
           OR key IS NULL
           OR btrim(key) = ''
           OR code IS NULL
           OR btrim(code) = '';

        IF to_regclass('public.role_permissions') IS NOT NULL THEN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'role_permissions'
              AND column_name = 'school_id'
          ) THEN
            UPDATE role_permissions SET tenant_id = COALESCE(tenant_id, school_id, 'global') WHERE tenant_id IS NULL OR tenant_id = '';
          ELSE
            UPDATE role_permissions SET tenant_id = COALESCE(tenant_id, 'global') WHERE tenant_id IS NULL OR tenant_id = '';
          END IF;

          ALTER TABLE role_permissions ALTER COLUMN tenant_id SET NOT NULL;
        END IF;

        ALTER TABLE roles ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE permissions ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE permissions ALTER COLUMN code SET NOT NULL;
        ALTER TABLE permissions ALTER COLUMN module SET NOT NULL;
        ALTER TABLE permissions ALTER COLUMN scope SET NOT NULL;
        ALTER TABLE permissions ALTER COLUMN key SET NOT NULL;
      END;
      $$;

      DO $$
      DECLARE
        target_table text;
        legacy_fk record;
        has_invalid_ids boolean;
      BEGIN
        FOREACH target_table IN ARRAY ARRAY['roles', 'permissions'] LOOP
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = target_table
              AND column_name = 'id'
              AND data_type = 'text'
          ) THEN
            CREATE TEMP TABLE IF NOT EXISTS legacy_auth_fk_migrations (
              table_name text NOT NULL,
              column_name text NOT NULL,
              constraint_name text NOT NULL,
              referenced_table text NOT NULL
            ) ON COMMIT DROP;
            TRUNCATE legacy_auth_fk_migrations;

            INSERT INTO legacy_auth_fk_migrations (table_name, column_name, constraint_name, referenced_table)
            SELECT con.conrelid::regclass::text, att.attname, con.conname, target_table
            FROM pg_constraint con
            JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
            JOIN pg_class ref ON ref.oid = con.confrelid
            JOIN information_schema.columns cols
              ON cols.table_schema = 'public'
              AND cols.table_name = con.conrelid::regclass::text
              AND cols.column_name = att.attname
            WHERE con.contype = 'f'
              AND ref.relname = target_table
              AND cols.data_type = 'text';

            FOR legacy_fk IN SELECT * FROM legacy_auth_fk_migrations LOOP
              EXECUTE format(
                'SELECT EXISTS (SELECT 1 FROM %s WHERE %I IS NOT NULL AND %I !~* %L)',
                legacy_fk.table_name,
                legacy_fk.column_name,
                legacy_fk.column_name,
                '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              )
              INTO has_invalid_ids;

              IF has_invalid_ids THEN
                RAISE EXCEPTION 'Cannot migrate %.% from text to uuid because non-UUID IDs exist',
                  legacy_fk.table_name,
                  legacy_fk.column_name;
              END IF;

              EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', legacy_fk.table_name, legacy_fk.constraint_name);
              EXECUTE format(
                'ALTER TABLE %s ALTER COLUMN %I TYPE uuid USING %I::uuid',
                legacy_fk.table_name,
                legacy_fk.column_name,
                legacy_fk.column_name
              );
            END LOOP;

            EXECUTE format(
              'SELECT EXISTS (SELECT 1 FROM %I WHERE id !~* %L)',
              target_table,
              '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            )
            INTO has_invalid_ids;

            IF has_invalid_ids THEN
              RAISE EXCEPTION 'Cannot migrate %.id from text to uuid because non-UUID IDs exist', target_table;
            END IF;

            EXECUTE format('ALTER TABLE %I ALTER COLUMN id DROP DEFAULT', target_table);
            EXECUTE format('ALTER TABLE %I ALTER COLUMN id TYPE uuid USING id::uuid', target_table);
            EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT gen_random_uuid()', target_table);

            FOR legacy_fk IN SELECT * FROM legacy_auth_fk_migrations LOOP
              EXECUTE format(
                'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(id) ON DELETE RESTRICT',
                legacy_fk.table_name,
                legacy_fk.constraint_name,
                legacy_fk.column_name,
                legacy_fk.referenced_table
              );
            END LOOP;
          END IF;
        END LOOP;
      END;
      $$;

      CREATE TABLE IF NOT EXISTS role_permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tenant_memberships (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      DROP FUNCTION IF EXISTS app.find_user_by_email_for_auth(text);
      CREATE OR REPLACE FUNCTION app.find_user_by_email_for_auth(input_email text)
      RETURNS TABLE (
        id uuid,
        tenant_id text,
        email text,
        password_hash text,
        display_name text,
        status text,
        email_verified_at timestamptz,
        mfa_enabled boolean,
        mfa_verified_at timestamptz,
        created_at timestamptz,
        updated_at timestamptz
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, app, pg_temp
      AS $$
      DECLARE
        request_user_id text;
        request_path text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');

        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Auth user lookup is only available before authentication'
            USING ERRCODE = '42501';
        END IF;

        IF request_path <> '/auth/login' THEN
          RAISE EXCEPTION 'Auth user lookup is only available on login routes'
            USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
        SELECT
          u.id,
          u.tenant_id,
          u.email,
          u.password_hash,
          u.display_name,
          u.status,
          u.email_verified_at,
          u.mfa_enabled,
          u.mfa_verified_at,
          u.created_at,
          u.updated_at
        FROM users u
        WHERE lower(u.email) = lower(input_email)
        LIMIT 1;
      END;
      $$;

      DROP FUNCTION IF EXISTS app.ensure_global_user_for_seed(text, text, text);
      DROP FUNCTION IF EXISTS app.ensure_global_user_for_registration(text, text, text);

      DROP FUNCTION IF EXISTS app.find_active_memberships_by_user_for_auth(uuid);
      CREATE OR REPLACE FUNCTION app.find_active_memberships_by_user_for_auth(input_user_id uuid)
      RETURNS TABLE (
        id uuid,
        tenant_id text,
        user_id uuid,
        role_id uuid,
        role_code text,
        role_name text,
        status text,
        created_at timestamptz,
        updated_at timestamptz
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, app, pg_temp
      AS $$
      DECLARE
        request_user_id text;
        request_path text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');

        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Membership auto-resolution is only available before authentication'
            USING ERRCODE = '42501';
        END IF;

        IF request_path <> '/auth/login' THEN
          RAISE EXCEPTION 'Membership auto-resolution is only available on login routes'
            USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
        SELECT
          tm.id,
          tm.tenant_id,
          tm.user_id,
          tm.role_id,
          r.code AS role_code,
          r.name AS role_name,
          tm.status,
          tm.created_at,
          tm.updated_at
        FROM tenant_memberships tm
        INNER JOIN roles r
          ON r.tenant_id = tm.tenant_id
         AND r.id = tm.role_id
        WHERE tm.user_id = input_user_id
          AND tm.status = 'active'
        ORDER BY tm.created_at DESC;
      END;
      $$;

      DROP FUNCTION IF EXISTS app.find_platform_owner_by_email_for_auth(text);
      CREATE OR REPLACE FUNCTION app.find_platform_owner_by_email_for_auth(input_email text)
      RETURNS TABLE (
        id uuid,
        tenant_id text,
        email text,
        password_hash text,
        display_name text,
        status text,
        email_verified_at timestamptz,
        mfa_enabled boolean,
        mfa_verified_at timestamptz,
        created_at timestamptz,
        updated_at timestamptz
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, app, pg_temp
      AS $$
      DECLARE
        request_user_id text;
        request_path text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');

        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Platform owner lookup is only available before authentication'
            USING ERRCODE = '42501';
        END IF;

        IF request_path <> '/auth/login' THEN
          RAISE EXCEPTION 'Platform owner lookup is only available on login routes'
            USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
        SELECT
          u.id,
          u.tenant_id,
          u.email,
          u.password_hash,
          u.display_name,
          u.status,
          u.email_verified_at,
          u.mfa_enabled,
          u.mfa_verified_at,
          u.created_at,
          u.updated_at
        FROM users u
        WHERE lower(u.email) = lower(input_email)
          AND u.tenant_id = 'global'
          AND u.user_type = 'platform_owner'
        LIMIT 1;
      END;
      $$;

      DROP FUNCTION IF EXISTS app.find_platform_owner_by_id_for_auth(uuid);
      CREATE OR REPLACE FUNCTION app.find_platform_owner_by_id_for_auth(input_user_id uuid)
      RETURNS TABLE (
        id uuid,
        tenant_id text,
        email text,
        password_hash text,
        display_name text,
        status text,
        email_verified_at timestamptz,
        mfa_enabled boolean,
        mfa_verified_at timestamptz,
        created_at timestamptz,
        updated_at timestamptz
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, app, pg_temp
      AS $$
      DECLARE
        request_path text;
      BEGIN
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');

        IF request_path NOT IN ('/auth/refresh', '/auth/me') THEN
          RAISE EXCEPTION 'Platform owner lookup is only available on authenticated auth routes'
            USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
        SELECT
          u.id,
          u.tenant_id,
          u.email,
          u.password_hash,
          u.display_name,
          u.status,
          u.email_verified_at,
          u.mfa_enabled,
          u.mfa_verified_at,
          u.created_at,
          u.updated_at
        FROM users u
        WHERE u.id = input_user_id
          AND u.tenant_id = 'global'
          AND u.user_type = 'platform_owner'
        LIMIT 1;
      END;
      $$;

      DROP FUNCTION IF EXISTS app.create_global_user_from_invitation(text, text, text);
      CREATE OR REPLACE FUNCTION app.create_global_user_from_invitation(
        input_email text,
        input_password_hash text,
        input_display_name text
      )
      RETURNS TABLE (
        id uuid,
        tenant_id text,
        email text,
        password_hash text,
        display_name text,
        status text,
        email_verified_at timestamptz,
        mfa_enabled boolean,
        mfa_verified_at timestamptz,
        created_at timestamptz,
        updated_at timestamptz
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, app, pg_temp
      AS $$
      DECLARE
        request_user_id text;
        request_path text;
        normalized_email text;
        existing_user_id uuid;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        normalized_email := lower(input_email);

        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Invitation account setup is only available before authentication'
            USING ERRCODE = '42501';
        END IF;

        IF request_path <> '/auth/invitations/accept' THEN
          RAISE EXCEPTION 'Invitation account setup is only available through invitation acceptance'
            USING ERRCODE = '42501';
        END IF;

        SELECT u.id
        INTO existing_user_id
        FROM users u
        WHERE lower(u.email) = normalized_email
        LIMIT 1
        FOR UPDATE;

        IF existing_user_id IS NULL THEN
          RETURN QUERY
          INSERT INTO users (tenant_id, email, password_hash, display_name, status, email_verified_at)
          VALUES ('global', normalized_email, input_password_hash, input_display_name, 'active', NOW())
          RETURNING
            users.id,
            users.tenant_id,
            users.email,
            users.password_hash,
            users.display_name,
            users.status,
            users.email_verified_at,
            users.mfa_enabled,
            users.mfa_verified_at,
            users.created_at,
            users.updated_at;
          RETURN;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM users u
          WHERE u.id = existing_user_id
            AND u.tenant_id <> 'global'
        ) THEN
          RAISE EXCEPTION 'Invitation account setup only supports global users'
            USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
        SELECT
          users.id,
          users.tenant_id,
          users.email,
          users.password_hash,
          users.display_name,
          users.status,
          users.email_verified_at,
          users.mfa_enabled,
          users.mfa_verified_at,
          users.created_at,
          users.updated_at
        FROM users
        WHERE users.id = existing_user_id
        LIMIT 1
        FOR UPDATE;
      END;
      $$;

      CREATE OR REPLACE FUNCTION app.find_user_for_password_recovery(
        input_email text,
        input_audience text,
        input_tenant_id text,
        input_system_owner_email text
      )
      RETURNS TABLE (
        id uuid,
        tenant_id text,
        email text,
        display_name text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, app, pg_temp
      AS $$
      DECLARE
        request_user_id text;
        request_path text;
        normalized_email text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        normalized_email := lower(input_email);

        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Password recovery is only available before authentication'
            USING ERRCODE = '42501';
        END IF;

        IF request_path NOT LIKE '%/auth/password-recovery/request%' THEN
          RAISE EXCEPTION 'Password recovery lookup is only available on recovery routes'
            USING ERRCODE = '42501';
        END IF;

        IF input_audience = 'superadmin' THEN
          IF input_system_owner_email IS NULL
            OR length(input_system_owner_email) = 0
            OR normalized_email <> lower(input_system_owner_email)
          THEN
            RETURN;
          END IF;

          RETURN QUERY
          SELECT u.id, u.tenant_id, u.email, u.display_name
          FROM users u
          WHERE lower(u.email) = normalized_email
            AND u.tenant_id = 'global'
            AND u.user_type = 'platform_owner'
            AND u.status = 'active'
          LIMIT 1;
          RETURN;
        END IF;

        IF input_tenant_id IS NOT NULL AND length(input_tenant_id) > 0 THEN
          RETURN QUERY
          SELECT u.id, u.tenant_id, u.email, u.display_name
          FROM users u
          WHERE lower(u.email) = normalized_email
            AND u.tenant_id = input_tenant_id
            AND u.status = 'active'
          LIMIT 1;

          IF FOUND THEN
            RETURN;
          END IF;
        END IF;

        RETURN QUERY
        WITH matching_recovery_users AS (
          SELECT u.id, u.tenant_id, u.email, u.display_name
          FROM users u
          WHERE lower(u.email) = normalized_email
            AND u.tenant_id <> 'global'
            AND u.status = 'active'
        )
        SELECT
          matching_recovery_users.id,
          matching_recovery_users.tenant_id,
          matching_recovery_users.email,
          matching_recovery_users.display_name
        FROM matching_recovery_users
        WHERE (SELECT count(*) FROM matching_recovery_users) = 1
        LIMIT 1;
      END;
      $$;

      CREATE OR REPLACE FUNCTION app.create_password_recovery_action(
        input_tenant_id text,
        input_user_id uuid,
        input_email text,
        input_token_hash text,
        input_expires_at timestamptz,
        input_subject text,
        input_payload jsonb
      )
      RETURNS TABLE (
        token_id uuid,
        outbox_id uuid
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, app, pg_temp
      AS $$
      DECLARE
        request_user_id text;
        request_path text;
        created_token_id uuid;
        created_outbox_id uuid;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');

        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Password recovery is only available before authentication'
            USING ERRCODE = '42501';
        END IF;

        IF request_path NOT LIKE '%/auth/password-recovery/request%' THEN
          RAISE EXCEPTION 'Password recovery tokens are only issued on recovery routes'
            USING ERRCODE = '42501';
        END IF;

        PERFORM set_config('app.auth_action_token_operation', 'password_recovery_create', true);
        PERFORM set_config('app.auth_email_outbox_operation', 'password_recovery_create', true);

        UPDATE auth_action_tokens
        SET consumed_at = NOW()
        WHERE user_id = input_user_id
          AND purpose = 'password_recovery'
          AND consumed_at IS NULL;

        INSERT INTO auth_action_tokens (
          tenant_id,
          user_id,
          email,
          purpose,
          token_hash,
          metadata,
          expires_at
        )
        VALUES (
          input_tenant_id,
          input_user_id,
          lower(input_email),
          'password_recovery',
          input_token_hash,
          input_payload,
          input_expires_at
        )
        RETURNING id INTO created_token_id;

        INSERT INTO auth_email_outbox (
          tenant_id,
          user_id,
          recipient_email,
          template,
          subject,
          payload,
          status
        )
        VALUES (
          input_tenant_id,
          input_user_id,
          lower(input_email),
          'password_recovery',
          input_subject,
          input_payload,
          'pending'
        )
        RETURNING id INTO created_outbox_id;

        RETURN QUERY SELECT created_token_id, created_outbox_id;
        PERFORM set_config('app.auth_action_token_operation', '', true);
        PERFORM set_config('app.auth_email_outbox_operation', '', true);
      END;
      $$;

      CREATE OR REPLACE FUNCTION app.create_email_verification_action(
        input_tenant_id text,
        input_user_id uuid,
        input_email text,
        input_token_hash text,
        input_expires_at timestamptz,
        input_subject text,
        input_payload jsonb
      )
      RETURNS TABLE (
        token_id uuid,
        outbox_id uuid
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, app, pg_temp
      AS $$
      DECLARE
        request_user_id text;
        request_path text;
        created_token_id uuid;
        created_outbox_id uuid;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');

        IF request_user_id = 'anonymous' OR request_user_id <> input_user_id::text THEN
          RAISE EXCEPTION 'Email verification can only be requested by the current user'
            USING ERRCODE = '42501';
        END IF;

        IF request_path NOT LIKE '%/auth/email-verification/request%' THEN
          RAISE EXCEPTION 'Email verification tokens are only issued on verification routes'
            USING ERRCODE = '42501';
        END IF;

        PERFORM set_config('app.auth_action_token_operation', 'email_verification_create', true);
        PERFORM set_config('app.auth_email_outbox_operation', 'email_verification_create', true);

        UPDATE auth_action_tokens
        SET consumed_at = NOW()
        WHERE user_id = input_user_id
          AND purpose = 'email_verification'
          AND consumed_at IS NULL;

        INSERT INTO auth_action_tokens (
          tenant_id,
          user_id,
          email,
          purpose,
          token_hash,
          metadata,
          expires_at
        )
        VALUES (
          input_tenant_id,
          input_user_id,
          lower(input_email),
          'email_verification',
          input_token_hash,
          input_payload,
          input_expires_at
        )
        RETURNING id INTO created_token_id;

        INSERT INTO auth_email_outbox (
          tenant_id,
          user_id,
          recipient_email,
          template,
          subject,
          payload,
          status
        )
        VALUES (
          input_tenant_id,
          input_user_id,
          lower(input_email),
          'email_verification',
          input_subject,
          input_payload,
          'pending'
        )
        RETURNING id INTO created_outbox_id;

        RETURN QUERY SELECT created_token_id, created_outbox_id;
        PERFORM set_config('app.auth_action_token_operation', '', true);
        PERFORM set_config('app.auth_email_outbox_operation', '', true);
      END;
      $$;

      DROP FUNCTION IF EXISTS app.mark_auth_email_outbox_delivery(uuid, text);
      DROP FUNCTION IF EXISTS app.mark_auth_email_outbox_delivery(text, text);
      CREATE OR REPLACE FUNCTION app.mark_auth_email_outbox_delivery(
        input_outbox_id uuid,
        input_status text,
        input_error_code text DEFAULT NULL,
        input_error_summary text DEFAULT NULL,
        input_provider_status_code integer DEFAULT NULL
      )
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, app, pg_temp
      AS $$
      DECLARE
        request_path text;
      BEGIN
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');

        IF request_path NOT LIKE '%/auth/password-recovery/request%'
          AND request_path NOT LIKE '%/auth/email-verification/request%'
          AND request_path NOT LIKE '%/auth/invitations%'
          AND request_path NOT LIKE '%/platform/schools%'
        THEN
          RAISE EXCEPTION 'Email outbox delivery status can only be updated by auth email routes'
            USING ERRCODE = '42501';
        END IF;

        IF input_status NOT IN ('sent', 'failed') THEN
          RAISE EXCEPTION 'Unsupported email outbox status'
            USING ERRCODE = '22023';
        END IF;

        IF input_provider_status_code IS NOT NULL
          AND (input_provider_status_code < 100 OR input_provider_status_code > 599)
        THEN
          RAISE EXCEPTION 'Unsupported email provider status code'
            USING ERRCODE = '22023';
        END IF;

        PERFORM set_config('app.auth_email_outbox_operation', 'mark_delivery', true);

        UPDATE auth_email_outbox
        SET
          status = input_status,
          attempts = attempts + 1,
          sent_at = CASE WHEN input_status = 'sent' THEN NOW() ELSE sent_at END,
          last_error_code = CASE
            WHEN input_status = 'sent' THEN NULL
            ELSE NULLIF(input_error_code, '')
          END,
          last_error_summary = CASE
            WHEN input_status = 'sent' THEN NULL
            ELSE NULLIF(input_error_summary, '')
          END,
          provider_status_code = CASE
            WHEN input_status = 'sent' THEN NULL
            ELSE input_provider_status_code
          END,
          last_attempt_at = NOW(),
          next_attempt_at = CASE
            WHEN input_status = 'failed' THEN NOW() + INTERVAL '10 minutes'
            ELSE next_attempt_at
          END
        WHERE id = input_outbox_id;

        PERFORM set_config('app.auth_email_outbox_operation', '', true);
      END;
      $$;

      CREATE OR REPLACE FUNCTION app.consume_password_recovery_action(
        input_token_hash text,
        input_password_hash text
      )
      RETURNS TABLE (
        user_id uuid,
        email text,
        tenant_id text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, app, pg_temp
      AS $$
      DECLARE
        request_user_id text;
        request_path text;
        token_id uuid;
        token_user_id uuid;
        token_email text;
        token_tenant_id text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');

        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Password reset is only available before authentication'
            USING ERRCODE = '42501';
        END IF;

        IF request_path NOT LIKE '%/auth/password-recovery/reset%' THEN
          RAISE EXCEPTION 'Password reset tokens are only consumed on reset routes'
            USING ERRCODE = '42501';
        END IF;

        PERFORM set_config('app.auth_action_token_operation', 'password_recovery_consume', true);

        SELECT token.id, token.user_id, token.email, token.tenant_id
        INTO token_id, token_user_id, token_email, token_tenant_id
        FROM auth_action_tokens token
        WHERE token.token_hash = input_token_hash
          AND token.purpose = 'password_recovery'
          AND token.consumed_at IS NULL
          AND token.expires_at > NOW()
        LIMIT 1
        FOR UPDATE;

        IF token_id IS NULL THEN
          RAISE EXCEPTION 'Invalid or expired recovery token'
            USING ERRCODE = '28000';
        END IF;

        UPDATE users
        SET
          password_hash = input_password_hash,
          password_changed_at = NOW(),
          updated_at = NOW()
        WHERE id = token_user_id
          AND status = 'active';

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Invalid or expired recovery token'
            USING ERRCODE = '28000';
        END IF;

        UPDATE auth_action_tokens
        SET consumed_at = NOW()
        WHERE id = token_id;

        RETURN QUERY
        SELECT token_user_id, token_email, token_tenant_id;
        PERFORM set_config('app.auth_action_token_operation', '', true);
      END;
      $$;

      CREATE OR REPLACE FUNCTION app.consume_email_verification_action(
        input_token_hash text
      )
      RETURNS TABLE (
        user_id uuid,
        email text,
        tenant_id text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, app, pg_temp
      AS $$
      DECLARE
        request_user_id text;
        request_path text;
        token_id uuid;
        token_user_id uuid;
        token_email text;
        token_tenant_id text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');

        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Email verification is only available before authentication'
            USING ERRCODE = '42501';
        END IF;

        IF request_path NOT LIKE '%/auth/email-verification/verify%' THEN
          RAISE EXCEPTION 'Email verification tokens are only consumed on verification routes'
            USING ERRCODE = '42501';
        END IF;

        PERFORM set_config('app.auth_action_token_operation', 'email_verification_consume', true);

        SELECT token.id, token.user_id, token.email, token.tenant_id
        INTO token_id, token_user_id, token_email, token_tenant_id
        FROM auth_action_tokens token
        WHERE token.token_hash = input_token_hash
          AND token.purpose = 'email_verification'
          AND token.consumed_at IS NULL
          AND token.expires_at > NOW()
        LIMIT 1
        FOR UPDATE;

        IF token_id IS NULL THEN
          RAISE EXCEPTION 'Invalid or expired email verification token'
            USING ERRCODE = '28000';
        END IF;

        UPDATE users
        SET
          email_verified_at = COALESCE(email_verified_at, NOW()),
          updated_at = NOW()
        WHERE id = token_user_id
          AND lower(email) = lower(token_email)
          AND status = 'active';

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Invalid or expired email verification token'
            USING ERRCODE = '28000';
        END IF;

        UPDATE auth_action_tokens
        SET consumed_at = NOW()
        WHERE id = token_id;

        RETURN QUERY
        SELECT token_user_id, token_email, token_tenant_id;
        PERFORM set_config('app.auth_action_token_operation', '', true);
      END;
      $$;

      DROP FUNCTION IF EXISTS app.consume_invite_acceptance_action(text, text, text);
      DROP FUNCTION IF EXISTS app.consume_invite_acceptance_action(text, text, text, text);
      CREATE OR REPLACE FUNCTION app.consume_invite_acceptance_action(
        input_token_hash text,
        input_password_hash text,
        input_display_name text,
        input_expected_tenant_id text DEFAULT NULL
      )
      RETURNS TABLE (
        user_id uuid,
        tenant_id text,
        email text,
        display_name text,
        role_code text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, app, pg_temp
      AS $$
      #variable_conflict use_column
      DECLARE
        request_user_id text;
        request_path text;
        token_id uuid;
        invite_tenant_id text;
        invite_email text;
        invite_metadata jsonb;
        invite_role_code text;
        invite_display_name text;
        invited_user_id uuid;
        invited_role_id uuid;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');

        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Invitation acceptance is only available before authentication'
            USING ERRCODE = '42501';
        END IF;

        IF request_path NOT LIKE '%/auth/invitations/accept%' THEN
          RAISE EXCEPTION 'Invitation tokens are only consumed on invitation acceptance routes'
            USING ERRCODE = '42501';
        END IF;

        PERFORM set_config('app.auth_action_token_operation', 'invite_acceptance_consume', true);

        SELECT token.id, token.tenant_id, token.email, token.metadata
        INTO token_id, invite_tenant_id, invite_email, invite_metadata
        FROM auth_action_tokens token
        WHERE token.token_hash = input_token_hash
          AND token.purpose = 'invite_acceptance'
          AND token.consumed_at IS NULL
          AND token.expires_at > NOW()
        LIMIT 1
        FOR UPDATE;

        IF token_id IS NULL THEN
          RAISE EXCEPTION 'Invalid or expired invitation token'
            USING ERRCODE = '28000';
        END IF;

        IF invite_tenant_id IS NULL OR length(invite_tenant_id) = 0 THEN
          RAISE EXCEPTION 'Invitation tenant is missing'
            USING ERRCODE = '22023';
        END IF;

        IF NULLIF(input_expected_tenant_id, '') IS NOT NULL
          AND NULLIF(input_expected_tenant_id, '') <> invite_tenant_id THEN
          RAISE EXCEPTION 'Invitation tenant mismatch'
            USING ERRCODE = '28000';
        END IF;

        invite_role_code := COALESCE(NULLIF(invite_metadata ->> 'role_code', ''), 'member');
        invite_display_name := COALESCE(
          NULLIF(input_display_name, ''),
          NULLIF(invite_metadata ->> 'display_name', ''),
          split_part(invite_email, '@', 1)
        );

        SELECT r.id
        INTO invited_role_id
        FROM roles r
        WHERE r.tenant_id = invite_tenant_id
          AND r.code = invite_role_code
        LIMIT 1;

        IF invited_role_id IS NULL THEN
          RAISE EXCEPTION 'Invitation role is not available'
            USING ERRCODE = '22023';
        END IF;

        SELECT u.id
        INTO invited_user_id
        FROM users u
        WHERE lower(u.email) = lower(invite_email)
        LIMIT 1
        FOR UPDATE;

        IF invited_user_id IS NULL THEN
          INSERT INTO users (
            tenant_id,
            email,
            password_hash,
            display_name,
            status,
            email_verified_at,
            password_changed_at
          )
          VALUES (
            invite_tenant_id,
            lower(invite_email),
            input_password_hash,
            invite_display_name,
            'active',
            NOW(),
            NOW()
          )
          RETURNING id INTO invited_user_id;
        ELSE
          UPDATE users
          SET
            password_hash = input_password_hash,
            display_name = invite_display_name,
            status = 'active',
            email_verified_at = COALESCE(email_verified_at, NOW()),
            password_changed_at = NOW(),
            updated_at = NOW()
          WHERE id = invited_user_id;
        END IF;

        INSERT INTO tenant_memberships (tenant_id, user_id, role_id, status)
        VALUES (invite_tenant_id, invited_user_id, invited_role_id, 'active')
        ON CONFLICT (tenant_id, user_id)
        DO UPDATE SET
          role_id = EXCLUDED.role_id,
          status = 'active',
          updated_at = NOW();

        IF invite_role_code = 'parent' THEN
          UPDATE student_guardians
          SET
            user_id = invited_user_id,
            status = 'active',
            accepted_at = COALESCE(accepted_at, NOW()),
            updated_at = NOW()
          WHERE tenant_id = invite_tenant_id
            AND lower(email) = lower(invite_email)
            AND (user_id IS NULL OR user_id = invited_user_id)
            AND status IN ('invited', 'active');
        END IF;

        UPDATE auth_action_tokens
        SET
          consumed_at = NOW(),
          user_id = invited_user_id,
          metadata = auth_action_tokens.metadata || jsonb_build_object(
            'status', 'accepted',
            'accepted_at', NOW(),
            'accepted_by_user_id', invited_user_id,
            'accepted_role_code', invite_role_code
          )
        WHERE id = token_id;

        RETURN QUERY
        SELECT
          invited_user_id,
          invite_tenant_id,
          lower(invite_email),
          invite_display_name,
          invite_role_code;
        PERFORM set_config('app.auth_action_token_operation', '', true);
      END;
      $$;

      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL DEFAULT 'global',
        email text NOT NULL,
        password_hash text NOT NULL,
        display_name text NOT NULL,
        user_type text NOT NULL DEFAULT 'member' CHECK (user_type IN ('member', 'platform_owner')),
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'locked')),
        email_verified_at timestamptz,
        recovery_email text,
        mfa_enabled boolean NOT NULL DEFAULT FALSE,
        mfa_verified_at timestamptz,
        password_changed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      DO $$
      DECLARE
        legacy_fk record;
        has_invalid_ids boolean;
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'id'
            AND data_type = 'text'
        ) THEN
          CREATE TEMP TABLE IF NOT EXISTS legacy_user_fk_migrations (
            table_name text NOT NULL,
            column_name text NOT NULL,
            constraint_name text NOT NULL
          ) ON COMMIT DROP;
          TRUNCATE legacy_user_fk_migrations;

          INSERT INTO legacy_user_fk_migrations (table_name, column_name, constraint_name)
          SELECT con.conrelid::regclass::text, att.attname, con.conname
          FROM pg_constraint con
          JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
          JOIN pg_class ref ON ref.oid = con.confrelid
          JOIN information_schema.columns cols
            ON cols.table_schema = 'public'
            AND cols.table_name = con.conrelid::regclass::text
            AND cols.column_name = att.attname
          WHERE con.contype = 'f'
            AND ref.relname = 'users'
            AND cols.data_type = 'text';

          FOR legacy_fk IN SELECT * FROM legacy_user_fk_migrations LOOP
            EXECUTE format(
              'SELECT EXISTS (SELECT 1 FROM %s WHERE %I IS NOT NULL AND %I !~* %L)',
              legacy_fk.table_name,
              legacy_fk.column_name,
              legacy_fk.column_name,
              '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            )
            INTO has_invalid_ids;

            IF has_invalid_ids THEN
              RAISE EXCEPTION 'Cannot migrate %.% from text to uuid because non-UUID user IDs exist',
                legacy_fk.table_name,
                legacy_fk.column_name;
            END IF;

            EXECUTE format(
              'ALTER TABLE %s DROP CONSTRAINT %I',
              legacy_fk.table_name,
              legacy_fk.constraint_name
            );
            EXECUTE format(
              'ALTER TABLE %s ALTER COLUMN %I TYPE uuid USING %I::uuid',
              legacy_fk.table_name,
              legacy_fk.column_name,
              legacy_fk.column_name
            );
          END LOOP;

          IF EXISTS (
            SELECT 1
            FROM users
            WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          ) THEN
            RAISE EXCEPTION 'Cannot migrate users.id from text to uuid because non-UUID user IDs exist';
          END IF;

          ALTER TABLE users ALTER COLUMN id DROP DEFAULT;
          ALTER TABLE users ALTER COLUMN id TYPE uuid USING id::uuid;
          ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();

          FOR legacy_fk IN SELECT * FROM legacy_user_fk_migrations LOOP
            EXECUTE format(
              'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES users(id) ON DELETE RESTRICT',
              legacy_fk.table_name,
              legacy_fk.constraint_name,
              legacy_fk.column_name
            );
          END LOOP;
        END IF;
      END;
      $$;

      ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'global';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'member';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_email text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_verified_at timestamptz;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'full_name'
        ) THEN
          UPDATE users
          SET display_name = COALESCE(NULLIF(display_name, ''), NULLIF(full_name, ''), NULLIF(email, ''), 'User')
          WHERE display_name IS NULL OR display_name = '';
        ELSE
          UPDATE users
          SET display_name = COALESCE(NULLIF(display_name, ''), NULLIF(email, ''), 'User')
          WHERE display_name IS NULL OR display_name = '';
        END IF;

        ALTER TABLE users ALTER COLUMN display_name SET NOT NULL;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_users_user_type'
        ) THEN
          ALTER TABLE users
          ADD CONSTRAINT ck_users_user_type
          CHECK (user_type IN ('member', 'platform_owner'));
        END IF;
      END;
      $$;

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'status'
            AND data_type = 'USER-DEFINED'
        ) THEN
          ALTER TABLE users ALTER COLUMN status DROP DEFAULT;
          ALTER TABLE users ALTER COLUMN status TYPE text USING
            CASE lower(status::text)
              WHEN 'active' THEN 'active'
              WHEN 'disabled' THEN 'disabled'
              WHEN 'locked' THEN 'locked'
              WHEN 'invited' THEN 'disabled'
              WHEN 'suspended' THEN 'disabled'
              ELSE 'disabled'
            END;
        END IF;

        UPDATE users
        SET status = CASE lower(status)
          WHEN 'active' THEN 'active'
          WHEN 'disabled' THEN 'disabled'
          WHEN 'locked' THEN 'locked'
          WHEN 'invited' THEN 'disabled'
          WHEN 'suspended' THEN 'disabled'
          ELSE 'disabled'
        END
        WHERE status IS NULL
          OR status <> lower(status)
          OR lower(status) NOT IN ('active', 'disabled', 'locked');

        ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active';
        ALTER TABLE users ALTER COLUMN status SET NOT NULL;
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
        ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_status;
        ALTER TABLE users ADD CONSTRAINT ck_users_status CHECK (status IN ('active', 'disabled', 'locked'));
      END;
      $$;

      CREATE TABLE IF NOT EXISTS roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        code text NOT NULL,
        name text NOT NULL,
        description text,
        is_system boolean NOT NULL DEFAULT FALSE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        code text,
        module text,
        resource text NOT NULL,
        action text NOT NULL,
        scope text NOT NULL DEFAULT 'tenant',
        key text,
        description text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE roles ADD COLUMN IF NOT EXISTS tenant_id text;
      ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT FALSE;
      ALTER TABLE permissions ADD COLUMN IF NOT EXISTS tenant_id text;
      ALTER TABLE permissions ADD COLUMN IF NOT EXISTS code text;
      ALTER TABLE permissions ADD COLUMN IF NOT EXISTS module text;
      ALTER TABLE permissions ADD COLUMN IF NOT EXISTS scope text DEFAULT 'tenant';
      ALTER TABLE permissions ADD COLUMN IF NOT EXISTS key text;

      DO $$
      BEGIN
        IF to_regclass('public.role_permissions') IS NOT NULL THEN
          ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS tenant_id text;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'roles'
            AND column_name = 'school_id'
        ) THEN
          UPDATE roles SET tenant_id = COALESCE(tenant_id, school_id, 'global') WHERE tenant_id IS NULL OR tenant_id = '';
        ELSE
          UPDATE roles SET tenant_id = COALESCE(tenant_id, 'global') WHERE tenant_id IS NULL OR tenant_id = '';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'roles'
            AND column_name = 'is_system_role'
        ) THEN
          UPDATE roles SET is_system = COALESCE(is_system, is_system_role, FALSE);
        END IF;

        UPDATE permissions
        SET tenant_id = COALESCE(tenant_id, 'global'),
            module = COALESCE(NULLIF(btrim(module), ''), resource),
            scope = COALESCE(NULLIF(btrim(scope), ''), 'tenant'),
            key = COALESCE(
              NULLIF(btrim(key), ''),
              lower(
                COALESCE(tenant_id, 'global') || '.' ||
                regexp_replace(resource, '[^a-zA-Z0-9]+', '_', 'g') || '.' ||
                regexp_replace(action, '[^a-zA-Z0-9]+', '_', 'g') || '.tenant'
              )
            ),
            code = COALESCE(
              NULLIF(btrim(code), ''),
              upper(
                regexp_replace(COALESCE(tenant_id, 'global'), '[^a-zA-Z0-9]+', '_', 'g') || '_' ||
                regexp_replace(resource, '[^a-zA-Z0-9]+', '_', 'g') || '_' ||
                regexp_replace(action, '[^a-zA-Z0-9]+', '_', 'g')
              )
            )
        WHERE tenant_id IS NULL
           OR tenant_id = ''
           OR module IS NULL
           OR btrim(module) = ''
           OR scope IS NULL
           OR btrim(scope) = ''
           OR key IS NULL
           OR btrim(key) = ''
           OR code IS NULL
           OR btrim(code) = '';

        IF to_regclass('public.role_permissions') IS NOT NULL THEN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'role_permissions'
              AND column_name = 'school_id'
          ) THEN
            UPDATE role_permissions SET tenant_id = COALESCE(tenant_id, school_id, 'global') WHERE tenant_id IS NULL OR tenant_id = '';
          ELSE
            UPDATE role_permissions SET tenant_id = COALESCE(tenant_id, 'global') WHERE tenant_id IS NULL OR tenant_id = '';
          END IF;

          ALTER TABLE role_permissions ALTER COLUMN tenant_id SET NOT NULL;
        END IF;

        ALTER TABLE roles ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE permissions ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE permissions ALTER COLUMN code SET NOT NULL;
        ALTER TABLE permissions ALTER COLUMN module SET NOT NULL;
        ALTER TABLE permissions ALTER COLUMN scope SET NOT NULL;
        ALTER TABLE permissions ALTER COLUMN key SET NOT NULL;
      END;
      $$;

      DO $$
      DECLARE
        target_table text;
        legacy_fk record;
        has_invalid_ids boolean;
      BEGIN
        FOREACH target_table IN ARRAY ARRAY['roles', 'permissions'] LOOP
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = target_table
              AND column_name = 'id'
              AND data_type = 'text'
          ) THEN
            CREATE TEMP TABLE IF NOT EXISTS legacy_auth_fk_migrations (
              table_name text NOT NULL,
              column_name text NOT NULL,
              constraint_name text NOT NULL,
              referenced_table text NOT NULL
            ) ON COMMIT DROP;
            TRUNCATE legacy_auth_fk_migrations;

            INSERT INTO legacy_auth_fk_migrations (table_name, column_name, constraint_name, referenced_table)
            SELECT con.conrelid::regclass::text, att.attname, con.conname, target_table
            FROM pg_constraint con
            JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
            JOIN pg_class ref ON ref.oid = con.confrelid
            JOIN information_schema.columns cols
              ON cols.table_schema = 'public'
              AND cols.table_name = con.conrelid::regclass::text
              AND cols.column_name = att.attname
            WHERE con.contype = 'f'
              AND ref.relname = target_table
              AND cols.data_type = 'text';

            FOR legacy_fk IN SELECT * FROM legacy_auth_fk_migrations LOOP
              EXECUTE format(
                'SELECT EXISTS (SELECT 1 FROM %s WHERE %I IS NOT NULL AND %I !~* %L)',
                legacy_fk.table_name,
                legacy_fk.column_name,
                legacy_fk.column_name,
                '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              )
              INTO has_invalid_ids;

              IF has_invalid_ids THEN
                RAISE EXCEPTION 'Cannot migrate %.% from text to uuid because non-UUID IDs exist',
                  legacy_fk.table_name,
                  legacy_fk.column_name;
              END IF;

              EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', legacy_fk.table_name, legacy_fk.constraint_name);
              EXECUTE format(
                'ALTER TABLE %s ALTER COLUMN %I TYPE uuid USING %I::uuid',
                legacy_fk.table_name,
                legacy_fk.column_name,
                legacy_fk.column_name
              );
            END LOOP;

            EXECUTE format(
              'SELECT EXISTS (SELECT 1 FROM %I WHERE id !~* %L)',
              target_table,
              '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            )
            INTO has_invalid_ids;

            IF has_invalid_ids THEN
              RAISE EXCEPTION 'Cannot migrate %.id from text to uuid because non-UUID IDs exist', target_table;
            END IF;

            EXECUTE format('ALTER TABLE %I ALTER COLUMN id DROP DEFAULT', target_table);
            EXECUTE format('ALTER TABLE %I ALTER COLUMN id TYPE uuid USING id::uuid', target_table);
            EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT gen_random_uuid()', target_table);

            FOR legacy_fk IN SELECT * FROM legacy_auth_fk_migrations LOOP
              EXECUTE format(
                'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(id) ON DELETE RESTRICT',
                legacy_fk.table_name,
                legacy_fk.constraint_name,
                legacy_fk.column_name,
                legacy_fk.referenced_table
              );
            END LOOP;
          END IF;
        END LOOP;
      END;
      $$;

      CREATE TABLE IF NOT EXISTS role_permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tenant_memberships (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS auth_action_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text,
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        email text NOT NULL,
        purpose text NOT NULL CHECK (
          purpose IN (
            'invite_acceptance',
            'password_recovery',
            'email_verification',
            'magic_login',
            'mfa_verification',
            'device_verification',
            'account_activation'
          )
        ),
        token_hash text NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        expires_at timestamptz NOT NULL,
        consumed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE auth_action_tokens ADD COLUMN IF NOT EXISTS consumed_at timestamptz;
      ALTER TABLE auth_action_tokens ALTER COLUMN user_id DROP NOT NULL;
      ALTER TABLE auth_action_tokens ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
      ALTER TABLE auth_action_tokens ALTER COLUMN metadata SET NOT NULL;
      ALTER TABLE auth_action_tokens ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE auth_action_tokens ALTER COLUMN updated_at SET DEFAULT NOW();

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'auth_action_tokens'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE auth_action_tokens ALTER COLUMN tenant_id DROP NOT NULL;
          ALTER TABLE auth_action_tokens ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;
      END;
      $$;

      CREATE TABLE IF NOT EXISTS auth_email_outbox (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text,
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        recipient_email text NOT NULL,
        template text NOT NULL CHECK (
          template IN (
            'invite_acceptance',
            'password_recovery',
            'email_verification',
            'mfa_verification',
            'login_alert',
            'suspicious_login_alert',
            'school_invitation',
            'account_activation'
          )
        ),
        subject text NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
        attempts integer NOT NULL DEFAULT 0,
        next_attempt_at timestamptz NOT NULL DEFAULT NOW(),
        sent_at timestamptz,
        last_error_code text,
        last_error_summary text,
        provider_status_code integer CHECK (provider_status_code IS NULL OR provider_status_code BETWEEN 100 AND 599),
        last_attempt_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE auth_email_outbox
        ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS sent_at timestamptz,
        ADD COLUMN IF NOT EXISTS last_error_code text,
        ADD COLUMN IF NOT EXISTS last_error_summary text,
        ADD COLUMN IF NOT EXISTS provider_status_code integer,
        ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

      ALTER TABLE auth_email_outbox ALTER COLUMN status SET DEFAULT 'pending';
      ALTER TABLE auth_email_outbox ALTER COLUMN payload SET DEFAULT '{}'::jsonb;
      ALTER TABLE auth_email_outbox ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE auth_email_outbox ALTER COLUMN updated_at SET DEFAULT NOW();
      ALTER TABLE auth_email_outbox ALTER COLUMN user_id DROP NOT NULL;

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'auth_email_outbox'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE auth_email_outbox ALTER COLUMN tenant_id DROP NOT NULL;
          ALTER TABLE auth_email_outbox ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_auth_email_outbox_attempts'
        ) THEN
          ALTER TABLE auth_email_outbox
            ADD CONSTRAINT ck_auth_email_outbox_attempts
            CHECK (attempts >= 0);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_auth_email_outbox_provider_status_code'
        ) THEN
          ALTER TABLE auth_email_outbox
            ADD CONSTRAINT ck_auth_email_outbox_provider_status_code
            CHECK (provider_status_code IS NULL OR provider_status_code BETWEEN 100 AND 599);
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS auth_mfa_challenges (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash text NOT NULL,
        purpose text NOT NULL DEFAULT 'login' CHECK (purpose IN ('login', 'step_up')),
        expires_at timestamptz NOT NULL,
        consumed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS auth_trusted_devices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_token_hash text NOT NULL,
        user_agent text,
        ip_address text,
        expires_at timestamptz NOT NULL,
        trusted_at timestamptz NOT NULL DEFAULT NOW(),
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_auth_trusted_devices_user_token UNIQUE (user_id, device_token_hash)
      );

      CREATE TABLE IF NOT EXISTS monitoring_service_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        token_hash text NOT NULL,
        permissions text[] NOT NULL DEFAULT ARRAY['monitor:read'],
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
        expires_at timestamptz NOT NULL,
        last_used_at timestamptz,
        created_by uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS monitoring_service_account_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        account_id uuid,
        action text NOT NULL CHECK (action IN ('created', 'rotated', 'revoked', 'validation_failed')),
        actor_user_id text,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email ON users (lower(email));
      CREATE UNIQUE INDEX IF NOT EXISTS ux_users_single_platform_owner
        ON users ((user_type))
        WHERE user_type = 'platform_owner' AND status = 'active';
      CREATE INDEX IF NOT EXISTS ix_users_tenant_id ON users (tenant_id);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_roles_tenant_code ON roles (tenant_id, code);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_permissions_tenant_resource_action ON permissions (tenant_id, resource, action);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_role_permissions_tenant_role_permission ON role_permissions (tenant_id, role_id, permission_id);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_memberships_tenant_user ON tenant_memberships (tenant_id, user_id);
      CREATE INDEX IF NOT EXISTS ix_tenant_memberships_user_id ON tenant_memberships (user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_auth_action_tokens_hash ON auth_action_tokens (token_hash);
      CREATE INDEX IF NOT EXISTS ix_auth_action_tokens_tenant_email ON auth_action_tokens (tenant_id, lower(email), purpose);
      CREATE INDEX IF NOT EXISTS ix_auth_action_tokens_tenant_invites
        ON auth_action_tokens (tenant_id, purpose, consumed_at, expires_at, created_at DESC)
        WHERE purpose = 'invite_acceptance';
      CREATE INDEX IF NOT EXISTS ix_auth_email_outbox_status ON auth_email_outbox (status, next_attempt_at);
      CREATE INDEX IF NOT EXISTS ix_auth_mfa_challenges_user_active
        ON auth_mfa_challenges (user_id, expires_at)
        WHERE consumed_at IS NULL;
      CREATE INDEX IF NOT EXISTS ix_auth_trusted_devices_user_active
        ON auth_trusted_devices (user_id, expires_at)
        WHERE revoked_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_monitoring_service_accounts_token_hash
        ON monitoring_service_accounts (token_hash);
      CREATE INDEX IF NOT EXISTS ix_monitoring_service_accounts_tenant_status
        ON monitoring_service_accounts (tenant_id, status);
      CREATE INDEX IF NOT EXISTS ix_monitoring_service_accounts_expires_at
        ON monitoring_service_accounts (expires_at);
      CREATE INDEX IF NOT EXISTS ix_monitoring_service_account_audit_logs_tenant_created
        ON monitoring_service_account_audit_logs (tenant_id, created_at DESC);

      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE users FORCE ROW LEVEL SECURITY;
      ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE roles FORCE ROW LEVEL SECURITY;
      ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE permissions FORCE ROW LEVEL SECURITY;
      ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;
      ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tenant_memberships FORCE ROW LEVEL SECURITY;
      ALTER TABLE auth_action_tokens ENABLE ROW LEVEL SECURITY;
      ALTER TABLE auth_action_tokens FORCE ROW LEVEL SECURITY;
      ALTER TABLE auth_email_outbox ENABLE ROW LEVEL SECURITY;
      ALTER TABLE auth_email_outbox FORCE ROW LEVEL SECURITY;
      ALTER TABLE auth_mfa_challenges ENABLE ROW LEVEL SECURITY;
      ALTER TABLE auth_mfa_challenges FORCE ROW LEVEL SECURITY;
      ALTER TABLE auth_trusted_devices ENABLE ROW LEVEL SECURITY;
      ALTER TABLE auth_trusted_devices FORCE ROW LEVEL SECURITY;
      ALTER TABLE monitoring_service_accounts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE monitoring_service_accounts FORCE ROW LEVEL SECURITY;
      ALTER TABLE monitoring_service_account_audit_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE monitoring_service_account_audit_logs FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS users_rls_policy ON users;
      DROP POLICY IF EXISTS users_select_policy ON users;
      DROP POLICY IF EXISTS users_insert_policy ON users;
      DROP POLICY IF EXISTS users_update_policy ON users;
      DROP POLICY IF EXISTS users_delete_policy ON users;
      CREATE POLICY users_select_policy ON users
      FOR SELECT
      USING (
        (
          tenant_id = 'global'
          AND id::text = NULLIF(current_setting('app.user_id', true), '')
        )
        OR tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR (
          COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous') = 'anonymous'
          AND COALESCE(NULLIF(current_setting('app.path', true), ''), '') LIKE '%/auth/invitations/accept%'
        )
        OR (
          COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous') = 'anonymous'
          AND COALESCE(NULLIF(current_setting('app.path', true), ''), '') LIKE '%/auth/email-verification/verify%'
        )
      );
      CREATE POLICY users_insert_policy ON users
      FOR INSERT
      WITH CHECK (
        tenant_id = 'global'
        OR tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR (
          COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous') = 'anonymous'
          AND COALESCE(NULLIF(current_setting('app.path', true), ''), '') LIKE '%/auth/invitations/accept%'
        )
      );
      CREATE POLICY users_update_policy ON users
      FOR UPDATE
      USING (
        (
          tenant_id = 'global'
          AND id::text = NULLIF(current_setting('app.user_id', true), '')
        )
        OR tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR (
          COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous') = 'anonymous'
          AND COALESCE(NULLIF(current_setting('app.path', true), ''), '') LIKE '%/auth/invitations/accept%'
        )
        OR (
          COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous') = 'anonymous'
          AND COALESCE(NULLIF(current_setting('app.path', true), ''), '') LIKE '%/auth/email-verification/verify%'
        )
      )
      WITH CHECK (
        (
          tenant_id = 'global'
          AND id::text = NULLIF(current_setting('app.user_id', true), '')
        )
        OR tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR (
          COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous') = 'anonymous'
          AND COALESCE(NULLIF(current_setting('app.path', true), ''), '') LIKE '%/auth/invitations/accept%'
        )
        OR (
          COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous') = 'anonymous'
          AND COALESCE(NULLIF(current_setting('app.path', true), ''), '') LIKE '%/auth/email-verification/verify%'
        )
      );
      CREATE POLICY users_delete_policy ON users
      FOR DELETE
      USING (
        tenant_id = 'global'
        AND id::text = NULLIF(current_setting('app.user_id', true), '')
      );

      DROP POLICY IF EXISTS roles_rls_policy ON roles;
      CREATE POLICY roles_rls_policy ON roles
      FOR ALL
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR NULLIF(current_setting('app.role', true), '') = 'system'
        OR COALESCE(NULLIF(current_setting('app.path', true), ''), '') LIKE '%/auth/invitations/accept%'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR NULLIF(current_setting('app.role', true), '') = 'system'
        OR COALESCE(NULLIF(current_setting('app.path', true), ''), '') LIKE '%/auth/invitations/accept%'
      );

      DROP POLICY IF EXISTS permissions_rls_policy ON permissions;
      CREATE POLICY permissions_rls_policy ON permissions
      FOR ALL
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
      );

      DROP POLICY IF EXISTS role_permissions_rls_policy ON role_permissions;
      CREATE POLICY role_permissions_rls_policy ON role_permissions
      FOR ALL
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
      );

      DROP POLICY IF EXISTS tenant_memberships_rls_policy ON tenant_memberships;
      CREATE POLICY tenant_memberships_rls_policy ON tenant_memberships
      FOR ALL
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR NULLIF(current_setting('app.role', true), '') = 'system'
        OR COALESCE(NULLIF(current_setting('app.path', true), ''), '') LIKE '%/auth/invitations/accept%'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR NULLIF(current_setting('app.role', true), '') = 'system'
        OR COALESCE(NULLIF(current_setting('app.path', true), ''), '') LIKE '%/auth/invitations/accept%'
      );

      DROP POLICY IF EXISTS auth_action_tokens_rls_policy ON auth_action_tokens;
      CREATE POLICY auth_action_tokens_rls_policy ON auth_action_tokens
      FOR ALL
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR COALESCE(NULLIF(current_setting('app.auth_action_token_operation', true), ''), '') IN (
          'password_recovery_create',
          'password_recovery_consume',
          'email_verification_create',
          'email_verification_consume',
          'invite_acceptance_consume',
          'magic_login_consume'
        )
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR COALESCE(NULLIF(current_setting('app.auth_action_token_operation', true), ''), '') IN (
          'password_recovery_create',
          'password_recovery_consume',
          'email_verification_create',
          'email_verification_consume',
          'invite_acceptance_consume',
          'magic_login_consume'
        )
      );

      DROP POLICY IF EXISTS auth_email_outbox_rls_policy ON auth_email_outbox;
      CREATE POLICY auth_email_outbox_rls_policy ON auth_email_outbox
      FOR ALL
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR COALESCE(NULLIF(current_setting('app.auth_email_outbox_operation', true), ''), '') IN (
          'password_recovery_create',
          'email_verification_create',
          'mark_delivery'
        )
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR COALESCE(NULLIF(current_setting('app.auth_email_outbox_operation', true), ''), '') IN (
          'password_recovery_create',
          'email_verification_create',
          'mark_delivery'
        )
      );

      DROP POLICY IF EXISTS auth_mfa_challenges_rls_policy ON auth_mfa_challenges;
      CREATE POLICY auth_mfa_challenges_rls_policy ON auth_mfa_challenges
      FOR ALL
      USING (
        user_id::text = NULLIF(current_setting('app.user_id', true), '')
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR COALESCE(NULLIF(current_setting('app.path', true), ''), '') LIKE '%/auth/login%'
      )
      WITH CHECK (
        user_id::text = NULLIF(current_setting('app.user_id', true), '')
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR COALESCE(NULLIF(current_setting('app.path', true), ''), '') LIKE '%/auth/login%'
      );

      DROP POLICY IF EXISTS auth_trusted_devices_rls_policy ON auth_trusted_devices;
      CREATE POLICY auth_trusted_devices_rls_policy ON auth_trusted_devices
      FOR ALL
      USING (
        user_id::text = NULLIF(current_setting('app.user_id', true), '')
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR COALESCE(NULLIF(current_setting('app.path', true), ''), '') LIKE '%/auth/login%'
      )
      WITH CHECK (
        user_id::text = NULLIF(current_setting('app.user_id', true), '')
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR COALESCE(NULLIF(current_setting('app.path', true), ''), '') LIKE '%/auth/login%'
      );

      DROP POLICY IF EXISTS monitoring_service_accounts_rls_policy ON monitoring_service_accounts;
      DROP POLICY IF EXISTS monitoring_service_accounts_select_policy ON monitoring_service_accounts;
      DROP POLICY IF EXISTS monitoring_service_accounts_manage_policy ON monitoring_service_accounts;
      CREATE POLICY monitoring_service_accounts_select_policy ON monitoring_service_accounts
      FOR SELECT
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      );
      CREATE POLICY monitoring_service_accounts_manage_policy ON monitoring_service_accounts
      FOR ALL
      USING (
        NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      )
      WITH CHECK (
        NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      );

      DROP POLICY IF EXISTS monitoring_service_account_audit_logs_rls_policy ON monitoring_service_account_audit_logs;
      DROP POLICY IF EXISTS monitoring_service_account_audit_logs_select_policy ON monitoring_service_account_audit_logs;
      DROP POLICY IF EXISTS monitoring_service_account_audit_logs_insert_policy ON monitoring_service_account_audit_logs;
      CREATE POLICY monitoring_service_account_audit_logs_select_policy ON monitoring_service_account_audit_logs
      FOR SELECT
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      );
      CREATE POLICY monitoring_service_account_audit_logs_insert_policy ON monitoring_service_account_audit_logs
      FOR INSERT
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      );

      DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
      CREATE TRIGGER trg_users_set_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_roles_set_updated_at ON roles;
      CREATE TRIGGER trg_roles_set_updated_at
      BEFORE UPDATE ON roles
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_permissions_set_updated_at ON permissions;
      CREATE TRIGGER trg_permissions_set_updated_at
      BEFORE UPDATE ON permissions
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_role_permissions_set_updated_at ON role_permissions;
      CREATE TRIGGER trg_role_permissions_set_updated_at
      BEFORE UPDATE ON role_permissions
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_tenant_memberships_set_updated_at ON tenant_memberships;
      CREATE TRIGGER trg_tenant_memberships_set_updated_at
      BEFORE UPDATE ON tenant_memberships
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_auth_action_tokens_set_updated_at ON auth_action_tokens;
      CREATE TRIGGER trg_auth_action_tokens_set_updated_at
      BEFORE UPDATE ON auth_action_tokens
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_auth_email_outbox_set_updated_at ON auth_email_outbox;
      CREATE TRIGGER trg_auth_email_outbox_set_updated_at
      BEFORE UPDATE ON auth_email_outbox
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_auth_mfa_challenges_set_updated_at ON auth_mfa_challenges;
      CREATE TRIGGER trg_auth_mfa_challenges_set_updated_at
      BEFORE UPDATE ON auth_mfa_challenges
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_auth_trusted_devices_set_updated_at ON auth_trusted_devices;
      CREATE TRIGGER trg_auth_trusted_devices_set_updated_at
      BEFORE UPDATE ON auth_trusted_devices
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_monitoring_service_accounts_set_updated_at ON monitoring_service_accounts;
      CREATE TRIGGER trg_monitoring_service_accounts_set_updated_at
      BEFORE UPDATE ON monitoring_service_accounts
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    this.logger.log('Authentication schema and RLS policies verified');
  }
}
