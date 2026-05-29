import { createElement, type ComponentType } from "react";
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AiInsightsModuleScreen } from "@/components/modules/ai-insights/ai-insights-module-screen";
import { AssetTrackingModuleScreen } from "@/components/modules/assets/asset-tracking-module-screen";
import { BoardingModuleScreen } from "@/components/modules/boarding/boarding-module-screen";
import { CbtModuleScreen } from "@/components/modules/cbt/cbt-module-screen";
import { HostelModuleScreen } from "@/components/modules/hostel/hostel-module-screen";
import { LmsModuleScreen } from "@/components/modules/lms/lms-module-screen";
import { VisitorManagementModuleScreen } from "@/components/modules/visitors/visitor-management-module-screen";
import { SchoolPages } from "@/components/school/school-pages";
import { getSchoolWorkspace } from "@/lib/experiences/school-data";
import { isProductionReadyModule } from "@/lib/features/module-readiness";
import { isSchoolSectionEnabled } from "@/lib/module-access/module-access-map";
import { isSchoolSection } from "@/lib/routing/experience-routes";
import { readSchoolData } from "@/lib/school/school-operational-store";

import { renderWithProviders } from "./test-utils";

type LiveModuleComponent = ComponentType<{
  tenantSlug?: string | null;
  initialDashboard?: typeof liveDashboard;
}>;

const liveDashboard = {
  total_records: 1,
  open_records: 1,
  action_due: 0,
  critical_records: 0,
  records: [
    {
      id: "record-1",
      title: "Live readiness record",
      category: "operations",
      owner_name: "Principal",
      status: "open",
      priority: "normal",
      metric_count: 4,
    },
  ],
  activity: [],
};

const modules: Array<{
  section: string;
  moduleCode: string;
  heading: string;
  connectedLabel: string;
  Component: LiveModuleComponent;
}> = [
  {
    section: "hostel",
    moduleCode: "hostel",
    heading: "Hostel operations",
    connectedLabel: "Live hostel operations API connected",
    Component: HostelModuleScreen,
  },
  {
    section: "boarding",
    moduleCode: "boarding",
    heading: "Boarding operations",
    connectedLabel: "Live boarding operations API connected",
    Component: BoardingModuleScreen,
  },
  {
    section: "cbt",
    moduleCode: "cbt_exams",
    heading: "CBT exams",
    connectedLabel: "Live cbt exams API connected",
    Component: CbtModuleScreen,
  },
  {
    section: "lms",
    moduleCode: "lms",
    heading: "LMS operations",
    connectedLabel: "Live lms operations API connected",
    Component: LmsModuleScreen,
  },
  {
    section: "ai-insights",
    moduleCode: "ai_insights",
    heading: "AI insights",
    connectedLabel: "Live ai insights API connected",
    Component: AiInsightsModuleScreen,
  },
  {
    section: "visitors",
    moduleCode: "visitor_management",
    heading: "Visitor management",
    connectedLabel: "Live visitor management API connected",
    Component: VisitorManagementModuleScreen,
  },
  {
    section: "assets",
    moduleCode: "asset_tracking",
    heading: "Asset tracking",
    connectedLabel: "Live asset tracking API connected",
    Component: AssetTrackingModuleScreen,
  },
];

describe("Implementation 100 live module workspaces", () => {
  beforeEach(() => {
    window.localStorage.clear();
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      if (String(input).includes("/api/school/modules/me")) {
        return Promise.resolve({
          ok: true,
          json: async () => modules.map((module) => module.moduleCode),
        } as Response);
      }

      return (
      Promise.resolve({
        ok: true,
        json: async () => ({ data: liveDashboard }),
      } as Response)
      );
    }) as unknown as typeof fetch;
  });

  it.each(modules)(
    "renders the live $heading workspace with API connectivity and action forms",
    async ({ Component, connectedLabel, heading }) => {
      await act(async () => {
        renderWithProviders(
          <Component tenantSlug="barakaacademy" initialDashboard={liveDashboard} />,
        );
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(await screen.findByText(new RegExp(connectedLabel, "i"))).toBeVisible();
      expect(screen.getAllByRole("heading", { name: new RegExp(heading, "i") }).length).toBeGreaterThan(0);
      expect(screen.getByText(/Live readiness record/i)).toBeVisible();
      expect(screen.getByRole("button", { name: /refresh/i })).toBeVisible();
      expect(screen.getByRole("button", { name: /post/i })).toBeVisible();
      expect(screen.getByRole("button", { name: /complete/i })).toBeVisible();
    },
  );

  it("registers every remaining Implementation 100 module as a production-ready school section", () => {
    const principalNav = getSchoolWorkspace("principal").navItems.map((item) => item.id);
    const adminNav = getSchoolWorkspace("admin").navItems.map((item) => item.id);
    const deputyNav = getSchoolWorkspace("deputy-principal").navItems.map((item) => item.id);

    for (const { section, moduleCode } of modules) {
      expect(isSchoolSection(section)).toBe(true);
      expect(isProductionReadyModule(section)).toBe(true);
      expect(isSchoolSectionEnabled(section, [moduleCode])).toBe(true);
      const operationalNav =
        section === "ai-insights"
          ? principalNav
          : section === "cbt" || section === "lms"
            ? deputyNav
            : adminNav;

      if (section === "ai-insights") {
        expect(principalNav).toContain(section);
      } else {
        expect(principalNav).not.toContain(section);
      }
      expect(operationalNav).toContain(section);
    }
  });

  it.each(modules)(
    "opens $heading from the school workspace route when the module is enabled",
    async ({ heading, section }) => {
      await act(async () => {
        renderWithProviders(
          createElement(SchoolPages, {
            role: "admin",
            section,
            tenantSlug: "barakaacademy",
          }),
        );
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getAllByRole("heading", { name: new RegExp(heading, "i") }).length).toBeGreaterThan(0);
      expect(await screen.findByText(/Live readiness record/i)).toBeVisible();
    },
  );

  it("makes the ICT asset desk searchable and updates assets through practical actions", async () => {
    const user = userEvent.setup();
    const printMock = jest.fn();
    Object.defineProperty(window, "print", {
      value: printMock,
      writable: true,
    });

    await act(async () => {
      renderWithProviders(
        <AssetTrackingModuleScreen tenantSlug="barakaacademy" initialDashboard={liveDashboard} />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("heading", { name: /ict computer lab and asset desk/i })).toBeVisible();

    fireEvent.change(screen.getByLabelText(/asset name/i), { target: { value: "Dell OptiPlex 7090" } });
    fireEvent.change(screen.getByLabelText(/asset tag/i), { target: { value: "ICT-PC-9001" } });
    fireEvent.change(screen.getByLabelText(/serial number/i), { target: { value: "SN-ICT-9001" } });
    fireEvent.change(screen.getByLabelText(/location/i), { target: { value: "Computer Lab 3" } });
    await user.click(screen.getByRole("button", { name: /add asset/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/dell optiplex 7090 registered/i);

    fireEvent.change(screen.getByLabelText(/search ict assets/i), { target: { value: "9001" } });
    expect(screen.getByText("ICT-PC-9001")).toBeVisible();
    expect(screen.queryByText("ICT-PC-001")).not.toBeInTheDocument();

    const assetRow = screen.getByText("ICT-PC-9001").closest("tr");
    expect(assetRow).not.toBeNull();
    const row = within(assetRow as HTMLTableRowElement);

    await user.click(row.getByRole("button", { name: /^issue$/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/issued/i);
    expect(readSchoolData<Record<string, unknown>>("events", "barakaacademy")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "barakaacademy",
          type: "ICT_ASSET_ISSUED",
          module: "assets",
        }),
      ]),
    );

    await user.click(row.getByRole("button", { name: /report fault/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/fault reported/i);

    await user.click(row.getByRole("button", { name: /mark repaired/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/marked repaired/i);

    await user.click(row.getByRole("button", { name: /^return$/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/returned to ict store/i);

    await user.click(screen.getByRole("button", { name: /print asset tags/i }));
    expect(printMock).toHaveBeenCalled();
    expect(readSchoolData<Record<string, unknown>>("events", "barakaacademy")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "barakaacademy",
          type: "ICT_ASSET_TAGS_PRINTED",
          module: "assets",
        }),
      ]),
    );
  });

});
