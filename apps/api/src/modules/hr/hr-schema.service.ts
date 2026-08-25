import { Injectable, Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';

import { SCHOOL_STAFF_ROLE_CODES } from '../../auth/auth.constants';
import { PrismaService } from '../../database/prisma.service';

const SCHOOL_STAFF_ROLE_SQL = SCHOOL_STAFF_ROLE_CODES
  .map((roleCode) => `'${roleCode}'`)
  .join(', ');

const HR_TABLES = [
  'staff_departments',
  'staff_job_titles',
  'staff_profiles',
  'staff_contracts',
  'staff_leave_balances',
  'staff_leave_requests',
  'staff_documents',
  'staff_document_expiry_reminders',
  'staff_audit_logs',
  'staff_attendance',
  'staff_payroll_bands',
  'staff_salaries',
  'staff_payslips',
  'staff_performance_reviews',
  'staff_disciplinary_records',
] as const;

@Injectable()
export class HrSchemaService implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger(HrSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pg_trgm;

      CREATE TABLE IF NOT EXISTS staff_departments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS staff_job_titles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        department_id uuid,
        title text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS staff_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        user_id uuid,
        staff_number text,
        display_name text NOT NULL,
        department_id uuid,
        job_title_id uuid,
        status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'pending_acceptance', 'profile_incomplete', 'pending_approval', 'active', 'on_leave', 'suspended', 'exiting', 'exited', 'archived', 'reactivated')),
        statutory_identifiers jsonb NOT NULL DEFAULT '{}'::jsonb,
        emergency_contact jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_staff_profiles_tenant_number UNIQUE (tenant_id, staff_number)
      );

      CREATE TABLE IF NOT EXISTS staff_contracts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        staff_profile_id uuid NOT NULL,
        role_title text NOT NULL,
        starts_on date NOT NULL,
        ends_on date,
        employment_type text NOT NULL,
        workload text NOT NULL,
        approval_state text NOT NULL CHECK (approval_state IN ('draft', 'approved', 'ended')),
        approved_by_user_id uuid,
        approved_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS staff_leave_balances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        staff_profile_id uuid NOT NULL,
        leave_type text NOT NULL,
        available_days numeric(8,2) NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_staff_leave_balances_tenant_staff_type UNIQUE (tenant_id, staff_profile_id, leave_type)
      );

      CREATE TABLE IF NOT EXISTS staff_leave_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        staff_profile_id uuid NOT NULL,
        leave_type text NOT NULL,
        requested_days numeric(8,2) NOT NULL,
        status text NOT NULL CHECK (status IN ('requested', 'approved', 'rejected')),
        override_reason text,
        approved_by_user_id uuid,
        approved_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS staff_documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        staff_profile_id uuid NOT NULL,
        document_type text NOT NULL,
        stored_path text NOT NULL,
        verification_status text NOT NULL DEFAULT 'pending',
        expires_on date,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS staff_document_expiry_reminders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        staff_document_id uuid NOT NULL,
        reminder_at timestamptz NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS staff_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        staff_profile_id uuid,
        actor_user_id uuid,
        action text NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS ux_staff_departments_tenant_lower_name
        ON staff_departments (tenant_id, lower(name));
      CREATE UNIQUE INDEX IF NOT EXISTS ux_staff_profiles_tenant_user
        ON staff_profiles (tenant_id, user_id)
        WHERE user_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS ix_staff_profiles_tenant_status_display_name
        ON staff_profiles (tenant_id, status, display_name, staff_number);
      CREATE INDEX IF NOT EXISTS ix_staff_profiles_display_name_trgm
        ON staff_profiles USING GIN (display_name gin_trgm_ops);

      ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'invited';
      ALTER TABLE staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_status_check;
      ALTER TABLE staff_profiles ADD CONSTRAINT staff_profiles_status_check CHECK (status IN ('invited', 'pending_acceptance', 'profile_incomplete', 'pending_approval', 'active', 'on_leave', 'suspended', 'exiting', 'exited', 'archived', 'reactivated'));
      ALTER TABLE staff_profiles ALTER COLUMN staff_number DROP NOT NULL;

      CREATE TABLE IF NOT EXISTS staff_attendance (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        staff_profile_id uuid NOT NULL,
        date date NOT NULL,
        status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'on_leave', 'sick_leave', 'off_duty', 'field_duty')),
        notes text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_staff_attendance_tenant_staff_date UNIQUE (tenant_id, staff_profile_id, date)
      );

      CREATE TABLE IF NOT EXISTS staff_payroll_bands (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        base_salary numeric(10,2) NOT NULL,
        currency text NOT NULL DEFAULT 'KES',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS staff_salaries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        staff_profile_id uuid NOT NULL,
        payroll_band_id uuid,
        custom_base_salary numeric(10,2),
        currency text NOT NULL DEFAULT 'KES',
        effective_date date NOT NULL DEFAULT CURRENT_DATE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_staff_salaries_tenant_staff UNIQUE (tenant_id, staff_profile_id)
      );

      CREATE TABLE IF NOT EXISTS staff_payslips (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        staff_profile_id uuid NOT NULL,
        month integer NOT NULL,
        year integer NOT NULL,
        base_amount numeric(10,2) NOT NULL,
        deductions numeric(10,2) NOT NULL DEFAULT 0,
        bonuses numeric(10,2) NOT NULL DEFAULT 0,
        net_pay numeric(10,2) NOT NULL,
        status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'paid', 'cancelled')),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_staff_payslips_tenant_staff_month_year UNIQUE (tenant_id, staff_profile_id, month, year)
      );

      CREATE TABLE IF NOT EXISTS staff_performance_reviews (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        staff_profile_id uuid NOT NULL,
        reviewer_id uuid NOT NULL,
        review_date date NOT NULL DEFAULT CURRENT_DATE,
        score integer NOT NULL CHECK (score >= 1 AND score <= 5),
        comments text NOT NULL,
        goals_for_next_period text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS staff_disciplinary_records (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        staff_profile_id uuid NOT NULL,
        incident_date date NOT NULL,
        severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        description text NOT NULL,
        action_taken text,
        status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'appealed')),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      ${HR_TABLES.map((table) => `
        ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS ${table}_rls_policy ON ${table};
        ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id text;
        ALTER TABLE ${table} ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS school_id text;
        UPDATE ${table}
        SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
        WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
        ALTER TABLE ${table} ALTER COLUMN tenant_id SET DEFAULT 'global';
        ALTER TABLE ${table} ALTER COLUMN tenant_id SET NOT NULL;
      `).join('\n')}

      ${HR_TABLES.map((table) => `
        ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS ${table}_rls_policy ON ${table};
        CREATE POLICY ${table}_rls_policy ON ${table}
        FOR ALL
        USING (tenant_id::text = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
      `).join('\n')}
    `);

    this.logger.log('HR staff management schema verified');
  }

  async onApplicationBootstrap(): Promise<void> {
    const tenantRows = await this.prisma.executeWithTenant('global', null, async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL row_security = on');
      await tx.$executeRawUnsafe(`SET LOCAL app.role = 'platform_owner'`);

      return tx.$queryRawUnsafe<Array<{ tenant_id: string }>>(`
        SELECT tenant.tenant_id
        FROM tenants tenant
        WHERE btrim(tenant.tenant_id) <> ''
          AND lower(btrim(tenant.tenant_id)) <> 'global'
        ORDER BY tenant.tenant_id
      `);
    });
    const tenantIds = [...new Set(
      tenantRows
        .map((row) => row.tenant_id?.trim())
        .filter((tenantId): tenantId is string =>
          typeof tenantId === 'string'
          && tenantId.length > 0
          && tenantId.toLowerCase() !== 'global'),
    )];
    let reconciledMembershipCount = 0;

    for (const tenantId of tenantIds) {
      const reconciledRows = await this.prisma.executeWithTenant(tenantId, null, async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL row_security = on');
        // Accepted staff identities are global accounts linked through a
        // tenant membership. Platform read visibility is required to resolve
        // the account name, while the projection write remains constrained by
        // the tenant GUC and the explicit membership tenant predicate below.
        await tx.$executeRawUnsafe(`SET LOCAL app.role = 'platform_owner'`);

        return tx.$queryRawUnsafe<Array<{ tenant_id: string; user_id: string }>>(`
          INSERT INTO staff_profiles (
            tenant_id,
            user_id,
            display_name,
            status,
            created_at,
            updated_at
          )
          SELECT
            $1::text,
            membership.user_id,
            COALESCE(
              NULLIF(user_account.display_name, ''),
              NULLIF(user_account.full_name, ''),
              user_account.email,
              membership.user_id::text
            ),
            'active',
            NOW(),
            NOW()
          FROM tenant_memberships membership
          JOIN users user_account
            ON user_account.id = membership.user_id
          JOIN roles role
            ON role.id = membership.role_id
           AND role.tenant_id = membership.tenant_id
          WHERE membership.tenant_id = $1
            AND membership.status = 'active'
            AND user_account.status = 'active'
            AND role.code = ANY (ARRAY[${SCHOOL_STAFF_ROLE_SQL}]::text[])
          ON CONFLICT (tenant_id, user_id)
            WHERE user_id IS NOT NULL
          DO UPDATE SET
            display_name = EXCLUDED.display_name,
            status = CASE
              WHEN staff_profiles.status IN (
                'on_leave',
                'exiting',
                'exited',
                'archived'
              ) THEN staff_profiles.status
              ELSE 'active'
            END,
            updated_at = NOW()
          RETURNING tenant_id, user_id
        `, tenantId);
      });

      reconciledMembershipCount += reconciledRows.length;
    }

    this.logger.log(
      `HR staff directory projection reconciled for ${reconciledMembershipCount} active school membership(s) across ${tenantIds.length} school tenant(s)`,
    );
  }
}
