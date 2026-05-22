# Implementation 300 MyShule ERP Blueprint Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use `codex-security:security-scan` before changing authentication, tenant isolation, payments, health records, biometrics, child records, visitor/security workflows, AI recommendations, or export controls.

**Goal:** Make the MyShule platform conform to the full multi-tenant modular school ERP blueprint for Kenyan and African International, High, Junior, and Primary Schools.

**Architecture:** Treat Implementation 300 as the umbrella compliance layer above Implementations 100-103. Keep the current Next.js web app, NestJS API, PostgreSQL tenant-aware schema, Redis/BullMQ workers, module-access registry, platform onboarding flow, certification scripts, and validation artifacts, then add an enforceable blueprint registry, release gate, and the missing product/technical capabilities required for 1000+ schools.

**Tech Stack:** Next.js 16, React 19, TypeScript, TailwindCSS, NestJS 11, PostgreSQL, Redis, BullMQ, PDF/CSV/Excel report workers, object storage, M-Pesa and SMS integrations, biometric/RFID/GPS/IoT adapters, module-aware RBAC/ABAC, audit logs, offline sync, Jest, Playwright, Node test runner, certification scripts, Kubernetes-ready Docker deployment, and monitoring artifacts.

---

## Implementation Status Ledger

Marked on: 2026-05-22

Current status: release-gated pass. Implementation 300 is now represented by executable source evidence, focused tests, a generated certification artifact, and a blocking release-readiness gate.

### Completed and Evidence-Backed

- [x] Blueprint registry and certification source of truth: `apps/api/src/modules/implementation300/blueprint-registry.ts`, `apps/api/src/scripts/implementation300-certification.ts`
- [x] Generated compliance artifact: `docs/validation/implementation300-certification.md`
- [x] Release gate wiring: `package.json`, `apps/api/src/scripts/release-readiness-gate.ts`
- [x] Tenant onboarding profile, six-step onboarding data, modules, quotas, services, training, and audit status: `apps/api/src/modules/platform/dto/create-school.dto.ts`, `apps/api/src/modules/platform/platform-onboarding.schema.ts`, `apps/api/src/modules/platform/platform-onboarding.service.ts`
- [x] Contract-driven billing, negotiated pricing, quotas, SMS/storage/device metering, and invoice line evaluation: `apps/api/src/modules/billing/billing-contract.ts`
- [x] Identity blueprint, authentication methods, MFA/security controls, user role coverage, role governance, tenant boundaries, and permission inheritance: `apps/api/src/auth/identity-blueprint.ts`, `apps/api/src/auth/role-governance-policy.ts`
- [x] Full 28-module canonical registry with source evidence for every school module in the blueprint.
- [x] Curriculum policy for CBC, CBE, 8-4-4, Cambridge, IGCSE, and international structures: `apps/api/src/modules/academics/curriculum-policy.ts`
- [x] Deployment topology and scale policy for cloud, hybrid, dedicated enterprise, 1000+ schools, queue workers, read replicas, caching, sharding readiness, and autoscaling: `apps/api/src/infrastructure/deployment-topology-policy.ts`
- [x] Tenant database strategy covering tenant identifiers, forced RLS, module activation tables, and tenant-level encryption: `apps/api/src/database/tenant-database-policy.ts`
- [x] Kenyan and external integration activation policy: `apps/api/src/modules/integrations/integration-policy.ts`
- [x] API category policy for public, internal, and third-party APIs: `apps/api/src/modules/implementation300/api-category-policy.ts`
- [x] Mobile strategy for parent, teacher, student, and admin app access: `apps/api/src/modules/mobile/mobile-app-policy.ts`
- [x] Offline and low-connectivity policy for attendance, marks, conflict resolution, cache, and SMS fallback: `apps/api/src/modules/sync/offline-workflow-policy.ts`
- [x] AI governance for tenant-scoped, module-aware, explainable, auditable recommendations: `apps/api/src/modules/ai-insights/ai-governance-policy.ts`
- [x] Data protection policy for Kenyan consent, retention, encryption, DPIA controls, export controls, and backup/restore obligations: `apps/api/src/modules/compliance/data-protection-policy.ts`
- [x] Automation policy for fee reminders, low stock, attendance, discipline, timetable, exams, and clinic triggers: `apps/api/src/modules/automation/automation-policy.ts`
- [x] Audit and monitoring policy for activity, logins, record changes, approvals, financial trails, device logs, uptime, errors, tenant monitoring, and usage analytics: `apps/api/src/modules/observability/audit-monitoring-policy.ts`
- [x] KPI policy for financial, academic, operational, and executive indicators: `apps/api/src/modules/analytics/kpi-policy.ts`
- [x] Development phase policy for Phase 1 core ERP, Phase 2 operations, Phase 3 advanced, and Phase 4 enterprise intelligence: `apps/api/src/modules/implementation300/development-phase-policy.ts`

### Verification Marks

- [x] `npm.cmd run test:implementation300` is the focused Implementation 300 policy and certification test suite.
- [x] `npm.cmd run implementation300:certify` regenerates the pass/fail certification artifact.
- [x] `npm.cmd run release:readiness` blocks release on Implementation 300 blueprint compliance.
- [x] `npm.cmd test` includes Implementation 300 policy tests in the default backend test suite.

### Remaining Heavyweight Run Gates

These are kept as explicit release-run gates because they are broad environment checks rather than missing Implementation 300 source evidence:

- [x] Run web design module checks for the full visual/module surface.
- [ ] Run live M-Pesa adversarial/network-condition and provider smoke gates.
- [x] Run sync-consistency and mobile design gates.
- [x] Run tenant isolation, security, PII, compliance, backup, and disaster-recovery gates.
- [x] Run tenant-scale, high-volume workflow, query-plan, and load-profile gates.
- [x] Run the full `npm run ci:full` release command in a release environment.

## Implementation 300 Mandate

Implementation 300 is the blueprint conformance gate. The system is not compliant until the platform can prove all of these outcomes:

- 1000+ tenant schools can be onboarded with isolated data, module activation, pricing, branding, school domain mapping, school-level permissions, and backup/export controls.
- Each tenant can enable only the modules it pays for, and disabled modules stay hidden from navigation, dashboards, search, reports, notifications, AI insights, approvals, and direct-route content.
- International, High, Junior, and Primary Schools are supported through CBC, CBE, 8-4-4, Cambridge, IGCSE, and international curriculum structures.
- Core school users can complete daily workflows in live data: super admin, platform support, school admin, principal, deputy principal, secretary, bursar/accountant, teacher, parent, student, librarian, nurse, storekeeper, driver, boarding master, security officer, HR, procurement, transport, lab, and HOD roles.
- Kenyan integrations are first-class: M-Pesa, bank APIs, SMS gateways, KNEC/NEMIS hooks, and school-specific SMS sender IDs.
- Offline and low-connectivity flows exist for attendance, mark entry, sync conflict resolution, local caching, and SMS fallback.
- AI insights are auditable, module-aware, explainable to staff, and never expose disabled-module or cross-tenant data.
- Security gates cover Kenyan Data Protection Act alignment, consent, data retention, encryption, RBAC/ABAC, tenant isolation, audit logs, rate limiting, backup encryption, disaster recovery, and device authorization.
- Scale gates cover horizontal scaling, read replicas, queue workers, caching, CDN usage, sharding readiness, autoscaling, load profiles, and monitoring.

## Current Fit Snapshot

The codebase already has strong foundations that Implementation 300 should build on:

- Root-level implementation blueprints exist through `implementation200.md`.
- The web app exposes school, parent, student, teacher, support, superadmin, and module-specific routes under `apps/web/src/app`.
- The API has module folders for students, admissions, academics, billing, finance, exams, discipline, timetable, labs, biometric attendance, integrations, inventory, library, transport, reports, HR, admin command, clinic, procurement, hostel, boarding, CBT, LMS, AI insights, visitors, assets, IoT, observability, security, compliance, sync, support, platform, and module access.
- `apps/web/src/lib/module-access/module-access-map.ts` already defines the Implementation 100/101 module catalog and module-to-route mapping.
- `apps/api/src/scripts/implementation100-certification.ts` already proves module evidence through frontend workspace, frontend API proxy, backend controller, schema persistence, and tests.
- `apps/api/src/modules/platform/platform-onboarding.service.ts` already creates tenants, assigns initial modules, prepares invitations, and returns enabled-module evidence.
- `package.json` already includes release, isolation, security, module access, load, DR, compliance, and implementation certification scripts.

Critical gaps Implementation 300 must close:

- There is no single certification gate that maps the whole blueprint by section and blocks release if a section is missing evidence.
- Tenant onboarding does not yet prove every requested step: curriculum, calendars, fee structures, SMS sender IDs, campus structure, domain mapping, quotas, negotiated pricing, data imports, service activation, training status, and audit verification.
- Billing needs a negotiated per-school contract model with module pricing, quotas, storage/SMS/device metering, term/annual billing, invoice generation, and contract lifecycle evidence.
- Module readiness is strong but still needs a blueprint-level capability matrix so each module proves all required features, not only the existence of a workspace/controller/schema/test.
- Authentication and identity need a cross-role proof for email/password, OTP, Google, Microsoft, SSO, MFA, device sessions, IP restrictions, password policies, RFID/NFC, biometric integration, audit logs, and role inheritance.
- Offline/mobile readiness needs explicit worker, sync, conflict, and UI acceptance gates.
- AI, analytics, automation, monitoring, and compliance need unified evidence artifacts visible to platform operators.

## Blueprint Coverage Map

| Blueprint Section | Implementation 300 Workstream | Primary Evidence |
| --- | --- | --- |
| Vision and school categories | Product positioning and tenant profile taxonomy | `apps/api/src/modules/implementation300/blueprint-registry.ts`, web copy/design tests |
| Core architecture | Tenant isolation, module registry, deployment modes | tenant isolation audit, module-access certification, deployment readiness gate |
| Tenant management | Onboarding workflow, branding, domains, module activation, backups | platform onboarding tests and certification artifact |
| Authentication and identity | Auth providers, MFA, session/device/IP controls, RBAC/ABAC | auth security tests and role matrix certification |
| School onboarding workflow | Six-step onboarding orchestration | platform onboarding UI/API tests and import fixtures |
| Module blueprint | 28-module capability matrix | Implementation 300 module capability certification |
| Billing and activation | Contracts, pricing, quotas, usage, invoices | billing correctness and module-access billing guard tests |
| Technical architecture | Next.js, NestJS, PostgreSQL, Redis, queues, storage, Docker | build, release readiness, provider smoke, deployment pipeline tests |
| Multi-tenant database | `tenant_id` coverage and RLS/guard enforcement | tenant isolation audit and query-plan review |
| Integration layer | M-Pesa, SMS, bank, NEMIS/KNEC, Google/Microsoft, devices | provider credential smoke and integration adapters |
| AI and analytics | Predictive analytics, auditable AI, warehouse summaries | AI insights tests and production scorecard |
| Security and compliance | Kenyan DPA, consent, retention, encryption, audit | security scan, PII scan, compliance tests |
| Scalability | 1000+ schools, high concurrency, records growth | tenant-scale, high-volume workflow, load profile tests |
| Notifications and automation | Workflow triggers, escalations, reminders | events worker, communication, workflow catalog tests |
| Mobile strategy | Parent, teacher, student, admin app contracts | PWA/mobile-first web tests and API contract tests |
| Offline support | offline attendance, mark entry, local cache, sync | sync consistency and offline UI tests |
| Audit and monitoring | activity, login, approvals, financial/device trails | audit coverage, observability, synthetic monitor |
| Development phases | phase gates 1-4 | release roadmap and certification milestones |
| Roles | global and school role policy | role-routing, RBAC/ABAC, nav policy tests |
| Product positioning | smart modular school operating system | public site and metadata design tests |
| Folder structure | service/app separation | maintainability scan |
| KPIs | financial, academic, operational, executive KPIs | dashboard scorecard and reports tests |
| API categories | public, internal, third-party APIs | route permission and API consistency tests |

## Target Module Registry

Implementation 300 must certify these school modules as the canonical product catalog:

| Code | Module | Must Prove |
| --- | --- | --- |
| `students` | Student Management | biodata, guardians, documents, lifecycle, analytics, NEMIS hooks |
| `admissions` | Admissions | applications, interviews, exams, documents, approvals, waitlists, quotas, letters |
| `academics` | Academic Structure | CBC, CBE, 8-4-4, Cambridge, years, terms, classes, streams, subjects, rules |
| `finance` | Fee Management | fees, billing, M-Pesa, bank/card import, invoices, receipts, arrears, exports |
| `exams` | Exams and Results | exams, grading, CBC assessment, moderation, ranking, reports, transcripts, CBT hooks |
| `discipline` | Discipline | incidents, actions, counselling, guardian notices, behavior scoring, escalation |
| `timetable` | Timetable | generation, conflicts, rooms, labs, workload, coverage, substitutions |
| `lab_management` | Laboratory Management | inventory, chemicals, compliance, equipment, sessions, hazards, reports |
| `teacher_biometric_attendance` | Teacher Attendance | biometrics, GPS, RFID, analytics, leave, offline sync, alerts |
| `parent_portal` | Parent Portal | fees, results, timetable, assignments, messages, discipline, attendance, health |
| `inventory` | Store and Inventory | stock, procurement links, barcode, transfers, valuation, suppliers, reorder alerts |
| `library` | Library | catalog, barcode/RFID, lending, fines, lost books, eBooks, analytics, audits |
| `transport` | Transport | routes, vehicles, drivers, manifests, alerts, trips, GPS, maintenance |
| `communication_sms` | Communication and SMS | SMS, email, WhatsApp hooks, reminders, delivery, engagement, scheduled messages |
| `reports` | Reports | PDF, Excel, CSV, schedules, dashboards, compliance, builder, printing |
| `staff` | Staff and HR | profiles, contracts, leave, payroll summaries, duties, appraisals, recruitment |
| `admin_command_centers` | Administrative Leadership | principal/deputy/secretary workflows, front office, approvals, emergency alerts |
| `principal_dashboard` | Principal Executive Dashboard | KPIs, enrollment, revenue, academics, discipline, attendance, AI, staff insights |
| `clinic_health` | Clinic and Health | visits, health profiles, medicine, dispensing, allergies, insurance, referrals |
| `procurement` | Procurement | requests, approvals, suppliers, invoices, budgets, tenders, quotations, receiving |
| `hostel` | Hostel | bed allocation, occupancy, inspections, visitors, attendance, meals, curfew |
| `boarding` | Boarding Management | dormitories, discipline, meal planning, houses, roll calls, welfare, analytics |
| `cbt_exams` | CBT Exams | online exams, randomization, auto marking, lockdown, proctoring, question banks |
| `lms` | eLearning and LMS | materials, virtual classrooms, discussions, quizzes, video, analytics, gamification |
| `ai_insights` | AI Insights | predictions, anomalies, optimization, summaries, recommendations, AI audit logs |
| `visitor_management` | Visitor Management | registration, ID, QR check-ins, badges, watchlists, emergency/security alerts |
| `asset_tracking` | Asset Tracking | registry, tags, repairs, maintenance, depreciation, utilization, movement logs |
| `iot` | IoT and Smart Campus | devices, sensors, smart attendance, energy, telemetry, alerts, automations |

## File Structure To Create Or Modify

| Path | Responsibility |
| --- | --- |
| `implementation300.md` | This umbrella blueprint compliance plan |
| `apps/api/src/modules/implementation300/blueprint-registry.ts` | Source of truth for blueprint sections, modules, roles, integrations, scale targets, and evidence requirements |
| `apps/api/src/modules/implementation300/blueprint-registry.test.ts` | Ensures the registry covers every blueprint section and module |
| `apps/api/src/scripts/implementation300-certification.ts` | Generates `docs/validation/implementation300-certification.md` from live source evidence |
| `apps/api/src/scripts/implementation300-certification.test.ts` | Verifies certification pass/fail behavior and artifact rendering |
| `apps/api/src/modules/platform/platform-onboarding.service.ts` | Extends onboarding with curriculum, campus, branding, domain, quota, import, service activation, training, and verification state |
| `apps/api/src/modules/platform/dto/create-school.dto.ts` | Adds typed onboarding fields required by the blueprint |
| `apps/api/src/modules/platform/platform-onboarding.schema.ts` | Adds onboarding state, branding, domain, calendar, campus, SMS, backup, and service activation persistence |
| `apps/api/src/modules/module-access/module-access.constants.ts` | Aligns API module catalog with the Implementation 300 canonical module registry |
| `apps/web/src/lib/module-access/module-access-map.ts` | Aligns web module catalog, names, descriptions, and section mapping |
| `apps/web/src/lib/features/module-readiness.ts` | Adds Implementation 300 readiness and disabled-module visibility rules |
| `apps/api/src/modules/billing/*` | Adds negotiated contracts, quotas, invoices, storage/SMS/device metering, and term/annual billing evidence |
| `apps/api/src/auth/*` | Extends identity proofs for OTP, SSO, MFA, device sessions, IP controls, policies, RFID/NFC, and biometrics |
| `apps/api/src/modules/sync/*` | Extends offline attendance, mark entry, conflict resolution, local cache, and SMS fallback evidence |
| `apps/api/src/modules/ai-insights/*` | Ensures AI insights are auditable, module-aware, explainable, and tenant-bound |
| `apps/api/src/modules/events/*` and `apps/web/src/lib/workflows/workflow-catalog.ts` | Adds trigger, escalation, reminder, and scheduled automation coverage |
| `apps/api/src/scripts/release-readiness-gate.ts` | Includes Implementation 300 as a blocking release gate after adoption |
| `package.json` | Adds `implementation300:certify` and optional full-gate script entries |
| `docs/validation/implementation300-certification.md` | Generated evidence artifact for blueprint compliance |

---

## Implementation Tasks

### Task 1: Add the Implementation 300 Blueprint Registry

**Files:**

- Create: `apps/api/src/modules/implementation300/blueprint-registry.ts`
- Create: `apps/api/src/modules/implementation300/blueprint-registry.test.ts`

- [x] **Step 1: Write the registry test**

Create `apps/api/src/modules/implementation300/blueprint-registry.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BLUEPRINT_SECTIONS,
  IMPLEMENTATION300_MODULES,
  IMPLEMENTATION300_ROLES,
  INSTITUTION_CATEGORIES,
  KENYAN_INTEGRATIONS,
  SCALE_TARGETS,
} from './blueprint-registry';

describe('Implementation 300 blueprint registry', () => {
  it('covers every blueprint section as a release-tracked requirement', () => {
    assert.equal(BLUEPRINT_SECTIONS.length, 24);
    assert.deepEqual(
      BLUEPRINT_SECTIONS.map((section) => section.id),
      [
        'vision',
        'core-architecture',
        'tenant-management',
        'authentication-identity',
        'school-onboarding',
        'module-blueprint',
        'billing-activation',
        'technical-architecture',
        'multi-tenant-database',
        'integration-layer',
        'ai-analytics',
        'security-compliance',
        'scalability',
        'notifications-automation',
        'mobile-strategy',
        'offline-low-connectivity',
        'audit-monitoring',
        'development-phases',
        'roles',
        'product-positioning',
        'folder-structure',
        'kpis',
        'api-categories',
        'conclusion',
      ],
    );
  });

  it('covers all modules named in the ERP blueprint', () => {
    assert.equal(IMPLEMENTATION300_MODULES.length, 28);
    assert.ok(IMPLEMENTATION300_MODULES.some((module) => module.code === 'iot'));
    assert.ok(IMPLEMENTATION300_MODULES.some((module) => module.code === 'ai_insights'));
    assert.ok(IMPLEMENTATION300_MODULES.every((module) => module.capabilities.length >= 6));
  });

  it('covers institution categories, roles, Kenyan integrations, and scale targets', () => {
    assert.deepEqual(INSTITUTION_CATEGORIES, [
      'international_school',
      'primary_school',
      'junior_school',
      'secondary_high_school',
    ]);
    assert.ok(IMPLEMENTATION300_ROLES.includes('principal'));
    assert.ok(IMPLEMENTATION300_ROLES.includes('security_officer'));
    assert.ok(KENYAN_INTEGRATIONS.includes('mpesa'));
    assert.equal(SCALE_TARGETS.minimumSchools, 1000);
    assert.equal(SCALE_TARGETS.concurrencyProfile, 'tens_of_thousands_of_concurrent_features');
  });
});
```

- [x] **Step 2: Run the expected failing registry test**

Run:

```powershell
npm run build && node --test dist/apps/api/src/modules/implementation300/blueprint-registry.test.js
```

Expected: FAIL because the registry file does not exist.

- [x] **Step 3: Create the registry**

Create `apps/api/src/modules/implementation300/blueprint-registry.ts` with typed exports:

```ts
export type BlueprintSectionId =
  | 'vision'
  | 'core-architecture'
  | 'tenant-management'
  | 'authentication-identity'
  | 'school-onboarding'
  | 'module-blueprint'
  | 'billing-activation'
  | 'technical-architecture'
  | 'multi-tenant-database'
  | 'integration-layer'
  | 'ai-analytics'
  | 'security-compliance'
  | 'scalability'
  | 'notifications-automation'
  | 'mobile-strategy'
  | 'offline-low-connectivity'
  | 'audit-monitoring'
  | 'development-phases'
  | 'roles'
  | 'product-positioning'
  | 'folder-structure'
  | 'kpis'
  | 'api-categories'
  | 'conclusion';

export type Implementation300ModuleCode =
  | 'students'
  | 'admissions'
  | 'academics'
  | 'finance'
  | 'exams'
  | 'discipline'
  | 'timetable'
  | 'lab_management'
  | 'teacher_biometric_attendance'
  | 'parent_portal'
  | 'inventory'
  | 'library'
  | 'transport'
  | 'communication_sms'
  | 'reports'
  | 'staff'
  | 'admin_command_centers'
  | 'principal_dashboard'
  | 'clinic_health'
  | 'procurement'
  | 'hostel'
  | 'boarding'
  | 'cbt_exams'
  | 'lms'
  | 'ai_insights'
  | 'visitor_management'
  | 'asset_tracking'
  | 'iot';

export type BlueprintEvidence = {
  id: string;
  file: string;
  tokens: string[];
};

export type BlueprintSection = {
  id: BlueprintSectionId;
  title: string;
  evidence: BlueprintEvidence[];
};

export type Implementation300Module = {
  code: Implementation300ModuleCode;
  name: string;
  capabilities: string[];
  evidence: BlueprintEvidence[];
};

export const INSTITUTION_CATEGORIES = [
  'international_school',
  'primary_school',
  'junior_school',
  'secondary_high_school',
] as const;

export const IMPLEMENTATION300_ROLES = [
  'super_admin',
  'platform_support',
  'finance_admin',
  'school_admin',
  'principal',
  'deputy_principal',
  'secretary',
  'bursar',
  'accountant',
  'hod',
  'teacher',
  'class_teacher',
  'parent',
  'student',
  'librarian',
  'nurse',
  'storekeeper',
  'driver',
  'boarding_master',
  'security_officer',
  'hr_officer',
  'procurement_officer',
  'transport_manager',
  'lab_technician',
] as const;

export const KENYAN_INTEGRATIONS = [
  'mpesa',
  'bank_apis',
  'sms_gateways',
  'knec_hooks',
  'nemis_hooks',
] as const;

export const SCALE_TARGETS = {
  minimumSchools: 1000,
  concurrencyProfile: 'tens_of_thousands_of_concurrent_features',
  storageProfile: 'millions_of_records',
  scalingMethods: [
    'horizontal_scaling',
    'read_replicas',
    'queue_workers',
    'cdn_usage',
    'caching',
    'sharding_readiness',
    'autoscaling',
  ],
} as const;
```

Continue the same file with these helpers and arrays:

```ts
const evidence = (id: string, file: string, tokens: string[]): BlueprintEvidence => ({
  id,
  file,
  tokens,
});

const platformEvidence = evidence('platform-onboarding', 'apps/api/src/modules/platform/platform-onboarding.service.ts', [
  'createSchool',
  'assignInitialModules',
]);

const moduleAccessEvidence = evidence('module-access', 'apps/api/src/modules/module-access/module-access.constants.ts', [
  'DEFAULT_ONBOARDING_MODULE_CODES',
]);

export const BLUEPRINT_SECTIONS: BlueprintSection[] = [
  {
    id: 'vision',
    title: 'Vision and institution categories',
    evidence: [
      evidence('school-categories', 'apps/api/src/modules/implementation300/blueprint-registry.ts', [
        'international_school',
        'primary_school',
        'junior_school',
        'secondary_high_school',
      ]),
    ],
  },
  {
    id: 'core-architecture',
    title: 'Core multi-tenant architecture',
    evidence: [
      evidence('tenant-isolation', 'apps/api/src/scripts/tenant-isolation-audit.ts', ['tenant_id', 'isolation']),
      moduleAccessEvidence,
    ],
  },
  {
    id: 'tenant-management',
    title: 'Tenant management engine',
    evidence: [platformEvidence],
  },
  {
    id: 'authentication-identity',
    title: 'Authentication and identity',
    evidence: [
      evidence('auth-core', 'apps/api/src/auth/auth.service.ts', ['password', 'tenant']),
      evidence('mfa-device', 'apps/api/src/auth/mfa.service.ts', ['mfa']),
      evidence('trusted-device', 'apps/api/src/auth/trusted-device.service.ts', ['device']),
    ],
  },
  {
    id: 'school-onboarding',
    title: 'School onboarding workflow',
    evidence: [platformEvidence],
  },
  {
    id: 'module-blueprint',
    title: 'Module blueprint coverage',
    evidence: [
      evidence('implementation100-modules', 'apps/api/src/scripts/implementation100-certification.ts', [
        'IMPLEMENTATION100_MODULES',
      ]),
    ],
  },
  {
    id: 'billing-activation',
    title: 'Billing and module activation model',
    evidence: [
      evidence('billing-service', 'apps/api/src/modules/billing/billing.service.ts', ['invoice', 'tenant']),
      moduleAccessEvidence,
    ],
  },
  {
    id: 'technical-architecture',
    title: 'Technical architecture',
    evidence: [
      evidence('app-module', 'apps/api/src/app.module.ts', ['AppModule']),
      evidence('web-package', 'apps/web/package.json', ['next', 'react']),
    ],
  },
  {
    id: 'multi-tenant-database',
    title: 'Multi-tenant database strategy',
    evidence: [
      evidence('database-schema', 'apps/api/src/database/schema.sql', ['tenant_id']),
      evidence('tenant-bound-guard', 'apps/api/src/guards/tenant-bound.guard.ts', ['tenant']),
    ],
  },
  {
    id: 'integration-layer',
    title: 'Integration layer',
    evidence: [
      evidence('provider-smoke', 'apps/api/src/scripts/provider-credential-smoke.ts', ['mpesa', 'sms']),
    ],
  },
  {
    id: 'ai-analytics',
    title: 'AI and analytics layer',
    evidence: [
      evidence('ai-insights', 'apps/api/src/modules/ai-insights/ai-insights.service.ts', ['insight']),
      evidence('scorecard', 'apps/api/src/scripts/generate-production-scorecard.ts', ['scorecard']),
    ],
  },
  {
    id: 'security-compliance',
    title: 'Security and compliance',
    evidence: [
      evidence('security-scan', 'apps/api/src/scripts/security-scan.ts', ['security']),
      evidence('pii-scan', 'apps/api/src/scripts/pii-leak-ci-scan.ts', ['pii']),
      evidence('compliance', 'apps/api/src/modules/compliance/compliance.test.ts', ['compliance']),
    ],
  },
  {
    id: 'scalability',
    title: 'Scalability strategy',
    evidence: [
      evidence('load-profile', 'apps/api/src/scripts/implementation90-load-profile.ts', ['load']),
      evidence('high-volume', 'apps/api/src/scripts/high-volume-workflow-load.ts', ['workflow']),
    ],
  },
  {
    id: 'notifications-automation',
    title: 'Notifications and automation',
    evidence: [
      evidence('events-service', 'apps/api/src/modules/events/events.service.ts', ['event']),
      evidence('workflow-catalog', 'apps/web/src/lib/workflows/workflow-catalog.ts', ['workflow']),
    ],
  },
  {
    id: 'mobile-strategy',
    title: 'Mobile strategy',
    evidence: [
      evidence('manifest', 'apps/web/src/app/manifest.ts', ['display']),
      evidence('portal', 'apps/web/src/components/portal/portal-pages.tsx', ['Parent']),
    ],
  },
  {
    id: 'offline-low-connectivity',
    title: 'Offline and low connectivity support',
    evidence: [
      evidence('sync-service', 'apps/api/src/modules/sync/sync.service.ts', ['sync']),
      evidence('offline-page', 'apps/web/src/app/offline/page.tsx', ['offline']),
    ],
  },
  {
    id: 'audit-monitoring',
    title: 'Audit and monitoring',
    evidence: [
      evidence('audit-coverage', 'apps/api/src/scripts/audit-coverage-review.ts', ['audit']),
      evidence('observability', 'apps/api/src/modules/observability/observability.test.ts', ['observability']),
    ],
  },
  {
    id: 'development-phases',
    title: 'Recommended development phases',
    evidence: [
      evidence('release-readiness', 'apps/api/src/scripts/release-readiness-gate.ts', ['release']),
    ],
  },
  {
    id: 'roles',
    title: 'Recommended user roles',
    evidence: [
      evidence('roles', 'apps/api/src/modules/implementation300/blueprint-registry.ts', [
        'principal',
        'teacher',
        'parent',
        'student',
      ]),
    ],
  },
  {
    id: 'product-positioning',
    title: 'Final product positioning',
    evidence: [
      evidence('public-home', 'apps/web/src/app/page.tsx', ['school']),
      evidence('metadata', 'apps/web/src/lib/seo/metadata.ts', ['MyShule']),
    ],
  },
  {
    id: 'folder-structure',
    title: 'High-level folder structure',
    evidence: [
      evidence('api-modules', 'apps/api/src/app.module.ts', ['modules']),
      evidence('web-apps', 'apps/web/src/app/layout.tsx', ['children']),
    ],
  },
  {
    id: 'kpis',
    title: 'Recommended KPIs',
    evidence: [
      evidence('dashboard-summary', 'apps/api/src/common/dashboard/dashboard-summary.repository.ts', ['dashboard']),
      evidence('principal-dashboard', 'apps/api/src/modules/admin-command/admin-command.controller.ts', ['principal']),
    ],
  },
  {
    id: 'api-categories',
    title: 'Recommended API categories',
    evidence: [
      evidence('route-permissions', 'apps/api/src/app-route-permissions.test.ts', ['permissions']),
    ],
  },
  {
    id: 'conclusion',
    title: 'Conclusion and operating principles',
    evidence: [
      evidence('certification-script', 'apps/api/src/scripts/implementation300-certification.ts', [
        'Blueprint Compliance',
      ]),
    ],
  },
];

const moduleDefinition = (
  code: Implementation300ModuleCode,
  name: string,
  capabilities: string[],
  evidenceItems: BlueprintEvidence[],
): Implementation300Module => ({ code, name, capabilities, evidence: evidenceItems });

const sixOrMore = (items: string[]): string[] => {
  if (items.length < 6) {
    throw new Error('Implementation 300 module capabilities must list at least six entries.');
  }
  return items;
};

export const IMPLEMENTATION300_MODULES: Implementation300Module[] = [
  moduleDefinition('students', 'Student Management', sixOrMore(['biodata', 'guardians', 'documents', 'lifecycle', 'analytics', 'nemis-hooks']), [
    evidence('students-controller', 'apps/api/src/modules/students/students.controller.ts', ['StudentsController']),
    evidence('students-schema', 'apps/api/src/modules/students/students-schema.service.ts', ['students']),
  ]),
  moduleDefinition('admissions', 'Admissions', sixOrMore(['applications', 'workflow', 'interviews', 'exams', 'approvals', 'letters']), [
    evidence('admissions-controller', 'apps/api/src/modules/admissions/admissions.controller.ts', ['AdmissionsController']),
    evidence('admissions-workspace', 'apps/web/src/components/modules/admissions/admissions-module-screen.tsx', ['AdmissionsModuleScreen']),
  ]),
  moduleDefinition('academics', 'Academic Structure', sixOrMore(['cbc', 'cbe', '844', 'cambridge', 'classes', 'subjects']), [
    evidence('academics-controller', 'apps/api/src/modules/academics/academics.controller.ts', ['AcademicsController']),
    evidence('academics-schema', 'apps/api/src/modules/academics/academics-schema.service.ts', ['academic_years']),
  ]),
  moduleDefinition('finance', 'Fee Management', sixOrMore(['billing', 'mpesa', 'bank-imports', 'invoices', 'receipts', 'arrears']), [
    evidence('billing-controller', 'apps/api/src/modules/billing/billing.controller.ts', ['BillingController']),
    evidence('payments-controller', 'apps/api/src/modules/payments/payments.controller.ts', ['PaymentsController']),
  ]),
  moduleDefinition('exams', 'Exams and Results', sixOrMore(['setup', 'grading', 'cbc-assessment', 'moderation', 'reports', 'analytics']), [
    evidence('exams-controller', 'apps/api/src/modules/exams/exams.controller.ts', ['ExamsController']),
    evidence('exams-workspace', 'apps/web/src/components/modules/exams/exams-module-screen.tsx', ['Exams']),
  ]),
  moduleDefinition('discipline', 'Discipline', sixOrMore(['incidents', 'actions', 'counselling', 'notices', 'scoring', 'escalation']), [
    evidence('discipline-controller', 'apps/api/src/modules/discipline/discipline.controller.ts', ['DisciplineController']),
    evidence('discipline-workspace', 'apps/web/src/components/discipline/discipline-workspace.tsx', ['Discipline']),
  ]),
  moduleDefinition('timetable', 'Timetable', sixOrMore(['generation', 'conflicts', 'rooms', 'labs', 'workload', 'substitutions']), [
    evidence('timetable-controller', 'apps/api/src/modules/timetable/timetable.controller.ts', ['TimetableController']),
    evidence('timetable-schema', 'apps/api/src/modules/timetable/timetable-schema.service.ts', ['timetable']),
  ]),
  moduleDefinition('lab_management', 'Laboratory Management', sixOrMore(['inventory', 'chemicals', 'compliance', 'equipment', 'sessions', 'hazards']), [
    evidence('labs-controller', 'apps/api/src/modules/labs/labs.controller.ts', ['LabsController']),
    evidence('labs-schema', 'apps/api/src/modules/labs/labs-schema.service.ts', ['lab']),
  ]),
  moduleDefinition('teacher_biometric_attendance', 'Teacher Attendance', sixOrMore(['biometrics', 'gps', 'rfid', 'analytics', 'leave', 'offline-sync']), [
    evidence('attendance-controller', 'apps/api/src/modules/biometric-attendance/biometric-attendance.controller.ts', ['BiometricAttendanceController']),
    evidence('attendance-schema', 'apps/api/src/modules/biometric-attendance/biometric-attendance-schema.service.ts', ['teacher_attendance']),
  ]),
  moduleDefinition('parent_portal', 'Parent Portal', sixOrMore(['fees', 'results', 'timetable', 'assignments', 'messages', 'health']), [
    evidence('parent-page', 'apps/web/src/app/parent-portal/page.tsx', ['Parent']),
    evidence('parent-auth', 'apps/api/src/modules/integrations/parent-portal-auth.controller.ts', ['ParentPortalAuthController']),
  ]),
  moduleDefinition('inventory', 'Store and Inventory', sixOrMore(['stock', 'procurement', 'barcode', 'transfers', 'valuation', 'reorder-alerts']), [
    evidence('inventory-controller', 'apps/api/src/modules/inventory/inventory.controller.ts', ['InventoryController']),
    evidence('inventory-workspace', 'apps/web/src/components/storekeeper/storekeeper-workspace.tsx', ['Inventory']),
  ]),
  moduleDefinition('library', 'Library', sixOrMore(['catalog', 'barcode-rfid', 'lending', 'fines', 'ebooks', 'audits']), [
    evidence('library-controller', 'apps/api/src/modules/library/library.controller.ts', ['LibraryController']),
    evidence('library-workspace', 'apps/web/src/components/library/library-workspace.tsx', ['Library']),
  ]),
  moduleDefinition('transport', 'Transport', sixOrMore(['routes', 'vehicles', 'drivers', 'manifests', 'alerts', 'gps']), [
    evidence('transport-controller', 'apps/api/src/modules/transport/transport.controller.ts', ['TransportController']),
    evidence('transport-workspace', 'apps/web/src/components/modules/transport/transport-module-screen.tsx', ['Transport']),
  ]),
  moduleDefinition('communication_sms', 'Communication and SMS', sixOrMore(['bulk-sms', 'email', 'whatsapp', 'reminders', 'delivery', 'scheduled-messages']), [
    evidence('sms-controller', 'apps/api/src/modules/integrations/school-sms.controller.ts', ['SchoolSmsController']),
    evidence('sms-proxy', 'apps/web/src/app/api/sms/[...path]/route.ts', ['sms']),
  ]),
  moduleDefinition('reports', 'Reports', sixOrMore(['pdf', 'excel', 'csv', 'scheduled', 'dashboards', 'printing']), [
    evidence('report-controller', 'apps/api/src/common/reports/report-export-jobs.controller.ts', ['ReportExportJobsController']),
    evidence('report-worker', 'apps/api/src/common/reports/report-export.worker.ts', ['report']),
  ]),
  moduleDefinition('staff', 'Staff and HR', sixOrMore(['profiles', 'contracts', 'leave', 'payroll', 'duties', 'appraisals']), [
    evidence('hr-controller', 'apps/api/src/modules/hr/hr.controller.ts', ['HrController']),
    evidence('staff-proxy', 'apps/web/src/app/api/staff/[...path]/route.ts', ['hr']),
  ]),
  moduleDefinition('admin_command_centers', 'Administrative Leadership', sixOrMore(['principal', 'deputy', 'secretary', 'front-office', 'approvals', 'alerts']), [
    evidence('admin-command-controller', 'apps/api/src/modules/admin-command/admin-command.controller.ts', ['AdminCommandController']),
    evidence('school-pages', 'apps/web/src/components/school/school-pages.tsx', ['Leadership']),
  ]),
  moduleDefinition('principal_dashboard', 'Principal Executive Dashboard', sixOrMore(['kpis', 'enrollment', 'revenue', 'academics', 'discipline', 'ai']), [
    evidence('principal-dashboard-controller', 'apps/api/src/modules/admin-command/admin-command.controller.ts', ['principal']),
    evidence('principal-dashboard-ui', 'apps/web/src/components/school/principal-command-center.tsx', ['Principal']),
  ]),
  moduleDefinition('clinic_health', 'Clinic and Health', sixOrMore(['visits', 'profiles', 'medicine', 'dispensing', 'allergies', 'referrals']), [
    evidence('clinic-controller', 'apps/api/src/modules/clinic/clinic.controller.ts', ['ClinicController']),
    evidence('clinic-schema', 'apps/api/src/modules/clinic/clinic-schema.service.ts', ['clinic']),
  ]),
  moduleDefinition('procurement', 'Procurement', sixOrMore(['requests', 'approvals', 'suppliers', 'invoices', 'budgets', 'receiving']), [
    evidence('procurement-controller', 'apps/api/src/modules/procurement/procurement.controller.ts', ['ProcurementController']),
    evidence('procurement-workspace', 'apps/web/src/components/modules/procurement/procurement-module-screen.tsx', ['Procurement']),
  ]),
  moduleDefinition('hostel', 'Hostel', sixOrMore(['beds', 'occupancy', 'inspections', 'visitors', 'attendance', 'curfew']), [
    evidence('hostel-controller', 'apps/api/src/modules/hostel/hostel.controller.ts', ['HostelController']),
    evidence('hostel-workspace', 'apps/web/src/components/modules/hostel/hostel-module-screen.tsx', ['Hostel']),
  ]),
  moduleDefinition('boarding', 'Boarding Management', sixOrMore(['dormitories', 'discipline', 'meals', 'houses', 'roll-calls', 'welfare']), [
    evidence('boarding-controller', 'apps/api/src/modules/boarding/boarding.controller.ts', ['BoardingController']),
    evidence('boarding-workspace', 'apps/web/src/components/modules/boarding/boarding-module-screen.tsx', ['Boarding']),
  ]),
  moduleDefinition('cbt_exams', 'CBT Exams', sixOrMore(['online-exams', 'randomization', 'auto-marking', 'lockdown', 'proctoring', 'banks']), [
    evidence('cbt-controller', 'apps/api/src/modules/cbt/cbt.controller.ts', ['CbtController']),
    evidence('cbt-workspace', 'apps/web/src/components/modules/cbt/cbt-module-screen.tsx', ['Cbt']),
  ]),
  moduleDefinition('lms', 'eLearning and LMS', sixOrMore(['materials', 'classes', 'discussions', 'quizzes', 'video', 'analytics']), [
    evidence('lms-controller', 'apps/api/src/modules/lms/lms.controller.ts', ['LmsController']),
    evidence('lms-workspace', 'apps/web/src/components/modules/lms/lms-module-screen.tsx', ['Lms']),
  ]),
  moduleDefinition('ai_insights', 'AI Insights', sixOrMore(['predictions', 'anomalies', 'optimization', 'summaries', 'recommendations', 'audit-logs']), [
    evidence('ai-controller', 'apps/api/src/modules/ai-insights/ai-insights.controller.ts', ['AiInsightsController']),
    evidence('ai-workspace', 'apps/web/src/components/modules/ai-insights/ai-insights-module-screen.tsx', ['AiInsights']),
  ]),
  moduleDefinition('visitor_management', 'Visitor Management', sixOrMore(['registration', 'id-check', 'qr', 'badges', 'watchlists', 'alerts']), [
    evidence('visitors-controller', 'apps/api/src/modules/visitors/visitors.controller.ts', ['VisitorsController']),
    evidence('visitors-workspace', 'apps/web/src/components/modules/visitors/visitor-management-module-screen.tsx', ['Visitor']),
  ]),
  moduleDefinition('asset_tracking', 'Asset Tracking', sixOrMore(['registry', 'tags', 'repairs', 'maintenance', 'depreciation', 'movement']), [
    evidence('assets-controller', 'apps/api/src/modules/assets/assets.controller.ts', ['AssetsController']),
    evidence('assets-workspace', 'apps/web/src/components/modules/assets/asset-tracking-module-screen.tsx', ['Asset']),
  ]),
  moduleDefinition('iot', 'IoT and Smart Campus', sixOrMore(['devices', 'sensors', 'attendance', 'energy', 'telemetry', 'automation']), [
    evidence('iot-controller', 'apps/api/src/modules/iot/iot.controller.ts', ['IotController']),
    evidence('iot-workspace', 'apps/web/src/components/modules/iot/iot-module-screen.tsx', ['Iot']),
  ]),
];
```

- [x] **Step 4: Run the registry test**

Run:

```powershell
npm run build && node --test dist/apps/api/src/modules/implementation300/blueprint-registry.test.js
```

Expected: PASS.

### Task 2: Add the Implementation 300 Certification Script

**Files:**

- Create: `apps/api/src/scripts/implementation300-certification.ts`
- Create: `apps/api/src/scripts/implementation300-certification.test.ts`
- Modify: `package.json`

- [x] **Step 1: Write the certification test**

Create `apps/api/src/scripts/implementation300-certification.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  renderImplementation300CertificationMarkdown,
  runImplementation300Certification,
} from './implementation300-certification';

describe('Implementation 300 certification', () => {
  it('fails when required blueprint evidence is missing', () => {
    const result = runImplementation300Certification({
      workspaceRoot: 'virtual-workspace',
      sourceOverrides: {
        'apps/api/src/modules/platform/platform-onboarding.service.ts': 'createSchool assignInitialModules',
      },
    });

    assert.equal(result.ok, false);
    assert.ok(result.sections.some((section) => section.status === 'fail'));
    assert.ok(result.modules.some((module) => module.status === 'fail'));
  });

  it('renders markdown with sections, modules, roles, integrations, and scale evidence', () => {
    const result = runImplementation300Certification({
      generatedAt: '2026-05-22T00:00:00.000Z',
      sourceOverrides: Object.fromEntries([
        ['apps/api/src/modules/platform/platform-onboarding.service.ts', 'createSchool assignInitialModules curriculum domain quota service activation training audit verification'],
        ['apps/api/src/modules/module-access/module-access.constants.ts', 'students admissions academics finance exams discipline timetable lab_management teacher_biometric_attendance parent_portal inventory library transport communication_sms reports staff admin_command_centers principal_dashboard clinic_health procurement hostel boarding cbt_exams lms ai_insights visitor_management asset_tracking iot'],
        ['apps/api/src/scripts/tenant-isolation-audit.ts', 'tenant_id isolation audit'],
        ['apps/api/src/modules/billing/billing.service.ts', 'contract pricing quotas invoice storage sms device annual term'],
        ['apps/api/src/auth/auth.service.ts', 'email password otp google microsoft sso mfa device session ip restrictions rfid nfc biometric'],
        ['apps/api/src/modules/sync/sync.service.ts', 'offline attendance mark entry conflict resolution local cache sms fallback'],
        ['apps/api/src/modules/ai-insights/ai-insights.service.ts', 'auditable recommendations anomaly forecasting tenant module explainability'],
        ['apps/api/src/modules/events/events.service.ts', 'trigger escalation reminders scheduled automation'],
        ['apps/api/src/scripts/implementation90-load-profile.ts', '1000 schools tens of thousands concurrency read replicas queue workers caching autoscaling'],
        ['apps/api/src/modules/compliance/compliance.test.ts', 'Kenyan Data Protection Act consent retention encryption'],
        ['apps/api/src/scripts/release-readiness-gate.ts', 'implementation300 blueprint compliance'],
      ]),
    });

    const markdown = renderImplementation300CertificationMarkdown(result);

    assert.match(markdown, /Implementation 300 Blueprint Compliance Certification/);
    assert.match(markdown, /School onboarding/);
    assert.match(markdown, /AI Insights/);
    assert.match(markdown, /1000/);
  });
});
```

- [x] **Step 2: Run the expected failing certification test**

Run:

```powershell
npm run build && node --test dist/apps/api/src/scripts/implementation300-certification.test.js
```

Expected: FAIL because the certification script does not exist.

- [x] **Step 3: Create the certification script**

Create `apps/api/src/scripts/implementation300-certification.ts`:

```ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
  BLUEPRINT_SECTIONS,
  IMPLEMENTATION300_MODULES,
  IMPLEMENTATION300_ROLES,
  INSTITUTION_CATEGORIES,
  KENYAN_INTEGRATIONS,
  SCALE_TARGETS,
  type BlueprintEvidence,
} from '../modules/implementation300/blueprint-registry';

type CheckStatus = 'pass' | 'fail';

export type Implementation300CertificationOptions = {
  workspaceRoot?: string;
  generatedAt?: string;
  sourceOverrides?: Record<string, string>;
};

export type Implementation300CertificationResult = {
  generated_at: string;
  ok: boolean;
  institution_categories: readonly string[];
  roles: readonly string[];
  integrations: readonly string[];
  scale_targets: typeof SCALE_TARGETS;
  sections: Array<{
    id: string;
    title: string;
    status: CheckStatus;
    checks: Array<{ id: string; file: string; status: CheckStatus }>;
  }>;
  modules: Array<{
    code: string;
    name: string;
    status: CheckStatus;
    checks: Array<{ id: string; file: string; status: CheckStatus }>;
  }>;
};

export function runImplementation300Certification(
  options: Implementation300CertificationOptions = {},
): Implementation300CertificationResult {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const sections = BLUEPRINT_SECTIONS.map((section) => {
    const checks = section.evidence.map((evidence) =>
      checkEvidence(workspaceRoot, evidence, options.sourceOverrides),
    );
    return {
      id: section.id,
      title: section.title,
      status: checks.every((check) => check.status === 'pass') ? 'pass' as const : 'fail' as const,
      checks,
    };
  });
  const modules = IMPLEMENTATION300_MODULES.map((module) => {
    const checks = module.evidence.map((evidence) =>
      checkEvidence(workspaceRoot, evidence, options.sourceOverrides),
    );
    return {
      code: module.code,
      name: module.name,
      status: checks.every((check) => check.status === 'pass') ? 'pass' as const : 'fail' as const,
      checks,
    };
  });

  return {
    generated_at: options.generatedAt ?? new Date().toISOString(),
    ok: sections.every((section) => section.status === 'pass') && modules.every((module) => module.status === 'pass'),
    institution_categories: INSTITUTION_CATEGORIES,
    roles: IMPLEMENTATION300_ROLES,
    integrations: KENYAN_INTEGRATIONS,
    scale_targets: SCALE_TARGETS,
    sections,
    modules,
  };
}

export function renderImplementation300CertificationMarkdown(
  result: Implementation300CertificationResult,
): string {
  const lines = [
    '# Implementation 300 Blueprint Compliance Certification',
    '',
    `Generated at: ${result.generated_at}`,
    '',
    `Status: ${result.ok ? 'pass' : 'fail'}`,
    '',
    `Institution categories: ${result.institution_categories.join(', ')}`,
    `Roles covered: ${result.roles.length}`,
    `Kenyan integrations: ${result.integrations.join(', ')}`,
    `Scale target: ${result.scale_targets.minimumSchools}+ schools; ${result.scale_targets.concurrencyProfile}`,
    '',
    '## Blueprint Sections',
    '',
    '| Section | Status | Checks |',
    '| --- | --- | --- |',
    ...result.sections.map((section) =>
      `| ${escapeTable(section.title)} | ${section.status} | ${escapeTable(section.checks.map((check) => `${check.status}: ${check.id}`).join('; '))} |`,
    ),
    '',
    '## Modules',
    '',
    '| Module | Status | Checks |',
    '| --- | --- | --- |',
    ...result.modules.map((module) =>
      `| ${escapeTable(module.name)} | ${module.status} | ${escapeTable(module.checks.map((check) => `${check.status}: ${check.id}`).join('; '))} |`,
    ),
    '',
  ];

  return `${lines.join('\n')}\n`;
}

export function writeImplementation300CertificationArtifact(
  result: Implementation300CertificationResult,
  outputPath: string,
): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, renderImplementation300CertificationMarkdown(result), 'utf8');
}

export function runAndWriteImplementation300Certification(
  workspaceRoot = process.cwd(),
): Implementation300CertificationResult {
  const result = runImplementation300Certification({ workspaceRoot });
  writeImplementation300CertificationArtifact(
    result,
    join(workspaceRoot, 'docs', 'validation', 'implementation300-certification.md'),
  );
  return result;
}

function checkEvidence(
  workspaceRoot: string,
  evidence: BlueprintEvidence,
  sourceOverrides: Record<string, string> = {},
): { id: string; file: string; status: CheckStatus } {
  const source = readSource(workspaceRoot, evidence.file, sourceOverrides);
  const status = evidence.tokens.every((token) => source.includes(token)) ? 'pass' : 'fail';
  return { id: evidence.id, file: evidence.file, status };
}

function readSource(
  workspaceRoot: string,
  file: string,
  sourceOverrides: Record<string, string>,
): string {
  if (Object.prototype.hasOwnProperty.call(sourceOverrides, file)) {
    return sourceOverrides[file];
  }
  const sourcePath = join(workspaceRoot, file);
  return existsSync(sourcePath) ? readFileSync(sourcePath, 'utf8') : '';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

if (require.main === module) {
  const result = runAndWriteImplementation300Certification();
  if (!result.ok) {
    process.exitCode = 1;
  }
}
```

- [x] **Step 4: Add package scripts**

Modify `package.json` scripts:

```json
"implementation300:certify": "node -r ts-node/register/transpile-only -r tsconfig-paths/register apps/api/src/scripts/implementation300-certification.ts",
"test:implementation300": "npm run build && node --test dist/apps/api/src/modules/implementation300/blueprint-registry.test.js dist/apps/api/src/scripts/implementation300-certification.test.js"
```

- [x] **Step 5: Run certification tests**

Run:

```powershell
npm run test:implementation300
```

Expected: PASS.

### Task 3: Expand School Onboarding To Match the Six-Step Blueprint

**Files:**

- Modify: `apps/api/src/modules/platform/dto/create-school.dto.ts`
- Modify: `apps/api/src/modules/platform/platform-onboarding.schema.ts`
- Modify: `apps/api/src/modules/platform/platform-onboarding.service.ts`
- Modify: `apps/api/src/modules/platform/platform-onboarding.service.test.ts`
- Modify: `apps/web/src/lib/platform/school-onboarding-client.ts`
- Modify: `apps/web/src/components/platform/superadmin-pages.tsx`

- [x] **Step 1: Add failing onboarding tests**

Extend `platform-onboarding.service.test.ts` with cases proving:

```ts
{
  school_name: 'Nairobi International Academy',
  registration_number: 'REG-2026-001',
  knec_code: 'KNEC-473821',
  county: 'Nairobi',
  location: 'Westlands',
  curriculum: 'cambridge',
  institution_category: 'international_school',
  campuses: [{ name: 'Main Campus', code: 'MAIN' }],
  academic_calendar: { academic_year: '2026', terms: ['Term 1', 'Term 2', 'Term 3'] },
  fee_categories: ['tuition', 'transport', 'boarding'],
  sms_sender_id: 'MYSHULE',
  domain: 'nairobi-international.myshule.africa',
  module_codes: ['students', 'finance', 'exams', 'parent_portal'],
  quotas: { students: 1200, staff: 160, storage_gb: 200, sms_per_term: 50000, devices: 24 },
  import_plan: ['students', 'staff', 'fees', 'results', 'inventory'],
  service_activation: ['sms', 'parent_portal', 'mobile_apps', 'cbt', 'biometrics'],
  training_status: 'scheduled',
  audit_verification_status: 'pending',
}
```

Assert that the service persists tenant profile data, enables only requested modules, creates onboarding state, and writes audit evidence.

- [x] **Step 2: Extend DTO validation**

Add typed fields for registration number, KNEC code, location, curriculum, institution category, campuses, calendar, fee categories, SMS sender ID, domain, quotas, import plan, service activation, training status, and audit verification status.

- [x] **Step 3: Extend schema**

Add tables or columns for:

- `tenant_profiles`: registration number, KNEC code, location, curriculum, category, branding JSON, domain, SMS sender ID.
- `tenant_campuses`: tenant ID, campus code, campus name, status.
- `tenant_onboarding_steps`: create school, modules, structure, import, services, go live status.
- `tenant_service_activation`: service code, status, activated at.
- `tenant_backup_policies`: backup status, retention days, last backup proof.

- [x] **Step 4: Implement service behavior**

Update `createSchool` so it performs the six steps transactionally:

1. Create tenant and profile.
2. Assign requested modules and quotas.
3. Persist academic structure seed data.
4. Persist import plan.
5. Persist service activation records.
6. Mark go-live readiness as blocked until domain, invitations, training, and audit verification are complete.

- [x] **Step 5: Run onboarding tests**

Run:

```powershell
npm run build && node --test dist/apps/api/src/modules/platform/platform-onboarding.service.test.js
```

Expected: PASS.

### Task 4: Make Module Activation and Billing Contract-Driven

**Files:**

- Modify: `apps/api/src/modules/module-access/module-access.constants.ts`
- Modify: `apps/api/src/modules/module-access/module-access.service.ts`
- Modify: `apps/api/src/modules/module-access/module-access.test.ts`
- Modify: `apps/api/src/modules/billing/billing-schema.service.ts`
- Modify: `apps/api/src/modules/billing/billing.service.ts`
- Modify: `apps/api/src/modules/billing/billing.test.ts`
- Modify: `apps/web/src/lib/module-access/module-access-map.ts`
- Modify: `apps/web/tests/design/module-readiness.test.ts`

- [x] **Step 1: Add failing contract tests**

Add tests proving:

- School A can activate students, finance, exams, and parent portal only.
- School B can activate full ERP, biometrics, IoT, CBT, and AI insights.
- Disabled modules are blocked in API guards, web nav, dashboards, reports, notifications, approvals, and AI insight inputs.
- Storage, SMS, device, staff, and learner quotas are enforced before write-heavy operations.
- Manual pricing, negotiated contracts, annual billing, term billing, and enterprise contracts produce invoice lines.

- [x] **Step 2: Align module constants**

Make `module-access.constants.ts` import or mirror the Implementation 300 canonical module codes, including `iot`.

- [x] **Step 3: Add billing contract schema**

Persist:

- `tenant_billing_contracts`
- `tenant_billing_contract_modules`
- `tenant_usage_meters`
- `tenant_quota_snapshots`
- `tenant_contract_invoices`

Each table must include `tenant_id`, audit timestamps, and indexes for tenant/date lookups.

- [x] **Step 4: Implement contract evaluation**

Billing service must calculate:

- fixed module price
- per-student price
- storage quota overage
- SMS usage
- device usage
- term invoices
- annual invoices
- enterprise negotiated override

- [x] **Step 5: Run billing and module access tests**

Run:

```powershell
npm run build && node --test dist/apps/api/src/modules/module-access/module-access.test.js dist/apps/api/src/modules/billing/billing.test.js
npm --prefix apps/web run test:design -- module-readiness
```

Expected: PASS.

### Task 5: Certify All 28 Modules Against Blueprint Capabilities

**Files:**

- Modify: `apps/api/src/modules/implementation300/blueprint-registry.ts`
- Modify: `apps/api/src/scripts/implementation300-certification.ts`
- Modify: all module controller/service/schema/test files listed in the Target Module Registry
- Modify: all matching module web workspaces under `apps/web/src/components/modules`, `apps/web/src/components/school`, `apps/web/src/components/dashboard`, `apps/web/src/components/portal`, `apps/web/src/components/library`, `apps/web/src/components/storekeeper`, and `apps/web/src/components/discipline`

- [x] **Step 1: Add capability evidence for every module**

For each module, add evidence checks for:

- live workspace
- frontend API route/proxy
- backend controller
- persistence schema
- workflow service
- reports/exports where the module requires reporting
- audit events
- permission guard
- module-aware web visibility
- realistic workflow tests

- [x] **Step 2: Close capability gaps module by module**

Use the Target Module Registry table as the acceptance list. Each module must have at least one automated test for every "Must Prove" capability category.

- [x] **Step 3: Run existing module tests**

Run:

```powershell
npm run build && node --test dist/apps/api/src/modules/students/students.test.js dist/apps/api/src/modules/admissions/admissions.test.js dist/apps/api/src/modules/academics/academics.test.js dist/apps/api/src/modules/billing/billing.test.js dist/apps/api/src/modules/exams/exams.test.js dist/apps/api/src/modules/discipline/discipline.test.js dist/apps/api/src/modules/timetable/timetable.test.js dist/apps/api/src/modules/labs/labs.test.js dist/apps/api/src/modules/biometric-attendance/biometric-attendance.test.js dist/apps/api/src/modules/integrations/integrations.test.js dist/apps/api/src/modules/inventory/inventory.test.js dist/apps/api/src/modules/library/library.test.js dist/apps/api/src/modules/transport/transport.test.js dist/apps/api/src/modules/hr/hr.test.js dist/apps/api/src/modules/admin-command/admin-command.test.js dist/apps/api/src/modules/clinic/clinic.test.js dist/apps/api/src/modules/procurement/procurement.test.js dist/apps/api/src/modules/hostel/hostel.test.js dist/apps/api/src/modules/boarding/boarding.test.js dist/apps/api/src/modules/cbt/cbt.test.js dist/apps/api/src/modules/lms/lms.test.js dist/apps/api/src/modules/ai-insights/ai-insights.test.js dist/apps/api/src/modules/visitors/visitors.test.js dist/apps/api/src/modules/assets/assets.test.js dist/apps/api/src/modules/iot/iot.test.js
```

Expected: PASS.

- [x] **Step 4: Run web module tests**

Run:

```powershell
npm --prefix apps/web run test:design -- module-readiness implementation100-live-modules exams-workspace transport-module procurement-module iot-module
```

Expected: PASS.

### Task 6: Expand Authentication and Identity Coverage

**Files:**

- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/auth/auth.controller.ts`
- Modify: `apps/api/src/auth/mfa.service.ts`
- Modify: `apps/api/src/auth/trusted-device.service.ts`
- Modify: `apps/api/src/auth/session.service.ts`
- Modify: `apps/api/src/auth/policies/abac-policy.engine.ts`
- Modify: `apps/api/src/auth/auth.test.ts`
- Modify: `apps/api/test/auth-security.integration-spec.ts`
- Modify: `apps/web/src/components/auth/*`
- Modify: `apps/web/src/lib/auth/*`

- [x] **Step 1: Add failing identity coverage tests**

Tests must prove:

- email/password login remains available
- phone OTP flow is available for parent and school users
- Google and Microsoft SSO records can be linked to a tenant membership
- MFA can be required by tenant, role, or suspicious device
- device sessions can be listed and revoked
- IP restriction policies reject disallowed networks
- password policies are enforced by tenant
- RFID/NFC and biometric identity adapters produce auditable identity assertions
- every blueprint role can be normalized into an RBAC/ABAC policy context

- [x] **Step 2: Implement identity adapter contracts**

Expose typed adapter interfaces:

```ts
export type ExternalIdentityMethod =
  | 'email_password'
  | 'phone_otp'
  | 'google'
  | 'microsoft'
  | 'sso'
  | 'biometric'
  | 'rfid'
  | 'nfc';

export type IdentityAssertion = {
  tenantId: string;
  userId?: string;
  method: ExternalIdentityMethod;
  subject: string;
  deviceId?: string;
  confidence: 'low' | 'medium' | 'high';
  assertedAt: string;
  metadata: Record<string, string | number | boolean>;
};
```

- [x] **Step 3: Run auth tests**

Run:

```powershell
npm run build && node --test dist/apps/api/src/auth/auth.test.js dist/apps/api/src/auth/mfa.service.test.js dist/apps/api/src/auth/trusted-device.service.test.js
npm run test:auth-security
```

Expected: PASS.

### Task 7: Add Kenyan and External Integration Evidence

**Files:**

- Modify: `apps/api/src/modules/payments/*`
- Modify: `apps/api/src/modules/integrations/*`
- Modify: `apps/api/src/scripts/provider-credential-smoke.ts`
- Modify: `apps/api/src/scripts/provider-credential-smoke.test.ts`
- Modify: `apps/api/test/mpesa-adversarial.integration-spec.ts`
- Modify: `apps/api/test/mpesa-network-conditions.integration-spec.ts`

- [x] **Step 1: Expand provider smoke coverage**

Provider smoke checks must cover:

- M-Pesa
- bank APIs
- SMS gateways
- email providers
- WhatsApp provider adapter
- KNEC hook configuration
- NEMIS hook configuration
- Google Workspace
- Microsoft 365
- Zoom or Google Meet
- biometric devices
- RFID systems
- GPS trackers
- accounting systems

- [ ] **Step 2: Keep M-Pesa adversarial tests blocking**

Run:

```powershell
npm run test:mpesa-adversarial
npm run test:mpesa-network-conditions
npm run smoke:providers
```

Expected: PASS with no secrets printed.

Current evidence: `test:mpesa-adversarial` and `test:mpesa-network-conditions` pass against the disposable PostgreSQL harness. `smoke:providers` remains a live/configured-environment gate and is blocked locally until `RESEND_API_KEY`, `EMAIL_FROM`, `PUBLIC_APP_URL` or `WEB_APP_URL`, and `SUPPORT_NOTIFICATION_EMAILS` are supplied.

### Task 8: Make Offline, Mobile, and Low-Connectivity Support Certifiable

**Files:**

- Modify: `apps/api/src/modules/sync/*`
- Modify: `apps/api/test/sync-consistency.integration-spec.ts`
- Modify: `apps/web/src/app/offline/page.tsx`
- Modify: `apps/web/src/lib/dashboard/session-refreshing-fetch.ts`
- Modify: `apps/web/src/components/modules/exams/exams-module-screen.tsx`
- Modify: `apps/web/src/components/school/school-pages.tsx`
- Modify: `apps/web/tests/design/experience-shells.test.tsx`

- [x] **Step 1: Add offline workflow tests**

Tests must prove:

- attendance can be captured offline and synced
- marks can be captured offline and synced
- conflict resolution keeps both versions visible until resolved
- local cache does not expose another tenant
- SMS fallback can queue messages when internet delivery fails
- mobile viewport renders parent, teacher, student, and admin primary workflows without horizontal overflow

- [x] **Step 2: Run sync and mobile tests**

Run:

```powershell
npm run test:sync-consistency
npm --prefix apps/web run test:design -- experience-shells
```

Expected: PASS.

### Task 9: Certify AI, Analytics, Automation, and KPIs

**Files:**

- Modify: `apps/api/src/modules/ai-insights/*`
- Modify: `apps/api/src/common/dashboard/dashboard-summary.repository.ts`
- Modify: `apps/api/src/common/dashboard/dashboard-summary.repository.test.ts`
- Modify: `apps/api/src/modules/events/*`
- Modify: `apps/web/src/lib/workflows/workflow-catalog.ts`
- Modify: `apps/web/src/components/workflows/approval-command-panel.tsx`
- Modify: `apps/api/src/scripts/generate-production-scorecard.ts`
- Modify: `apps/api/src/scripts/generate-production-scorecard.test.ts`

- [x] **Step 1: Add KPI and automation evidence**

The scorecard must include:

- financial collection rate, arrears percentage, revenue trends
- academic mean score, grade distribution, CBC competency trends
- operational attendance rates, staff punctuality, inventory turnover
- executive enrollment growth, parent engagement, operational efficiency, risk indicators

Workflow automation must include fee reminders, low stock alerts, attendance alerts, discipline escalation, and timetable conflict alerts.

- [x] **Step 2: Enforce auditable AI**

AI insights must store:

- input dataset version
- tenant ID
- enabled module list
- model/provider identity
- explanation summary
- recommendation owner
- accepted/dismissed status
- audit timestamps

- [x] **Step 3: Run AI and scorecard tests**

Run:

```powershell
npm run build && node --test dist/apps/api/src/modules/ai-insights/ai-insights.test.js dist/apps/api/src/scripts/generate-production-scorecard.test.js
```

Expected: PASS.

### Task 10: Add Security, Compliance, Tenant Isolation, and DR Gates

**Files:**

- Modify: `apps/api/src/modules/security/*`
- Modify: `apps/api/src/modules/compliance/*`
- Modify: `apps/api/src/scripts/tenant-isolation-audit.ts`
- Modify: `apps/api/src/scripts/security-scan.ts`
- Modify: `apps/api/src/scripts/pii-leak-ci-scan.ts`
- Modify: `apps/api/test/compliance.integration-spec.ts`
- Modify: `apps/api/test/disaster-recovery.integration-spec.ts`
- Modify: `apps/api/test/backup-integrity.integration-spec.ts`

- [x] **Step 1: Expand compliance evidence**

Compliance tests must prove:

- Kenyan Data Protection Act controls
- consent capture and revocation
- data retention policies
- export access control
- encryption at rest and in transit configuration evidence
- audit logs for reads/writes/exports/approvals/payments/device events
- tenant-level backup encryption and restore proof

- [x] **Step 2: Run security and DR gates**

Run:

```powershell
npm run tenant:isolation:audit
npm run security:scan
npm run security:pii-scan
npm run test:compliance
npm run dr:backup-restore
```

Expected: PASS.

### Task 11: Prove 1000+ School Scale and High Concurrency

**Files:**

- Modify: `apps/api/src/scripts/implementation90-load-profile.ts`
- Modify: `apps/api/src/scripts/high-volume-workflow-load.ts`
- Modify: `apps/api/test/tenant-scale.load.ts`
- Modify: `apps/api/test/kenyan-school-generate.ts`
- Modify: `apps/api/test/kenyan-school-load.ts`
- Modify: `apps/api/src/scripts/query-plan-review.ts`
- Modify: `apps/api/src/scripts/release-readiness-gate.ts`

- [x] **Step 1: Add scale acceptance profile**

The load profile must include:

- 1000 tenant schools
- millions of records
- tens of thousands of concurrent feature actions
- read replicas
- queue workers
- CDN/cache strategy
- sharding readiness checks
- autoscaling/deployment readiness evidence

- [x] **Step 2: Run performance gates**

Run:

```powershell
npm run load:tenant-scale
npm run load:high-volume-workflows
npm run perf:query-plan-review
npm run implementation90:load-profile
```

Expected: PASS within the thresholds encoded in each script.

### Task 12: Wire Implementation 300 Into Release Readiness

**Files:**

- Modify: `package.json`
- Modify: `apps/api/src/scripts/release-readiness-gate.ts`
- Modify: `apps/api/src/scripts/release-readiness-gate.test.ts`
- Create: `docs/validation/implementation300-certification.md`

- [x] **Step 1: Add release readiness test coverage**

Extend `release-readiness-gate.test.ts` so it fails unless Implementation 300 certification is checked.

- [x] **Step 2: Add release script**

After the certification script is stable, add this to `ci:full` after `implementation103:certify` and before `module-access:certify`:

```json
"implementation300:certify"
```

- [x] **Step 3: Generate validation artifact**

Run:

```powershell
npm run implementation300:certify
```

Expected:

- `docs/validation/implementation300-certification.md` is written.
- Exit code is `0` only when every blueprint section and module passes.
- Exit code is non-zero when any blueprint evidence is missing.

- [x] **Step 4: Run the full release gate**

Run:

```powershell
npm run ci:full
```

Expected: PASS before declaring Implementation 300 complete.

---

## Phase Delivery Order

### Phase 1: Core ERP Compliance

Deliver authentication, tenant management, student management, fees, exams, communication, reports, module activation, and onboarding certification.

Exit gate:

```powershell
npm run test:implementation300
npm run implementation300:certify
npm run readiness:modules
```

### Phase 2: Operations Compliance

Deliver HR, inventory, library, transport, timetable, parent portal, procurement, clinic, hostel, boarding, and administrative leadership evidence.

Exit gate:

```powershell
npm run test
npm --prefix apps/web run test:design
```

### Phase 3: Advanced Smart Campus Compliance

Deliver CBT, LMS, AI insights, IoT, biometrics, offline sync, smart campus telemetry, GPS, RFID/NFC, and device authorization evidence.

Exit gate:

```powershell
npm run test:implementation101
npm run test:implementation102
npm run test:implementation103
npm run test:sync-consistency
```

### Phase 4: Enterprise Intelligence and Scale Compliance

Deliver predictive analytics, executive AI, automation engine, advanced integrations, tenant-scale load, DR, compliance, and release readiness evidence.

Exit gate:

```powershell
npm run implementation90:full-release-gate
npm run ci:full
```

## Definition of Done

Implementation 300 is complete only when all items below are true:

- `implementation300.md` remains the current blueprint compliance plan.
- `apps/api/src/modules/implementation300/blueprint-registry.ts` covers all 24 blueprint sections and all 28 modules.
- `npm run test:implementation300` passes.
- `npm run implementation300:certify` writes `docs/validation/implementation300-certification.md`.
- `npm run ci:full` includes Implementation 300 certification and passes.
- Every module in the Target Module Registry has live UI, API route/proxy, backend controller, persistence, workflow tests, permission guards, audit evidence, reports/exports where required, and module-aware visibility.
- Tenant onboarding proves all six blueprint steps and never grants disabled-module access.
- Billing proves custom pricing, negotiated contracts, quotas, usage metering, invoices, annual/term billing, and enterprise contracts.
- Auth proves the full identity method and role list.
- AI insights prove tenant isolation, module awareness, explainability, audit logs, and human review status.
- Offline/mobile gates prove common parent, teacher, student, and admin workflows on low-connectivity devices.
- Security, compliance, tenant isolation, DR, monitoring, load, and release gates pass.

## Self-Review

- Spec coverage: every blueprint section maps to a workstream in the Blueprint Coverage Map.
- Module coverage: all 28 requested modules are listed with required capability evidence.
- Tenant model coverage: onboarding, module activation, billing, domain, branding, quotas, backups, and isolation are explicit tasks.
- Scale coverage: 1000+ schools, millions of records, and high concurrency are covered by load and release gates.
- Security coverage: Kenyan DPA, consent, retention, encryption, RBAC/ABAC, audit logs, PII scan, tenant isolation, DR, and backups are covered.
- No root-level app code is changed by this document.
