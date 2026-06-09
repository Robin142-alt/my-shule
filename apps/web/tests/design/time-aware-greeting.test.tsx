import { screen } from "@testing-library/react";
import { createElement } from "react";

import { PortalPages } from "@/components/portal/portal-pages";
import { SchoolPages } from "@/components/school/school-pages";
import { SuperadminPages } from "@/components/platform/superadmin-pages";
import { resolveTimeAwareGreeting } from "@/lib/greetings/time-aware-greeting";

import { renderWithProviders } from "./test-utils";

function jsonResponse(body: unknown) {
  return {
    status: 200,
    ok: true,
    json: async () => body,
  } as Response;
}

const enabledSchoolModules = [
  "students",
  "admissions",
  "academics",
  "exams",
  "discipline",
  "finance",
  "communication_sms",
  "reports",
  "staff",
  "inventory",
  "library",
  "transport",
  "principal_dashboard",
];

describe("time-aware dashboard greeting", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse({ data: enabledSchoolModules }));
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("resolves the correct greeting for each day period", () => {
    expect(resolveTimeAwareGreeting(new Date(2026, 4, 27, 6))).toBe("Good Morning");
    expect(resolveTimeAwareGreeting(new Date(2026, 4, 27, 13))).toBe("Good Afternoon");
    expect(resolveTimeAwareGreeting(new Date(2026, 4, 27, 18))).toBe("Good Evening");
    expect(resolveTimeAwareGreeting(new Date(2026, 4, 27, 23))).toBe("Welcome Back");
  });

  it("greets the person on operational school command centers", async () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(6);

    renderWithProviders(
      createElement(SchoolPages, {
        role: "principal",
        tenantSlug: "kisumu-boys",
      }),
    );

    expect(await screen.findByText("Good Morning, Principal Wanjiku")).toBeVisible();
  });

  it("greets the person on hosted school module workspaces", async () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(13);

    renderWithProviders(
      createElement(SchoolPages, {
        role: "bursar",
        section: "finance",
        tenantSlug: "kisumu-boys",
        liveDataEnabled: false,
      }),
    );

    expect(await screen.findByText("Good Afternoon, Bursar Achieng")).toBeVisible();
  });

  it("greets portal users by their workspace person name", async () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(18);

    renderWithProviders(createElement(PortalPages, { viewer: "student", section: "fees" }));

    expect(await screen.findByText("Good Evening, Brian Otieno")).toBeVisible();
  });

  it("greets platform operators in the superadmin workspace", async () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(23);

    renderWithProviders(createElement(SuperadminPages));

    expect(await screen.findByText("Welcome Back, System Owner")).toBeVisible();
  });
});
