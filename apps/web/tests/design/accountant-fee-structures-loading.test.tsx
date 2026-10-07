import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FeeStructuresWorkspace } from "@/components/school/accountant/fee-structures-workspace";

const mockRefetch = jest.fn();
let mockOverviewError: Error | null = null;
jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: (path: string) => ({
    data: path.includes("finance-activity") ? [] : mockOverviewError ? undefined : { metrics: { collected_today_minor: "123400", outstanding_balance_minor: "987600", mpesa_review_count: 2 } },
    isError: Boolean(mockOverviewError), error: mockOverviewError, isLoading: false, isFetching: false, refetch: mockRefetch,
  }),
}));
jest.mock("@/components/school/school-pages", () => ({
  SubscriptionLifecyclePanel: () => null,
  buildFeeStructureLineItems: () => [],
  buildBulkFeeStudents: () => [],
}));
jest.mock("@/components/common/learner-picker", () => ({ LearnerPicker: () => null }));

const report = {
  rows: [], method_summaries: [],
  totals: { cleared_amount_minor: "123400", pending_amount_minor: "10000", exception_amount_minor: "0", transaction_count: 1 },
};
const originalFetch = global.fetch;
let fetchMock: jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  mockOverviewError = null;
  fetchMock = jest.fn(async (url: string) => ({ ok: true, json: async () => ({ data: url.includes("reconciliation") ? report : [] }) }));
  global.fetch = fetchMock;
});
afterEach(() => { global.fetch = originalFetch; });

test.each([true, false])("loads fees and reconciliation on entry with an enveloped response: %s", async (enveloped) => {
  fetchMock.mockImplementation(async (url: string) => {
    const data = url.includes("reconciliation") ? report : [];
    return { ok: true, json: async () => enveloped ? { data } : data };
  });
  render(<FeeStructuresWorkspace role="accountant" tenantSlug="school-a" routeMode="public" />);
  await waitFor(() => expect(screen.queryAllByText(/Loading/)).toHaveLength(0));
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls.every(([url]) => url.includes("tenant_slug=school-a"))).toBe(true);
  expect(fetchMock.mock.calls.some(([url]) => url.includes("reconciliation"))).toBe(true);
  expect(screen.getByText("Today Collections")).toBeVisible();
  expect(screen.getAllByText(/1,234/).length).toBeGreaterThan(0);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("failed reads leave visible recovery instead of loading forever or showing zero totals", async () => {
  mockOverviewError = new Error("Finance totals temporarily unavailable");
  fetchMock.mockResolvedValue({ ok: false, json: async () => ({ message: "School records temporarily unavailable" }) });
  render(<FeeStructuresWorkspace role="accountant" tenantSlug="school-a" routeMode="public" />);
  await waitFor(() => expect(screen.queryAllByText(/Loading/)).toHaveLength(0));
  expect(screen.getAllByRole("alert")).toHaveLength(3);
  expect(screen.getAllByText("Unavailable")).toHaveLength(7);
  fireEvent.click(screen.getByRole("button", { name: "Retry finance totals" }));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
  fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () => ({ data: url.includes("reconciliation") ? report : [] }) }));
  fireEvent.click(screen.getByRole("button", { name: "Run" }));
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1));
  await waitFor(() => expect(screen.getByRole("button", { name: "Run" })).toBeEnabled());
});

test("leaving the workspace cancels pending finance reads", () => {
  fetchMock.mockImplementation(() => new Promise(() => {}));
  const view = render(<FeeStructuresWorkspace role="accountant" tenantSlug="school-a" routeMode="public" />);
  const signals = fetchMock.mock.calls.map(([, options]) => options.signal as AbortSignal);
  expect(signals).toHaveLength(2);
  expect(signals.every(signal => !signal.aborted)).toBe(true);
  view.unmount();
  expect(signals.every(signal => signal.aborted)).toBe(true);
});

test("timed out reads end loading and explain how to recover", async () => {
  const timeout = new AbortController();
  const timeoutSpy = jest.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
  fetchMock.mockImplementation((_url: string, options: RequestInit) => new Promise((_, reject) => {
    options.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
  }));
  try {
    render(<FeeStructuresWorkspace role="accountant" tenantSlug="school-a" routeMode="public" />);
    expect(timeoutSpy).toHaveBeenCalledWith(15_000);
    timeout.abort(new DOMException("Timed out", "TimeoutError"));
    await screen.findByText("Reconciliation took too long. Please run the report again.");
    expect(screen.getByText("Fee structures took too long to load. Please refresh.")).toBeVisible();
    expect(screen.queryAllByText(/Loading/)).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Run" })).toBeEnabled();
  } finally {
    timeoutSpy.mockRestore();
  }
});
