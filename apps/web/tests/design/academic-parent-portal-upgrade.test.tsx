import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PortalPages } from "@/components/portal/portal-pages";

import { renderWithProviders } from "./test-utils";

type FetchPayload = {
  data: unknown;
  meta?: Record<string, unknown>;
};

function jsonResponse(payload: FetchPayload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

const parentAcademics = {
  metrics: {
    subjects: 1,
    mean_score: 78,
    report_cards: 1,
  },
  assignments: [
    {
      id: "assignment-1",
      title: "Algebra practice",
      subject: "Mathematics",
      due_date: "2026-07-30T00:00:00.000Z",
    },
  ],
  marks: [
    {
      id: "mark-1",
      student_name: "Learner One",
      subject: "Mathematics",
      exam: "Term assessment",
      score: 78,
    },
  ],
  report_cards: [
    {
      id: "report-1",
      student_name: "Learner One",
      term: "Term 1",
      academic_year: "2026",
      status: "published",
    },
  ],
};

function installPortalFetch(options?: {
  parentAcademics?: typeof parentAcademics;
  parentAcademicsStatus?: number;
}) {
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
    if (url.includes("/api/admin-command/parent/academics")) {
      const status = options?.parentAcademicsStatus ?? 200;
      return Promise.resolve(jsonResponse({
        data: options?.parentAcademics ?? parentAcademics,
        meta: {},
      }, status));
    }
    if (url.includes("/api/admin-command/student/academics")) {
      return Promise.resolve(jsonResponse({
        data: {
          metrics: { subjects: 1, mean_score: 81, report_cards: 0 },
          assignments: [],
          marks: [{
            id: "student-mark-1",
            subject: "Integrated Science",
            exam: "Term assessment",
            teacher: "Teacher One",
            score: 81,
            status: "published",
          }],
          report_cards: [],
        },
        meta: {},
      }));
    }

    return Promise.resolve(jsonResponse({ data: {}, meta: {} }));
  });

  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("live parent and student academics portals", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("renders only published school-scoped academic data returned by the API", async () => {
    installPortalFetch();

    renderWithProviders(
      <PortalPages
        viewer="parent"
        section="academics"
        routeMode="public"
        tenantSlug="lakeview-school"
        userLabel="Grace Parent"
      />,
    );

    expect(screen.getByTestId("live-role-command-center")).toHaveAttribute("data-role", "parent");
    expect(await screen.findByText("Lakeview School command center")).toBeVisible();
    expect((await screen.findAllByText("Mathematics")).length).toBeGreaterThan(0);
    expect(screen.getByText("Algebra practice")).toBeVisible();
    expect(screen.getByText("Term 1")).toBeVisible();
    expect(screen.queryByText(/Brian Otieno|Aisha Wanjiku|Kisumu Boys/i)).not.toBeInTheDocument();
  });

  it("downloads a real report-card identifier instead of fabricating a success state", async () => {
    installPortalFetch();
    const openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
    const user = userEvent.setup();

    renderWithProviders(
      <PortalPages
        viewer="parent"
        section="academics"
        routeMode="public"
        tenantSlug="lakeview-school"
        userLabel="Grace Parent"
      />,
    );

    await user.click(await screen.findByRole("button", { name: /download term 1 report card/i }));

    expect(openSpy).toHaveBeenCalledWith(
      "/api/parent/report-cards/report-1/download",
      "_blank",
      "noopener,noreferrer",
    );
    expect(screen.getByText(/report card download requested for term 1/i)).toBeVisible();
    expect(screen.queryByText(/sent successfully|acknowledged just now/i)).not.toBeInTheDocument();
  });

  it("shows truthful empty states for a school with no published academics", async () => {
    installPortalFetch({
      parentAcademics: {
        metrics: { subjects: 0, mean_score: 0, report_cards: 0 },
        assignments: [],
        marks: [],
        report_cards: [],
      },
    });

    renderWithProviders(
      <PortalPages
        viewer="parent"
        section="academics"
        tenantSlug="fresh-school"
        userLabel="Fresh Parent"
      />,
    );

    expect(await screen.findByText(/no recent grades published/i)).toBeVisible();
    expect(screen.getByText(/no pending homework/i)).toBeVisible();
    expect(screen.getByText(/no official report cards have been published/i)).toBeVisible();
  });

  it("keeps API failures visible with the actual status", async () => {
    installPortalFetch({ parentAcademicsStatus: 500 });

    renderWithProviders(
      <PortalPages
        viewer="parent"
        section="academics"
        tenantSlug="lakeview-school"
        userLabel="Grace Parent"
      />,
    );

    expect(
      await screen.findByText(
        /academic records could not be loaded: request failed: 500/i,
        {},
        { timeout: 8_000 },
      ),
    ).toBeVisible();
  });

  it("uses the authenticated student contract without reading parent records", async () => {
    const fetchMock = installPortalFetch();

    renderWithProviders(
      <PortalPages
        viewer="student"
        section="academics"
        routeMode="public"
        tenantSlug="lakeview-school"
        userLabel="Learner One"
      />,
    );

    expect(await screen.findByText("Integrated Science")).toBeVisible();
    expect(screen.getByRole("heading", { name: /academics & report cards/i })).toBeVisible();
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([input]) => String(input));
      expect(urls.some((url) => url.includes("/admin-command/student/academics"))).toBe(true);
      expect(urls.some((url) => url.includes("/admin-command/parent/academics"))).toBe(false);
    });
  });
});
