import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { MfaVerificationView } from "@/components/auth/mfa-verification-view";
import { PortalLoginView } from "@/components/auth/portal-login-view";
import { ResetPasswordView } from "@/components/auth/auth-recovery-view";
import { InviteAcceptanceView } from "@/components/auth/auth-invitation-view";
import { InstalledAppEntry } from "@/components/pwa/installed-app-entry";
import { AUTH_REQUEST_TIMEOUT_MS, authFetch } from "@/lib/auth/auth-fetch";
import {
  CHALLENGE_TTL_MS,
  clearMfaLoginChallenge,
  storeMfaLoginChallenge,
  MFA_LOGIN_CHALLENGE_STORAGE_KEY,
} from "@/lib/auth/mfa-login-challenge";
import { renderWithProviders } from "./test-utils";
import { routerPushMock } from "./router-mock";

const fetchMock = jest.fn();
const json = (value: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => value }) as Response;
const pending = {
  audience: "school" as const,
  identifier: "teacher@example.test",
  password: "StrongPassword1",
  tenantSlug: "school-a",
  redirectFallback: "/school/teacher",
  rememberSession: false,
};
beforeEach(() => {
  global.fetch = fetchMock;
  fetchMock.mockReset();
  clearMfaLoginChallenge();
  sessionStorage.clear();
});
afterEach(() => {
  jest.useRealTimers();
});
function csrfThen(body: unknown, status = 200) {
  fetchMock
    .mockResolvedValueOnce(json({ token: "csrf" }))
    .mockResolvedValueOnce(json(body, status));
}

test("interrupted verification always has a fresh login path", async () => {
  renderWithProviders(<MfaVerificationView />);
  expect(
    await screen.findByRole("heading", { name: "Start sign-in again" }),
  ).toBeVisible();
  expect(screen.getByRole("link", { name: "Back to login" })).toHaveAttribute(
    "href",
    "/login?expired=1",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

test("MFA can resend with the same tenant, preserves shared-device choice, and clears on account switch", async () => {
  jest.useFakeTimers();
  storeMfaLoginChallenge(pending);
  csrfThen({ message: "MFA challenge required for this role" }, 401);
  renderWithProviders(<MfaVerificationView />);
  expect(screen.getByRole("button", { name: /Resend in/ })).toBeDisabled();
  await act(async () => {
    jest.advanceTimersByTime(31_000);
  });
  fireEvent.click(screen.getByRole("button", { name: "Resend code" }));
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("A new code was sent"),
  );
  const body = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(body).toMatchObject({
    audience: "school",
    tenantSlug: "school-a",
    rememberSession: false,
  });
  expect(body).not.toHaveProperty("verificationCode");
  fireEvent.click(screen.getByRole("link", { name: "Use another account" }));
  expect(sessionStorage.getItem(MFA_LOGIN_CHALLENGE_STORAGE_KEY)).toBeNull();
});

test("an open verification attempt expires and releases its stored credentials", async () => {
  jest.useFakeTimers();
  storeMfaLoginChallenge(pending);
  renderWithProviders(<MfaVerificationView />);
  await act(async () => {
    jest.advanceTimersByTime(CHALLENGE_TTL_MS + 1000);
  });
  expect(
    screen.getByRole("heading", { name: "Start sign-in again" }),
  ).toBeVisible();
  expect(sessionStorage.getItem(MFA_LOGIN_CHALLENGE_STORAGE_KEY)).toBeNull();
});

test("expired app credentials go directly to account selection, not a retry loop", async () => {
  fetchMock.mockResolvedValueOnce(json({ message: "Expired" }, 401));
  renderWithProviders(<InstalledAppEntry initialAudience="school" />);
  expect(await screen.findByTestId("installed-app-entry")).toBeVisible();
  expect(screen.queryByTestId("installed-app-session-error")).toBeNull();
});

test.each(["parent", "student"] as const)(
  "%s first access verifies the actual challenge and school before navigation",
  async (mode) => {
    csrfThen({
      challenge_id: "challenge-a",
      password_setup_required: true,
      delivery_channel: "sms",
    });
    renderWithProviders(
      <PortalLoginView mode={mode} initialTenantSlug="school-a" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "SMS code" }));
    fireEvent.change(screen.getByLabelText(/admission number/i), {
      target: { value: "ADM123" },
    });
    fireEvent.change(screen.getByLabelText("Registered guardian phone"), {
      target: { value: "0712345678" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Send code" }).closest("form")!,
    );
    expect(await screen.findByLabelText("Verification code")).toHaveAttribute(
      "inputmode",
      "numeric",
    );
    expect(screen.getByText(/phone ending 5678/)).toBeVisible();
    expect(screen.queryByLabelText(/admission number/i)).toBeNull();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      tenant_id: "school-a",
      guardian_phone: "0712345678",
    });
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "123 456" },
    });
    fireEvent.change(screen.getByLabelText("Create new password"), {
      target: { value: "StrongPassword1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "different" },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Verify and set password" })
        .closest("form")!,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("do not match");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "StrongPassword1" },
    });
    csrfThen({ message: "Code expired. Request a new code." }, 401);
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Verify and set password" })
        .closest("form")!,
    );
    expect(
      await screen.findByText("Code expired. Request a new code."),
    ).toBeVisible();
    expect(routerPushMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Change details" }),
    ).toBeEnabled();
    csrfThen({
      session: { audience: "portal" },
      redirectTo: `/portal/${mode}`,
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Verify and set password" })
        .closest("form")!,
    );
    await waitFor(() =>
      expect(routerPushMock).toHaveBeenCalledWith(`/portal/${mode}`),
    );
    expect(JSON.parse(fetchMock.mock.calls[5][1].body)).toEqual({
      challenge_id: "challenge-a",
      otp_code: "123456",
      new_password: "StrongPassword1",
    });
  },
);

test("a prefilled reset token stays out of the form but a rejected reset is recoverable", async () => {
  csrfThen({ message: "Reset link expired" }, 400);
  renderWithProviders(
    <ResetPasswordView
      title="Create a new password"
      subtitle="Choose a password."
      secretLabel="New password"
      secretPlaceholder=""
      backHref="/school/login"
      initialToken="reset-token"
    />,
  );
  expect(screen.queryByLabelText("Recovery code")).toBeNull();
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "StrongPassword1" },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: "StrongPassword1" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Save new password" }).closest("form")!,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Reset link expired",
  );
  expect(
    screen.getByRole("link", { name: "Request a new reset link" }),
  ).toHaveAttribute("href", "/school/forgot-password");
  expect(screen.getByRole("link", { name: "Back to login" })).toHaveAttribute(
    "href",
    "/school/login?expired=1",
  );
});

test("an invitation does not claim success for a malformed server response", async () => {
  csrfThen({});
  renderWithProviders(<InviteAcceptanceView initialToken={"a".repeat(40)} />);
  expect(screen.queryByLabelText("Invitation token")).toBeNull();
  fireEvent.change(screen.getByLabelText("Create password"), {
    target: { value: "StrongPassword1" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "StrongPassword1" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Create account" }).closest("form")!,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to accept",
  );
  expect(screen.queryByText("Invitation accepted")).toBeNull();
  expect(screen.getByRole("link", { name: "Back to login" })).toBeVisible();
});

test("a stalled authentication request stops waiting and exposes a retryable error", async () => {
  jest.useFakeTimers();
  fetchMock.mockImplementation(
    (_input, init) =>
      new Promise((_resolve, reject) =>
        init.signal.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        ),
      ),
  );
  const request = authFetch("/api/auth/login");
  const assertion = expect(request).rejects.toThrow("connection took too long");
  await act(async () => {
    jest.advanceTimersByTime(AUTH_REQUEST_TIMEOUT_MS);
  });
  await assertion;
});

test("invited students use the invited email in the portal audience", async () => {
  csrfThen({
    session: { audience: "portal" },
    user: { user_id: "student-a" },
    redirectTo: "/portal/student",
  });
  renderWithProviders(
    <PortalLoginView
      mode="student"
      initialEmail="student@example.test"
      initialTenantSlug="school-a"
      acceptedInvite
    />,
  );
  expect(screen.getByLabelText("Student email address")).toHaveValue(
    "student@example.test",
  );
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "StrongPassword1" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Sign in" }).closest("form")!,
  );
  await waitFor(() =>
    expect(routerPushMock).toHaveBeenCalledWith("/portal/student"),
  );
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
    audience: "portal",
    identifier: "student@example.test",
    tenantSlug: "school-a",
  });
});
