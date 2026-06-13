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

      CREATE INDEX IF NOT EXISTS ix_lab_sessions_schedule
        ON lab_sessions (tenant_id, session_date, class_section_id, lab_id);
      CREATE INDEX IF NOT EXISTS ix_lab_attendance_session
        ON lab_attendance (tenant_id, session_id, status);
      CREATE INDEX IF NOT EXISTS ix_chemical_items_expiry
        ON chemical_items (tenant_id, status, expiry_date);
    `);

    await this.prisma.runSchemaBootstrap(`
      ${LAB_TABLES.map((table) => `
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

    this.logger.log('Labs schema and RLS policies verified');
  }
}
