import { screen, within } from "@testing-library/react";

import { SchoolPages } from "@/components/school/school-pages";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

describe("front office and finance production readiness", () => {
  it("accountant opens the dedicated live finance command center", async () => {
    renderWithProviders(
      <SchoolPages
        role="accountant"
        tenantSlug="fresh-school"
        routeMode="public"
        liveDataEnabled={false}
      />,
    );
    const commandCenter = await screen.findByTestId("accountant-command-center");

    expect(within(commandCenter).getByText(/Accountant Dashboard/i)).toBeVisible();
    expect(within(commandCenter).getAllByText(/Today/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getByRole("button", { name: /Record cash \/ cheque/i })).toBeVisible();
    expect(screen.queryByTestId("role-operational-command-center")).not.toBeInTheDocument();
    expect(commandCenter.textContent).not.toMatch(/248,500|M-Pesa Confirmed|Balances Above KSh 10k|Receipts Printed/i);
  });

  it("admissions officer opens the newly built school-scoped dashboard", async () => {
    renderWithProviders(
      <SchoolPages
        role="admissions"
        tenantSlug="kisumu-boys"
        routeMode="public"
        liveDataEnabled={false}
      />,
    );
    const dashboard = await screen.findByTestId("admissions-dashboard-command-center");

    expect(
      within(dashboard).getByRole("heading", { name: /Admissions Officer Dashboard/i }),
    ).toBeVisible();
    const navigation = within(dashboard).getByRole("navigation", { name: "Admissions" });
    expect(within(navigation).getByRole("link", { name: "Admit Student" })).toHaveAttribute(
      "href",
      "/school/admissions/applications",
    );
    expect(within(navigation).getByRole("link", { name: "Admission Records" })).toHaveAttribute(
      "href",
      "/school/admissions/enrolment",
    );
    expect(within(navigation).getByRole("link", { name: /Reports/i })).toHaveAttribute(
      "href",
      "/school/admissions/reports",
    );
    expect(within(dashboard).queryByText(/Use the role menu to switch sections/i)).not.toBeInTheDocument();
  });
});
