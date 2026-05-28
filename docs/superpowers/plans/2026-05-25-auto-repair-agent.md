# Auto-Repair Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic MyShule Auto-Repair Agent that diagnoses and safely repairs architecture drift from system snapshots.

**Architecture:** Implement a pure API-layer repair engine under `apps/api/src/common/auto-repair`. It classifies registry, UI, capability, module, event, button, and dashboard drift; applies repairs in the required order; keeps widgets visible; and logs all fixes in a structured report. The engine does not introduce runtime feature behavior or dashboard UI.

**Tech Stack:** TypeScript, Node test runner, existing root TypeScript build.

---

### Task 1: Auto-Repair Contract Tests

**Files:**
- Create: `apps/api/src/common/auto-repair/auto-repair-agent.test.ts`

- [x] **Step 1: Write failing tests** for widget/capability repair, event/button repair, and dashboard static-layout repair.
- [x] **Step 2: Run the focused test** and confirm it fails because the repair engine does not exist.

### Task 2: Auto-Repair Engine

**Files:**
- Create: `apps/api/src/common/auto-repair/auto-repair-agent.ts`

- [x] **Step 1: Define snapshot, diagnosis, fix, and corrected-state types.**
- [x] **Step 2: Implement capability repair before widget/event/button/dashboard repair.**
- [x] **Step 3: Implement widget registry recovery, complete six-state mappings, and visible `LOCKED` fallback.**
- [x] **Step 4: Implement event rebinding and button fallback handlers.**
- [x] **Step 5: Implement dashboard static-layout rehydration and illegal coupling removal.**

### Task 3: Verification

**Files:**
- Test: `apps/api/src/common/auto-repair/auto-repair-agent.test.ts`
- Build: `npm.cmd run build`

- [x] **Step 1: Run focused source tests.**
- [x] **Step 2: Run root TypeScript build.**
- [x] **Step 3: Run compiled test output.**
