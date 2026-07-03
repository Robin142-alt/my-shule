
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

      
        ALTER TABLE staff_departments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE staff_departments FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS staff_departments_rls_policy ON staff_departments;
        CREATE POLICY staff_departments_rls_policy ON staff_departments
        FOR ALL
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      

        ALTER TABLE staff_job_titles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE staff_job_titles FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS staff_job_titles_rls_policy ON staff_job_titles;
        CREATE POLICY staff_job_titles_rls_policy ON staff_job_titles
        FOR ALL
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      

        ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE staff_profiles FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS staff_profiles_rls_policy ON staff_profiles;
        CREATE POLICY staff_profiles_rls_policy ON staff_profiles
        FOR ALL
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      

        ALTER TABLE staff_contracts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE staff_contracts FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS staff_contracts_rls_policy ON staff_contracts;
        CREATE POLICY staff_contracts_rls_policy ON staff_contracts
        FOR ALL
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      

        ALTER TABLE staff_leave_balances ENABLE ROW LEVEL SECURITY;
        ALTER TABLE staff_leave_balances FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS staff_leave_balances_rls_policy ON staff_leave_balances;
        CREATE POLICY staff_leave_balances_rls_policy ON staff_leave_balances
        FOR ALL
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      

        ALTER TABLE staff_leave_requests ENABLE ROW LEVEL SECURITY;
        ALTER TABLE staff_leave_requests FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS staff_leave_requests_rls_policy ON staff_leave_requests;
        CREATE POLICY staff_leave_requests_rls_policy ON staff_leave_requests
        FOR ALL
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      

        ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;
        ALTER TABLE staff_documents FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS staff_documents_rls_policy ON staff_documents;
        CREATE POLICY staff_documents_rls_policy ON staff_documents
        FOR ALL
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      

        ALTER TABLE staff_document_expiry_reminders ENABLE ROW LEVEL SECURITY;
        ALTER TABLE staff_document_expiry_reminders FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS staff_document_expiry_reminders_rls_policy ON staff_document_expiry_reminders;
        CREATE POLICY staff_document_expiry_reminders_rls_policy ON staff_document_expiry_reminders
        FOR ALL
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      

        ALTER TABLE staff_audit_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE staff_audit_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS staff_audit_logs_rls_policy ON staff_audit_logs;
        CREATE POLICY staff_audit_logs_rls_policy ON staff_audit_logs
        FOR ALL
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      

        ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
        ALTER TABLE staff_attendance FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS staff_attendance_rls_policy ON staff_attendance;
        CREATE POLICY staff_attendance_rls_policy ON staff_attendance
        FOR ALL
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      

        ALTER TABLE staff_payroll_bands ENABLE ROW LEVEL SECURITY;
        ALTER TABLE staff_payroll_bands FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS staff_payroll_bands_rls_policy ON staff_payroll_bands;
        CREATE POLICY staff_payroll_bands_rls_policy ON staff_payroll_bands
        FOR ALL
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      

        ALTER TABLE staff_salaries ENABLE ROW LEVEL SECURITY;
        ALTER TABLE staff_salaries FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS staff_salaries_rls_policy ON staff_salaries;
        CREATE POLICY staff_salaries_rls_policy ON staff_salaries
        FOR ALL
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      

        ALTER TABLE staff_payslips ENABLE ROW LEVEL SECURITY;
        ALTER TABLE staff_payslips FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS staff_payslips_rls_policy ON staff_payslips;
        CREATE POLICY staff_payslips_rls_policy ON staff_payslips
        FOR ALL
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      

        ALTER TABLE staff_performance_reviews ENABLE ROW LEVEL SECURITY;
        ALTER TABLE staff_performance_reviews FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS staff_performance_reviews_rls_policy ON staff_performance_reviews;
        CREATE POLICY staff_performance_reviews_rls_policy ON staff_performance_reviews
        FOR ALL
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      

        ALTER TABLE staff_disciplinary_records ENABLE ROW LEVEL SECURITY;
        ALTER TABLE staff_disciplinary_records FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS staff_disciplinary_records_rls_policy ON staff_disciplinary_records;
        CREATE POLICY staff_disciplinary_records_rls_policy ON staff_disciplinary_records
        FOR ALL
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      
    