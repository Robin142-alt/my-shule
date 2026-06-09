# Dashboard Communication System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared, typed dashboard communication layer so MyShule dashboards synchronize through events, widget state, module outputs, notifications, and the capability engine.

**Architecture:** Implement a focused web-layer communication module beside the existing capability engine. Dashboards and widgets will communicate indirectly through a typed event bus, widget state store, module output registry, and notification channel layer. Tests enforce no direct dashboard-to-dashboard coupling and prove widget failure isolation.

**Tech Stack:** Next.js, TypeScript, Jest design tests, existing MyShule capability engine.

---

### Task 1: Communication Contract Tests

**Files:**
- Create: `apps/web/tests/design/dashboard-communication-enforcer.test.ts`

- [ ] **Step 1: Write failing tests**

Create tests that import the desired communication API from `@/lib/dashboard-communication/dashboard-communication-system` and assert:
- events are emitted and delivered to matching subscribers only
- widget state updates are isolated by widget id
- module outputs are resolved through the registry
- notifications are produced through the notification channel
- capability-locked widgets ignore events and remain locked
- failed widgets enter `FAILED` without breaking other widgets
- school dashboard files do not import other dashboard command-center components

- [ ] **Step 2: Run tests to verify red**

Run:
`npm.cmd --prefix apps/web run test:design -- --runTestsByPath tests/design/dashboard-communication-enforcer.test.ts`

Expected:
FAIL because `dashboard-communication-system` does not exist.

### Task 2: Shared Communication Layer

**Files:**
- Create: `apps/web/src/lib/dashboard-communication/dashboard-communication-system.ts`

- [ ] **Step 1: Implement minimal code**

Add:
- `DashboardEventType`
- `DashboardEvent`
- `DashboardEventBus`
- `WidgetStateStore`
- `ModuleOutputRegistry`
- `NotificationChannelLayer`
- `createDashboardCommunicationSystem`
- `resolveWidgetEventDelivery`

The implementation must be synchronous and in-memory for now, with typed APIs and no React dependency.

- [ ] **Step 2: Run communication tests**

Run:
`npm.cmd --prefix apps/web run test:design -- --runTestsByPath tests/design/dashboard-communication-enforcer.test.ts`

Expected:
PASS.

### Task 3: Regression Verification

**Files:**
- Modify only if tests expose necessary integration issues.

- [ ] **Step 1: Run architecture tests**

Run:
`npm.cmd --prefix apps/web run test:design -- --runTestsByPath tests/design/dashboard-communication-enforcer.test.ts tests/design/global-enforcer.test.ts tests/design/enterprise-dashboard-architecture.test.ts`

Expected:
PASS.

- [ ] **Step 2: Run build and lint**

Run:
`npm.cmd run build`

Run:
`npm.cmd --prefix apps/web run lint -- --quiet`

Run:
`npm.cmd --prefix apps/web run build`

Expected:
All exit 0.

### Task 4: Deploy and Smoke Check

**Files:**
- No source edits.

- [ ] **Step 1: Deploy web**

Run from `apps/web`:
`npx vercel --prod --yes`

Expected:
Vercel deploys and aliases `https://myshule.online`.

- [ ] **Step 2: Smoke check production**

Run:
`curl.exe -s -o NUL -w "%{http_code} %{url_effective}\n" https://myshule.online/school/login`

Expected:
`200 https://myshule.online/school/login`

Run:
`curl.exe -I -s https://myshule.online/school/principal`

Expected:
`307 Temporary Redirect` to `/school/login` for unauthenticated access.
