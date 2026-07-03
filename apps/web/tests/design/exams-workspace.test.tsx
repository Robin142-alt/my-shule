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

jest.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: { id: "teacher-1", display_name: "Beatrice Wanjiku", role: "teacher" },
    tenantId: "barakaacademy",
  }),
  useOptionalAuth: () => ({
    user: { id: "teacher-1", display_name: "Beatrice Wanjiku", role: "teacher" },
    tenantId: "barakaacademy",
  }),
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

function installLiveExamsFetchMock(options?: { reportCards?: unknown[] }) {
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
        data: options?.reportCards ?? [
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

    if (
      url.includes("/api/tasks") ||
      url.includes("/api/notifications") ||
      url.includes("/api/approvals")
    ) {
      return Promise.resolve(jsonResponse([]));
    }

    if (url.includes("/api/exams/analytics")) {
      return Promise.resolve(jsonResponse({
        data: {
          kpis: {
            school_average: 76.5,
            pending_reviews: 3,
            missing_marks_alerts: 5,
            active_exams: 2,
          },
          trends: [
            {
              exam_series_id: "series-1",
              exam_series_name: "Term 1 Mid-term",
              starts_on: "2026-02-10T00:00:00Z",
              average_score: 72.4,
            },
            {
              exam_series_id: "series-2",
              exam_series_name: "Term 1 End-term",
              starts_on: "2026-04-05T00:00:00Z",
              average_score: 76.5,
            },
          ],
          subjectPerformance: [
            {
              subject_id: "subject-maths",
              subject_name: "Mathematics",
              mean_score: 74.2,
              pass_rate: 85.0,
              ee_count: 10,
              me_count: 25,
              ae_count: 8,
              be_count: 3,
            },
            {
              subject_id: "subject-english",
              subject_name: "English",
              mean_score: 78.8,
              pass_rate: 92.0,
              ee_count: 15,
              me_count: 22,
              ae_count: 7,
              be_count: 2,
            },
          ],
          studentProgress: {
            topPerformers: [
              {
                student_id: "student-1",
                student_name: "Aisha Njeri",
                admission_number: "ADM-2025-001",
                average_percentage: 92.4,
                assessments_taken: 5,
              },
            ],
            topImprovers: [
              {
                student_id: "student-2",
                student_name: "Daniel Mutua",
                admission_number: "ADM-2025-004",
                latest_exam_series: "Term 1 End-term",
                latest_average: 78.5,
                previous_exam_series: "Term 1 Mid-term",
                previous_average: 72.1,
                improvement: 6.4,
              },
            ],
            atRiskStudents: [
              {
                student_id: "student-3",
                student_name: "Peter Mwangi",
                admission_number: "ADM-2026-402",
                average_percentage: 42.5,
                assessments_taken: 5,
              },
            ],
          },
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

function buildLiveWorkspaceWithoutReportCards() {
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
    reportCards: [],
  });
}

describe("exams workspace", () => {
  jest.setTimeout(60000);

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const urlStr = String(input);
      if (urlStr.includes("/api/school/modules/me")) {
        return Promise.resolve({
          ok: true,
          json: async () => ["exams"],
        } as Response);
      }
      if (
        urlStr.includes("/tasks") ||
        urlStr.includes("/notifications") ||
        urlStr.includes("/approvals")
      ) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
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
        liveSessionOverride: mockUseLiveTenantSession({} as any),
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

  it("does not post teacher marks with a hardcoded learner fallback when no learner record is selected", async () => {
    const user = userEvent.setup();
    mockLiveExamsSession();
    const fetchMock = installLiveExamsFetchMock({ reportCards: [] });

    renderWithProviders(
      createElement(ExamsModuleScreen, {
        role: "teacher",
        schoolName: "Baraka Academy",
        tenantSlug: "barakaacademy",
        initialLiveWorkspace: buildLiveWorkspaceWithoutReportCards(),
        liveSessionOverride: mockUseLiveTenantSession({} as any),
      }),
    );

    expect(await screen.findByText(/Grade 8 Unity - Mathematics/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /save mark/i }));

    expect(await screen.findByText(/No live learner record is selected/i)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/exams/marks"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not submit locked mark corrections with hardcoded mark or approver ids", async () => {
    const user = userEvent.setup();
    mockLiveExamsSession();
    const fetchMock = installLiveExamsFetchMock();

    renderWithProviders(
      createElement(ExamsModuleScreen, {
        role: "principal",
        schoolName: "Baraka Academy",
        tenantSlug: "barakaacademy",
        initialLiveWorkspace: buildInitialLiveExamsWorkspace(),
        liveSessionOverride: mockUseLiveTenantSession({} as any),
      }),
    );

    expect(await screen.findByText(/BARAKA-8U-2026/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /correct locked mark/i }));

    expect(await screen.findByText(/No locked mark correction record is selected/i)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/exams/marks/corrections"),
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("mark-1"),
      }),
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
        liveSessionOverride: mockUseLiveTenantSession({} as any),
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

  it("does not show principal mark-entry shortcuts unless the principal has an assigned teaching marksheet", () => {
    renderWithProviders(
      createElement(ExamsModuleScreen, {
        role: "principal",
        schoolName: "Baraka Academy",
        tenantSlug: "barakaacademy",
      }),
    );

    expect(screen.queryByRole("button", { name: /continue marks entry/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /import spreadsheet/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate reports/i })).toBeVisible();
  });

  it("shows principal My Exam Entry only for assigned teaching subjects and opens the selected marksheet", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      createElement(ExamsModuleScreen, {
        role: "principal",
        schoolName: "Baraka Academy",
        tenantSlug: "barakaacademy",
        teachingAssignmentsOverride: [
          {
            id: "principal-biology-f4w",
            exam: "Term 2 Opener",
            className: "Form 4",
            stream: "West",
            subject: "Biology",
            curriculum: "8-4-4",
            deadline: "24 May, 4:00 PM",
            status: "Open",
            missingMarks: 1,
            invalidMarks: 0,
            lastSaved: "10 minutes ago",
            teacherName: "Principal as teacher",
            schoolId: "barakaacademy",
            academicYear: "2026",
            term: "Term 2",
          },
        ],
      }),
    );

    expect(screen.getByRole("heading", { name: /my exam entry/i })).toBeVisible();
    expect(screen.getAllByText(/Form 4 West/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Biology/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Form 4 West Mathematics/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /open marksheet for biology/i }));

    expect(screen.getByRole("heading", { name: /Biology marksheet/i })).toBeVisible();
    expect(screen.getByText(/Admission No\./i)).toBeVisible();
    expect(screen.getByText(/Learner Name/i)).toBeVisible();
    expect(screen.getAllByText(/Paper 1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Practical/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Teacher Comment/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /submit marks/i })).toBeDisabled();
    expect(screen.getByText(/Resolve missing marks before submitting/i)).toBeVisible();
  });

  it("gives teachers a selectable My Exam Entry queue with truthful draft and template actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      createElement(ExamsModuleScreen, {
        role: "teacher",
        schoolName: "Baraka Academy",
        tenantSlug: "barakaacademy",
      }),
    );

    expect(screen.getByRole("heading", { name: /my exam entry/i })).toBeVisible();
    expect(screen.getByText(/Open Entries/i)).toBeVisible();
    expect(screen.getByText(/Draft Marksheets/i)).toBeVisible();
    expect(screen.getByText(/Submitted Marks/i)).toBeVisible();
    expect(screen.getByText(/Returned Corrections/i)).toBeVisible();
    expect(screen.getByText(/Deadline Alerts/i)).toBeVisible();
    expect(screen.getAllByText(/Grade 8 Unity/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mathematics/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /download template for mathematics/i }));
    expect(screen.getByText(/Template queued for Grade 8 Unity Mathematics/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /continue draft for mathematics/i }));
    expect(screen.getByRole("heading", { name: /Mathematics marksheet/i })).toBeVisible();
    expect(screen.getAllByPlaceholderText(/search learner/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /submit marks/i })).toBeDisabled();
  });

  it("blocks teacher marks submission while missing, invalid, or outlier scores remain", () => {
    renderWithProviders(
      createElement(ExamsModuleScreen, {
        role: "teacher",
        schoolName: "Baraka Academy",
        tenantSlug: "barakaacademy",
      }),
    );

    expect(screen.getByText(/Resolve missing marks and invalid\/outlier scores before submitting/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /submit to hod/i })).toBeDisabled();
  });

  it("exposes complete curriculum-aware report generation filters and truthful row actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      createElement(ExamsModuleScreen, {
        role: "principal",
        schoolName: "Baraka Academy",
        tenantSlug: "barakaacademy",
      }),
    );

    await user.click(screen.getByRole("tab", { name: /report cards/i }));

    expect(screen.getByLabelText(/academic year/i)).toBeVisible();
    expect(screen.getByLabelText(/^term$/i)).toBeVisible();
    expect(screen.getByLabelText(/reporting period/i)).toBeVisible();
    expect(screen.getByLabelText(/grade\/form/i)).toBeVisible();
    expect(screen.getByLabelText(/stream/i)).toBeVisible();
    expect(screen.getByLabelText(/class reporting mode/i)).toBeVisible();
    expect(screen.getByLabelText(/report card type/i)).toBeVisible();
    expect(screen.getByLabelText(/^status$/i)).toBeVisible();
    expect(screen.getByLabelText(/completion state/i)).toBeVisible();
    expect(screen.getByLabelText(/published\/unpublished/i)).toBeVisible();
    expect(screen.getByLabelText(/approved\/pending/i)).toBeVisible();
    expect(screen.getByLabelText(/fee hold status/i)).toBeVisible();

    expect(screen.getByText(/Missing CBC observations/i)).toBeVisible();
    expect(screen.getAllByText(/Missing marks/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Missing comments/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Awaiting approval/i)).toBeVisible();
    expect(screen.getByText(/Held\/blocked/i)).toBeVisible();

    expect(screen.getAllByRole("button", { name: /^Regenerate$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /^Print$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /download pdf/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /send notification/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /audit trail/i }).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: /^Approve$/i })[1]);
    expect(screen.getByText(/report approved/i)).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: /^Publish$/i })[1]);
    expect(screen.getByText(/report published to the permitted parent portal/i)).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: /^Unpublish$/i })[1]);
    expect(screen.getByText(/report unpublished from the parent portal/i)).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: /audit trail/i })[0]);
    expect(screen.getByRole("dialog", { name: /report card audit trail/i })).toBeVisible();
    expect(screen.getAllByText(/school-scoped audit trail/i).length).toBeGreaterThan(0);
  }, 60000);

  it("lets report generation settings switch a school to pure CBC without leaving Form 4 as an implicit legacy school mode", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      createElement(ExamsModuleScreen, {
        role: "principal",
        schoolName: "Baraka Academy",
        tenantSlug: "barakaacademy",
      }),
    );

    await user.click(screen.getByRole("tab", { name: /report cards/i }));

    expect(screen.getAllByText(/Legacy 8-4-4\/KCSE/i).length).toBeGreaterThan(0);

    await user.selectOptions(screen.getByLabelText(/school default curriculum direction/i), "CBC_CBE");

    expect(screen.getByText(/CBC\/CBE is now the school default direction/i)).toBeVisible();
    expect(screen.getByText(/Legacy 8-4-4\/KCSE remains selectable only as an explicit class\/report format/i)).toBeVisible();

    await user.selectOptions(screen.getByLabelText(/report card type/i), "LEGACY_844_KCSE");
    expect(screen.getByText(/No report cards match the selected filters/i)).toBeVisible();
  }, 15000);
});
