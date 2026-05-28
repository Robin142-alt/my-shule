import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApprovalCommandPanel } from "@/components/workflows/approval-command-panel";
import { approvalWorkflowCatalog, getVisibleApprovalWorkflows } from "@/lib/workflows/workflow-catalog";

import { renderWithProviders } from "./test-utils";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return {
    status: init?.status ?? 200,
    ok: (init?.status ?? 200) >= 200 && (init?.status ?? 200) < 300,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

function principalWorkflows(enabledModules: string[]) {
  return getVisibleApprovalWorkflows({
    role: "principal",
    enabledModuleCodes: enabledModules,
  });
}

describe("frontend operational command surfaces", () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  it("dispatches approval workflow actions through governed operational endpoints", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-operational-token" }));
      }

      if (url.includes("/api/operational-workflows/principal/actions/approve-results/dispatch")) {
        expect(init?.method).toBe("POST");
        expect(init?.headers).toEqual(
          expect.objectContaining({
            "x-myshule-csrf": "csrf-operational-token",
          }),
        );

        return Promise.resolve(
          jsonResponse({
            status: "DISPATCHED",
            actionId: "approve-results",
            eventName: "workflow.action.dispatched",
          }),
        );
      }

      return Promise.resolve(jsonResponse({}));
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["exams"])} />);

    await user.click(screen.getByRole("button", { name: /approve results/i }));

    expect(await screen.findByText(/Approve Results completed/i)).toBeVisible();
    expect(await screen.findByText(/workflow\.action\.dispatched/i)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/operational-workflows/principal/actions/approve-results/dispatch"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("keeps failed workflow buttons visible and exposes self-healing recovery state", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-operational-token" }));
      }

      if (url.includes("/api/operational-workflows/principal/actions/return-correction/dispatch")) {
        return Promise.resolve(jsonResponse({ message: "dispatcher unavailable" }, { status: 503 }));
      }

      return Promise.resolve(jsonResponse({}));
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["exams"])} />);

    await user.click(screen.getByRole("button", { name: /return for correction/i }));

    expect(await screen.findByText(/Return for Correction needs retry/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /return for correction/i })).toBeVisible();
    expect(screen.getByText(/Retry is available/i)).toBeVisible();
    expect(screen.getByText(/request remains visible/i)).toBeVisible();
  });

  it("registers the full Implementation 142 workflow catalog with governed action contracts", () => {
    expect(approvalWorkflowCatalog.map((workflow) => workflow.id)).toEqual(
      expect.arrayContaining([
        "admissions-approval",
        "transport-route-assignment",
        "lab-breakage-approval",
        "chemical-reorder",
        "stock-issue",
        "visitor-incident",
        "boarding-leaveout",
        "counselling-escalation",
        "discipline-parent-meeting",
        "library-lost-book",
        "payroll-exception",
        "timetable-publish",
        "procurement-purchase-order",
        "document-print-request",
        "sms-retry",
        "mpesa-reconciliation",
        "report-export",
        "universal-approval-escalation",
      ]),
    );

    for (const workflow of approvalWorkflowCatalog) {
      expect(workflow.actions.length).toBeGreaterThanOrEqual(2);
      for (const action of workflow.actions) {
        expect(action.actionId).toMatch(/\S/);
        expect(action.label).toMatch(/\S/);
        expect(action.capabilityRequirements.length).toBeGreaterThan(0);
        expect(action.workflowBinding).toMatch(/\S/);
        expect(action.executionHandler).toMatch(/^workflows\./);
        expect(action.emittedEvents.length).toBeGreaterThan(0);
        expect(action.auditAction).toMatch(/^audit\./);
        expect(action.fallbackHandler).toMatch(/^fallback\./);
        expect(action.retryPolicy.maxAttempts).toBeGreaterThanOrEqual(3);
        expect(["ACTIVE", "DEGRADED", "FAILED", "LOCKED"]).toContain(action.health ?? "ACTIVE");
      }
    }
  });
});
