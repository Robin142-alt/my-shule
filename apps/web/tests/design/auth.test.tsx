import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PublicSchoolLoginView } from "@/components/auth/public-school-login-view";
import { ForgotPasswordView } from "@/components/auth/auth-recovery-view";
import { VerifyEmailView } from "@/components/auth/email-verification-view";
import { MfaVerificationView } from "@/components/auth/mfa-verification-view";
import { PortalLoginView } from "@/components/auth/portal-login-view";
import { SchoolLoginView } from "@/components/auth/school-login-view";
import { SuperadminLoginView } from "@/components/auth/superadmin-login-view";
import { MFA_LOGIN_CHALLENGE_STORAGE_KEY } from "@/lib/auth/mfa-login-challenge";
import { resolveSchoolBranding } from "@/lib/auth/school-branding";

import { routerPushMock } from "./router-mock";
import { renderWithProviders } from "./test-utils";

jest.setTimeout(15_000);

describe("enterprise authentication flows", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    sessionStorage.clear();
  });

  function mockSecureLogin(payload: unknown) {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "csrf-test-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => payload,
      });
  }

  test("does not expose super admin credentials and submits the real secure login", async () => {
    const user = userEvent.setup();

    mockSecureLogin({
        redirectTo: "/superadmin",
        session: {
          audience: "superadmin",
          homePath: "/superadmin",
          userLabel: "Platform owner",
        },
    });

    renderWithProviders(<SuperadminLoginView />);

    expect(screen.getByText(/welcome back/i)).toBeVisible();
    expect(screen.queryByText(/system\.owner@example\.invalid/i)).toBeNull();
    expect(screen.queryByText(/managed-by-vault/i)).toBeNull();

    await user.type(screen.getByLabelText(/^email$/i), "system.owner@example.invalid");
    await user.type(
      screen.getByLabelText(/^password$/i),
      "managed-by-vault",
    );
    await user.click(
      screen.getByRole("button", { name: /continue securely/i }),
    );

    await waitFor(() =>
      expect(routerPushMock).toHaveBeenCalledWith("/superadmin"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-myshule-csrf": "csrf-test-token",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        body: expect.not.stringContaining("verificationCode"),
      }),
    );
  });

  test("super admin sign-in moves MFA code entry to the dedicated verification page", async () => {
    const user = userEvent.setup();

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "csrf-first-token" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "MFA challenge required for this role" }),
      });

    renderWithProviders(<SuperadminLoginView />);

    await user.type(screen.getByLabelText(/^email$/i), "owner@example.invalid");
    await user.type(screen.getByLabelText(/^password$/i), "ManagedByVault!2026");
    await user.click(screen.getByRole("button", { name: /continue securely/i }));

    await waitFor(() =>
      expect(routerPushMock).toHaveBeenCalledWith("/verify-code?audience=superadmin"),
    );
    expect(screen.queryByLabelText(/verification code/i)).not.toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem(MFA_LOGIN_CHALLENGE_STORAGE_KEY) ?? "{}")).toMatchObject({
      audience: "superadmin",
      identifier: "owner@example.invalid",
      password: "ManagedByVault!2026",
      tenantSlug: null,
      redirectFallback: "/superadmin",
    });
  });

  test("dedicated MFA verification page submits the stored pending login with the code", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem(
      MFA_LOGIN_CHALLENGE_STORAGE_KEY,
      JSON.stringify({
        audience: "superadmin",
        identifier: "owner@example.invalid",
        password: "ManagedByVault!2026",
        tenantSlug: null,
        redirectFallback: "/superadmin",
        createdAt: Date.now(),
      }),
    );

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "csrf-second-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          redirectTo: "/superadmin",
          session: {
            audience: "superadmin",
            homePath: "/superadmin",
            userLabel: "Platform owner",
          },
        }),
      });

    renderWithProviders(<MfaVerificationView />);

    expect(screen.getByRole("heading", { name: /enter verification code/i })).toBeVisible();
    await user.type(screen.getByLabelText(/verification code/i), "123 456");
    await user.click(screen.getByRole("button", { name: /verify and continue/i }));

    await waitFor(() =>
      expect(routerPushMock).toHaveBeenCalledWith("/superadmin"),
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        body: expect.stringContaining('"verificationCode":"123456"'),
      }),
    );
    expect(sessionStorage.getItem(MFA_LOGIN_CHALLENGE_STORAGE_KEY)).toBeNull();
  });

  test("does not expose school staff credentials and routes bursar access", async () => {
    const user = userEvent.setup();

    mockSecureLogin({
        redirectTo: "/school/bursar",
        session: {
          audience: "school",
          homePath: "/school/bursar",
          role: "bursar",
          tenantSlug: "school-alpha",
          userLabel: "finance.admin@example.invalid",
        },
    });

    renderWithProviders(
      <SchoolLoginView
        resolution={resolveSchoolBranding("school-alpha.app.com")}
      />,
    );

    expect(screen.getByText(/run your school with operational clarity/i)).toBeVisible();
    expect(screen.queryByText(/finance\.admin@example\.invalid/i)).toBeNull();
    expect(screen.queryByText(/managed-by-vault/i)).toBeNull();

    await user.type(
      screen.getByLabelText(/email address/i),
      "finance.admin@example.invalid",
    );
    await user.type(
      screen.getByLabelText(/^password$/i),
      "managed-by-vault",
    );
    await user.click(screen.getByRole("button", { name: /sign in securely/i }));

    await waitFor(() =>
      expect(routerPushMock).toHaveBeenCalledWith("/school/bursar"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-myshule-csrf": "csrf-test-token",
        }),
      }),
    );
  });

  test("generic school login lets the backend resolve the invited school membership", async () => {
    const user = userEvent.setup();

    mockSecureLogin({
        redirectTo: "/school/admin",
        session: {
          audience: "school",
          homePath: "/school/admin",
          role: "admin",
          tenantSlug: "school-alpha",
          userLabel: "school.admin@example.invalid",
        },
    });

    renderWithProviders(
      <SchoolLoginView
        resolution={resolveSchoolBranding("myshule.online")}
      />,
    );

    await user.type(
      screen.getByLabelText(/email address/i),
      "school.admin@example.invalid",
    );
    await user.type(screen.getByLabelText(/^password$/i), "managed-by-vault");
    await user.click(screen.getByRole("button", { name: /sign in securely/i }));

    await waitFor(() =>
      expect(routerPushMock).toHaveBeenCalledWith("/school/admin"),
    );

    const loginCall = fetchMock.mock.calls.find(([url]) => url === "/api/auth/login");
    expect(JSON.parse(String(loginCall?.[1]?.body))).toMatchObject({
      audience: "school",
      tenantSlug: null,
    });
  });

  test("school invite login fills the invited email and keeps school access active", async () => {
    const user = userEvent.setup();

    mockSecureLogin({
        redirectTo: "/school/teacher",
        session: {
          audience: "school",
          homePath: "/school/teacher",
          role: "teacher",
          tenantSlug: "kisumu-boys",
          userLabel: "teacher.invited@example.test",
        },
    });

    renderWithProviders(
      <SchoolLoginView
        resolution={resolveSchoolBranding("myshule.online")}
        initialEmail="teacher.invited@example.test"
        initialTenantSlug="kisumu-boys"
        acceptedInvite
      />,
    );

    expect(screen.getByLabelText(/email address/i)).toHaveValue("teacher.invited@example.test");
    expect(screen.queryByText(/school access pending/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Use the password you just created/i)).toBeVisible();
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute("autocomplete", "new-password");

    await user.type(screen.getByLabelText(/^password$/i), "managed-by-vault");
    await user.click(screen.getByRole("button", { name: /sign in securely/i }));

    await waitFor(() =>
      expect(routerPushMock).toHaveBeenCalledWith("/school/teacher"),
    );

    const loginCall = fetchMock.mock.calls.find(([url]) => url === "/api/auth/login");
    expect(JSON.parse(String(loginCall?.[1]?.body))).toMatchObject({
      audience: "school",
      identifier: "teacher.invited@example.test",
      tenantSlug: "kisumu-boys",
    });
  });

  test("parent invite login fills the invited email without using the invited name", async () => {
    const user = userEvent.setup();

    mockSecureLogin({
        redirectTo: "/portal/parent",
        session: {
          audience: "portal",
          homePath: "/portal/parent",
          viewer: "parent",
          userLabel: "parent.invited@example.test",
        },
    });

    renderWithProviders(
      <PortalLoginView
        mode="parent"
        initialEmail="parent.invited@example.test"
        initialTenantSlug="kisumu-boys"
      />,
    );

    expect(screen.getByLabelText(/parent email address/i)).toHaveValue("parent.invited@example.test");
    expect(screen.queryByDisplayValue(/Grace Njeri/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/^password$/i), "managed-by-vault");
    await user.click(screen.getByRole("button", { name: /continue as parent/i }));

    await waitFor(() =>
      expect(routerPushMock).toHaveBeenCalledWith("/portal/parent"),
    );

    const loginCall = fetchMock.mock.calls.find(([url]) => url === "/api/auth/login");
    expect(JSON.parse(String(loginCall?.[1]?.body))).toMatchObject({
      audience: "portal",
      identifier: "parent.invited@example.test",
      tenantSlug: "kisumu-boys",
    });
  });

  test("does not expose portal credentials and signs a student in", async () => {
    const user = userEvent.setup();

    mockSecureLogin({
        redirectTo: "/portal/student",
        session: {
          audience: "portal",
          homePath: "/portal/student",
          viewer: "student",
          userLabel: "student@example.invalid",
        },
    });

    renderWithProviders(<PortalLoginView />);

    expect(screen.getByText(/stay connected to your child in real time/i)).toBeVisible();
    expect(screen.queryByText(/student@example\.invalid/i)).toBeNull();
    expect(screen.queryByText(/managed-by-vault/i)).toBeNull();

    await user.type(
      screen.getByLabelText(/portal email address/i),
      "student@example.invalid",
    );
    await user.type(
      screen.getByLabelText(/^password$/i),
      "managed-by-vault",
    );
    await user.click(screen.getByRole("button", { name: /open portal/i }));

    await waitFor(() =>
      expect(routerPushMock).toHaveBeenCalledWith("/portal/student"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-myshule-csrf": "csrf-test-token",
        }),
      }),
    );
  });

  test("lets the public entry experience route a school user without exposing chooser cards", async () => {
    const user = userEvent.setup();

    mockSecureLogin({
        redirectTo: "/school/bursar",
        session: {
          audience: "school",
          homePath: "/school/bursar",
          role: "bursar",
          tenantSlug: "school-alpha",
          userLabel: "finance.admin@example.invalid",
        },
    });

    renderWithProviders(<PublicSchoolLoginView />);

    expect(
      screen.getByRole("heading", {
        name: /sign in to your school account/i,
      }),
    ).toBeVisible();
    expect(screen.queryByText(/one premium platform/i)).toBeNull();
    expect(screen.queryByText(/enter workspace/i)).toBeNull();

    await user.type(
      screen.getByLabelText(/email address/i),
      "finance.admin@example.invalid",
    );
    await user.type(
      screen.getByLabelText(/^password$/i),
      "managed-by-vault",
    );
    await user.click(screen.getByRole("button", { name: /sign in securely/i }));

    await waitFor(() =>
      expect(routerPushMock).toHaveBeenCalledWith("/school/bursar"),
    );
  });

  test("forgot password submits a CSRF-protected recovery request", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "csrf-test-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: "If the account is eligible, password recovery instructions have been sent.",
        }),
      });

    renderWithProviders(
      <ForgotPasswordView
        title="Recover platform access"
        subtitle="Enter your platform email."
        identifierLabel="Work email"
        identifierPlaceholder="Enter your work email"
        submitLabel="Send recovery link"
        backHref="/superadmin/login"
        successMessage="If the account is eligible, password recovery instructions have been sent."
        audience="superadmin"
      />,
    );

    await user.type(screen.getByLabelText(/work email/i), "owner@example.invalid");
    await user.click(screen.getByRole("button", { name: /send recovery link/i }));

    await screen.findByText(/check your messages/i);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/auth/csrf",
      expect.objectContaining({
        method: "GET",
        credentials: "same-origin",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/password-recovery/request",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: expect.objectContaining({
          "x-myshule-csrf": "csrf-test-token",
        }),
        body: JSON.stringify({
          audience: "superadmin",
          identifier: "owner@example.invalid",
          tenantSlug: null,
        }),
      }),
    );
  });

  test("forgot password requires an email address before calling recovery", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ForgotPasswordView
        title="Recover platform access"
        subtitle="Enter your verified email."
        identifierLabel="Email address"
        identifierPlaceholder="Enter your email address"
        submitLabel="Send recovery link"
        backHref="/superadmin/login"
        successMessage="If the account is eligible, password recovery instructions have been sent."
        audience="superadmin"
      />,
    );

    await user.type(screen.getByLabelText(/email address/i), "0712345678");
    await user.click(screen.getByRole("button", { name: /send recovery link/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("verify email consumes link tokens through the secure proxy", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "csrf-email-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: "Email verified successfully.",
        }),
      });

    renderWithProviders(<VerifyEmailView initialToken="email-link-token" />);

    await screen.findByRole("status");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/auth/csrf",
      expect.objectContaining({
        method: "GET",
        credentials: "same-origin",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/email-verification/verify",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: expect.objectContaining({
          "x-myshule-csrf": "csrf-email-token",
        }),
        body: JSON.stringify({
          token: "email-link-token",
        }),
      }),
    );
  });

  test("school login requires an email address before calling authentication", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchoolLoginView
        resolution={resolveSchoolBranding("school-alpha.app.com")}
      />,
    );

    await user.type(screen.getByLabelText(/email address/i), "0712345678");
    await user.type(screen.getByLabelText(/^password$/i), "managed-by-vault");
    await user.click(screen.getByRole("button", { name: /sign in securely/i }));

    expect(await screen.findByText(/enter a valid work email address/i)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
