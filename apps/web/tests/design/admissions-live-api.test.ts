import fs from "node:fs";
import path from "node:path";

import type { LiveAuthSession } from "@/lib/dashboard/api-client";
import {
  advanceAdmissionsStudentAcademicLifecycleLive,
  fetchAdmissionsClassOptionsLive,
  fetchAdmissionsReportExportLive,
} from "@/lib/modules/admissions-live";
import {
  buildAdmissionsReports,
  createAdmissionsDataset,
} from "@/lib/modules/admissions-data";

jest.mock("@/lib/auth/csrf-client", () => ({
  getCsrfToken: jest.fn(async () => "csrf-token"),
}));

function jsonResponse(body: unknown, init?: ResponseInit) {
  return {
    status: init?.status ?? 200,
    ok: (init?.status ?? 200) >= 200 && (init?.status ?? 200) < 300,
    json: async () => body,
  } as Response;
}

describe("admissions live API client", () => {
  beforeEach(() => {
    Object.assign(global, { fetch: jest.fn() });
  });

  it("posts academic lifecycle actions to the admissions API endpoint", async () => {
    const session: LiveAuthSession = {
      tenantId: "tenant-a",
      user: {
        user_id: "user-1",
        tenant_id: "tenant-a",
        role: "admissions",
        email: "admissions@example.test",
        display_name: "Admissions Desk",
        permissions: [],
        session_id: "session-1",
      },
    };
    jest.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({
      lifecycle_event: {
        id: "event-1",
        event_type: "promotion",
      },
    }));

    await advanceAdmissionsStudentAcademicLifecycleLive(session, "student-1", {
      action: "promotion",
      class_name: "Grade 8",
      stream_name: "North",
      reason: "End of year promotion",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admissions/students/student-1/academic-lifecycle",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-myshule-csrf": "csrf-token",
        }),
        body: expect.any(String),
      }),
    );
    expect(JSON.parse(String(jest.mocked(global.fetch).mock.calls[0]?.[1]?.body))).toEqual({
          action: "promotion",
          class_name: "Grade 8",
          stream_name: "North",
          reason: "End of year promotion",
    });
  });

  it("fetches server-side admissions report export artifacts", async () => {
    const session: LiveAuthSession = {
      tenantId: "tenant-a",
      user: {
        user_id: "user-1",
        tenant_id: "tenant-a",
        role: "admissions",
        email: "admissions@example.test",
        display_name: "Admissions Desk",
        permissions: [],
        session_id: "session-1",
      },
    };
    jest.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({
      report_id: "applications",
      title: "Applications register",
      filename: "admissions-applications.csv",
      content_type: "text/csv; charset=utf-8",
      generated_at: "2026-05-14T10:00:00.000Z",
      row_count: 1,
      checksum_sha256: "checksum",
      csv: "Applicant,Application No\r\nAchieng,APP-20260514-001\r\n",
    }));

    const artifact = await fetchAdmissionsReportExportLive(session, "applications");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admissions/reports/applications/export",
      expect.objectContaining({
        method: "GET",
        credentials: "same-origin",
      }),
    );
    expect(artifact).toMatchObject({
      filename: "admissions-applications.csv",
      row_count: 1,
      checksum_sha256: "checksum",
    });
  });

  it("proxies the draft and settings mutation methods used by the admission wizard", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/admissions/[...path]/route.ts"),
      "utf8",
    );

    expect(source).toMatch(/export async function PUT/);
    expect(source).toMatch(/export async function DELETE/);
  });

  it("fetches school class options from the admissions API instead of static form choices", async () => {
    const session: LiveAuthSession = {
      tenantId: "tenant-a",
      user: {
        user_id: "user-1",
        tenant_id: "tenant-a",
        role: "admissions",
        email: "admissions@example.test",
        display_name: "Admissions Desk",
        permissions: [],
        session_id: "session-1",
      },
    };
    jest.mocked(global.fetch).mockResolvedValueOnce(jsonResponse([
      {
        id: "class-1",
        name: "Grade 7",
        grade_level: "Grade 7",
        stream: "North",
        capacity: 45,
        student_count: 12,
        available_seats: 33,
        label: "Grade 7 North",
        value: "Grade 7",
      },
    ]));

    const classes = await fetchAdmissionsClassOptionsLive(session);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admissions/classes",
      expect.objectContaining({
        method: "GET",
        credentials: "same-origin",
      }),
    );
    expect(classes).toEqual([
      expect.objectContaining({
        id: "class-1",
        label: "Grade 7 North",
        value: "Grade 7",
      }),
    ]);
    expect(classes.map((item) => item.value)).not.toContain("PP2");
  });

  it("marks admissions report cards with server export identifiers", () => {
    const reports = buildAdmissionsReports(createAdmissionsDataset());

    expect(reports.map((report) => report.serverExportId)).toEqual([
      "applications",
      "documents",
      "allocations",
      "transfers",
    ]);
  });
});
