import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { StudentsSchemaService } from '../students/students-schema.service';

const CLINIC_TABLES = [
  'clinic_locations',
  'clinic_medicines',
  'clinic_medicine_batches',
  'clinic_stock_movements',
  'clinic_visits',
  'clinic_medicine_dispenses',
  'clinic_disposal_requests',
  'clinic_alerts',
  'clinic_procurement_recommendations',
  'clinic_audit_logs',
] as const;

@Injectable()
export class ClinicSchemaService implements OnModuleInit {
  private readonly logger = new Logger(ClinicSchemaService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly studentsSchemaService: StudentsSchemaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.studentsSchemaService.onModuleInit();

    await this.databaseService.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE OR REPLACE FUNCTION prevent_clinic_stock_movement_mutation()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'clinic stock movements are append-only and cannot be %', lower(TG_OP)
          USING ERRCODE = '55000';
      END;
      $$ LANGUAGE plpgsql;

      CREATE TABLE IF NOT EXISTS clinic_locations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        branch_type text NOT NULL DEFAULT 'main',
        location text,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_clinic_locations_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_clinic_locations_name UNIQUE (tenant_id, name),
        CONSTRAINT ck_clinic_locations_branch_type CHECK (branch_type IN ('main', 'boarding', 'campus', 'temporary'))
      );

      CREATE TABLE IF NOT EXISTS clinic_medicines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        medicine_name text NOT NULL,
        generic_name text,
        brand_name text,
        category text NOT NULL,
        supplier text,
        manufacturer text,
        unit_type text NOT NULL,
        storage_instructions text,
        side_effect_notes text,
        barcode text,
        qr_code text,
        storage_location text,
        clinic_location_id uuid,
        cost_price_minor bigint NOT NULL DEFAULT 0,
        internal_value_minor bigint NOT NULL DEFAULT 0,
        prescription_required boolean NOT NULL DEFAULT FALSE,
        is_emergency_supply boolean NOT NULL DEFAULT FALSE,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_clinic_medicines_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_clinic_medicines_location
          FOREIGN KEY (tenant_id, clinic_location_id)
          REFERENCES clinic_locations (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT ck_clinic_medicines_unit CHECK (
          unit_type IN ('tablets', 'bottles', 'sachets', 'injections', 'capsules', 'ml', 'grams', 'units')
        )
      );

      CREATE TABLE IF NOT EXISTS clinic_medicine_batches (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        medicine_id uuid NOT NULL,
        batch_number text NOT NULL,
        supplier_invoice_reference text,
        procurement_reference text,
        procurement_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        manufacturing_date date,
        expiry_date date NOT NULL,
        date_received date NOT NULL DEFAULT CURRENT_DATE,
        quantity_received numeric(12, 3) NOT NULL,
        quantity_available numeric(12, 3) NOT NULL,
        minimum_stock_threshold numeric(12, 3) NOT NULL DEFAULT 0,
        storage_location text,
        status text NOT NULL DEFAULT 'active',
        is_emergency_supply boolean NOT NULL DEFAULT FALSE,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_clinic_medicine_batches_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_clinic_medicine_batches_number UNIQUE (tenant_id, medicine_id, batch_number),
        CONSTRAINT fk_clinic_medicine_batches_medicine
          FOREIGN KEY (tenant_id, medicine_id)
          REFERENCES clinic_medicines (tenant_id, id),
        CONSTRAINT ck_clinic_medicine_batches_quantity CHECK (
          quantity_received >= 0 AND quantity_available >= 0 AND quantity_available <= quantity_received
        ),
        CONSTRAINT ck_clinic_medicine_batches_status CHECK (
          status IN ('active', 'near_expiry', 'expired', 'quarantined', 'disposed', 'recalled')
        )
      );

      CREATE TABLE IF NOT EXISTS clinic_visits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        student_id uuid NOT NULL,
        clinic_location_id uuid,
        visit_date date NOT NULL DEFAULT CURRENT_DATE,
        visit_time time NOT NULL DEFAULT CURRENT_TIME,
        symptoms_summary text,
        diagnosis_summary text,
        confidential_notes text,
        treatment_summary text,
        status text NOT NULL DEFAULT 'open',
        recorded_by_user_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_clinic_visits_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_clinic_visits_student
          FOREIGN KEY (tenant_id, student_id)
          REFERENCES students (tenant_id, id),
        CONSTRAINT fk_clinic_visits_location
          FOREIGN KEY (tenant_id, clinic_location_id)
          REFERENCES clinic_locations (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT ck_clinic_visits_status CHECK (status IN ('open', 'completed', 'referred', 'isolation'))
      );

      CREATE TABLE IF NOT EXISTS clinic_medicine_dispenses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        visit_id uuid NOT NULL,
        medicine_id uuid NOT NULL,
        batch_id uuid NOT NULL,
        quantity_dispensed numeric(12, 3) NOT NULL,
        dosage text NOT NULL,
        duration text,
        instructions text,
        dispensed_by_user_id uuid NOT NULL,
        dispensed_at timestamptz NOT NULL DEFAULT NOW(),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_clinic_medicine_dispenses_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_clinic_medicine_dispenses_visit
          FOREIGN KEY (tenant_id, visit_id)
          REFERENCES clinic_visits (tenant_id, id),
        CONSTRAINT fk_clinic_medicine_dispenses_medicine
          FOREIGN KEY (tenant_id, medicine_id)
          REFERENCES clinic_medicines (tenant_id, id),
        CONSTRAINT fk_clinic_medicine_dispenses_batch
          FOREIGN KEY (tenant_id, batch_id)
          REFERENCES clinic_medicine_batches (tenant_id, id),
        CONSTRAINT ck_clinic_medicine_dispenses_quantity CHECK (quantity_dispensed > 0)
      );

      CREATE TABLE IF NOT EXISTS clinic_stock_movements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        medicine_id uuid NOT NULL,
        batch_id uuid,
        visit_id uuid,
        movement_type text NOT NULL,
        quantity numeric(12, 3) NOT NULL,
        before_quantity numeric(12, 3),
        after_quantity numeric(12, 3),
        reference text,
        reason text,
        actor_user_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        occurred_at timestamptz NOT NULL DEFAULT NOW(),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_clinic_stock_movements_medicine
          FOREIGN KEY (tenant_id, medicine_id)
          REFERENCES clinic_medicines (tenant_id, id),
        CONSTRAINT fk_clinic_stock_movements_batch
          FOREIGN KEY (tenant_id, batch_id)
          REFERENCES clinic_medicine_batches (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT ck_clinic_stock_movements_type CHECK (
          movement_type IN ('received', 'dispensed', 'adjusted', 'disposed', 'transferred', 'quarantined')
        )
      );

      CREATE TABLE IF NOT EXISTS clinic_disposal_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        batch_id uuid NOT NULL,
        requested_by_user_id uuid NOT NULL,
        approved_by_user_id uuid,
        reason text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        requested_at timestamptz NOT NULL DEFAULT NOW(),
        approved_at timestamptz,
        disposed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_clinic_disposal_requests_batch
          FOREIGN KEY (tenant_id, batch_id)
          REFERENCES clinic_medicine_batches (tenant_id, id),
        CONSTRAINT ck_clinic_disposal_requests_status CHECK (status IN ('pending', 'approved', 'rejected', 'disposed'))
      );

      CREATE TABLE IF NOT EXISTS clinic_alerts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        alert_type text NOT NULL,
        severity text NOT NULL,
        medicine_id uuid,
        batch_id uuid,
        title text NOT NULL,
        message text NOT NULL,
        status text NOT NULL DEFAULT 'open',
        notify_principal boolean NOT NULL DEFAULT FALSE,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT ck_clinic_alerts_type CHECK (alert_type IN ('expiry', 'low_stock', 'out_of_stock', 'unusual_consumption', 'emergency_readiness')),
        CONSTRAINT ck_clinic_alerts_severity CHECK (severity IN ('info', 'warning', 'critical')),
        CONSTRAINT ck_clinic_alerts_status CHECK (status IN ('open', 'acknowledged', 'resolved'))
      );

      CREATE TABLE IF NOT EXISTS clinic_procurement_recommendations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        module_code text NOT NULL DEFAULT 'clinic_health',
        medicine_id uuid NOT NULL,
        batch_id uuid,
        item_name text NOT NULL,
        batch_number text,
        quantity_available numeric(12, 3) NOT NULL DEFAULT 0,
        minimum_stock_threshold numeric(12, 3) NOT NULL DEFAULT 0,
        shortage_quantity numeric(12, 3) NOT NULL DEFAULT 0,
        recommended_order_quantity numeric(12, 3) NOT NULL DEFAULT 0,
        recommendation_status text NOT NULL DEFAULT 'open',
        procurement_request_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_clinic_procurement_recommendations_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_clinic_procurement_recommendations_medicine
          FOREIGN KEY (tenant_id, medicine_id)
          REFERENCES clinic_medicines (tenant_id, id),
        CONSTRAINT fk_clinic_procurement_recommendations_batch
          FOREIGN KEY (tenant_id, batch_id)
          REFERENCES clinic_medicine_batches (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT ck_clinic_procurement_recommendations_status CHECK (
          recommendation_status IN ('open', 'converted', 'dismissed', 'resolved')
        )
      );

      CREATE TABLE IF NOT EXISTS clinic_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        actor_user_id uuid,
        action text NOT NULL,
        resource_type text NOT NULL,
        resource_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid
      );

      CREATE INDEX IF NOT EXISTS ix_clinic_medicine_batches_expiry
        ON clinic_medicine_batches (tenant_id, status, expiry_date);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_clinic_medicines_name_brand
        ON clinic_medicines (tenant_id, lower(medicine_name), COALESCE(lower(brand_name), ''));
      CREATE INDEX IF NOT EXISTS ix_clinic_medicines_tenant_active_category_name
        ON clinic_medicines (tenant_id, is_active, category, medicine_name);
      CREATE INDEX IF NOT EXISTS ix_clinic_medicine_batches_stock
        ON clinic_medicine_batches (tenant_id, medicine_id, quantity_available);
      CREATE INDEX IF NOT EXISTS ix_clinic_visits_student_date
        ON clinic_visits (tenant_id, student_id, visit_date DESC);
      CREATE INDEX IF NOT EXISTS ix_clinic_dispenses_visit
        ON clinic_medicine_dispenses (tenant_id, visit_id, dispensed_at DESC);
      CREATE INDEX IF NOT EXISTS ix_clinic_stock_movements_batch
        ON clinic_stock_movements (tenant_id, batch_id, occurred_at DESC);
      CREATE INDEX IF NOT EXISTS ix_clinic_procurement_recommendations_open
        ON clinic_procurement_recommendations (tenant_id, recommendation_status, created_at DESC);

      DROP TRIGGER IF EXISTS trg_clinic_stock_movements_append_only_update ON clinic_stock_movements;
      CREATE TRIGGER trg_clinic_stock_movements_append_only_update
      BEFORE UPDATE ON clinic_stock_movements
      FOR EACH ROW EXECUTE FUNCTION prevent_clinic_stock_movement_mutation();

      DROP TRIGGER IF EXISTS trg_clinic_stock_movements_append_only_delete ON clinic_stock_movements;
      CREATE TRIGGER trg_clinic_stock_movements_append_only_delete
      BEFORE DELETE ON clinic_stock_movements
      FOR EACH ROW EXECUTE FUNCTION prevent_clinic_stock_movement_mutation();

      ${CLINIC_TABLES.map((table) => `
        ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS ${table}_tenant_policy ON ${table};
        CREATE POLICY ${table}_tenant_policy ON ${table}
        FOR ALL USING (
          tenant_id = current_setting('app.tenant_id', true)
          OR NULLIF(current_setting('app.role', true), '') = 'system'
        )
        WITH CHECK (
          tenant_id = current_setting('app.tenant_id', true)
          OR NULLIF(current_setting('app.role', true), '') = 'system'
        );
      `).join('\n')}
    `);

    this.logger.log('Clinic medicine inventory schema and RLS policies verified');
  }
}
