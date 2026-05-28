# Workflow Runtime Spine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a central executable workflow runtime contract for MyShule so domains use deterministic state machines, orchestration, live queues, audit lineage, replay reconstruction, dynamic capabilities, realtime sync, and failure injection through one governed engine.

**Architecture:** Add a pure backend contract under `apps/api/src/common/platform-governance` first, then wire it into the existing root governance test gate. The first slice is intentionally framework-light and event-first: it proves the runtime behavior and gives services a stable API before adding database persistence.

**Tech Stack:** TypeScript, Node test runner, existing MyShule platform-governance module, package root test gate.

---

### Task 1: Runtime Contract Tests

**Files:**
- Create: `apps/api/src/common/platform-governance/workflow-runtime-contract.test.ts`

- [ ] **Step 1: Write failing tests**

Create tests that assert:
- Exam workflow transitions require the correct current state and capability.
- Invalid transitions emit no events and produce a blocked result.
- Orchestration plan includes sequenced steps, retry, compensation, SLA, escalation, and resume cursor.
- Live queue items are executable, assignable, traceable, recoverable, and event-backed.
- Audit timeline includes actor, tenant, capability, workflow, entity, resulting events, and replay id.
- Replay reconstruction rebuilds projections, workflow instances, widget refreshes, and queue items.
- Dynamic capability graph allows actions only when role, module, tenant state, workflow stage, ownership, deadline, and delegation match.
- Failure injection produces repair events and keeps widgets visible.

- [ ] **Step 2: Run tests and confirm RED**

Run:

```powershell
node -r ts-node/register/transpile-only -r tsconfig-paths/register --test apps/api/src/common/platform-governance/workflow-runtime-contract.test.ts
```

Expected: fail because `workflow-runtime-contract` does not exist.

### Task 2: Runtime Contract Implementation

**Files:**
- Create: `apps/api/src/common/platform-governance/workflow-runtime-contract.ts`

- [ ] **Step 1: Implement deterministic state machine primitives**

Add workflow definitions, transitions, capability requirements, rollback actions, SLA timeout, escalation policy, retry policy, and audit binding.

- [ ] **Step 2: Implement execution helpers**

Add functions for:
- `createExamWorkflowRuntime`
- `executeWorkflowTransition`
- `createOperationalOrchestrationPlan`
- `createLiveOperationalQueue`
- `createExecutionAuditTimeline`
- `reconstructTenantOperationalState`
- `resolveDynamicCapabilityGraph`
- `runFailureInjectionScenario`
- `evaluateWorkflowRuntimeReadiness`

- [ ] **Step 3: Run runtime tests and confirm GREEN**

Run the same runtime test command. Expected: all tests pass.

### Task 3: Governance Gate Wiring

**Files:**
- Modify: `apps/api/src/common/auto-repair/auto-repair-ci-policy.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Add root test coverage assertion**

Assert the root `npm test` script includes `dist/apps/api/src/common/platform-governance/workflow-runtime-contract.test.js`.

- [ ] **Step 2: Add runtime test to root test command**

Insert the compiled runtime test after `operational-execution-contract.test.js`.

- [ ] **Step 3: Run CI policy test**

Run:

```powershell
node -r ts-node/register/transpile-only -r tsconfig-paths/register --test apps/api/src/common/auto-repair/auto-repair-ci-policy.test.ts
```

Expected: pass.

### Task 4: Verification and Deployment

**Files:**
- Verify all touched files.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
node -r ts-node/register/transpile-only -r tsconfig-paths/register --test apps/api/src/common/platform-governance/workflow-runtime-contract.test.ts
```

- [ ] **Step 2: Run full API gate**

Run:

```powershell
npm.cmd test
```

Expected: 0 failures.

- [ ] **Step 3: Deploy to Railway**

Run:

```powershell
railway up --service my-shule-api --environment production --detach --json --message "activate workflow runtime spine"
```

- [ ] **Step 4: Verify production**

Check:
- `https://my-shule-api-production.up.railway.app/health/ready`
- `https://my-shule-api-production.up.railway.app/operational-workflows/principal/catalog`

Expected:
- health returns HTTP 200.
- protected operational route returns HTTP 401 without auth.
