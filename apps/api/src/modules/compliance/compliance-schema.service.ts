import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ComplianceSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(ComplianceSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS trigger AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TABLE IF NOT EXISTS consent_records (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        consent_type text NOT NULL,
        status text NOT NULL,
        policy_version text NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        captured_at timestamptz NOT NULL DEFAULT NOW(),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_consent_records_consent_type_not_blank CHECK (btrim(consent_type) <> ''),
        CONSTRAINT ck_consent_records_policy_version_not_blank CHECK (btrim(policy_version) <> ''),
        CONSTRAINT ck_consent_records_status CHECK (status IN ('granted', 'revoked', 'withdrawn')),
        CONSTRAINT uq_consent_records_tenant_id_id UNIQUE (tenant_id, id)
      );

      CREATE TABLE IF NOT EXISTS data_subject_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        requester_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        subject_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        request_type text NOT NULL,
        status text NOT NULL DEFAULT 'submitted',
        legal_basis text,
        requested_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        due_at timestamptz NOT NULL,
        completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_data_subject_requests_type CHECK (
          request_type IN (
            'access_request',
            'correction_request',
            'deletion_anonymization_request',
            'export_request',
            'objection_request'
          )
        ),
        CONSTRAINT ck_data_subject_requests_status CHECK (
          status IN ('submitted', 'identity_verification', 'in_review', 'completed', 'rejected', 'cancelled')
        ),
        CONSTRAINT uq_data_subject_requests_tenant_id_id UNIQUE (tenant_id, id)
      );

      CREATE TABLE IF NOT EXISTS data_retention_schedules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        data_category text NOT NULL,
        module_code text NOT NULL,
        retention_policy text NOT NULL,
        retention_days integer,
        legal_basis text NOT NULL,
        purge_action text NOT NULL DEFAULT 'review_then_delete',
        status text NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_data_retention_schedules_days CHECK (retention_days IS NULL OR retention_days > 0),
        CONSTRAINT ck_data_retention_schedules_status CHECK (status IN ('active', 'paused', 'retired')),
        CONSTRAINT uq_data_retention_schedules_tenant_scope UNIQUE (tenant_id, data_category, module_code)
      );

      CREATE TABLE IF NOT EXISTS child_data_dpia_records (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        module_code text NOT NULL,
        risk_level text NOT NULL,
        requires_dpia boolean NOT NULL DEFAULT TRUE,
        assessment_version text NOT NULL,
        safeguards jsonb NOT NULL DEFAULT '{}'::jsonb,
        approved_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        approved_at timestamptz,
        review_due_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_child_data_dpia_records_module CHECK (
          module_code IN ('students', 'clinic', 'biometrics', 'discipline', 'exams_report_cards', 'payments', 'sync_offline')
        ),
        CONSTRAINT ck_child_data_dpia_records_risk CHECK (risk_level IN ('medium', 'high', 'critical')),
        CONSTRAINT uq_child_data_dpia_records_tenant_module UNIQUE (tenant_id, module_code, assessment_version)
      );

      CREATE TABLE IF NOT EXISTS breach_response_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        incident_number text NOT NULL,
        severity text NOT NULL,
        status text NOT NULL DEFAULT 'open',
        detected_at timestamptz NOT NULL,
        contained_at timestamptz,
        reported_to_odpc_at timestamptz,
        affected_categories text[] NOT NULL DEFAULT ARRAY[]::text[],
        evidence_export jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_breach_response_reports_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        CONSTRAINT ck_breach_response_reports_status CHECK (status IN ('open', 'contained', 'notified', 'closed')),
        CONSTRAINT uq_breach_response_reports_tenant_incident UNIQUE (tenant_id, incident_number)
      );

      DO $$
      DECLARE
        compliance_table text;
      BEGIN
        FOREACH compliance_table IN ARRAY ARRAY[
          'consent_records',
          'data_subject_requests',
          'data_retention_schedules',
          'child_data_dpia_records',
          'breach_response_reports'
        ] LOOP
          EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', compliance_table);
          EXECUTE format('DROP POLICY IF EXISTS %I ON %I', compliance_table || '_rls_policy', compliance_table);
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id text', compliance_table);
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns c
            WHERE c.table_name = compliance_table
              AND c.column_name = 'tenant_id'
              AND c.data_type <> 'text'
          ) THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id TYPE text USING tenant_id::text', compliance_table);
          END IF;
          EXECUTE format(
            'UPDATE %I SET tenant_id = COALESCE(NULLIF(tenant_id, ''''), NULLIF(current_setting(''app.tenant_id'', true), ''''), ''00000000-0000-0000-0000-000000000000'') WHERE tenant_id IS NULL OR tenant_id = ''''',
            compliance_table
          );
          EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT ''00000000-0000-0000-0000-000000000000''', compliance_table);
          EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', compliance_table);
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT NOW()', compliance_table);
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW()', compliance_table);
        END LOOP;
      END $$;

      ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS user_id uuid;
      ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS consent_type text NOT NULL DEFAULT 'general';
      ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'granted';
      ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS policy_version text NOT NULL DEFAULT 'legacy';
      ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS captured_at timestamptz NOT NULL DEFAULT NOW();

      ALTER TABLE data_subject_requests ADD COLUMN IF NOT EXISTS requester_user_id uuid;
      ALTER TABLE data_subject_requests ADD COLUMN IF NOT EXISTS subject_user_id uuid;
      ALTER TABLE data_subject_requests ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'access_request';
      ALTER TABLE data_subject_requests ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'submitted';
      ALTER TABLE data_subject_requests ADD COLUMN IF NOT EXISTS requested_payload jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE data_subject_requests ADD COLUMN IF NOT EXISTS response_payload jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE data_subject_requests ADD COLUMN IF NOT EXISTS due_at timestamptz NOT NULL DEFAULT NOW();

      ALTER TABLE data_retention_schedules ADD COLUMN IF NOT EXISTS data_category text NOT NULL DEFAULT 'general';
      ALTER TABLE data_retention_schedules ADD COLUMN IF NOT EXISTS module_code text NOT NULL DEFAULT 'platform';
      ALTER TABLE data_retention_schedules ADD COLUMN IF NOT EXISTS retention_policy text NOT NULL DEFAULT 'review';
      ALTER TABLE data_retention_schedules ADD COLUMN IF NOT EXISTS legal_basis text NOT NULL DEFAULT 'legitimate_interest';
      ALTER TABLE data_retention_schedules ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

      ALTER TABLE child_data_dpia_records ADD COLUMN IF NOT EXISTS module_code text NOT NULL DEFAULT 'students';
      ALTER TABLE child_data_dpia_records ADD COLUMN IF NOT EXISTS risk_level text NOT NULL DEFAULT 'medium';
      ALTER TABLE child_data_dpia_records ADD COLUMN IF NOT EXISTS requires_dpia boolean NOT NULL DEFAULT TRUE;
      ALTER TABLE child_data_dpia_records ADD COLUMN IF NOT EXISTS assessment_version text NOT NULL DEFAULT 'legacy';
      ALTER TABLE child_data_dpia_records ADD COLUMN IF NOT EXISTS safeguards jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE child_data_dpia_records ADD COLUMN IF NOT EXISTS review_due_at timestamptz NOT NULL DEFAULT NOW();

      ALTER TABLE breach_response_reports ADD COLUMN IF NOT EXISTS incident_number text;
      UPDATE breach_response_reports
      SET incident_number = COALESCE(NULLIF(incident_number, ''), id::text)
      WHERE incident_number IS NULL OR incident_number = '';
      ALTER TABLE breach_response_reports ALTER COLUMN incident_number SET NOT NULL;
      ALTER TABLE breach_response_reports ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'low';
      ALTER TABLE breach_response_reports ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';
      ALTER TABLE breach_response_reports ADD COLUMN IF NOT EXISTS detected_at timestamptz NOT NULL DEFAULT NOW();
      ALTER TABLE breach_response_reports ADD COLUMN IF NOT EXISTS affected_categories text[] NOT NULL DEFAULT ARRAY[]::text[];
      ALTER TABLE breach_response_reports ADD COLUMN IF NOT EXISTS evidence_export jsonb NOT NULL DEFAULT '{}'::jsonb;

      CREATE INDEX IF NOT EXISTS ix_consent_records_tenant_user_captured_at
        ON consent_records (tenant_id, user_id, captured_at DESC);
      CREATE INDEX IF NOT EXISTS ix_consent_records_tenant_type_captured_at
        ON consent_records (tenant_id, consent_type, captured_at DESC);
      CREATE INDEX IF NOT EXISTS ix_data_subject_requests_status
        ON data_subject_requests (tenant_id, status, due_at ASC);
      CREATE INDEX IF NOT EXISTS ix_data_retention_schedules_module
        ON data_retention_schedules (tenant_id, module_code, status);
      CREATE INDEX IF NOT EXISTS ix_child_data_dpia_records_review
        ON child_data_dpia_records (tenant_id, review_due_at ASC);
      CREATE INDEX IF NOT EXISTS ix_breach_response_reports_status
        ON breach_response_reports (tenant_id, status, detected_at DESC);

      ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
      ALTER TABLE consent_records FORCE ROW LEVEL SECURITY;
      ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;
      ALTER TABLE data_subject_requests FORCE ROW LEVEL SECURITY;
      ALTER TABLE data_retention_schedules ENABLE ROW LEVEL SECURITY;
      ALTER TABLE data_retention_schedules FORCE ROW LEVEL SECURITY;
      ALTER TABLE child_data_dpia_records ENABLE ROW LEVEL SECURITY;
      ALTER TABLE child_data_dpia_records FORCE ROW LEVEL SECURITY;
      ALTER TABLE breach_response_reports ENABLE ROW LEVEL SECURITY;
      ALTER TABLE breach_response_reports FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS consent_records_rls_policy ON consent_records;
      CREATE POLICY consent_records_rls_policy ON consent_records
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS data_subject_requests_rls_policy ON data_subject_requests;
      CREATE POLICY data_subject_requests_rls_policy ON data_subject_requests
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS data_retention_schedules_rls_policy ON data_retention_schedules;
      CREATE POLICY data_retention_schedules_rls_policy ON data_retention_schedules
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS child_data_dpia_records_rls_policy ON child_data_dpia_records;
      CREATE POLICY child_data_dpia_records_rls_policy ON child_data_dpia_records
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS breach_response_reports_rls_policy ON breach_response_reports;
      CREATE POLICY breach_response_reports_rls_policy ON breach_response_reports
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP TRIGGER IF EXISTS trg_consent_records_set_updated_at ON consent_records;
      CREATE TRIGGER trg_consent_records_set_updated_at
      BEFORE UPDATE ON consent_records
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
      DROP TRIGGER IF EXISTS trg_data_subject_requests_set_updated_at ON data_subject_requests;
      CREATE TRIGGER trg_data_subject_requests_set_updated_at
      BEFORE UPDATE ON data_subject_requests
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_data_retention_schedules_set_updated_at ON data_retention_schedules;
      CREATE TRIGGER trg_data_retention_schedules_set_updated_at
      BEFORE UPDATE ON data_retention_schedules
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_child_data_dpia_records_set_updated_at ON child_data_dpia_records;
      CREATE TRIGGER trg_child_data_dpia_records_set_updated_at
      BEFORE UPDATE ON child_data_dpia_records
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_breach_response_reports_set_updated_at ON breach_response_reports;
      CREATE TRIGGER trg_breach_response_reports_set_updated_at
      BEFORE UPDATE ON breach_response_reports
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    this.logger.log('Compliance schema and consent tracking verified');
  }
}
