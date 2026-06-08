import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";

import { renderWithProviders } from "./test-utils";

describe("principal production readiness", () => {
  it("opens Fees workspace actions without fake success", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="principal" section="finance" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    await user.click(within(commandCenter).getByRole("button", { name: /View Collections/i }));

    expect(within(commandCenter).getByRole("heading", { name: /^Fees$/i })).toBeVisible();
    expect(within(commandCenter).getByText(/fees workspace ready with \d+ operational records and \d+ metrics/i)).toBeVisible();
    expect(within(commandCenter).queryByText(/Action completed/i)).not.toBeInTheDocument();
    expect(within(commandCenter).queryByText(/export generated/i)).not.toBeInTheDocument();
  });

  it("opens attendance SMS confirmation with recipient evidence", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="principal" section="attendance" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    await user.click(within(commandCenter).getAllByRole("button", { name: /Send Absence SMS/i })[0]);

    expect(within(commandCenter).getByText(/absence sms confirmation ready with \d+ guardian recipients? for review before queueing/i)).toBeVisible();
    expect(within(commandCenter).queryByText(/confirmation opened/i)).not.toBeInTheDocument();
  });
});
