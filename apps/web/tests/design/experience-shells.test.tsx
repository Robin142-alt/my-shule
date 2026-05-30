import { screen, within } from "@testing-library/react";
import { createElement } from "react";

import { PortalPages } from "@/components/portal/portal-pages";
import { SchoolPages } from "@/components/school/school-pages";
import { SuperadminPages } from "@/components/platform/superadmin-pages";

import { renderWithProviders } from "./test-utils";

describe("experience shells", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("keeps platform, school, and portal navigation visibly separated", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ["students", "finance", "reports", "parent_portal"],
    } as Response);

    const platformRender = renderWithProviders(createElement(SuperadminPages));
    expect(screen.getByText(/platform owner desk/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /^schools$/i })).toBeVisible();
    expect(screen.queryByRole("link", { name: /^students$/i })).toBeNull();

    platformRender.unmount();

    const schoolRender = renderWithProviders(
      createElement(SchoolPages, { role: "bursar" }),
    );
    expect(await screen.findByTestId("role-operational-command-center")).toBeVisible();
    expect(screen.getByRole("heading", { name: /accountant fee collection/i })).toBeVisible();
    expect(schoolRender.container.querySelector(".enterprise-shell")).not.toBeInTheDocument();
    expect(screen.queryByText(/platform owner desk/i)).toBeNull();

    schoolRender.unmount();

    renderWithProviders(createElement(PortalPages, { viewer: "parent" }));
    expect(
      screen.getByRole("heading", { name: /family dashboard/i }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /^fees$/i })).toBeVisible();
    expect(screen.queryByRole("link", { name: /^inventory$/i })).toBeNull();
  });

  it("scopes school command-center actions by role instead of showing the same global action list to everyone", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          "students",
          "admissions",
          "school_administration",
          "document_printing",
          "communication_sms",
          "communication_center",
          "reports",
          "staff",
        ],
      }),
    } as Response);

    renderWithProviders(createElement(SchoolPages, { role: "secretary" }));

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    expect(within(commandCenter).getAllByText(/front office/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getAllByRole("button", { name: /Mark Parent Served/i }).length).toBeGreaterThan(0);
    expect(within(commandCenter).getAllByRole("button", { name: /Send SMS/i }).length).toBeGreaterThan(0);
    expect(within(commandCenter).queryByRole("button", { name: /Approve Results Ready/i })).not.toBeInTheDocument();
  });
});
