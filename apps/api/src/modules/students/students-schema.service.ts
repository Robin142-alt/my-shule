import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { AuthSchemaService } from '../../auth/auth-schema.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StudentsSchemaService implements OnModuleInit {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);
    
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

      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS trigger AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TABLE IF NOT EXISTS students (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        admission_number text NOT NULL,
        first_name text NOT NULL,
        last_name text NOT NULL,
        middle_name text,
        status text NOT NULL DEFAULT 'active',
        date_of_birth date,
        gender text,
        primary_guardian_name text,
        primary_guardian_phone text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_students_admission_number_not_blank CHECK (btrim(admission_number) <> ''),
        CONSTRAINT ck_students_first_name_not_blank CHECK (btrim(first_name) <> ''),
        CONSTRAINT ck_students_last_name_not_blank CHECK (btrim(last_name) <> ''),
        CONSTRAINT ck_students_status CHECK (status IN ('active', 'inactive', 'graduated', 'transferred')),
        CONSTRAINT ck_students_gender CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'undisclosed')),
        CONSTRAINT uq_students_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_students_tenant_admission_number UNIQUE (tenant_id, admission_number),
        CONSTRAINT fk_students_created_by_user
          FOREIGN KEY (created_by_user_id)
          REFERENCES users (id)
          ON DELETE SET NULL
      );

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

      CREATE INDEX IF NOT EXISTS ix_students_status_created_at
        ON students (tenant_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_students_name_lookup
        ON students (tenant_id, last_name, first_name, admission_number);
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
      ALTER TABLE students ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
      ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS user_id uuid;
      ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS invitation_id uuid;
      ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS display_name text;
      ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS email text;
      ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS phone text;
      ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'invited';
      ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
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

      DROP TRIGGER IF EXISTS trg_student_guardians_set_updated_at ON student_guardians;
      CREATE TRIGGER trg_student_guardians_set_updated_at
      BEFORE UPDATE ON student_guardians
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_attendance_records_set_updated_at ON attendance_records;
      CREATE TRIGGER trg_attendance_records_set_updated_at
      BEFORE UPDATE ON attendance_records
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    this.logger.log('Student schema verified');
  }
}
