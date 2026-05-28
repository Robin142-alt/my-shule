import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TransportManagerCommandCenter } from "@/components/school/transport-manager-command-center";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

describe("TransportManagerCommandCenter", () => {
  it("makes transport search, table tools, and route planning controls produce visible state", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TransportManagerCommandCenter routeMode="hosted" />);

    await user.type(screen.getByPlaceholderText(/search vehicles, routes, students, drivers, or incidents/i), "Kisumu West");
    await user.click(screen.getByRole("button", { name: /bus 04/i }));

    expect(screen.getByRole("heading", { name: /fleet management/i })).toBeVisible();
    expect(screen.getByText(/bus 04 opened in fleet management/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /export/i }));
    expect(screen.getByText(/fleet register exported to csv/i)).toBeVisible();

    await user.clear(screen.getByPlaceholderText(/search vehicles, routes, students, drivers, or incidents/i));
    await user.type(screen.getByPlaceholderText(/search vehicles, routes, students, drivers, or incidents/i), "Mamboleo");
    await user.click(screen.getByRole("button", { name: /mamboleo route/i }));

    expect(screen.getByRole("heading", { name: /routes & stops/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /optimize route/i }));
    expect(screen.getByText(/optimize route opened for route planning/i)).toBeVisible();
  });
});
