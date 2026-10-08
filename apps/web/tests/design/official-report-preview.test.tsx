import { act, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { OfficialReportPreview } from "@/components/report-cards/official-report-preview";
import { requestSchoolApiProxy } from "@/lib/dashboard/school-api-proxy-client";
import { loadPdfEngine } from "@/lib/report-cards/pdf-engine";

jest.mock("@/lib/dashboard/school-api-proxy-client", () => ({ requestSchoolApiProxy: jest.fn() }));
jest.mock("@/lib/report-cards/pdf-engine", () => ({ loadPdfEngine: jest.fn() }));
const api = jest.mocked(requestSchoolApiProxy);
const engine = jest.mocked(loadPdfEngine);
const cancel = jest.fn();
const destroy = jest.fn().mockResolvedValue(undefined);
const renderPage = jest.fn().mockReturnValue({ promise: Promise.resolve(), cancel });

beforeEach(() => {
  jest.clearAllMocks();
  global.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  api.mockResolvedValue({ state: "ready", download_url: "/exams/report-cards/card/download" });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(12) });
  engine.mockResolvedValue({ getDocument: () => ({ destroy, promise: Promise.resolve({ numPages: 1, getPage: async () => ({ getTextContent: async () => ({ items: [{ str: "Saved academic results" }] }), getViewport: ({ scale }: { scale: number }) => ({ width: 595.28 * scale, height: 841.89 * scale }), render: renderPage }) }) }) } as never);
});

test("prepares the authoritative artifact and renders its PDF bytes, not a second HTML document", async () => {
  const view = render(<OfficialReportPreview reportId="card" learnerName="Learner" />);
  await screen.findByText("Saved academic results");
  await waitFor(() => expect(renderPage).toHaveBeenCalled());
  expect(api).toHaveBeenCalledWith("/exams/report-cards/card/prepare-download", { method: "POST" });
  expect(fetch).toHaveBeenCalledWith("/api/exams/report-cards/card/preview", expect.objectContaining({ headers: { Accept: "application/pdf" }, cache: "no-store", credentials: "same-origin" }));
  expect(screen.queryByTestId("report-card-document")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(screen.getByText("125%")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Fit page width" }));
  expect(screen.getByText("100%")).toBeInTheDocument();
  view.unmount();
  expect(destroy).toHaveBeenCalled();
});

test("a failed preparation stays visible and retry reuses the same report id", async () => {
  api.mockRejectedValueOnce(new Error("Report changed. Regenerate this report."));
  render(<OfficialReportPreview reportId="card" learnerName="Learner" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Report changed");
  fireEvent.click(screen.getByRole("button", { name: "Retry preview" }));
  await screen.findByText("Saved academic results");
  expect(api).toHaveBeenCalledTimes(2);
});

test("closing a pending preview prevents subsequent PDF fetches", async () => {
  let finish!: (value: unknown) => void;
  api.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<OfficialReportPreview reportId="card" learnerName="Learner" />);
  view.unmount();
  await act(async () => { finish({ state: "ready", download_url: "/download" }); });
  expect(fetch).not.toHaveBeenCalled();
});

test("a multi-page artifact is rejected visibly instead of displaying only its first page", async () => {
  engine.mockResolvedValueOnce({ getDocument: () => ({ destroy, promise: Promise.resolve({ numPages: 2 }) }) } as never);
  render(<OfficialReportPreview reportId="card" learnerName="Learner" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("not a single A4 page");
  expect(renderPage).not.toHaveBeenCalled();
});
