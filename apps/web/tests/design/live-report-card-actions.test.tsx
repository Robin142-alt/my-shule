import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LiveReportCardsWorkspace } from "@/components/school/live-report-cards-workspace";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestSchoolApiProxy } from "@/lib/dashboard/school-api-proxy-client";
import type { LiveExamReportCard } from "@/lib/modules/exams-client";

jest.mock("@/components/school/integrated-school-command-header", () => ({
  useSchoolCommandIdentity: () => ({
    schoolName: "Kibabi School",
    logoUrl: null,
    userLabel: "Exam Manager",
  }),
}));

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: jest.fn(),
}));

jest.mock("@/lib/dashboard/school-api-proxy-client", () => ({
  requestSchoolApiProxy: jest.fn(),
}));

const mockUseSchoolQuery = useSchoolQuery as jest.Mock;
const mockRequestSchoolApiProxy = requestSchoolApiProxy as jest.Mock;
const originalFetch = globalThis.fetch;

function reportCard(overrides: Partial<LiveExamReportCard> = {}): LiveExamReportCard {
  return {
    id: "report-1",
    exam_series_id: "series-1",
    exam_series_name: "Term 3",
    student_id: "student-1",
    student_name: "Robinson Ogada",
    admission_number: "ADM-00001",
    term: "Term 3",
    academic_year: "2026",
    report_snapshot_id: "snapshot-1",
    status: "draft_generated",
    verification_code: "KIBABI-REPORT-1",
    revision_number: 1,
    updated_at: "2026-08-31T08:00:00.000Z",
    metadata: {
      report_card: {
        template_fields: { learner_name: "Robinson Ogada" },
        subjects: [],
      },
    },
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

function installQueries(reports: LiveExamReportCard[]) {
  const reportRefetch = jest.fn().mockResolvedValue({ data: reports });
  const markSheetRefetch = jest.fn().mockResolvedValue({ data: [] });

  mockUseSchoolQuery.mockImplementation((path: string | null) => {
    if (path?.startsWith("/exams/report-cards/scoped?")) {
      return {
        data: reports,
        error: null,
        isLoading: false,
        refetch: reportRefetch,
      };
    }

    return {
      data: [],
      error: null,
      isLoading: false,
      refetch: markSheetRefetch,
    };
  });

  return { reportRefetch, markSheetRefetch };
}

describe("live report-card action controls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: originalFetch,
    });
  });

  it("submits the selected persisted card, exposes row-local progress, and locks sibling actions while pending", async () => {
    const report = reportCard();
    const transition = deferred<{ message: string }>();
    const { reportRefetch } = installQueries([report]);
    mockRequestSchoolApiProxy.mockImplementation(() => transition.promise);
    const user = userEvent.setup();

    render(<LiveReportCardsWorkspace audience="exams-manager" />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByRole("button", { name: "Submitting..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Download" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Regenerate" })).toBeDisabled();
    expect(screen.getByText("Submitting report card...")).toHaveAttribute("aria-live", "polite");
    expect(mockRequestSchoolApiProxy).toHaveBeenCalledWith(
      "/exams/report-cards/report-1/transition",
      {
        method: "PATCH",
        body: { action: "submit" },
      },
    );

    await act(async () => {
      transition.resolve({ message: "Report card submitted for Dean review." });
      await transition.promise;
    });

    await waitFor(() => {
      expect(screen.getAllByText("Report card submitted for Dean review.")).toHaveLength(2);
    });
    expect(reportRefetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();
  });

  it("sends a deterministic correction reason when regenerating from locked marks", async () => {
    const report = reportCard({ status: "regeneration_required" });
    const regeneration = deferred<Record<string, unknown>>();
    const { reportRefetch } = installQueries([report]);
    mockRequestSchoolApiProxy.mockImplementation(() => regeneration.promise);
    const user = userEvent.setup();

    render(<LiveReportCardsWorkspace audience="exams-manager" />);

    await user.click(screen.getByRole("button", { name: "Regenerate" }));

    expect(screen.getByRole("button", { name: "Regenerating..." })).toBeDisabled();
    expect(screen.getByText("Regenerating this report card from the latest locked marks...")).toBeInTheDocument();
    expect(mockRequestSchoolApiProxy).toHaveBeenCalledWith(
      "/exams/report-cards/regenerate",
      {
        method: "POST",
        body: {
          exam_series_id: "series-1",
          student_id: "student-1",
          reason: "Manual correction regeneration",
        },
      },
    );

    await act(async () => {
      regeneration.resolve({ id: "report-2" });
      await regeneration.promise;
    });

    await waitFor(() => {
      expect(screen.getAllByText(/new current report-card revision was generated/i)).toHaveLength(2);
    });
    expect(reportRefetch).toHaveBeenCalledTimes(1);
  });

  it("prepares an authenticated PDF and opens private delivery without buffering it in JavaScript", async () => {
    const report = reportCard();
    installQueries([report]);
    const pdfBlob = new Blob(["official report card"], { type: "application/pdf" });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => name.toLowerCase() === "content-disposition"
          ? "attachment; filename*=UTF-8''Robinson_Ogada_Term_3.pdf"
          : null,
      },
      blob: async () => pdfBlob,
    } as Response);
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });
    const createObjectURL = jest.fn(() => "blob:report-card-1");
    const revokeObjectURL = jest.fn();
    Object.defineProperty(window.URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(window.URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    let downloadedFilename = "";
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function click(this: HTMLAnchorElement) {
      downloadedFilename = this.download;
    });
    const user = userEvent.setup();

    const privateUrl='https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com/reports/random.pdf?X-Amz-Signature=test';
    mockRequestSchoolApiProxy.mockResolvedValue({state:'ready',download_url:privateUrl});

    render(<LiveReportCardsWorkspace audience="exams-manager" />);
    await user.click(screen.getByRole("button", { name: "Download" }));

    await waitFor(() => expect(mockRequestSchoolApiProxy).toHaveBeenCalledWith(
      "/exams/report-cards/report-1/prepare-download", {method:'POST'}));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(downloadedFilename).toBe("report-card-report-1.pdf");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getAllByText("Official report-card download opened.")).toHaveLength(2);
    });
  });
});

describe("report-card PDF proxy contract", () => {
  it("forwards the caller Accept header and preserves PDF download response headers", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "lib", "dashboard", "server-api-proxy.ts"),
      "utf8",
    );

    expect(source).toContain('const acceptHeader = request.headers.get("accept") ?? "application/json"');
    expect(source).toContain("Accept: wantsEventStream ? EVENT_STREAM_CONTENT_TYPE : acceptHeader");
    expect(source).toContain('upstreamResponse.headers.get("content-disposition")');
    expect(source).toContain('upstreamResponse.headers.get("cache-control") ?? "no-store"');
  });
});
