# Implementation 700 Flow Completion and Evidence Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use `codex-security:security-scan` before changing authentication, tenant isolation, payments, child records, health records, biometrics, counselling, visitor/security workflows, provider credentials, AI recommendations, or export controls.

**Goal:** Close the remaining incomplete user flows and make production readiness depend on live, sanitized workflow evidence rather than source-level evidence alone.

**Architecture:** Keep the current Next.js web app, NestJS API, PostgreSQL tenant-aware schema, module-access guard, provider smoke scripts, generated validation artifacts, and production operability workflow. Add live pilot execution, rollout evidence ingestion, relationship-aware module forms, and stronger release gates so the system distinguishes "implemented in source" from "proven in a real tenant."

**Tech Stack:** Next.js 16, React 19, TypeScript, TailwindCSS, NestJS 11, PostgreSQL, Redis/BullMQ, node:test, Jest, Playwright, GitHub Actions, provider smoke scripts, generated Markdown validation artifacts.

---

## Analysis Snapshot

Current system strength:

- The API is broad and modular: `apps/api/src/app.module.ts` composes auth, tenant, payments, billing, support, inventory, admissions, exams, discipline, transport, procurement, hostel, boarding, CBT, LMS, visitors, assets, IoT, observability, compliance, and module-access modules.
- The web app has role-separated routes and module proxies under `apps/web/src/app`, with module-aware school navigation in `apps/web/src/lib/module-access/module-access-map.ts`.
- Implementation 100, 300, 400, module-access, query-plan, scale, security, and production scorecard artifacts mostly pass.
- `docs/validation/implementation30-rollout-gate.md` correctly refuses to mark live rollout phases complete from source code alone.

Incomplete or weak flows found:

- Live rollout remains blocked. All six rollout phases in `docs/validation/implementation30-rollout-gate.md` are `blocked` because no live phase evidence is attached.
- Pilot certification is still mostly contract evidence. `apps/api/src/scripts/run-pilot-certification.ts` enters live mode, checks environment variables, then records that HTTP workflow execution can run; it does not execute the authenticated pilot workflow steps.
- `docs/validation/pilot-real-workflow-checklist.md` is a manual checklist with no result ingestion model, owner, artifact ID, or gate integration.
- SMS live provider validation is intentionally incomplete. `docs/validation/implementation7-live-validation.md` records live SMS provider smoke as pending, SMS skipped in production provider smoke, and monitor token creation pending until a real tenant exists.
- Seven advanced modules use the generic `SimpleOperationsService` and generic `Implementation100LiveModuleScreen`: AI insights, asset tracking, boarding, CBT, hostel, LMS, and visitor management. This proves live CRUD scaffolding but not the domain workflows implied by the product.
- Transport, procurement, and IoT screens still ask operators for raw UUID values in forms. This breaks natural school workflows even though the APIs are live.
- Approval workflow coverage is narrow. `apps/web/src/lib/workflows/workflow-catalog.ts` covers seven approval types, leaving admissions, transport, visitors, boarding, hostel, CBT, LMS, assets, IoT, and AI recommendations out of the leadership queue.
- Production scorecard can pass while its remediation column still names material operational work: authenticated pilot certification, live provider smoke evidence, live dashboard states, tenant-scale artifacts, and scheduled artifact storage.

Implementation 700 should treat these as the next release boundary: no more "source exists" passing as "school workflow completed" for production launch claims.

## File Structure

Modify:

- `apps/api/src/scripts/run-pilot-certification.ts` - add live authenticated HTTP workflow execution and sanitized result rendering.
- `apps/api/src/scripts/run-pilot-certification.test.ts` - test live mode success, live mode HTTP failure, and secret-safe Markdown.
- `apps/api/src/scripts/implementation30-rollout-gate.ts` - ingest rollout evidence and fail production rollout phases without evidence.
- `apps/api/src/scripts/implementation30-rollout-gate.test.ts` - test each phase requirement and redaction rule.
- `.github/workflows/production-operability.yml` - require live pilot, live provider, rollout, and artifact upload modes for production checks.
- `apps/web/src/components/modules/transport/transport-module-screen.tsx` - replace raw route, vehicle, trip, and student ID inputs with selectors.
- `apps/web/src/components/modules/procurement/procurement-module-screen.tsx` - replace raw request, supplier, and purchase-order ID inputs with selectors.
- `apps/web/src/components/modules/iot/iot-module-screen.tsx` - replace raw device ID inputs with device selectors.
- `apps/web/src/components/common/learner-picker.tsx` - reuse or slightly adapt existing learner lookup for transport manifests and events.
- `apps/web/src/lib/workflows/workflow-catalog.ts` - add missing module approvals and leadership actions.
- `apps/web/tests/design/transport-module.test.tsx` - assert no raw UUID entry is required for normal transport workflows.
- `apps/web/tests/design/procurement-module.test.tsx` - assert procurement approvals and invoices use visible records.
- `apps/web/tests/design/iot-module.test.tsx` - assert telemetry, commands, and credentials use visible devices.
- `apps/web/tests/design/experience-actions.test.tsx` - assert expanded approval workflow visibility obeys enabled modules and roles.
- `docs/validation/pilot-real-workflow-checklist.md` - convert from static checklist into a filled evidence template.
- `docs/validation/implementation30-rollout-gate.md` - regenerated by the rollout gate.
- `docs/scorecards/production-readiness-scorecard.md` - regenerated after gates enforce live evidence.

Create:

- `apps/api/src/scripts/pilot-live-workflow.ts` - shared live pilot workflow step definitions and HTTP runner.
- `apps/api/src/scripts/pilot-live-workflow.test.ts` - isolated runner tests with mocked fetch.
- `apps/api/src/scripts/rollout-evidence.ts` - sanitized rollout evidence model, validation, and rendering helpers.
- `apps/api/src/scripts/rollout-evidence.test.ts` - evidence model tests.
- `docs/validation/live-rollout-evidence.example.json` - safe example evidence for local validation.
- `docs/validation/live-rollout-evidence.local.json` - ignored local/operator evidence file if real evidence is collected locally.

## Task 1: Execute Live Pilot Certification

**Files:**

- Create: `apps/api/src/scripts/pilot-live-workflow.ts`
- Create: `apps/api/src/scripts/pilot-live-workflow.test.ts`
- Modify: `apps/api/src/scripts/run-pilot-certification.ts`
- Modify: `apps/api/src/scripts/run-pilot-certification.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Add a live workflow runner module**

Create `apps/api/src/scripts/pilot-live-workflow.ts` with exported step definitions for the existing pilot workflows. Use the monitor token or pilot access token already referenced by `.github/workflows/production-operability.yml`.

Required exported shape:

```ts
export type PilotLiveStep = {
  id: string;
  label: string;
  method: 'GET' | 'POST';
  target: 'api' | 'web';
  path: string;
  expectedStatuses: number[];
  body?: Record<string, unknown>;
};

export type PilotLiveStepResult = {
  id: string;
  label: string;
  status: 'pass' | 'fail';
  http_status?: number;
  evidence: string;
};

export const PILOT_LIVE_STEPS: PilotLiveStep[] = [
  { id: 'health-ready', label: 'API readiness', method: 'GET', target: 'api', path: '/health/ready', expectedStatuses: [200] },
  { id: 'module-access', label: 'Tenant module access', method: 'GET', target: 'api', path: '/module-access/me', expectedStatuses: [200] },
  { id: 'support-status', label: 'Public support status', method: 'GET', target: 'api', path: '/support/public/system-status', expectedStatuses: [200] },
  { id: 'students-directory', label: 'Student directory read path', method: 'GET', target: 'api', path: '/students?limit=1', expectedStatuses: [200] },
  { id: 'billing-balances', label: 'Billing balance read path', method: 'GET', target: 'api', path: '/billing/students/balances?limit=1', expectedStatuses: [200] },
  { id: 'inventory-dashboard', label: 'Inventory dashboard read path', method: 'GET', target: 'api', path: '/inventory/dashboard', expectedStatuses: [200] },
  { id: 'exams-report-cards', label: 'Report-card read path', method: 'GET', target: 'api', path: '/exams/report-cards?limit=1', expectedStatuses: [200] },
  { id: 'web-login-page', label: 'School login page', method: 'GET', target: 'web', path: '/school/login', expectedStatuses: [200] },
  { id: 'web-parent-portal', label: 'Parent portal page', method: 'GET', target: 'web', path: '/parent-portal', expectedStatuses: [200] },
];
```

The runner must never write response bodies, tokens, phone numbers, OTPs, emails, or database URLs into results. Evidence strings should use method, sanitized path, HTTP status, and request timestamp.

- [ ] **Step 2: Wire live mode into pilot certification**

Modify `runPilotCertification()` so `mode === 'live'` performs the current source checks, validates `PILOT_API_BASE_URL`, `PILOT_WEB_BASE_URL`, `PILOT_TENANT_ID`, and `PILOT_ACCESS_TOKEN`, then executes `runPilotLiveWorkflow()`.

Expected behavior:

- missing live environment still fails.
- any live step with an unexpected status fails the overall certification.
- successful live mode renders a `## Live Workflow Evidence` section in `docs/validation/implementation10-pilot-certification.md`.
- contract mode remains source-only and does not perform remote requests.

- [ ] **Step 3: Add tests for real live behavior**

Add tests proving:

- live mode with missing env fails.
- live mode with env and mocked 200 responses passes.
- live mode with one mocked 500 response fails and identifies the failing step.
- rendered Markdown does not include access tokens, phone numbers, OTPs, or full emails.

Run:

```bash
npm run build
node --test dist/apps/api/src/scripts/pilot-live-workflow.test.js dist/apps/api/src/scripts/run-pilot-certification.test.js
```

Expected: both test files pass.

## Task 2: Ingest Rollout Evidence Instead of Blocking Forever

**Files:**

- Create: `apps/api/src/scripts/rollout-evidence.ts`
- Create: `apps/api/src/scripts/rollout-evidence.test.ts`
- Create: `docs/validation/live-rollout-evidence.example.json`
- Modify: `apps/api/src/scripts/implementation30-rollout-gate.ts`
- Modify: `apps/api/src/scripts/implementation30-rollout-gate.test.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Define the evidence schema**

Create a sanitized rollout evidence model with these required fields per phase:

```ts
export type RolloutPhaseEvidence = {
  phase_id: 1 | 2 | 3 | 4 | 5 | 6;
  evidence_collected_at: string;
  school_count: number;
  payment_mode: 'none' | 'mpesa_sandbox' | 'mpesa_production_low_risk' | 'mpesa_production';
  report_card_downloads_verified: number;
  parent_portal_logins_verified: number;
  provider_smoke_artifact_id: string;
  backup_restore_artifact_id: string;
  slo_days_observed: number;
  sev1_incidents: number;
  sev2_incidents: number;
  operator: string;
};
```

Validation must reject secrets and raw PII using patterns for bearer tokens, Kenyan phone numbers, OTP-like numeric codes, database URLs, and full email addresses.

- [ ] **Step 2: Add phase rules**

Phase thresholds:

| Phase | School count | Payment mode | Report cards | Parent logins | SLO days | Incidents |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| 1 | 3 | none | 0 | 0 | 0 | 0 sev1 |
| 2 | 5 | mpesa_sandbox | 0 | 0 | 0 | 0 sev1 |
| 3 | 10 | mpesa_production_low_risk | 5 | 5 | 3 | 0 sev1 and 0 sev2 |
| 4 | 50 | mpesa_production | 25 | 25 | 7 | 0 sev1 and 0 sev2 |
| 5 | 250 | mpesa_production | 100 | 100 | 14 | 0 sev1 and 0 sev2 |
| 6 | 1000 | mpesa_production | 250 | 250 | 30 | 0 sev1 and 0 sev2 |

- [ ] **Step 3: Wire the rollout gate**

Modify `implementation30-rollout-gate.ts` to read evidence from:

1. `IMPLEMENTATION30_ROLLOUT_EVIDENCE_PATH`, when provided.
2. `docs/validation/live-rollout-evidence.local.json`, when present.
3. no evidence, which preserves the current blocked behavior.

The gate should continue reporting `Technical readiness: pass` when technical gates pass, but should only report `Rollout complete: pass` when all six phase rules pass with sanitized evidence.

- [ ] **Step 4: Add local evidence hygiene**

Add `docs/validation/live-rollout-evidence.local.json` to `.gitignore`. Keep `docs/validation/live-rollout-evidence.example.json` committed with fake request IDs and no real PII.

Run:

```bash
npm run build
node --test dist/apps/api/src/scripts/rollout-evidence.test.js dist/apps/api/src/scripts/implementation30-rollout-gate.test.js
npm run implementation30:rollout-gate
```

Expected: tests pass, and the generated rollout artifact remains blocked without real evidence.

## Task 3: Remove Raw UUID Operator Flows

**Files:**

- Modify: `apps/web/src/components/modules/transport/transport-module-screen.tsx`
- Modify: `apps/web/src/components/modules/procurement/procurement-module-screen.tsx`
- Modify: `apps/web/src/components/modules/iot/iot-module-screen.tsx`
- Modify: `apps/web/src/components/common/learner-picker.tsx`
- Modify: `apps/web/tests/design/transport-module.test.tsx`
- Modify: `apps/web/tests/design/procurement-module.test.tsx`
- Modify: `apps/web/tests/design/iot-module.test.tsx`

- [ ] **Step 1: Transport selectors**

Replace these text inputs:

- route id for manifests and trips.
- vehicle id for trips and service logs.
- trip id for trip events.
- student id and comma-separated student ids for manifests and events.

Use visible data already loaded into `TransportDashboard`:

- route selectors from `dashboard.routes`.
- vehicle selectors from `dashboard.vehicles`.
- trip selectors from `dashboard.trips`.
- `LearnerPicker` for student selection.
- a selected learner list for manifests.

POST payloads still send IDs, but operators choose by name, registration, route, or learner identity.

- [ ] **Step 2: Procurement selectors**

Replace these text inputs:

- request id for approvals and purchase orders.
- supplier id for purchase orders.
- purchase order id for invoices.

Use visible dashboard lists:

- requests from `dashboard.requests`.
- suppliers from `dashboard.suppliers`.
- purchase orders from `dashboard.purchase_orders`.

Disable dependent submit buttons until a valid visible record is selected.

- [ ] **Step 3: IoT selectors**

Replace device id inputs in telemetry, command, and credential forms with a device selector from `dashboard.devices`. The selector label should show device name, device type, location, and health status.

- [ ] **Step 4: Design tests**

Add assertions that normal module screens do not render raw UUID prompts:

```ts
expect(screen.queryByPlaceholderText(/uuid/i)).not.toBeInTheDocument();
expect(screen.getByRole('combobox', { name: /route/i })).toBeInTheDocument();
expect(screen.getByRole('combobox', { name: /vehicle/i })).toBeInTheDocument();
expect(screen.getByRole('combobox', { name: /device/i })).toBeInTheDocument();
```

Run:

```bash
npm --prefix apps/web run test:design -- transport-module procurement-module iot-module
```

Expected: tests pass and no normal operator flow requires typing a UUID.

## Task 4: Promote Generic Modules to Domain Workflows

**Files:**

- Modify: `apps/api/src/modules/visitors/*`
- Modify: `apps/api/src/modules/assets/*`
- Modify: `apps/api/src/modules/boarding/*`
- Modify: `apps/api/src/modules/hostel/*`
- Modify: `apps/api/src/modules/cbt/*`
- Modify: `apps/api/src/modules/lms/*`
- Modify: `apps/api/src/modules/ai-insights/*`
- Modify: `apps/web/src/components/modules/visitors/visitor-management-module-screen.tsx`
- Modify: `apps/web/src/components/modules/assets/asset-tracking-module-screen.tsx`
- Modify: `apps/web/src/components/modules/boarding/boarding-module-screen.tsx`
- Modify: `apps/web/src/components/modules/hostel/hostel-module-screen.tsx`
- Modify: `apps/web/src/components/modules/cbt/cbt-module-screen.tsx`
- Modify: `apps/web/src/components/modules/lms/lms-module-screen.tsx`
- Modify: `apps/web/src/components/modules/ai-insights/ai-insights-module-screen.tsx`
- Modify: matching API tests and web design tests.

- [ ] **Step 1: Visitor management**

Replace generic records with:

- visitor pre-registration.
- check-in with host, purpose, ID type, badge number, and time.
- check-out.
- emergency visitor roll call.
- blocked visitor status.

API paths:

- `GET /visitors/dashboard`
- `POST /visitors/check-ins`
- `PATCH /visitors/check-ins/:checkInId/check-out`
- `POST /visitors/watchlist`
- `GET /visitors/emergency-roll-call`

- [ ] **Step 2: Asset tracking**

Replace generic records with:

- asset registry.
- assignment to room, staff member, or department.
- maintenance tickets.
- depreciation status.
- disposal approval request.

API paths:

- `GET /assets/dashboard`
- `POST /assets`
- `POST /assets/:assetId/assignments`
- `POST /assets/:assetId/maintenance`
- `POST /assets/:assetId/disposal-requests`

- [ ] **Step 3: Boarding and hostel**

Replace generic records with:

- house or hostel occupancy.
- room and bed allocation.
- leave requests.
- incidents.
- meal or welfare notes.

API paths:

- `GET /boarding/dashboard`
- `POST /boarding/allocations`
- `POST /boarding/leave-requests`
- `POST /boarding/incidents`
- `GET /hostel/dashboard`
- `POST /hostel/rooms`
- `POST /hostel/bed-allocations`
- `POST /hostel/incidents`

- [ ] **Step 4: CBT and LMS**

Replace generic records with:

- CBT exam session setup.
- question set attachment.
- candidate assignment.
- submission status.
- LMS course, lesson, assignment, and completion tracking.

API paths:

- `GET /cbt/dashboard`
- `POST /cbt/sessions`
- `POST /cbt/sessions/:sessionId/candidates`
- `PATCH /cbt/submissions/:submissionId/score`
- `GET /lms/dashboard`
- `POST /lms/courses`
- `POST /lms/courses/:courseId/lessons`
- `POST /lms/assignments`
- `PATCH /lms/assignments/:assignmentId/submissions/:submissionId`

- [ ] **Step 5: AI insights**

Replace generic records with:

- tenant-scoped insight run requests.
- capability and module selection.
- explainability payload.
- human approval or dismissal.
- feedback reason.

API paths:

- `GET /ai-insights/dashboard`
- `POST /ai-insights/runs`
- `POST /ai-insights/:insightId/approve`
- `POST /ai-insights/:insightId/dismiss`
- `POST /ai-insights/:insightId/feedback`

Run:

```bash
npm run build
npm run test
npm --prefix apps/web run test:design -- module-readiness implementation100-live-modules
npm run implementation100:certify
npm run implementation300:certify
```

Expected: all promoted modules retain tenant RLS, module guards, permissions, tests, and certification evidence.

## Task 5: Expand Approval and Automation Coverage

**Files:**

- Modify: `apps/web/src/lib/workflows/workflow-catalog.ts`
- Modify: `apps/web/tests/design/experience-actions.test.tsx`
- Modify: `apps/api/src/modules/automation/automation-policy.ts`
- Modify: `apps/api/src/modules/automation/automation-policy.test.ts`

- [ ] **Step 1: Add missing approval workflows**

Add workflows for:

- admissions acceptance and transfer-out approval.
- transport route changes and incident escalation.
- visitor watchlist approval.
- asset disposal.
- boarding leave and serious incident escalation.
- hostel bed capacity override.
- CBT result release.
- LMS content publication.
- AI recommendation approval.
- IoT command approval for lock, unlock, restart, and calibration commands.

- [ ] **Step 2: Keep module access strict**

Every new workflow must include a module code and must be hidden when that module is disabled. Tests should call `getVisibleApprovalWorkflows()` for principal, deputy principal, bursar, storekeeper, boarding master, security officer, and transport manager roles.

- [ ] **Step 3: Extend automation policy**

Add automation policy entries for:

- visitor overdue checkout alert.
- vehicle service due alert.
- asset maintenance overdue alert.
- boarding leave return overdue alert.
- CBT session irregularity alert.
- LMS assignment overdue alert.
- IoT offline device alert.

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/automation/automation-policy.test.js
npm --prefix apps/web run test:design -- experience-actions
```

Expected: workflows and automation triggers are module-aware and role-aware.

## Task 6: Harden Production Operability Gates

**Files:**

- Modify: `.github/workflows/production-operability.yml`
- Modify: `apps/api/src/scripts/release-readiness-gate.ts`
- Modify: `apps/api/src/scripts/release-readiness-gate.test.ts`
- Modify: `apps/api/src/scripts/generate-production-scorecard.ts`
- Modify: `apps/api/src/scripts/generate-production-scorecard.test.ts`
- Modify: `docs/deployment/provider-hardening.md`
- Modify: `docs/runbooks/production-monitoring.md`

- [ ] **Step 1: Add production evidence mode**

Add `RELEASE_EVIDENCE_MODE=production` support to `release-readiness-gate.ts`.

In production evidence mode, the gate must fail when:

- `implementation30-rollout-gate.md` says `Rollout complete: blocked`.
- provider smoke skipped SMS while `SUPPORT_PROVIDER_SMOKE_REQUIRE_SMS=true`.
- pilot certification is in contract mode.
- required generated artifacts are older than 24 hours.
- backup restore evidence is missing from the production operability artifact bundle.

- [ ] **Step 2: Make scorecard honest about blocked rollout**

Modify `generate-production-scorecard.ts` so a blocked live rollout cannot produce a launch-ready score. The scorecard may still show strong technical readiness, but it must label production launch status as blocked until live rollout phases have evidence.

- [ ] **Step 3: Update GitHub Actions**

For scheduled production checks, pass:

```yaml
RELEASE_EVIDENCE_MODE: production
PILOT_CERTIFICATION_LIVE: "true"
SUPPORT_PROVIDER_SMOKE_REQUIRE_SMS: "true"
SUPPORT_PROVIDER_SMOKE_LIVE: "true"
```

Keep manual `workflow_dispatch` flexible for dry-run checks, but label dry-run artifacts as non-launch evidence.

Run:

```bash
npm run build
node --test dist/apps/api/src/scripts/release-readiness-gate.test.js dist/apps/api/src/scripts/generate-production-scorecard.test.js
npm run release:readiness
npm run scorecard:production
```

Expected: local source-only mode can pass technical readiness, production evidence mode fails until real live evidence is attached.

## Task 7: Verification Bundle

**Files:**

- Modify: `docs/validation/implementation10-pilot-certification.md`
- Modify: `docs/validation/implementation30-rollout-gate.md`
- Modify: `docs/scorecards/production-readiness-scorecard.md`

- [ ] **Step 1: Focused tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/scripts/pilot-live-workflow.test.js dist/apps/api/src/scripts/run-pilot-certification.test.js dist/apps/api/src/scripts/rollout-evidence.test.js dist/apps/api/src/scripts/implementation30-rollout-gate.test.js dist/apps/api/src/scripts/release-readiness-gate.test.js dist/apps/api/src/scripts/generate-production-scorecard.test.js
npm --prefix apps/web run test:design -- transport-module procurement-module iot-module experience-actions module-readiness
```

Expected: focused backend and frontend tests pass.

- [ ] **Step 2: Certification commands**

Run:

```bash
npm run implementation30:rollout-gate
npm run certify:pilot
npm run implementation100:certify
npm run implementation300:certify
npm run release:readiness
npm run scorecard:production
```

Expected: source-only local gates pass except rollout remains blocked without real evidence.

- [ ] **Step 3: Production evidence rehearsal**

Run with safe local example evidence:

```bash
$env:RELEASE_EVIDENCE_MODE='production'
$env:IMPLEMENTATION30_ROLLOUT_EVIDENCE_PATH='docs/validation/live-rollout-evidence.example.json'
npm run implementation30:rollout-gate
npm run release:readiness
```

Expected: production evidence mode validates the schema and fails only where example evidence intentionally lacks real thresholds.

## Completion Criteria

Implementation 700 is complete when:

- live pilot certification performs HTTP checks in live mode.
- rollout evidence can be ingested, validated, redacted, and used by the rollout gate.
- transport, procurement, and IoT no longer require raw UUID entry for normal operator workflows.
- generic record boards are promoted into domain-specific workflows or explicitly remain out of production launch scope.
- approval and automation workflows cover the advanced modules and remain module-aware.
- production evidence mode prevents a launch-ready score while rollout, SMS, pilot, provider, or backup evidence is missing.
- generated validation docs clearly separate technical readiness from live rollout readiness.

