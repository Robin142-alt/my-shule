# MyShule Production Readiness Mega Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make MyShule dashboards production-ready for 1000+ tenant-isolated schools by ensuring every active data-entry, communication, approval, print, export, and cross-dashboard action performs real visible/backend work or is disabled with a specific reason.

**Architecture:** Keep the current dashboard visual identity and role workspace structure. Centralize action truth through a shared dashboard action contract, backend execution receipts, tenant-scoped APIs, event/audit logging, and same-school notification/task materialization, then harden each module in priority order. Do not redesign dashboards; replace fake feedback with real workflows, real mutations, real print/export, real communications, or visible disabled reasons.

**Tech Stack:** Next.js 16, React 19, Jest/Testing Library, TypeScript, NestJS, PostgreSQL, event/outbox modules, school operational store, existing API proxy helpers, `downloadCsvFile`, `openPrintDocument`, `publishSchoolOperationalEvent`, `dispatchOperationalWorkflowAction`.

---

## Current Verified Baseline

Evidence already verified before this plan:

- Principal Attendance reference implementation exists and passes tests.
- `DashboardActionContract` safety coverage exists for Principal Attendance and fake phrase regressions.
- `OperationalActionButton` no longer reports fake success when no handler is connected.
- SMS readiness and bulk-send backend endpoints exist and focused tests pass.
- LMS assignment submission endpoint exists and focused tests pass.
- Operational workflow execution materializes same-school notifications/tasks and focused tests pass.
- Focused frontend tests passed for Principal/Deputy/Teacher/Storekeeper/Boarding/Transport/Student/Parent/Admissions/Exams/Finance priority surfaces.
- `npm run build` passed.
- `npm run web:lint` passed.

## Production Readiness Definition

An action is production-ready only when all of these are true:

- It has an explicit action contract or is covered by a shared contract factory.
- It is school/tenant scoped on every fetch, mutation, notification, export, and log.
- It opens real UI, navigates to a real route, fetches records, mutates backend/store state, queues communication, opens print preview, downloads a file, creates a task/notification, or is disabled with a reason.
- It does not use toast/status/banner/notice as the only behavior.
- Success copy comes from real result evidence: record id, event id, queued count, sent/failed/skipped counts, printed document preview, downloaded file, or refreshed data.
- Failure copy comes from the actual error or disabled reason.
- Tests prove the workflow and fake-success safety.

## File Structure Map

Create or modify these files during execution:

- `apps/web/src/lib/dashboard/dashboard-action-contract.ts`: shared contract types, validation helpers, fake phrase guards.
- `apps/web/src/lib/dashboard/dashboard-action-registry.ts`: per-role/per-module contract registry and action lookup.
- `apps/web/src/lib/dashboard/dashboard-action-executor.ts`: frontend executor that maps contracts to route/modal/workspace/API/print/export/notification actions.
- `apps/web/src/lib/dashboard/disabled-reasons.ts`: reusable disabled reason builders.
- `apps/web/src/lib/dashboard/communication-workflows.ts`: SMS/email readiness, recipient confirmation, bulk-send result mapping.
- `apps/web/src/components/dashboard/action-confirmation-modal.tsx`: shared confirmation/recipient modal.
- `apps/web/src/components/dashboard/print-preview-panel.tsx`: reusable print-preview wrapper around `openPrintDocument` where inline preview is needed.
- `apps/web/tests/design/dashboard-action-contract.test.ts`: static and behavior safety tests.
- `apps/web/tests/design/dashboard-production-readiness.test.tsx`: cross-role action contract and fake-success tests.
- `apps/web/tests/design/principal-production-readiness.test.tsx`: Principal high-priority workflows.
- `apps/web/tests/design/academic-office-production-readiness.test.tsx`: Dean/HOD/Grade/Class Teacher/Teacher/Exams Manager workflows.
- `apps/web/tests/design/front-office-finance-production-readiness.test.tsx`: Secretary/Accountant/Admissions workflows.
- `apps/web/tests/design/operations-production-readiness.test.tsx`: Nurse/Discipline/Counsellor/Library/Store/Boarding/Security/Transport/Lab workflows.
- `apps/web/tests/design/portal-production-readiness.test.tsx`: Parent/Student access and published-only data tests.
- `apps/api/src/modules/events/operational-action-receipt.*`: backend execution receipt service/controller tests if no existing receipt endpoint fits.
- `apps/api/src/modules/integrations/*`: SMS readiness/bulk-send hardening and queue scaling.
- `apps/api/src/modules/exams/*`: report generation, approval, publish, parent download, audit, tenant tests.
- `apps/api/src/modules/finance/*` and `apps/api/src/modules/payments/*`: payment receipt, fee reminders, M-Pesa reconciliation, statements.
- `apps/api/src/modules/admissions/*`: application, document verification, admit student, assign class, admission letter.
- `apps/api/src/modules/students/*`: attendance register and linked parent/student visibility.
- `apps/api/src/modules/discipline/*`: incidents, parent summons, counsellor referrals, deputy/principal escalation.
- `apps/api/src/modules/library/*`: issue/return/lost/damaged/overdue notices/fines.
- `apps/api/src/modules/inventory/*`: stock intake, issue, approval, stock take, movement history.
- `apps/api/src/modules/clinic/*`: sick visits, medicine stock, dispensing, parent notifications.
- `apps/api/src/modules/transport/*`: route assignment, trip attendance, delay SMS, fuel, maintenance.
- `apps/api/src/modules/visitors/*`: check-in/out, visitor pass, current-inside board, alerts.
- `docs/validation/myshule-production-readiness-matrix.md`: live outcome matrix updated after each phase.

---

### Task 1: Shared Dashboard Action Contract Spine

**Files:**
- Create: `apps/web/src/lib/dashboard/dashboard-action-contract.ts`
- Create: `apps/web/src/lib/dashboard/dashboard-action-registry.ts`
- Create: `apps/web/src/lib/dashboard/dashboard-action-executor.ts`
- Modify: `apps/web/tests/design/dashboard-action-contract.test.ts`

- [ ] **Step 1: Write failing contract validation tests**

Add tests to `apps/web/tests/design/dashboard-action-contract.test.ts`:

```ts
import {
  assertDashboardActionContract,
  fakeSuccessPhrases,
  type DashboardActionContract,
} from "@/lib/dashboard/dashboard-action-contract";

describe("shared dashboard action contract", () => {
  it("rejects enabled actions without proof of work", () => {
    const action = {
      id: "bad-action",
      label: "Send SMS",
      sourceRole: "principal",
      sourceDashboard: "Principal",
      sourceModule: "Attendance",
      actionType: "SEND_COMMUNICATION",
      enabled: true,
      requiredPermission: "attendance:sms",
      requiredSchoolId: "current",
      tenantIsolation: "schoolId required",
      successState: "SMS sent",
      failureState: "Failed",
      testRequirement: "must open confirmation",
    } satisfies Partial<DashboardActionContract>;

    expect(() => assertDashboardActionContract(action)).toThrow(/destination|modal|route|api|print|export|mutation|notification|disabledReason/i);
  });

  it("allows disabled actions only with a visible disabled reason", () => {
    const action: DashboardActionContract = {
      id: "sms-disabled",
      label: "Send SMS",
      sourceRole: "principal",
      sourceDashboard: "Principal",
      sourceModule: "Attendance",
      actionType: "DISABLED_WITH_REASON",
      enabled: false,
      requiredPermission: "attendance:sms",
      requiredSchoolId: "current",
      requiredData: ["sms provider"],
      tenantIsolation: "Every query includes schoolId.",
      handler: "none",
      loadingState: "Disabled",
      successState: "Disabled",
      failureState: "Disabled: SMS provider is not configured.",
      emptyState: "Disabled: SMS provider is not configured.",
      refreshQueries: [],
      affectedDashboards: [],
      auditTrail: "none",
      testRequirement: "button visible and disabled reason visible",
      disabledReason: "Disabled: SMS provider is not configured.",
    };

    expect(assertDashboardActionContract(action)).toBe(action);
  });

  it("keeps fake success phrases centralized for code-search guards", () => {
    expect(fakeSuccessPhrases).toEqual(expect.arrayContaining(["Action completed", "Workflow dispatched", "export generated"]));
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm --prefix apps/web run test:design -- dashboard-action-contract.test.ts
```

Expected: fail because `dashboard-action-contract.ts` does not exist.

- [ ] **Step 3: Implement shared contract types and validator**

Create `apps/web/src/lib/dashboard/dashboard-action-contract.ts`:

```ts
export type DashboardActionType =
  | "OPEN_WORKSPACE"
  | "OPEN_MODAL"
  | "NAVIGATE_ROUTE"
  | "FETCH_RECORDS"
  | "MUTATE_RECORD"
  | "SEND_COMMUNICATION"
  | "PRINT_PREVIEW"
  | "EXPORT_FILE"
  | "CREATE_NOTIFICATION_TASK"
  | "DISABLED_WITH_REASON";

export type DashboardActionContract = {
  id: string;
  label: string;
  sourceRole: string;
  sourceDashboard: string;
  sourceModule: string;
  actionType: DashboardActionType;
  enabled: boolean;
  requiredPermission: string;
  requiredSchoolId: string;
  requiredData: string[];
  destination?: string;
  modal?: string;
  workspace?: string;
  route?: string;
  api?: { method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; path: string };
  mutation?: string;
  notification?: string;
  printOrExport?: string;
  payload?: string;
  handler: string;
  loadingState: string;
  successState: string;
  failureState: string;
  emptyState: string;
  refreshQueries: string[];
  affectedDashboards: string[];
  inAppNotification?: string;
  smsOrEmail?: string;
  auditTrail: string;
  tenantIsolation: string;
  testRequirement: string;
  disabledReason?: string;
};

export const fakeSuccessPhrases = [
  "Opened Attendance",
  "Action completed",
  "Workflow dispatched",
  "completed successfully",
  "is being sent",
  "print started",
  "export generated",
  "Request submitted",
];

function hasProofOfWork(action: Partial<DashboardActionContract>) {
  return Boolean(
    action.destination ||
      action.modal ||
      action.workspace ||
      action.route ||
      action.api ||
      action.mutation ||
      action.notification ||
      action.printOrExport ||
      action.disabledReason,
  );
}

export function assertDashboardActionContract<T extends Partial<DashboardActionContract>>(action: T): T {
  const required: Array<keyof DashboardActionContract> = [
    "id",
    "label",
    "sourceRole",
    "sourceDashboard",
    "sourceModule",
    "actionType",
    "requiredPermission",
    "requiredSchoolId",
    "tenantIsolation",
    "handler",
    "loadingState",
    "successState",
    "failureState",
    "emptyState",
    "auditTrail",
    "testRequirement",
  ];

  for (const field of required) {
    if (!action[field]) {
      throw new Error(`Dashboard action ${action.label ?? action.id ?? "unknown"} is missing ${String(field)}.`);
    }
  }

  if (action.actionType === "DISABLED_WITH_REASON" || action.enabled === false) {
    if (!action.disabledReason?.startsWith("Disabled:")) {
      throw new Error(`${action.label} must show a visible disabled reason.`);
    }
    return action;
  }

  if (!hasProofOfWork(action)) {
    throw new Error(`${action.label} must define destination, modal, route, API, print, export, mutation, notification, or disabledReason.`);
  }

  if (!/schoolId|tenant|current school/i.test(action.tenantIsolation ?? "")) {
    throw new Error(`${action.label} must define schoolId/tenant isolation.`);
  }

  return action;
}
```

- [ ] **Step 4: Add registry and executor skeleton**

Create `apps/web/src/lib/dashboard/dashboard-action-registry.ts`:

```ts
import { assertDashboardActionContract, type DashboardActionContract } from "@/lib/dashboard/dashboard-action-contract";
import { principalAttendanceActionContracts } from "@/components/school/principal-practical-dashboard";

export const dashboardActionRegistry: DashboardActionContract[] = [
  ...principalAttendanceActionContracts.map((contract) => ({
    ...contract,
    enabled: true,
    workspace: contract.destination.includes("workspace") ? contract.destination : undefined,
    modal: contract.destination.includes("modal") ? contract.destination : undefined,
    printOrExport: contract.printOrExport === "none" ? undefined : contract.printOrExport,
  })),
].map(assertDashboardActionContract);

export function findDashboardActionContract(id: string) {
  return dashboardActionRegistry.find((contract) => contract.id === id);
}
```

Create `apps/web/src/lib/dashboard/dashboard-action-executor.ts`:

```ts
import type { DashboardActionContract } from "@/lib/dashboard/dashboard-action-contract";

export type DashboardActionExecutionEvidence = {
  status: "started" | "succeeded" | "failed" | "disabled";
  message: string;
  eventId?: string;
  recordId?: string;
  fileName?: string;
  queuedCount?: number;
  sentCount?: number;
  failedCount?: number;
  skippedCount?: number;
};

export function disabledEvidence(contract: DashboardActionContract): DashboardActionExecutionEvidence {
  return {
    status: "disabled",
    message: contract.disabledReason ?? `Disabled: ${contract.label} is not available for this school.`,
  };
}
```

- [ ] **Step 5: Run contract tests**

Run:

```bash
npm --prefix apps/web run test:design -- dashboard-action-contract.test.ts
```

Expected: pass.

---

### Task 2: Global Fake Action Safety Gate

**Files:**
- Create: `apps/web/tests/design/dashboard-production-readiness.test.tsx`
- Modify: `apps/web/tests/design/dashboard-action-contract.test.ts`
- Read: `docs/validation/myshule-dashboard-action-amendment-report-2026-06-06.md`

- [ ] **Step 1: Write code-search safety test**

Create `apps/web/tests/design/dashboard-production-readiness.test.tsx`:

```ts
import fs from "node:fs";
import path from "node:path";

const sourceRoots = [
  "src/components/school",
  "src/components/portal",
  "src/components/platform",
  "src/components/modules",
  "src/components/operational",
];

const forbiddenFakeOnlyPatterns = [
  /Action completed/i,
  /Workflow dispatched/i,
  /completed successfully/i,
  /is being sent/i,
  /print started/i,
  /export generated/i,
  /opened for .*follow-up/i,
];

function readFiles(dir: string): string[] {
  const absolute = path.join(process.cwd(), dir);
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(absolute, entry.name);
    if (entry.isDirectory()) return readFiles(path.relative(process.cwd(), target));
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    return [target];
  });
}

describe("dashboard production readiness safety", () => {
  it("does not contain fake-only success phrases in dashboard source", () => {
    const offenders: string[] = [];

    for (const root of sourceRoots) {
      for (const file of readFiles(root)) {
        const source = fs.readFileSync(file, "utf8");
        for (const pattern of forbiddenFakeOnlyPatterns) {
          if (pattern.test(source)) {
            offenders.push(`${path.relative(process.cwd(), file)} matched ${pattern}`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run safety test**

Run:

```bash
npm --prefix apps/web run test:design -- dashboard-production-readiness.test.tsx
```

Expected: fail if any fake phrase remains.

- [ ] **Step 3: Replace remaining phrase with proof-based wording**

For each offender:

- If it opens workspace: change to `<Workspace> workspace ready; <count> records loaded.`
- If it queues communication: change to `SMS queued: <sent/queued> queued, <failed> failed, <skipped> skipped.`
- If it prints: change to `Print preview ready.`
- If it exports: call `downloadCsvFile` or disable with `Disabled: export endpoint is not implemented yet.`
- If it lacks handler: disable with visible reason.

- [ ] **Step 4: Run safety test again**

Run:

```bash
npm --prefix apps/web run test:design -- dashboard-production-readiness.test.tsx
```

Expected: pass.

---

### Task 3: Communication Workflow Productionization

**Files:**
- Create: `apps/web/src/lib/dashboard/communication-workflows.ts`
- Create: `apps/web/src/components/dashboard/action-confirmation-modal.tsx`
- Modify: `apps/web/src/components/school/principal-practical-dashboard.tsx`
- Modify: `apps/web/src/components/school/role-operational-command-center.tsx`
- Modify: `apps/api/src/modules/integrations/school-sms.controller.ts`
- Modify: `apps/api/src/modules/integrations/school-sms-wallet.service.ts`
- Test: `apps/api/src/modules/integrations/integrations.test.ts`
- Test: `apps/web/tests/design/dashboard-production-readiness.test.tsx`

- [ ] **Step 1: Write frontend SMS readiness tests**

Add this test to `apps/web/tests/design/dashboard-production-readiness.test.tsx`:

```ts
import { mapSmsReadinessToDisabledReason } from "@/lib/dashboard/communication-workflows";

it("maps SMS readiness into specific disabled reasons", () => {
  expect(mapSmsReadinessToDisabledReason({ can_send: false, disabled_reason: "SMS provider is not configured.", missing: ["apiKey"] }))
    .toBe("Disabled: SMS provider is not configured.");

  expect(mapSmsReadinessToDisabledReason({ can_send: true, disabled_reason: "", missing: [] })).toBeNull();
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npm --prefix apps/web run test:design -- dashboard-production-readiness.test.tsx -t "SMS readiness"
```

Expected: fail because `communication-workflows.ts` does not exist.

- [ ] **Step 3: Implement communication helpers**

Create `apps/web/src/lib/dashboard/communication-workflows.ts`:

```ts
export type SmsReadinessResponse = {
  can_send: boolean;
  disabled_reason?: string;
  missing?: string[];
};

export type CommunicationRecipient = {
  id: string;
  name: string;
  role: "parent" | "guardian" | "staff" | "student";
  phone?: string;
  linkedStudent?: string;
};

export type BulkSmsResult = {
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  failures: Array<{ recipient_id: string; reason: string }>;
  skipped: Array<{ recipient_id: string; reason: string }>;
};

export function mapSmsReadinessToDisabledReason(readiness: SmsReadinessResponse): string | null {
  if (readiness.can_send) return null;
  return `Disabled: ${readiness.disabled_reason || "SMS provider is not configured."}`;
}

export function splitSmsRecipients(recipients: CommunicationRecipient[]) {
  return {
    sendable: recipients.filter((recipient) => Boolean(recipient.phone?.trim())),
    missingPhone: recipients.filter((recipient) => !recipient.phone?.trim()),
  };
}

export function smsResultSummary(result: BulkSmsResult) {
  return `SMS queued: ${result.sent_count} sent, ${result.failed_count} failed, ${result.skipped_count} skipped.`;
}
```

- [ ] **Step 4: Run frontend tests**

Run:

```bash
npm --prefix apps/web run test:design -- dashboard-production-readiness.test.tsx
```

Expected: pass.

- [ ] **Step 5: Backend bulk SMS load guard test**

Add to `apps/api/src/modules/integrations/integrations.test.ts`:

```ts
test("SchoolSmsWalletService bulk send skips recipients without phone numbers and reports evidence", async () => {
  const service = createTestSchoolSmsWalletService();
  const result = await service.bulkSendSms({
    schoolId: "school-a",
    actorUserId: "user-a",
    message: "Attendance notice",
    messageType: "attendance_absence",
    recipients: [
      { recipientId: "r1", phone: "0712345678", name: "Parent One" },
      { recipientId: "r2", phone: "", name: "Parent Two" },
    ],
  });

  expect(result.sent_count + result.failed_count).toBeGreaterThanOrEqual(1);
  expect(result.skipped_count).toBe(1);
  expect(result.skipped[0].reason).toMatch(/missing phone/i);
});
```

If the test helper name differs, use the existing service construction pattern already present in `integrations.test.ts`.

- [ ] **Step 6: Run backend SMS tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/integrations/integrations.test.js
```

Expected: pass.

---

### Task 4: Priority Office 1 - Principal And Deputy Daily Operations

**Files:**
- Modify: `apps/web/src/components/school/principal-practical-dashboard.tsx`
- Modify: `apps/web/src/components/school/deputy-principal-command-center.tsx`
- Modify: `apps/web/src/components/school/role-operational-command-center.tsx`
- Create: `apps/web/tests/design/principal-production-readiness.test.tsx`
- Modify: `apps/web/tests/design/deputy-principal-command-center.test.tsx`

- [ ] **Step 1: Write Principal non-attendance tests**

Create `apps/web/tests/design/principal-production-readiness.test.tsx`:

```tsx
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SchoolPages } from "@/components/school/school-pages";
import { renderWithProviders } from "./test-utils";

describe("principal production readiness", () => {
  it("opens Fees workspace actions without fake success", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SchoolPages role="principal" section="finance" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    await user.click(within(commandCenter).getByRole("button", { name: /View Collections/i }));

    expect(within(commandCenter).getByRole("heading", { name: /^Fees$/i })).toBeVisible();
    expect(within(commandCenter).queryByText(/Action completed/i)).not.toBeInTheDocument();
    expect(within(commandCenter).queryByText(/export generated/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test**

Run:

```bash
npm --prefix apps/web run test:design -- principal-production-readiness.test.tsx
```

Expected: pass if current workflow opens real workspace; otherwise fail and repair.

- [ ] **Step 3: Add Deputy confirmation/task tests**

Add to `apps/web/tests/design/deputy-principal-command-center.test.tsx`:

```tsx
it("records deputy urgent actions as same-school follow-up instead of fake completion", async () => {
  const user = userEvent.setup();
  renderWithProviders(<SchoolPages role="deputy-principal" tenantSlug="kisumu-boys" />);
  const commandCenter = await screen.findByTestId("role-operational-command-center");

  await user.click(within(commandCenter).getAllByRole("button", { name: /Emergency/i })[0]);

  expect(within(commandCenter).queryByText(/Action completed/i)).not.toBeInTheDocument();
  expect(within(commandCenter).queryByText(/Workflow dispatched/i)).not.toBeInTheDocument();
  expect(within(commandCenter).getByText(/ready|recorded|saved for deputy follow-up/i)).toBeVisible();
});
```

- [ ] **Step 4: Repair Deputy actions if needed**

In `apps/web/src/components/school/deputy-principal-command-center.tsx`, actions must either:

- open selected alert/action panel,
- call `publishSchoolOperationalEvent`,
- create visible follow-up state,
- or show disabled reason.

Use this message shape after real event publication:

```ts
setNotice(`${action} saved for ${alert.title}. Principal and responsible office can see the same-school follow-up.`);
```

- [ ] **Step 5: Run Principal and Deputy tests**

Run:

```bash
npm --prefix apps/web run test:design -- principal-production-readiness.test.tsx deputy-principal-command-center.test.tsx
```

Expected: pass.

---

### Task 5: Priority Office 2 - Exams, Report Cards, Dean, HOD, Grade Master, Class Teacher, Teacher

**Files:**
- Modify: `apps/web/src/components/modules/exams/exams-module-screen.tsx`
- Modify: `apps/web/src/components/school/exams-manager-command-center.tsx`
- Modify: `apps/web/src/components/school/dean-academics-command-center.tsx`
- Modify: `apps/web/src/components/school/hod-command-center.tsx`
- Modify: `apps/web/src/components/school/grade-master-command-center.tsx`
- Modify: `apps/web/src/components/school/class-teacher-command-center.tsx`
- Modify: `apps/web/src/components/school/teacher-command-center.tsx`
- Modify: `apps/api/src/modules/exams/exams.controller.ts`
- Modify: `apps/api/src/modules/exams/exams.service.ts`
- Test: `apps/api/src/modules/exams/exams.test.ts`
- Create: `apps/web/tests/design/academic-office-production-readiness.test.tsx`

- [ ] **Step 1: Write exams production tests**

Create `apps/web/tests/design/academic-office-production-readiness.test.tsx`:

```tsx
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SchoolPages } from "@/components/school/school-pages";
import { renderWithProviders } from "./test-utils";

describe("academic office production readiness", () => {
  it("keeps report publishing parent-portal only", async () => {
    renderWithProviders(<SchoolPages role="exams-manager" section="exams" tenantSlug="kisumu-boys" liveDataEnabled={false} />);
    await screen.findByRole("heading", { name: /exams manager desk/i });

    expect(document.body.textContent).not.toMatch(/parent\/student|student portal|student portals/i);
    expect(document.body.textContent).toMatch(/parent portal/i);
  });

  it("opens exams manager lifecycle workspaces and avoids fake completion", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SchoolPages role="exams-manager" section="exams" tenantSlug="kisumu-boys" liveDataEnabled={false} />);
    const commandCenter = await screen.findByTestId("role-operational-command-center");

    await user.click(within(commandCenter).getByRole("button", { name: /Exam Setup/i }));

    expect(within(commandCenter).queryByText(/Action completed/i)).not.toBeInTheDocument();
    expect(within(commandCenter).queryByText(/Workflow dispatched/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run academic tests**

Run:

```bash
npm --prefix apps/web run test:design -- academic-office-production-readiness.test.tsx exams-workspace.test.tsx academic-command-centers.test.tsx class-dean-command-centers.test.tsx teacher-command-center.test.tsx
```

Expected: pass or expose exact fake/copy/workflow failures.

- [ ] **Step 3: Backend report-card lifecycle tests**

Add tests to `apps/api/src/modules/exams/exams.test.ts` for:

- generating report card creates tenant-scoped artifact record,
- publish requires approval,
- parent download only returns published reports for linked child,
- student role cannot publish or manage exams.

Use existing `exams.test.ts` helper setup. Expected assertions:

```ts
expect(report.school_id).toBe("school-a");
expect(published.status).toBe("published");
await expect(service.publishReportCard({ schoolId: "school-a", actorRole: "student", reportCardId })).rejects.toThrow(/permission|role/i);
```

- [ ] **Step 4: Implement missing exam lifecycle backend behavior**

In `apps/api/src/modules/exams/exams.service.ts`, ensure:

- all queries include `schoolId`,
- all publish actions require approval status,
- publish emits audit/event,
- parent download enforces linked child/published-only,
- return-for-correction requires reason and target teacher/HOD.

- [ ] **Step 5: Run backend exams tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/exams/exams.test.js
```

Expected: pass.

---

### Task 6: Priority Office 3 - Accountant And Fees

**Files:**
- Modify: `apps/web/src/components/school/accountant-command-center.tsx`
- Modify: `apps/web/src/components/school/role-operational-command-center.tsx`
- Modify: `apps/web/src/components/dashboard/erp-pages.tsx`
- Modify: `apps/api/src/modules/finance/finance.service.ts`
- Modify: `apps/api/src/modules/finance/finance.controller.ts`
- Modify: `apps/api/src/modules/payments/payments.controller.ts`
- Test: `apps/api/src/modules/finance/finance.test.ts`
- Test: `apps/api/src/modules/payments/payments.test.ts`
- Create: `apps/web/tests/design/front-office-finance-production-readiness.test.tsx`

- [ ] **Step 1: Write finance UI tests**

Create `apps/web/tests/design/front-office-finance-production-readiness.test.tsx`:

```tsx
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SchoolPages } from "@/components/school/school-pages";
import { renderWithProviders } from "./test-utils";

describe("front office and finance production readiness", () => {
  it("accountant payment desk has real receipt and export evidence", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SchoolPages role="accountant" tenantSlug="kisumu-boys" />);
    const commandCenter = await screen.findByTestId("role-operational-command-center");

    expect(within(commandCenter).getByText(/Record payment and print receipt/i)).toBeVisible();
    await user.click(within(commandCenter).getByRole("button", { name: /Export/i }));

    expect(document.body.textContent).not.toMatch(/export generated/i);
    expect(document.body.textContent).toMatch(/download|export downloaded|CSV/i);
  });
});
```

- [ ] **Step 2: Backend finance tests**

In `apps/api/src/modules/finance/finance.test.ts`, add tests for:

- payment requires student, amount, vote head, method, reference,
- receipt number is generated and tenant scoped,
- reversal requires reason and permission,
- statement export returns a file artifact or disabled response.

- [ ] **Step 3: Implement missing finance backend behavior**

Use existing finance repository/service patterns. Every mutation emits event/audit and scopes by `schoolId`.

- [ ] **Step 4: Run finance tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/finance/finance.test.js dist/apps/api/src/modules/payments/payments.test.js
npm --prefix apps/web run test:design -- front-office-finance-production-readiness.test.tsx finance-human-workflows.test.tsx school-finance-bulk-billing.test.tsx
```

Expected: pass.

---

### Task 7: Priority Office 4 - Secretary And Admissions

**Files:**
- Modify: `apps/web/src/components/school/registrar-command-center.tsx`
- Modify: `apps/web/src/components/school/role-operational-command-center.tsx`
- Modify: `apps/api/src/modules/admissions/admissions.controller.ts`
- Modify: `apps/api/src/modules/admissions/admissions.service.ts`
- Test: `apps/api/src/modules/admissions/admissions.test.ts`
- Test: `apps/api/src/modules/admissions/admissions.repository.test.ts`
- Modify: `apps/web/tests/design/admissions-workspace.test.tsx`
- Modify: `apps/web/tests/design/front-office-finance-production-readiness.test.tsx`

- [ ] **Step 1: Add admissions readiness UI tests**

Append to `front-office-finance-production-readiness.test.tsx`:

```tsx
it("admissions officer actions create application workflow evidence", async () => {
  const user = userEvent.setup();
  renderWithProviders(<SchoolPages role="admissions" tenantSlug="kisumu-boys" />);
  const commandCenter = await screen.findByTestId("role-operational-command-center");

  await user.click(within(commandCenter).getByRole("button", { name: /Create Application|Quick admissions/i }));

  expect(document.body.textContent).not.toMatch(/Action completed|Workflow dispatched/i);
  expect(document.body.textContent).toMatch(/application|documents|admission/i);
});
```

- [ ] **Step 2: Backend admissions tests**

Add tests for:

- create application persists tenant-scoped application,
- verify documents updates checklist,
- admit student creates student record and admission number,
- assign class validates capacity,
- print admission letter returns preview/artifact evidence.

- [ ] **Step 3: Implement missing admissions behavior**

Use `admissions.service.ts` and repository methods. For cross-dashboard effects, publish same-school notification to Principal/Accountant/Class Teacher when admit succeeds.

- [ ] **Step 4: Run admissions tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/admissions/admissions.test.js dist/apps/api/src/modules/admissions/admissions.repository.test.js
npm --prefix apps/web run test:design -- admissions-workspace.test.tsx front-office-finance-production-readiness.test.tsx
```

Expected: pass.

---

### Task 8: Operational Modules - Discipline, Counselling, Nurse, Library, Store, Boarding, Security, Transport, Lab

**Files:**
- Modify: `apps/web/src/components/school/discipline-master-command-center.tsx`
- Modify: `apps/web/src/components/school/guidance-counselling-command-center.tsx`
- Modify: `apps/web/src/components/school/storekeeper-command-center.tsx`
- Modify: `apps/web/src/components/school/boarding-master-command-center.tsx`
- Modify: `apps/web/src/components/school/security-command-center.tsx`
- Modify: `apps/web/src/components/school/transport-manager-command-center.tsx`
- Modify: `apps/web/src/components/school/laboratory-technician-command-center.tsx`
- Modify: `apps/web/src/components/school/role-operational-command-center.tsx`
- Modify: `apps/api/src/modules/discipline/*`
- Modify: `apps/api/src/modules/library/*`
- Modify: `apps/api/src/modules/inventory/*`
- Modify: `apps/api/src/modules/clinic/*`
- Modify: `apps/api/src/modules/transport/*`
- Modify: `apps/api/src/modules/visitors/*`
- Test: `apps/web/tests/design/operations-production-readiness.test.tsx`

- [ ] **Step 1: Create operations UI smoke tests**

Create `apps/web/tests/design/operations-production-readiness.test.tsx`:

```tsx
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SchoolPages } from "@/components/school/school-pages";
import { renderWithProviders } from "./test-utils";

const roles = [
  "discipline-master",
  "guidance-counselling",
  "nurse",
  "librarian",
  "storekeeper",
  "boarding-master",
  "security-officer",
  "transport-manager",
  "laboratory-technician",
] as const;

describe("operations production readiness", () => {
  it.each(roles)("keeps %s actions visible without fake success", async (role) => {
    const user = userEvent.setup();
    renderWithProviders(<SchoolPages role={role} tenantSlug="kisumu-boys" />);
    const commandCenter = await screen.findByTestId("role-operational-command-center");
    const firstReady = within(commandCenter).getAllByRole("button", { name: /ready|print|view|review|save/i })[0];

    await user.click(firstReady);

    expect(document.body.textContent).not.toMatch(/Action completed|Workflow dispatched|completed successfully|print started|export generated/i);
  });
});
```

- [ ] **Step 2: Run operations UI tests**

Run:

```bash
npm --prefix apps/web run test:design -- operations-production-readiness.test.tsx
```

Expected: fail for roles still using fake-only feedback; repair role by role.

- [ ] **Step 3: Backend module tests**

For each module, add or extend tests:

- Discipline: incident create, summon parent, refer counsellor, escalate deputy/principal, print letter.
- Counselling: referral task, session note permission, guardian communication.
- Clinic: sick visit, dispense medicine with stock/expiry validation, parent notification.
- Library: issue, return, mark lost/damaged, overdue notices, fines.
- Inventory: add stock, issue stock, approve issue, stock take, movement history.
- Boarding: roll call, exeat, sick referral, parent notification.
- Visitors/Security: check-in, pass preview, check-out, alert deputy.
- Transport: route assignment, trip attendance, delay SMS, fuel log, maintenance task, route print.
- Labs: practical request, apparatus issue, breakage, hazard escalation.

- [ ] **Step 4: Implement module mutations and notifications**

Every mutation must:

```ts
// Required behavior shape in service/controller tests:
expect(result.schoolId).toBe(input.schoolId);
expect(result.auditEvent).toMatch(/[A-Z_]+|[a-z.]+/);
expect(result.notificationTargets).toEqual(expect.arrayContaining([expect.stringMatching(/principal|deputy|parent|storekeeper|nurse|teacher/i)]));
```

- [ ] **Step 5: Run module tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/discipline/discipline.test.js dist/apps/api/src/modules/library/library.test.js dist/apps/api/src/modules/inventory/inventory.test.js dist/apps/api/src/modules/clinic/clinic.test.js dist/apps/api/src/modules/transport/transport.test.js dist/apps/api/src/modules/visitors/visitors.test.js
npm --prefix apps/web run test:design -- operations-production-readiness.test.tsx
```

Expected: pass.

---

### Task 9: Parent And Student Portal Lockdown

**Files:**
- Modify: `apps/web/src/components/portal/portal-pages.tsx`
- Modify: `apps/web/src/components/portal/parent-command-center.tsx`
- Modify: `apps/web/src/lib/auth/role-routing.ts`
- Modify: `apps/api/src/modules/students/students.service.ts`
- Modify: `apps/api/src/modules/lms/lms.service.ts`
- Test: `apps/web/tests/design/portal-production-readiness.test.tsx`
- Test: `apps/api/src/modules/students/students.test.ts`
- Test: `apps/api/src/modules/lms/lms.test.ts`

- [ ] **Step 1: Write parent/student access tests**

Create `apps/web/tests/design/portal-production-readiness.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { PortalPages } from "@/components/portal/portal-pages";
import { ParentCommandCenter } from "@/components/portal/parent-command-center";
import { renderWithProviders } from "./test-utils";

describe("portal production readiness", () => {
  it("parent sees published report content only and no staff exam workflow", async () => {
    renderWithProviders(<PortalPages viewer="parent" section="academics" />);

    expect(await screen.findByText(/published/i)).toBeVisible();
    expect(document.body.textContent).not.toMatch(/moderation|approve publishing|marks entry|return for correction/i);
  });

  it("student portal does not expose report publishing or staff workflows", async () => {
    renderWithProviders(<PortalPages viewer="student" section="academics" />);

    expect(document.body.textContent).not.toMatch(/publish results|approve publishing|parent acknowledgement|moderation/i);
  });
});
```

- [ ] **Step 2: Run portal tests**

Run:

```bash
npm --prefix apps/web run test:design -- portal-production-readiness.test.tsx academic-parent-portal-upgrade.test.tsx student-support-command-centers.test.tsx
```

Expected: pass or expose access/copy leaks.

- [ ] **Step 3: Backend linked-child tests**

Extend students/LMS tests so parent/student queries are scoped:

```ts
await expect(service.getParentChildRecord({ schoolId: "school-a", parentUserId: "parent-a", studentId: "other-school-student" }))
  .rejects.toThrow(/not found|not linked|permission/i);
```

- [ ] **Step 4: Run portal backend tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/students/students.test.js dist/apps/api/src/modules/lms/lms.test.js
```

Expected: pass.

---

### Task 10: Super Admin And System Monitor Production Readiness

**Files:**
- Modify: `apps/web/src/components/platform/superadmin-pages.tsx`
- Modify: `apps/web/src/components/layouts/superadmin-shell.tsx`
- Modify: `apps/api/src/modules/platform/platform-onboarding.controller.ts`
- Modify: `apps/api/src/modules/platform/platform-onboarding.service.ts`
- Modify: `apps/api/src/modules/events/dashboard-realtime.controller.ts`
- Modify: `apps/api/src/modules/observability/observability.controller.ts`
- Test: `apps/web/tests/design/portal-platform-command-centers.test.tsx`
- Test: `apps/api/src/modules/platform/platform-onboarding.service.test.ts`
- Test: `apps/api/src/modules/observability/observability.test.ts`

- [ ] **Step 1: Add Super Admin action tests**

Add to `portal-platform-command-centers.test.tsx`:

```tsx
it("super admin configuration actions use route/API evidence or disabled reasons", async () => {
  renderWithProviders(<SuperAdminPages section="sms" />);

  expect(document.body.textContent).not.toMatch(/opened for platform follow-up|Action completed|Workflow dispatched/i);
  expect(document.body.textContent).toMatch(/SMS provider|saved securely|Disabled:/i);
});
```

- [ ] **Step 2: Backend platform tests**

Add tests for:

- invite school sends real invite or returns disabled/config reason,
- configure SMS/email masks secrets,
- suspend/reactivate school requires platform permission and confirmation,
- tenant logs are scoped.

- [ ] **Step 3: System Monitor tests**

Add tests for:

- retry failed job calls retry endpoint or disabled reason,
- failed SMS list loads tenant-scoped failures,
- M-Pesa callback details load scoped callback,
- queue health loads real metrics,
- export logs downloads file.

- [ ] **Step 4: Run platform/monitor tests**

Run:

```bash
npm run build
node --test dist/apps/api/src/modules/platform/platform-onboarding.service.test.js dist/apps/api/src/modules/observability/observability.test.js dist/apps/api/src/modules/events/events.test.js
npm --prefix apps/web run test:design -- portal-platform-command-centers.test.tsx
```

Expected: pass.

---

### Task 11: Tenant Isolation And Permission Gate

**Files:**
- Modify: `apps/api/test/tenant-isolation.integration-spec.ts`
- Modify: `apps/api/src/middleware/tenant.middleware.ts`
- Modify: `apps/api/src/auth/role-governance-policy.ts`
- Modify: `apps/web/tests/design/role-dashboard-structure.test.tsx`
- Modify: `apps/web/tests/design/dashboard-production-readiness.test.tsx`

- [ ] **Step 1: Add cross-school action regression tests**

Add tests that attempt to:

- parent from school A reading child from school B,
- accountant from school A reading fee record from school B,
- teacher from school A submitting school B attendance,
- student accessing staff-only exam management route.

Expected result:

```ts
expect(response.status).toBeOneOf([403, 404]);
```

If Jest lacks `toBeOneOf`, use:

```ts
expect([403, 404]).toContain(response.status);
```

- [ ] **Step 2: Run tenant isolation integration**

Run:

```bash
npm run test:tenant-isolation
```

Expected: pass.

- [ ] **Step 3: Repair any unscoped query**

For every failure, add `schoolId` or tenant predicate at repository/service level. Do not repair by hiding UI only.

- [ ] **Step 4: Rerun tenant isolation**

Run:

```bash
npm run test:tenant-isolation
```

Expected: pass.

---

### Task 12: Module Readiness Truth Levels

**Files:**
- Modify: `apps/web/src/lib/features/module-readiness.ts`
- Modify: `apps/web/tests/design/module-readiness.test.ts`
- Modify: `apps/web/src/lib/module-access/module-access-map.ts`
- Modify: `docs/validation/myshule-production-readiness-matrix.md`

- [ ] **Step 1: Write readiness level tests**

Add to `module-readiness.test.ts`:

```ts
it("separates visible UI from live API and production readiness", () => {
  const readiness = getModuleReadiness("attendance");

  expect(readiness).toEqual(expect.objectContaining({
    visibleInDemo: expect.any(Boolean),
    uiComplete: expect.any(Boolean),
    liveApiConnected: expect.any(Boolean),
    tenantSafe: expect.any(Boolean),
    productionReady: expect.any(Boolean),
  }));

  if (readiness.productionReady) {
    expect(readiness.uiComplete).toBe(true);
    expect(readiness.liveApiConnected).toBe(true);
    expect(readiness.tenantSafe).toBe(true);
  }
});
```

- [ ] **Step 2: Implement readiness levels**

In `module-readiness.ts`, expose:

```ts
export type ModuleReadiness = {
  moduleCode: string;
  visibleInDemo: boolean;
  uiComplete: boolean;
  liveApiConnected: boolean;
  tenantSafe: boolean;
  productionReady: boolean;
  missing: string[];
};
```

- [ ] **Step 3: Run readiness tests**

Run:

```bash
npm --prefix apps/web run test:design -- module-readiness.test.ts
```

Expected: pass.

---

### Task 13: Production Readiness Matrix And Acceptance Report

**Files:**
- Create/Modify: `docs/validation/myshule-production-readiness-matrix.md`
- Modify: `docs/validation/myshule-dashboard-action-amendment-report-2026-06-06.md`

- [ ] **Step 1: Create live matrix**

Create `docs/validation/myshule-production-readiness-matrix.md` with this table:

```md
# MyShule Production Readiness Matrix

| Dashboard | Module | Button | Current Behaviour | Classification | Required Fix | Backend/API Needed | Final Status | Test Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Principal | Attendance | View Attendance | Opens workspace with records | REAL_WORKFLOW | None | Existing store/API | VERIFIED | role-dashboard-structure.test.tsx |
| Principal | Attendance | Send Absence SMS | Opens confirmation, validates provider | REAL_WORKFLOW if SMS configured; DISABLED_REQUIRED if not | Wire live readiness/bulk endpoint everywhere | GET /sms/readiness, POST /sms/bulk-send | VERIFIED REFERENCE | dashboard-action-contract.test.ts |
| Principal | Attendance | Print Attendance Report | Opens print preview | REAL_WORKFLOW | None | openPrintDocument | VERIFIED | role-dashboard-structure.test.tsx |
```

- [ ] **Step 2: Update after each task**

After Tasks 4-12, append rows for each verified action. Use only these statuses:

- `VERIFIED_REAL_WORKFLOW`
- `VERIFIED_DISABLED_WITH_REASON`
- `PARTIAL_REQUIRES_BACKEND`
- `UNSAFE_BLOCKED`
- `NOT_AUDITED`

- [ ] **Step 3: Final acceptance test run**

Run:

```bash
npm run build
npm run web:lint
npm --prefix apps/web run test:design
node --test dist/apps/api/src/modules/events/consumers/operational-workflow-execution.consumer.test.js dist/apps/api/src/modules/integrations/integrations.test.js dist/apps/api/src/modules/lms/lms.test.js dist/apps/api/src/modules/exams/exams.test.js dist/apps/api/src/modules/finance/finance.test.js dist/apps/api/src/modules/admissions/admissions.test.js dist/apps/api/src/modules/discipline/discipline.test.js dist/apps/api/src/modules/library/library.test.js dist/apps/api/src/modules/inventory/inventory.test.js dist/apps/api/src/modules/transport/transport.test.js dist/apps/api/src/modules/visitors/visitors.test.js
```

Expected: all commands exit 0.

- [ ] **Step 4: Final report**

The final report must include:

- fake handlers found,
- shared action system created/fixed,
- dashboards audited,
- button outcome matrix summary,
- buttons fixed,
- buttons disabled and exact reasons,
- APIs connected,
- APIs created,
- cross-dashboard notifications/tasks added,
- print previews added,
- export actions fixed or disabled,
- SMS/email workflows fixed or disabled,
- tests added,
- tests run,
- lint result,
- remaining risks,
- backend/config still needed.

Do not say the entire system is production-ready unless every role/module row in `myshule-production-readiness-matrix.md` is either `VERIFIED_REAL_WORKFLOW` or `VERIFIED_DISABLED_WITH_REASON`.

---

## Execution Order For Speed

Run these as parallelizable batches where possible:

1. Action Contract Spine: Tasks 1-2.
2. Communication Backend/Frontend: Task 3.
3. Priority Offices: Tasks 4-7.
4. Operational Modules: Task 8.
5. Parent/Student/SuperAdmin/System Monitor: Tasks 9-10.
6. Tenant Isolation/Readiness Truth: Tasks 11-12.
7. Final Matrix/Acceptance: Task 13.

## Stop Conditions

Stop and report immediately if:

- tenant isolation fails and the root cause is unclear,
- an action requires backend data that has no schema/table/API and cannot be safely created in the task,
- a role exposes another school's data,
- parent/student can access staff workflows,
- SMS/payment/exam publication can mutate without permission or confirmation,
- any final test command fails after two focused repair attempts.

## Commit Strategy

Make commits after each task when executing:

```bash
git add <task files>
git commit -m "feat: harden <module> production actions"
```

Use smaller commits for backend schema/API changes and frontend dashboard changes when a task spans both.

