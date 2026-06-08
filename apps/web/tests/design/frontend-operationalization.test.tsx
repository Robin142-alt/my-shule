import { screen, waitFor } from "@testing-library/react";
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

  it("opens a selectable exam report queue and reports partial approval success truthfully", async () => {
    const user = userEvent.setup();
    let reportLoadCount = 0;
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-approval-token" }));
      }

      if (url === "/api/exams/report-cards") {
        reportLoadCount += 1;
        return Promise.resolve(jsonResponse({
          data: [
            {
              id: "report-a",
              exam_series_id: "series-1",
              student_id: "student-a",
              report_snapshot_id: "snapshot-a",
              status: reportLoadCount > 1 ? "published" : "ready_for_review",
              metadata: { report_card: { learner_name: "Achieng Otieno", class_name: "Grade 8" } },
            },
            {
              id: "report-b",
              exam_series_id: "series-1",
              student_id: "student-b",
              report_snapshot_id: "snapshot-b",
              status: "ready_for_review",
              metadata: { report_card: { learner_name: "Brian Odhiambo", class_name: "Grade 8" } },
            },
          ],
          meta: {},
        }));
      }

      if (url === "/api/exams/report-cards/publish") {
        const body = JSON.parse(String(init?.body ?? "{}")) as { student_id?: string };

        if (body.student_id === "student-b") {
          return Promise.resolve(jsonResponse({ message: "Report was already returned for correction." }, { status: 409 }));
        }

        return Promise.resolve(jsonResponse({ data: { status: "published" }, meta: {} }));
      }

      return Promise.resolve(jsonResponse({}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["exams"])} />);

    await user.click(screen.getByRole("button", { name: /approve results/i }));

    expect(await screen.findByRole("dialog", { name: /approve results/i })).toBeVisible();
    expect(screen.getByText(/select the report cards to approve/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /approve selected/i })).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: /select achieng otieno/i }));
    await user.click(screen.getByRole("checkbox", { name: /select brian odhiambo/i }));

    await user.click(screen.getByRole("button", { name: /approve selected/i }));

    expect(await screen.findByText(/2 selected/i)).toBeVisible();
    expect((await screen.findAllByText(/1 succeeded, 1 failed/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Brian Odhiambo/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Report was already returned for correction/i)).toBeVisible();
    expect(screen.queryByText(/approve results completed/i)).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/exams/report-cards", expect.objectContaining({ method: "GET" })));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/exams/report-cards/publish",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-approval-token" }),
      }),
    );
    expect(reportLoadCount).toBeGreaterThanOrEqual(2);
  });

  it("maps procurement approval to selectable procurement requests and the existing approval endpoint", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-procurement-token" }));
      }

      if (url === "/api/procurement/dashboard") {
        return Promise.resolve(jsonResponse({
          data: {
            requests: [
              {
                id: "request-1",
                title: "Laboratory reagents",
                department: "Science",
                status: "submitted",
                estimated_total_minor: 1250000,
              },
            ],
          },
          meta: {},
        }));
      }

      if (url === "/api/procurement/requests/request-1/approval") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({ decision: "approved" }),
        );
        return Promise.resolve(jsonResponse({ data: { status: "approved" }, meta: {} }));
      }

      return Promise.resolve(jsonResponse({}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["procurement"])} />);

    await user.click(screen.getByRole("button", { name: /^Approve$/i }));

    expect(await screen.findByRole("dialog", { name: /^Approve$/i })).toBeVisible();
    expect(screen.getByText(/select procurement requests/i)).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: /select laboratory reagents/i }));
    await user.click(screen.getByRole("button", { name: /approve selected/i }));

    expect((await screen.findAllByText(/1 succeeded, 0 failed/i)).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/procurement/requests/request-1/approval",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-procurement-token" }),
      }),
    );
  });

  it("generates a purchase order only from a selected procurement request with supplier and item lines", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-po-token" }));
      }

      if (url === "/api/procurement/dashboard") {
        return Promise.resolve(jsonResponse({
          data: {
            requests: [
              {
                id: "request-po-1",
                title: "Dormitory mattresses",
                department: "Boarding",
                status: "approved",
                supplier_id: "supplier-1",
                supplier_name: "Kisumu Bedding Ltd",
                budget_code: "BOARD-2026",
                items: [{ item_name: "Mattress", quantity: 12, estimated_unit_cost_minor: 450000 }],
              },
            ],
          },
          meta: {},
        }));
      }

      if (url === "/api/procurement/purchase-orders") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            supplier_id: "supplier-1",
            request_id: "request-po-1",
            items: [{ item_name: "Mattress", quantity: 12, unit_cost_minor: 450000 }],
          }),
        );
        return Promise.resolve(jsonResponse({
          data: { po_number: "LPO-2026-011", supplier_name: "Kisumu Bedding Ltd", status: "issued", total_amount_minor: 5400000 },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["procurement"])} />);

    await user.click(screen.getByRole("button", { name: /generate po/i }));
    expect(await screen.findByRole("dialog", { name: /generate po/i })).toBeVisible();
    expect(screen.getByText(/select approved procurement requests/i)).toBeVisible();
    expect(screen.getByText(/Kisumu Bedding Ltd/i)).toBeVisible();

    await user.click(screen.getByRole("checkbox", { name: /select dormitory mattresses/i }));
    await user.click(screen.getByRole("button", { name: /generate selected/i }));

    expect(await screen.findByText(/LPO-2026-011/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/procurement/purchase-orders",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-po-token" }),
      }),
    );
  });

  it("blocks purchase order generation when selected requests are missing supplier or item lines", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/procurement/dashboard") {
        return Promise.resolve(jsonResponse({
          data: {
            requests: [
              {
                id: "request-po-missing",
                title: "Office stationery",
                department: "Administration",
                status: "approved",
                items: [],
              },
            ],
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ token: "csrf-unused" }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["procurement"])} />);

    await user.click(screen.getByRole("button", { name: /generate po/i }));
    await user.click(await screen.findByRole("checkbox", { name: /select office stationery/i }));
    await user.click(screen.getByRole("button", { name: /generate selected/i }));

    expect(await screen.findByText(/missing supplier/i)).toBeVisible();
    expect(screen.getByText(/missing item lines/i)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/procurement/purchase-orders", expect.anything());
  });

  it("queues only selected procurement requests for reviewer assignment", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-assign-reviewer-token" }));
      }

      if (url === "/api/procurement/dashboard") {
        return Promise.resolve(jsonResponse({
          data: {
            requests: [
              {
                id: "request-review-1",
                title: "Kitchen freezer service",
                department: "Kitchen",
                status: "submitted",
                estimated_total_minor: 850000,
              },
              {
                id: "request-review-2",
                title: "Sports kit restock",
                department: "Games",
                status: "submitted",
                estimated_total_minor: 430000,
              },
            ],
          },
          meta: {},
        }));
      }

      if (url === "/api/operational-workflows/principal/actions/assign-reviewer/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "request-review-1",
            payload: expect.objectContaining({
              actionLabel: "Assign Reviewer",
              selectedRecordIds: ["request-review-1"],
              selectedRecordTitle: "Kitchen freezer service",
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "assign-reviewer",
            workflowBinding: "procurement-approval",
            eventName: "PROCUREMENT_REVIEWER_ASSIGNED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["procurement"])} />);

    await user.click(screen.getByRole("button", { name: /assign reviewer/i }));

    expect(await screen.findByRole("dialog", { name: /assign reviewer/i })).toBeVisible();
    expect(screen.getByText(/select procurement requests that need a reviewer/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /assign selected/i })).toBeDisabled();

    await user.click(await screen.findByRole("checkbox", { name: /select kitchen freezer service/i }));
    await user.click(screen.getByRole("button", { name: /assign selected/i }));

    expect(await screen.findByText(/Reviewer assignment queued/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/operational-workflows/principal/actions/assign-reviewer/dispatch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-assign-reviewer-token" }),
      }),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/operational-workflows/principal/actions/assign-reviewer/dispatch",
      expect.objectContaining({ body: expect.stringContaining("request-review-2") }),
    );
  });

  it("queues supplier revision requests from selected LPO-ready procurement records", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-supplier-revision-token" }));
      }

      if (url === "/api/procurement/dashboard") {
        return Promise.resolve(jsonResponse({
          data: {
            requests: [
              {
                id: "request-supplier-revision-1",
                title: "Science lab stools",
                department: "Science",
                status: "approved",
                supplier_id: "supplier-2",
                supplier_name: "Lake Fixtures Ltd",
                budget_code: "SCI-2026",
                items: [{ item_name: "Lab stool", quantity: 40, estimated_unit_cost_minor: 125000 }],
              },
            ],
          },
          meta: {},
        }));
      }

      if (url === "/api/operational-workflows/principal/actions/request-supplier-revision/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "request-supplier-revision-1",
            payload: expect.objectContaining({
              actionLabel: "Request Supplier Revision",
              selectedRecordIds: ["request-supplier-revision-1"],
              supplierName: "Lake Fixtures Ltd",
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "request-supplier-revision",
            workflowBinding: "procurement-purchase-order",
            eventName: "SUPPLIER_REVISION_REQUESTED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["procurement"])} />);

    await user.click(screen.getByRole("button", { name: /request supplier revision/i }));

    expect(await screen.findByRole("dialog", { name: /request supplier revision/i })).toBeVisible();
    expect(screen.getByText(/select approved procurement requests that need supplier revision/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select science lab stools/i }));
    await user.click(screen.getByRole("button", { name: /request selected/i }));

    expect((await screen.findAllByText(/Supplier revision queued/i)).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/operational-workflows/principal/actions/request-supplier-revision/dispatch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-supplier-revision-token" }),
      }),
    );
  });

  it("reconciles selected M-Pesa transactions only after manual student or invoice input", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-mpesa-token" }));
      }

      if (url === "/api/payments/mpesa/c2b/payments?status=pending_review") {
        return Promise.resolve(jsonResponse({
          data: [
            {
              id: "mpesa-1",
              trans_id: "RQ92KBY",
              amount_minor: "125000",
              phone_number: "254722123456",
              payer_name: "Jane Akinyi",
              status: "pending_review",
              bill_ref_number: "ADM-001",
              invoice_number: null,
              matched_student_id: null,
              matched_invoice_id: null,
              received_at: "2026-06-01T08:15:00Z",
            },
          ],
          meta: {},
        }));
      }

      if (url === "/api/payments/mpesa/c2b/payments/mpesa-1/reconcile") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({ student_id: "student-001" }),
        );
        return Promise.resolve(jsonResponse({
          data: { id: "mpesa-1", trans_id: "RQ92KBY", status: "reconciled", amount_minor: "125000" },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["finance"])} />);

    await user.click(screen.getByRole("button", { name: /reconcile m-pesa/i }));
    await user.click(await screen.findByRole("checkbox", { name: /select rq92kby/i }));
    await user.click(screen.getByRole("button", { name: /reconcile selected/i }));

    expect(await screen.findByText(/enter a student id or invoice id/i)).toBeVisible();
    await user.type(screen.getByLabelText(/student id/i), "student-001");
    await user.click(screen.getByRole("button", { name: /reconcile selected/i }));

    expect(await screen.findByText(/RQ92KBY reconciled/i)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/mpesa/c2b/payments/mpesa-1/reconcile",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-mpesa-token" }),
      }),
    );
  });

  it("queues selected M-Pesa transactions for exception handling without marking them reconciled", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-mpesa-exception-token" }));
      }

      if (url === "/api/payments/mpesa/c2b/payments?status=pending_review") {
        return Promise.resolve(jsonResponse({
          data: [
            {
              id: "mpesa-exception-1",
              trans_id: "RQ92EXC",
              amount_minor: "99000",
              phone_number: "254733000111",
              payer_name: "Peter Ouma",
              status: "pending_review",
              bill_ref_number: "UNKNOWN",
              invoice_number: null,
            },
          ],
          meta: {},
        }));
      }

      if (url === "/api/operational-workflows/principal/actions/flag-mpesa-exception/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "mpesa-exception-1",
            payload: expect.objectContaining({
              actionLabel: "Flag Exception",
              selectedRecordIds: ["mpesa-exception-1"],
              transactionId: "RQ92EXC",
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "flag-mpesa-exception",
            workflowBinding: "mpesa-reconciliation",
            eventName: "MPESA_RECONCILIATION_EXCEPTION_FLAGGED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["finance"])} />);

    await user.click(screen.getByRole("button", { name: /flag exception/i }));

    expect(await screen.findByRole("dialog", { name: /flag exception/i })).toBeVisible();
    expect(screen.getByText(/select pending Paybill deposits to flag/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select rq92exc/i }));
    await user.click(screen.getByRole("button", { name: /flag selected/i }));

    expect(await screen.findByText(/M-Pesa exception queued/i)).toBeVisible();
    expect(screen.queryByText(/completed/i)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/operational-workflows/principal/actions/flag-mpesa-exception/dispatch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-mpesa-exception-token" }),
      }),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/payments/mpesa/c2b/payments/mpesa-exception-1/reconcile",
      expect.anything(),
    );
  });

  it("approves selected admission applications through the existing admissions update endpoint", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-admission-approval-token" }));
      }

      if (url === "/api/admissions/applications?limit=200") {
        return Promise.resolve(jsonResponse({
          data: [
            {
              id: "application-approve-1",
              application_number: "APP-2026-001",
              full_name: "Faith Achieng",
              class_applying: "Grade 8",
              parent_name: "Mary Achieng",
              parent_phone: "254711000222",
              status: "pending",
            },
            {
              id: "application-approve-2",
              application_number: "APP-2026-002",
              full_name: "Daniel Otieno",
              class_applying: "Grade 7",
              parent_name: "Peter Otieno",
              parent_phone: "254722000333",
              status: "pending",
            },
          ],
          meta: {},
        }));
      }

      if (url === "/api/admissions/applications/application-approve-1") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            status: "approved",
            review_notes: expect.stringMatching(/approval workflow/i),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: { id: "application-approve-1", status: "approved", full_name: "Faith Achieng" },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["admissions"])} />);

    await user.click(screen.getByRole("button", { name: /approve admission/i }));

    expect(await screen.findByRole("dialog", { name: /approve admission/i })).toBeVisible();
    expect(screen.getByText(/select admission applications to approve/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve selected/i })).toBeDisabled();

    await user.click(await screen.findByRole("checkbox", { name: /select faith achieng/i }));
    await user.click(screen.getByRole("button", { name: /approve selected/i }));

    expect(await screen.findByText(/Admission application approved/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admissions/applications/application-approve-1",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-admission-approval-token" }),
      }),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/admissions/applications/application-approve-2",
      expect.anything(),
    );
  });

  it("returns selected admission applications for document correction through the admissions update endpoint", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-admission-return-token" }));
      }

      if (url === "/api/admissions/applications?limit=200") {
        return Promise.resolve(jsonResponse({
          data: [
            {
              id: "application-return-1",
              application_number: "APP-2026-009",
              full_name: "Sharon Njeri",
              class_applying: "Grade 6",
              parent_name: "Joseph Njeri",
              parent_phone: "254733999111",
              status: "interview",
              review_notes: "Birth certificate copy unclear",
            },
          ],
          meta: {},
        }));
      }

      if (url === "/api/admissions/applications/application-return-1") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            status: "pending",
            review_notes: expect.stringMatching(/documents returned/i),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: { id: "application-return-1", status: "pending", full_name: "Sharon Njeri" },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["admissions"])} />);

    await user.click(screen.getByRole("button", { name: /return documents/i }));

    expect(await screen.findByRole("dialog", { name: /return documents/i })).toBeVisible();
    expect(screen.getByText(/select admission applications whose documents should be returned/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select sharon njeri/i }));
    await user.click(screen.getByRole("button", { name: /return selected/i }));

    expect(await screen.findByText(/Admission documents returned/i)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admissions/applications/application-return-1",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-admission-return-token" }),
      }),
    );
  });

  it("opens selected escalated discipline incidents through the governed incident-center workflow", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-open-incident-token" }));
      }

      if (url === "/api/discipline/incidents") {
        return Promise.resolve(jsonResponse({
          data: [
            {
              id: "incident-open-1",
              incident_number: "DISC-2026-001",
              title: "Dormitory vandalism escalation",
              severity: "high",
              status: "escalated",
              student_id: "student-disc-1",
              location: "Dormitory A",
              parent_notification_status: "pending",
            },
            {
              id: "incident-open-2",
              incident_number: "DISC-2026-002",
              title: "Late arrival",
              severity: "low",
              status: "reported",
              student_id: "student-disc-2",
              location: "Gate",
            },
          ],
          meta: {},
        }));
      }

      if (url === "/api/operational-workflows/principal/actions/open-incident-center/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "incident-open-1",
            payload: expect.objectContaining({
              actionLabel: "Open Incident Center",
              selectedRecordIds: ["incident-open-1"],
              incidentNumber: "DISC-2026-001",
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "open-incident-center",
            workflowBinding: "incident-escalation",
            eventName: "INCIDENT_CENTER_OPENED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["discipline"])} />);

    await user.click(screen.getByRole("button", { name: /open incident center/i }));

    expect(await screen.findByRole("dialog", { name: /open incident center/i })).toBeVisible();
    expect(screen.getByText(/select escalated discipline incidents to open/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select dormitory vandalism escalation/i }));
    await user.click(screen.getByRole("button", { name: /open selected/i }));

    expect(await screen.findByText(/Incident center workflow dispatched/i)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/operational-workflows/principal/actions/open-incident-center/dispatch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-open-incident-token" }),
      }),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/operational-workflows/principal/actions/open-incident-center/dispatch",
      expect.objectContaining({ body: expect.stringContaining("incident-open-2") }),
    );
  });

  it("creates security notification actions for selected severe discipline incidents", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-security-notify-token" }));
      }

      if (url === "/api/discipline/incidents") {
        return Promise.resolve(jsonResponse({
          data: [
            {
              id: "incident-security-1",
              incident_number: "DISC-2026-010",
              title: "Gate confrontation",
              severity: "critical",
              status: "escalated",
              student_id: "student-security-1",
              location: "Main gate",
            },
          ],
          meta: {},
        }));
      }

      if (url === "/api/discipline/incidents/incident-security-1/actions") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            action_type: "security_notification",
            status: "pending",
            title: expect.stringMatching(/notify security/i),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: { id: "discipline-action-security-1", status: "pending" },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["discipline"])} />);

    await user.click(screen.getByRole("button", { name: /notify security/i }));

    expect(await screen.findByRole("dialog", { name: /notify security/i })).toBeVisible();
    expect(screen.getByText(/select severe discipline incidents that need security notification/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select gate confrontation/i }));
    await user.click(screen.getByRole("button", { name: /notify selected/i }));

    expect(await screen.findByText(/Security notification task created/i)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/discipline/incidents/incident-security-1/actions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-security-notify-token" }),
      }),
    );
  });

  it("creates parent meeting actions for selected discipline incidents", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-discipline-parent-token" }));
      }

      if (url === "/api/discipline/incidents") {
        return Promise.resolve(jsonResponse({
          data: [
            {
              id: "incident-parent-1",
              incident_number: "DISC-2026-020",
              title: "Repeated class disruption",
              severity: "high",
              status: "awaiting_parent_response",
              student_id: "student-parent-1",
              location: "Grade 8 East",
            },
          ],
          meta: {},
        }));
      }

      if (url === "/api/discipline/incidents/incident-parent-1/actions") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            action_type: "parent_meeting",
            status: "pending",
            title: expect.stringMatching(/parent meeting/i),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: { id: "discipline-action-parent-1", status: "pending" },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["discipline"])} />);

    await user.click(screen.getByRole("button", { name: /^Schedule Parent Meeting$/i }));

    expect(await screen.findByRole("dialog", { name: /^Schedule Parent Meeting$/i })).toBeVisible();
    expect(screen.getByText(/select discipline incidents that require parent meetings/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select repeated class disruption/i }));
    await user.click(screen.getByRole("button", { name: /schedule selected/i }));

    expect(await screen.findByText(/Parent meeting task created/i)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/discipline/incidents/incident-parent-1/actions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-discipline-parent-token" }),
      }),
    );
  });

  it("creates counselling referrals only for selected discipline incidents with learner IDs", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-counsellor-referral-token" }));
      }

      if (url === "/api/discipline/incidents") {
        return Promise.resolve(jsonResponse({
          data: [
            {
              id: "incident-referral-1",
              incident_number: "DISC-2026-030",
              title: "Learner welfare concern",
              severity: "critical",
              status: "escalated",
              student_id: "student-referral-1",
              location: "Class teacher office",
            },
          ],
          meta: {},
        }));
      }

      if (url === "/api/counselling/referrals") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            student_id: "student-referral-1",
            incident_id: "incident-referral-1",
            risk_level: "critical",
            reason: expect.stringMatching(/approval workflow/i),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: { id: "referral-1", status: "active", student_id: "student-referral-1" },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["discipline"])} />);

    await user.click(screen.getByRole("button", { name: /refer to counsellor/i }));

    expect(await screen.findByRole("dialog", { name: /refer to counsellor/i })).toBeVisible();
    expect(screen.getByText(/select discipline incidents that need counselling referral/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select learner welfare concern/i }));
    await user.click(screen.getByRole("button", { name: /refer selected/i }));

    expect(await screen.findByText(/Counselling referral created/i)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/counselling/referrals",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-counsellor-referral-token" }),
      }),
    );
  });

  it("queues selected counselling referrals for escalation through the governed workflow", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-counselling-escalate-token" }));
      }

      if (url === "/api/counselling/referrals") {
        return Promise.resolve(jsonResponse({
          data: [
            {
              id: "counselling-referral-1",
              student_id: "student-welfare-1",
              incident_id: "incident-welfare-1",
              risk_level: "high",
              status: "active",
              reason: "Repeated distress signals",
              created_at: "2026-06-05T08:00:00.000Z",
            },
          ],
          meta: {},
        }));
      }

      if (url === "/api/operational-workflows/principal/actions/escalate-counselling-case/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "counselling-referral-1",
            payload: expect.objectContaining({
              actionLabel: "Escalate Case",
              selectedRecordIds: ["counselling-referral-1"],
              studentId: "student-welfare-1",
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "escalate-counselling-case",
            workflowBinding: "counselling-escalation",
            eventName: "COUNSELLING_CASE_ESCALATED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["admin_command_centers"])} />);

    await user.click(screen.getByRole("button", { name: /escalate case/i }));

    expect(await screen.findByRole("dialog", { name: /escalate case/i })).toBeVisible();
    expect(screen.getByText(/select active counselling referrals to escalate/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select counselling referral-1/i }));
    await user.click(screen.getByRole("button", { name: /escalate selected/i }));

    expect(await screen.findByText(/Counselling escalation queued/i)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/operational-workflows/principal/actions/escalate-counselling-case/dispatch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-counselling-escalate-token" }),
      }),
    );
  });

  it("queues selected counselling referrals for parent welfare meetings", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-welfare-parent-token" }));
      }

      if (url === "/api/counselling/referrals") {
        return Promise.resolve(jsonResponse({
          data: [
            {
              id: "counselling-referral-parent-1",
              student_id: "student-welfare-parent-1",
              incident_id: "incident-welfare-parent-1",
              risk_level: "medium",
              status: "active",
              reason: "Parent support requested",
              created_at: "2026-06-05T09:00:00.000Z",
            },
          ],
          meta: {},
        }));
      }

      if (url === "/api/operational-workflows/principal/actions/schedule-parent-welfare-meeting/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "counselling-referral-parent-1",
            payload: expect.objectContaining({
              actionLabel: "Schedule Parent Meeting",
              selectedRecordIds: ["counselling-referral-parent-1"],
              studentId: "student-welfare-parent-1",
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "schedule-parent-welfare-meeting",
            workflowBinding: "counselling-escalation",
            eventName: "WELFARE_PARENT_MEETING_SCHEDULED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["admin_command_centers"])} />);

    await user.click(screen.getByRole("button", { name: /schedule parent meeting/i }));

    expect(await screen.findByRole("dialog", { name: /schedule parent meeting/i })).toBeVisible();
    expect(screen.getByText(/select active counselling referrals for parent welfare meetings/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select counselling referral-parent-1/i }));
    await user.click(screen.getByRole("button", { name: /schedule selected/i }));

    expect(await screen.findByText(/Parent welfare meeting queued/i)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/operational-workflows/principal/actions/schedule-parent-welfare-meeting/dispatch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-welfare-parent-token" }),
      }),
    );
  });

  it("exports selected report cards through the existing parent download endpoint", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/exams/report-cards") {
        return Promise.resolve(jsonResponse({
          data: [
            {
              id: "report-export-1",
              exam_series_id: "series-export",
              student_id: "student-export",
              report_snapshot_id: "snapshot-export",
              status: "published",
              metadata: { report_card: { learner_name: "Achieng Export", class_name: "Grade 9" } },
            },
          ],
          meta: {},
        }));
      }

      if (url === "/api/exams/report-cards/report-export-1/parent-download") {
        return Promise.resolve(jsonResponse({
          data: {
            file_name: "achieng-export-report.pdf",
            download_url: "/api/exams/report-cards/report-export-1/parent-download",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["reports_analytics"])} />);

    await user.click(screen.getByRole("button", { name: /export pdf/i }));
    expect(await screen.findByRole("dialog", { name: /export pdf/i })).toBeVisible();
    expect(screen.getByText(/select report cards to export/i)).toBeVisible();

    await user.click(await screen.findByRole("checkbox", { name: /select achieng export/i }));
    await user.click(screen.getByRole("button", { name: /export selected/i }));

    expect(await screen.findByText(/achieng-export-report.pdf/i)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/exams/report-cards/report-export-1/parent-download",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("queues selected report cards for scheduled report delivery through the workflow dispatcher", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-schedule-report-token" }));
      }

      if (url === "/api/exams/report-cards") {
        return Promise.resolve(jsonResponse({
          data: [
            {
              id: "report-schedule-1",
              exam_series_id: "series-schedule",
              student_id: "student-schedule",
              report_snapshot_id: "snapshot-schedule",
              status: "published",
              metadata: { report_card: { learner_name: "Achieng Schedule", class_name: "Grade 9" } },
            },
          ],
          meta: {},
        }));
      }

      if (url === "/api/operational-workflows/principal/actions/schedule-report/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "report-schedule-1",
            payload: expect.objectContaining({
              actionLabel: "Schedule Report",
              selectedRecordIds: ["report-schedule-1"],
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "schedule-report",
            workflowBinding: "report-export",
            eventName: "REPORT_SCHEDULED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["reports_analytics"])} />);

    await user.click(screen.getByRole("button", { name: /schedule report/i }));
    expect(await screen.findByRole("dialog", { name: /schedule report/i })).toBeVisible();
    expect(screen.getByText(/select report cards to schedule/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select achieng schedule/i }));
    await user.click(screen.getByRole("button", { name: /schedule selected/i }));

    expect(await screen.findByText(/Report schedule queued/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/operational-workflows/principal/actions/schedule-report/dispatch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-schedule-report-token" }),
      }),
    );
  });

  it("maps Retry SMS to failed delivery records and queues only selected retry jobs", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-sms-retry-token" }));
      }

      if (url === "/api/support/admin/notifications/dead-letter?audience=superadmin&channel=sms") {
        return Promise.resolve(jsonResponse({
          data: [
            {
              id: "sms-dead-1",
              tenant_id: "kisumu-boys",
              recipient_user_id: "parent-1",
              recipient_type: "school",
              channel: "sms",
              title: "Fee reminder failed",
              body: "Fee balance reminder for Brian Otieno.",
              delivery_status: "failed",
              delivery_attempts: 2,
              last_delivery_error: "Provider timeout",
              metadata: { provider_message_id: "africas-talking-001", recipient_phone: "+254712111222" },
              created_at: "2026-06-04T10:00:00.000Z",
              ticket_number: "SMS-001",
              ticket_subject: "Fee reminder",
              school_name: "Kisumu Boys",
            },
          ],
          meta: {},
        }));
      }

      if (url === "/api/support/admin/notifications/dead-letter/sms-dead-1/retry") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            channel: "sms",
            provider_message_id: "africas-talking-001",
            tenant_id: "kisumu-boys",
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            id: "sms-dead-1",
            delivery_status: "queued",
            retry_job_id: "sms-retry-job-1",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["communication_center"])} />);

    await user.click(screen.getByRole("button", { name: /retry sms/i }));

    expect(await screen.findByRole("dialog", { name: /retry sms/i })).toBeVisible();
    expect(screen.getByText(/select failed SMS deliveries/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /retry selected/i })).toBeDisabled();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select fee reminder failed/i }));
    await user.click(screen.getByRole("button", { name: /retry selected/i }));

    expect(await screen.findByText(/SMS retry queued/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/support/admin/notifications/dead-letter/sms-dead-1/retry",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-sms-retry-token" }),
      }),
    );
  });

  it("queues selected failed messages for channel change through the workflow dispatcher", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-channel-change-token" }));
      }

      if (url === "/api/support/admin/notifications/dead-letter?audience=superadmin&channel=sms") {
        return Promise.resolve(jsonResponse({
          data: [
            {
              id: "sms-dead-channel-1",
              tenant_id: "kisumu-boys",
              recipient_user_id: "parent-2",
              recipient_type: "school",
              channel: "sms",
              title: "Parent meeting SMS failed",
              body: "Meeting notice for Grade 8.",
              delivery_status: "failed",
              delivery_attempts: 3,
              last_delivery_error: "Invalid route",
              metadata: { provider_message_id: "provider-channel-1", recipient_phone: "+254733111222" },
              created_at: "2026-06-04T11:00:00.000Z",
              ticket_number: "SMS-002",
              school_name: "Kisumu Boys",
            },
          ],
          meta: {},
        }));
      }

      if (url === "/api/operational-workflows/principal/actions/change-sms-channel/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "sms-dead-channel-1",
            payload: expect.objectContaining({
              actionLabel: "Change Channel",
              selectedRecordIds: ["sms-dead-channel-1"],
              requestedChannel: "email",
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "change-sms-channel",
            workflowBinding: "sms-retry",
            eventName: "COMMUNICATION_CHANNEL_CHANGED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["communication_center"])} />);

    await user.click(screen.getByRole("button", { name: /change channel/i }));
    expect(await screen.findByRole("dialog", { name: /change channel/i })).toBeVisible();
    expect(screen.getByText(/select failed SMS deliveries to reroute/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select parent meeting sms failed/i }));
    await user.click(screen.getByRole("button", { name: /queue channel change/i }));

    expect(await screen.findByText(/Channel change queued/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/operational-workflows/principal/actions/change-sms-channel/dispatch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-channel-change-token" }),
      }),
    );
  });

  it("maps clinic disposal approvals to medicine inventory records and queues selected disposal work", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-clinic-token" }));
      }

      if (url === "/api/clinic/medicines") {
        return Promise.resolve(jsonResponse([
          {
            id: "medicine-expired-1",
            medicine_name: "Expired Paracetamol",
            category: "analgesic",
            unit_type: "tablets",
            quantity_in_stock: 0,
            nearest_expiry_date: "2026-05-01",
          },
        ]));
      }

      if (url === "/api/operational-workflows/principal/actions/approve-medicine-disposal/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "medicine-expired-1",
            payload: expect.objectContaining({
              actionLabel: "Approve Disposal",
              selectedRecordIds: ["medicine-expired-1"],
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "approve-medicine-disposal",
            workflowBinding: "medicine-disposal",
            eventName: "MEDICINE_DISPOSAL_APPROVED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["clinic_health"])} />);

    await user.click(screen.getByRole("button", { name: /approve disposal/i }));

    expect(await screen.findByRole("dialog", { name: /approve disposal/i })).toBeVisible();
    expect(screen.getByText(/select clinic medicine records/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve selected/i })).toBeDisabled();

    await user.click(await screen.findByRole("checkbox", { name: /select expired paracetamol/i }));
    await user.click(screen.getByRole("button", { name: /approve selected/i }));

    expect(await screen.findByText(/Approve Disposal queued for Expired Paracetamol/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/operational-workflows/principal/actions/approve-medicine-disposal/dispatch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-clinic-token" }),
      }),
    );
  });

  it("maps transport route actions to selectable manifests and queues selected route work", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-transport-token" }));
      }

      if (url === "/api/transport/dashboard") {
        return Promise.resolve(jsonResponse({
          data: {
            manifests: [
              {
                id: "manifest-east-1",
                route_name: "Eastlands AM",
                learner_count: 32,
                status: "pending",
                effective_from: "2026-06-08",
              },
            ],
          },
          meta: {},
        }));
      }

      if (url === "/api/operational-workflows/principal/actions/assign-route/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "manifest-east-1",
            payload: expect.objectContaining({
              actionLabel: "Assign Route",
              selectedRecordIds: ["manifest-east-1"],
              learnerCount: 32,
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "assign-route",
            workflowBinding: "transport-route-assignment",
            eventName: "TRANSPORT_ROUTE_ASSIGNED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["transport"])} />);

    await user.click(screen.getByRole("button", { name: /assign route/i }));

    expect(await screen.findByRole("dialog", { name: /assign route/i })).toBeVisible();
    expect(screen.getByText(/select transport manifests/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select eastlands am/i }));
    await user.click(screen.getByRole("button", { name: /assign selected/i }));

    expect(await screen.findByText(/Assign Route queued for Eastlands AM/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
  });

  it("maps boarding leave-out approval to live boarding records and completes selected source records", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-boarding-token" }));
      }

      if (url === "/api/boarding/dashboard") {
        return Promise.resolve(jsonResponse({
          data: {
            records: [
              {
                id: "boarding-leave-1",
                title: "Kevin Otieno weekend leave-out",
                category: "leaveout",
                owner_name: "Dorm A",
                status: "submitted",
                priority: "high",
                metric_count: 1,
              },
            ],
          },
          meta: {},
        }));
      }

      if (url === "/api/boarding/records/boarding-leave-1/status") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual({ status: "completed" });
        return Promise.resolve(jsonResponse({ data: { status: "completed" }, meta: {} }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["boarding"])} />);

    await user.click(screen.getByRole("button", { name: /approve leave-out/i }));

    expect(await screen.findByRole("dialog", { name: /approve leave-out/i })).toBeVisible();
    expect(screen.getByText(/select boarding records/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select kevin otieno weekend leave-out/i }));
    await user.click(screen.getByRole("button", { name: /approve selected/i }));

    expect(await screen.findByText(/Boarding record status updated to completed: Kevin Otieno weekend leave-out/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/boarding/records/boarding-leave-1/status",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ "x-myshule-csrf": "csrf-boarding-token" }),
      }),
    );
  });

  it("maps visitor incident actions to visitor records and queues only selected security work", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-visitor-token" }));
      }

      if (url === "/api/visitors/dashboard") {
        return Promise.resolve(jsonResponse({
          data: {
            records: [
              {
                id: "visitor-incident-1",
                title: "Gate incident at main entrance",
                category: "emergency",
                owner_name: "Security Desk",
                status: "open",
                priority: "critical",
                metric_count: 1,
              },
            ],
          },
          meta: {},
        }));
      }

      if (url === "/api/operational-workflows/principal/actions/notify-security-desk/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "visitor-incident-1",
            payload: expect.objectContaining({
              actionLabel: "Notify Security Desk",
              selectedRecordIds: ["visitor-incident-1"],
              category: "emergency",
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "notify-security-desk",
            workflowBinding: "visitor-incident",
            eventName: "SECURITY_DESK_NOTIFIED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["visitor_management"])} />);

    await user.click(screen.getByRole("button", { name: /notify security desk/i }));

    expect(await screen.findByRole("dialog", { name: /notify security desk/i })).toBeVisible();
    expect(screen.getByText(/select visitor records/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select gate incident at main entrance/i }));
    await user.click(screen.getByRole("button", { name: /notify selected/i }));

    expect(await screen.findByText(/Notify Security Desk queued for Gate incident at main entrance/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
  });

  it("maps lab approval catalog actions to lab dashboard records and queues selected lab work", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-lab-token" }));
      }

      if (url === "/api/labs/dashboard") {
        return Promise.resolve(jsonResponse({
          data: {
            breakages: [
              {
                id: "lab-breakage-1",
                title: "Burette rack damage",
                item_name: "Burette Rack",
                status: "submitted",
                estimated_cost_minor: 420000,
                owner_name: "Chemistry Lab",
              },
            ],
            chemicals: [
              {
                id: "chemical-reorder-1",
                name: "Hydrochloric Acid",
                status: "low_stock",
                hazard: "restricted",
                quantity: "2.4 L",
                supplier: "Nairobi Lab Supplies",
              },
            ],
          },
          meta: {},
        }));
      }

      if (url === "/api/operational-workflows/principal/actions/approve-breakage-charge/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "lab-breakage-1",
            payload: expect.objectContaining({
              actionLabel: "Approve Charge",
              selectedRecordIds: ["lab-breakage-1"],
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "approve-breakage-charge",
            workflowBinding: "lab-breakage-approval",
            eventName: "LAB_BREAKAGE_CHARGE_APPROVED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["lab_management"])} />);

    await user.click(screen.getByRole("button", { name: /approve charge/i }));

    expect(await screen.findByRole("dialog", { name: /approve charge/i })).toBeVisible();
    expect(screen.getByText(/select lab breakage records/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select burette rack damage/i }));
    await user.click(screen.getByRole("button", { name: /approve selected/i }));

    expect(await screen.findByText(/Approve Charge queued for Burette rack damage/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
  });

  it("maps HR leave approval to staff dashboard leave records and queues only selected leave work", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-hr-leave-token" }));
      }

      if (url === "/api/staff/dashboard") {
        return Promise.resolve(jsonResponse({
          data: {
            leave_requests: [
              {
                id: "leave-1",
                staff_name: "Mr Otieno",
                department: "Mathematics",
                leave_type: "sick",
                status: "submitted",
                coverage_status: "uncovered",
                days: 3,
              },
            ],
          },
          meta: {},
        }));
      }

      if (url === "/api/operational-workflows/principal/actions/approve-leave/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "leave-1",
            payload: expect.objectContaining({
              actionLabel: "Approve Leave",
              selectedRecordIds: ["leave-1"],
              department: "Mathematics",
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "approve-leave",
            workflowBinding: "leave-approval",
            eventName: "LEAVE_APPROVED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["staff"])} />);

    await user.click(screen.getByRole("button", { name: /approve leave/i }));

    expect(await screen.findByRole("dialog", { name: /approve leave/i })).toBeVisible();
    expect(screen.getByText(/select staff leave records/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve selected/i })).toBeDisabled();

    await user.click(await screen.findByRole("checkbox", { name: /select mr otieno/i }));
    await user.click(screen.getByRole("button", { name: /approve selected/i }));

    expect(await screen.findByText(/Approve Leave queued for Mr Otieno/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
  });

  it("maps inventory write-off approvals to live inventory incidents and queues selected write-off work", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-writeoff-token" }));
      }

      if (url === "/api/inventory/incidents") {
        return Promise.resolve(jsonResponse({
          data: [
            {
              id: "incident-loss-1",
              incident_number: "INV-LOSS-001",
              item_name: "Printer toner",
              incident_type: "lost",
              quantity: 2,
              reason: "Store variance",
              responsible_department: "Administration",
              cost_impact: 6400,
              status: "reported",
            },
          ],
          meta: {},
        }));
      }

      if (url === "/api/operational-workflows/principal/actions/approve-writeoff/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "incident-loss-1",
            payload: expect.objectContaining({
              actionLabel: "Approve Write-off",
              selectedRecordIds: ["incident-loss-1"],
              itemName: "Printer toner",
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "approve-writeoff",
            workflowBinding: "inventory-writeoff",
            eventName: "INVENTORY_WRITEOFF_APPROVED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["inventory"])} />);

    await user.click(screen.getByRole("button", { name: /approve write-off/i }));

    expect(await screen.findByRole("dialog", { name: /approve write-off/i })).toBeVisible();
    expect(screen.getByText(/select inventory incident records/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select inv-loss-001/i }));
    await user.click(screen.getByRole("button", { name: /approve selected/i }));

    expect(await screen.findByText(/Approve Write-off queued for INV-LOSS-001/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
  });

  it("maps timetable publish approvals to timetable dashboard records and queues selected timetable work", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-timetable-token" }));
      }

      if (url === "/api/timetable/dashboard") {
        return Promise.resolve(jsonResponse({
          data: {
            timetables: [
              {
                id: "timetable-1",
                title: "Term 2 master timetable",
                class_name: "Whole school",
                status: "validated",
                conflict_count: 0,
                owner_name: "Deputy Principal",
              },
            ],
          },
          meta: {},
        }));
      }

      if (url === "/api/operational-workflows/principal/actions/publish-timetable/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "timetable-1",
            payload: expect.objectContaining({
              actionLabel: "Publish Timetable",
              selectedRecordIds: ["timetable-1"],
              conflictCount: 0,
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "publish-timetable",
            workflowBinding: "timetable-publish",
            eventName: "TIMETABLE_PUBLISHED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["timetable_builder"])} />);

    await user.click(screen.getByRole("button", { name: /publish timetable/i }));

    expect(await screen.findByRole("dialog", { name: /publish timetable/i })).toBeVisible();
    expect(screen.getByText(/select timetable records/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select term 2 master timetable/i }));
    await user.click(screen.getByRole("button", { name: /publish selected/i }));

    expect(await screen.findByText(/Publish Timetable queued for Term 2 master timetable/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
  });

  it("maps library lost-book charge approval to seeded lost fine records and queues only selected notices", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-library-token" }));
      }

      if (url === "/api/operational-workflows/principal/actions/approve-lost-book-charge/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "book-blossoms",
            payload: expect.objectContaining({
              actionLabel: "Approve Charge",
              selectedRecordIds: ["book-blossoms"],
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "approve-lost-book-charge",
            workflowBinding: "library-lost-book",
            eventName: "LIBRARY_LOST_BOOK_CHARGE_APPROVED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["library"])} />);

    await user.click(screen.getByRole("button", { name: /^Approve Charge$/i }));

    expect(await screen.findByRole("dialog", { name: /^Approve Charge$/i })).toBeVisible();
    expect(screen.getByText(/select library lost-book fines/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select blossoms of the savannah/i }));
    await user.click(screen.getByRole("button", { name: /approve selected/i }));

    expect(await screen.findByText(/Approve Charge queued for Blossoms of the Savannah/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
  });

  it("maps budget approval to budget-linked procurement requests and queues selected budget work", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-budget-token" }));
      }

      if (url === "/api/procurement/dashboard") {
        return Promise.resolve(jsonResponse({
          data: {
            requests: [
              {
                id: "budget-request-1",
                title: "Science lab budget release",
                department: "Science",
                status: "submitted",
                budget_code: "SCI-2026",
                estimated_total_minor: 1250000,
              },
            ],
          },
          meta: {},
        }));
      }

      if (url === "/api/operational-workflows/principal/actions/approve-budget/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "budget-request-1",
            payload: expect.objectContaining({
              actionLabel: "Approve Budget",
              selectedRecordIds: ["budget-request-1"],
              budgetCode: "SCI-2026",
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "approve-budget",
            workflowBinding: "budget-approval",
            eventName: "BUDGET_APPROVED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["finance"])} />);

    await user.click(screen.getByRole("button", { name: /approve budget/i }));

    expect(await screen.findByRole("dialog", { name: /approve budget/i })).toBeVisible();
    expect(screen.getByText(/select budget-linked procurement requests/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select science lab budget release/i }));
    await user.click(screen.getByRole("button", { name: /approve selected/i }));

    expect(await screen.findByText(/Approve Budget queued for Science lab budget release/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
  });

  it("maps document print requests to printable report-card records and uses the existing download handler", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/exams/report-cards") {
        return Promise.resolve(jsonResponse({
          data: [
            {
              id: "report-print-1",
              exam_series_id: "series-print",
              student_id: "student-print",
              report_snapshot_id: "snapshot-print",
              status: "published",
              metadata: { report_card: { learner_name: "Achieng Print", class_name: "Grade 8" } },
            },
          ],
          meta: {},
        }));
      }

      if (url === "/api/exams/report-cards/report-print-1/parent-download") {
        return Promise.resolve(jsonResponse({
          data: { file_name: "achieng-print-report.pdf", download_url: "/downloads/achieng-print-report.pdf" },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["document_printing"])} />);

    await user.click(screen.getByRole("button", { name: /print document/i }));

    expect(await screen.findByRole("dialog", { name: /print document/i })).toBeVisible();
    expect(screen.getByText(/select printable report-card documents/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select achieng print/i }));
    await user.click(screen.getByRole("button", { name: /print selected/i }));

    expect(await screen.findByText(/achieng-print-report.pdf exported/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
  });

  it("maps universal approval reviewer assignment to existing approval catalog queue entries", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-universal-token" }));
      }

      if (url === "/api/operational-workflows/principal/actions/assign-universal-reviewer/dispatch") {
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual(
          expect.objectContaining({
            aggregateId: "catalog:procurement-approval",
            payload: expect.objectContaining({
              actionLabel: "Assign Reviewer",
              selectedRecordIds: ["catalog:procurement-approval"],
              workflowSourceId: "procurement-approval",
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: {
            status: "DISPATCHED",
            actionId: "assign-universal-reviewer",
            workflowBinding: "universal-approval-escalation",
            eventName: "UNIVERSAL_REVIEWER_ASSIGNED",
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: [], meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<ApprovalCommandPanel workflows={principalWorkflows(["universal_approvals"])} />);

    await user.click(screen.getByRole("button", { name: /assign reviewer/i }));

    expect(await screen.findByRole("dialog", { name: /assign reviewer/i })).toBeVisible();
    expect(screen.getByText(/select approval catalog entries/i)).toBeVisible();
    expect(screen.queryByText(/WORKFLOW_MAPPING_MISSING/i)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("checkbox", { name: /select procurement approvals/i }));
    await user.click(screen.getByRole("button", { name: /assign selected/i }));

    expect(await screen.findByText(/Assign Reviewer queued for Procurement approvals/i)).toBeVisible();
    expect(screen.getAllByText(/1 succeeded, 0 failed/i).length).toBeGreaterThan(0);
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
