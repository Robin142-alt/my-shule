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

function emptyAccountantOverview() {
  return {
    generated_at: "2026-07-24T08:00:00.000Z",
    metrics: {
      collected_today_minor: "0",
      receipts_today_count: 0,
      outstanding_balance_minor: "0",
      balances_above_threshold_count: 0,
      open_invoice_count: 0,
      mpesa_review_count: 0,
      active_fee_structure_count: 0,
    },
    recent_activity: [],
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

      if (url.includes("admin-command/accountant/overview")) {
        return Promise.resolve(jsonResponse({
          data: emptyAccountantOverview(),
          meta: {},
        }));
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

  it("navigates the integrated finance command center to a real workspace", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      createElement(SchoolPages, {
        role: "bursar",
        section: "finance",
        tenantSlug: "barakaacademy",
        routeMode: "public",
      }),
    );

    expect(await screen.findByTestId("accountant-command-center")).toBeVisible();
    expect(screen.getByRole("heading", { name: /bursar dashboard/i })).toBeVisible();
    expect(await screen.findByText(/no school finance records yet/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /fee structures configure school-owned charges/i }));

    expect(screen.getAllByRole("heading", { name: /fee structures/i }).length).toBeGreaterThan(0);
    expect(window.location.pathname).toBe("/school/bursar/fee-structures");
  });

  it("loads the tenant-scoped finance read model without fabricated metrics", async () => {
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/school/modules/me")) {
        return Promise.resolve(jsonResponse({ data: enabledSchoolModules }));
      }

      if (url.includes("admin-command/accountant/overview")) {
        expect(init).toEqual(
          expect.objectContaining({
            credentials: "include",
            headers: expect.objectContaining({
              "x-tenant-id": "barakaacademy",
            }),
          }),
        );
        return Promise.resolve(jsonResponse({
          data: emptyAccountantOverview(),
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({}));
    }) as unknown as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;

    renderWithProviders(
      createElement(SchoolPages, { role: "bursar", section: "finance", tenantSlug: "barakaacademy" }),
    );

    expect(await screen.findByText(/no school finance records yet/i)).toBeVisible();
    expect(screen.getAllByText("KES 0").length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).includes("admin-command/accountant/overview"),
        ),
      ).toBe(true);
    });
  });

  it("starts learner admission from the admissions-owned workflow instead of a generic shortcut", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/admissions/foundation")) {
        return jsonResponse({
          academic_years: [{ id: "year-2026", name: "2026", status: "active", is_current: true }],
          classes: [{
            id: "class-grade-7",
            academic_year_id: "year-2026",
            academic_level_id: "level-grade-7",
            name: "Grade 7 North",
            grade_level: "Grade 7",
            curriculum: "CBC",
            capacity: 45,
            enrolment_open: true,
            student_count: 0,
          }],
          streams: [{
            id: "stream-north",
            class_section_id: "class-grade-7",
            name: "North",
            capacity: 45,
            student_count: 0,
          }],
          subjects: [],
          class_subject_assignments: [],
          admission_settings: {
            admission_number_mode: "suggested",
            admission_number_prefix: "MS",
            admission_number_separator: "-",
            admission_number_padding: 4,
            include_academic_year: true,
            strict_capacity: true,
            strict_age_rules: false,
            minimum_age: null,
            maximum_age: null,
            minimum_subjects: 0,
            maximum_subjects: 12,
            suggested_admission_number: "MS-2026-0001",
          },
        });
      }

      if (url.includes("/api/admissions/drafts/current")) {
        return jsonResponse(null);
      }

      return jsonResponse({
        metrics: { total: 0, pending: 0, approved: 0, rejected: 0 },
        applicationsList: [],
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(
      createElement(SchoolPages, {
        role: "admissions",
        tenantSlug: "barakaacademy",
        section: "applications",
      }),
    );

    const dashboard = await screen.findByTestId("admissions-dashboard-command-center");
    await user.click(within(dashboard).getByRole("button", { name: /start student admission/i }));

    expect(await within(dashboard).findByLabelText(/^First name/i)).toBeVisible();
    expect(within(dashboard).getByText("Class & Stream")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/admissions/foundation"),
      expect.anything(),
    );
  });

  it("keeps the superadmin schools surface empty until real schools are onboarded", () => {
    renderWithProviders(createElement(SuperadminPages, { section: "schools" }));

    expect(screen.getByRole("heading", { name: /school control/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /nothing to show yet/i })).toBeVisible();
    expect(screen.queryByRole("button", { name: /open school/i })).not.toBeInTheDocument();
  });

  it("resends a failed principal invite from the Super Admin schools table with truthful success feedback", async () => {
    const user = userEvent.setup();
    const originalFetch = global.fetch;
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/platform/schools/homabay-high/admin-invite/resend")) {
        return Promise.resolve(jsonResponse({
          tenant_id: "homabay-high",
          school_name: "Homabay High",
          subdomain: "homabay-high",
          status: "active",
          invitation_sent: true,
          invitation_status: "sent",
          invitation_message: "School created. Invitation sent to principal@homabay.ac.ke.",
          can_resend_invite: false,
          invite_expires_at: "2026-07-13T00:00:00.000Z",
          admin_email: "principal@homabay.ac.ke",
          created_at: "2026-07-06T00:00:00.000Z",
          enabled_modules: ["students", "staff"],
        }));
      }

      if (url.includes("/api/platform/schools")) {
        return Promise.resolve(jsonResponse([
          {
            tenant_id: "homabay-high",
            school_name: "Homabay High",
            subdomain: "homabay-high",
            status: "active",
            invitation_sent: false,
            invitation_status: "failed",
            invitation_message: "School created. The invite could not be delivered yet. You can resend it.",
            can_resend_invite: true,
            invite_expires_at: "2026-07-13T00:00:00.000Z",
            admin_email: "principal@homabay.ac.ke",
            created_at: "2026-07-06T00:00:00.000Z",
            enabled_modules: ["students", "staff"],
          },
        ]));
      }

      if (url.includes("/api/platform/modules")) {
        return Promise.resolve(jsonResponse([]));
      }

      return Promise.resolve(jsonResponse({ token: "csrf-token" }));
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      renderWithProviders(createElement(SuperadminPages, { section: "schools" }));

      await waitFor(() => expect(screen.getAllByText("Homabay High").length).toBeGreaterThan(0));
      await user.click(screen.getAllByRole("button", { name: /resend invite to homabay high/i })[0]);

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/platform/schools/homabay-high/admin-invite/resend",
          expect.objectContaining({ method: "POST" }),
        ),
      );
      const status = await screen.findByRole("status");
      expect(status).toHaveTextContent("School created. Invitation sent to principal@homabay.ac.ke.");
      expect(screen.queryByText("School created. The invite could not be delivered yet. You can resend it.")).not.toBeInTheDocument();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("updates the visible Super Admin school billing status after manual billing changes", async () => {
    const user = userEvent.setup();
    const originalFetch = global.fetch;
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/platform/schools/homabay-high/billing")) {
        expect(init?.method).toBe("PATCH");
        expect(JSON.parse(String(init?.body))).toEqual(
          expect.objectContaining({
            state: "active",
            note: "Manual Superadmin billing state: Active",
          }),
        );

        return Promise.resolve(jsonResponse({
          tenant_id: "homabay-high",
          school_name: "Homabay High",
          subdomain: "homabay-high",
          status: "active",
          invitation_sent: true,
          invitation_status: "sent",
          invitation_message: "Invitation sent.",
          can_resend_invite: false,
          invite_expires_at: "2026-07-13T00:00:00.000Z",
          admin_email: "principal@homabay.ac.ke",
          created_at: "2026-07-06T00:00:00.000Z",
          enabled_modules: ["students", "finance"],
          billing: {
            state: "active",
            label: "Active",
            access_mode: "full",
            plan_code: "manual",
            configured_at: "2026-07-15T00:00:00.000Z",
            note: "Manual Superadmin billing state: Active",
          },
        }));
      }

      if (url.includes("/api/platform/schools")) {
        return Promise.resolve(jsonResponse([
          {
            tenant_id: "homabay-high",
            school_name: "Homabay High",
            subdomain: "homabay-high",
            status: "active",
            invitation_sent: true,
            invitation_status: "sent",
            invitation_message: "Invitation sent.",
            can_resend_invite: false,
            invite_expires_at: "2026-07-13T00:00:00.000Z",
            admin_email: "principal@homabay.ac.ke",
            created_at: "2026-07-06T00:00:00.000Z",
            enabled_modules: ["students", "finance"],
            billing: {
              state: "not_configured",
              label: "Not configured",
              access_mode: null,
              plan_code: null,
            },
          },
        ]));
      }

      if (url.includes("/api/platform/modules")) {
        return Promise.resolve(jsonResponse([]));
      }

      if (url.includes("/api/workflow/events")) {
        return Promise.resolve(jsonResponse({ id: "evt-billing-updated" }));
      }

      return Promise.resolve(jsonResponse({ token: "csrf-token" }));
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      renderWithProviders(createElement(SuperadminPages, { section: "schools" }));

      await waitFor(() => expect(screen.getAllByText("Homabay High").length).toBeGreaterThan(0));
      expect(screen.getAllByText("Not configured").length).toBeGreaterThan(0);

      await user.selectOptions(
        screen.getAllByRole("combobox", { name: /set billing state for homabay high/i })[0],
        "active",
      );

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/platform/schools/homabay-high/billing",
          expect.objectContaining({ method: "PATCH" }),
        ),
      );
      await waitFor(() => expect(screen.getAllByText("Active").length).toBeGreaterThan(0));
      expect(screen.getByRole("status")).toHaveTextContent("Homabay High billing set to Active.");
    } finally {
      global.fetch = originalFetch;
    }
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

  it("loads parent fee statements from the authenticated school contract", async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/permissions/me")) {
        return Promise.resolve(jsonResponse({ data: [] }));
      }
      if (url.includes("/api/school/identity")) {
        return Promise.resolve(jsonResponse({
          data: { schoolName: "Lakeview School", logoUrl: null },
          meta: {},
        }));
      }
      if (url.includes("/api/admin-command/parent/fees")) {
        return Promise.resolve(jsonResponse({
          data: {
            metrics: { balance_minor: 125000, open_invoices: 1, payments: 0 },
            accounts: [{
              student_id: "student-1",
              admission_number: "ADM-001",
              student_name: "Learner One",
              class_name: "Grade 8",
              balance_minor: 125000,
              open_invoices: 1,
            }],
            invoices: [{
              id: "invoice-1",
              student_id: "student-1",
              student_name: "Learner One",
              invoice_number: "INV-001",
              term: "Term 1",
              academic_year: "2026",
              amount_minor: 125000,
              balance_minor: 125000,
              status: "issued",
              created_at: "2026-01-05T00:00:00.000Z",
            }],
            transactions: [],
          },
          meta: {},
        }));
      }

      return Promise.resolve(jsonResponse({ data: {}, meta: {} }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      renderWithProviders(
        createElement(PortalPages, {
          viewer: "parent",
          section: "fees",
          tenantSlug: "lakeview-school",
          userLabel: "Grace Parent",
        }),
      );

      expect(await screen.findByText("Learner One's balance")).toBeVisible();
      expect(screen.getByText("INV-001")).toBeVisible();
      expect(screen.getByRole("button", { name: /preview statement/i })).toBeEnabled();
      expect(screen.queryByRole("button", { name: /record payment/i })).not.toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin-command/parent/fees"),
        expect.objectContaining({
          headers: expect.objectContaining({ "x-tenant-id": "lakeview-school" }),
        }),
      );
    } finally {
      global.fetch = originalFetch;
    }
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
        role: "bursar",
        tenantSlug: "barakaacademy",
        section: "m-pesa-reconciliation",
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
