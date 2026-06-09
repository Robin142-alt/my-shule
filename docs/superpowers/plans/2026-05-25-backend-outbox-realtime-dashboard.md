# Backend Outbox Realtime Dashboard Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing backend outbox into a capability-aware dashboard realtime stream for the web dashboard communication protocol.

**Architecture:** Reuse the existing `outbox_events` table, dispatcher, and event publisher. Add dashboard-facing event mapping, a tenant-safe snapshot/SSE service, and controller routes that stream mapped dashboard events without dashboards owning backend data or directly talking to each other.

**Tech Stack:** NestJS, TypeScript, Node test runner, existing MyShule events/outbox infrastructure.

---

### Task 1: Backend Realtime Contract Tests

**Files:**
- Modify: `apps/api/src/modules/events/events.test.ts`

- [ ] **Step 1: Add failing tests**

Add tests proving:
- domain events such as `payment.completed`, `exam.submitted`, and `discipline.case.escalated` map to dashboard event envelopes
- disabled modules suppress dashboard events
- permission mismatches suppress dashboard events
- repository dashboard stream queries are tenant-scoped, cursor-aware, and limited
- controller exposes authenticated snapshot and SSE routes

- [ ] **Step 2: Run tests to verify red**

Run:
`node -r ts-node/register/transpile-only -r tsconfig-paths/register --test apps/api/src/modules/events/events.test.ts --test-name-pattern "dashboard realtime|DashboardRealtime"`

Expected:
FAIL because dashboard realtime service/controller APIs do not exist.

### Task 2: Dashboard Realtime Types and Mapping Service

**Files:**
- Modify: `apps/api/src/modules/events/events.types.ts`
- Create: `apps/api/src/modules/events/dashboard-realtime.service.ts`

- [ ] **Step 1: Extend event type map**

Add `exam.submitted`, `dean.approval.granted`, and `discipline.case.escalated` to supported domain event types.

- [ ] **Step 2: Implement mapping service**

Map supported domain events to frontend-compatible dashboard events:
- `payment.completed` → `FEE_PAYMENT_COMPLETED`
- `exam.submitted` → `EXAM_SUBMITTED`
- `dean.approval.granted` → `DEAN_APPROVAL_GRANTED`
- `discipline.case.escalated` → `DISCIPLINE_CASE_ESCALATED`

Filter by enabled modules and required permissions.

### Task 3: Repository Stream Reader

**Files:**
- Modify: `apps/api/src/modules/events/repositories/outbox-events.repository.ts`

- [ ] **Step 1: Add tenant-scoped stream query**

Add `listDashboardStreamEvents(tenantId, options)` that reads outbox rows for one tenant, after an optional cursor, with a bounded limit.

### Task 4: Controller and Module Wiring

**Files:**
- Create: `apps/api/src/modules/events/dashboard-realtime.controller.ts`
- Modify: `apps/api/src/modules/events/events.module.ts`

- [ ] **Step 1: Add controller**

Expose:
- `GET /events/dashboard/snapshot`
- `SSE /events/dashboard/stream`

Both routes require explicit access metadata and use the realtime service.

- [ ] **Step 2: Wire provider/controller**

Register `DashboardRealtimeService` and `DashboardRealtimeController` in `EventsModule`.

### Task 5: Verification and Deployment

**Files:**
- No source edits unless verification exposes issues.

- [ ] **Step 1: Run event tests**

Run:
`node -r ts-node/register/transpile-only -r tsconfig-paths/register --test apps/api/src/modules/events/events.test.ts --test-name-pattern "dashboard realtime|DashboardRealtime"`

- [ ] **Step 2: Run full TypeScript build**

Run:
`npm.cmd run build`

- [ ] **Step 3: Deploy API**

Run:
`npm.cmd run deploy:railway:prepare:api; railway up --service my-shule-api --environment production --detach --message "Add dashboard realtime outbox stream"`

- [ ] **Step 4: Smoke check API**

Run:
`curl.exe -s -o NUL -w "%{http_code} %{url_effective}\n" https://my-shule-api-production.up.railway.app/health/ready`

Expected:
`200 https://my-shule-api-production.up.railway.app/health/ready`
