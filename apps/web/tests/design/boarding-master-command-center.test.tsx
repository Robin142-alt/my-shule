import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BoardingMasterCommandCenter } from "@/components/school/boarding-master-command-center";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

describe("BoardingMasterCommandCenter", () => {
  it("makes boarding search and hostel controls visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<BoardingMasterCommandCenter routeMode="hosted" />);

    await user.type(screen.getByLabelText(/search boarding students, dormitories, roll call, clinic, visitors, or incidents/i), "Kevin");
    await user.click(screen.getByRole("button", { name: /kevin otieno/i }));

    expect(screen.getByText(/kevin otieno opened in boarding records/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /quick response/i }));
    expect(screen.getByText(/quick response panel opened for hostel follow-up/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /start roll call/i }));
    expect(screen.getByText(/start roll call opened for boarding desk action/i)).toBeVisible();
  });
});
