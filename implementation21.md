# Implementation 21 Principal Global Oversight, Modular Subscription, and Clinic Medicine Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` for parallel backend/frontend execution or `superpowers:executing-plans` for inline execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a module-aware Principal Executive Dashboard that aggregates only the modules enabled for the tenant, extend the subscription architecture for any module combination, and add a production-grade Clinic/Health medicine inventory with parent medical-history access.

**Architecture:** Extend the Implementation 20 module-allocation layer instead of creating a parallel entitlement system. Add a provider-based analytics registry where each enabled module contributes dashboard widgets, alerts, reports, and drill-down links through a common contract. Add a dedicated Clinic module with medicine batches, stock movements, dispensing, expiry/low-stock jobs, procurement hooks, redacted principal analytics, and guardian-scoped parent history.

**Tech Stack:** NestJS 11, PostgreSQL with RLS, TypeScript, BullMQ/Redis, Next.js 16 App Router, React 19, `@tanstack/react-query`, lucide-react, native CSS/SVG charts, node:test/Jest, Playwright.

**Implementation status:** Implemented on 2026-05-19. The production changes now include the module-aware principal executive dashboard, expanded modular subscription metadata, clinic medicine inventory and parent health-history access, frontend routes/proxies, and `implementation21:certify`. Some principal insight files were implemented directly under `apps/api/src/modules/admin-command/` rather than a nested `principal-insights/` folder to match the existing module layout.

---

## 0. Current Baseline To Preserve

Implementation 20 already added these foundations:

- `school_module_access` and `module_registry` style module allocation under `apps/api/src/modules/module-access`.
- Backend `@RequiresModule(...)` guard enforced after auth/RBAC.
- Superadmin module allocation UI during onboarding and after onboarding.
- `admin_command_centers` module with principal/deputy/secretary endpoints.
- `lab_management` module with mandatory attendance, chemical expiry, equipment reconciliation, and discipline/reporting signals.
- `teacher_biometric_attendance` module with device sync, dedupe, rule engine, and reports.
- Frontend module map and disabled module panel.
- Library standalone route guard and API guard.

Implementation 21 must amend this architecture, not replace it.

---

## 1. Non-Negotiables

- Principal dashboard sections are computed from enabled school modules, never hardcoded per school.
- A disabled module contributes no menu item, route, widget, KPI, alert, report, or API access.
- Role permission and enabled module checks both apply before any data is returned.
- Principal sees high-level medical/HR/finance analytics, not confidential notes, unless explicit permissions allow it.
- Parent/guardian medical history access is scoped to linked children only.
- Clinic medicine dispensing blocks expired, quarantined, recalled, and out-of-stock batches.
- Every stock, dispensing, disposal, approval, and module subscription change is audited.
- Disabling a module hides features but preserves all data.
- All tenant tables include `tenant_id`, `created_at`, `updated_at`, and `audit_log_reference`.
- All tenant tables enforce RLS through `current_setting('app.tenant_id', true)` plus the existing system-worker allowance where needed.
- Dashboard aggregation must stay performant for thousands of learners by using cached snapshots and incremental alerts.

---

## 2. File Structure

### Backend Files To Create

- `apps/api/src/modules/admin-command/principal-insights/principal-insights.types.ts`
- `apps/api/src/modules/admin-command/principal-insights/principal-insights.registry.ts`
- `apps/api/src/modules/admin-command/principal-insights/principal-insights.service.ts`
- `apps/api/src/modules/admin-command/principal-insights/principal-insights-cache.service.ts`
- `apps/api/src/modules/admin-command/principal-insights/principal-insights.processor.ts`
- `apps/api/src/modules/admin-command/principal-insights/principal-insights.gateway.ts`
- `apps/api/src/modules/admin-command/principal-insights/providers/school-overview.provider.ts`
- `apps/api/src/modules/admin-command/principal-insights/providers/academics.provider.ts`
- `apps/api/src/modules/admin-command/principal-insights/providers/finance.provider.ts`
- `apps/api/src/modules/admin-command/principal-insights/providers/hr.provider.ts`
- `apps/api/src/modules/admin-command/principal-insights/providers/biometric.provider.ts`
- `apps/api/src/modules/admin-command/principal-insights/providers/clinic.provider.ts`
- `apps/api/src/modules/admin-command/principal-insights/providers/inventory-procurement.provider.ts`
- `apps/api/src/modules/admin-command/principal-insights/providers/labs.provider.ts`
- `apps/api/src/modules/admin-command/principal-insights/providers/discipline.provider.ts`
- `apps/api/src/modules/admin-command/principal-insights/providers/communication.provider.ts`
- `apps/api/src/modules/admin-command/principal-insights/providers/transport-hostel.provider.ts`
- `apps/api/src/modules/admin-command/principal-insights/providers/ai-alerts.provider.ts`
- `apps/api/src/modules/clinic/clinic.module.ts`
- `apps/api/src/modules/clinic/clinic-schema.service.ts`
- `apps/api/src/modules/clinic/clinic.controller.ts`
- `apps/api/src/modules/clinic/clinic.service.ts`
- `apps/api/src/modules/clinic/clinic-analytics.service.ts`
- `apps/api/src/modules/clinic/clinic-processor.ts`
- `apps/api/src/modules/clinic/repositories/clinic.repository.ts`
- `apps/api/src/modules/clinic/dto/clinic.dto.ts`
- `apps/api/src/modules/clinic/clinic.test.ts`
- `apps/api/src/scripts/implementation21-certification.ts`
- `apps/api/src/scripts/implementation21-certification.test.ts`

### Backend Files To Modify

- `apps/api/src/app.module.ts`
- `apps/api/src/auth/auth.constants.ts`
- `apps/api/src/modules/module-access/module-access.constants.ts`
- `apps/api/src/modules/module-access/module-access-schema.service.ts`
- `apps/api/src/modules/module-access/module-access.repository.ts`
- `apps/api/src/modules/module-access/module-access.service.ts`
- `apps/api/src/modules/module-access/module-access.test.ts`
- `apps/api/src/modules/admin-command/admin-command.controller.ts`
- `apps/api/src/modules/admin-command/admin-command.service.ts`
- `apps/api/src/modules/admin-command/admin-command-schema.service.ts`
- `apps/api/src/modules/admin-command/repositories/admin-command.repository.ts`
- `apps/api/src/modules/admin-command/admin-command.test.ts`
- `apps/api/src/modules/inventory/inventory.controller.ts`
- `apps/api/src/modules/inventory/inventory.service.ts`
- `apps/api/src/scripts/release-readiness-gate.ts`
- `apps/api/src/scripts/release-readiness-gate.test.ts`
- `package.json`

### Frontend Files To Create

- `apps/web/src/components/school/principal-executive-dashboard.tsx`
- `apps/web/src/components/school/principal-dashboard-widgets.tsx`
- `apps/web/src/lib/principal-dashboard/principal-dashboard-client.ts`
- `apps/web/src/lib/principal-dashboard/principal-dashboard-types.ts`
- `apps/web/src/app/api/clinic/[...path]/route.ts`
- `apps/web/src/app/api/principal-insights/[...path]/route.ts`
- `apps/web/tests/design/principal-dashboard-module-awareness.test.ts`
- `apps/web/tests/design/clinic-parent-history.test.ts`

### Frontend Files To Modify

- `apps/web/src/components/school/school-pages.tsx`
- `apps/web/src/lib/module-access/module-access-map.ts`
- `apps/web/src/lib/features/module-readiness.ts`
- `apps/web/src/lib/experiences/school-data.ts`
- `apps/web/src/lib/routing/experience-routes.ts`
- `apps/web/src/lib/routing/public-experience-session.ts`
- `apps/web/tests/design/module-readiness.test.ts`
- `apps/web/tests/design/production-module-proxies.test.ts`

---

## 3. Core Data Contracts

Use these contracts across backend and frontend. Do not let each provider invent its own payload shape.

```ts
export type PrincipalInsightSeverity = 'info' | 'warning' | 'critical';
export type PrincipalInsightValueType = 'number' | 'money' | 'percent' | 'text' | 'trend';

export interface PrincipalDashboardWidget {
  id: string;
  module_code: string;
  title: string;
  value: string | number;
  value_type: PrincipalInsightValueType;
  helper: string;
  severity: PrincipalInsightSeverity;
  drilldown_path: string | null;
  updated_at: string;
}

export interface PrincipalDashboardSection {
  id: string;
  module_code: string;
  title: string;
  order_index: number;
  widgets: PrincipalDashboardWidget[];
  charts: Array<{
    id: string;
    title: string;
    type: 'line' | 'bar' | 'stacked-bar' | 'donut' | 'heatmap';
    points: Array<Record<string, string | number>>;
  }>;
  tables: Array<{
    id: string;
    title: string;
    columns: Array<{ id: string; label: string }>;
    rows: Array<Record<string, string | number>>;
  }>;
}

export interface PrincipalDashboardAlert {
  id: string;
  module_code: string;
  severity: PrincipalInsightSeverity;
  title: string;
  message: string;
  action_path: string | null;
  created_at: string;
}

export interface PrincipalDashboardPayload {
  tenant_id: string;
  enabled_modules: string[];
  generated_at: string;
  overview: PrincipalDashboardSection;
  sections: PrincipalDashboardSection[];
  alerts: PrincipalDashboardAlert[];
  redaction: {
    clinic_confidential_notes_hidden: boolean;
    hr_private_notes_hidden: boolean;
    finance_write_actions_hidden: boolean;
  };
}
```

Provider interface:

```ts
export interface PrincipalInsightProvider {
  readonly id: string;
  readonly moduleCode: string;
  readonly requiredPermissions: string[];
  build(input: {
    tenantId: string;
    actorUserId: string;
    permissions: string[];
    filters: PrincipalDashboardFilters;
  }): Promise<PrincipalDashboardSection | null>;
  buildAlerts(input: {
    tenantId: string;
    permissions: string[];
    filters: PrincipalDashboardFilters;
  }): Promise<PrincipalDashboardAlert[]>;
}
```

---

## 4. Database Additions

Add these schema concepts through module-specific schema services. Mirror baseline tables in the canonical database schema when the project convention requires it.

### Module Subscription Tables

```sql
ALTER TABLE module_registry
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'operations',
  ADD COLUMN IF NOT EXISTS route_segment text,
  ADD COLUMN IF NOT EXISTS permission_scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS billing_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE school_module_access
  ADD COLUMN IF NOT EXISTS access_level text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_plan_code text,
  ADD COLUMN IF NOT EXISTS feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS activation_reason text;

CREATE TABLE IF NOT EXISTS module_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  pricing_model text NOT NULL DEFAULT 'custom',
  billing_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS module_package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES module_packages(id),
  module_code text NOT NULL,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(package_id, module_code)
);

CREATE TABLE IF NOT EXISTS module_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  module_code text NOT NULL,
  event_name text NOT NULL,
  actor_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Principal Dashboard Tables

```sql
CREATE TABLE IF NOT EXISTS principal_dashboard_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  enabled_module_hash text NOT NULL,
  filter_hash text NOT NULL,
  payload jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_log_reference uuid,
  UNIQUE(tenant_id, enabled_module_hash, filter_hash)
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_log_reference uuid,
  CONSTRAINT ck_principal_alerts_severity CHECK (severity IN ('info', 'warning', 'critical')),
  CONSTRAINT ck_principal_alerts_status CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed'))
);
```

### Clinic Tables

```sql
CREATE TABLE IF NOT EXISTS clinic_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  name text NOT NULL,
  location_type text NOT NULL DEFAULT 'main_clinic',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_log_reference uuid,
  UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS clinic_medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  medicine_name text NOT NULL,
  generic_name text,
  brand_name text,
  category text NOT NULL,
  prescription_required boolean NOT NULL DEFAULT false,
  side_effect_notes text,
  storage_instructions text,
  barcode text,
  qr_code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_log_reference uuid,
  UNIQUE(tenant_id, medicine_name, COALESCE(brand_name, ''))
);

CREATE TABLE IF NOT EXISTS clinic_medicine_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  medicine_id uuid NOT NULL,
  clinic_location_id uuid NOT NULL,
  batch_number text NOT NULL,
  supplier text,
  manufacturer text,
  manufacture_date date,
  expiry_date date NOT NULL,
  quantity_received numeric(12, 3) NOT NULL,
  quantity_available numeric(12, 3) NOT NULL,
  unit_type text NOT NULL,
  minimum_stock_threshold numeric(12, 3) NOT NULL DEFAULT 0,
  cost_price numeric(12, 2),
  internal_value numeric(12, 2),
  storage_location text,
  date_received date NOT NULL DEFAULT current_date,
  invoice_attachment_id uuid,
  procurement_reference text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_log_reference uuid,
  UNIQUE(tenant_id, medicine_id, batch_number, clinic_location_id),
  CONSTRAINT ck_clinic_batch_status CHECK (status IN ('active', 'near_expiry_90', 'near_expiry_60', 'near_expiry_30', 'expired', 'quarantined', 'recalled', 'disposed')),
  CONSTRAINT ck_clinic_batch_quantity CHECK (quantity_received >= 0 AND quantity_available >= 0 AND quantity_available <= quantity_received)
);

CREATE TABLE IF NOT EXISTS clinic_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  student_id uuid NOT NULL,
  clinic_location_id uuid NOT NULL,
  visit_time timestamptz NOT NULL DEFAULT now(),
  visit_type text NOT NULL DEFAULT 'walk_in',
  complaint_summary text NOT NULL,
  diagnosis_label text,
  confidential_notes text,
  parent_visible_summary text,
  referral_required boolean NOT NULL DEFAULT false,
  emergency_flag boolean NOT NULL DEFAULT false,
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_log_reference uuid
);

CREATE TABLE IF NOT EXISTS clinic_dispense_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  visit_id uuid NOT NULL,
  student_id uuid NOT NULL,
  medicine_batch_id uuid NOT NULL,
  quantity_dispensed numeric(12, 3) NOT NULL,
  dosage_instructions text NOT NULL,
  dispensed_by uuid NOT NULL,
  dispensed_at timestamptz NOT NULL DEFAULT now(),
  parent_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_log_reference uuid,
  CONSTRAINT ck_clinic_dispense_quantity CHECK (quantity_dispensed > 0)
);

CREATE TABLE IF NOT EXISTS clinic_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  medicine_batch_id uuid NOT NULL,
  movement_type text NOT NULL,
  quantity_delta numeric(12, 3) NOT NULL,
  reason text NOT NULL,
  reference_type text,
  reference_id uuid,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_log_reference uuid,
  CONSTRAINT ck_clinic_stock_movement_type CHECK (movement_type IN ('stock_in', 'dispense', 'adjustment', 'transfer', 'quarantine', 'disposal', 'reversal'))
);
```

---

## 5. Task 1: Extend Module Registry, Packages, Trials, and Billing Metadata

**Files:**
- Modify: `apps/api/src/modules/module-access/module-access.constants.ts`
- Modify: `apps/api/src/modules/module-access/module-access-schema.service.ts`
- Modify: `apps/api/src/modules/module-access/module-access.repository.ts`
- Modify: `apps/api/src/modules/module-access/module-access.service.ts`
- Modify: `apps/api/src/modules/module-access/module-access.test.ts`
- Modify: `apps/web/src/lib/module-access/module-access-map.ts`

- [ ] **Step 1: Write module registry tests**

Add a test in `apps/api/src/modules/module-access/module-access.test.ts`:

```ts
test('module registry supports clinic, procurement, principal analytics, and arbitrary packages', () => {
  const codes = MODULE_REGISTRY_SEED.map((module) => module.code);

  for (const code of [
    'clinic_health',
    'procurement',
    'principal_dashboard',
    'hostel',
    'boarding',
    'cbt_exams',
    'lms',
    'ai_insights',
    'visitor_management',
    'asset_tracking',
  ]) {
    assert.ok(codes.includes(code), `${code} missing from module registry`);
  }
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/module-access/module-access.test.js
```

Expected: fail because the new module codes and package schema are missing.

- [ ] **Step 3: Add module metadata**

Extend `MODULE_REGISTRY_SEED` with module metadata in this shape:

```ts
{
  code: 'clinic_health',
  name: 'Clinic and Health',
  description: 'Clinic visits, medicine inventory, dispensing, health analytics, and parent medical history.',
  category: 'health',
  route_segment: 'clinic',
  permission_scopes: ['clinic:read', 'clinic:write', 'clinic:inventory', 'clinic:dispense', 'clinic:reports'],
  billing_metadata: { pricing_unit: 'student', premium: true },
}
```

Add equivalent entries for `procurement`, `principal_dashboard`, `hostel`, `boarding`, `cbt_exams`, `lms`, `ai_insights`, `visitor_management`, and `asset_tracking`.

- [ ] **Step 4: Add package and trial fields to schema**

Update `module-access-schema.service.ts` with the SQL from section 4. Include RLS policies for `module_packages`, `module_package_items`, and `module_usage_events`.

- [ ] **Step 5: Add repository operations**

Add repository methods with these signatures:

```ts
createModulePackage(input: {
  code: string;
  name: string;
  description?: string | null;
  pricing_model: 'per_student' | 'per_module' | 'tiered' | 'enterprise' | 'custom';
  billing_metadata: Record<string, unknown>;
  module_codes: string[];
}): Promise<Record<string, unknown>>;

cloneModulePackage(input: {
  source_package_id: string;
  code: string;
  name: string;
  actor_user_id: string;
}): Promise<Record<string, unknown>>;

recordModuleUsage(input: {
  tenant_id: string;
  module_code: string;
  event_name: string;
  actor_user_id?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void>;
```

- [ ] **Step 6: Run module access tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/module-access/module-access.test.js
```

Expected: pass.

---

## 6. Task 2: Principal Insights Provider Registry

**Files:**
- Create: `apps/api/src/modules/admin-command/principal-insights/principal-insights.types.ts`
- Create: `apps/api/src/modules/admin-command/principal-insights/principal-insights.registry.ts`
- Create: provider files listed in section 2
- Modify: `apps/api/src/modules/admin-command/admin-command.module.ts`
- Modify: `apps/api/src/modules/admin-command/admin-command.test.ts`

- [ ] **Step 1: Write provider registry test**

Add this test:

```ts
test('PrincipalInsightsRegistry only runs providers for enabled modules and permissions', async () => {
  const calls: string[] = [];
  const registry = new PrincipalInsightsRegistry([
    {
      id: 'finance-provider',
      moduleCode: 'finance',
      requiredPermissions: ['finance:read'],
      build: async () => {
        calls.push('finance');
        return {
          id: 'finance',
          module_code: 'finance',
          title: 'Finance',
          order_index: 20,
          widgets: [],
          charts: [],
          tables: [],
        };
      },
      buildAlerts: async () => [],
    },
    {
      id: 'clinic-provider',
      moduleCode: 'clinic_health',
      requiredPermissions: ['clinic:reports'],
      build: async () => {
        calls.push('clinic');
        return null;
      },
      buildAlerts: async () => [],
    },
  ]);

  const sections = await registry.buildSections({
    tenantId: 'tenant-a',
    actorUserId: 'principal-1',
    enabledModules: ['finance'],
    permissions: ['finance:read', 'principal:read'],
    filters: {},
  });

  assert.deepEqual(calls, ['finance']);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].module_code, 'finance');
});
```

- [ ] **Step 2: Implement registry**

Create `PrincipalInsightsRegistry` with:

```ts
export class PrincipalInsightsRegistry {
  constructor(private readonly providers: PrincipalInsightProvider[]) {}

  async buildSections(input: {
    tenantId: string;
    actorUserId: string;
    enabledModules: string[];
    permissions: string[];
    filters: PrincipalDashboardFilters;
  }): Promise<PrincipalDashboardSection[]> {
    const enabled = new Set(input.enabledModules);
    const sections: PrincipalDashboardSection[] = [];

    for (const provider of this.providers) {
      if (!enabled.has(provider.moduleCode)) continue;
      if (!provider.requiredPermissions.every((permission) => hasPermission(input.permissions, permission))) continue;
      const section = await provider.build(input);
      if (section) sections.push(section);
    }

    return sections.sort((a, b) => a.order_index - b.order_index);
  }
}
```

- [ ] **Step 3: Add first providers**

Implement providers with empty-safe SQL that returns zero values rather than throwing when a module has no data:

- `school-overview.provider.ts`: students, teachers, staff, classes, attendance, online users.
- `academics.provider.ts`: exams and CBE/CBC competency progress.
- `finance.provider.ts`: fee collection, arrears, revenue trends, approvals.
- `hr.provider.ts`: attendance trends, leave, contracts, workload.
- `discipline.provider.ts`: incidents, severity, repeat offenders, counseling referrals.

- [ ] **Step 4: Register providers**

Register all providers in `AdminCommandModule` and inject them into `PrincipalInsightsRegistry`.

- [ ] **Step 5: Run admin command tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/admin-command/admin-command.test.js
```

Expected: pass.

---

## 7. Task 3: Principal Dashboard Endpoint, Cache, Alerts, and Live Updates

**Files:**
- Create: `apps/api/src/modules/admin-command/principal-insights/principal-insights.service.ts`
- Create: `apps/api/src/modules/admin-command/principal-insights/principal-insights-cache.service.ts`
- Create: `apps/api/src/modules/admin-command/principal-insights/principal-insights.processor.ts`
- Create: `apps/api/src/modules/admin-command/principal-insights/principal-insights.gateway.ts`
- Modify: `apps/api/src/modules/admin-command/admin-command.controller.ts`
- Modify: `apps/api/src/modules/admin-command/admin-command.service.ts`
- Modify: `apps/api/src/modules/admin-command/admin-command-schema.service.ts`
- Modify: `package.json`

- [ ] **Step 1: Write endpoint behavior test**

Add a test asserting that the principal payload includes only enabled module sections:

```ts
test('AdminCommandService returns module-aware principal dashboard payload', async () => {
  const service = new AdminCommandService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'principal-1', permissions: ['principal:read', 'finance:read'] }) } as never,
    {} as never,
    {
      buildDashboard: async () => ({
        tenant_id: 'tenant-a',
        enabled_modules: ['finance'],
        generated_at: '2026-05-19T00:00:00.000Z',
        overview: { id: 'overview', module_code: 'core', title: 'School overview', order_index: 0, widgets: [], charts: [], tables: [] },
        sections: [{ id: 'finance', module_code: 'finance', title: 'Finance', order_index: 20, widgets: [], charts: [], tables: [] }],
        alerts: [],
        redaction: { clinic_confidential_notes_hidden: true, hr_private_notes_hidden: true, finance_write_actions_hidden: true },
      }),
    } as never,
  );

  const payload = await service.getPrincipalDashboard({ refresh: false });

  assert.deepEqual(payload.sections.map((section) => section.module_code), ['finance']);
});
```

- [ ] **Step 2: Add package dependencies for WebSocket support**

Add these dependencies if they are not present:

```json
"@nestjs/websockets": "^11.0.0",
"@nestjs/platform-socket.io": "^11.0.0",
"socket.io": "^4.8.1",
"socket.io-client": "^4.8.1"
```

- [ ] **Step 3: Implement cache service**

Use `RedisCacheService` with a database fallback:

```ts
const cacheKey = `principal-dashboard:${tenantId}:${enabledModuleHash}:${filterHash}`;
const ttlSeconds = 60;
```

When Redis is unavailable, read/write `principal_dashboard_snapshots` with `expires_at > now()`.

- [ ] **Step 4: Implement dashboard service**

`PrincipalInsightsService.buildDashboard` must:

1. Read enabled module codes from `ModuleAccessService`.
2. Always build the school overview section from core safe data.
3. Ask `PrincipalInsightsRegistry` for enabled provider sections.
4. Ask providers for alerts.
5. Apply redaction flags based on permissions.
6. Cache the payload for 60 seconds.
7. Audit `principal_dashboard.viewed`.

- [ ] **Step 5: Implement live notifications**

Create a Socket.IO namespace:

```ts
@WebSocketGateway({ namespace: '/principal-insights', cors: { origin: false } })
export class PrincipalInsightsGateway {
  emitTenantAlert(tenantId: string, alert: PrincipalDashboardAlert) {
    this.server.to(`tenant:${tenantId}:principal`).emit('principal.alert', alert);
  }
}
```

Authenticate socket joins using the same access token and tenant headers used by school API requests.

- [ ] **Step 6: Run tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/admin-command/admin-command.test.js
```

Expected: pass.

---

## 8. Task 4: Principal Executive Dashboard UI

**Files:**
- Create: `apps/web/src/components/school/principal-executive-dashboard.tsx`
- Create: `apps/web/src/components/school/principal-dashboard-widgets.tsx`
- Create: `apps/web/src/lib/principal-dashboard/principal-dashboard-client.ts`
- Create: `apps/web/src/lib/principal-dashboard/principal-dashboard-types.ts`
- Create: `apps/web/src/app/api/principal-insights/[...path]/route.ts`
- Modify: `apps/web/src/components/school/school-pages.tsx`
- Test: `apps/web/tests/design/principal-dashboard-module-awareness.test.ts`

- [ ] **Step 1: Write design test**

```ts
test('principal dashboard renders sections from payload instead of static module copy', () => {
  const source = readFileSync(join(process.cwd(), 'src/components/school/principal-executive-dashboard.tsx'), 'utf8');

  expect(source).toContain('sections.map');
  expect(source).toContain('alerts.map');
  expect(source).not.toContain('Clinic Operational Metrics</');
  expect(source).not.toContain('Biometric Attendance Insights</');
});
```

- [ ] **Step 2: Add proxy route**

`apps/web/src/app/api/principal-insights/[...path]/route.ts`:

```ts
import type { NextRequest } from "next/server";
import { proxySchoolApiRequest } from "@/lib/dashboard/server-api-proxy";

type RouteContext = { params: Promise<{ path?: string[] }> | { path?: string[] } };

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteContext) {
  return proxySchoolApiRequest(request, context, "/admin-command/principal");
}
```

- [ ] **Step 3: Implement client**

Create:

```ts
export async function fetchPrincipalDashboard() {
  const response = await fetch('/api/admin-command/principal/dashboard', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? 'Unable to load principal dashboard.');
  }

  return response.json() as Promise<PrincipalDashboardPayload>;
}
```

- [ ] **Step 4: Implement UI**

Use payload-driven rendering:

- Overview grid from `payload.overview.widgets`.
- Alert center from `payload.alerts`.
- One section per `payload.sections`.
- Native SVG or CSS chart components for `line`, `bar`, `donut`, and `heatmap`.
- Drill-down buttons only when `drilldown_path` exists.
- Redaction banner only when `payload.redaction.*` is true.

- [ ] **Step 5: Replace principal dashboard static surface**

In `school-pages.tsx`, render `PrincipalExecutiveDashboard` for principal dashboard section. Keep deputy and secretary command center components separate.

- [ ] **Step 6: Run frontend tests**

Run:

```bash
npm --prefix apps/web run test:design -- principal-dashboard-module-awareness module-readiness
npm run web:lint
npm run web:build
```

Expected: all pass.

---

## 9. Task 5: Clinic Module Registry, RBAC, and Routes

**Files:**
- Modify: `apps/api/src/auth/auth.constants.ts`
- Modify: `apps/api/src/modules/module-access/module-access.constants.ts`
- Create: `apps/api/src/modules/clinic/clinic.module.ts`
- Create: `apps/api/src/modules/clinic/clinic.controller.ts`
- Create: `apps/web/src/app/api/clinic/[...path]/route.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add permissions**

Add permissions:

```ts
{ resource: 'clinic', action: 'read', description: 'View clinic visits and medicine inventory summaries' },
{ resource: 'clinic', action: 'write', description: 'Record clinic visits and update treatment records' },
{ resource: 'clinic', action: 'inventory', description: 'Manage medicine stock, batches, expiry, and disposal' },
{ resource: 'clinic', action: 'dispense', description: 'Dispense medicine to students through clinic visits' },
{ resource: 'clinic', action: 'reports', description: 'View clinic analytics and operational reports' },
{ resource: 'clinic', action: 'confidential', description: 'View restricted clinical diagnosis notes' },
```

Principal gets `clinic:reports`, nurse gets `clinic:read`, `clinic:write`, `clinic:inventory`, `clinic:dispense`, and clinic administrator gets all clinic permissions.

- [ ] **Step 2: Create controller routes**

Controller path: `@Controller('clinic')` and `@RequiresModule('clinic_health')`.

Routes:

```ts
@Get('medicines')
@Permissions('clinic:read')

@Post('medicines')
@Permissions('clinic:inventory')

@Post('medicine-batches')
@Permissions('clinic:inventory')

@Post('visits')
@Permissions('clinic:write')

@Post('visits/:visitId/dispense')
@Permissions('clinic:dispense')

@Get('analytics/principal')
@Permissions('clinic:reports')

@Get('parent/children/:studentId/history')
@Permissions('portal:read_own_children')
```

- [ ] **Step 3: Add frontend proxy**

`apps/web/src/app/api/clinic/[...path]/route.ts` proxies to `/clinic` with GET, POST, PATCH.

- [ ] **Step 4: Run route permission tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/app-route-permissions.test.js dist/apps/api/src/modules/clinic/clinic.test.js
```

Expected: pass.

---

## 10. Task 6: Clinic Schema, Medicine Inventory, and Stock Entry

**Files:**
- Create: `apps/api/src/modules/clinic/clinic-schema.service.ts`
- Create: `apps/api/src/modules/clinic/repositories/clinic.repository.ts`
- Create: `apps/api/src/modules/clinic/dto/clinic.dto.ts`
- Modify: `apps/api/src/modules/clinic/clinic.service.ts`
- Test: `apps/api/src/modules/clinic/clinic.test.ts`

- [ ] **Step 1: Write schema test**

Assert creation of:

- `clinic_locations`
- `clinic_medicines`
- `clinic_medicine_batches`
- `clinic_visits`
- `clinic_dispense_logs`
- `clinic_stock_movements`
- forced RLS on each table

- [ ] **Step 2: Implement schema**

Use SQL from section 4 and add indexes:

```sql
CREATE INDEX IF NOT EXISTS ix_clinic_batches_expiry
  ON clinic_medicine_batches (tenant_id, status, expiry_date);

CREATE INDEX IF NOT EXISTS ix_clinic_batches_low_stock
  ON clinic_medicine_batches (tenant_id, medicine_id, quantity_available, minimum_stock_threshold);

CREATE INDEX IF NOT EXISTS ix_clinic_visits_student_time
  ON clinic_visits (tenant_id, student_id, visit_time DESC);

CREATE INDEX IF NOT EXISTS ix_clinic_dispense_logs_visit
  ON clinic_dispense_logs (tenant_id, visit_id, dispensed_at DESC);
```

- [ ] **Step 3: Implement medicine upload and batch stock entry**

DTO fields must include:

```ts
medicine_name: string;
generic_name?: string;
brand_name?: string;
category: string;
batch_number: string;
supplier?: string;
manufacturer?: string;
expiry_date: string;
manufacture_date?: string;
quantity_received: number;
unit_type: 'tablets' | 'bottles' | 'sachets' | 'injections' | 'capsules' | 'ml' | 'grams' | 'kits';
minimum_stock_threshold: number;
storage_instructions?: string;
cost_price?: number;
internal_value?: number;
prescription_required?: boolean;
side_effect_notes?: string;
barcode?: string;
qr_code?: string;
storage_location?: string;
clinic_location_id: string;
date_received?: string;
procurement_reference?: string;
```

- [ ] **Step 4: Create stock movement on stock entry**

Every batch insert writes:

```ts
{
  movement_type: 'stock_in',
  quantity_delta: quantity_received,
  reason: 'Medicine stock received',
  reference_type: 'clinic_medicine_batch',
  reference_id: batch.id,
}
```

- [ ] **Step 5: Run clinic tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/clinic/clinic.test.js
```

Expected: pass.

---

## 11. Task 7: Dispensing, Expiry Blocking, Low Stock, and Medicine Analytics

**Files:**
- Modify: `apps/api/src/modules/clinic/clinic.service.ts`
- Modify: `apps/api/src/modules/clinic/repositories/clinic.repository.ts`
- Create: `apps/api/src/modules/clinic/clinic-processor.ts`
- Test: `apps/api/src/modules/clinic/clinic.test.ts`

- [ ] **Step 1: Write expired medicine test**

```ts
test('ClinicService blocks expired medicine dispensing before stock mutation', async () => {
  const calls: string[] = [];
  const service = new ClinicService(
    mockContext,
    {
      findBatchForDispense: async () => ({ status: 'expired', expiry_date: '2026-05-18', quantity_available: '10' }),
      dispenseMedicine: async () => calls.push('dispensed'),
    } as never,
  );

  await assert.rejects(
    () => service.dispenseMedicine('visit-1', { medicine_batch_id: 'batch-1', quantity_dispensed: 1, dosage_instructions: '1 tablet' }),
    /expired medicine cannot be dispensed/i,
  );
  assert.deepEqual(calls, []);
});
```

- [ ] **Step 2: Implement dispense transaction**

Within one transaction:

1. Lock batch row for update.
2. Validate status not expired/quarantined/recalled/disposed.
3. Validate `expiry_date >= current_date`.
4. Validate enough quantity.
5. Insert `clinic_dispense_logs`.
6. Decrement `clinic_medicine_batches.quantity_available`.
7. Insert `clinic_stock_movements` with `movement_type = 'dispense'`.

- [ ] **Step 3: Add expiry checker**

`ClinicProcessor.runMedicineExpiryCheck({ alertWindows: [90, 60, 30] })` updates statuses:

- `near_expiry_90`
- `near_expiry_60`
- `near_expiry_30`
- `expired`

It creates principal alerts and clinic alerts for low stock and expiry states.

- [ ] **Step 4: Add low-stock checker**

Detect `quantity_available <= minimum_stock_threshold` and emit:

- clinic alert
- procurement recommendation
- principal dashboard alert

- [ ] **Step 5: Add principal analytics method**

Return:

- total medicines in stock
- low-stock count
- out-of-stock count
- expiring count
- most-used medicines
- medicine consumption costs
- wastage due to expiry
- emergency readiness statuses
- common illness labels without confidential notes

- [ ] **Step 6: Run tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/clinic/clinic.test.js
```

Expected: pass.

---

## 12. Task 8: Parent Medical History and Guardian Security

**Files:**
- Modify: `apps/api/src/modules/clinic/clinic.controller.ts`
- Modify: `apps/api/src/modules/clinic/clinic.service.ts`
- Modify: `apps/api/src/modules/clinic/repositories/clinic.repository.ts`
- Modify: `apps/web/src/lib/routing/public-experience-session.ts`
- Test: `apps/api/src/modules/clinic/clinic.test.ts`
- Test: `apps/web/tests/design/clinic-parent-history.test.ts`

- [ ] **Step 1: Write guardian isolation test**

```ts
test('ClinicService only returns parent history for linked guardians', async () => {
  const service = new ClinicService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'parent-1', permissions: ['portal:read_own_children'] }) } as never,
    {
      isGuardianLinkedToStudent: async () => false,
    } as never,
  );

  await assert.rejects(
    () => service.getParentMedicalHistory('student-1'),
    /linked child/i,
  );
});
```

- [ ] **Step 2: Implement parent payload**

Return this redacted shape:

```ts
{
  student_id: string;
  visits: Array<{
    visit_id: string;
    visit_time: string;
    complaint_summary: string;
    diagnosis_label: string | null;
    parent_visible_summary: string | null;
    referral_required: boolean;
    emergency_flag: boolean;
    medicines: Array<{
      medicine_name: string;
      generic_name: string | null;
      brand_name: string | null;
      quantity_dispensed: number;
      unit_type: string;
      dosage_instructions: string;
      dispensed_at: string;
    }>;
  }>;
}
```

Do not return `confidential_notes`, internal nurse comments, HR data, or procurement costs.

- [ ] **Step 3: Add frontend access**

Add parent portal medical history route rendering only for portal sessions. Use `/api/clinic/parent/children/:studentId/history`.

- [ ] **Step 4: Run tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/clinic/clinic.test.js
npm --prefix apps/web run test:design -- clinic-parent-history
```

Expected: pass.

---

## 13. Task 9: Procurement and Finance Integration Hooks

**Files:**
- Modify: `apps/api/src/modules/clinic/clinic.service.ts`
- Modify: `apps/api/src/modules/inventory/inventory.service.ts`
- Modify: `apps/api/src/modules/inventory/inventory.controller.ts`
- Modify: `apps/api/src/modules/clinic/repositories/clinic.repository.ts`
- Test: `apps/api/src/modules/clinic/clinic.test.ts`

- [ ] **Step 1: Write reorder recommendation test**

```ts
test('ClinicService creates procurement recommendations for low-stock medicine', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ClinicService(mockContext, {
    listLowStockBatches: async () => [{ id: 'batch-1', medicine_name: 'Paracetamol', shortage_quantity: 200 }],
    createProcurementRecommendation: async (input: Record<string, unknown>) => calls.push(input),
  } as never);

  await service.createLowStockProcurementRecommendations();

  assert.equal(calls[0].module_code, 'clinic_health');
  assert.equal(calls[0].item_name, 'Paracetamol');
});
```

- [ ] **Step 2: Implement clinic procurement hook**

When low-stock checker runs, insert a procurement recommendation that inventory/procurement can display. If the `procurement` module is disabled, keep the recommendation as a clinic alert only.

- [ ] **Step 3: Add finance-safe analytics**

Principal clinic analytics may include total medicine consumption value and wastage value. It must not expose supplier invoices to users without `procurement:read` or `finance:read`.

- [ ] **Step 4: Run integration tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/clinic/clinic.test.js dist/apps/api/src/modules/inventory/inventory.test.js
```

Expected: pass.

---

## 14. Task 10: Clinic and Cross-Module Principal Insight Providers

**Files:**
- Create: `apps/api/src/modules/admin-command/principal-insights/providers/clinic.provider.ts`
- Modify: `apps/api/src/modules/admin-command/principal-insights/providers/inventory-procurement.provider.ts`
- Modify: `apps/api/src/modules/admin-command/principal-insights/providers/labs.provider.ts`
- Modify: `apps/api/src/modules/admin-command/principal-insights/providers/ai-alerts.provider.ts`
- Test: `apps/api/src/modules/admin-command/admin-command.test.ts`

- [ ] **Step 1: Write redaction test**

```ts
test('clinic principal insight provider hides confidential diagnosis notes', async () => {
  const provider = new ClinicPrincipalInsightProvider({
    getPrincipalAnalytics: async () => ({
      total_sick_students_today: 4,
      common_illnesses: [{ label: 'Flu-like symptoms', count: 3 }],
      confidential_notes: ['private note'],
    }),
  } as never);

  const section = await provider.build({
    tenantId: 'tenant-a',
    actorUserId: 'principal-1',
    permissions: ['principal:read', 'clinic:reports'],
    filters: {},
  });

  assert.equal(JSON.stringify(section).includes('private note'), false);
});
```

- [ ] **Step 2: Implement clinic provider**

Widgets:

- medicines in stock
- low-stock medicines
- expiring medicines
- today's clinic visits
- emergency supplies status
- clinic costs this month

Charts:

- clinic visit trends
- illness heatmap
- most-used medicines

- [ ] **Step 3: Implement AI alerts provider**

Use deterministic rule-based alerts first:

- fee default risk if arrears trend is rising
- performance decline if mean score drops two terms in a row
- medicine shortage prediction from 30-day usage velocity
- attendance irregularity if late arrivals spike over rolling baseline
- budget overrun if spending exceeds monthly allocation

Do not call an LLM in this task. Store all rules in code and make outputs auditable.

- [ ] **Step 4: Run tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/admin-command/admin-command.test.js
```

Expected: pass.

---

## 15. Task 11: Certification, Release Gate, and Documentation

**Files:**
- Create: `apps/api/src/scripts/implementation21-certification.ts`
- Create: `apps/api/src/scripts/implementation21-certification.test.ts`
- Modify: `apps/api/src/scripts/release-readiness-gate.ts`
- Modify: `apps/api/src/scripts/release-readiness-gate.test.ts`
- Modify: `.github/workflows/production-operability.yml`
- Modify: `package.json`
- Create: `docs/validation/implementation21-certification.md`

- [ ] **Step 1: Add certification checks**

Certification must verify source evidence for:

- module package/trial/billing metadata
- module-aware principal insight registry
- principal cache/snapshot layer
- live principal alert gateway
- clinic schema with RLS
- medicine expiry blocking
- low-stock and expiry processor
- parent medical history redaction and guardian check
- frontend principal dashboard payload-driven rendering
- clinic frontend proxy route

- [ ] **Step 2: Add package script**

Add:

```json
"implementation21:certify": "node -r ts-node/register/transpile-only -r tsconfig-paths/register apps/api/src/scripts/implementation21-certification.ts"
```

- [ ] **Step 3: Add release gate coverage**

Release gate must fail if:

- principal dashboard contains static clinic/finance/labs widgets without provider-driven payload mapping
- clinic routes lack `@RequiresModule('clinic_health')`
- parent history endpoint lacks guardian linkage check
- medicine dispensing does not block expired batches
- module access ignores `expires_at` or trial state

- [ ] **Step 4: Run certification**

Run:

```bash
npm run implementation21:certify
node dist/apps/api/src/scripts/release-readiness-gate.js
```

Expected: both pass.

---

## 16. Full Verification

Run this sequence after all tasks:

```bash
npm run build
node --test dist/apps/api/src/modules/module-access/module-access.test.js dist/apps/api/src/modules/admin-command/admin-command.test.js dist/apps/api/src/modules/clinic/clinic.test.js
npm --prefix apps/web run test:design -- principal-dashboard-module-awareness clinic-parent-history module-readiness production-module-proxies
npm run web:lint
npm run web:build
npm run implementation21:certify
node dist/apps/api/src/scripts/release-readiness-gate.js
npm test
```

Expected:

- TypeScript build passes.
- Backend targeted tests pass.
- Frontend design tests pass.
- Web lint and production build pass.
- Implementation 21 certification returns `ok: true`.
- Release readiness gate returns `ok: true`.
- Full backend test suite passes with zero failures.

---

## 17. Acceptance Checklist

- [ ] Superadmin can assign any module combination to a school.
- [ ] Module packages, trials, expiry, pricing metadata, and usage events exist.
- [ ] Principal dashboard reads enabled modules dynamically.
- [ ] Disabled module widgets never appear.
- [ ] Principal school overview includes students, staff, classes, attendance, engagement, and online activity when source modules are enabled.
- [ ] Academics, finance, HR, biometric, clinic, inventory/procurement, labs, discipline, transport/hostel, communication, and AI alert sections are provider-driven.
- [ ] Principal cannot see confidential clinic diagnosis notes without `clinic:confidential`.
- [ ] Clinic staff can create medicine records and batches.
- [ ] Stock entry writes stock movement logs.
- [ ] Dispensing deducts stock and writes dispense logs.
- [ ] Expired medicine cannot be dispensed.
- [ ] Low-stock and expiry alerts reach clinic staff, procurement, and principal dashboard where modules are enabled.
- [ ] Parent/guardian can view linked child medical history and medicines dispensed.
- [ ] Parent/guardian cannot view unlinked children or internal clinic notes.
- [ ] Procurement recommendations are created for low-stock medicine when procurement is enabled.
- [ ] Dashboard snapshots and Redis cache keep principal dashboard fast.
- [ ] Principal alert live updates work through authenticated tenant channels.
- [ ] All new data is tenant isolated with RLS.
- [ ] Certification and release gates cover the new critical requirements.

---

## 18. Execution Order

1. Module registry/package/trial metadata.
2. Principal insights contracts and registry.
3. Principal dashboard endpoint, cache, alerts, and live updates.
4. Principal dashboard frontend.
5. Clinic module RBAC and routes.
6. Clinic schema and medicine stock entry.
7. Dispensing, expiry, low-stock, and analytics.
8. Parent medical history.
9. Procurement/finance hooks.
10. Principal clinic and AI alert providers.
11. Certification, release gate, and full verification.

This order keeps each slice shippable and prevents the principal dashboard from exposing data from a module before module access, permissions, and redaction are enforced.
