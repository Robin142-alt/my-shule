
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS trigger AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      
  CREATE TABLE IF NOT EXISTS file_objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id text NOT NULL,
    storage_path text NOT NULL,
    original_file_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    sha256 text NOT NULL,
    content bytea,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    storage_backend text NOT NULL DEFAULT 'database',
    object_storage_provider text,
    object_storage_bucket text,
    object_storage_key text,
    object_storage_etag text,
    retention_policy text NOT NULL DEFAULT 'operational',
    retention_expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_file_objects_tenant_path UNIQUE (tenant_id, storage_path),
    CONSTRAINT ck_file_objects_size CHECK (size_bytes >= 0),
    CONSTRAINT ck_file_objects_sha256 CHECK (sha256 ~ '^[a-f0-9]{64}$'),
    CONSTRAINT ck_file_objects_storage_backend CHECK (storage_backend IN ('database', 'object_storage')),
    CONSTRAINT ck_file_objects_database_content CHECK (
      (storage_backend = 'database' AND content IS NOT NULL)
      OR storage_backend = 'object_storage'
    ),
    CONSTRAINT ck_file_objects_object_storage_metadata CHECK (
      storage_backend = 'database'
      OR (
        object_storage_provider IS NOT NULL
        AND object_storage_bucket IS NOT NULL
        AND object_storage_key IS NOT NULL
      )
    )
  );

  ALTER TABLE file_objects ALTER COLUMN content DROP NOT NULL;
  ALTER TABLE file_objects ADD COLUMN IF NOT EXISTS storage_backend text NOT NULL DEFAULT 'database';
  ALTER TABLE file_objects ADD COLUMN IF NOT EXISTS object_storage_provider text;
  ALTER TABLE file_objects ADD COLUMN IF NOT EXISTS object_storage_bucket text;
  ALTER TABLE file_objects ADD COLUMN IF NOT EXISTS object_storage_key text;
  ALTER TABLE file_objects ADD COLUMN IF NOT EXISTS object_storage_etag text;
  ALTER TABLE file_objects ADD COLUMN IF NOT EXISTS retention_policy text NOT NULL DEFAULT 'operational';
  ALTER TABLE file_objects ADD COLUMN IF NOT EXISTS retention_expires_at timestamptz;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'ck_file_objects_storage_backend'
    ) THEN
      ALTER TABLE file_objects ADD CONSTRAINT ck_file_objects_storage_backend
        CHECK (storage_backend IN ('database', 'object_storage'));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'ck_file_objects_database_content'
    ) THEN
      ALTER TABLE file_objects ADD CONSTRAINT ck_file_objects_database_content
        CHECK (
          (storage_backend = 'database' AND content IS NOT NULL)
          OR storage_backend = 'object_storage'
        );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'ck_file_objects_object_storage_metadata'
    ) THEN
      ALTER TABLE file_objects ADD CONSTRAINT ck_file_objects_object_storage_metadata
        CHECK (
          storage_backend = 'database'
          OR (
            object_storage_provider IS NOT NULL
            AND object_storage_bucket IS NOT NULL
            AND object_storage_key IS NOT NULL
          )
        );
    END IF;
  END $$;

  CREATE INDEX IF NOT EXISTS ix_file_objects_tenant_created
    ON file_objects (tenant_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS ix_file_objects_sha256
    ON file_objects (sha256);
  CREATE INDEX IF NOT EXISTS ix_file_objects_retention_expiry
    ON file_objects (retention_expires_at)
    WHERE retention_expires_at IS NOT NULL;

  ALTER TABLE file_objects ENABLE ROW LEVEL SECURITY;
  ALTER TABLE file_objects FORCE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS file_objects_rls_policy ON file_objects;
  CREATE POLICY file_objects_rls_policy ON file_objects
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)
    OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)
    OR current_setting('app.role', true) IN ('platform_owner', 'superadmin', 'support_agent', 'support_lead', 'developer', 'system')
  );

  DROP TRIGGER IF EXISTS trg_file_objects_set_updated_at ON file_objects;
  CREATE TRIGGER trg_file_objects_set_updated_at
  BEFORE UPDATE ON file_objects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


      CREATE TABLE IF NOT EXISTS admission_applications (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        application_number text NOT NULL,
        full_name text NOT NULL,
        date_of_birth date NOT NULL,
        gender text NOT NULL,
        birth_certificate_number text NOT NULL,
        nationality text NOT NULL,
        previous_school text,
        kcpe_results text,
        cbc_level text,
        nemis_upi text,
        class_applying text NOT NULL,
        parent_name text NOT NULL,
        parent_phone text NOT NULL,
        parent_email text,
        parent_occupation text,
        relationship text NOT NULL,
        allergies text,
        conditions text,
        emergency_contact text,
        status text NOT NULL DEFAULT 'pending',
        interview_date date,
        review_notes text,
        approved_at timestamptz,
        admitted_student_id text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_admission_applications_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_admission_applications_number UNIQUE (tenant_id, application_number)
      );

      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS nemis_upi text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS school_id text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS first_name text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS middle_name text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS last_name text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS guardian_name text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS guardian_phone text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS guardian_email text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS guardian_occupation text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS guardian_relationship text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS applying_for_class_id text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS application_status text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS tenant_id text;
      UPDATE admission_applications
      SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
      WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
      ALTER TABLE admission_applications ALTER COLUMN tenant_id SET DEFAULT 'global';
      ALTER TABLE admission_applications ALTER COLUMN tenant_id SET NOT NULL;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS full_name text;
      UPDATE admission_applications
      SET full_name = btrim(CONCAT_WS(' ', first_name, middle_name, last_name))
      WHERE full_name IS NULL OR btrim(full_name) = '';
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS parent_name text;
      UPDATE admission_applications SET parent_name = guardian_name WHERE (parent_name IS NULL OR btrim(parent_name) = '') AND guardian_name IS NOT NULL;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS parent_phone text;
      UPDATE admission_applications SET parent_phone = guardian_phone WHERE (parent_phone IS NULL OR btrim(parent_phone) = '') AND guardian_phone IS NOT NULL;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS parent_email text;
      UPDATE admission_applications SET parent_email = guardian_email WHERE (parent_email IS NULL OR btrim(parent_email) = '') AND guardian_email IS NOT NULL;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS parent_occupation text;
      UPDATE admission_applications SET parent_occupation = guardian_occupation WHERE (parent_occupation IS NULL OR btrim(parent_occupation) = '') AND guardian_occupation IS NOT NULL;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS relationship text;
      UPDATE admission_applications SET relationship = COALESCE(NULLIF(guardian_relationship, ''), 'Guardian') WHERE relationship IS NULL OR btrim(relationship) = '';
      ALTER TABLE admission_applications ALTER COLUMN relationship SET DEFAULT 'Guardian';
      ALTER TABLE admission_applications ALTER COLUMN relationship SET NOT NULL;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS class_applying text;
      UPDATE admission_applications SET class_applying = COALESCE(NULLIF(applying_for_class_id, ''), 'Unassigned') WHERE class_applying IS NULL OR btrim(class_applying) = '';
      ALTER TABLE admission_applications ALTER COLUMN class_applying SET DEFAULT 'Unassigned';
      ALTER TABLE admission_applications ALTER COLUMN class_applying SET NOT NULL;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS status text;
      UPDATE admission_applications SET status = COALESCE(NULLIF(lower(application_status::text), ''), 'pending') WHERE status IS NULL OR btrim(status) = '';
      ALTER TABLE admission_applications ALTER COLUMN status SET DEFAULT 'pending';
      ALTER TABLE admission_applications ALTER COLUMN status SET NOT NULL;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS nationality text;
      UPDATE admission_applications SET nationality = 'Kenyan' WHERE nationality IS NULL OR btrim(nationality) = '';
      ALTER TABLE admission_applications ALTER COLUMN nationality SET DEFAULT 'Kenyan';
      ALTER TABLE admission_applications ALTER COLUMN nationality SET NOT NULL;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS previous_school text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS kcpe_results text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS cbc_level text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS allergies text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS conditions text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS emergency_contact text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS birth_certificate_number text;
      UPDATE admission_applications SET birth_certificate_number = id WHERE birth_certificate_number IS NULL OR btrim(birth_certificate_number) = '';
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS interview_date date;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS review_notes text;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS approved_at timestamptz;
      ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS admitted_student_id text;
      ALTER TABLE admission_applications ALTER COLUMN admitted_student_id TYPE text USING admitted_student_id::text;
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_admission_applications_tenant_id_id') THEN
          ALTER TABLE admission_applications
            ADD CONSTRAINT uq_admission_applications_tenant_id_id UNIQUE (tenant_id, id);
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS admission_documents (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        application_id text,
        student_id text,
        document_type text NOT NULL,
        original_file_name text NOT NULL,
        stored_path text NOT NULL,
        mime_type text NOT NULL,
        size_bytes bigint NOT NULL,
        verification_status text NOT NULL DEFAULT 'pending',
        uploaded_by_user_id uuid,
        verified_by_user_id uuid,
        verified_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_admission_documents_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_admission_documents_application
          FOREIGN KEY (tenant_id, application_id)
          REFERENCES admission_applications (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_admission_documents_student
          FOREIGN KEY (tenant_id, student_id)
          REFERENCES students (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS student_allocations (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        student_id text NOT NULL,
        class_name text NOT NULL,
        stream_name text NOT NULL,
        dormitory_name text,
        transport_route text,
        effective_from date NOT NULL,
        is_current boolean NOT NULL DEFAULT TRUE,
        notes text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_student_allocations_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_student_allocations_student
          FOREIGN KEY (tenant_id, student_id)
          REFERENCES students (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS student_transfer_records (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        student_id text,
        application_id text,
        transfer_type text NOT NULL,
        school_name text NOT NULL,
        reason text NOT NULL,
        requested_on date NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        notes text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_student_transfers_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_student_transfer_student
          FOREIGN KEY (tenant_id, student_id)
          REFERENCES students (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_student_transfer_application
          FOREIGN KEY (tenant_id, application_id)
          REFERENCES admission_applications (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS academic_class_sections (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        class_name text NOT NULL,
        stream_name text NOT NULL,
        academic_year text NOT NULL,
        capacity integer,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_academic_class_sections_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_academic_class_sections_class_stream_year UNIQUE (tenant_id, class_name, stream_name, academic_year),
        CONSTRAINT ck_academic_class_sections_class_not_blank CHECK (btrim(class_name) <> ''),
        CONSTRAINT ck_academic_class_sections_stream_not_blank CHECK (btrim(stream_name) <> ''),
        CONSTRAINT ck_academic_class_sections_year_not_blank CHECK (btrim(academic_year) <> ''),
        CONSTRAINT ck_academic_class_sections_capacity CHECK (capacity IS NULL OR capacity > 0)
      );

      CREATE TABLE IF NOT EXISTS student_academic_enrollments (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        student_id text NOT NULL,
        application_id text NOT NULL,
        class_section_id text,
        class_name text NOT NULL,
        stream_name text NOT NULL,
        academic_year text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        enrolled_at timestamptz NOT NULL DEFAULT NOW(),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_student_academic_enrollments_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_student_academic_enrollments_student_year UNIQUE (tenant_id, student_id, academic_year),
        CONSTRAINT ck_student_academic_enrollments_class_not_blank CHECK (btrim(class_name) <> ''),
        CONSTRAINT ck_student_academic_enrollments_stream_not_blank CHECK (btrim(stream_name) <> ''),
        CONSTRAINT ck_student_academic_enrollments_year_not_blank CHECK (btrim(academic_year) <> ''),
        CONSTRAINT ck_student_academic_enrollments_status CHECK (status IN ('active', 'completed', 'transferred', 'withdrawn')),
        CONSTRAINT fk_student_academic_enrollments_student
          FOREIGN KEY (tenant_id, student_id)
          REFERENCES students (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_student_academic_enrollments_application
          FOREIGN KEY (tenant_id, application_id)
          REFERENCES admission_applications (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_student_academic_enrollments_section
          FOREIGN KEY (tenant_id, class_section_id)
          REFERENCES academic_class_sections (tenant_id, id)
          ON DELETE SET NULL (class_section_id)
      );

      CREATE TABLE IF NOT EXISTS student_academic_lifecycle_events (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        student_id text NOT NULL,
        source_enrollment_id text NOT NULL,
        target_enrollment_id text,
        event_type text NOT NULL,
        from_class_name text NOT NULL,
        from_stream_name text NOT NULL,
        from_academic_year text NOT NULL,
        to_class_section_id text,
        to_class_name text,
        to_stream_name text,
        to_academic_year text,
        reason text NOT NULL,
        notes text,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_student_academic_lifecycle_events_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_student_academic_lifecycle_events_type CHECK (event_type IN ('promotion', 'graduation', 'archive')),
        CONSTRAINT ck_student_academic_lifecycle_events_from_class CHECK (btrim(from_class_name) <> ''),
        CONSTRAINT ck_student_academic_lifecycle_events_from_stream CHECK (btrim(from_stream_name) <> ''),
        CONSTRAINT ck_student_academic_lifecycle_events_from_year CHECK (btrim(from_academic_year) <> ''),
        CONSTRAINT ck_student_academic_lifecycle_events_reason CHECK (btrim(reason) <> ''),
        CONSTRAINT fk_student_academic_lifecycle_events_student
          FOREIGN KEY (tenant_id, student_id)
          REFERENCES students (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_student_academic_lifecycle_events_source_enrollment
          FOREIGN KEY (tenant_id, source_enrollment_id)
          REFERENCES student_academic_enrollments (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_student_academic_lifecycle_events_target_enrollment
          FOREIGN KEY (tenant_id, target_enrollment_id)
          REFERENCES student_academic_enrollments (tenant_id, id)
          ON DELETE SET NULL (target_enrollment_id),
        CONSTRAINT fk_student_academic_lifecycle_events_target_section
          FOREIGN KEY (tenant_id, to_class_section_id)
          REFERENCES academic_class_sections (tenant_id, id)
          ON DELETE SET NULL (to_class_section_id)
      );

      CREATE TABLE IF NOT EXISTS academic_subject_offerings (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        class_section_id text NOT NULL,
        subject_code text NOT NULL,
        subject_name text NOT NULL,
        teacher_user_id uuid,
        is_compulsory boolean NOT NULL DEFAULT TRUE,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_academic_subject_offerings_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_academic_subject_offerings_section_subject UNIQUE (tenant_id, class_section_id, subject_code),
        CONSTRAINT ck_academic_subject_offerings_code_not_blank CHECK (btrim(subject_code) <> ''),
        CONSTRAINT ck_academic_subject_offerings_name_not_blank CHECK (btrim(subject_name) <> ''),
        CONSTRAINT fk_academic_subject_offerings_section
          FOREIGN KEY (tenant_id, class_section_id)
          REFERENCES academic_class_sections (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_academic_subject_offerings_teacher
          FOREIGN KEY (teacher_user_id)
          REFERENCES users (id)
          ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS student_subject_enrollments (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        student_id text NOT NULL,
        academic_enrollment_id text NOT NULL,
        subject_offering_id text NOT NULL,
        subject_code text NOT NULL,
        subject_name text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        enrolled_at timestamptz NOT NULL DEFAULT NOW(),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_student_subject_enrollments_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_student_subject_enrollments_student_offering UNIQUE (tenant_id, student_id, subject_offering_id),
        CONSTRAINT ck_student_subject_enrollments_code_not_blank CHECK (btrim(subject_code) <> ''),
        CONSTRAINT ck_student_subject_enrollments_name_not_blank CHECK (btrim(subject_name) <> ''),
        CONSTRAINT ck_student_subject_enrollments_status CHECK (status IN ('active', 'completed', 'dropped')),
        CONSTRAINT fk_student_subject_enrollments_student
          FOREIGN KEY (tenant_id, student_id)
          REFERENCES students (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_student_subject_enrollments_academic
          FOREIGN KEY (tenant_id, academic_enrollment_id)
          REFERENCES student_academic_enrollments (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_student_subject_enrollments_offering
          FOREIGN KEY (tenant_id, subject_offering_id)
          REFERENCES academic_subject_offerings (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS academic_timetable_slots (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        class_section_id text NOT NULL,
        subject_offering_id text,
        day_of_week text NOT NULL,
        starts_at text NOT NULL,
        ends_at text NOT NULL,
        subject_name text NOT NULL,
        room_name text,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_academic_timetable_slots_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_academic_timetable_slots_day CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
        CONSTRAINT ck_academic_timetable_slots_start CHECK (starts_at ~ '^[0-2][0-9]:[0-5][0-9]$'),
        CONSTRAINT ck_academic_timetable_slots_end CHECK (ends_at ~ '^[0-2][0-9]:[0-5][0-9]$'),
        CONSTRAINT ck_academic_timetable_slots_subject_not_blank CHECK (btrim(subject_name) <> ''),
        CONSTRAINT fk_academic_timetable_slots_section
          FOREIGN KEY (tenant_id, class_section_id)
          REFERENCES academic_class_sections (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_academic_timetable_slots_subject
          FOREIGN KEY (tenant_id, subject_offering_id)
          REFERENCES academic_subject_offerings (tenant_id, id)
          ON DELETE SET NULL (subject_offering_id)
      );

      CREATE TABLE IF NOT EXISTS student_timetable_enrollments (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        student_id text NOT NULL,
        academic_enrollment_id text NOT NULL,
        timetable_slot_id text NOT NULL,
        day_of_week text NOT NULL,
        starts_at text NOT NULL,
        ends_at text NOT NULL,
        subject_name text NOT NULL,
        room_name text,
        status text NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_student_timetable_enrollments_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_student_timetable_enrollments_student_slot UNIQUE (tenant_id, student_id, timetable_slot_id),
        CONSTRAINT ck_student_timetable_enrollments_day CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
        CONSTRAINT ck_student_timetable_enrollments_start CHECK (starts_at ~ '^[0-2][0-9]:[0-5][0-9]$'),
        CONSTRAINT ck_student_timetable_enrollments_end CHECK (ends_at ~ '^[0-2][0-9]:[0-5][0-9]$'),
        CONSTRAINT ck_student_timetable_enrollments_subject_not_blank CHECK (btrim(subject_name) <> ''),
        CONSTRAINT ck_student_timetable_enrollments_status CHECK (status IN ('active', 'completed', 'dropped')),
        CONSTRAINT fk_student_timetable_enrollments_student
          FOREIGN KEY (tenant_id, student_id)
          REFERENCES students (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_student_timetable_enrollments_academic
          FOREIGN KEY (tenant_id, academic_enrollment_id)
          REFERENCES student_academic_enrollments (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_student_timetable_enrollments_slot
          FOREIGN KEY (tenant_id, timetable_slot_id)
          REFERENCES academic_timetable_slots (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS student_fee_structures (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        class_name text NOT NULL,
        academic_year text NOT NULL,
        term_name text NOT NULL,
        description text NOT NULL,
        currency_code text NOT NULL DEFAULT 'KES',
        amount_minor bigint NOT NULL,
        due_days_after_registration integer NOT NULL DEFAULT 14,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_student_fee_structures_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_student_fee_structures_class_term UNIQUE (tenant_id, class_name, academic_year, term_name),
        CONSTRAINT ck_student_fee_structures_class_not_blank CHECK (btrim(class_name) <> ''),
        CONSTRAINT ck_student_fee_structures_year_not_blank CHECK (btrim(academic_year) <> ''),
        CONSTRAINT ck_student_fee_structures_term_not_blank CHECK (btrim(term_name) <> ''),
        CONSTRAINT ck_student_fee_structures_description_not_blank CHECK (btrim(description) <> ''),
        CONSTRAINT ck_student_fee_structures_currency CHECK (currency_code ~ '^[A-Z]{3}$'),
        CONSTRAINT ck_student_fee_structures_amount_positive CHECK (amount_minor > 0),
        CONSTRAINT ck_student_fee_structures_due_days CHECK (due_days_after_registration BETWEEN 0 AND 180)
      );

      CREATE TABLE IF NOT EXISTS student_fee_assignments (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        student_id text NOT NULL,
        application_id text NOT NULL,
        fee_structure_id text NOT NULL,
        status text NOT NULL DEFAULT 'assigned',
        amount_minor bigint NOT NULL,
        currency_code text NOT NULL DEFAULT 'KES',
        assigned_at timestamptz NOT NULL DEFAULT NOW(),
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_student_fee_assignments_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_student_fee_assignments_student_structure UNIQUE (tenant_id, student_id, fee_structure_id),
        CONSTRAINT ck_student_fee_assignments_status CHECK (status IN ('assigned', 'waived', 'voided')),
        CONSTRAINT ck_student_fee_assignments_amount_positive CHECK (amount_minor > 0),
        CONSTRAINT ck_student_fee_assignments_currency CHECK (currency_code ~ '^[A-Z]{3}$'),
        CONSTRAINT fk_student_fee_assignments_student
          FOREIGN KEY (tenant_id, student_id)
          REFERENCES students (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_student_fee_assignments_application
          FOREIGN KEY (tenant_id, application_id)
          REFERENCES admission_applications (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_student_fee_assignments_structure
          FOREIGN KEY (tenant_id, fee_structure_id)
          REFERENCES student_fee_structures (tenant_id, id)
          ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS student_fee_invoices (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        assignment_id text NOT NULL,
        student_id text NOT NULL,
        invoice_number text NOT NULL,
        status text NOT NULL DEFAULT 'open',
        description text NOT NULL,
        currency_code text NOT NULL DEFAULT 'KES',
        amount_due_minor bigint NOT NULL,
        amount_paid_minor bigint NOT NULL DEFAULT 0,
        issued_date date NOT NULL DEFAULT CURRENT_DATE,
        due_date date NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_student_fee_invoices_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_student_fee_invoices_assignment UNIQUE (tenant_id, assignment_id),
        CONSTRAINT uq_student_fee_invoices_number UNIQUE (tenant_id, invoice_number),
        CONSTRAINT ck_student_fee_invoices_status CHECK (status IN ('open', 'pending_payment', 'paid', 'voided')),
        CONSTRAINT ck_student_fee_invoices_description_not_blank CHECK (btrim(description) <> ''),
        CONSTRAINT ck_student_fee_invoices_currency CHECK (currency_code ~ '^[A-Z]{3}$'),
        CONSTRAINT ck_student_fee_invoices_amount_due_positive CHECK (amount_due_minor > 0),
        CONSTRAINT ck_student_fee_invoices_amount_paid_non_negative CHECK (amount_paid_minor >= 0),
        CONSTRAINT fk_student_fee_invoices_assignment
          FOREIGN KEY (tenant_id, assignment_id)
          REFERENCES student_fee_assignments (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_student_fee_invoices_student
          FOREIGN KEY (tenant_id, student_id)
          REFERENCES students (tenant_id, id)
          ON DELETE CASCADE
      );

      DO $$
      DECLARE
        target_table text;
        policy_record record;
      BEGIN
        FOREACH target_table IN ARRAY ARRAY[
          'admission_documents',
          'student_allocations',
          'student_transfer_records',
          'student_academic_enrollments',
          'student_academic_lifecycle_events',
          'student_subject_enrollments',
          'student_timetable_enrollments',
          'student_fee_assignments',
          'student_fee_invoices'
        ] LOOP
          IF to_regclass(format('public.%I', target_table)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', target_table);

            FOR policy_record IN
              SELECT policyname
              FROM pg_policies
              WHERE schemaname = 'public'
                AND tablename = target_table
            LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, target_table);
            END LOOP;

            FOR policy_record IN
              SELECT c.conname
              FROM pg_constraint c
              JOIN pg_attribute a
                ON a.attrelid = c.conrelid
               AND a.attnum = ANY (c.conkey)
              WHERE c.conrelid = format('public.%I', target_table)::regclass
                AND c.contype = 'f'
                AND a.attname = 'student_id'
            LOOP
              EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', target_table, policy_record.conname);
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
                AND column_name = 'school_id'
            ) THEN
              EXECUTE format(
                'UPDATE %I SET tenant_id = COALESCE(NULLIF(tenant_id, ''''), school_id::text, ''global'') WHERE tenant_id IS NULL OR btrim(tenant_id) = ''''',
                target_table
              );
            ELSE
              EXECUTE format(
                'UPDATE %I SET tenant_id = ''global'' WHERE tenant_id IS NULL OR btrim(tenant_id) = ''''',
                target_table
              );
            END IF;

            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT ''global''', target_table);
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', target_table);

            IF target_table = 'admission_documents' THEN
              ALTER TABLE admission_documents ADD COLUMN IF NOT EXISTS student_id text;
              ALTER TABLE admission_documents ADD COLUMN IF NOT EXISTS file_url text;
              ALTER TABLE admission_documents ADD COLUMN IF NOT EXISTS status text;
              ALTER TABLE admission_documents ADD COLUMN IF NOT EXISTS original_file_name text;
              UPDATE admission_documents
              SET original_file_name = COALESCE(NULLIF(original_file_name, ''), split_part(file_url, '/', array_length(string_to_array(file_url, '/'), 1)), id)
              WHERE original_file_name IS NULL OR btrim(original_file_name) = '';
              ALTER TABLE admission_documents ALTER COLUMN original_file_name SET DEFAULT 'document';
              ALTER TABLE admission_documents ALTER COLUMN original_file_name SET NOT NULL;
              ALTER TABLE admission_documents ADD COLUMN IF NOT EXISTS stored_path text;
              UPDATE admission_documents
              SET stored_path = COALESCE(NULLIF(stored_path, ''), file_url, id)
              WHERE stored_path IS NULL OR btrim(stored_path) = '';
              ALTER TABLE admission_documents ALTER COLUMN stored_path SET NOT NULL;
              ALTER TABLE admission_documents ADD COLUMN IF NOT EXISTS mime_type text;
              UPDATE admission_documents
              SET mime_type = 'application/octet-stream'
              WHERE mime_type IS NULL OR btrim(mime_type) = '';
              ALTER TABLE admission_documents ALTER COLUMN mime_type SET DEFAULT 'application/octet-stream';
              ALTER TABLE admission_documents ALTER COLUMN mime_type SET NOT NULL;
              ALTER TABLE admission_documents ADD COLUMN IF NOT EXISTS size_bytes bigint DEFAULT 0;
              UPDATE admission_documents SET size_bytes = 0 WHERE size_bytes IS NULL;
              ALTER TABLE admission_documents ALTER COLUMN size_bytes SET NOT NULL;
              ALTER TABLE admission_documents ADD COLUMN IF NOT EXISTS verification_status text;
              UPDATE admission_documents
              SET verification_status = COALESCE(NULLIF(status::text, ''), 'pending')
              WHERE verification_status IS NULL OR btrim(verification_status) = '';
              ALTER TABLE admission_documents ALTER COLUMN verification_status SET DEFAULT 'pending';
              ALTER TABLE admission_documents ALTER COLUMN verification_status SET NOT NULL;
              ALTER TABLE admission_documents ADD COLUMN IF NOT EXISTS uploaded_by_user_id uuid;
              ALTER TABLE admission_documents ADD COLUMN IF NOT EXISTS verified_at timestamptz;
              ALTER TABLE admission_documents ALTER COLUMN application_id TYPE text USING application_id::text;
              ALTER TABLE admission_documents ALTER COLUMN document_type TYPE text USING document_type::text;
              ALTER TABLE admission_documents ALTER COLUMN verification_status TYPE text USING verification_status::text;
            END IF;

            IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = target_table
                AND column_name = 'tenant_id'
            ) THEN
              EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id TYPE text USING tenant_id::text', target_table);
            END IF;

            IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = target_table
                AND column_name = 'student_id'
            ) THEN
              EXECUTE format('ALTER TABLE %I ALTER COLUMN student_id TYPE text USING student_id::text', target_table);
            END IF;
          END IF;
        END LOOP;

        IF to_regclass('public.admission_applications') IS NOT NULL THEN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'admission_applications'
              AND column_name = 'admitted_student_id'
          ) THEN
            ALTER TABLE admission_applications
              ALTER COLUMN admitted_student_id TYPE text USING admitted_student_id::text;
          END IF;
        END IF;
      END $$;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_admission_documents_student') THEN
          ALTER TABLE admission_documents
            ADD CONSTRAINT fk_admission_documents_student
            FOREIGN KEY (tenant_id, student_id)
            REFERENCES students (tenant_id, id)
            ON DELETE CASCADE
            NOT VALID;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_allocations_student') THEN
          ALTER TABLE student_allocations
            ADD CONSTRAINT fk_student_allocations_student
            FOREIGN KEY (tenant_id, student_id)
            REFERENCES students (tenant_id, id)
            ON DELETE CASCADE
            NOT VALID;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_transfer_student') THEN
          ALTER TABLE student_transfer_records
            ADD CONSTRAINT fk_student_transfer_student
            FOREIGN KEY (tenant_id, student_id)
            REFERENCES students (tenant_id, id)
            ON DELETE CASCADE
            NOT VALID;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_academic_enrollments_student') THEN
          ALTER TABLE student_academic_enrollments
            ADD CONSTRAINT fk_student_academic_enrollments_student
            FOREIGN KEY (tenant_id, student_id)
            REFERENCES students (tenant_id, id)
            ON DELETE CASCADE
            NOT VALID;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_academic_lifecycle_events_student') THEN
          ALTER TABLE student_academic_lifecycle_events
            ADD CONSTRAINT fk_student_academic_lifecycle_events_student
            FOREIGN KEY (tenant_id, student_id)
            REFERENCES students (tenant_id, id)
            ON DELETE CASCADE
            NOT VALID;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_subject_enrollments_student') THEN
          ALTER TABLE student_subject_enrollments
            ADD CONSTRAINT fk_student_subject_enrollments_student
            FOREIGN KEY (tenant_id, student_id)
            REFERENCES students (tenant_id, id)
            ON DELETE CASCADE
            NOT VALID;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_timetable_enrollments_student') THEN
          ALTER TABLE student_timetable_enrollments
            ADD CONSTRAINT fk_student_timetable_enrollments_student
            FOREIGN KEY (tenant_id, student_id)
            REFERENCES students (tenant_id, id)
            ON DELETE CASCADE
            NOT VALID;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_fee_assignments_student') THEN
          ALTER TABLE student_fee_assignments
            ADD CONSTRAINT fk_student_fee_assignments_student
            FOREIGN KEY (tenant_id, student_id)
            REFERENCES students (tenant_id, id)
            ON DELETE CASCADE
            NOT VALID;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_fee_invoices_student') THEN
          ALTER TABLE student_fee_invoices
            ADD CONSTRAINT fk_student_fee_invoices_student
            FOREIGN KEY (tenant_id, student_id)
            REFERENCES students (tenant_id, id)
            ON DELETE CASCADE
            NOT VALID;
        END IF;
      END $$;


      CREATE TABLE IF NOT EXISTS admission_enquiries (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        enquiry_code text NOT NULL,
        student_first_name text NOT NULL,
        student_last_name text NOT NULL,
        parent_name text NOT NULL,
        parent_phone text NOT NULL,
        parent_email text,
        class_applying text,
        enquiry_source text,
        boarding_day_preference text,
        current_school text,
        location text,
        notes text,
        follow_up_date date,
        status text NOT NULL DEFAULT 'open',
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_admission_enquiries_tenant_id_id UNIQUE (tenant_id, id)
      );

      CREATE TABLE IF NOT EXISTS admission_interviews (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        application_id text NOT NULL,
        interview_date date NOT NULL,
        start_time text NOT NULL,
        end_time text NOT NULL,
        location text,
        interviewer_user_id uuid,
        assessment_type text,
        reading_score integer,
        writing_score integer,
        mathematics_score integer,
        general_conduct text,
        recommendation text,
        interviewer_comment text,
        status text NOT NULL DEFAULT 'scheduled',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_admission_interviews_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_admission_interviews_application
          FOREIGN KEY (tenant_id, application_id)
          REFERENCES admission_applications (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS admission_offers (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        application_id text NOT NULL,
        offer_status text NOT NULL DEFAULT 'pending',
        required_deposit bigint,
        deposit_paid bigint DEFAULT 0,
        offer_date date NOT NULL DEFAULT CURRENT_DATE,
        deadline_date date,
        finance_cleared boolean NOT NULL DEFAULT FALSE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_admission_offers_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_admission_offers_application
          FOREIGN KEY (tenant_id, application_id)
          REFERENCES admission_applications (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS admission_appointments (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        application_id text,
        visitor_name text NOT NULL,
        purpose text NOT NULL,
        appointment_date date NOT NULL,
        start_time text NOT NULL,
        assigned_user_id uuid,
        status text NOT NULL DEFAULT 'scheduled',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_admission_appointments_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_admission_appointments_application
          FOREIGN KEY (tenant_id, application_id)
          REFERENCES admission_applications (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS admission_tasks (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        application_id text,
        task_title text NOT NULL,
        task_description text,
        due_date date,
        priority text NOT NULL DEFAULT 'medium',
        assigned_user_id uuid,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_admission_tasks_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_admission_tasks_application
          FOREIGN KEY (tenant_id, application_id)
          REFERENCES admission_applications (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS admission_templates (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        template_name text NOT NULL,
        template_type text NOT NULL,
        content text NOT NULL,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_admission_templates_tenant_id_id UNIQUE (tenant_id, id)
      );

      CREATE INDEX IF NOT EXISTS ix_admission_applications_status ON admission_applications (tenant_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_admission_applications_search_vector
        ON admission_applications
        USING GIN (
          to_tsvector(
            'simple',
            application_number || ' ' ||
            full_name || ' ' ||
            birth_certificate_number || ' ' ||
            class_applying || ' ' ||
            parent_name || ' ' ||
            parent_phone || ' ' ||
            COALESCE(parent_email, '')
          )
        );
      CREATE INDEX IF NOT EXISTS ix_admission_documents_status ON admission_documents (tenant_id, verification_status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_academic_class_sections_lookup ON academic_class_sections (tenant_id, lower(class_name), lower(stream_name), is_active);
      CREATE INDEX IF NOT EXISTS ix_student_academic_enrollments_section_status ON student_academic_enrollments (tenant_id, class_section_id, status);
      CREATE INDEX IF NOT EXISTS ix_student_academic_lifecycle_events_student_created ON student_academic_lifecycle_events (tenant_id, student_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_academic_subject_offerings_section_active ON academic_subject_offerings (tenant_id, class_section_id, is_active);
      CREATE INDEX IF NOT EXISTS ix_student_subject_enrollments_student_status ON student_subject_enrollments (tenant_id, student_id, status);
      CREATE INDEX IF NOT EXISTS ix_academic_timetable_slots_section_active ON academic_timetable_slots (tenant_id, class_section_id, is_active);
      CREATE INDEX IF NOT EXISTS ix_student_timetable_enrollments_student_status ON student_timetable_enrollments (tenant_id, student_id, status);
      CREATE INDEX IF NOT EXISTS ix_student_fee_structures_class_active ON student_fee_structures (tenant_id, lower(class_name), is_active);
      CREATE INDEX IF NOT EXISTS ix_student_fee_assignments_student_status ON student_fee_assignments (tenant_id, student_id, status);
      CREATE INDEX IF NOT EXISTS ix_student_fee_invoices_student_status ON student_fee_invoices (tenant_id, student_id, status, due_date DESC);


      ALTER TABLE admission_enquiries ENABLE ROW LEVEL SECURITY;
      ALTER TABLE admission_enquiries FORCE ROW LEVEL SECURITY;
      ALTER TABLE admission_interviews ENABLE ROW LEVEL SECURITY;
      ALTER TABLE admission_interviews FORCE ROW LEVEL SECURITY;
      ALTER TABLE admission_offers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE admission_offers FORCE ROW LEVEL SECURITY;
      ALTER TABLE admission_appointments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE admission_appointments FORCE ROW LEVEL SECURITY;
      ALTER TABLE admission_tasks ENABLE ROW LEVEL SECURITY;
      ALTER TABLE admission_tasks FORCE ROW LEVEL SECURITY;
      ALTER TABLE admission_templates ENABLE ROW LEVEL SECURITY;
      ALTER TABLE admission_templates FORCE ROW LEVEL SECURITY;
      
      ALTER TABLE admission_applications ENABLE ROW LEVEL SECURITY;
      ALTER TABLE admission_applications FORCE ROW LEVEL SECURITY;
      ALTER TABLE admission_documents ENABLE ROW LEVEL SECURITY;
      ALTER TABLE admission_documents FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_allocations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_allocations FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_transfer_records ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_transfer_records FORCE ROW LEVEL SECURITY;
      ALTER TABLE academic_class_sections ENABLE ROW LEVEL SECURITY;
      ALTER TABLE academic_class_sections FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_academic_enrollments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_academic_enrollments FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_academic_lifecycle_events ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_academic_lifecycle_events FORCE ROW LEVEL SECURITY;
      ALTER TABLE academic_subject_offerings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE academic_subject_offerings FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_subject_enrollments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_subject_enrollments FORCE ROW LEVEL SECURITY;
      ALTER TABLE academic_timetable_slots ENABLE ROW LEVEL SECURITY;
      ALTER TABLE academic_timetable_slots FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_timetable_enrollments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_timetable_enrollments FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_fee_structures ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_fee_structures FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_fee_assignments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_fee_assignments FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_fee_invoices ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_fee_invoices FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS admission_applications_rls_policy ON admission_applications;
      CREATE POLICY admission_applications_rls_policy ON admission_applications
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS admission_documents_rls_policy ON admission_documents;
      CREATE POLICY admission_documents_rls_policy ON admission_documents
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS student_allocations_rls_policy ON student_allocations;
      CREATE POLICY student_allocations_rls_policy ON student_allocations
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS student_transfer_records_rls_policy ON student_transfer_records;
      CREATE POLICY student_transfer_records_rls_policy ON student_transfer_records
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS academic_class_sections_rls_policy ON academic_class_sections;
      CREATE POLICY academic_class_sections_rls_policy ON academic_class_sections
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS student_academic_enrollments_rls_policy ON student_academic_enrollments;
      CREATE POLICY student_academic_enrollments_rls_policy ON student_academic_enrollments
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS student_academic_lifecycle_events_rls_policy ON student_academic_lifecycle_events;
      CREATE POLICY student_academic_lifecycle_events_rls_policy ON student_academic_lifecycle_events
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS academic_subject_offerings_rls_policy ON academic_subject_offerings;
      CREATE POLICY academic_subject_offerings_rls_policy ON academic_subject_offerings
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS student_subject_enrollments_rls_policy ON student_subject_enrollments;
      CREATE POLICY student_subject_enrollments_rls_policy ON student_subject_enrollments
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS academic_timetable_slots_rls_policy ON academic_timetable_slots;
      CREATE POLICY academic_timetable_slots_rls_policy ON academic_timetable_slots
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS student_timetable_enrollments_rls_policy ON student_timetable_enrollments;
      CREATE POLICY student_timetable_enrollments_rls_policy ON student_timetable_enrollments
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS student_fee_structures_rls_policy ON student_fee_structures;
      CREATE POLICY student_fee_structures_rls_policy ON student_fee_structures
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS student_fee_assignments_rls_policy ON student_fee_assignments;
      CREATE POLICY student_fee_assignments_rls_policy ON student_fee_assignments
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS student_fee_invoices_rls_policy ON student_fee_invoices;
      CREATE POLICY student_fee_invoices_rls_policy ON student_fee_invoices
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));


      DROP POLICY IF EXISTS admission_enquiries_rls_policy ON admission_enquiries;
      CREATE POLICY admission_enquiries_rls_policy ON admission_enquiries
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS admission_interviews_rls_policy ON admission_interviews;
      CREATE POLICY admission_interviews_rls_policy ON admission_interviews
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS admission_offers_rls_policy ON admission_offers;
      CREATE POLICY admission_offers_rls_policy ON admission_offers
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS admission_appointments_rls_policy ON admission_appointments;
      CREATE POLICY admission_appointments_rls_policy ON admission_appointments
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS admission_tasks_rls_policy ON admission_tasks;
      CREATE POLICY admission_tasks_rls_policy ON admission_tasks
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS admission_templates_rls_policy ON admission_templates;
      CREATE POLICY admission_templates_rls_policy ON admission_templates
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP TRIGGER IF EXISTS trg_admission_applications_set_updated_at ON admission_applications;
      CREATE TRIGGER trg_admission_applications_set_updated_at
      BEFORE UPDATE ON admission_applications
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_admission_documents_set_updated_at ON admission_documents;
      CREATE TRIGGER trg_admission_documents_set_updated_at
      BEFORE UPDATE ON admission_documents
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_student_allocations_set_updated_at ON student_allocations;
      CREATE TRIGGER trg_student_allocations_set_updated_at
      BEFORE UPDATE ON student_allocations
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_student_transfer_records_set_updated_at ON student_transfer_records;
      CREATE TRIGGER trg_student_transfer_records_set_updated_at
      BEFORE UPDATE ON student_transfer_records
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_academic_class_sections_set_updated_at ON academic_class_sections;
      CREATE TRIGGER trg_academic_class_sections_set_updated_at
      BEFORE UPDATE ON academic_class_sections
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_student_academic_enrollments_set_updated_at ON student_academic_enrollments;
      CREATE TRIGGER trg_student_academic_enrollments_set_updated_at
      BEFORE UPDATE ON student_academic_enrollments
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_academic_subject_offerings_set_updated_at ON academic_subject_offerings;
      CREATE TRIGGER trg_academic_subject_offerings_set_updated_at
      BEFORE UPDATE ON academic_subject_offerings
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_student_subject_enrollments_set_updated_at ON student_subject_enrollments;
      CREATE TRIGGER trg_student_subject_enrollments_set_updated_at
      BEFORE UPDATE ON student_subject_enrollments
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_academic_timetable_slots_set_updated_at ON academic_timetable_slots;
      CREATE TRIGGER trg_academic_timetable_slots_set_updated_at
      BEFORE UPDATE ON academic_timetable_slots
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_student_timetable_enrollments_set_updated_at ON student_timetable_enrollments;
      CREATE TRIGGER trg_student_timetable_enrollments_set_updated_at
      BEFORE UPDATE ON student_timetable_enrollments
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_student_fee_structures_set_updated_at ON student_fee_structures;
      CREATE TRIGGER trg_student_fee_structures_set_updated_at
      BEFORE UPDATE ON student_fee_structures
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_student_fee_assignments_set_updated_at ON student_fee_assignments;
      CREATE TRIGGER trg_student_fee_assignments_set_updated_at
      BEFORE UPDATE ON student_fee_assignments
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_student_fee_invoices_set_updated_at ON student_fee_invoices;
      CREATE TRIGGER trg_student_fee_invoices_set_updated_at
      BEFORE UPDATE ON student_fee_invoices
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_admission_enquiries_set_updated_at ON admission_enquiries;
      CREATE TRIGGER trg_admission_enquiries_set_updated_at
      BEFORE UPDATE ON admission_enquiries
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_admission_interviews_set_updated_at ON admission_interviews;
      CREATE TRIGGER trg_admission_interviews_set_updated_at
      BEFORE UPDATE ON admission_interviews
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_admission_offers_set_updated_at ON admission_offers;
      CREATE TRIGGER trg_admission_offers_set_updated_at
      BEFORE UPDATE ON admission_offers
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_admission_appointments_set_updated_at ON admission_appointments;
      CREATE TRIGGER trg_admission_appointments_set_updated_at
      BEFORE UPDATE ON admission_appointments
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_admission_tasks_set_updated_at ON admission_tasks;
      CREATE TRIGGER trg_admission_tasks_set_updated_at
      BEFORE UPDATE ON admission_tasks
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_admission_templates_set_updated_at ON admission_templates;
      CREATE TRIGGER trg_admission_templates_set_updated_at
      BEFORE UPDATE ON admission_templates
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    