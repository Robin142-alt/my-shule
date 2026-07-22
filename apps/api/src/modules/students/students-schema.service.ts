import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { AuthSchemaService } from '../../auth/auth-schema.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StudentsSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(StudentsSchemaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authSchemaService: AuthSchemaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.authSchemaService.onModuleInit();

    await this.prisma.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StudentStatus') THEN
          CREATE TYPE "StudentStatus" AS ENUM (
            'APPLICANT',
            'ACCEPTED',
            'ENROLLED',
            'ACTIVE',
            'INACTIVE',
            'SUSPENDED',
            'ON_LEAVE',
            'TRANSFERRED_OUT',
            'WITHDRAWN',
            'GRADUATED',
            'ALUMNI',
            'ARCHIVED'
          );
        ELSE
          ALTER TYPE "StudentStatus" ADD VALUE IF NOT EXISTS 'INACTIVE';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BoardingStatus') THEN
          CREATE TYPE "BoardingStatus" AS ENUM (
            'DAY_SCHOLAR',
            'BOARDER'
          );
        END IF;
      END $$;

      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS trigger AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION sync_student_tenant_columns()
      RETURNS trigger AS $$
      BEGIN
        NEW.tenant_id = COALESCE(NULLIF(NEW.tenant_id, ''), NULLIF(NEW.school_id, ''));
        NEW.school_id = COALESCE(NULLIF(NEW.school_id, ''), NULLIF(NEW.tenant_id, ''));
        NEW.student_status = COALESCE(NEW.student_status, upper(COALESCE(NULLIF(NEW.status, ''), 'active'))::"StudentStatus");
        NEW.status = lower(COALESCE(NULLIF(NEW.status, ''), NEW.student_status::text, 'active'));
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TABLE IF NOT EXISTS students (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        school_id text,
        admission_number text NOT NULL,
        upi_number text,
        nemis_number text,
        first_name text NOT NULL,
        last_name text NOT NULL,
        middle_name text,
        status text NOT NULL DEFAULT 'active',
        student_status "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
        date_of_birth date NOT NULL DEFAULT CURRENT_DATE,
        gender text NOT NULL DEFAULT 'undisclosed',
        photo_url text,
        birth_certificate_number text,
        nationality text NOT NULL DEFAULT 'Kenyan',
        religion text,
        admission_date date NOT NULL DEFAULT CURRENT_DATE,
        current_class_id text,
        current_stream_id text,
        boarding_status "BoardingStatus" NOT NULL DEFAULT 'DAY_SCHOLAR',
        medical_notes_summary text,
        primary_guardian_name text,
        primary_guardian_phone text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        deleted_at timestamptz,
        CONSTRAINT ck_students_admission_number_not_blank CHECK (btrim(admission_number) <> ''),
        CONSTRAINT ck_students_first_name_not_blank CHECK (btrim(first_name) <> ''),
        CONSTRAINT ck_students_last_name_not_blank CHECK (btrim(last_name) <> ''),
        CONSTRAINT ck_students_status CHECK (status IN ('applicant', 'accepted', 'enrolled', 'active', 'inactive', 'suspended', 'on_leave', 'transferred', 'transferred_out', 'withdrawn', 'graduated', 'alumni', 'archived')),
        CONSTRAINT ck_students_gender CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'undisclosed')),
        CONSTRAINT uq_students_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_students_school_id_id UNIQUE (school_id, id),
        CONSTRAINT uq_students_tenant_admission_number UNIQUE (tenant_id, admission_number),
        CONSTRAINT fk_students_created_by_user
          FOREIGN KEY (created_by_user_id)
          REFERENCES users (id)
          ON DELETE SET NULL
      );

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone_number_ciphertext text,
        ADD COLUMN IF NOT EXISTS phone_number_hash text,
        ADD COLUMN IF NOT EXISTS phone_number_last4 text;
      CREATE INDEX IF NOT EXISTS ix_users_phone_number_hash
        ON users (phone_number_hash)
        WHERE phone_number_hash IS NOT NULL;

      CREATE TABLE IF NOT EXISTS student_guardians (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        student_id uuid NOT NULL,
        user_id uuid,
        invitation_id uuid,
        display_name text NOT NULL,
        email text NOT NULL,
        phone text,
        relationship text NOT NULL,
        is_primary boolean NOT NULL DEFAULT FALSE,
        status text NOT NULL DEFAULT 'invited',
        accepted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_student_guardians_display_name_not_blank CHECK (btrim(display_name) <> ''),
        CONSTRAINT ck_student_guardians_email_not_blank CHECK (btrim(email) <> ''),
        CONSTRAINT ck_student_guardians_relationship_not_blank CHECK (btrim(relationship) <> ''),
        CONSTRAINT ck_student_guardians_status CHECK (status IN ('invited', 'active', 'revoked')),
        CONSTRAINT uq_student_guardians_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_student_guardians_student
          FOREIGN KEY (tenant_id, student_id)
          REFERENCES students (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_student_guardians_user
          FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON DELETE SET NULL,
        CONSTRAINT fk_student_guardians_invitation
          FOREIGN KEY (invitation_id)
          REFERENCES auth_action_tokens (id)
          ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS attendance_records (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        student_id uuid NOT NULL,
        attendance_date date NOT NULL,
        status text NOT NULL,
        notes text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        source_device_id text,
        last_modified_at timestamptz NOT NULL DEFAULT NOW(),
        last_operation_id uuid,
        sync_version bigint,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_attendance_records_status CHECK (status IN ('present', 'absent', 'late', 'excused')),
        CONSTRAINT uq_attendance_records_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_attendance_records_student_date UNIQUE (tenant_id, student_id, attendance_date),
        CONSTRAINT fk_attendance_records_student
          FOREIGN KEY (tenant_id, student_id)
          REFERENCES students (tenant_id, id)
          ON DELETE CASCADE
      );

      DO $$
      DECLARE
        target_table text;
        existing_policy text;
      BEGIN
        FOREACH target_table IN ARRAY ARRAY['students', 'student_guardians', 'attendance_records']
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

            IF NOT EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = target_table
                AND column_name = 'tenant_id'
            ) THEN
              EXECUTE format('ALTER TABLE %I ADD COLUMN tenant_id text', target_table);
            END IF;

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

            IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = target_table
                AND column_name = 'school_id'
            ) THEN
              EXECUTE format('UPDATE %I SET tenant_id = school_id WHERE tenant_id IS NULL AND school_id IS NOT NULL', target_table);
            END IF;

            EXECUTE format(
              'UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL OR btrim(tenant_id) = %L',
              target_table,
              'legacy-unassigned',
              ''
            );
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', target_table);
          END IF;
        END LOOP;
      END $$;

      ALTER TABLE students ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
      UPDATE students
      SET status = lower(COALESCE(NULLIF(status, ''), student_status::text, 'active'))
      WHERE status IS NULL OR btrim(status) = '';

      ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS attendance_date date;
      ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS notes text;
      ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS source_device_id text;
      ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS last_modified_at timestamptz NOT NULL DEFAULT NOW();
      ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS last_operation_id uuid;
      ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS sync_version bigint;
      UPDATE attendance_records
      SET attendance_date = COALESCE(attendance_date, created_at::date, CURRENT_DATE),
          metadata = COALESCE(metadata, '{}'::jsonb),
          last_modified_at = COALESCE(last_modified_at, updated_at, created_at, NOW())
      WHERE attendance_date IS NULL
         OR metadata IS NULL
         OR last_modified_at IS NULL;
      ALTER TABLE attendance_records ALTER COLUMN attendance_date SET DEFAULT CURRENT_DATE;
      ALTER TABLE attendance_records ALTER COLUMN attendance_date SET NOT NULL;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_students_tenant_id_id'
        ) THEN
          ALTER TABLE students
            ADD CONSTRAINT uq_students_tenant_id_id UNIQUE (tenant_id, id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_students_school_id_id'
        ) THEN
          ALTER TABLE students
            ADD CONSTRAINT uq_students_school_id_id UNIQUE (school_id, id);
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS ix_students_status_created_at
        ON students (tenant_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_students_school_status_created_at
        ON students (school_id, student_status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_students_name_lookup
        ON students (tenant_id, last_name, first_name, admission_number);
      CREATE INDEX IF NOT EXISTS ix_students_school_name_lookup
        ON students (school_id, last_name, first_name, admission_number);
      CREATE INDEX IF NOT EXISTS ix_attendance_records_student_date
        ON attendance_records (tenant_id, student_id, attendance_date DESC);
      CREATE INDEX IF NOT EXISTS ix_attendance_records_sync_version
        ON attendance_records (tenant_id, sync_version)
        WHERE sync_version IS NOT NULL;
      CREATE INDEX IF NOT EXISTS ix_students_search_vector
        ON students
        USING GIN (
          to_tsvector(
            'simple'::regconfig,
            admission_number || ' ' ||
            first_name || ' ' ||
            COALESCE(middle_name, '') || ' ' ||
            last_name || ' ' ||
            COALESCE(primary_guardian_name, '') || ' ' ||
            COALESCE(primary_guardian_phone, '')
          )
        );
      ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id text;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS upi_number text;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS nemis_number text;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS student_status "StudentStatus" NOT NULL DEFAULT 'ACTIVE';
      ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url text;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_certificate_number text;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS nationality text NOT NULL DEFAULT 'Kenyan';
      ALTER TABLE students ADD COLUMN IF NOT EXISTS religion text;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_date date NOT NULL DEFAULT CURRENT_DATE;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS current_class_id text;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS current_stream_id text;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS boarding_status "BoardingStatus" NOT NULL DEFAULT 'DAY_SCHOLAR';
      ALTER TABLE students ADD COLUMN IF NOT EXISTS medical_notes_summary text;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_by_user_id uuid;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
      UPDATE students
      SET
        school_id = COALESCE(NULLIF(school_id, ''), tenant_id),
        tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id),
        student_status = COALESCE(student_status, upper(status)::"StudentStatus"),
        status = lower(COALESCE(NULLIF(status, ''), student_status::text, 'active'));
      ALTER TABLE students ALTER COLUMN school_id SET NOT NULL;
      ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS user_id uuid;
      ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS invitation_id uuid;
      ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS display_name text;
      ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS email text;
      ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS phone text;
      ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS normalized_phone text;
      ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS guardian_profile_id uuid;
      ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'invited';
      ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
      ALTER TABLE student_guardians ALTER COLUMN email DROP NOT NULL;
      ALTER TABLE student_guardians DROP CONSTRAINT IF EXISTS ck_student_guardians_email_not_blank;
      CREATE TABLE IF NOT EXISTS guardian_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        display_name text NOT NULL,
        normalized_phone text NOT NULL,
        email text,
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_guardian_profiles_tenant_phone UNIQUE (tenant_id, normalized_phone),
        CONSTRAINT uq_guardian_profiles_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_guardian_profiles_name_not_blank CHECK (btrim(display_name) <> ''),
        CONSTRAINT ck_guardian_profiles_phone_not_blank CHECK (btrim(normalized_phone) <> '')
      );
      CREATE TABLE IF NOT EXISTS student_portal_access (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        student_id uuid NOT NULL,
        user_id uuid NOT NULL,
        username text NOT NULL,
        guardian_phone_hash text NOT NULL,
        force_password_change boolean NOT NULL DEFAULT TRUE,
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
        last_login_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_student_portal_access_tenant_student UNIQUE (tenant_id, student_id),
        CONSTRAINT uq_student_portal_access_tenant_user UNIQUE (tenant_id, user_id),
        CONSTRAINT ck_student_portal_access_username_not_blank CHECK (btrim(username) <> ''),
        CONSTRAINT ck_student_portal_access_phone_hash_not_blank CHECK (btrim(guardian_phone_hash) <> ''),
        CONSTRAINT fk_student_portal_access_student
          FOREIGN KEY (tenant_id, student_id)
          REFERENCES students (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_student_portal_access_user
          FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS ix_guardian_profiles_user
        ON guardian_profiles (tenant_id, user_id)
        WHERE user_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_student_portal_access_username
        ON student_portal_access (tenant_id, lower(username));
      CREATE INDEX IF NOT EXISTS ix_student_portal_access_lookup
        ON student_portal_access (lower(username), guardian_phone_hash)
        WHERE status = 'active';
      CREATE UNIQUE INDEX IF NOT EXISTS ux_student_guardians_student_phone
        ON student_guardians (tenant_id, student_id, normalized_phone)
        WHERE normalized_phone IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_student_guardians_student_email
        ON student_guardians (tenant_id, student_id, lower(email));
      CREATE INDEX IF NOT EXISTS ix_student_guardians_user_status
        ON student_guardians (tenant_id, user_id, status)
        WHERE user_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS ix_student_guardians_invitation
        ON student_guardians (tenant_id, invitation_id)
        WHERE invitation_id IS NOT NULL;

      ALTER TABLE students ENABLE ROW LEVEL SECURITY;
      ALTER TABLE students FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_guardians ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_guardians FORCE ROW LEVEL SECURITY;
      ALTER TABLE guardian_profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE guardian_profiles FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_portal_access ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_portal_access FORCE ROW LEVEL SECURITY;
      ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
      ALTER TABLE attendance_records FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS students_rls_policy ON students;
      CREATE POLICY students_rls_policy ON students
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS student_guardians_rls_policy ON student_guardians;
      CREATE POLICY student_guardians_rls_policy ON student_guardians
      FOR ALL
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR COALESCE(NULLIF(current_setting('app.path', true), ''), '') LIKE '%/auth/invitations/accept%'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR COALESCE(NULLIF(current_setting('app.path', true), ''), '') LIKE '%/auth/invitations/accept%'
      );

      DROP POLICY IF EXISTS guardian_profiles_rls_policy ON guardian_profiles;
      CREATE POLICY guardian_profiles_rls_policy ON guardian_profiles
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS student_portal_access_rls_policy ON student_portal_access;
      CREATE POLICY student_portal_access_rls_policy ON student_portal_access
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS attendance_records_rls_policy ON attendance_records;
      CREATE POLICY attendance_records_rls_policy ON attendance_records
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP TRIGGER IF EXISTS trg_students_set_updated_at ON students;
      CREATE TRIGGER trg_students_set_updated_at
      BEFORE UPDATE ON students
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_students_sync_tenant_columns ON students;
      CREATE TRIGGER trg_students_sync_tenant_columns
      BEFORE INSERT OR UPDATE ON students
      FOR EACH ROW
      EXECUTE FUNCTION sync_student_tenant_columns();

      DROP TRIGGER IF EXISTS trg_student_guardians_set_updated_at ON student_guardians;
      CREATE TRIGGER trg_student_guardians_set_updated_at
      BEFORE UPDATE ON student_guardians
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_guardian_profiles_set_updated_at ON guardian_profiles;
      CREATE TRIGGER trg_guardian_profiles_set_updated_at
      BEFORE UPDATE ON guardian_profiles
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_student_portal_access_set_updated_at ON student_portal_access;
      CREATE TRIGGER trg_student_portal_access_set_updated_at
      BEFORE UPDATE ON student_portal_access
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      CREATE SCHEMA IF NOT EXISTS app;
      DROP FUNCTION IF EXISTS app.find_student_auth_subject_for_otp(text, text, text);
      CREATE OR REPLACE FUNCTION app.find_student_auth_subject_for_otp(
        input_tenant_id text,
        input_username text,
        input_phone_hash text
      )
      RETURNS TABLE (
        user_id uuid,
        tenant_id text,
        role_id uuid,
        role_code text,
        email text,
        display_name text,
        phone_number_hash text,
        phone_number_last4 text,
        force_password_change boolean
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
          RAISE EXCEPTION 'Student OTP lookup is only available before authentication'
            USING ERRCODE = '42501';
        END IF;

        IF request_path NOT IN ('/auth/student/otp/request', '/auth/student/otp/verify') THEN
          RAISE EXCEPTION 'Student OTP lookup is only available on student OTP routes'
            USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
        WITH matches AS (
          SELECT
            u.id AS user_id,
            access.tenant_id,
            membership.role_id,
            role.code AS role_code,
            u.email::text,
            u.display_name,
            u.phone_number_hash,
            u.phone_number_last4,
            access.force_password_change,
            access.created_at
          FROM student_portal_access access
          INNER JOIN users u
            ON u.id = access.user_id
           AND u.status = 'active'
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = access.tenant_id
           AND membership.user_id = access.user_id
           AND membership.status = 'active'
          INNER JOIN roles role
            ON role.tenant_id = membership.tenant_id
           AND role.id = membership.role_id
           AND role.code = 'student'
          WHERE access.status = 'active'
            AND lower(access.username) = lower(btrim(input_username))
            AND access.guardian_phone_hash = input_phone_hash
            AND (input_tenant_id IS NULL OR access.tenant_id = input_tenant_id)
        )
        SELECT
          match.user_id,
          match.tenant_id,
          match.role_id,
          match.role_code,
          match.email,
          match.display_name,
          match.phone_number_hash,
          match.phone_number_last4,
          match.force_password_change
        FROM matches match
        WHERE input_tenant_id IS NOT NULL
           OR (SELECT COUNT(*) FROM matches) = 1
        ORDER BY match.created_at DESC
        LIMIT 1;
      END;
      $$;

      DROP FUNCTION IF EXISTS app.find_student_auth_subject_for_password(text, text);
      CREATE FUNCTION app.find_student_auth_subject_for_password(
        input_tenant_id text,
        input_username text
      )
      RETURNS TABLE (
        user_id uuid,
        tenant_id text,
        role_id uuid,
        role_code text,
        email text,
        display_name text,
        phone_number_hash text,
        phone_number_last4 text,
        password_hash text,
        force_password_change boolean
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

        IF request_user_id <> 'anonymous' OR request_path <> '/auth/student/login' THEN
          RAISE EXCEPTION 'Student password lookup is only available on the student login route'
            USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
        WITH matches AS (
          SELECT
            u.id AS user_id,
            access.tenant_id,
            membership.role_id,
            role.code AS role_code,
            u.email::text,
            u.display_name,
            u.phone_number_hash,
            u.phone_number_last4,
            u.password_hash,
            access.force_password_change,
            access.created_at
          FROM student_portal_access access
          INNER JOIN users u
            ON u.id = access.user_id
           AND u.status = 'active'
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = access.tenant_id
           AND membership.user_id = access.user_id
           AND membership.status = 'active'
          INNER JOIN roles role
            ON role.tenant_id = membership.tenant_id
           AND role.id = membership.role_id
           AND role.code = 'student'
          WHERE access.status = 'active'
            AND lower(access.username) = lower(btrim(input_username))
            AND (input_tenant_id IS NULL OR access.tenant_id = input_tenant_id)
        )
        SELECT
          match.user_id,
          match.tenant_id,
          match.role_id,
          match.role_code,
          match.email,
          match.display_name,
          match.phone_number_hash,
          match.phone_number_last4,
          match.password_hash,
          match.force_password_change
        FROM matches match
        WHERE input_tenant_id IS NOT NULL
           OR (SELECT COUNT(*) FROM matches) = 1
        ORDER BY match.created_at DESC
        LIMIT 1;
      END;
      $$;

      DROP FUNCTION IF EXISTS app.find_linked_parent_auth_subject(text, text, text);
      CREATE FUNCTION app.find_linked_parent_auth_subject(
        input_tenant_id text,
        input_admission_number text,
        input_phone_hash text
      )
      RETURNS TABLE (
        user_id uuid,
        tenant_id text,
        role_id uuid,
        role_code text,
        email text,
        display_name text,
        phone_number_hash text,
        phone_number_last4 text,
        force_password_change boolean
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

        IF request_user_id <> 'anonymous'
           OR request_path NOT IN ('/auth/parent/otp/request', '/auth/parent/otp/verify') THEN
          RAISE EXCEPTION 'Linked parent lookup is only available on parent OTP routes'
            USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
        WITH matches AS (
          SELECT
            parent_user.id AS user_id,
            student.tenant_id,
            membership.role_id,
            role.code AS role_code,
            parent_user.email::text,
            parent_user.display_name,
            parent_user.phone_number_hash,
            parent_user.phone_number_last4,
            (parent_user.password_changed_at IS NULL) AS force_password_change,
            link.created_at
          FROM students student
          INNER JOIN student_guardians link
            ON link.tenant_id = student.tenant_id
           AND link.student_id = student.id
           AND link.status = 'active'
          INNER JOIN users parent_user
            ON parent_user.id = link.user_id
           AND parent_user.status = 'active'
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = student.tenant_id
           AND membership.user_id = parent_user.id
           AND membership.status = 'active'
          INNER JOIN roles role
            ON role.tenant_id = membership.tenant_id
           AND role.id = membership.role_id
           AND role.code = 'parent'
          WHERE student.status = 'active'
            AND lower(student.admission_number) = lower(btrim(input_admission_number))
            AND parent_user.phone_number_hash = input_phone_hash
            AND (input_tenant_id IS NULL OR student.tenant_id = input_tenant_id)
        )
        SELECT
          match.user_id,
          match.tenant_id,
          match.role_id,
          match.role_code,
          match.email,
          match.display_name,
          match.phone_number_hash,
          match.phone_number_last4,
          match.force_password_change
        FROM matches match
        WHERE input_tenant_id IS NOT NULL
           OR (SELECT COUNT(*) FROM matches) = 1
        ORDER BY match.created_at DESC
        LIMIT 1;
      END;
      $$;

      DROP FUNCTION IF EXISTS app.find_linked_parent_password_auth_subject(text, text);
      CREATE FUNCTION app.find_linked_parent_password_auth_subject(
        input_tenant_id text,
        input_admission_number text
      )
      RETURNS TABLE (
        user_id uuid,
        tenant_id text,
        role_id uuid,
        role_code text,
        email text,
        display_name text,
        phone_number_hash text,
        phone_number_last4 text,
        password_hash text,
        force_password_change boolean
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

        IF request_user_id <> 'anonymous' OR request_path <> '/auth/parent/login' THEN
          RAISE EXCEPTION 'Linked parent password lookup is only available on the parent login route'
            USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
        WITH matches AS (
          SELECT
            parent_user.id AS user_id,
            student.tenant_id,
            membership.role_id,
            role.code AS role_code,
            parent_user.email::text,
            parent_user.display_name,
            parent_user.phone_number_hash,
            parent_user.phone_number_last4,
            parent_user.password_hash,
            (parent_user.password_changed_at IS NULL) AS force_password_change,
            link.created_at
          FROM students student
          INNER JOIN student_guardians link
            ON link.tenant_id = student.tenant_id
           AND link.student_id = student.id
           AND link.status = 'active'
          INNER JOIN users parent_user
            ON parent_user.id = link.user_id
           AND parent_user.status = 'active'
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = student.tenant_id
           AND membership.user_id = parent_user.id
           AND membership.status = 'active'
          INNER JOIN roles role
            ON role.tenant_id = membership.tenant_id
           AND role.id = membership.role_id
           AND role.code = 'parent'
          WHERE student.status = 'active'
            AND lower(student.admission_number) = lower(btrim(input_admission_number))
            AND (input_tenant_id IS NULL OR student.tenant_id = input_tenant_id)
        )
        SELECT
          match.user_id,
          match.tenant_id,
          match.role_id,
          match.role_code,
          match.email,
          match.display_name,
          match.phone_number_hash,
          match.phone_number_last4,
          match.password_hash,
          match.force_password_change
        FROM matches match
        WHERE input_tenant_id IS NOT NULL
           OR (SELECT COUNT(*) FROM matches) = 1
        ORDER BY match.created_at DESC
        LIMIT 1;
      END;
      $$;

      DROP TRIGGER IF EXISTS trg_attendance_records_set_updated_at ON attendance_records;
      CREATE TRIGGER trg_attendance_records_set_updated_at
      BEFORE UPDATE ON attendance_records
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    this.logger.log('Student schema verified');
  }
}
