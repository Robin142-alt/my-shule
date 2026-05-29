import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { InviteAcceptanceView } from "@/components/auth/auth-invitation-view";

import { renderWithProviders } from "./test-utils";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return {
    status: init?.status ?? 200,
    ok: (init?.status ?? 200) >= 200 && (init?.status ?? 200) < 300,
    json: async () => body,
  } as Response;
}

describe("invite acceptance", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("submits the expected school from the invitation link with the secure token", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-accept-invite-token" }))
      .mockResolvedValueOnce(jsonResponse({
        success: true,
        message: "Invitation accepted. You can now sign in.",
        tenantId: "green-valley",
        email: "teacher@example.test",
        displayName: "Teacher One",
        role: "teacher",
      }));

    renderWithProviders(
      <InviteAcceptanceView
        initialToken="invite-token-with-enough-entropy-for-production-tests"
        initialTenantSlug="green-valley"
      />,
    );

    await user.type(screen.getByLabelText(/full name/i), "Teacher One");
    await user.type(screen.getByLabelText(/^create password$/i), "StrongPass123");
    await user.type(screen.getByLabelText(/confirm password/i), "StrongPass123");
    await user.click(screen.getByRole("button", { name: /accept invitation/i }));

    await waitFor(() => expect(screen.getByText(/invitation accepted/i)).toBeVisible());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/invitations/accept",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: expect.stringContaining('"tenantSlug":"green-valley"'),
      }),
    );
  });
});
