import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

const LAB_TABLES = [
  'lab_departments',
  'labs',
  'lab_sessions',
  'lab_attendance',
  'lab_equipment',
  'chemical_items',
  'lab_session_equipment_usage',
  'lab_session_chemical_usage',
  'chemical_disposal_requests',
  'lab_storage_locations',
  'lab_practical_requests',
  'lab_practical_request_items',
  'lab_issue_records',
  'lab_issue_lines',
  'lab_issue_returns',
  'lab_stock_movements',
  'lab_breakage_loss_records',
  'lab_stocktakes',
  'lab_stocktake_lines',
  'lab_safety_checks',
] as const;

@Injectable()
export class LabsSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(LabsSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS lab_departments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        type text NOT NULL,
        hod_id uuid,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_lab_departments_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_lab_departments_name UNIQUE (tenant_id, name),
        CONSTRAINT ck_lab_departments_type CHECK (type IN ('SCIENCE', 'TECHNICAL', 'CUSTOM'))
      );

      CREATE TABLE IF NOT EXISTS labs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        department_id uuid NOT NULL,
        name text NOT NULL,
        capacity integer NOT NULL,
        location text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_labs_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_labs_name UNIQUE (tenant_id, department_id, name),
        CONSTRAINT fk_labs_department
          FOREIGN KEY (tenant_id, department_id)
          REFERENCES lab_departments (tenant_id, id),
        CONSTRAINT ck_labs_capacity CHECK (capacity > 0)
      );

      CREATE TABLE IF NOT EXISTS lab_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        lab_id uuid NOT NULL,
        class_section_id uuid NOT NULL,
        subject_id uuid,
        subject_name text NOT NULL,
        session_date date NOT NULL,
        start_time time NOT NULL,
        end_time time NOT NULL,
        teacher_id uuid NOT NULL,
        is_mandatory boolean NOT NULL DEFAULT true,
        status text NOT NULL DEFAULT 'scheduled',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_lab_sessions_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_lab_sessions_lab
          FOREIGN KEY (tenant_id, lab_id)
          REFERENCES labs (tenant_id, id),
        CONSTRAINT fk_lab_sessions_class
          FOREIGN KEY (tenant_id, class_section_id)
          REFERENCES class_sections (tenant_id, id),
        CONSTRAINT ck_lab_sessions_status CHECK (status IN ('scheduled', 'completed', 'cancelled')),
        CONSTRAINT ck_lab_sessions_time CHECK (end_time > start_time)
      );

      CREATE TABLE IF NOT EXISTS lab_attendance (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        session_id uuid NOT NULL,
        student_id uuid NOT NULL,
        status text NOT NULL,
        recorded_by uuid NOT NULL,
        recorded_at timestamptz NOT NULL DEFAULT NOW(),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_lab_attendance_session_student UNIQUE (tenant_id, session_id, student_id),
        CONSTRAINT fk_lab_attendance_session
          FOREIGN KEY (tenant_id, session_id)
          REFERENCES lab_sessions (tenant_id, id),
        CONSTRAINT ck_lab_attendance_status CHECK (status IN ('present', 'absent', 'late', 'excused'))
      );

      CREATE TABLE IF NOT EXISTS lab_equipment (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        department_id uuid NOT NULL,
        lab_id uuid NOT NULL,
        name text NOT NULL,
        asset_tag text NOT NULL,
        quantity_total integer NOT NULL,
        quantity_available integer NOT NULL,
        quantity_in_use integer NOT NULL DEFAULT 0,
        quantity_damaged integer NOT NULL DEFAULT 0,
        condition_status text NOT NULL DEFAULT 'serviceable',
        is_consumable boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_lab_equipment_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_lab_equipment_asset_tag UNIQUE (tenant_id, asset_tag),
        CONSTRAINT fk_lab_equipment_lab
          FOREIGN KEY (tenant_id, lab_id)
          REFERENCES labs (tenant_id, id),
        CONSTRAINT ck_lab_equipment_quantities CHECK (
          quantity_total >= 0
          AND quantity_available >= 0
          AND quantity_in_use >= 0
          AND quantity_damaged >= 0
          AND quantity_available + quantity_in_use + quantity_damaged <= quantity_total
        )
      );

      CREATE TABLE IF NOT EXISTS chemical_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        lab_id uuid NOT NULL,
        name text NOT NULL,
        chemical_formula text,
        hazard_class text NOT NULL,
        batch_number text NOT NULL,
        quantity_total numeric(12, 3) NOT NULL,
        quantity_available numeric(12, 3) NOT NULL,
        unit text NOT NULL DEFAULT 'ml',
        manufacture_date date,
        expiry_date date NOT NULL,
        status text NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_chemical_items_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_chemical_items_batch UNIQUE (tenant_id, lab_id, batch_number),
        CONSTRAINT fk_chemical_items_lab
          FOREIGN KEY (tenant_id, lab_id)
          REFERENCES labs (tenant_id, id),
        CONSTRAINT ck_chemical_items_status CHECK (status IN ('active', 'near_expiry', 'expired', 'quarantined', 'disposed')),
        CONSTRAINT ck_chemical_items_quantity CHECK (quantity_total >= 0 AND quantity_available >= 0 AND quantity_available <= quantity_total)
      );

      CREATE TABLE IF NOT EXISTS lab_session_equipment_usage (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        session_id uuid NOT NULL,
        equipment_id uuid NOT NULL,
        quantity_used integer NOT NULL,
        condition_after_use text NOT NULL,
        returned_quantity integer NOT NULL DEFAULT 0,
        reconciled_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_lab_session_equipment_usage_session
          FOREIGN KEY (tenant_id, session_id)
          REFERENCES lab_sessions (tenant_id, id),
        CONSTRAINT fk_lab_session_equipment_usage_equipment
          FOREIGN KEY (tenant_id, equipment_id)
          REFERENCES lab_equipment (tenant_id, id),
        CONSTRAINT ck_lab_session_equipment_usage_quantity CHECK (quantity_used > 0 AND returned_quantity >= 0 AND returned_quantity <= quantity_used)
      );

      CREATE TABLE IF NOT EXISTS lab_session_chemical_usage (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        session_id uuid NOT NULL,
        chemical_id uuid NOT NULL,
        quantity_used numeric(12, 3) NOT NULL,
        issued_by uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_lab_session_chemical_usage_session
          FOREIGN KEY (tenant_id, session_id)
          REFERENCES lab_sessions (tenant_id, id),
        CONSTRAINT fk_lab_session_chemical_usage_chemical
          FOREIGN KEY (tenant_id, chemical_id)
          REFERENCES chemical_items (tenant_id, id),
        CONSTRAINT ck_lab_session_chemical_usage_quantity CHECK (quantity_used > 0)
      );

      CREATE TABLE IF NOT EXISTS chemical_disposal_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        chemical_id uuid NOT NULL,
        requested_by uuid NOT NULL,
        approved_by uuid,
        reason text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        requested_at timestamptz NOT NULL DEFAULT NOW(),
        approved_at timestamptz,
        disposed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_chemical_disposal_requests_chemical
          FOREIGN KEY (tenant_id, chemical_id)
          REFERENCES chemical_items (tenant_id, id),
        CONSTRAINT ck_chemical_disposal_requests_status CHECK (status IN ('pending', 'approved', 'rejected', 'disposed'))
      );

      CREATE TABLE IF NOT EXISTS lab_storage_locations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        laboratory_or_store text NOT NULL,
        room_or_section text,
        cupboard_or_cabinet text,
        shelf text,
        full_path text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_by uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_lab_storage_locations_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_lab_storage_locations_path UNIQUE (tenant_id, full_path)
      );

      CREATE TABLE IF NOT EXISTS lab_practical_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        subject text NOT NULL,
        class_name text NOT NULL,
        practical_date date NOT NULL,
        lesson_time time NOT NULL,
        practical_title text NOT NULL,
        teacher_id uuid,
        teacher_name text NOT NULL,
        learner_groups integer,
        teacher_notes text,
        preparation_note text,
        status text NOT NULL DEFAULT 'requested',
        is_assessment boolean NOT NULL DEFAULT false,
        confidential_notes text,
        authorized_roles text[] NOT NULL DEFAULT ARRAY['LAB_TECHNICIAN', 'PRINCIPAL', 'DEPUTY_PRINCIPAL', 'DEAN_ACADEMICS', 'EXAMS_MANAGER']::text[],
        rejection_reason text,
        submission_id text,
        last_review_submission_id text,
        last_preparation_submission_id text,
        created_by uuid,
        updated_by uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_lab_practical_requests_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_lab_practical_requests_status CHECK (status IN (
          'requested', 'under_review', 'partially_available', 'preparing', 'ready',
          'issued', 'partially_returned', 'completed', 'rejected'
        )),
        CONSTRAINT ck_lab_practical_requests_groups CHECK (learner_groups IS NULL OR learner_groups > 0)
      );

      CREATE TABLE IF NOT EXISTS lab_practical_request_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        request_id uuid NOT NULL,
        item_id uuid,
        item_source text,
        item_name text NOT NULL,
        unit text NOT NULL,
        requested_quantity numeric(12, 3) NOT NULL,
        approved_quantity numeric(12, 3),
        prepared_quantity numeric(12, 3) NOT NULL DEFAULT 0,
        available_quantity_snapshot numeric(12, 3),
        is_returnable boolean NOT NULL DEFAULT true,
        substitute_item_id uuid,
        substitute_item_name text,
        status text NOT NULL DEFAULT 'requested',
        note text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_lab_practical_request_items_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_lab_practical_request_items_request
          FOREIGN KEY (tenant_id, request_id)
          REFERENCES lab_practical_requests (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT ck_lab_practical_request_items_source CHECK (item_source IS NULL OR item_source IN ('equipment', 'chemical')),
        CONSTRAINT ck_lab_practical_request_items_quantities CHECK (
          requested_quantity > 0
          AND (approved_quantity IS NULL OR approved_quantity >= 0)
          AND prepared_quantity >= 0
        )
      );

      CREATE TABLE IF NOT EXISTS lab_issue_records (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        practical_request_id uuid NOT NULL,
        received_by text NOT NULL,
        expected_return_at timestamptz,
        status text NOT NULL DEFAULT 'issued',
        notes text,
        submission_id text,
        issued_by uuid,
        issued_at timestamptz NOT NULL DEFAULT NOW(),
        last_return_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_lab_issue_records_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_lab_issue_records_request
          FOREIGN KEY (tenant_id, practical_request_id)
          REFERENCES lab_practical_requests (tenant_id, id),
        CONSTRAINT ck_lab_issue_records_status CHECK (status IN ('issued', 'partially_returned', 'returned', 'unresolved'))
      );

      CREATE TABLE IF NOT EXISTS lab_issue_lines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        issue_id uuid NOT NULL,
        request_item_id uuid NOT NULL,
        item_id uuid NOT NULL,
        item_source text NOT NULL,
        item_name text NOT NULL,
        unit text NOT NULL,
        quantity_issued numeric(12, 3) NOT NULL,
        is_returnable boolean NOT NULL,
        returned_good numeric(12, 3) NOT NULL DEFAULT 0,
        used_or_consumed numeric(12, 3) NOT NULL DEFAULT 0,
        broken numeric(12, 3) NOT NULL DEFAULT 0,
        missing numeric(12, 3) NOT NULL DEFAULT 0,
        still_with_teacher numeric(12, 3) NOT NULL DEFAULT 0,
        sent_for_maintenance numeric(12, 3) NOT NULL DEFAULT 0,
        spilled_or_wasted numeric(12, 3) NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_lab_issue_lines_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_lab_issue_lines_issue
          FOREIGN KEY (tenant_id, issue_id)
          REFERENCES lab_issue_records (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_lab_issue_lines_request_item
          FOREIGN KEY (tenant_id, request_item_id)
          REFERENCES lab_practical_request_items (tenant_id, id),
        CONSTRAINT ck_lab_issue_lines_source CHECK (item_source IN ('equipment', 'chemical')),
        CONSTRAINT ck_lab_issue_lines_quantities CHECK (
          quantity_issued > 0 AND returned_good >= 0 AND used_or_consumed >= 0
          AND broken >= 0 AND missing >= 0 AND still_with_teacher >= 0
          AND sent_for_maintenance >= 0 AND spilled_or_wasted >= 0
        )
      );

      CREATE TABLE IF NOT EXISTS lab_issue_returns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        issue_id uuid NOT NULL,
        submission_id text NOT NULL,
        notes text,
        recorded_by uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_lab_issue_returns_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_lab_issue_returns_submission UNIQUE (tenant_id, submission_id),
        CONSTRAINT fk_lab_issue_returns_issue
          FOREIGN KEY (tenant_id, issue_id)
          REFERENCES lab_issue_records (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS lab_stock_movements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        item_id uuid NOT NULL,
        item_source text NOT NULL,
        item_name text NOT NULL,
        movement_type text NOT NULL,
        quantity numeric(12, 3) NOT NULL,
        quantity_before numeric(12, 3) NOT NULL,
        quantity_after numeric(12, 3) NOT NULL,
        unit text NOT NULL,
        practical_request_id uuid,
        issue_id uuid,
        stocktake_id uuid,
        reason text,
        submission_id text,
        recorded_by uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_lab_stock_movements_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_lab_stock_movements_source CHECK (item_source IN ('equipment', 'chemical')),
        CONSTRAINT ck_lab_stock_movements_type CHECK (movement_type IN (
          'item_created', 'stock_added', 'issued', 'returned', 'consumed', 'broken',
          'missing', 'maintenance', 'wasted', 'stocktake_adjustment'
        )),
        CONSTRAINT ck_lab_stock_movements_quantity CHECK (quantity >= 0)
      );

      CREATE TABLE IF NOT EXISTS lab_breakage_loss_records (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        item_id uuid,
        item_source text,
        item_name text NOT NULL,
        quantity numeric(12, 3) NOT NULL,
        incident_date date NOT NULL,
        practical_request_id uuid,
        practical_or_activity text,
        class_name text,
        teacher_name text,
        classification text NOT NULL,
        explanation text NOT NULL,
        status text NOT NULL DEFAULT 'unresolved',
        referral_required boolean NOT NULL DEFAULT false,
        referral_status text,
        submission_id text,
        recorded_by uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_lab_breakage_loss_records_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_lab_breakage_loss_classification CHECK (classification IN (
          'accidental_breakage', 'wear_and_tear', 'equipment_failure', 'missing',
          'chemical_spill', 'improper_use', 'unknown'
        )),
        CONSTRAINT ck_lab_breakage_loss_quantity CHECK (quantity > 0)
      );

      CREATE TABLE IF NOT EXISTS lab_stocktakes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        location_id uuid,
        location_name text NOT NULL,
        category text,
        item_type text,
        status text NOT NULL DEFAULT 'in_progress',
        current_position integer NOT NULL DEFAULT 0,
        notes text,
        submission_id text,
        started_by uuid,
        submitted_by uuid,
        started_at timestamptz NOT NULL DEFAULT NOW(),
        submitted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_lab_stocktakes_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_lab_stocktakes_status CHECK (status IN ('in_progress', 'ready_for_review', 'submitted'))
      );

      CREATE TABLE IF NOT EXISTS lab_stocktake_lines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        stocktake_id uuid NOT NULL,
        item_id uuid NOT NULL,
        item_source text NOT NULL,
        item_name text NOT NULL,
        unit text NOT NULL,
        expected_quantity numeric(12, 3) NOT NULL,
        counted_quantity numeric(12, 3),
        condition text,
        difference numeric(12, 3),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_lab_stocktake_lines_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_lab_stocktake_lines_stocktake
          FOREIGN KEY (tenant_id, stocktake_id)
          REFERENCES lab_stocktakes (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT ck_lab_stocktake_lines_source CHECK (item_source IN ('equipment', 'chemical')),
        CONSTRAINT ck_lab_stocktake_lines_quantities CHECK (
          expected_quantity >= 0 AND (counted_quantity IS NULL OR counted_quantity >= 0)
        )
      );

      CREATE TABLE IF NOT EXISTS lab_safety_checks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        location_name text NOT NULL,
        checked_on date NOT NULL,
        next_due_date date NOT NULL,
        checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
        notes text,
        status text NOT NULL DEFAULT 'completed',
        submission_id text,
        checked_by uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_lab_safety_checks_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_lab_safety_checks_status CHECK (status IN ('completed', 'follow_up_required'))
      );

      ALTER TABLE lab_equipment ALTER COLUMN department_id DROP NOT NULL;
      ALTER TABLE lab_equipment ALTER COLUMN lab_id DROP NOT NULL;
      ALTER TABLE lab_equipment ALTER COLUMN asset_tag DROP NOT NULL;
      -- Existing schools may have the earlier quantity-only apparatus register.
      -- Add the newer condition buckets before altering their numeric precision.
      ALTER TABLE lab_equipment ADD COLUMN IF NOT EXISTS quantity_in_use numeric(12, 3) NOT NULL DEFAULT 0;
      ALTER TABLE lab_equipment ADD COLUMN IF NOT EXISTS quantity_damaged numeric(12, 3) NOT NULL DEFAULT 0;
      ALTER TABLE lab_equipment ALTER COLUMN quantity_total TYPE numeric(12, 3) USING quantity_total::numeric;
      ALTER TABLE lab_equipment ALTER COLUMN quantity_available TYPE numeric(12, 3) USING quantity_available::numeric;
      ALTER TABLE lab_equipment ALTER COLUMN quantity_in_use TYPE numeric(12, 3) USING quantity_in_use::numeric;
      ALTER TABLE lab_equipment ALTER COLUMN quantity_damaged TYPE numeric(12, 3) USING quantity_damaged::numeric;
      ALTER TABLE lab_equipment ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'apparatus';
      ALTER TABLE lab_equipment ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Apparatus or Equipment';
      ALTER TABLE lab_equipment ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'Pieces';
      ALTER TABLE lab_equipment ADD COLUMN IF NOT EXISTS minimum_stock_level numeric(12, 3) NOT NULL DEFAULT 0;
      ALTER TABLE lab_equipment ADD COLUMN IF NOT EXISTS storage_location_id uuid;
      ALTER TABLE lab_equipment ADD COLUMN IF NOT EXISTS storage_location text;
      ALTER TABLE lab_equipment ADD COLUMN IF NOT EXISTS tracking_method text NOT NULL DEFAULT 'quantity';
      ALTER TABLE lab_equipment ADD COLUMN IF NOT EXISTS serial_number text;
      ALTER TABLE lab_equipment ADD COLUMN IF NOT EXISTS model text;
      ALTER TABLE lab_equipment ADD COLUMN IF NOT EXISTS notes text;
      ALTER TABLE lab_equipment ADD COLUMN IF NOT EXISTS quantity_missing numeric(12, 3) NOT NULL DEFAULT 0;
      ALTER TABLE lab_equipment ADD COLUMN IF NOT EXISTS quantity_under_maintenance numeric(12, 3) NOT NULL DEFAULT 0;
      ALTER TABLE lab_equipment ADD COLUMN IF NOT EXISTS submission_id text;
      ALTER TABLE lab_equipment DROP CONSTRAINT IF EXISTS ck_lab_equipment_quantities;
      ALTER TABLE lab_equipment ADD CONSTRAINT ck_lab_equipment_quantities CHECK (
        quantity_total >= 0 AND quantity_available >= 0 AND quantity_in_use >= 0
        AND quantity_damaged >= 0 AND quantity_missing >= 0 AND quantity_under_maintenance >= 0
        AND quantity_available + quantity_in_use + quantity_damaged
          + quantity_missing + quantity_under_maintenance <= quantity_total
      );

      ALTER TABLE chemical_items ALTER COLUMN lab_id DROP NOT NULL;
      ALTER TABLE chemical_items ALTER COLUMN hazard_class DROP NOT NULL;
      ALTER TABLE chemical_items ALTER COLUMN batch_number DROP NOT NULL;
      ALTER TABLE chemical_items ALTER COLUMN expiry_date DROP NOT NULL;
      ALTER TABLE chemical_items ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Chemical or Reagent';
      ALTER TABLE chemical_items ADD COLUMN IF NOT EXISTS minimum_stock_level numeric(12, 3) NOT NULL DEFAULT 0;
      ALTER TABLE chemical_items ADD COLUMN IF NOT EXISTS storage_location_id uuid;
      ALTER TABLE chemical_items ADD COLUMN IF NOT EXISTS storage_location text;
      ALTER TABLE chemical_items ADD COLUMN IF NOT EXISTS concentration text;
      ALTER TABLE chemical_items ADD COLUMN IF NOT EXISTS safety_classification text;
      ALTER TABLE chemical_items ADD COLUMN IF NOT EXISTS notes text;
      ALTER TABLE chemical_items ADD COLUMN IF NOT EXISTS submission_id text;
      ALTER TABLE lab_safety_checks ADD COLUMN IF NOT EXISTS submission_id text;
      ALTER TABLE lab_practical_requests ADD COLUMN IF NOT EXISTS last_review_submission_id text;
      ALTER TABLE lab_practical_requests ADD COLUMN IF NOT EXISTS last_preparation_submission_id text;

      ${LAB_TABLES.map((table) => `
        ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS ${table}_tenant_policy ON ${table};
        ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id text;
        ALTER TABLE ${table} ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS school_id text;
        UPDATE ${table}
        SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
        WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
        ALTER TABLE ${table} ALTER COLUMN tenant_id SET DEFAULT 'global';
        ALTER TABLE ${table} ALTER COLUMN tenant_id SET NOT NULL;
      `).join('\n')}

      ALTER TABLE chemical_items ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

      CREATE INDEX IF NOT EXISTS ix_lab_sessions_schedule
        ON lab_sessions (tenant_id, session_date, class_section_id, lab_id);
      CREATE INDEX IF NOT EXISTS ix_lab_attendance_session
        ON lab_attendance (tenant_id, session_id, status);
      CREATE INDEX IF NOT EXISTS ix_chemical_items_expiry
        ON chemical_items (tenant_id, status, expiry_date);
      CREATE INDEX IF NOT EXISTS ix_lab_equipment_location
        ON lab_equipment (tenant_id, storage_location, item_type);
      CREATE INDEX IF NOT EXISTS ix_lab_practical_requests_schedule
        ON lab_practical_requests (tenant_id, practical_date, lesson_time, status);
      CREATE INDEX IF NOT EXISTS ix_lab_issue_records_attention
        ON lab_issue_records (tenant_id, status, expected_return_at);
      CREATE INDEX IF NOT EXISTS ix_lab_breakage_loss_attention
        ON lab_breakage_loss_records (tenant_id, status, incident_date);
      CREATE INDEX IF NOT EXISTS ix_lab_stocktakes_location
        ON lab_stocktakes (tenant_id, status, location_name);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_equipment_submission
        ON lab_equipment (tenant_id, submission_id) WHERE submission_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_chemical_items_submission
        ON chemical_items (tenant_id, submission_id) WHERE submission_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_practical_requests_submission
        ON lab_practical_requests (tenant_id, submission_id) WHERE submission_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_issue_records_submission
        ON lab_issue_records (tenant_id, submission_id) WHERE submission_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_stock_movements_submission
        ON lab_stock_movements (tenant_id, submission_id) WHERE submission_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_breakage_loss_submission
        ON lab_breakage_loss_records (tenant_id, submission_id) WHERE submission_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_stocktakes_submission
        ON lab_stocktakes (tenant_id, submission_id) WHERE submission_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_safety_checks_submission
        ON lab_safety_checks (tenant_id, submission_id) WHERE submission_id IS NOT NULL;

      ${LAB_TABLES.map((table) => `
        ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS ${table}_tenant_policy ON ${table};
        CREATE POLICY ${table}_tenant_policy ON ${table}
        FOR ALL USING (
          tenant_id::text = current_setting('app.tenant_id', true)
          OR NULLIF(current_setting('app.role', true), '') = 'system'
        )
        WITH CHECK (
          tenant_id::text = current_setting('app.tenant_id', true)
          OR NULLIF(current_setting('app.role', true), '') = 'system'
        );
      `).join('\n')}
    `);

    this.logger.log('Labs schema and RLS policies verified');
  }
}
