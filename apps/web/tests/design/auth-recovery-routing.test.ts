import {
  evaluateExperienceRouting,
  SCHOOL_SESSION_COOKIE,
  SUPERADMIN_SESSION_COOKIE,
  PORTAL_SESSION_COOKIE,
  serializeExperienceSession,
} from "@/lib/auth/experience-routing";

const refreshToken = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString("base64url")}.signature`;
const cookies = {
  [SCHOOL_SESSION_COOKIE]: serializeExperienceSession({
    experience: "school",
    role: "principal",
    tenantSlug: "alpha",
    homePath: "/dashboard",
    userLabel: "Principal",
  }),
  [SUPERADMIN_SESSION_COOKIE]: serializeExperienceSession({
    experience: "superadmin",
    homePath: "/dashboard",
    userLabel: "Owner",
  }),
  [PORTAL_SESSION_COOKIE]: serializeExperienceSession({
    experience: "portal",
    viewer: "parent",
    homePath: "/dashboard",
    userLabel: "Parent",
  }),
};
test.each([
  "alpha.myshule.test",
  "beta.myshule.test",
  "superadmin.myshule.test",
  "portal.myshule.test",
  "myshule.online",
])("explicit reauthentication survives stale cookies on %s", (host) => {
  expect(
    evaluateExperienceRouting({
      host,
      pathname: "/login",
      cookies,
      refreshToken,
      reauthenticate: true,
    }).action,
  ).toBe("next");
  for (const pathname of [
    "/forgot-password",
    "/reset-password",
    "/verify-code",
    "/invite/accept",
    "/session-expired",
    "/api/auth/me",
    "/api/auth/login",
    "/api/auth/csrf",
  ]) {
    expect(
      evaluateExperienceRouting({ host, pathname, cookies, refreshToken })
        .action,
    ).toBe("next");
  }
});
test("wrong-school routing state denies dashboard access but never redirects login to itself", () => {
  expect(
    evaluateExperienceRouting({
      host: "beta.myshule.test",
      pathname: "/dashboard",
      cookies,
      refreshToken,
    }),
  ).toMatchObject({ action: "redirect", location: "/login" });
  expect(
    evaluateExperienceRouting({
      host: "beta.myshule.test",
      pathname: "/login",
      cookies,
      refreshToken,
    }),
  ).toMatchObject({ action: "next", rewrittenPath: "/internal/school/login" });
});
test("tenant password recovery retains its internal audience", () => {
  expect(
    evaluateExperienceRouting({
      host: "alpha.myshule.test",
      pathname: "/school/reset-password",
      cookies,
      refreshToken,
    }),
  ).toMatchObject({
    action: "next",
    rewrittenPath: "/internal/school/reset-password",
  });
});
