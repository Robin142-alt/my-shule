import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";

import { PortalPages } from "@/components/portal/portal-pages";
import { SchoolPages } from "@/components/school/school-pages";
import { SuperadminPages } from "@/components/platform/superadmin-pages";

import { routerPushMock, routerReplaceMock } from "./router-mock";
import { renderWithProviders } from "./test-utils";

jest.setTimeout(20_000);

function jsonResponse(body: unknown, init?: ResponseInit) {
  return {
    status: init?.status ?? 200,
    ok: (init?.status ?? 200) >= 200 && (init?.status ?? 200) < 300,
    json: async () => body,
  } as Response;
}

function emptyReconciliationReport() {
  return {
    period: {
      from: "2026-05-01",
      to: "2026-05-16",
      payment_method: null,
    },
    totals: {
      transaction_count: 0,
      total_amount_minor: "0",
      cleared_count: 0,
      cleared_amount_minor: "0",
      pending_count: 0,
      pending_amount_minor: "0",
      exception_count: 0,
      exception_amount_minor: "0",
    },
    method_summaries: [],
    rows: [],
  };
}

const enabledSchoolModules = [
  "students",
  "admissions",
  "academics",
  "finance",
  "communication_sms",
  "reports",
  "staff",
  "timetable",
  "inventory",
  "admin_command_centers",
  "principal_dashboard",
];

describe("experience actions", () => {
  beforeEach(() => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/school/modules/me")) {
        return Promise.resolve(jsonResponse({ data: enabledSchoolModules }));
      }

      if (url.includes("/api/billing/reconciliation")) {
        return Promise.resolve(jsonResponse(emptyReconciliationReport()));
      }

      if (
        url.includes("/api/billing/finance-activity")
        || url.includes("/api/billing/student-balances")
        || url.includes("/api/billing/fee-structures")
        || url.includes("/api/billing/manual-fee-payments")
        || url.includes("/api/payments/mpesa/c2b/payments")
        || url.includes("/api/platform/schools")
      ) {
        return Promise.resolve(jsonResponse([]));
      }

      return Promise.resolve(jsonResponse({}));
    }) as unknown as typeof fetch;
  });

  it("routes expired school sessions back to login instead of showing module-disabled state", async () => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/school/modules/me")) {
        return Promise.resolve(
          jsonResponse({ message: "Session has expired" }, { status: 401 }),
        );
      }

      return Promise.resolve(jsonResponse({}));
    }) as unknown as typeof fetch;

    renderWithProviders(
      createElement(SchoolPages, {
        role: "principal",
        tenantSlug: "mangu-high",
      }),
    );

    await waitFor(() =>
      expect(routerReplaceMock).toHaveBeenCalledWith("/school/login?expired=1"),
    );
    expect(screen.queryByText(/module not enabled for your school/i)).not.toBeInTheDocument();
  });

  it("supports shell search and notifications inside live module workspaces", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      createElement(SchoolPages, { role: "bursar", section: "finance", tenantSlug: "barakaacademy" }),
    );

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /fees \/ payments/i })).toBeVisible(),
    );
    const searchInput = screen.getByLabelText("Search");
    await user.click(searchInput);
    await user.type(searchInput, "fees");

    const searchPanel = await screen.findByTestId("workspace-search-panel");
    const financeResult = within(searchPanel).getByRole("button", {
      name: /fees/i,
    });
    await user.click(financeResult);

    expect(routerPushMock).toHaveBeenCalledWith("/finance");

    await user.click(screen.getByRole("button", { name: "Notifications" }));
    const notificationsPanel = await screen.findByTestId("workspace-notifications-panel");
    expect(
      within(notificationsPanel).getByText(/no notifications are open/i),
    ).toBeVisible();
  });

  it("loads backend school notifications into the shell and marks them read when opened", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/school/modules/me")) {
        return Promise.resolve(jsonResponse({ data: enabledSchoolModules }));
      }

      if (url === "/api/events/notifications?limit=8") {
        return Promise.resolve(
          jsonResponse({
            data: [
              {
                id: "00000000-0000-4000-8000-000000000401",
                title: "Fee reversal requested",
                detail: "Receipt KBI-RCPT-400 needs approval.",
                status: "unread",
                tone: "warning",
                href: "/finance?record=approval-400",
                sourceModule: "finance",
                relatedModule: "finance",
                relatedRecordId: "approval-400",
                createdAt: "2026-05-31T06:30:00.000Z",
                readAt: null,
              },
            ],
          }),
        );
      }

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-token" }));
      }

      if (url === "/api/events/notifications/00000000-0000-4000-8000-000000000401/read") {
        expect(init).toEqual(
          expect.objectContaining({
            method: "POST",
            credentials: "same-origin",
          }),
        );
        expect((init?.headers as Record<string, string>)["x-myshule-csrf"]).toBe("csrf-token");

        return Promise.resolve(
          jsonResponse({
            data: {
              id: "00000000-0000-4000-8000-000000000401",
              status: "read",
            },
          }),
        );
      }

      if (url.includes("/api/billing/reconciliation")) {
        return Promise.resolve(jsonResponse(emptyReconciliationReport()));
      }

      if (
        url.includes("/api/billing/finance-activity")
        || url.includes("/api/billing/student-balances")
        || url.includes("/api/billing/fee-structures")
        || url.includes("/api/billing/manual-fee-payments")
        || url.includes("/api/payments/mpesa/c2b/payments")
        || url.includes("/api/platform/schools")
      ) {
        return Promise.resolve(jsonResponse([]));
      }

      return Promise.resolve(jsonResponse({}));
    }) as unknown as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;

    renderWithProviders(
      createElement(SchoolPages, { role: "bursar", section: "finance", tenantSlug: "barakaacademy" }),
    );

    await waitFor(() =>
      expect(fetchMock.mock.calls.map(([url]) => String(url))).toContain("/api/events/notifications?limit=8"),
    );

    await user.click(screen.getByRole("button", { name: "Notifications" }));
    const notificationsPanel = await screen.findByTestId("workspace-notifications-panel");
    await user.click(within(notificationsPanel).getByRole("button", { name: /Fee reversal requested/i }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.map(([url]) => String(url))).toContain(
        "/api/events/notifications/00000000-0000-4000-8000-000000000401/read",
      ),
    );
    expect(routerPushMock).toHaveBeenCalledWith("/finance?record=approval-400");
  });

  it("adds a learner from the school students workspace instead of exposing a dead action", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      createElement(SchoolPages, {
        role: "admin",
        tenantSlug: "barakaacademy",
        section: "students",
      }),
    );

    await user.click(await screen.findByRole("button", { name: /add student/i }));

    const dialog = await screen.findByRole("dialog", { name: /add student/i });
    fireEvent.change(within(dialog).getByLabelText(/learner name/i), {
      target: { value: "Mercy Atieno" },
    });
    fireEvent.change(within(dialog).getByLabelText(/admission number/i), {
      target: { value: "ADM-9001" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^class$/i), {
      target: { value: "Grade 6 Hope" },
    });
    fireEvent.change(within(dialog).getByLabelText(/parent contact/i), {
      target: { value: "0722000001" },
    });

    await user.click(within(dialog).getByRole("button", { name: /save student/i }));

    expect(
      await screen.findByText(/mercy atieno added to the learner register/i),
    ).toBeVisible();
  });

  it("keeps the superadmin schools surface empty until real schools are onboarded", () => {
    renderWithProviders(createElement(SuperadminPages, { section: "schools" }));

    expect(screen.getByRole("heading", { name: /school control/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /nothing to show yet/i })).toBeVisible();
    expect(screen.queryByRole("button", { name: /open school/i })).not.toBeInTheDocument();
  });

  it("keeps a visible logout button on the superadmin dashboard", () => {
    renderWithProviders(createElement(SuperadminPages, { section: "overview" }));

    expect(screen.getByRole("button", { name: /logout/i })).toBeVisible();
  });

  it("shows persisted live school and module totals on the superadmin dashboard after reload", async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/platform/schools")) {
        return Promise.resolve(jsonResponse([
          {
            tenant_id: "green-valley",
            school_name: "Green Valley School",
            subdomain: "green-valley",
            status: "active",
            invitation_sent: true,
            invitation_status: "sent",
            invitation_message: "Invitation sent.",
            can_resend_invite: false,
            invite_expires_at: "2026-05-18T00:00:00.000Z",
            admin_email: "principal@example.test",
            created_at: "2026-05-11T00:00:00.000Z",
            enabled_modules: ["students", "finance", "communication_sms"],
          },
          {
            tenant_id: "lake-view",
            school_name: "Lake View School",
            subdomain: "lake-view",
            status: "active",
            invitation_sent: true,
            invitation_status: "sent",
            invitation_message: "Invitation sent.",
            can_resend_invite: false,
            invite_expires_at: "2026-05-19T00:00:00.000Z",
            admin_email: "admin@example.test",
            created_at: "2026-05-12T00:00:00.000Z",
            enabled_modules: ["students", "exams"],
          },
        ]));
      }

      if (url.includes("/api/platform/modules")) {
        return Promise.resolve(jsonResponse([]));
      }

      return Promise.resolve(jsonResponse({}));
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      renderWithProviders(createElement(SuperadminPages, { section: "overview" }));

      await waitFor(() =>
        expect(screen.getAllByTestId("kpi-value")[0]).toHaveTextContent("2"),
      );
      expect(screen.getAllByTestId("kpi-value")[1]).toHaveTextContent("2");
      expect(screen.getByText(/5 enabled modules across live schools/i)).toBeVisible();
      expect(screen.getAllByText(/3 enabled/i).length).toBeGreaterThan(0);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("shows the authenticated tenants-in-product summary on the superadmin overview", async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/platform/schools/summary")) {
        return Promise.resolve(jsonResponse({
          total_schools: 4,
          active_schools: 3,
          inactive_schools: 1,
          billing_active_schools: 2,
          billing_grace_period_schools: 1,
          billing_restricted_schools: 1,
          billing_suspended_schools: 0,
          pending_principal_invites: 1,
          failed_principal_invites: 1,
          expired_principal_invites: 1,
          schools_with_modules: 3,
          enabled_module_assignments: 12,
          generated_at: "2026-05-29T15:30:00.000Z",
        }));
      }

      if (url.includes("/api/platform/schools")) {
        return Promise.resolve(jsonResponse([]));
      }

      if (url.includes("/api/platform/modules")) {
        return Promise.resolve(jsonResponse([]));
      }

      return Promise.resolve(jsonResponse({}));
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      renderWithProviders(createElement(SuperadminPages, { section: "overview" }));

      expect(await screen.findByText(/tenants in product/i)).toBeVisible();
      await waitFor(() => expect(screen.getByText("4")).toBeVisible());
      expect(screen.getByText(/3 active schools/i)).toBeVisible();
      expect(screen.getByText(/1 pending principal invite/i)).toBeVisible();
      expect(screen.getByText(/1 failed invite delivery/i)).toBeVisible();
      expect(screen.getByText(/12 enabled module assignments/i)).toBeVisible();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("shares a portal fee statement through a real copy flow", async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText,
      },
    });

    renderWithProviders(
      createElement(PortalPages, { viewer: "parent", section: "fees" }),
    );

    await user.click(screen.getByRole("button", { name: /share statement/i }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("My Shule family statement"));
    expect(screen.getByText(/statement copied for sharing/i)).toBeVisible();
  });

  it("records a school payment through the collections workspace", async () => {
    const user = userEvent.setup();
    const originalFetch = global.fetch;
    const learnerSearchResponse = [
        {
          id: "student-mercy-atieno",
          admission_number: "ADM-024",
          first_name: "Mercy",
          last_name: "Atieno",
          class_name: "Grade 8",
          stream_name: "East",
          primary_guardian_phone: "+254700000000",
        },
      ];
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/school/modules/me")) {
        return Promise.resolve(jsonResponse({ data: enabledSchoolModules }));
      }

      if (url.includes("/api/billing/finance-activity")) {
        return Promise.resolve(jsonResponse([]));
      }

      if (url.includes("/api/billing/student-balances")) {
        return Promise.resolve(jsonResponse([]));
      }

      if (url.includes("/api/billing/reconciliation")) {
        return Promise.resolve(jsonResponse(emptyReconciliationReport()));
      }

      if (url.includes("/api/billing/fee-structures")) {
        return Promise.resolve(jsonResponse([]));
      }

      if (url.includes("/api/admissions/students")) {
        return Promise.resolve(jsonResponse(learnerSearchResponse));
      }

      if (url.includes("/api/auth/csrf")) {
        return Promise.resolve(jsonResponse({ token: "csrf-payment-token" }));
      }

      if (url.includes("/api/billing/manual-fee-payments")) {
        return Promise.resolve(jsonResponse({ id: "manual-payment-1", status: "cleared" }));
      }

      return Promise.resolve(jsonResponse({}));
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      renderWithProviders(
        createElement(SchoolPages, {
          role: "admin",
          tenantSlug: "barakaacademy",
          section: "finance",
        }),
      );

      await user.click(await screen.findByRole("button", { name: /record payment/i }));

      const dialog = await screen.findByRole("dialog", { name: /record payment/i });
      await user.type(within(dialog).getByLabelText(/payment student/i), "Mercy");
      await user.click(await within(dialog).findByRole("button", { name: /Mercy Atieno/i }));
      fireEvent.change(within(dialog).getByLabelText(/payment amount/i), {
        target: { value: "18500" },
      });
      fireEvent.change(within(dialog).getByLabelText(/payment reference/i), {
        target: { value: "SMX82KQ4" },
      });

      await user.click(within(dialog).getByRole("button", { name: /save payment/i }));

      expect(await screen.findByText(/payment recorded and posted to finance activity/i)).toBeVisible();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/billing/manual-fee-payments"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "x-myshule-csrf": "csrf-payment-token",
          }),
        }),
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("blocks manual MPESA reconciliation when the receipt is not in live tenant data", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      createElement(SchoolPages, {
        role: "admin",
        tenantSlug: "barakaacademy",
        section: "mpesa",
      }),
    );

    await user.click(await screen.findByRole("button", { name: /manual reconcile/i }));

    const dialog = await screen.findByRole("dialog", { name: /manual reconcile/i });
    const receiptInput = within(dialog).getByLabelText(/^receipt code$/i);
    fireEvent.change(receiptInput, {
      target: { value: "QJT8V9H33" },
    });
    fireEvent.change(within(dialog).getByLabelText(/matched learner/i), {
      target: { value: "Mercy Atieno" },
    });

    await user.click(within(dialog).getByRole("button", { name: /save match/i }));

    expect(
      await within(dialog).findByText(/receipt code was not found in the current mpesa queue/i),
    ).toBeVisible();
  });

  it("lets accountants reconcile unmatched MPESA Paybill deposits from live envelope responses", async () => {
    const user = userEvent.setup();
    const originalFetch = global.fetch;
    const pendingPayment = {
      id: "c2b-payment-1",
      trans_id: "QK72PLM9",
      business_short_code: "600123",
      bill_ref_number: "ADM-024",
      invoice_number: null,
      amount_minor: "1850000",
      phone_number: "2547*****001",
      payer_name: "M*** A*****",
      status: "pending_review",
      matched_invoice_id: null,
      matched_student_id: null,
      ledger_transaction_id: null,
      received_at: "2026-05-20T08:10:00.000Z",
    };
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/school/modules/me")) {
        return Promise.resolve(jsonResponse({ data: enabledSchoolModules }));
      }

      if (url.includes("/api/payments/mpesa/c2b/payments?status=pending_review")) {
        return Promise.resolve(jsonResponse({ data: [pendingPayment] }));
      }

      if (url.includes("/api/auth/csrf")) {
        return Promise.resolve(jsonResponse({ token: "csrf-c2b-token" }));
      }

      if (url.includes("/api/payments/mpesa/c2b/payments/c2b-payment-1/reconcile")) {
        expect(init?.method).toBe("POST");

        return Promise.resolve(jsonResponse({
          data: {
            ...pendingPayment,
            status: "matched",
            ledger_transaction_id: "ledger-1",
          },
        }));
      }

      if (url.includes("/api/billing/manual-fee-payments")) {
        return Promise.resolve(jsonResponse([]));
      }

      return Promise.resolve(jsonResponse([]));
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      renderWithProviders(
        createElement(SchoolPages, {
          role: "bursar",
          tenantSlug: "barakaacademy",
          section: "mpesa",
        }),
      );

      expect((await screen.findAllByText("QK72PLM9")).length).toBeGreaterThan(0);
      const reviewPanel = screen
        .getByRole("heading", { name: /unmatched direct m-pesa deposits/i })
        .closest("section") as HTMLElement;

      fireEvent.change(within(reviewPanel).getByLabelText(/invoice reference/i), {
        target: { value: "INV-2026-0001" },
      });

      await user.click(within(reviewPanel).getByRole("button", { name: /^reconcile$/i }));

      expect(await screen.findByText(/QK72PLM9 reconciled and posted to the fee ledger/i)).toBeVisible();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/payments/mpesa/c2b/payments/c2b-payment-1/reconcile"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "x-myshule-csrf": "csrf-c2b-token",
          }),
        }),
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});
