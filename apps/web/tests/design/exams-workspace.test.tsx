import { createElement } from "react";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ExamsModuleScreen } from "@/components/modules/exams/exams-module-screen";
import { SchoolPages } from "@/components/school/school-pages";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { isSchoolSectionEnabled } from "@/lib/module-access/module-access-map";
import { mapExamsWorkspaceFromLive } from "@/lib/modules/exams-client";

import { renderWithProviders } from "./test-utils";

jest.mock("@/hooks/use-live-tenant-session", () => ({
  useLiveTenantSession: jest.fn(),
}));

const mockUseLiveTenantSession = useLiveTenantSession as jest.MockedFunction<typeof useLiveTenantSession>;

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

const enabledModules = [
  "academics",
  "admissions",
  "billing",
  "exams",
  "reports",
  "students",
];

function mockLiveExamsSession() {
  mockUseLiveTenantSession.mockReturnValue({
    apiConfigured: true,
    session: {
      tenantId: "barakaacademy",
      user: {
        id: "teacher-1",
        display_name: "Beatrice Wanjiku",
        email: "teacher@example.test",
        role: "teacher",
        tenant_id: "barakaacademy",
      },
    },
    user: {
      id: "teacher-1",
      display_name: "Beatrice Wanjiku",
      email: "teacher@example.test",
      role: "teacher",
      tenant_id: "barakaacademy",
    },
    isLoading: false,
    isSubmitting: false,
    error: null,
    login: jest.fn(),
    logout: jest.fn(),
    clearError: jest.fn(),
  } as never);
}

function installLiveExamsFetchMock() {
  const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.includes("/api/school/modules/me")) {
      return Promise.resolve(jsonResponse({ data: enabledModules }));
    }

    if (url.includes("/api/auth/csrf")) {
      return Promise.resolve(jsonResponse({ token: "csrf-exams-token" }));
    }

    if (url.includes("/api/exams/mark-sheets")) {
      return Promise.resolve(jsonResponse({
        data: [
          {
            id: "window-1",
            exam_series_id: "series-1",
            academic_term_id: "term-1",
            subject_id: "subject-maths",
            subject_name: "Mathematics",
            class_section_id: "class-8-unity",
            class_name: "Grade 8 Unity",
            opens_at: "2026-05-20T06:00:00.000Z",
            closes_at: "2026-05-24T14:00:00.000Z",
            status: "open",
            mark_count: 42,
            learner_count: 46,
            last_marked_at: "2026-05-20T09:15:00.000Z",
          },
        ],
      }));
    }

    if (url.includes("/api/exams/report-cards/batches/batch-1")) {
      return Promise.resolve(jsonResponse({
        data: {
          id: "batch-1",
          status: "draft_generated",
          total_count: 46,
          processed_count: 44,
          failed_count: 0,
          artifact_count: 44,
          queue_status: "running",
        },
      }));
    }

    if (url.includes("/api/exams/report-cards") && init?.method !== "POST") {
      return Promise.resolve(jsonResponse({
        data: [
          {
            id: "report-card-1",
            exam_series_id: "series-1",
            student_id: "student-1",
            report_snapshot_id: "snapshot-1",
            status: "approved",
            metadata: {
              artifact: {
                id: "artifact-1",
                verification_code: "BARAKA-8U-2026",
                pdf_url: "/api/exams/report-cards/download/report-token",
                checksum_sha256: "abc123",
                generated_at: "2026-05-20T10:00:00.000Z",
              },
              report_card: {
                learner_name: "Aisha Njeri",
                class_name: "Grade 8 Unity",
                total_score: 412,
                mean_score: 82.4,
              },
            },
            published_at: null,
          },
        ],
      }));
    }

    if (url.endsWith("/api/exams/marks")) {
      return Promise.resolve(jsonResponse({
        data: {
          id: "mark-1",
          student_id: "student-1",
          score: 84,
          status: "draft",
        },
      }));
    }

    if (url.includes("/api/exams/marks/bulk-upload")) {
      return Promise.resolve(jsonResponse({
        data: {
          mode: "preview",
          valid_count: 1,
          invalid_count: 0,
          duplicate_count: 0,
          preview_token: "preview-1",
        },
      }));
    }

    if (url.includes("/api/exams/mark-sheets/window-1/lock")) {
      return Promise.resolve(jsonResponse({
        data: {
          id: "window-1",
          status: "closed",
        },
      }));
    }

    if (url.includes("/api/exams/marks/corrections")) {
      return Promise.resolve(jsonResponse({
        data: {
          id: "mark-1",
          score: 86,
        },
      }));
    }

    if (url.includes("/api/exams/report-cards/generate")) {
      return Promise.resolve(jsonResponse({
        data: {
          id: "report-card-1",
          exam_series_id: "series-1",
          student_id: "student-1",
          report_snapshot_id: "snapshot-generated",
          status: "draft_generated",
          metadata: {
            artifact: {
              id: "artifact-generated",
              verification_code: "BARAKA-GEN-2026",
              pdf_url: "/api/exams/report-cards/download/generated-token",
              checksum_sha256: "generated123",
              generated_at: "2026-05-20T11:00:00.000Z",
            },
            report_card: {
              learner_name: "Aisha Njeri",
              class_name: "Grade 8 Unity",
              total_score: 414,
              mean_score: 82.8,
            },
          },
        },
      }));
    }

    if (url.includes("/api/exams/report-cards/batches")) {
      return Promise.resolve(jsonResponse({
        data: {
          id: "batch-1",
          status: "draft_generated",
          total_count: 46,
          processed_count: 44,
          failed_count: 0,
          artifact_count: 44,
          queue_status: "running",
        },
      }));
    }

    if (url.includes("/api/exams/report-cards/publish")) {
      return Promise.resolve(jsonResponse({
        data: {
          id: "report-card-1",
          status: "published",
        },
      }));
    }

    return Promise.resolve(jsonResponse({ data: [] }));
  });

  global.fetch = fetchMock as unknown as typeof fetch;

  return fetchMock;
}

function buildInitialLiveExamsWorkspace() {
  return mapExamsWorkspaceFromLive({
    markSheets: [
      {
        id: "window-1",
        exam_series_id: "series-1",
        academic_term_id: "term-1",
        assessment_id: "assessment-1",
        subject_id: "subject-maths",
        subject_name: "Mathematics",
        class_section_id: "class-8-unity",
        class_name: "Grade 8 Unity",
        opens_at: "2026-05-20T06:00:00.000Z",
        closes_at: "2026-05-24T14:00:00.000Z",
        status: "open",
        mark_count: 42,
        learner_count: 46,
        last_marked_at: "2026-05-20T09:15:00.000Z",
      },
    ],
    reportCards: [
      {
        id: "report-card-1",
        exam_series_id: "series-1",
        student_id: "student-1",
        report_snapshot_id: "snapshot-1",
        status: "approved",
        metadata: {
          artifact: {
            id: "artifact-1",
            verification_code: "BARAKA-8U-2026",
            pdf_url: "/api/exams/report-cards/download/report-token",
            checksum_sha256: "abc123",
            generated_at: "2026-05-20T10:00:00.000Z",
          },
          report_card: {
            learner_name: "Aisha Njeri",
            class_name: "Grade 8 Unity",
            total_score: 412,
            mean_score: 82.4,
          },
        },
        published_at: null,
      },
    ],
  });
}

describe("exams workspace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      if (String(input).includes("/api/school/modules/me")) {
        return Promise.resolve({
          ok: true,
          json: async () => ["exams"],
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as Response);
    }) as unknown as typeof fetch;
    mockUseLiveTenantSession.mockReturnValue({
      apiConfigured: false,
      session: null,
      user: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
    } as never);
  });

  it("opens the implemented exams command center from the school workspace", async () => {
    await act(async () => {
      renderWithProviders(
        createElement(SchoolPages, {
          role: "teacher",
          section: "exams",
          tenantSlug: "barakaacademy",
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

  expect(
    screen.getAllByRole("heading", { name: /teaching desk/i }).length,
  ).toBeGreaterThan(0);
  expect(
    screen.getAllByRole("button", { name: /open academic review ready/i }).length,
  ).toBeGreaterThan(0);
});

  it("blocks the exams workspace when the tenant module is disabled", async () => {
    expect(isSchoolSectionEnabled("exams", ["students", "billing"])).toBe(false);
    expect(isSchoolSectionEnabled("exams", ["students", "billing", "exams"])).toBe(true);
  });

  it("saves live marks, previews uploads, and locks assigned teacher mark sheets", async () => {
    const user = userEvent.setup();
    mockLiveExamsSession();
    const fetchMock = installLiveExamsFetchMock();

    renderWithProviders(
      createElement(ExamsModuleScreen, {
        role: "teacher",
        schoolName: "Baraka Academy",
        tenantSlug: "barakaacademy",
        initialLiveWorkspace: buildInitialLiveExamsWorkspace(),
        liveSessionOverride: mockUseLiveTenantSession(),
      }),
    );

    expect(await screen.findByText(/Grade 8 Unity - Mathematics/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /save mark/i }));
    expect(await screen.findByText(/mark saved to live exams ledger/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /preview upload/i }));
    expect(await screen.findByText(/bulk upload preview accepted/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /lock sheet/i }));
    expect(await screen.findByText(/mark sheet locked for approval/i)).toBeVisible();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/exams/marks"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-myshule-csrf": "csrf-exams-token",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/exams/mark-sheets/window-1/lock"),
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("generates report-card previews, polls batch progress, and publishes as principal", async () => {
    const user = userEvent.setup();
    mockLiveExamsSession();
    const fetchMock = installLiveExamsFetchMock();

    renderWithProviders(
      createElement(ExamsModuleScreen, {
        role: "principal",
        schoolName: "Baraka Academy",
        tenantSlug: "barakaacademy",
        initialLiveWorkspace: buildInitialLiveExamsWorkspace(),
        liveSessionOverride: mockUseLiveTenantSession(),
      }),
    );

    expect(await screen.findByText(/BARAKA-8U-2026/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /generate report card/i }));
    expect(await screen.findByText(/BARAKA-GEN-2026/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /generate class batch/i }));
    expect(await screen.findByText(/44\/46 report cards/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /publish selected card/i }));
    expect(await screen.findByText(/report card published to the parent portal/i)).toBeVisible();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/exams/report-cards/publish"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
