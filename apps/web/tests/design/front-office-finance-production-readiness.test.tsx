import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

describe("front office and finance production readiness", () => {
  it("accountant payment desk has real receipt and export evidence", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="accountant" tenantSlug="kisumu-boys" />);
    const commandCenter = await screen.findByTestId("role-operational-command-center");

    expect(within(commandCenter).getByText(/Record payment and print receipt/i)).toBeVisible();
    await user.click(within(commandCenter).getByRole("button", { name: /Export/i }));

    expect(document.body.textContent).not.toMatch(/export generated/i);
    expect(document.body.textContent).toMatch(/download|export downloaded|CSV/i);
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

    expect(within(dashboard).getByText(/Admissions Officer/i)).toBeVisible();
    expect(within(dashboard).getByRole("link", { name: /Enquiries/i })).toHaveAttribute(
      "href",
      "/school/admissions/enquiries",
    );
    expect(within(dashboard).getByRole("link", { name: /Fee Clearance/i })).toHaveAttribute(
      "href",
      "/school/admissions/fee-clearance",
    );
    expect(within(dashboard).getByRole("link", { name: /Reports/i })).toHaveAttribute(
      "href",
      "/school/admissions/reports",
    );
    expect(within(dashboard).queryByText(/Use the role menu to switch sections/i)).not.toBeInTheDocument();
  });
});
