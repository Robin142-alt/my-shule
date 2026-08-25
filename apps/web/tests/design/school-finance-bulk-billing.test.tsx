import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";

import { renderWithProviders } from "./test-utils";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return {
    status: init?.status ?? 200,
    ok: (init?.status ?? 200) >= 200 && (init?.status ?? 200) < 300,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("school finance bulk billing", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-bulk-billing-token" }));
      }

      if (url.includes("/api/billing/finance-activity")) {
        return Promise.resolve(jsonResponse([]));
      }

      if (url.includes("/api/billing/student-balances")) {
        return Promise.resolve(jsonResponse([]));
      }

      if (url.includes("/api/billing/reconciliation")) {
        return Promise.resolve(
          jsonResponse({
            period: { from: "2026-06-01", to: "2026-06-06", payment_method: null },
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
          }),
        );
      }

      if (url.includes("/api/billing/fee-structures/fee-term-2/billable-students")) {
        return Promise.resolve(
          jsonResponse([
            {
              student_id: "student-brian",
              student_name: "Brian Otieno",
              admission_number: "KBI/2026/044",
              grade_level: "Form 2",
              class_name: "East",
              guardian_phone: "0712 345 678",
            },
            {
              student_id: "student-faith",
              student_name: "Faith Akinyi",
              admission_number: "KBI/2025/118",
              grade_level: "Grade 8",
              class_name: "West",
              guardian_phone: "0798 111 222",
            },
          ]),
        );
      }

      if (url.includes("/api/billing/fee-structures/fee-term-2/generate-invoices")) {
        expect(init?.method).toBe("POST");
        expect(init?.headers).toEqual(expect.objectContaining({ "x-myshule-csrf": "csrf-bulk-billing-token" }));
        const body = JSON.parse(String(init?.body));
        expect(body.target_students).toEqual([
          expect.objectContaining({
            student_id: "student-brian",
            student_name: "Brian Otieno",
            admission_number: "KBI/2026/044",
          }),
        ]);
        return Promise.resolve(jsonResponse({ fee_structure_id: "fee-term-2", idempotency_key: body.idempotency_key, generated_count: 1, skipped_count: 0 }));
      }

      if (url.includes("/api/billing/fee-structures")) {
        return Promise.resolve(
          jsonResponse([
            {
              id: "fee-term-2",
              name: "Term 2 Fees",
              academic_year: "2026",
              term: "Term 2",
              grade_level: "Form 2",
              class_name: "East",
              currency_code: "KES",
              status: "active",
              due_days: 14,
              line_items: [{ code: "tuition", label: "Tuition", amount_minor: "1200000" }],
              total_amount_minor: "1200000",
              created_at: "2026-06-01T00:00:00.000Z",
            },
          ]),
        );
      }

      if (url.includes("/api/payments/mpesa/c2b/payments")) {
        return Promise.resolve(jsonResponse([]));
      }

      if (url.includes("/api/billing/manual-fee-payments")) {
        return Promise.resolve(jsonResponse([]));
      }

      return Promise.resolve(jsonResponse({ message: `Unhandled ${url}` }, { status: 404 }));
    });
    global.fetch = fetchMock;
  });

  it("requires selecting billable roster learners before generating bulk invoices", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="accountant" section="fee-structures" tenantSlug="kisumu-boys" liveDataEnabled={false} />);

    await screen.findByRole("heading", { name: /collections desk/i });
    await user.selectOptions(await screen.findByLabelText(/bulk billing fee structure/i), "fee-term-2");
    await user.click(screen.getByRole("button", { name: /load roster/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Brian Otieno/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Faith Akinyi/i).length).toBeGreaterThan(0);
    });
    expect(screen.getByRole("button", { name: /generate invoices/i })).toBeDisabled();

    await user.click(screen.getAllByRole("checkbox", { name: /select Brian Otieno for bulk billing/i })[0]);
    expect(screen.getAllByText(/1 selected/i).some((element) => element.textContent?.includes("1 selected"))).toBe(true);
    expect(screen.getByRole("button", { name: /generate invoices/i })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /generate invoices/i }));

    await waitFor(() => {
      expect(screen.getByText(/1 invoices generated; 0 duplicate rows skipped/i)).toBeVisible();
    });

    const generateCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/generate-invoices"));
    expect(generateCalls).toHaveLength(1);
    expect(within(screen.getByText(/billable roster/i).closest("section") ?? document.body).queryByText(/2 selected/i)).not.toBeInTheDocument();
  });
});
