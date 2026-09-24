import { createServerAuthClient } from "@/lib/auth/server-auth-client";
import { serializeExperienceSession } from "@/lib/auth/experience-routing";
import {
  ACCESS_COOKIE,
  AUDIENCE_COOKIE,
  getExperienceSessionCookieName,
  REFRESH_COOKIE,
  TENANT_COOKIE,
} from "@/lib/auth/session-cookies";

function buildRequest(host: string, headers: Record<string, string> = {}) {
  return {
    headers: {
      get(name: string) {
        return name.toLowerCase() === "host" ? host : headers[name.toLowerCase()] ?? null;
      },
    },
  } as unknown as Request;
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return {
    status: init?.status ?? 200,
    ok: (init?.status ?? 200) >= 200 && (init?.status ?? 200) < 300,
    json: async () => body,
  } as Response;
}

function cookieReader(values: Record<string, string>) {
  return {
    get(name: string) {
      const value = values[name];
      return value === undefined ? undefined : { value };
    },
  };
}

describe("server auth client production gateway", () => {
  const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalApiBaseDomain = process.env.NEXT_PUBLIC_API_BASE_DOMAIN;
  const originalVercel = process.env.VERCEL;

  beforeEach(() => {
    jest.restoreAllMocks();
    Object.assign(global, { fetch: jest.fn() });
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_DOMAIN;
    delete process.env.VERCEL;
  });

  afterAll(() => {
    if (originalVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = originalVercel;
    if (originalApiBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    }

    if (originalApiBaseDomain === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_DOMAIN;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_DOMAIN = originalApiBaseDomain;
    }
  });

  it("rejects sign-in when the live backend is unavailable", async () => {
    const client = createServerAuthClient(buildRequest("localhost:3000"));

    await expect(
      client.login({
        audience: "superadmin",
        identifier: "system.owner@example.invalid",
        password: "ManagedByPasswordVault!42",
      }),
    ).rejects.toThrow("Authentication service is temporarily unavailable.");
  });

  it("routes superadmin sign-in through the backend instead of local credentials", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.invalid";
    const fetchMock = jest.mocked(global.fetch).mockResolvedValue(
      jsonResponse({
        tokens: {
          access_token: "access-token",
          refresh_token: "refresh-token",
        },
        user: {
          user_id: "user-platform-owner",
          tenant_id: null,
          role: "platform_owner",
          audience: "superadmin",
          email: "system.owner@example.invalid",
          display_name: "System Owner",
          permissions: ["*:*"],
          session_id: "session-platform-owner",
        },
      }),
    );
    const client = createServerAuthClient(buildRequest("localhost:3000"));

    const session = await client.login({
      audience: "superadmin",
      identifier: "system.owner@example.invalid",
      password: "ManagedByPasswordVault!42",
      verificationCode: "123 456",
    });

    expect(session.homePath).toBe("/superadmin");
    expect(session.redirectTo).toBe("/superadmin");
    expect(session.user.tenant_id).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.invalid/auth/login",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-auth-audience": "superadmin",
        }),
        body: JSON.stringify({
          email: "system.owner@example.invalid",
          password: "ManagedByPasswordVault!42",
          audience: "superadmin",
          mfa_code: "123456",
        }),
      }),
    );
  });

  it("normalizes backend outage responses during sign-in", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.invalid";
    jest.mocked(global.fetch).mockResolvedValue(
      jsonResponse(
        {
          status: "error",
          code: 502,
          message: "Application failed to respond",
        },
        { status: 502 },
      ),
    );
    const client = createServerAuthClient(buildRequest("localhost:3000"));

    await expect(
      client.login({
        audience: "superadmin",
        identifier: "system.owner@example.invalid",
        password: "ManagedByPasswordVault!42",
      }),
    ).rejects.toThrow("Authentication service is temporarily unavailable.");
  });

  it("passes backend validation messages through without misclassifying auth as unavailable", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "\"https://api.example.invalid\"";
    const fetchMock = jest.mocked(global.fetch).mockResolvedValue(
      jsonResponse(
        {
          message: ["password must be longer than or equal to 8 characters"],
          error: "Bad Request",
          statusCode: 400,
        },
        { status: 400 },
      ),
    );
    const client = createServerAuthClient(buildRequest("myshule.online"));

    await expect(
      client.login({
        audience: "school",
        identifier: "teacher@example.invalid",
        password: "short",
        tenantSlug: "kb-high",
      }),
    ).rejects.toThrow("password must be longer than or equal to 8 characters");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.invalid/auth/login",
      expect.any(Object),
    );
  });

  it.each([
    ["1", "203.0.113.12", "203.0.113.12"],
    ["1", "2001:db8::1", "2001:db8::1"],
    ["1", "not-an-ip", undefined],
    [undefined, "203.0.113.12", undefined],
  ])("keeps browser identity stable through login, switch and concurrent refresh (Vercel %s, IP %s)", async (vercel, forwardedIp, expectedIp) => {
    if (vercel) process.env.VERCEL = vercel;
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.invalid";
    const user = { user_id: "staff-a", tenant_id: "school-a", role: "teacher", audience: "school",
      email: "teacher@example.test", display_name: "Teacher", permissions: ["auth:read"], session_id: "session-a" };
    jest.mocked(fetch).mockResolvedValue(jsonResponse({ user, tokens: { access_token: "access-a", refresh_token: "refresh-a" } }));
    const client = createServerAuthClient(buildRequest("myshule.online", {
      "x-forwarded-for": forwardedIp!, "user-agent": "School browser",
    }));
    const cookies = cookieReader({
      [ACCESS_COOKIE]: "access-a", [REFRESH_COOKIE]: "refresh-a", [AUDIENCE_COOKIE]: "school", [TENANT_COOKIE]: "school-a",
      [getExperienceSessionCookieName("school")]: serializeExperienceSession({
        experience: "school", role: "teacher", tenantSlug: "school-a", userLabel: "Teacher", homePath: "/school/teacher",
      }),
    });
    await client.login({ audience: "school", tenantSlug: "school-a", identifier: "teacher@example.test", password: "test-only-password" });
    await client.switchActiveRole("teacher", cookies);
    await Promise.all([client.refresh({ audience: "school" }, cookies), client.refresh({ audience: "school" }, cookies)]);
    expect(fetch).toHaveBeenCalledTimes(4);
    for (const [, init] of jest.mocked(fetch).mock.calls) {
      const sent = init?.headers as Record<string, string>;
      expect(sent["user-agent"]).toBe("School browser");
      expect(sent["x-forwarded-for"]).toBe(expectedIp);
    }
  });

  it("strips a trailing api segment from configured backend auth origins", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:3000/api";
    const fetchMock = jest.mocked(global.fetch).mockResolvedValue(
      jsonResponse({
        tokens: {
          access_token: "access-token",
          refresh_token: "refresh-token",
        },
        user: {
          user_id: "user-school-admin",
          tenant_id: "school-alpha",
          role: "admin",
          audience: "school",
          email: "admin@example.invalid",
          display_name: "School Admin",
          permissions: ["students:read"],
          session_id: "session-school-admin",
        },
      }),
    );
    const client = createServerAuthClient(buildRequest("localhost:3000"));

    await client.login({
      audience: "school",
      identifier: "admin@example.invalid",
      password: "ManagedByPasswordVault!42",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3000/auth/login",
      expect.any(Object),
    );
  });

  it("does not create tenant subdomains for local auth base domains", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:3000/api";
    process.env.NEXT_PUBLIC_API_BASE_DOMAIN = "localhost";
    const fetchMock = jest.mocked(global.fetch).mockResolvedValue(
      jsonResponse({
        tokens: {
          access_token: "access-token",
          refresh_token: "refresh-token",
        },
        user: {
          user_id: "user-school-admin",
          tenant_id: "kb-high",
          role: "admin",
          audience: "school",
          email: "admin@example.invalid",
          display_name: "School Admin",
          permissions: ["students:read"],
          session_id: "session-school-admin",
        },
      }),
    );
    const client = createServerAuthClient(buildRequest("localhost:3000"));

    await client.login({
      audience: "school",
      identifier: "admin@example.invalid",
      password: "ManagedByPasswordVault!42",
      tenantSlug: "kb-high",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3000/auth/login",
      expect.any(Object),
    );
  });

  it("times out slow backend sign-in requests", async () => {
    jest.useFakeTimers();
    try {
      process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.invalid";
      jest.mocked(global.fetch).mockImplementation(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            const signal = init && "signal" in init ? init.signal : null;

            if (signal instanceof AbortSignal) {
              signal.addEventListener("abort", () => {
                reject(new DOMException("The operation was aborted.", "AbortError"));
              });
            }
          }),
      );
      const client = createServerAuthClient(buildRequest("localhost:3000"));

      const loginPromise = client.login({
        audience: "superadmin",
        identifier: "system.owner@example.invalid",
        password: "ManagedByPasswordVault!42",
      });

      jest.advanceTimersByTime(25_000);

      await expect(loginPromise).rejects.toThrow(
        "Authentication service is temporarily unavailable.",
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it("lets the backend resolve the school tenant during sign-in", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.invalid";
    const fetchMock = jest.mocked(global.fetch).mockResolvedValue(
      jsonResponse({
        tokens: {
          access_token: "access-token",
          refresh_token: "refresh-token",
        },
        user: {
          user_id: "user-school-admin",
          tenant_id: "school-alpha",
          role: "admin",
          audience: "school",
          email: "admin@example.invalid",
          display_name: "School Admin",
          permissions: ["students:read"],
          session_id: "session-school-admin",
        },
      }),
    );
    const client = createServerAuthClient(buildRequest("localhost:3000"));

    const session = await client.login({
      audience: "school",
      identifier: "admin@example.invalid",
      password: "ManagedByPasswordVault!42",
    });

    expect(session.tenantSlug).toBe("school-alpha");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.invalid/auth/login",
      expect.objectContaining({
        headers: expect.not.objectContaining({
          "x-tenant-id": expect.any(String),
        }),
      }),
    );
  });

  it("does not infer the public apex domain as a school tenant during sign-in", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.invalid";
    const fetchMock = jest.mocked(global.fetch).mockResolvedValue(
      jsonResponse({
        tokens: {
          access_token: "access-token",
          refresh_token: "refresh-token",
        },
        user: {
          user_id: "user-school-admin",
          tenant_id: "school-alpha",
          role: "admin",
          audience: "school",
          email: "admin@example.invalid",
          display_name: "School Admin",
          permissions: ["students:read"],
          session_id: "session-school-admin",
        },
      }),
    );
    const client = createServerAuthClient(buildRequest("myshule.online"));

    const session = await client.login({
      audience: "school",
      identifier: "admin@example.invalid",
      password: "ManagedByPasswordVault!42",
    });

    expect(session.tenantSlug).toBe("school-alpha");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.invalid/auth/login",
      expect.objectContaining({
        headers: expect.not.objectContaining({
          "x-tenant-id": expect.any(String),
        }),
      }),
    );
  });

  it("routes school staff to the backend tenant context and role home", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.invalid";
    const fetchMock = jest.mocked(global.fetch).mockResolvedValue(
      jsonResponse({
        tokens: {
          access_token: "access-token",
          refresh_token: "refresh-token",
        },
        user: {
          user_id: "user-school-admin",
          tenant_id: "school-alpha",
          role: "admin",
          audience: "school",
          email: "admin@example.invalid",
          display_name: "School Admin",
          permissions: ["students:read"],
          session_id: "session-school-admin",
        },
      }),
    );
    const client = createServerAuthClient(buildRequest("my-shule-erp.vercel.app"));

    const session = await client.login({
      audience: "school",
      identifier: "admin@example.invalid",
      password: "ManagedByPasswordVault!42",
      tenantSlug: "school-alpha",
    });

    expect(session.homePath).toBe("/school/admin");
    expect(session.redirectTo).toBe("/school/admin");
    expect(session.tenantSlug).toBe("school-alpha");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.invalid/auth/login",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-auth-audience": "school",
          "x-tenant-id": "school-alpha",
        }),
      }),
    );
  });

  it("routes backend school owner accounts to the principal command workspace", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.invalid";
    jest.mocked(global.fetch).mockResolvedValue(
      jsonResponse({
        tokens: {
          access_token: "access-token",
          refresh_token: "refresh-token",
        },
        user: {
          user_id: "user-school-owner",
          tenant_id: "school-alpha",
          role: "owner",
          audience: "school",
          email: "owner@example.invalid",
          display_name: "School Owner",
          permissions: ["tenant:admin"],
          session_id: "session-school-owner",
        },
      }),
    );
    const client = createServerAuthClient(buildRequest("my-shule-erp.vercel.app"));

    const session = await client.login({
      audience: "school",
      identifier: "owner@example.invalid",
      password: "ManagedByPasswordVault!42",
    });

    expect(session.homePath).toBe("/school/principal");
    expect(session.redirectTo).toBe("/school/principal");
    expect(session.role).toBe("principal");
    expect(session.user.role).toBe("owner");
  });

  it("preserves the backend-issued role context and exact authorization code when switching", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.invalid";
    const roleContext = {
      primary_role: "owner",
      active_role: "owner",
      assigned_roles: ["owner", "dean-of-academics"],
      available_roles: [
        {
          role_code: "owner",
          role_name: "Principal Dashboard",
          is_primary: true,
          is_teacher_mode: false,
          sources: ["primary_membership"],
        },
        {
          role_code: "teacher",
          role_name: "Teacher Dashboard",
          is_primary: false,
          is_teacher_mode: true,
          sources: ["teacher_eligibility"],
        },
      ],
      teacher_dashboard_eligible: true,
    };
    const fetchMock = jest.mocked(global.fetch).mockResolvedValue(jsonResponse({
      tokens: { access_token: "new-access", refresh_token: "new-refresh" },
      user: {
        user_id: "user-owner",
        tenant_id: "school-alpha",
        role: "owner",
        email: "owner@example.invalid",
        display_name: "School Owner",
        permissions: ["tenant:admin"],
        session_id: "session-owner",
      },
      role_context: roleContext,
    }));
    const client = createServerAuthClient(buildRequest("myshule.online"));
    const cookies = cookieReader({
      [AUDIENCE_COOKIE]: "school",
      [ACCESS_COOKIE]: "old-access",
      [REFRESH_COOKIE]: "old-refresh",
      [TENANT_COOKIE]: "school-alpha",
      [getExperienceSessionCookieName("school")]: serializeExperienceSession({
        experience: "school",
        homePath: "/school/teacher",
        role: "teacher",
        tenantSlug: "school-alpha",
        userLabel: "School Owner",
      }),
    });

    const session = await client.switchActiveRole("owner", cookies);

    expect(session.role).toBe("principal");
    expect(session.homePath).toBe("/school/principal");
    expect(session.roleContext?.availableRoles[0]).toMatchObject({
      roleCode: "principal",
      authorizationRoleCode: "owner",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.invalid/auth/active-role",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ role_code: "owner" }),
      }),
    );
  });

  it("keeps Teacher as the active dashboard across token refresh", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.invalid";
    jest.mocked(global.fetch).mockResolvedValue(jsonResponse({
      tokens: { access_token: "next-access", refresh_token: "next-refresh" },
      user: {
        user_id: "user-principal",
        tenant_id: "school-alpha",
        role: "teacher",
        email: "principal@example.invalid",
        display_name: "Jane Mwangi",
        permissions: ["academics:read"],
        session_id: "session-principal",
      },
      role_context: {
        primary_role: "principal",
        active_role: "teacher",
        assigned_roles: ["principal"],
        available_roles: [
          {
            role_code: "principal",
            role_name: "Principal Dashboard",
            is_primary: true,
            is_teacher_mode: false,
            sources: ["primary_membership"],
          },
          {
            role_code: "teacher",
            role_name: "Teacher Dashboard",
            is_primary: false,
            is_teacher_mode: true,
            sources: ["teacher_eligibility"],
          },
        ],
        teacher_dashboard_eligible: true,
      },
    }));
    const client = createServerAuthClient(buildRequest("myshule.online"));
    const session = await client.refresh({ audience: "school" }, cookieReader({
      [REFRESH_COOKIE]: "old-refresh",
      [TENANT_COOKIE]: "school-alpha",
    }));

    expect(session.role).toBe("teacher");
    expect(session.homePath).toBe("/school/teacher");
    expect(session.roleContext?.activeRole).toBe("teacher");
  });

  it("routes portal sign-in through the backend and keeps viewer-specific destinations", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.invalid";
    jest.mocked(global.fetch).mockResolvedValue(
      jsonResponse({
        tokens: {
          access_token: "access-token",
          refresh_token: "refresh-token",
        },
        user: {
          user_id: "user-student",
          tenant_id: "school-alpha",
          role: "student",
          audience: "portal",
          email: "student@example.invalid",
          display_name: "Student",
          permissions: ["portal:read"],
          session_id: "session-student",
        },
      }),
    );
    const client = createServerAuthClient(buildRequest("my-shule-erp.vercel.app"));

    const session = await client.login({
      audience: "portal",
      identifier: "student@example.invalid",
      password: "ManagedByPasswordVault!42",
      tenantSlug: "school-alpha",
    });

    expect(session.homePath).toBe("/portal/student");
    expect(session.redirectTo).toBe("/portal/student");
  });
});
