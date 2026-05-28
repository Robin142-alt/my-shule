import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DeputyPrincipalCommandCenter } from "@/components/school/deputy-principal-command-center";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

describe("DeputyPrincipalCommandCenter", () => {
  it("makes deputy search and urgent controls visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<DeputyPrincipalCommandCenter routeMode="hosted" />);

    await user.type(screen.getByLabelText(/global search students, teachers, incidents, classes, parents, or reports/i), "Bullying");
    await user.click(screen.getByRole("button", { name: /bullying incident/i }));

    expect(screen.getByText(/bullying incident opened for deputy follow-up/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^emergency$/i }));
    expect(screen.getByText(/emergency response panel opened for deputy review/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /call parent/i }));
    expect(screen.getByText(/call parent opened for bullying incident reported/i)).toBeVisible();
  });
});
