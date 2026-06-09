# Frontend Operational Command Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the shared approval panel into an executable workflow command surface backed by the live operational workflow dispatcher.

**Architecture:** Add a thin frontend operational workflow client, expose the backend operational workflow route through the guarded Next proxy, enrich workflow catalog entries with action contracts, and render all approval queue actions with visible health states. This keeps dashboards static while making queue items executable, auditable, retryable, and failure-visible.

**Tech Stack:** Next.js App Router, React 19, Jest, Testing Library, existing MyShule school API proxy, existing CSRF client.

---

### Task 1: Add Frontend Operationalization Tests

**Files:**
- Create: `apps/web/tests/design/frontend-operationalization.test.tsx`
- Modify: `apps/web/tests/design/production-module-proxies.test.ts`

- [ ] **Step 1: Write a failing test that approval workflow actions dispatch through the operational workflow proxy**

```tsx
it("dispatches approval workflow actions through governed operational endpoints", async () => {
  const user = userEvent.setup();
  global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url === "/api/auth/csrf") {
      return Promise.resolve(jsonResponse({ token: "csrf-operational-token" }));
    }

    if (url.includes("/api/operational-workflows/principal/actions/approve-results/dispatch")) {
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual(expect.objectContaining({
        "x-myshule-csrf": "csrf-operational-token",
      }));
      return Promise.resolve(jsonResponse({
        status: "DISPATCHED",
        actionId: "approve-results",
        eventName: "workflow.action.dispatched",
      }));
    }

    return Promise.resolve(jsonResponse({}));
  }) as unknown as typeof fetch;

  renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["exams"])} />);
  await user.click(screen.getByRole("button", { name: /approve results/i }));

  expect(await screen.findByText(/approve-results dispatched/i)).toBeVisible();
});
```

- [ ] **Step 2: Run the focused test and verify it fails because actions are not rendered or dispatched**

Run: `cd apps/web; npm.cmd run test:design -- --runTestsByPath tests/design/frontend-operationalization.test.tsx`

Expected: FAIL because executable operational buttons do not exist yet.

### Task 2: Add the Operational Workflow Client and Proxy

**Files:**
- Create: `apps/web/src/lib/workflows/operational-workflow-client.ts`
- Create: `apps/web/src/app/api/operational-workflows/[...path]/route.ts`
- Modify: `apps/web/tests/design/production-module-proxies.test.ts`

- [ ] **Step 1: Implement `dispatchOperationalWorkflowAction`**

The client gets a CSRF token, POSTs to `/api/operational-workflows/principal/actions/:actionId/dispatch`, includes command and aggregate IDs, unwraps JSON, and throws a readable error on failure.

- [ ] **Step 2: Add a guarded Next proxy route**

The proxy route supports `GET` and `POST` through `proxySchoolApiRequest(request, context, "/operational-workflows")`.

- [ ] **Step 3: Run proxy tests**

Run: `cd apps/web; npm.cmd run test:design -- --runTestsByPath tests/design/production-module-proxies.test.ts`

Expected: PASS after the proxy exists.

### Task 3: Make Approval Queues Executable

**Files:**
- Modify: `apps/web/src/lib/workflows/workflow-catalog.ts`
- Modify: `apps/web/src/components/workflows/approval-command-panel.tsx`
- Test: `apps/web/tests/design/frontend-operationalization.test.tsx`

- [ ] **Step 1: Add `actions` to each `ApprovalWorkflow` entry**

Each action includes `actionId`, label, workflow binding, capability requirement, retry policy, fallback handler, emitted events, and audit action.

- [ ] **Step 2: Render action buttons inside each approval workflow item**

Every queue item shows buttons. Buttons keep visible states: `ACTIVE`, `DEGRADED`, `FAILED`, `LOCKED`.

- [ ] **Step 3: Dispatch actions and preserve failure visibility**

Clicking an active/degraded action calls the operational client. A successful dispatch shows event-backed confirmation. A failed dispatch keeps the button visible, marks it `FAILED`, and shows a retry/self-healing message.

- [ ] **Step 4: Run focused tests**

Run: `cd apps/web; npm.cmd run test:design -- --runTestsByPath tests/design/frontend-operationalization.test.tsx`

Expected: PASS.

### Task 4: Verify Existing Principal Dashboard Behavior

**Files:**
- Test: `apps/web/tests/design/principal-command-center.test.tsx`
- Test: `apps/web/tests/design/experience-actions.test.tsx`

- [ ] **Step 1: Run targeted regression tests**

Run: `cd apps/web; npm.cmd run test:design -- --runTestsByPath tests/design/principal-command-center.test.tsx tests/design/experience-actions.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run full web design suite**

Run: `cd apps/web; npm.cmd run test:design`

Expected: PASS.

### Task 5: Deploy

**Files:**
- No code changes.

- [ ] **Step 1: Run root or web verification**

Run: `npm.cmd test` from the repo root and `cd apps/web; npm.cmd run test:design`.

- [ ] **Step 2: Deploy to Railway if API/proxy artifacts need server deployment**

Run: `railway up --service my-shule-api --environment production --detach --json --message "activate frontend operational workflow command surface"`

- [ ] **Step 3: Verify production readiness**

Run: `Invoke-WebRequest https://my-shule-api-production.up.railway.app/health/ready -UseBasicParsing`.

Expected: HTTP 200.

