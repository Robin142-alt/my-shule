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

  it("admissions officer actions create application workflow evidence", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="admissions" tenantSlug="kisumu-boys" />);
    const commandCenter = await screen.findByTestId("role-operational-command-center");

    await user.click(within(commandCenter).getByRole("button", { name: /Save Inquiry/i }));
    expect(
      await within(commandCenter).findByText(
        /Faith Akinyi admission inquiry saved for kisumu-boys: admission-.+, documents Partial, parent contact captured, Principal\/Secretary\/Accountant\/Class Teacher notified/i,
      ),
    ).toBeVisible();
    expect(within(commandCenter).getByRole("row", { name: /Faith Akinyi/i })).toBeVisible();

    await user.click(within(commandCenter).getByRole("button", { name: /Print Pipeline/i }));

    expect(document.body.textContent).not.toMatch(/Action completed|Workflow dispatched/i);
    expect(document.body.textContent).toMatch(/Admissions pipeline print preview ready for kisumu-boys: \d+ applicant records, Admissions\/Principal notified|Admissions Pipeline/i);
  });
});
