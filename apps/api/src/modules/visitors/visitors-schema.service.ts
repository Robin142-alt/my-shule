import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class VisitorsSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(VisitorsSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const schemaSql = `
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      -- Core visitors registry (frequent visitors)
      CREATE TABLE IF NOT EXISTS visitors_registry (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        full_name text NOT NULL,
        phone_number text,
        id_number text,
        visitor_type text NOT NULL DEFAULT 'parent', -- parent, contractor, guest
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      -- Appointments (Scheduled by secretary)
      CREATE TABLE IF NOT EXISTS visitors_appointments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        visitor_id uuid REFERENCES visitors_registry(id),
        visitor_name text NOT NULL,
        host_user_id text NOT NULL,
        purpose text NOT NULL,
        appointment_time timestamptz NOT NULL,
        status text NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled
        created_by_user_id text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      -- Visitor Logs (Security Gate / Reception Check-ins)
      CREATE TABLE IF NOT EXISTS visitors_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        visitor_id uuid REFERENCES visitors_registry(id),
        visitor_name text NOT NULL,
        phone_number text,
        id_number text,
        purpose text NOT NULL,
        host_user_id text,
        badge_number text,
        time_in timestamptz NOT NULL DEFAULT NOW(),
        time_out timestamptz,
        status text NOT NULL DEFAULT 'active', -- active, resolved, checked_out
        logged_by_user_id text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      -- Student Exits (Gate Pass)
      CREATE TABLE IF NOT EXISTS student_exits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        student_id text NOT NULL,
        reason text NOT NULL,
        authorized_by_user_id text NOT NULL,
        picked_up_by text,
        time_out timestamptz NOT NULL DEFAULT NOW(),
        time_in timestamptz,
        status text NOT NULL DEFAULT 'out', -- out, returned
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE visitors_logs ADD COLUMN IF NOT EXISTS id_number text;

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'visitors_registry'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE visitors_registry ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'visitors_appointments'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE visitors_appointments ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'visitors_appointments'
            AND column_name = 'host_user_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE visitors_appointments ALTER COLUMN host_user_id TYPE text USING host_user_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'visitors_appointments'
            AND column_name = 'created_by_user_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE visitors_appointments ALTER COLUMN created_by_user_id TYPE text USING created_by_user_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'visitors_appointments'
            AND column_name = 'appointment_time'
            AND data_type <> 'timestamp with time zone'
        ) THEN
          ALTER TABLE visitors_appointments ALTER COLUMN appointment_time TYPE timestamptz USING appointment_time::timestamptz;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'visitors_logs'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE visitors_logs ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'visitors_logs'
            AND column_name = 'host_user_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE visitors_logs ALTER COLUMN host_user_id TYPE text USING host_user_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'visitors_logs'
            AND column_name = 'logged_by_user_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE visitors_logs ALTER COLUMN logged_by_user_id TYPE text USING logged_by_user_id::text;
        END IF;
      END;
      $$;

      ALTER TABLE visitors_appointments
        ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled';

      ALTER TABLE visitors_appointments
        ALTER COLUMN updated_at SET DEFAULT NOW(),
        ALTER COLUMN updated_at SET NOT NULL;

      UPDATE visitors_appointments
      SET status = COALESCE(NULLIF(status, ''), 'scheduled'),
          updated_at = COALESCE(updated_at, created_at, NOW())
      WHERE status IS NULL
         OR status = ''
         OR updated_at IS NULL;

      ALTER TABLE visitors_logs
        ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'legacy-unassigned',
        ADD COLUMN IF NOT EXISTS visitor_id uuid,
        ADD COLUMN IF NOT EXISTS visitor_name text NOT NULL DEFAULT 'Unknown visitor',
        ADD COLUMN IF NOT EXISTS phone_number text,
        ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'Unspecified',
        ADD COLUMN IF NOT EXISTS host_user_id text,
        ADD COLUMN IF NOT EXISTS badge_number text,
        ADD COLUMN IF NOT EXISTS time_in timestamptz NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS time_out timestamptz,
        ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS logged_by_user_id text NOT NULL DEFAULT 'system',
        ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();

      UPDATE visitors_logs
      SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'legacy-unassigned'),
          visitor_name = COALESCE(NULLIF(visitor_name, ''), 'Unknown visitor'),
          purpose = COALESCE(NULLIF(purpose, ''), 'Unspecified'),
          logged_by_user_id = COALESCE(NULLIF(logged_by_user_id, ''), 'system'),
          time_in = COALESCE(time_in, NOW()),
          status = COALESCE(NULLIF(status, ''), 'active'),
          created_at = COALESCE(created_at, time_in, NOW()),
          updated_at = COALESCE(updated_at, created_at, time_in, NOW())
      WHERE tenant_id IS NULL
         OR tenant_id = ''
         OR visitor_name IS NULL
         OR visitor_name = ''
         OR purpose IS NULL
         OR purpose = ''
         OR logged_by_user_id IS NULL
         OR logged_by_user_id = ''
         OR time_in IS NULL
         OR status IS NULL
         OR status = ''
         OR created_at IS NULL
         OR updated_at IS NULL;

      ALTER TABLE visitors_logs
        ALTER COLUMN tenant_id SET DEFAULT 'legacy-unassigned',
        ALTER COLUMN tenant_id SET NOT NULL,
        ALTER COLUMN phone_number DROP NOT NULL,
        ALTER COLUMN host_user_id DROP NOT NULL,
        ALTER COLUMN badge_number DROP NOT NULL,
        ALTER COLUMN visitor_name SET DEFAULT 'Unknown visitor',
        ALTER COLUMN visitor_name SET NOT NULL,
        ALTER COLUMN purpose SET DEFAULT 'Unspecified',
        ALTER COLUMN purpose SET NOT NULL,
        ALTER COLUMN time_in SET DEFAULT NOW(),
        ALTER COLUMN time_in SET NOT NULL,
        ALTER COLUMN status SET DEFAULT 'active',
        ALTER COLUMN status SET NOT NULL,
        ALTER COLUMN logged_by_user_id SET DEFAULT 'system',
        ALTER COLUMN logged_by_user_id SET NOT NULL,
        ALTER COLUMN created_at SET DEFAULT NOW(),
        ALTER COLUMN created_at SET NOT NULL,
        ALTER COLUMN updated_at SET DEFAULT NOW(),
        ALTER COLUMN updated_at SET NOT NULL;

      ALTER TABLE student_exits
        ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'legacy-unassigned',
        ADD COLUMN IF NOT EXISTS student_id text NOT NULL DEFAULT 'legacy-student',
        ADD COLUMN IF NOT EXISTS reason text NOT NULL DEFAULT 'Unspecified',
        ADD COLUMN IF NOT EXISTS authorized_by_user_id text NOT NULL DEFAULT 'system',
        ADD COLUMN IF NOT EXISTS picked_up_by text,
        ADD COLUMN IF NOT EXISTS time_out timestamptz NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS time_in timestamptz,
        ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'out',
        ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();

      UPDATE student_exits
      SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'legacy-unassigned'),
          student_id = COALESCE(NULLIF(student_id, ''), 'legacy-student'),
          reason = COALESCE(NULLIF(reason, ''), 'Unspecified'),
          authorized_by_user_id = COALESCE(NULLIF(authorized_by_user_id, ''), 'system'),
          time_out = COALESCE(time_out, NOW()),
          status = COALESCE(NULLIF(status, ''), 'out'),
          created_at = COALESCE(created_at, time_out, NOW()),
          updated_at = COALESCE(updated_at, created_at, time_out, NOW())
      WHERE tenant_id IS NULL
         OR tenant_id = ''
         OR student_id IS NULL
         OR student_id = ''
         OR reason IS NULL
         OR reason = ''
         OR authorized_by_user_id IS NULL
         OR authorized_by_user_id = ''
         OR time_out IS NULL
         OR status IS NULL
         OR status = ''
         OR created_at IS NULL
         OR updated_at IS NULL;

      ALTER TABLE student_exits
        ALTER COLUMN tenant_id SET DEFAULT 'legacy-unassigned',
        ALTER COLUMN tenant_id SET NOT NULL,
        ALTER COLUMN student_id SET DEFAULT 'legacy-student',
        ALTER COLUMN student_id SET NOT NULL,
        ALTER COLUMN reason SET DEFAULT 'Unspecified',
        ALTER COLUMN reason SET NOT NULL,
        ALTER COLUMN authorized_by_user_id SET DEFAULT 'system',
        ALTER COLUMN authorized_by_user_id SET NOT NULL,
        ALTER COLUMN time_out SET DEFAULT NOW(),
        ALTER COLUMN time_out SET NOT NULL,
        ALTER COLUMN status SET DEFAULT 'out',
        ALTER COLUMN status SET NOT NULL,
        ALTER COLUMN created_at SET DEFAULT NOW(),
        ALTER COLUMN created_at SET NOT NULL,
        ALTER COLUMN updated_at SET DEFAULT NOW(),
        ALTER COLUMN updated_at SET NOT NULL;

      CREATE INDEX IF NOT EXISTS ix_visitors_registry_tenant ON visitors_registry (tenant_id);
      CREATE INDEX IF NOT EXISTS ix_visitors_appointments_tenant ON visitors_appointments (tenant_id, appointment_time);
      CREATE INDEX IF NOT EXISTS ix_visitors_logs_tenant ON visitors_logs (tenant_id, status);
      CREATE INDEX IF NOT EXISTS ix_student_exits_tenant ON student_exits (tenant_id, status);

      CREATE OR REPLACE VIEW visitor_checkins AS
      SELECT
        id,
        tenant_id,
        visitor_id,
        visitor_name,
        phone_number,
        purpose,
        host_user_id,
        badge_number,
        time_in AS checked_in_at,
        time_out AS checked_out_at,
        status,
        logged_by_user_id,
        created_at,
        updated_at
      FROM visitors_logs;

      ALTER TABLE visitors_registry FORCE ROW LEVEL SECURITY;
      ALTER TABLE visitors_appointments FORCE ROW LEVEL SECURITY;
      ALTER TABLE visitors_logs FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_exits FORCE ROW LEVEL SECURITY;
    `;

    await this.prisma.runSchemaBootstrap(schemaSql);
    this.logger.log('Visitor management schema verified');
  }
}
