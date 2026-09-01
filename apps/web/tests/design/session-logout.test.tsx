import { fireEvent, screen, waitFor } from "@testing-library/react";

import { SessionSignOutButton } from "@/components/auth/session-sign-out-button";

import { routerReplaceMock } from "./router-mock";
import { renderWithProviders } from "./test-utils";

describe("secure session logout", () => {
  const fetchMock = jest.fn();
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  function mockCsrfAndLogout(logoutResponse: {
    body: unknown;
    ok: boolean;
    status: number;
  }) {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "csrf-test-token" }),
      })
      .mockResolvedValueOnce({
        ok: logoutResponse.ok,
        status: logoutResponse.status,
        json: async () => logoutResponse.body,
      });
  }

  it("navigates only after the secure logout endpoint confirms success", async () => {
    mockCsrfAndLogout({ body: { success: true }, ok: true, status: 200 });

    renderWithProviders(<SessionSignOutButton audience="school" />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/school/login"));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-myshule-csrf": "csrf-test-token",
      },
      credentials: "same-origin",
      body: JSON.stringify({ audience: "school" }),
    });
  });

  it("keeps the current session visible and reports the failure when logout is rejected", async () => {
    const onSignOutError = jest.fn();
    mockCsrfAndLogout({
      body: { message: "Security check expired. Refresh the page and try again." },
      ok: false,
      status: 403,
    });

    renderWithProviders(
      <SessionSignOutButton audience="portal" onSignOutError={onSignOutError} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Security check expired");
    expect(onSignOutError).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("does not accept an ambiguous 200 response as a completed logout", async () => {
    mockCsrfAndLogout({ body: {}, ok: true, status: 200 });

    renderWithProviders(<SessionSignOutButton audience="school" />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to sign out securely");
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("returns an installed user to the app chooser after secure logout", async () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as never;
    mockCsrfAndLogout({ body: { success: true }, ok: true, status: 200 });

    renderWithProviders(
      <SessionSignOutButton audience="portal" browserLoginPath="/parent/login" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/app"));
  });

  it("preserves the existing parent login route in a normal browser", async () => {
    mockCsrfAndLogout({ body: { success: true }, ok: true, status: 200 });

    renderWithProviders(
      <SessionSignOutButton audience="portal" browserLoginPath="/parent/login" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/parent/login"));
  });
});
