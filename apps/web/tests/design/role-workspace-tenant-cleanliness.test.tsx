import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RoleOperationalCommandCenter } from "@/components/school/role-operational-command-center";

import { renderWithProviders } from "./test-utils";

describe("role workspace tenant cleanliness", () => {
  it("keeps a fresh school queue, records table, and form free of demo records", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <RoleOperationalCommandCenter
        role="deputy-principal"
        initialWorkspace="Attendance Escalations"
        tenantSlug="fresh-academy"
      />,
    );

    const commandCenter = await screen.findByTestId("role-operational-command-center");

    expect(within(commandCenter).getByText(/0 queued/i)).toBeVisible();
    expect(within(commandCenter).getByText(/Create the first record from the Form tab/i)).toBeVisible();
    expect(within(commandCenter).queryByText(/Learner absent follow-up/i)).not.toBeInTheDocument();
    expect(within(commandCenter).queryByText(/QEX7ABC123/i)).not.toBeInTheDocument();

    await user.click(within(commandCenter).getByRole("button", { name: /^Records$/i }));

    expect(within(commandCenter).getByText(/0 of 0 records/i)).toBeVisible();
    expect(within(commandCenter).getByText(/No records require action/i)).toBeVisible();

    await user.click(within(commandCenter).getByRole("button", { name: /^Form$/i }));

    const form = within(commandCenter).getByRole("form");
    for (const control of form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")) {
      expect(control.value).toBe("");
    }
    expect(within(form).getAllByRole("option", { name: /^Select /i }).length).toBeGreaterThan(0);
  });

  it("resets records when users move between role sidebar workspaces", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <RoleOperationalCommandCenter
        role="deputy-principal"
        initialWorkspace="Attendance Escalations"
        tenantSlug="kisumu-boys"
      />,
    );

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    await user.click(within(commandCenter).getByRole("button", { name: /^Records$/i }));
    expect(within(commandCenter).getAllByText(/Learner absent follow-up/i).length).toBeGreaterThan(0);

    await user.click(within(commandCenter).getByRole("button", { name: /Staff Coordination/i }));
    await user.click(within(commandCenter).getByRole("button", { name: /^Records$/i }));

    expect(within(commandCenter).queryByText(/Learner absent follow-up/i)).not.toBeInTheDocument();
    expect(within(commandCenter).getAllByText(/Staff Coordination records/i).length).toBeGreaterThan(0);
  });
});
