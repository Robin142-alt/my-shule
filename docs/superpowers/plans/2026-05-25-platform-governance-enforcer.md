# Platform Governance Enforcer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce the MyShule master platform architecture contract in code-level gates.

**Architecture:** Extend the shared widget contracts with `LOADING`, add action health-state support, and add an API-side platform governance evaluator for architecture/design checks. Keep enforcement pure and deterministic so it can be used by CI, auto-repair, release readiness, or future platform services.

**Tech Stack:** TypeScript, Jest design tests, Node test runner, existing capability/widget/auto-repair layers.

---

### Task 1: Widget And Button State Contract

**Files:**
- Modify: `apps/web/tests/design/global-enforcer.test.ts`
- Modify: `apps/web/tests/design/widget-registry-enforcer.test.ts`
- Modify: `apps/api/src/common/auto-repair/auto-repair-agent.test.ts`

- [x] **Step 1: Write failing tests** proving widgets include `LOADING` and buttons support `ACTIVE`, `DEGRADED`, `FAILED`, `LOCKED`.
- [x] **Step 2: Run focused tests** and confirm red failures.
- [x] **Step 3: Update web capability/widget registry and API auto-repair contracts.**
- [x] **Step 4: Re-run focused tests and confirm green.**

### Task 2: Platform Governance Evaluator

**Files:**
- Create: `apps/api/src/common/platform-governance/platform-governance.test.ts`
- Create: `apps/api/src/common/platform-governance/platform-governance.ts`

- [x] **Step 1: Write failing tests** for required layers, output checklist, and anti-drift violations.
- [x] **Step 2: Run focused tests** and confirm the evaluator is missing.
- [x] **Step 3: Implement deterministic platform governance checks.**
- [x] **Step 4: Re-run focused tests and confirm green.**

### Task 3: Verification And Deployment

**Files:**
- Test: web design tests
- Test: API platform governance and auto-repair tests
- Build: root TypeScript

- [x] **Step 1: Run focused source tests.**
- [x] **Step 2: Run lint/build gates.**
- [x] **Step 3: Deploy changed web/API surfaces as needed.**
