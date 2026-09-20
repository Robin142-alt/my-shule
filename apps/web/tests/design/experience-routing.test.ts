import {
  evaluateExperienceRouting,
  PORTAL_SESSION_COOKIE,
  resolveExperienceHost,
  SCHOOL_SESSION_COOKIE,
  serializeExperienceSession,
  SUPERADMIN_SESSION_COOKIE,
} from "@/lib/auth/experience-routing";

function unsignedJwt(payload: Record<string, unknown>) {
  return [
    Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify(payload)).toString("base64url"),
    "signature",
  ].join(".");
}

describe("experience routing", () => {
  test.each(["attendance", "welfare", "staff-duty", "teaching", "academics"])("routes the deputy's current %s workspace on its school host", (section) => {
    const cookies = { [SCHOOL_SESSION_COOKIE]: serializeExperienceSession({ experience: "school", role: "deputy-principal", tenantSlug: "barakaacademy", userLabel: "Deputy", homePath: "/dashboard" }) };
    const refreshToken = unsignedJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(evaluateExperienceRouting({ host: "barakaacademy.myshule.test", pathname: `/${section}`, cookies, refreshToken }))
      .toMatchObject({ action: "next", rewrittenPath: `/internal/school/${section}` });
    expect(evaluateExperienceRouting({ host: "other-school.myshule.test", pathname: `/${section}`, cookies, refreshToken }))
      .toMatchObject({ action: "redirect", location: "/login" });
    expect(evaluateExperienceRouting({ host: "barakaacademy.myshule.test", pathname: "/academic-setup", cookies, refreshToken }))
      .toMatchObject({ action: "redirect", location: "/academics" });
  });
  test("resolves superadmin hosts into the platform experience", () => {
    expect(resolveExperienceHost("superadmin.myshule.test")).toEqual({
      experience: "superadmin",
      host: "superadmin.myshule.test",
      tenantSlug: null,
    });
  });

  test("resolves school subdomains into the tenant experience", () => {
    expect(resolveExperienceHost("barakaacademy.myshule.test")).toEqual({
      experience: "school",
      host: "barakaacademy.myshule.test",
      tenantSlug: "barakaacademy",
    });
  });

  test("resolves portal hosts into the family experience", () => {
    expect(resolveExperienceHost("portal.myshule.test")).toEqual({
      experience: "portal",
      host: "portal.myshule.test",
      tenantSlug: null,
    });
  });

  test("resolves loopback IP hosts into the public experience", () => {
    expect(resolveExperienceHost("127.0.0.1:3005")).toEqual({
      experience: "public",
      host: "127.0.0.1",
      tenantSlug: null,
    });
  });

  test("resolves hosted vercel app domains into the public experience", () => {
    expect(resolveExperienceHost("my-shule-erp.vercel.app")).toEqual({
      experience: "public",
      host: "my-shule-erp.vercel.app",
      tenantSlug: null,
    });
  });

  test("redirects a superadmin host root request to the superadmin login without a session", () => {
    expect(
      evaluateExperienceRouting({
        host: "superadmin.myshule.test",
        pathname: "/",
        cookies: {},
      }),
    ).toEqual({
      action: "redirect",
      location: "/login",
      headers: {
        "x-platform-experience": "superadmin",
      },
    });
  });

  test("rewrites superadmin dashboard requests into the internal platform namespace", () => {
    expect(
      evaluateExperienceRouting({
        host: "superadmin.myshule.test",
        pathname: "/dashboard",
        cookies: {},
      }),
    ).toEqual({
      action: "redirect",
      location: "/login",
      headers: {
        "x-platform-experience": "superadmin",
      },
    });
  });

  test("rewrites school dashboard requests into the internal tenant namespace once authenticated", () => {
    expect(
      evaluateExperienceRouting({
        host: "greenfield.myshule.test",
        pathname: "/dashboard",
        cookies: {
          [SCHOOL_SESSION_COOKIE]: serializeExperienceSession({
            experience: "school",
            homePath: "/dashboard",
            role: "principal",
            tenantSlug: "greenfield",
            userLabel: "Principal",
          }),
        },
      }),
    ).toEqual({
      action: "next",
      rewrittenPath: "/internal/school/dashboard",
      headers: {
        "x-platform-experience": "school",
        "x-tenant-slug": "greenfield",
      },
    });
  });

  test("rewrites unauthenticated school subdomain roots to the public tenant page", () => {
    expect(
      evaluateExperienceRouting({
        host: "greenfield.myshule.online",
        pathname: "/",
        cookies: {},
      }),
    ).toEqual({
      action: "next",
      rewrittenPath: "/school/greenfield",
      headers: {
        "x-platform-experience": "school",
        "x-tenant-slug": "greenfield",
      },
    });
  });

  test("rewrites role dashboard aliases into internal school sections once authenticated", () => {
    expect(
      evaluateExperienceRouting({
        host: "greenfield.myshule.test",
        pathname: "/finance/dashboard",
        cookies: {
          [SCHOOL_SESSION_COOKIE]: serializeExperienceSession({
            experience: "school",
            homePath: "/finance/dashboard",
            role: "bursar",
            tenantSlug: "greenfield",
            userLabel: "Bursar",
          }),
        },
      }),
    ).toEqual({
      action: "next",
      rewrittenPath: "/internal/school/finance",
      headers: {
        "x-platform-experience": "school",
        "x-tenant-slug": "greenfield",
      },
    });
  });

  test("routes module-controlled academic aliases into the school workspace", () => {
    const cookies = {
      [SCHOOL_SESSION_COOKIE]: serializeExperienceSession({
        experience: "school",
        homePath: "/dashboard",
        role: "teacher",
        tenantSlug: "greenfield",
        userLabel: "Teacher",
      }),
    };

    expect(
      evaluateExperienceRouting({
        host: "greenfield.myshule.test",
        pathname: "/academics/dashboard",
        cookies,
      }),
    ).toEqual({
      action: "next",
      rewrittenPath: "/internal/school/academics",
      headers: {
        "x-platform-experience": "school",
        "x-tenant-slug": "greenfield",
      },
    });

    expect(
      evaluateExperienceRouting({
        host: "greenfield.myshule.test",
        pathname: "/school/teacher/academics",
        cookies,
      }),
    ).toEqual({
      action: "redirect",
      location: "/academics",
      headers: {
        "x-platform-experience": "school",
        "x-tenant-slug": "greenfield",
      },
    });
  });

  test("allows authenticated storekeeper sessions to open dedicated inventory routes", () => {
    expect(
      evaluateExperienceRouting({
        host: "amani-prep.myshule.test",
        pathname: "/inventory/dashboard",
        cookies: {
          [SCHOOL_SESSION_COOKIE]: serializeExperienceSession({
            experience: "school",
            homePath: "/inventory/dashboard",
            role: "storekeeper",
            tenantSlug: "amani-prep",
            userLabel: "Storekeeper Amani Prep",
          }),
        },
      }),
    ).toEqual({
      action: "next",
      headers: {
        "x-platform-experience": "school",
        "x-tenant-slug": "amani-prep",
      },
    });
  });

  test("denies dedicated inventory routes to non-storekeeper school sessions", () => {
    expect(
      evaluateExperienceRouting({
        host: "amani-prep.myshule.test",
        pathname: "/inventory/dashboard",
        cookies: {
          [SCHOOL_SESSION_COOKIE]: serializeExperienceSession({
            experience: "school",
            homePath: "/school/bursar",
            role: "bursar",
            tenantSlug: "amani-prep",
            userLabel: "Bursar",
          }),
        },
      }),
    ).toEqual({
      action: "redirect",
      location: "/forbidden",
      headers: {
        "x-platform-experience": "school",
        "x-tenant-slug": "amani-prep",
      },
    });
  });

  test("allows authenticated librarian sessions to open dedicated library routes", () => {
    expect(
      evaluateExperienceRouting({
        host: "amani-prep.myshule.test",
        pathname: "/library/dashboard",
        cookies: {
          [SCHOOL_SESSION_COOKIE]: serializeExperienceSession({
            experience: "school",
            homePath: "/library/dashboard",
            role: "librarian",
            tenantSlug: "amani-prep",
            userLabel: "Librarian Amani Prep",
          }),
        },
      }),
    ).toEqual({
      action: "next",
      headers: {
        "x-platform-experience": "school",
        "x-tenant-slug": "amani-prep",
      },
    });
  });

  test("denies dedicated library routes to non-librarian school sessions", () => {
    expect(
      evaluateExperienceRouting({
        host: "amani-prep.myshule.test",
        pathname: "/library/dashboard",
        cookies: {
          [SCHOOL_SESSION_COOKIE]: serializeExperienceSession({
            experience: "school",
            homePath: "/dashboard",
            role: "principal",
            tenantSlug: "amani-prep",
            userLabel: "Principal",
          }),
        },
      }),
    ).toEqual({
      action: "redirect",
      location: "/forbidden",
      headers: {
        "x-platform-experience": "school",
        "x-tenant-slug": "amani-prep",
      },
    });
  });

  test("redirects authenticated school sessions away from the login page to their role home", () => {
    expect(
      evaluateExperienceRouting({
        host: "barakaacademy.myshule.test",
        pathname: "/school/login",
        cookies: {
          [SCHOOL_SESSION_COOKIE]: serializeExperienceSession({
            experience: "school",
            homePath: "/dashboard",
            role: "bursar",
            tenantSlug: "barakaacademy",
            userLabel: "Bursar",
          }),
        },
      }),
    ).toEqual({
      action: "redirect",
      location: "/dashboard",
      headers: {
        "x-platform-experience": "school",
        "x-tenant-slug": "barakaacademy",
      },
    });
  });

  test("treats stale school sessions with expired refresh tokens as logged out", () => {
    expect(
      evaluateExperienceRouting({
        host: "greenfield.myshule.test",
        pathname: "/dashboard",
        refreshToken: unsignedJwt({ exp: Math.floor(Date.now() / 1000) - 60 }),
        cookies: {
          [SCHOOL_SESSION_COOKIE]: serializeExperienceSession({
            experience: "school",
            homePath: "/dashboard",
            role: "principal",
            tenantSlug: "greenfield",
            userLabel: "Principal",
          }),
        },
      }),
    ).toEqual({
      action: "redirect",
      location: "/login",
      headers: {
        "x-platform-experience": "school",
        "x-tenant-slug": "greenfield",
      },
    });
  });

  test("normalizes stale school owner sessions into the principal command route", () => {
    expect(
      evaluateExperienceRouting({
        host: "barakaacademy.myshule.test",
        pathname: "/",
        cookies: {
          [SCHOOL_SESSION_COOKIE]: serializeExperienceSession({
            experience: "school",
            homePath: "/school/owner",
            role: "owner" as never,
            tenantSlug: "barakaacademy",
            userLabel: "School Owner",
          }),
        },
      }),
    ).toEqual({
      action: "redirect",
      location: "/school/principal",
      headers: {
        "x-platform-experience": "school",
        "x-tenant-slug": "barakaacademy",
      },
    });
  });

  test("redirects authenticated portal users away from the login page to their viewer home", () => {
    expect(
      evaluateExperienceRouting({
        host: "portal.myshule.test",
        pathname: "/portal/login",
        cookies: {
          [PORTAL_SESSION_COOKIE]: serializeExperienceSession({
            experience: "portal",
            homePath: "/dashboard",
            viewer: "parent",
            userLabel: "Parent",
          }),
        },
      }),
    ).toEqual({
      action: "redirect",
      location: "/dashboard",
      headers: {
        "x-platform-experience": "portal",
      },
    });
  });

  test("redirects authenticated superadmin users away from the login page to the platform home", () => {
    expect(
      evaluateExperienceRouting({
        host: "superadmin.myshule.test",
        pathname: "/superadmin/login",
        cookies: {
          [SUPERADMIN_SESSION_COOKIE]: serializeExperienceSession({
            experience: "superadmin",
            homePath: "/dashboard",
            userLabel: "Platform owner",
          }),
        },
      }),
    ).toEqual({
      action: "redirect",
      location: "/dashboard",
      headers: {
        "x-platform-experience": "superadmin",
      },
    });
  });

  test("rewrites public login routes into the portal internal namespace", () => {
    expect(
      evaluateExperienceRouting({
        host: "portal.myshule.test",
        pathname: "/login",
        cookies: {},
      }),
    ).toEqual({
      action: "next",
      rewrittenPath: "/internal/portal/login",
      headers: {
        "x-platform-experience": "portal",
      },
    });
  });

  test("redirects legacy dashboard role routes on local public hosts to new school dashboards", () => {
    expect(
      evaluateExperienceRouting({
        host: "127.0.0.1:3005",
        pathname: "/dashboard/admin",
        cookies: {},
      }),
    ).toEqual({
      action: "redirect",
      location: "/school/admin",
      headers: {
        "x-platform-experience": "public",
      },
    });
  });

  test("preserves legacy dashboard workspace paths when redirecting to new school dashboards", () => {
    expect(
      evaluateExperienceRouting({
        host: "127.0.0.1:3005",
        pathname: "/dashboard/teacher/exams-marks",
        cookies: {},
      }),
    ).toEqual({
      action: "redirect",
      location: "/school/teacher/exams-marks",
      headers: {
        "x-platform-experience": "public",
      },
    });

    expect(
      evaluateExperienceRouting({
        host: "127.0.0.1:3005",
        pathname: "/dashboard/exam-manager/overview",
        cookies: {},
      }),
    ).toEqual({
      action: "redirect",
      location: "/school/exams-manager/overview",
      headers: {
        "x-platform-experience": "public",
      },
    });

    expect(
      evaluateExperienceRouting({
        host: "127.0.0.1:3005",
        pathname: "/dashboard/deputy-principal/approvals",
        cookies: {},
      }),
    ).toEqual({
      action: "redirect",
      location: "/school/deputy-principal/approvals",
      headers: {
        "x-platform-experience": "public",
      },
    });

    expect(
      evaluateExperienceRouting({
        host: "127.0.0.1:3005",
        pathname: "/dashboard/teacher/students/std-1",
        cookies: {},
      }),
    ).toEqual({
      action: "redirect",
      location: "/school/teacher/students/std-1",
      headers: {
        "x-platform-experience": "public",
      },
    });
  });

  test("redirects public dashboard home to the canonical school dashboard from the session", () => {
    expect(
      evaluateExperienceRouting({
        host: "127.0.0.1:3005",
        pathname: "/dashboard",
        cookies: {
          [SCHOOL_SESSION_COOKIE]: serializeExperienceSession({
            experience: "school",
            homePath: "/dashboard/teacher",
            role: "teacher",
            tenantSlug: "homabay-high",
            userLabel: "Teacher",
          }),
        },
      }),
    ).toEqual({
      action: "redirect",
      location: "/school/teacher",
      headers: {
        "x-platform-experience": "public",
      },
    });
  });

  test("leaves public compatibility login routes alone on hosted vercel domains", () => {
    expect(
      evaluateExperienceRouting({
        host: "my-shule-erp.vercel.app",
        pathname: "/superadmin/login",
        cookies: {},
      }),
    ).toEqual({
      action: "next",
      headers: {
        "x-platform-experience": "public",
      },
    });
  });
});
