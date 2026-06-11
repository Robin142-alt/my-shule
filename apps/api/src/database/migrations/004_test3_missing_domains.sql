-- Migration: 004_test3_missing_domains.sql
-- Description: Adds academics_departments, academics_class_teachers, academics_report_card_settings

BEGIN;

CREATE TABLE academics_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id tenant_key NOT NULL,
  name text NOT NULL,
  head_of_department_user_id uuid,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_academics_departments_tenant_id_non_global CHECK (tenant_id <> 'global'),
  CONSTRAINT uq_academics_departments_tenant_name UNIQUE (tenant_id, name),
  CONSTRAINT fk_academics_departments_head
    FOREIGN KEY (head_of_department_user_id)
    REFERENCES users (id)
    ON DELETE SET NULL
);

CREATE TABLE academics_class_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id tenant_key NOT NULL,
  academic_year_id uuid NOT NULL,
  class_section_id uuid NOT NULL,
  teacher_user_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_academics_class_teachers_tenant_id_non_global CHECK (tenant_id <> 'global'),
  CONSTRAINT uq_academics_class_teachers_section UNIQUE (tenant_id, class_section_id, academic_year_id),
  CONSTRAINT fk_academics_class_teachers_teacher
    FOREIGN KEY (teacher_user_id)
    REFERENCES users (id)
    ON DELETE RESTRICT
);

CREATE TABLE academics_report_card_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id tenant_key NOT NULL,
  name text NOT NULL,
  grading_system_id uuid,
  show_rank boolean NOT NULL DEFAULT TRUE,
  show_attendance boolean NOT NULL DEFAULT TRUE,
  principal_signature_url text,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_academics_report_card_settings_tenant_id_non_global CHECK (tenant_id <> 'global'),
  CONSTRAINT uq_academics_report_card_settings_name UNIQUE (tenant_id, name),
  CONSTRAINT fk_academics_report_card_settings_grading
    FOREIGN KEY (grading_system_id)
    REFERENCES academics_grading_systems (id)
    ON DELETE SET NULL
);

-- RLS Policies
ALTER TABLE academics_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY academics_departments_tenant_policy ON academics_departments
  FOR ALL USING (tenant_id = current_setting('app.current_tenant')::tenant_key);

ALTER TABLE academics_class_teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY academics_class_teachers_tenant_policy ON academics_class_teachers
  FOR ALL USING (tenant_id = current_setting('app.current_tenant')::tenant_key);

ALTER TABLE academics_report_card_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY academics_report_card_settings_tenant_policy ON academics_report_card_settings
  FOR ALL USING (tenant_id = current_setting('app.current_tenant')::tenant_key);

COMMIT;
