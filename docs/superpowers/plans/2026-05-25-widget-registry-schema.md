# Widget Registry Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Codex-grade MyShule widget registry contract that is capability-aware, event-driven, and state-machine safe.

**Architecture:** Create a focused web-layer registry library that defines widget schema types, validates registry shape, resolves widget states through the capability engine, maps event subscriptions, and gates widget actions without hiding them. Keep modules as registration/data providers and keep dashboards as registry consumers.

**Tech Stack:** TypeScript, Jest design tests, existing MyShule capability engine.

---

### Task 1: Registry Contract Tests

**Files:**
- Create: `apps/web/tests/design/widget-registry-enforcer.test.ts`

- [x] **Step 1: Write failing tests** importing the desired widget registry API.
- [x] **Step 2: Verify red failure** because the registry library does not exist yet.

### Task 2: Registry Library

**Files:**
- Create: `apps/web/src/lib/widget-registry/widget-registry.ts`

- [x] **Step 1: Implement widget schema types and state constants.**
- [x] **Step 2: Implement registry validation for unique IDs and complete state configs.**
- [x] **Step 3: Implement capability-based widget resolution that never hides widgets.**
- [x] **Step 4: Implement event subscription lookup and action gating.**

### Task 3: Verification

**Files:**
- Test: `apps/web/tests/design/widget-registry-enforcer.test.ts`
- Test: `apps/web/tests/design/global-enforcer.test.ts`
- Test: `apps/web/tests/design/dashboard-communication-enforcer.test.ts`

- [x] **Step 1: Run focused widget registry tests.**
- [x] **Step 2: Run combined architecture tests.**
- [x] **Step 3: Run lint/build before reporting completion.**
