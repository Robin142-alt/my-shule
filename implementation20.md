# Implementation 20 Module Allocation, Academic Structure, Labs, Admin Leadership, and Biometric Attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` for parallel backend/frontend execution or `superpowers:executing-plans` for inline execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Superadmin-controlled tenant module allocation, flexible Kenya-ready academic structure, laboratory operations, role-based administrative command centers, and offline-first biometric teacher attendance without exposing unassigned modules to schools.

**Architecture:** Keep the current NestJS API, PostgreSQL schema bootstrap/RLS pattern, Next.js App Router frontend, existing request context, RBAC, report export, SMS, billing, and support infrastructure. Add module access as a first-class tenant entitlement layer that runs beside subscription billing, then build academic, labs, admin, and biometric workflows behind explicit module gates.

**Tech Stack:** NestJS 11, PostgreSQL with RLS, TypeScript, BullMQ/Redis, Next.js 16 App Router, React 19, zod, lucide-react, Jest/node:test, Playwright.

**Implementation status:** Plan only. This file is the fast amendment blueprint requested on 2026-05-19. No production code has been changed by this plan file.

---

## 0. Executive Scope

This amendment is intentionally split into deployable slices. Do not attempt to ship every screen and backend pathway in a single commit.

1. Ship module registry and school module allocation first. Until this exists, every other new feature risks being visible to the wrong tenant.
2. Ship academic structure second because students, labs, timetable, exams, discipline, and reports depend on class and stream identity.
3. Ship laboratory management third behind the `lab_management` module.
4. Ship administrative leadership and biometric teacher attendance fourth behind `admin_command_centers` and `teacher_biometric_attendance`.
5. Promote Academics, Communication/SMS, Reports, Staff, and Timetable to production navigation only after their routes call the module-access guard and their backend endpoints have tenant-isolation tests.

Existing repo facts to preserve:

- Backend modules live under `apps/api/src/modules/*`.
- Schema bootstraps live in module `*-schema.service.ts` files and must be mirrored in `apps/api/src/database/schema.sql` when tables become baseline schema.
- Request tenant isolation is carried by `RequestContextService` and PostgreSQL `app.tenant_id`.
- `RbacGuard` enforces role and permission metadata.
- `BillingFeatureMiddleware` already resolves subscription feature state; module allocation must be separate from billing but future-ready for billing hooks.
- Frontend production navigation is controlled by `apps/web/src/lib/features/module-readiness.ts`.
- Current release gates intentionally block the retired legacy attendance module. This plan adds teacher biometric attendance as a new audited HR/admin subsystem and updates the gate language so legacy attendance remains retired while teacher biometric attendance is allowed.

---

## 1. Non-Negotiables

- A school only sees modules assigned in `school_module_access` with `enabled = true`.
- School admins cannot self-enable modules.
- Superadmin is the only role allowed to create, update, enable, disable, or bulk assign tenant module access.
- Disabling a module never deletes operational data.
- Backend checks must run before service methods mutate or read module-owned data.
- Frontend route guards and nav filters must hide disabled modules and show a plain "Module not enabled for your school" state for direct URLs.
- All new operational tables include `tenant_id`, `created_at`, `updated_at`, and `audit_log_reference`.
- All tenant data tables have RLS policies using `current_setting('app.tenant_id', true)`.
- Lab sessions must link to both a lab and a class section.
- Lab attendance is mandatory for mandatory lab sessions.
- Equipment and chemical usage must be logged per lab session.
- Expired chemicals cannot be issued.
- Biometric events are append-only and deduplicated by event hash.
- Manual teacher attendance overrides require Principal permission plus an audit reason.

---

## 2. File Structure

### Backend Files To Create

- `apps/api/src/modules/module-access/module-access.module.ts`
- `apps/api/src/modules/module-access/module-access-schema.service.ts`
- `apps/api/src/modules/module-access/module-access.controller.ts`
- `apps/api/src/modules/module-access/module-access.service.ts`
- `apps/api/src/modules/module-access/module-access.repository.ts`
- `apps/api/src/modules/module-access/module-access.constants.ts`
- `apps/api/src/modules/module-access/module-access.decorator.ts`
- `apps/api/src/modules/module-access/module-access.guard.ts`
- `apps/api/src/modules/module-access/dto/module-access.dto.ts`
- `apps/api/src/modules/module-access/module-access.test.ts`
- `apps/api/src/modules/labs/labs.module.ts`
- `apps/api/src/modules/labs/labs-schema.service.ts`
- `apps/api/src/modules/labs/labs.controller.ts`
- `apps/api/src/modules/labs/labs.service.ts`
- `apps/api/src/modules/labs/repositories/labs.repository.ts`
- `apps/api/src/modules/labs/dto/labs.dto.ts`
- `apps/api/src/modules/labs/labs.test.ts`
- `apps/api/src/modules/admin-command/admin-command.module.ts`
- `apps/api/src/modules/admin-command/admin-command-schema.service.ts`
- `apps/api/src/modules/admin-command/admin-command.controller.ts`
- `apps/api/src/modules/admin-command/admin-command.service.ts`
- `apps/api/src/modules/admin-command/repositories/admin-command.repository.ts`
- `apps/api/src/modules/admin-command/dto/admin-command.dto.ts`
- `apps/api/src/modules/admin-command/admin-command.test.ts`
- `apps/api/src/modules/biometric-attendance/biometric-attendance.module.ts`
- `apps/api/src/modules/biometric-attendance/biometric-attendance-schema.service.ts`
- `apps/api/src/modules/biometric-attendance/biometric-attendance.controller.ts`
- `apps/api/src/modules/biometric-attendance/biometric-attendance.service.ts`
- `apps/api/src/modules/biometric-attendance/biometric-attendance.processor.ts`
- `apps/api/src/modules/biometric-attendance/repositories/biometric-attendance.repository.ts`
- `apps/api/src/modules/biometric-attendance/dto/biometric-attendance.dto.ts`
- `apps/api/src/modules/biometric-attendance/biometric-attendance.test.ts`
- `apps/api/src/scripts/certify-module-access.ts`
- `apps/api/src/scripts/certify-academic-labs-admin.ts`
- `apps/api/src/scripts/certify-biometric-attendance.ts`

### Backend Files To Modify

- `apps/api/src/app.module.ts`
- `apps/api/src/auth/auth.constants.ts`
- `apps/api/src/auth/repositories/authorization.repository.ts`
- `apps/api/src/modules/platform/dto/create-school.dto.ts`
- `apps/api/src/modules/platform/platform-onboarding.controller.ts`
- `apps/api/src/modules/platform/platform-onboarding.service.ts`
- `apps/api/src/modules/academics/academics-schema.service.ts`
- `apps/api/src/modules/academics/academics.controller.ts`
- `apps/api/src/modules/academics/academics.service.ts`
- `apps/api/src/modules/academics/repositories/academics.repository.ts`
- `apps/api/src/modules/academics/dto/academic.dto.ts`
- `apps/api/src/modules/students/students-schema.service.ts`
- `apps/api/src/modules/students/students.controller.ts`
- `apps/api/src/modules/students/students.service.ts`
- `apps/api/src/modules/students/repositories/students.repository.ts`
- `apps/api/src/modules/timetable/timetable.controller.ts`
- `apps/api/src/modules/hr/hr.controller.ts`
- `apps/api/src/modules/integrations/school-sms.controller.ts`
- `apps/api/src/common/reports/report-export-queue.ts`
- `apps/api/src/common/reports/report-snapshot-manifest.ts`
- `apps/api/src/scripts/release-readiness-gate.ts`
- `apps/api/src/scripts/tenant-isolation-audit.ts`
- `apps/api/src/scripts/audit-coverage-review.ts`
- `apps/api/src/database/schema.sql`
- `package.json`

### Frontend Files To Create

- `apps/web/src/lib/module-access/module-access-client.ts`
- `apps/web/src/lib/module-access/module-access-map.ts`
- `apps/web/src/components/module-access/module-disabled-panel.tsx`
- `apps/web/src/components/platform/module-allocation-panel.tsx`
- `apps/web/src/components/platform/school-onboarding-wizard.tsx`
- `apps/web/src/components/modules/labs/labs-module-screen.tsx`
- `apps/web/src/components/modules/admin-command/principal-command-center.tsx`
- `apps/web/src/components/modules/admin-command/deputy-command-center.tsx`
- `apps/web/src/components/modules/admin-command/secretary-command-center.tsx`
- `apps/web/src/components/modules/biometric-attendance/teacher-biometric-attendance-screen.tsx`
- `apps/web/tests/design/module-access.test.tsx`
- `apps/web/tests/design/superadmin-module-allocation.test.tsx`
- `apps/web/tests/design/academic-labs-admin-navigation.test.tsx`

### Frontend Files To Modify

- `apps/web/src/lib/features/module-readiness.ts`
- `apps/web/src/lib/routing/experience-routes.ts`
- `apps/web/src/lib/experiences/school-data.ts`
- `apps/web/src/lib/platform/school-onboarding-client.ts`
- `apps/web/src/components/platform/superadmin-pages.tsx`
- `apps/web/src/components/school/school-pages.tsx`
- `apps/web/src/app/school/[role]/[section]/page.tsx`
- `apps/web/src/app/api/platform/[...path]/route.ts`
- `apps/web/src/app/api/school/[...path]/route.ts`
- `apps/web/src/app/api/integrations/[...path]/route.ts`
- `apps/web/src/app/api/admissions/[...path]/route.ts`

---

## 3. Module Registry

Seed these module codes in `module_registry`:

| Code | Name | Initial route ids | Billing-ready fields |
| --- | --- | --- | --- |
| `students` | Student Management | `students` | base module |
| `academics` | Academic Structure | `academics` | base module |
| `finance` | Fee Management | `finance`, `mpesa` | per-student multiplier later |
| `exams` | Exams and Results | `exams` | plan mapping later |
| `discipline` | Discipline | `discipline` | per-student multiplier later |
| `timetable` | Timetable | `timetable` | base module |
| `lab_management` | Laboratory Management | `labs` | per-lab pricing later |
| `teacher_biometric_attendance` | Teacher Attendance | `teacher-biometric` | device pricing later |
| `parent_portal` | Parent Portal | `portal` | per-parent or per-student later |
| `inventory` | Store and Inventory | `inventory` | base module |
| `transport` | Transport | `transport` | per-vehicle later |
| `communication_sms` | Communication and SMS | `communication` | wallet plus per-message billing |
| `reports` | Reports | `reports` | export volume later |
| `staff` | Staff and HR | `staff` | per-staff later |
| `admin_command_centers` | Administrative Leadership | `principal`, `deputy-principal`, `secretary` | role pack later |

Use stable module codes in code and URLs. Display names can change without breaking permissions.

---

## 4. Database Schema Delta

Add this schema through the new schema services first, then mirror in `apps/api/src/database/schema.sql` once tests pass.

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS module_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  base_price_cents integer NOT NULL DEFAULT 0,
  per_student_price_cents integer NOT NULL DEFAULT 0,
  billing_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  audit_log_reference uuid,
  CONSTRAINT ck_module_registry_status CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS school_module_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  module_id uuid NOT NULL REFERENCES module_registry(id),
  enabled boolean NOT NULL DEFAULT true,
  enabled_at timestamptz,
  disabled_at timestamptz,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  audit_log_reference uuid,
  CONSTRAINT uq_school_module_access UNIQUE (tenant_id, module_id),
  CONSTRAINT ck_school_module_access_dates CHECK (
    (enabled = true AND enabled_at IS NOT NULL AND disabled_at IS NULL)
    OR (enabled = false AND disabled_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS ix_school_module_access_tenant_enabled
  ON school_module_access (tenant_id, enabled);

CREATE TABLE IF NOT EXISTS academic_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  system_type text NOT NULL,
  name text NOT NULL,
  order_index integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  audit_log_reference uuid,
  CONSTRAINT uq_academic_levels_tenant_id_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_academic_levels_order UNIQUE (tenant_id, order_index),
  CONSTRAINT ck_academic_levels_system CHECK (system_type IN ('CBC', 'CBE', '8-4-4', 'International', 'Custom'))
);

CREATE TABLE IF NOT EXISTS class_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  class_section_id uuid NOT NULL,
  name text NOT NULL,
  capacity integer,
  class_teacher_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  audit_log_reference uuid,
  CONSTRAINT uq_class_streams_tenant_id_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_class_streams_scope UNIQUE (tenant_id, class_section_id, name),
  CONSTRAINT fk_class_streams_class
    FOREIGN KEY (tenant_id, class_section_id)
    REFERENCES class_sections (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS student_class_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  student_id uuid NOT NULL,
  class_section_id uuid NOT NULL,
  stream_id uuid,
  academic_level_id uuid NOT NULL,
  academic_year_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  assigned_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  audit_log_reference uuid,
  CONSTRAINT uq_student_class_assignments_tenant_id_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_student_active_class_year UNIQUE (tenant_id, student_id, academic_year_id, status),
  CONSTRAINT fk_student_class_assignments_class
    FOREIGN KEY (tenant_id, class_section_id)
    REFERENCES class_sections (tenant_id, id),
  CONSTRAINT fk_student_class_assignments_stream
    FOREIGN KEY (tenant_id, stream_id)
    REFERENCES class_streams (tenant_id, id),
  CONSTRAINT fk_student_class_assignments_level
    FOREIGN KEY (tenant_id, academic_level_id)
    REFERENCES academic_levels (tenant_id, id),
  CONSTRAINT fk_student_class_assignments_year
    FOREIGN KEY (tenant_id, academic_year_id)
    REFERENCES academic_years (tenant_id, id),
  CONSTRAINT ck_student_class_assignment_status CHECK (status IN ('active', 'transferred', 'completed', 'withdrawn'))
);

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
    REFERENCES lab_departments (tenant_id, id)
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

CREATE TABLE IF NOT EXISTS biometric_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  name text NOT NULL,
  location text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  last_sync_time timestamptz,
  registered_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  audit_log_reference uuid,
  CONSTRAINT uq_biometric_devices_tenant_id_id UNIQUE (tenant_id, id),
  CONSTRAINT ck_biometric_devices_status CHECK (status IN ('active', 'inactive', 'maintenance', 'revoked'))
);

CREATE TABLE IF NOT EXISTS biometric_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  teacher_user_id uuid NOT NULL,
  biometric_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  enrolled_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  audit_log_reference uuid,
  CONSTRAINT uq_biometric_identities_tenant_hash UNIQUE (tenant_id, biometric_hash),
  CONSTRAINT ck_biometric_identities_status CHECK (status IN ('active', 'disabled'))
);

CREATE TABLE IF NOT EXISTS biometric_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  device_id uuid NOT NULL,
  biometric_hash text NOT NULL,
  event_hash text NOT NULL,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  offline_mode_flag boolean NOT NULL DEFAULT false,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processing_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  audit_log_reference uuid,
  CONSTRAINT uq_biometric_events_hash UNIQUE (tenant_id, event_hash),
  CONSTRAINT fk_biometric_events_device
    FOREIGN KEY (tenant_id, device_id)
    REFERENCES biometric_devices (tenant_id, id),
  CONSTRAINT ck_biometric_events_type CHECK (event_type IN ('check_in', 'check_out')),
  CONSTRAINT ck_biometric_events_processing_status CHECK (processing_status IN ('pending', 'processed', 'duplicate', 'unmatched', 'rejected'))
);

CREATE TABLE IF NOT EXISTS teacher_attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  teacher_user_id uuid NOT NULL,
  attendance_date date NOT NULL,
  event_id uuid,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  device_id uuid,
  status text NOT NULL,
  rule_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  manual_override boolean NOT NULL DEFAULT false,
  override_reason text,
  override_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  audit_log_reference uuid,
  CONSTRAINT fk_teacher_attendance_logs_event
    FOREIGN KEY (tenant_id, event_id)
    REFERENCES biometric_events (tenant_id, id),
  CONSTRAINT ck_teacher_attendance_logs_event_type CHECK (event_type IN ('check_in', 'check_out', 'absence_mark', 'manual_override')),
  CONSTRAINT ck_teacher_attendance_logs_status CHECK (status IN ('present', 'late', 'absent', 'half_day', 'excused', 'manual_override'))
);

CREATE TABLE IF NOT EXISTS attendance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL UNIQUE,
  default_start_time time NOT NULL DEFAULT '07:30',
  grace_period_minutes integer NOT NULL DEFAULT 10,
  absence_cutoff_time time NOT NULL DEFAULT '09:00',
  half_day_checkout_cutoff time NOT NULL DEFAULT '12:30',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  audit_log_reference uuid,
  CONSTRAINT ck_attendance_rules_grace CHECK (grace_period_minutes BETWEEN 0 AND 60)
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
```

Every table above must receive `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, and a tenant policy. Use the existing `academics_tenant_policy` style for tenant tables. `module_registry` is global read-only data and does not use tenant RLS; writes are Superadmin-only through the platform module access API.

---

## 5. API Contract

### Superadmin Module Allocation

| Method | Path | Permission | Behavior |
| --- | --- | --- | --- |
| `GET` | `/platform/modules` | `@Roles('platform_owner')` | List global module registry and status. |
| `POST` | `/platform/modules` | `@Roles('platform_owner')` | Create or update module definition. |
| `GET` | `/platform/schools/:tenantId/modules` | `@Roles('platform_owner')` | View assigned modules for one school. |
| `PUT` | `/platform/schools/:tenantId/modules` | `@Roles('platform_owner')` | Bulk replace allocation during onboarding or update. |
| `PATCH` | `/platform/schools/:tenantId/modules/:moduleCode` | `@Roles('platform_owner')` | Toggle one module without deleting module data. |
| `GET` | `/school/modules/me` | authenticated tenant user | List enabled modules for the current tenant. |

### Academic Structure

| Method | Path | Permission | Module |
| --- | --- | --- | --- |
| `POST` | `/academics/levels` | `academics:write` | `academics` |
| `POST` | `/academics/classes` | `academics:write` | `academics` |
| `POST` | `/academics/classes/:classId/streams` | `academics:write` | `academics` |
| `POST` | `/academics/student-class-assignments` | `students:write` plus `academics:write` | `academics` |
| `GET` | `/academics/class-structure` | `academics:read` | `academics` |

### Lab Management

| Method | Path | Permission | Module |
| --- | --- | --- | --- |
| `POST` | `/labs/departments` | `labs:write` | `lab_management` |
| `POST` | `/labs` | `labs:write` | `lab_management` |
| `POST` | `/labs/sessions` | `labs:write` | `lab_management` |
| `POST` | `/labs/sessions/:sessionId/attendance` | `labs:attendance` | `lab_management` |
| `POST` | `/labs/equipment` | `labs:inventory` | `lab_management` |
| `POST` | `/labs/chemicals` | `labs:inventory` | `lab_management` |
| `POST` | `/labs/sessions/:sessionId/equipment-usage` | `labs:inventory` | `lab_management` |
| `POST` | `/labs/sessions/:sessionId/chemical-usage` | `labs:inventory` | `lab_management` |
| `POST` | `/labs/chemicals/:chemicalId/disposal-requests` | `labs:inventory` | `lab_management` |
| `POST` | `/labs/disposal-requests/:requestId/approve` | `labs:approve-disposal` | `lab_management` |

### Administrative Command Centers

| Method | Path | Permission | Module |
| --- | --- | --- | --- |
| `GET` | `/admin-command/principal/dashboard` | `principal:read` | `admin_command_centers` |
| `GET` | `/admin-command/deputy/dashboard` | `deputy:read` | `admin_command_centers` |
| `GET` | `/admin-command/secretary/dashboard` | `secretary:read` | `admin_command_centers` |
| `POST` | `/admin-command/incidents` | `deputy:write` or `principal:write` | `admin_command_centers` |
| `POST` | `/admin-command/announcements` | `secretary:write` | `communication_sms` |
| `POST` | `/admin-command/meeting-minutes` | `secretary:write` | `admin_command_centers` |
| `GET` | `/admin-command/reports/:reportId/export` | `reports:read` | `reports` |

### Biometric Teacher Attendance

| Method | Path | Permission | Module |
| --- | --- | --- | --- |
| `POST` | `/biometric-attendance/devices` | `teacher_attendance:devices` | `teacher_biometric_attendance` |
| `POST` | `/biometric-attendance/identities` | `teacher_attendance:devices` | `teacher_biometric_attendance` |
| `POST` | `/biometric-attendance/events/sync` | device token or `teacher_attendance:devices` | `teacher_biometric_attendance` |
| `GET` | `/biometric-attendance/teacher-logs` | `teacher_attendance:read` | `teacher_biometric_attendance` |
| `POST` | `/biometric-attendance/manual-overrides` | `teacher_attendance:override` | `teacher_biometric_attendance` |
| `GET` | `/biometric-attendance/reports/monthly` | `teacher_attendance:reports` | `teacher_biometric_attendance` |

---

## 6. Implementation Tasks

### Task 1: Add Module Registry And School Module Allocation

**Files:**
- Create: `apps/api/src/modules/module-access/module-access-schema.service.ts`
- Create: `apps/api/src/modules/module-access/module-access.constants.ts`
- Create: `apps/api/src/modules/module-access/module-access.repository.ts`
- Create: `apps/api/src/modules/module-access/module-access.service.ts`
- Create: `apps/api/src/modules/module-access/module-access.controller.ts`
- Create: `apps/api/src/modules/module-access/module-access.module.ts`
- Create: `apps/api/src/modules/module-access/dto/module-access.dto.ts`
- Create: `apps/api/src/modules/module-access/module-access.test.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/modules/platform/platform-onboarding.service.ts`
- Modify: `apps/api/src/modules/platform/dto/create-school.dto.ts`
- Modify: `apps/api/src/modules/platform/platform-onboarding.controller.ts`

- [x] **Step 1: Write module-access tests**

Add tests that assert seed modules exist, school allocation toggles do not delete data, and only `platform_owner` controller metadata can mutate allocations.

```ts
import 'reflect-metadata';

import assert from 'node:assert/strict';
import test from 'node:test';
import { PATH_METADATA } from '@nestjs/common/constants';

import { SUPERADMIN_ROLE_OWNER } from '../../auth/auth.constants';
import { ROLES_KEY } from '../../auth/auth.constants';
import { MODULE_REGISTRY_SEED } from './module-access.constants';
import { PlatformModuleAccessController } from './module-access.controller';

test('module registry seed contains required tenant allocation modules', () => {
  const codes = MODULE_REGISTRY_SEED.map((module) => module.code);

  assert.deepEqual(
    [
      'students',
      'academics',
      'finance',
      'exams',
      'discipline',
      'timetable',
      'lab_management',
      'teacher_biometric_attendance',
      'parent_portal',
      'inventory',
      'transport',
      'communication_sms',
      'reports',
      'staff',
      'admin_command_centers',
    ].every((code) => codes.includes(code)),
    true,
  );
});

test('platform module allocation routes require platform owner role', () => {
  assert.equal(Reflect.getMetadata(PATH_METADATA, PlatformModuleAccessController), 'platform');
  assert.deepEqual(
    Reflect.getMetadata(ROLES_KEY, PlatformModuleAccessController),
    [SUPERADMIN_ROLE_OWNER],
  );
});
```

- [x] **Step 2: Implement module constants**

```ts
export const MODULE_REGISTRY_SEED = [
  { code: 'students', name: 'Student Management', description: 'Student records, profiles, and lifecycle.' },
  { code: 'academics', name: 'Academic Structure', description: 'Levels, classes, streams, subjects, and assignments.' },
  { code: 'finance', name: 'Fee Management', description: 'Fee structures, invoices, payments, and arrears.' },
  { code: 'exams', name: 'Exams and Results', description: 'Assessments, marks, reports, and academic analytics.' },
  { code: 'discipline', name: 'Discipline', description: 'Incidents, actions, escalation, counselling, and behavior analytics.' },
  { code: 'timetable', name: 'Timetable', description: 'Published timetables, lesson coverage, and schedule conflicts.' },
  { code: 'lab_management', name: 'Laboratory Management', description: 'Labs, sessions, equipment, chemicals, and safety controls.' },
  { code: 'teacher_biometric_attendance', name: 'Teacher Attendance', description: 'Biometric teacher scans, attendance logs, devices, and reports.' },
  { code: 'parent_portal', name: 'Parent Portal', description: 'Parent and student self-service portals.' },
  { code: 'inventory', name: 'Store and Inventory', description: 'Stock, procurement, issuing, transfers, and reconciliation.' },
  { code: 'transport', name: 'Transport', description: 'Routes, vehicles, learners, and trip operations.' },
  { code: 'communication_sms', name: 'Communication and SMS', description: 'SMS wallet, announcements, reminders, and delivery logs.' },
  { code: 'reports', name: 'Reports', description: 'PDF, CSV, Excel, scheduled, and operational reports.' },
  { code: 'staff', name: 'Staff and HR', description: 'Staff profiles, contracts, leave, documents, and duty ownership.' },
  { code: 'admin_command_centers', name: 'Administrative Leadership', description: 'Principal, deputy principal, and secretary command centers.' },
] as const;

export type ModuleCode = (typeof MODULE_REGISTRY_SEED)[number]['code'];
```

- [x] **Step 3: Implement repository operations**

Repository methods must be transaction-safe and use one allocation row per tenant/module.

```ts
async setSchoolModules(input: {
  tenantId: string;
  moduleCodes: string[];
  updatedBy: string | null;
}) {
  await this.databaseService.withRequestTransaction(async () => {
    await this.seedRegistry();

    await this.databaseService.query(
      `
        UPDATE school_module_access sma
        SET enabled = false,
            disabled_at = NOW(),
            updated_by = $2::uuid,
            updated_at = NOW()
        FROM module_registry mr
        WHERE sma.module_id = mr.id
          AND sma.tenant_id = $1
          AND sma.enabled = true
          AND NOT (mr.code = ANY($3::text[]))
      `,
      [input.tenantId, input.updatedBy, input.moduleCodes],
    );

    await this.databaseService.query(
      `
        INSERT INTO school_module_access (
          tenant_id, module_id, enabled, enabled_at, disabled_at, updated_by
        )
        SELECT $1, id, true, NOW(), NULL, $3::uuid
        FROM module_registry
        WHERE code = ANY($2::text[])
          AND status = 'active'
        ON CONFLICT (tenant_id, module_id)
        DO UPDATE SET
          enabled = true,
          enabled_at = COALESCE(school_module_access.enabled_at, NOW()),
          disabled_at = NULL,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      `,
      [input.tenantId, input.moduleCodes, input.updatedBy],
    );
  });
}
```

- [x] **Step 4: Wire onboarding selected modules**

Extend `CreateSchoolDto` with:

```ts
@IsArray()
@ArrayNotEmpty()
@IsString({ each: true })
module_codes!: string[];
```

In `PlatformOnboardingService.createSchool`, after `ensureTenantAuthorizationBaseline(tenantId)`, call:

```ts
await this.moduleAccessService.setSchoolModules({
  tenantId,
  moduleCodes: dto.module_codes,
  updatedBy: invitedByUserId,
});
```

Return `enabled_modules: string[]` in `PlatformSchoolResponseDto`.

- [x] **Step 5: Run targeted tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/module-access/module-access.test.js dist/apps/api/src/modules/platform/platform-onboarding.service.test.js
```

Expected: build passes, module-access tests pass, platform onboarding tests pass after updating expected response payloads.

### Task 2: Add Runtime Module Access Guard

**Files:**
- Create: `apps/api/src/modules/module-access/module-access.decorator.ts`
- Create: `apps/api/src/modules/module-access/module-access.guard.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: each module controller listed in Section 5
- Modify: `apps/api/src/app-route-permissions.test.ts`

- [x] **Step 1: Write guard tests**

```ts
test('ModuleAccessGuard throws payment-style module disabled error for missing tenant module', async () => {
  const guard = new ModuleAccessGuard(reflector, requestContext, service);
  service.hasModule = async () => false;
  reflector.getAllAndOverride = () => ['lab_management'];

  await assert.rejects(
    () => guard.canActivate(executionContext),
    /Module not enabled for your school/i,
  );
});
```

- [x] **Step 2: Implement decorator**

```ts
import { SetMetadata } from '@nestjs/common';
import type { ModuleCode } from './module-access.constants';

export const MODULE_ACCESS_KEY = 'module_access';

export const RequiresModule = (...moduleCodes: ModuleCode[]) =>
  SetMetadata(MODULE_ACCESS_KEY, moduleCodes);
```

- [x] **Step 3: Implement guard**

```ts
@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly requestContext: RequestContextService,
    private readonly moduleAccessService: ModuleAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModules = this.reflector.getAllAndOverride<ModuleCode[]>(MODULE_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredModules?.length) {
      return true;
    }

    const store = this.requestContext.requireStore();

    if (!store.tenant_id) {
      throw new ForbiddenException('Tenant context is required for module access checks');
    }

    const missingModule = await this.moduleAccessService.findFirstMissingModule(
      store.tenant_id,
      requiredModules,
    );

    if (missingModule) {
      throw new ForbiddenException('Module not enabled for your school');
    }

    return true;
  }
}
```

- [x] **Step 4: Register guard after RBAC**

Add it as an `APP_GUARD` after `RbacGuard` in `apps/api/src/app.module.ts`. Keep RBAC first so unauthenticated users do not learn module assignment state.

- [x] **Step 5: Annotate controllers**

Examples:

```ts
@Controller('labs')
@RequiresModule('lab_management')
export class LabsController {}

@Controller('academics')
@RequiresModule('academics')
export class AcademicsController {}

@Controller('school/sms')
@RequiresModule('communication_sms')
export class SchoolSmsController {}
```

- [x] **Step 6: Run access metadata and module guard tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/app-route-permissions.test.js dist/apps/api/src/modules/module-access/module-access.test.js
```

Expected: every controller route still has explicit RBAC metadata and every protected module route has module metadata.

### Task 3: Build Superadmin Module Allocation UI And Onboarding Wizard

**Files:**
- Create: `apps/web/src/components/platform/module-allocation-panel.tsx`
- Create: `apps/web/src/components/platform/school-onboarding-wizard.tsx`
- Create: `apps/web/tests/design/superadmin-module-allocation.test.tsx`
- Modify: `apps/web/src/lib/platform/school-onboarding-client.ts`
- Modify: `apps/web/src/components/platform/superadmin-pages.tsx`

- [x] **Step 1: Extend frontend client**

```ts
export type PlatformModule = {
  code: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  enabled: boolean;
  enabled_at?: string;
  disabled_at?: string;
};

export async function fetchPlatformModules() {
  const response = await fetch('/api/platform/modules', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  return parsePlatformResponse(response) as Promise<PlatformModule[]>;
}

export async function updateSchoolModules(input: { tenantId: string; moduleCodes: string[] }) {
  const response = await fetch(`/api/platform/schools/${encodeURIComponent(input.tenantId)}/modules`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-myshule-csrf': await getCsrfToken(),
    },
    credentials: 'same-origin',
    body: JSON.stringify({ module_codes: input.moduleCodes }),
  });
  return parsePlatformResponse(response) as Promise<PlatformModule[]>;
}
```

- [x] **Step 2: Replace create-school modal with wizard steps**

Wizard steps:

1. School identity: name, slug, county, admin name, admin email.
2. Module allocation: checkbox grid from `/api/platform/modules`.
3. Subscription preview: total base price, student multiplier fields shown as "pricing-ready" but not charged until billing integration ships.
4. Confirm and create tenant: POST school plus `module_codes`.

The submit payload must include:

```json
{
  "school_name": "Alliance High School",
  "tenant_id": "alliance-high",
  "county": "Kiambu",
  "admin_name": "School Administrator",
  "admin_email": "admin@example.com",
  "module_codes": ["students", "academics", "finance", "communication_sms"]
}
```

- [x] **Step 3: Add school search and edit allocation panel**

`ModuleAllocationPanel` renders:

- Search input filtering tenant rows by school name, tenant id, county, or admin email.
- Module toggles grouped as Academic, Operations, Finance, Welfare, Platform.
- Save button disabled until a change exists.
- Warning text: "Disabling a module hides it from the school. Existing data is preserved."

- [x] **Step 4: Run frontend tests**

Run:

```bash
npm --prefix apps/web run lint
npm --prefix apps/web run test:design -- superadmin-module-allocation
```

Expected: lint passes and wizard tests assert module checkbox payloads are sent.

### Task 4: Upgrade Academic Structure For CBC, CBE, 8-4-4, International, And Custom Schools

**Files:**
- Modify: `apps/api/src/modules/academics/academics-schema.service.ts`
- Modify: `apps/api/src/modules/academics/academics.controller.ts`
- Modify: `apps/api/src/modules/academics/academics.service.ts`
- Modify: `apps/api/src/modules/academics/repositories/academics.repository.ts`
- Modify: `apps/api/src/modules/academics/dto/academic.dto.ts`
- Modify: `apps/api/src/modules/students/students-schema.service.ts`
- Modify: `apps/api/src/modules/students/students.service.ts`
- Modify: `apps/api/src/modules/students/repositories/students.repository.ts`
- Modify: `apps/api/src/modules/academics/academics.test.ts`
- Modify: `apps/api/src/modules/students/students.test.ts`

- [x] **Step 1: Add academic-level tests**

Assert that:

- `system_type` accepts `CBC`, `CBE`, `8-4-4`, `International`, and `Custom`.
- classes require an `academic_level_id`.
- streams are optional.
- active students require one active class assignment for the academic year.

```ts
test('academic schema supports CBE levels and structured streams', () => {
  const sql = getAcademicsBootstrapSqlForTest();

  assert.match(sql, /CREATE TABLE IF NOT EXISTS academic_levels/);
  assert.match(sql, /CBE/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS class_streams/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS student_class_assignments/);
});
```

- [x] **Step 2: Extend class sections**

Add to `class_sections`:

```sql
ALTER TABLE class_sections
  ADD COLUMN IF NOT EXISTS academic_level_id uuid,
  ADD COLUMN IF NOT EXISTS custom_label text,
  ADD COLUMN IF NOT EXISTS capacity integer,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE class_sections
  ADD CONSTRAINT fk_class_sections_academic_level
  FOREIGN KEY (tenant_id, academic_level_id)
  REFERENCES academic_levels (tenant_id, id);
```

- [x] **Step 3: Implement createClassStructure endpoint**

DTO shape:

```ts
export class CreateClassStructureDto {
  @IsIn(['CBC', 'CBE', '8-4-4', 'International', 'Custom'])
  system_type!: 'CBC' | 'CBE' | '8-4-4' | 'International' | 'Custom';

  @IsArray()
  levels!: Array<{
    name: string;
    order_index: number;
    classes: Array<{
      name: string;
      custom_label?: string;
      capacity?: number;
      streams?: Array<{ name: string; capacity?: number; class_teacher_id?: string }>;
    }>;
  }>;
}
```

Service rules:

- Create levels first.
- Create classes with the created `academic_level_id`.
- Create streams only when supplied.
- Wrap the full structure in `withRequestTransaction`.
- Write one `academic_audit_logs` row with action `academics.class_structure_created`.

- [x] **Step 4: Implement student class assignment**

Endpoint:

```ts
@Post('student-class-assignments')
@Permissions('students:write', 'academics:write')
assignStudentToClass(@Body() dto: AssignStudentToClassDto) {
  return this.academicsService.assignStudentToClass(dto);
}
```

Validation:

- `student_id`, `class_section_id`, `academic_level_id`, and `academic_year_id` are required.
- `stream_id` is optional.
- If `stream_id` is present, it must belong to the selected class.
- The repository closes any previous active assignment for that student/year before inserting the new active row.

- [x] **Step 5: Run tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/academics/academics.test.js dist/apps/api/src/modules/students/students.test.js
```

Expected: academics and students tests pass with class assignment coverage.

### Task 5: Build Laboratory Department, Session, Attendance, Equipment, And Chemical Management

**Files:**
- Create: `apps/api/src/modules/labs/*`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/auth/auth.constants.ts`
- Create: `apps/web/src/components/modules/labs/labs-module-screen.tsx`
- Modify: `apps/web/src/components/school/school-pages.tsx`
- Modify: `apps/web/src/lib/routing/experience-routes.ts`
- Modify: `apps/web/src/lib/experiences/school-data.ts`

- [x] **Step 1: Add lab permissions**

Append to `DEFAULT_PERMISSION_CATALOG`:

```ts
{ resource: 'labs', action: 'read', description: 'View laboratory departments, labs, sessions, inventory, and safety reports' },
{ resource: 'labs', action: 'write', description: 'Manage laboratory departments, labs, and sessions' },
{ resource: 'labs', action: 'attendance', description: 'Record mandatory laboratory attendance' },
{ resource: 'labs', action: 'inventory', description: 'Manage laboratory equipment and chemicals' },
{ resource: 'labs', action: 'approve-disposal', description: 'Approve chemical disposal requests' },
```

Assign these permissions:

- owner/admin: all lab permissions.
- teacher: `labs:read`, `labs:attendance`.
- staff/storekeeper: `labs:read`, `labs:inventory`.
- principal: all lab permissions through the owner/admin role or a new principal role in Task 7.

- [x] **Step 2: Write lab service tests**

Required assertions:

- Create lab session fails if `lab_id` is missing.
- Create lab session fails if `class_section_id` is missing.
- Issuing expired chemical fails.
- Equipment issue decrements `quantity_available` and increments `quantity_in_use`.
- Reconciliation sets returned quantity and damage count without deleting usage records.
- Mandatory lab session completion fails until all students in the class assignment list have attendance rows.

- [x] **Step 3: Implement chemical safety checks**

Use this service shape before insert:

```ts
private assertChemicalCanBeIssued(chemical: ChemicalRow, requestedQuantity: number, now = new Date()) {
  if (chemical.status === 'expired' || new Date(chemical.expiry_date) < now) {
    throw new BadRequestException('Expired chemicals cannot be issued');
  }

  if (chemical.status === 'quarantined' || chemical.status === 'disposed') {
    throw new BadRequestException('This chemical batch is not available for use');
  }

  if (Number(chemical.quantity_available) < requestedQuantity) {
    throw new BadRequestException('Requested chemical quantity exceeds available batch quantity');
  }
}
```

- [x] **Step 4: Add lab UI**

`LabsModuleScreen` includes tabs:

- Departments.
- Labs.
- Sessions.
- Attendance.
- Equipment.
- Chemicals.
- Reconciliation.
- Safety alerts.

The Attendance tab must show a class roster derived from the class assignment API and batch submit:

```json
{
  "attendance": [
    { "student_id": "uuid", "status": "present" },
    { "student_id": "uuid", "status": "absent" }
  ]
}
```

- [x] **Step 5: Run backend and frontend tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/labs/labs.test.js
npm --prefix apps/web run lint
npm --prefix apps/web run test:design -- academic-labs-admin-navigation
```

Expected: lab API tests pass and UI tests find the Labs route only when `lab_management` is enabled.

### Task 6: Add Administrative Leadership Roles And Command Centers

**Files:**
- Create: `apps/api/src/modules/admin-command/*`
- Modify: `apps/api/src/auth/auth.constants.ts`
- Modify: `apps/api/src/auth/repositories/authorization.repository.ts`
- Modify: `apps/api/src/modules/discipline/discipline.service.ts`
- Modify: `apps/api/src/modules/hr/hr.service.ts`
- Modify: `apps/api/src/modules/timetable/timetable.service.ts`
- Create: `apps/web/src/components/modules/admin-command/principal-command-center.tsx`
- Create: `apps/web/src/components/modules/admin-command/deputy-command-center.tsx`
- Create: `apps/web/src/components/modules/admin-command/secretary-command-center.tsx`
- Modify: `apps/web/src/lib/experiences/school-data.ts`
- Modify: `apps/web/src/app/school/[role]/[section]/page.tsx`

- [x] **Step 1: Add role constants**

```ts
export const DEFAULT_ROLE_PRINCIPAL = 'principal';
export const DEFAULT_ROLE_DEPUTY_PRINCIPAL = 'deputy_principal';
export const DEFAULT_ROLE_SECRETARY = 'secretary';
```

Add permission catalog entries:

```ts
{ resource: 'principal', action: 'read', description: 'View strategic school command center and audit summaries' },
{ resource: 'principal', action: 'write', description: 'Approve policy actions and manual teacher attendance overrides' },
{ resource: 'deputy', action: 'read', description: 'View operations command center, attendance, discipline, and timetable execution' },
{ resource: 'deputy', action: 'write', description: 'Manage operations incidents, discipline workflow, and duty rosters' },
{ resource: 'secretary', action: 'read', description: 'View admissions, records, communications, meetings, and reports workspace' },
{ resource: 'secretary', action: 'write', description: 'Manage records, announcements, meeting minutes, and report exports' },
{ resource: 'teacher_attendance', action: 'read', description: 'View biometric teacher attendance logs' },
{ resource: 'teacher_attendance', action: 'devices', description: 'Register and manage biometric devices and identities' },
{ resource: 'teacher_attendance', action: 'override', description: 'Create audited manual teacher attendance overrides' },
{ resource: 'teacher_attendance', action: 'reports', description: 'View biometric teacher attendance reports' },
```

- [x] **Step 2: Define role permissions**

Principal:

- read all operational dashboards.
- read financial data.
- approve policy actions.
- view audit logs.
- create manual teacher attendance override with reason.

Deputy Principal:

- manage discipline cases.
- manage duty rosters.
- view teacher attendance logs.
- create operations incidents.
- monitor timetable execution.

Secretary:

- manage admissions.
- send communications.
- generate reports.
- manage records and meeting minutes.

- [x] **Step 3: Implement dashboard aggregation endpoints**

Principal dashboard returns:

```ts
type PrincipalDashboardResponse = {
  attendance_compliance_rate: number;
  fee_collection_rate: number;
  academic_performance_index: number;
  discipline_severity_index: number;
  staff_punctuality_score: number;
  subject_performance_trends: Array<{ subject: string; term: string; mean_score: number }>;
  class_rankings: Array<{ class_section_id: string; class_name: string; rank: number; score: number }>;
  discipline_clusters: Array<{ class_name: string; severity: string; count: number }>;
  fee_arrears_aging: { days_30: number; days_60: number; days_90: number };
};
```

Do not include infrastructure uptime, deployment health, or system failure cards in the Principal module.

- [x] **Step 4: Implement secretary document and meetings tables**

Use existing admissions documents when possible. Add meeting tables in `admin-command-schema.service.ts`:

```sql
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
```

- [x] **Step 5: Run tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/admin-command/admin-command.test.js dist/apps/api/src/auth/auth.test.js
npm --prefix apps/web run test:design -- academic-labs-admin-navigation
```

Expected: role catalog tests pass and role-specific command centers render only for allowed roles.

### Task 7: Build Offline-First Biometric Teacher Attendance

**Files:**
- Create: `apps/api/src/modules/biometric-attendance/*`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/events-worker.ts`
- Modify: `apps/api/src/scripts/release-readiness-gate.ts`
- Modify: `apps/api/src/scripts/release-readiness-gate.test.ts`
- Create: `apps/web/src/components/modules/biometric-attendance/teacher-biometric-attendance-screen.tsx`

- [x] **Step 1: Update retired attendance gates carefully**

Keep legacy attendance retired, but allow this new teacher biometric subsystem. Replace broad checks such as "any source contains attendance" with precise blockers:

- block route id `attendance`.
- block legacy paths `/attendance`, `/dashboard/*/attendance`, and old sync entity `attendance`.
- allow `teacher_biometric_attendance`, `teacher-attendance`, `biometric-attendance`, and `teacher_attendance:*` permissions.

Add this test:

```ts
test('release gate allows teacher biometric attendance while legacy attendance remains retired', () => {
  const result = runReleaseReadinessGate({
    moduleReadinessSource: `
      const productionReadyModules = new Set(["teacher-biometric"]);
      const inactiveModules = new Set(["attendance"]);
    `,
    syntheticJourneySource: JSON.stringify({
      journeys: [{ id: 'teacher-biometric', steps: [{ id: 'teacher-biometric', path: '/teacher-biometric' }] }],
    }),
    auditCoverageSource: 'teacher_biometric_attendance teacher_attendance:read',
    packageJsonSource: passingPackageJsonSource,
    incidentRunbookSource: passingIncidentRunbookSource,
    backupRunbookSource: passingBackupRunbookSource,
  });

  assert.equal(result.ok, true);
});
```

- [x] **Step 2: Implement event sync idempotency**

Device sync request:

```json
{
  "device_id": "uuid",
  "events": [
    {
      "event_hash": "sha256-device-event",
      "biometric_hash": "template-hash",
      "timestamp": "2026-05-19T04:30:00.000Z",
      "event_type": "check_in",
      "offline_mode_flag": true
    }
  ]
}
```

Repository insert:

```sql
INSERT INTO biometric_events (
  tenant_id, device_id, biometric_hash, event_hash, occurred_at, event_type, offline_mode_flag, raw_payload
)
VALUES ($1, $2::uuid, $3, $4, $5::timestamptz, $6, $7, $8::jsonb)
ON CONFLICT (tenant_id, event_hash)
DO UPDATE SET processing_status = 'duplicate', updated_at = NOW()
RETURNING id, processing_status;
```

- [x] **Step 3: Implement rule engine**

Rule evaluation:

```ts
function evaluateTeacherAttendanceStatus(input: {
  eventType: 'check_in' | 'check_out';
  occurredAt: Date;
  rule: {
    default_start_time: string;
    grace_period_minutes: number;
    absence_cutoff_time: string;
    half_day_checkout_cutoff: string;
  };
}) {
  if (input.eventType === 'check_out') {
    return 'present';
  }

  const threshold = buildLocalSchoolTime(input.occurredAt, input.rule.default_start_time);
  threshold.setMinutes(threshold.getMinutes() + input.rule.grace_period_minutes);

  return input.occurredAt > threshold ? 'late' : 'present';
}
```

Absence detection job:

- runs after each tenant's `absence_cutoff_time`.
- finds active teachers without a check-in event that date.
- writes append-only `teacher_attendance_logs` rows with `event_type = 'absence_mark'` and `status = 'absent'`.

- [x] **Step 4: Implement manual override**

Only Principal can override:

```ts
@Post('manual-overrides')
@Permissions('teacher_attendance:override')
@RequiresModule('teacher_biometric_attendance')
createManualOverride(@Body() dto: ManualTeacherAttendanceOverrideDto) {
  return this.biometricAttendanceService.createManualOverride(dto);
}
```

Service validation:

- `reason` must be at least 12 characters.
- `teacher_user_id`, `attendance_date`, and `status` are required.
- write `manual_override = true`, `override_by = current user`, and audit action `teacher_attendance.manual_override_created`.

- [x] **Step 5: Implement real-time feed**

Use existing Redis/BullMQ infrastructure:

- enqueue `biometric_event.received`.
- processor maps hash to teacher identity.
- processor writes attendance log.
- processor publishes `teacher_attendance.updated` for dashboard subscribers.

If WebSockets are not yet present in the API, expose a polling endpoint first:

```http
GET /biometric-attendance/live-feed?since=2026-05-19T04:00:00.000Z
```

The frontend refreshes every 15 seconds while the screen is open. WebSocket replacement can reuse the same response DTO.

- [x] **Step 6: Run tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/biometric-attendance/biometric-attendance.test.js dist/apps/api/src/scripts/release-readiness-gate.test.js
```

Expected: duplicate event handling, offline sync, late detection, absence marking, and manual override audit tests pass.

### Task 8: Make Academics, Communication/SMS, Reports, Staff, And Timetable Production Navigation Safe

**Files:**
- Modify: `apps/web/src/lib/features/module-readiness.ts`
- Modify: `apps/web/src/lib/module-access/module-access-map.ts`
- Modify: `apps/web/src/lib/experiences/school-data.ts`
- Modify: `apps/web/src/components/school/school-pages.tsx`
- Modify: `apps/web/src/app/school/[role]/[section]/page.tsx`
- Modify: `apps/api/src/common/reports/report-export-queue.ts`
- Modify: `apps/api/src/common/reports/report-snapshot-manifest.ts`
- Modify: `apps/api/src/modules/timetable/timetable.controller.ts`
- Modify: `apps/api/src/modules/hr/hr.controller.ts`
- Modify: `apps/api/src/modules/integrations/school-sms.controller.ts`

- [x] **Step 1: Add frontend route-to-module map**

```ts
export const routeModuleMap: Record<string, string> = {
  dashboard: 'students',
  students: 'students',
  admissions: 'students',
  finance: 'finance',
  mpesa: 'finance',
  academics: 'academics',
  exams: 'exams',
  discipline: 'discipline',
  inventory: 'inventory',
  library: 'library',
  reports: 'reports',
  communication: 'communication_sms',
  staff: 'staff',
  timetable: 'timetable',
  labs: 'lab_management',
  'teacher-biometric': 'teacher_biometric_attendance',
};
```

- [x] **Step 2: Change readiness from static inactive list to capability plus module access**

`module-readiness.ts` should keep only truly unimplemented modules inactive. Move these to production ready after guards and tests pass:

```ts
const productionReadyModules = new Set([
  'dashboard',
  'students',
  'admissions',
  'finance',
  'mpesa',
  'inventory',
  'library',
  'discipline',
  'exams',
  'academics',
  'communication',
  'reports',
  'staff',
  'timetable',
  'labs',
  'teacher-biometric',
  'settings',
  'support-new-ticket',
  'support-my-tickets',
  'support-knowledge-base',
  'support-system-status',
]);

const inactiveModules = new Set(['attendance', 'transport']);
```

The nav still filters per school using `enabled_modules`, so production ready does not mean every tenant sees every module.

- [x] **Step 3: Add disabled module panel**

Direct route to a disabled module returns:

```tsx
<ModuleDisabledPanel
  title="Module not enabled for your school"
  description="Ask your platform administrator to enable this module for this school."
/>
```

Do not call backend module APIs after the route guard determines the module is disabled.

- [x] **Step 4: Add backend module decorators**

Add `@RequiresModule` to:

- `AcademicsController`: `academics`.
- `SchoolSmsController`: `communication_sms`.
- report export endpoints: `reports`.
- `HrController`: `staff`.
- `TimetableController`: `timetable`.

- [x] **Step 5: Run tests**

Run:

```bash
npm run build
npm --prefix apps/web run lint
npm --prefix apps/web run test:design -- module-access
node --test dist/apps/api/src/app-route-permissions.test.js dist/apps/api/src/modules/module-access/module-access.test.js
```

Expected: nav exposes production-ready modules only when enabled for the tenant.

### Task 9: Add Background Jobs For Labs, Chemicals, Reconciliation, Reports, And Biometric Attendance

**Files:**
- Modify: `apps/api/src/events-worker.ts`
- Create: `apps/api/src/modules/labs/labs.processor.ts`
- Create: `apps/api/src/modules/biometric-attendance/biometric-attendance.processor.ts`
- Modify: `apps/api/src/modules/support/support-notification-delivery.service.ts`
- Modify: `apps/api/src/modules/discipline/discipline.service.ts`

- [x] **Step 1: Chemical expiry checker**

Job schedule:

- daily at 05:00 Africa/Nairobi.
- mark `expired` where `expiry_date < current_date`.
- mark `near_expiry` where `expiry_date <= current_date + interval '30 days'`.
- create alert notifications for HOD/admin.

SQL:

```sql
UPDATE chemical_items
SET status = CASE
  WHEN expiry_date < CURRENT_DATE THEN 'expired'
  WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'near_expiry'
  ELSE status
END,
updated_at = NOW()
WHERE status IN ('active', 'near_expiry');
```

- [x] **Step 2: Equipment reconciliation checker**

Job schedule:

- hourly during school hours.
- find `lab_session_equipment_usage` where `returned_quantity < quantity_used` and session ended more than 1 hour ago.
- create alerts for lab teacher and HOD.

- [x] **Step 3: Mandatory lab absence integration**

When a mandatory lab session is completed:

- students without attendance rows become `absent`.
- discipline module receives a behavior source event with low severity and source `lab_attendance`.
- academic reporting receives lab participation metric.

The data remains in labs tables; discipline and reports only reference the source.

- [x] **Step 4: Biometric absence checker**

Job schedule:

- tenant-aware schedule using each tenant's `attendance_rules.absence_cutoff_time`.
- append absence logs.
- publish deputy/principal alert counts.

- [x] **Step 5: Run worker tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/labs/labs.test.js dist/apps/api/src/modules/biometric-attendance/biometric-attendance.test.js
```

Expected: expiry, reconciliation, mandatory lab absence, and teacher absence jobs are deterministic under tests.

### Task 10: Certification, Isolation, And Release Gates

**Files:**
- Create: `apps/api/src/scripts/certify-module-access.ts`
- Create: `apps/api/src/scripts/certify-academic-labs-admin.ts`
- Create: `apps/api/src/scripts/certify-biometric-attendance.ts`
- Modify: `apps/api/src/scripts/tenant-isolation-audit.ts`
- Modify: `apps/api/src/scripts/audit-coverage-review.ts`
- Modify: `apps/api/src/scripts/release-readiness-gate.ts`
- Modify: `package.json`

- [x] **Step 1: Add certification scripts**

Certification must check:

- all new tenant tables contain `tenant_id`.
- all new tenant tables have RLS enabled and forced.
- every new controller has explicit RBAC metadata.
- every module-owned controller has `@RequiresModule`.
- module disabling does not delete lab, class, attendance, SMS, staff, or report data.
- legacy attendance route remains inactive.
- teacher biometric attendance route is allowed only through the new module.

- [x] **Step 2: Add package scripts**

```json
{
  "module-access:certify": "node -r ts-node/register/transpile-only -r tsconfig-paths/register apps/api/src/scripts/certify-module-access.ts",
  "academic-labs-admin:certify": "node -r ts-node/register/transpile-only -r tsconfig-paths/register apps/api/src/scripts/certify-academic-labs-admin.ts",
  "biometric-attendance:certify": "node -r ts-node/register/transpile-only -r tsconfig-paths/register apps/api/src/scripts/certify-biometric-attendance.ts"
}
```

Add these to `ci:full` after `tenant:isolation:audit`.

- [x] **Step 3: Full verification**

Run:

```bash
npm run build
npm --prefix apps/web run lint
npm --prefix apps/web run build
npm run test
npm run tenant:isolation:audit
npm run module-access:certify
npm run academic-labs-admin:certify
npm run biometric-attendance:certify
npm run release:readiness
```

Expected: all commands pass before removing module ids from the frontend inactive list in production.

---

## 7. Frontend UX Map

### Superadmin

- Schools page: list schools, search school, open module allocation panel.
- Onboarding wizard: create school, choose modules, preview subscription, activate tenant.
- Module registry page: active/inactive global module status and billing-ready fields.
- Audit logs: show module assignment changes with actor, tenant, module, previous state, next state, and timestamp.

### Principal

- Strategic dashboard: attendance compliance, fee collection, academic performance, discipline severity, staff punctuality.
- Academic intelligence: subject trends, class ranking, grading distribution anomalies, KCSE/CBC/CBE cohort performance.
- Staff oversight: biometric source only for teacher attendance.
- Discipline analytics: clustering, repeat offenders, suspension/expulsion pipeline.
- Finance read-only: arrears aging, collection rates, revenue breakdown, projections.
- Governance: policy approvals, immutable audit viewer, permission history.

### Deputy Principal

- Daily operations: live teacher biometric feed, missing teacher detection, student compliance summary, late alerts, timetable execution.
- Discipline enforcement: create cases, approve/reject cases, assign punishments, escalate to Principal.
- Lesson coverage: planned vs actual, missing lesson alerts.
- Duty roster: morning, lunch, gate duties with check-ins and missed duty escalation.
- Incident management: reported, reviewed, escalated, resolved.

### Secretary

- Admissions: onboarding workflow and document verification.
- Communication: SMS, email, emergency alerts, class messages, fee reminders.
- Records: student records, staff HR files, transcript storage, document versions.
- Reports: attendance, fee, discipline, and academic exports.
- Meetings: schedules, agenda, minutes, action items.

### Labs

- Departments and HOD assignment.
- Labs, capacity, and location.
- Class-linked sessions.
- Mandatory attendance marking.
- Equipment issue and reconciliation.
- Chemical batch tracking, expiry alerts, disposal approvals.

---

## 8. Data Safety And Disable/Re-enable Rules

Disabling a module:

- sets `school_module_access.enabled = false`.
- writes `disabled_at`.
- hides nav and direct route access.
- blocks backend module APIs.
- keeps all module tables untouched.
- keeps exports available only if the export module itself remains enabled and the requesting role has permission.

Re-enabling a module:

- sets `enabled = true`.
- clears `disabled_at`.
- does not seed demo data.
- surfaces existing records immediately.

No implementation task may add `DELETE FROM lab_*`, `DELETE FROM academic_*`, `DELETE FROM teacher_attendance_logs`, or `DELETE FROM school_sms_*` as part of module disable. Tenant deletion remains separate and must use the guarded platform deletion/deprovision flow already added in Implementation 14.

---

## 9. Audit Events

Add these audit actions:

- `module_access.registry_created`
- `module_access.registry_updated`
- `module_access.school_modules_replaced`
- `module_access.school_module_enabled`
- `module_access.school_module_disabled`
- `academics.class_structure_created`
- `academics.student_class_assigned`
- `labs.department_created`
- `labs.session_created`
- `labs.attendance_marked`
- `labs.equipment_issued`
- `labs.equipment_reconciled`
- `labs.chemical_issued`
- `labs.chemical_disposal_requested`
- `labs.chemical_disposal_approved`
- `admin_command.incident_created`
- `admin_command.policy_approved`
- `admin_command.meeting_minutes_created`
- `teacher_attendance.device_registered`
- `teacher_attendance.identity_enrolled`
- `teacher_attendance.event_synced`
- `teacher_attendance.manual_override_created`

Each audit event includes:

```json
{
  "tenant_id": "school-slug",
  "actor_user_id": "uuid-or-null",
  "module_code": "lab_management",
  "entity_type": "lab_session",
  "entity_id": "uuid",
  "previous_state": {},
  "next_state": {},
  "request_id": "request-id",
  "created_at": "2026-05-19T00:00:00.000Z"
}
```

---

## 10. Rollout Order

1. Backend module access schema, service, and Superadmin APIs.
2. Frontend Superadmin module allocation and onboarding wizard.
3. Backend module guard on existing controllers.
4. Frontend module-aware nav and disabled module state.
5. Academic structure schema and APIs.
6. Student class assignment enforcement.
7. Labs schema and APIs.
8. Labs UI.
9. Admin leadership RBAC, APIs, and UI.
10. Biometric device/event/log engine.
11. Biometric dashboard UI.
12. Background jobs.
13. Certification scripts.
14. Promote Academics, Communication/SMS, Reports, Staff, and Timetable in `module-readiness.ts`.

Commit sequence:

```bash
git add apps/api/src/modules/module-access apps/api/src/app.module.ts apps/api/src/modules/platform package.json
git commit -m "feat: add tenant module allocation"

git add apps/web/src/components/platform apps/web/src/lib/platform apps/web/tests/design
git commit -m "feat: add superadmin module allocation UI"

git add apps/api/src/modules/academics apps/api/src/modules/students apps/web/src/components/school
git commit -m "feat: add flexible academic class structure"

git add apps/api/src/modules/labs apps/web/src/components/modules/labs
git commit -m "feat: add laboratory management"

git add apps/api/src/modules/admin-command apps/api/src/modules/biometric-attendance apps/web/src/components/modules
git commit -m "feat: add admin command centers and biometric teacher attendance"

git add apps/api/src/scripts apps/web/src/lib/features apps/api/src/scripts/release-readiness-gate.ts
git commit -m "test: certify module-gated school operations"
```

---

## 11. Self-Review Checklist

- [x] Module allocation is independent per school.
- [x] Superadmin can enable, disable, bulk assign, and list modules.
- [x] School admins cannot modify allocation.
- [x] Backend module guard runs on every module-owned API.
- [x] Frontend routes hide disabled modules and show a graceful disabled state on direct access.
- [x] Onboarding includes module selection before activation.
- [x] Disabling a module preserves data.
- [x] Billing-ready fields exist without charging logic.
- [x] Academic structure supports CBC, CBE, 8-4-4, International, and Custom.
- [x] Students must have class assignment for active academic year workflows.
- [x] Labs require class linkage.
- [x] Mandatory lab attendance is enforced.
- [x] Equipment usage and reconciliation are logged.
- [x] Expired chemicals cannot be issued.
- [x] Disposal requires HOD/admin approval.
- [x] Principal, deputy principal, and secretary roles have separate command centers.
- [x] Biometric teacher attendance is append-only and deduplicated.
- [x] Offline device sync is idempotent.
- [x] Manual override requires Principal permission and reason.
- [x] Legacy attendance remains retired while teacher biometric attendance is allowed through a new gated module.
- [x] Academics, Communication/SMS, Reports, Staff, and Timetable are production nav items only after module guards and tests pass.

Plan complete and saved to `implementation20.md`.
