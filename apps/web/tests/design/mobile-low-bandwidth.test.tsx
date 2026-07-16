import { screen, within } from "@testing-library/react";
import { createElement } from "react";

import { OperationalStatePanel } from "@/components/operational/operational-state-panel";
import { PortalPages } from "@/components/portal/portal-pages";
import { SchoolPages } from "@/components/school/school-pages";
import {
  MYSHULE_OPERATIONAL_ROLE_BLUEPRINTS,
  getOperationalRoleBlueprint,
} from "@/lib/operational/myshule-extreme-operating-system";

import { renderWithProviders } from "./test-utils";

describe("mobile and low-bandwidth operational behavior", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 844 });
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/module-access/visible")) {
        return { ok: true, json: async () => [] } as Response;
      }

      if (url.includes("/api/permissions")) {
        return { ok: true, json: async () => ({ data: [] }) } as Response;
      }

      return {
        ok: true,
        json: async () => ({
        metrics: {},
        items: [],
        users: [],
        applicationsList: [],
        admissionsList: [],
        exams: [],
        marks: [],
        reports: [],
      }),
      } as Response;
    }) as unknown as typeof fetch;
  });

  it("keeps mobile dashboards action-first and drawer-based for every role", () => {
    for (const blueprint of MYSHULE_OPERATIONAL_ROLE_BLUEPRINTS) {
      expect(blueprint.mobileBehavior).toEqual(
        expect.arrayContaining(["collapse sidebar into drawer", "keep urgent actions first"]),
      );
      expect(blueprint.firstViewport.join(" ")).toMatch(
        /pending|urgent|missing|today|current|visitors|active|failed|tenant|critical|absent|exam|lessons|clinic|live|applications|books|stock|boarding|routes|sessions|low|coverage|delays|cases|alerts/i,
      );
      expect(blueprint.queues[0]?.actions.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps low-bandwidth recovery visible instead of hiding offline work", () => {
    for (const blueprint of MYSHULE_OPERATIONAL_ROLE_BLUEPRINTS) {
      expect(blueprint.lowBandwidthBehavior).toEqual(
        expect.arrayContaining(["show cached queue", "allow offline draft", "retry sync visibly"]),
      );
      expect(blueprint.states).toEqual(
        expect.arrayContaining(["LOADING", "EMPTY", "DEGRADED", "FAILED", "LOCKED"]),
      );
    }

    renderWithProviders(
      <OperationalStatePanel
        state="OFFLINE_DRAFT"
        title="Attendance saved locally"
        message="Attendance saved locally, but sync failed. Sync again."
      />,
    );

    expect(screen.getByText(/OFFLINE_DRAFT/i)).toBeVisible();
    expect(screen.getByText(/Attendance saved locally, but sync failed/i)).toBeVisible();
  });

  it("keeps sensitive and self-service roles scoped on mobile search", () => {
    expect(getOperationalRoleBlueprint("guidance-counselling")?.searchMode).toBe("SENSITIVE_SCOPED");
    expect(getOperationalRoleBlueprint("discipline-master")?.searchMode).toBe("SENSITIVE_SCOPED");
    expect(getOperationalRoleBlueprint("nurse")?.searchMode).toBe("SENSITIVE_SCOPED");
    expect(getOperationalRoleBlueprint("parent")?.searchMode).toBe("SELF_ONLY");
    expect(getOperationalRoleBlueprint("student")?.searchMode).toBe("SELF_ONLY");
  });

  it.each([
    {
      label: "Principal School Setup",
      ui: createElement(SchoolPages, {
        role: "principal",
        section: "setup-checklist",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
      heading: /Principal Dashboard|School Setup/i,
      action: /Academics|Users & Invitations|Fees|Attendance/i,
    },
    {
      label: "Users & Invitations",
      ui: createElement(SchoolPages, {
        role: "principal",
        section: "users-invitations",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
      heading: /Users & Invitations/i,
      action: /Invite New User/i,
    },
    {
      label: "Admissions first learner",
      ui: createElement(SchoolPages, {
        role: "admissions",
        section: "applications",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
      heading: /Applications/i,
      action: /start student admission/i,
    },
    {
      label: "Finance billing and receipt",
      ui: createElement(SchoolPages, {
        role: "accountant",
        section: "payments",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
      heading: /Collections desk/i,
      action: /Record payment|Create invoice|Receipt/i,
    },
    {
      label: "Teacher marks",
      ui: createElement(SchoolPages, {
        role: "teacher",
        section: "exams-marks",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
      heading: /Teacher Workspace/i,
      action: /Exams & Marks|Save Draft|Submit/i,
    },
    {
      label: "Exams Manager publish and report cards",
      ui: createElement(SchoolPages, {
        role: "exams-manager",
        section: "report-cards",
        tenantSlug: "homabay-high",
        routeMode: "public",
        liveDataEnabled: false,
      }),
      heading: /Exams Manager Desk/i,
      action: /Report Cards|Publish|Generate/i,
    },
    {
      label: "Parent portal child view",
      ui: createElement(PortalPages, {
        viewer: "parent",
        section: "academics",
        routeMode: "public",
      }),
      heading: /Academics/i,
      action: /Mobile parent quick actions|View report|Child Overview/i,
    },
  ])("renders %s at phone width with usable actions", async ({ ui, heading, action }) => {
    const view = renderWithProviders(ui);

    const headings = await screen.findAllByRole("heading", { name: heading });
    expect(headings.length).toBeGreaterThan(0);
    expect(headings[0]).toBeVisible();
    expect(document.body.textContent).not.toMatch(/Workspace Not Found|School section not available/i);
    expect(within(document.body).getAllByText(action).length).toBeGreaterThan(0);

    view.unmount();
  }, 30000);
});
