import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StorekeeperCommandCenter } from "@/components/school/storekeeper-command-center";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

describe("StorekeeperCommandCenter", () => {
  it("makes storekeeper search and inventory controls visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<StorekeeperCommandCenter routeMode="hosted" />);

    await user.type(screen.getByLabelText(/search items, suppliers, requisition ids, grns, or departments/i), "Rice");
    await user.click(screen.getByRole("button", { name: /rice stock/i }));

    expect(screen.getByText(/rice stock opened in store records/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /create purchase order/i }));
    expect(screen.getByText(/create purchase order opened for rice stock may run out/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /bulk approve safe items/i }));
    expect(screen.getByText(/safe requisition bulk approval review opened/i)).toBeVisible();
  });
});
