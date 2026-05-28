# Codex Master System Enforcer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Codify the updated MyShule architecture constitution in the shared capability and dashboard communication contracts.

**Architecture:** Keep enforcement centralized in the existing web capability engine and dashboard communication layer. Update widget lifecycle states to `ACTIVE`, `EMPTY`, `LOCKED`, `DEGRADED`, `FAILED`, and `LOADING`; preserve static dashboard rendering; keep billing enforcement manual and capability-mediated.

**Tech Stack:** TypeScript, Jest design tests, existing MyShule web capability engine, existing dashboard communication layer.

---

### Task 1: Lock The Updated Widget State Contract

**Files:**
- Modify: `apps/web/tests/design/global-enforcer.test.ts`
- Modify: `apps/web/src/lib/capability-engine/school-capability-engine.ts`

- [x] **Step 1: Write failing tests** for the six-state widget lifecycle and manual billing control.
- [x] **Step 2: Run focused tests** and confirm failure before implementation.
- [x] **Step 3: Extend the central capability engine** with `DEGRADED`, `FAILED`, and manual billing control input.
- [x] **Step 4: Re-run focused tests** and confirm they pass.

### Task 2: Replace Runtime Error State With Failed Widget State

**Files:**
- Modify: `apps/web/tests/design/dashboard-communication-enforcer.test.ts`
- Modify: `apps/web/src/lib/dashboard-communication/dashboard-communication-system.ts`

- [x] **Step 1: Write failing communication tests** proving widget failures remain visible as `FAILED`.
- [x] **Step 2: Run focused tests** and confirm failure before implementation.
- [x] **Step 3: Update dashboard communication failure isolation** to emit `FAILED`.
- [x] **Step 4: Re-run focused tests** and confirm they pass.

### Task 3: Verify Architecture Gates

**Files:**
- Test: `apps/web/tests/design/global-enforcer.test.ts`
- Test: `apps/web/tests/design/dashboard-communication-enforcer.test.ts`
- Test: TypeScript build via `npm.cmd run build`

- [x] **Step 1: Run combined design tests** for global enforcer and dashboard communication.
- [x] **Step 2: Run root TypeScript build** to verify shared contracts compile.
- [x] **Step 3: Report verification evidence** before claiming completion.
