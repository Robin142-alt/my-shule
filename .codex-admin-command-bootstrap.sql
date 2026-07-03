
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS admin_incidents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        title text NOT NULL,
        description text NOT NULL,
        severity text NOT NULL,
        status text NOT NULL DEFAULT 'reported',
        involved_parties jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_by uuid NOT NULL,
        reviewed_by uuid,
        resolved_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT ck_admin_incidents_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        CONSTRAINT ck_admin_incidents_status CHECK (status IN ('reported', 'reviewed', 'escalated', 'resolved'))
      );

      CREATE TABLE IF NOT EXISTS announcements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        title text NOT NULL,
        body text NOT NULL,
        channels jsonb NOT NULL DEFAULT '[]'::jsonb,
        audience jsonb NOT NULL DEFAULT '{}'::jsonb,
        status text NOT NULL DEFAULT 'draft',
        created_by uuid NOT NULL,
        published_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT ck_announcements_status CHECK (status IN ('draft', 'published', 'cancelled'))
      );

      CREATE TABLE IF NOT EXISTS meeting_minutes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        meeting_date date NOT NULL,
        title text NOT NULL,
        agenda jsonb NOT NULL DEFAULT '[]'::jsonb,
        minutes text NOT NULL,
        action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_by uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid
      );

      CREATE TABLE IF NOT EXISTS duty_rosters (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        duty_type text NOT NULL,
        duty_date date NOT NULL,
        start_time time NOT NULL,
        end_time time NOT NULL,
        assigned_user_id uuid NOT NULL,
        status text NOT NULL DEFAULT 'scheduled',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT ck_duty_rosters_type CHECK (duty_type IN ('morning', 'lunch', 'gate', 'evening', 'custom')),
        CONSTRAINT ck_duty_rosters_status CHECK (status IN ('scheduled', 'checked_in', 'missed', 'excused'))
      );

      CREATE TABLE IF NOT EXISTS boarding_allocations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        student_id uuid NOT NULL,
        bed_id uuid NOT NULL,
        status text NOT NULL DEFAULT 'active',
        created_by uuid,
        released_by uuid,
        released_at timestamptz,
        release_reason text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_boarding_allocations_status CHECK (status IN ('active', 'released', 'cancelled'))
      );

      ALTER TABLE boarding_allocations ADD COLUMN IF NOT EXISTS tenant_id text;
      ALTER TABLE boarding_allocations ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
      ALTER TABLE boarding_allocations ADD COLUMN IF NOT EXISTS school_id text;
      UPDATE boarding_allocations
      SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
      WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
      ALTER TABLE boarding_allocations ALTER COLUMN status TYPE text USING status::text;
      ALTER TABLE boarding_allocations ALTER COLUMN student_id TYPE text USING student_id::text;
      ALTER TABLE boarding_allocations ALTER COLUMN bed_id TYPE text USING bed_id::text;

      CREATE UNIQUE INDEX IF NOT EXISTS uq_boarding_allocations_active_student
        ON boarding_allocations (tenant_id, student_id)
        WHERE status = 'active';
      CREATE UNIQUE INDEX IF NOT EXISTS uq_boarding_allocations_active_bed
        ON boarding_allocations (tenant_id, bed_id)
        WHERE status = 'active';

      CREATE TABLE IF NOT EXISTS boarding_exeats (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        student_id uuid,
        student_name text NOT NULL,
        hostel text,
        leave_type text NOT NULL,
        from_date date NOT NULL,
        to_date date NOT NULL,
        guardian_name text,
        guardian_phone text,
        reason text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        requested_by uuid,
        approved_by uuid,
        rejected_by uuid,
        decision_reason text,
        checked_out_by uuid,
        checked_out_at timestamptz,
        returned_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_boarding_exeats_status CHECK (status IN ('pending', 'approved', 'rejected', 'checked_out', 'returned', 'cancelled'))
      );

      CREATE TABLE IF NOT EXISTS security_lost_found (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        item_name text NOT NULL,
        description text,
        found_location text NOT NULL,
        found_at timestamptz NOT NULL DEFAULT NOW(),
        found_by uuid,
        status text NOT NULL DEFAULT 'found',
        claimant_name text,
        verification_notes text,
        claimed_by uuid,
        claimed_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_security_lost_found_status CHECK (status IN ('found', 'claimed', 'archived'))
      );

      CREATE INDEX IF NOT EXISTS idx_security_lost_found_tenant_status
        ON security_lost_found (tenant_id, status, found_at DESC);

      CREATE TABLE IF NOT EXISTS principal_dashboard_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        enabled_module_hash text NOT NULL,
        filter_hash text NOT NULL,
        payload jsonb NOT NULL,
        generated_at timestamptz NOT NULL DEFAULT NOW(),
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        UNIQUE (tenant_id, enabled_module_hash, filter_hash)
      );

      CREATE TABLE IF NOT EXISTS principal_alerts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        module_code text NOT NULL,
        severity text NOT NULL,
        title text NOT NULL,
        message text NOT NULL,
        action_path text,
        status text NOT NULL DEFAULT 'open',
        source_entity_type text,
        source_entity_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT ck_principal_alerts_severity CHECK (severity IN ('info', 'warning', 'critical')),
        CONSTRAINT ck_principal_alerts_status CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed'))
      );

      CREATE TABLE IF NOT EXISTS communication_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        type text NOT NULL,
        subject text,
        body text NOT NULL,
        variables jsonb NOT NULL DEFAULT '[]'::jsonb,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_by uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_communication_templates_type CHECK (type IN ('email', 'sms', 'push', 'letter')),
        CONSTRAINT uq_communication_templates_tenant_name UNIQUE (tenant_id, name)
      );

      CREATE TABLE IF NOT EXISTS report_schedule_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        title text NOT NULL,
        schedule text NOT NULL,
        status text NOT NULL DEFAULT 'scheduled',
        requested_by uuid,
        next_run_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_report_schedule_requests_status CHECK (status IN ('scheduled', 'paused', 'cancelled', 'failed'))
      );

      
        ALTER TABLE admin_incidents DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS admin_incidents_tenant_policy ON admin_incidents;
        ALTER TABLE admin_incidents ADD COLUMN IF NOT EXISTS tenant_id text;
        ALTER TABLE admin_incidents ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        ALTER TABLE admin_incidents ADD COLUMN IF NOT EXISTS school_id text;
        UPDATE admin_incidents
        SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
        WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
        ALTER TABLE admin_incidents ALTER COLUMN tenant_id SET DEFAULT 'global';
        ALTER TABLE admin_incidents ALTER COLUMN tenant_id SET NOT NULL;
      

        ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS announcements_tenant_policy ON announcements;
        ALTER TABLE announcements ADD COLUMN IF NOT EXISTS tenant_id text;
        ALTER TABLE announcements ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        ALTER TABLE announcements ADD COLUMN IF NOT EXISTS school_id text;
        UPDATE announcements
        SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
        WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
        ALTER TABLE announcements ALTER COLUMN tenant_id SET DEFAULT 'global';
        ALTER TABLE announcements ALTER COLUMN tenant_id SET NOT NULL;
      

        ALTER TABLE meeting_minutes DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS meeting_minutes_tenant_policy ON meeting_minutes;
        ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS tenant_id text;
        ALTER TABLE meeting_minutes ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        ALTER TABLE meeting_minutes ADD COLUMN IF NOT EXISTS school_id text;
        UPDATE meeting_minutes
        SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
        WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
        ALTER TABLE meeting_minutes ALTER COLUMN tenant_id SET DEFAULT 'global';
        ALTER TABLE meeting_minutes ALTER COLUMN tenant_id SET NOT NULL;
      

        ALTER TABLE duty_rosters DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS duty_rosters_tenant_policy ON duty_rosters;
        ALTER TABLE duty_rosters ADD COLUMN IF NOT EXISTS tenant_id text;
        ALTER TABLE duty_rosters ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        ALTER TABLE duty_rosters ADD COLUMN IF NOT EXISTS school_id text;
        UPDATE duty_rosters
        SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
        WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
        ALTER TABLE duty_rosters ALTER COLUMN tenant_id SET DEFAULT 'global';
        ALTER TABLE duty_rosters ALTER COLUMN tenant_id SET NOT NULL;
      

        ALTER TABLE principal_dashboard_snapshots DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS principal_dashboard_snapshots_tenant_policy ON principal_dashboard_snapshots;
        ALTER TABLE principal_dashboard_snapshots ADD COLUMN IF NOT EXISTS tenant_id text;
        ALTER TABLE principal_dashboard_snapshots ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        ALTER TABLE principal_dashboard_snapshots ADD COLUMN IF NOT EXISTS school_id text;
        UPDATE principal_dashboard_snapshots
        SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
        WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
        ALTER TABLE principal_dashboard_snapshots ALTER COLUMN tenant_id SET DEFAULT 'global';
        ALTER TABLE principal_dashboard_snapshots ALTER COLUMN tenant_id SET NOT NULL;
      

        ALTER TABLE principal_alerts DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS principal_alerts_tenant_policy ON principal_alerts;
        ALTER TABLE principal_alerts ADD COLUMN IF NOT EXISTS tenant_id text;
        ALTER TABLE principal_alerts ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        ALTER TABLE principal_alerts ADD COLUMN IF NOT EXISTS school_id text;
        UPDATE principal_alerts
        SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
        WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
        ALTER TABLE principal_alerts ALTER COLUMN tenant_id SET DEFAULT 'global';
        ALTER TABLE principal_alerts ALTER COLUMN tenant_id SET NOT NULL;
      

        ALTER TABLE communication_templates DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS communication_templates_tenant_policy ON communication_templates;
        ALTER TABLE communication_templates ADD COLUMN IF NOT EXISTS tenant_id text;
        ALTER TABLE communication_templates ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        ALTER TABLE communication_templates ADD COLUMN IF NOT EXISTS school_id text;
        UPDATE communication_templates
        SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
        WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
        ALTER TABLE communication_templates ALTER COLUMN tenant_id SET DEFAULT 'global';
        ALTER TABLE communication_templates ALTER COLUMN tenant_id SET NOT NULL;
      

        ALTER TABLE boarding_allocations DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS boarding_allocations_tenant_policy ON boarding_allocations;
        ALTER TABLE boarding_allocations ADD COLUMN IF NOT EXISTS tenant_id text;
        ALTER TABLE boarding_allocations ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        ALTER TABLE boarding_allocations ADD COLUMN IF NOT EXISTS school_id text;
        UPDATE boarding_allocations
        SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
        WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
        ALTER TABLE boarding_allocations ALTER COLUMN tenant_id SET DEFAULT 'global';
        ALTER TABLE boarding_allocations ALTER COLUMN tenant_id SET NOT NULL;
      

        ALTER TABLE boarding_exeats DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS boarding_exeats_tenant_policy ON boarding_exeats;
        ALTER TABLE boarding_exeats ADD COLUMN IF NOT EXISTS tenant_id text;
        ALTER TABLE boarding_exeats ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        ALTER TABLE boarding_exeats ADD COLUMN IF NOT EXISTS school_id text;
        UPDATE boarding_exeats
        SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
        WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
        ALTER TABLE boarding_exeats ALTER COLUMN tenant_id SET DEFAULT 'global';
        ALTER TABLE boarding_exeats ALTER COLUMN tenant_id SET NOT NULL;
      

        ALTER TABLE security_lost_found DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS security_lost_found_tenant_policy ON security_lost_found;
        ALTER TABLE security_lost_found ADD COLUMN IF NOT EXISTS tenant_id text;
        ALTER TABLE security_lost_found ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        ALTER TABLE security_lost_found ADD COLUMN IF NOT EXISTS school_id text;
        UPDATE security_lost_found
        SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
        WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
        ALTER TABLE security_lost_found ALTER COLUMN tenant_id SET DEFAULT 'global';
        ALTER TABLE security_lost_found ALTER COLUMN tenant_id SET NOT NULL;
      

        ALTER TABLE report_schedule_requests DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS report_schedule_requests_tenant_policy ON report_schedule_requests;
        ALTER TABLE report_schedule_requests ADD COLUMN IF NOT EXISTS tenant_id text;
        ALTER TABLE report_schedule_requests ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        ALTER TABLE report_schedule_requests ADD COLUMN IF NOT EXISTS school_id text;
        UPDATE report_schedule_requests
        SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
        WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
        ALTER TABLE report_schedule_requests ALTER COLUMN tenant_id SET DEFAULT 'global';
        ALTER TABLE report_schedule_requests ALTER COLUMN tenant_id SET NOT NULL;
      

      ALTER TABLE boarding_allocations ALTER COLUMN status TYPE text USING status::text;
      ALTER TABLE boarding_allocations ALTER COLUMN student_id TYPE text USING student_id::text;
      ALTER TABLE boarding_allocations ALTER COLUMN bed_id TYPE text USING bed_id::text;

      CREATE INDEX IF NOT EXISTS ix_admin_incidents_queue
        ON admin_incidents (tenant_id, status, severity, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_announcements_status
        ON announcements (tenant_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_meeting_minutes_date
        ON meeting_minutes (tenant_id, meeting_date DESC);
      CREATE INDEX IF NOT EXISTS ix_duty_rosters_date
        ON duty_rosters (tenant_id, duty_date, status);
      CREATE INDEX IF NOT EXISTS ix_boarding_exeats_status
        ON boarding_exeats (tenant_id, status, from_date DESC, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_principal_dashboard_snapshots_expiry
        ON principal_dashboard_snapshots (tenant_id, enabled_module_hash, filter_hash, expires_at DESC);
      CREATE INDEX IF NOT EXISTS ix_principal_alerts_status
        ON principal_alerts (tenant_id, status, severity, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_report_schedule_requests_status
        ON report_schedule_requests (tenant_id, status, created_at DESC);
    