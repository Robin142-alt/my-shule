import { expect, test } from "@playwright/test";

import {
  PORTAL_SESSION_COOKIE,
  SCHOOL_SESSION_COOKIE,
  serializeExperienceSession,
} from "@/lib/auth/experience-routing";
import { AUDIENCE_COOKIE } from "@/lib/auth/session-cookies";

const appOrigin = "http://127.0.0.1:3005";

test.describe("unified MyShule PWA", () => {
  test("keeps the normal browser homepage public", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /from manual school operations to structured institutional intelligence/i,
      }),
    ).toBeVisible();
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      /manifest\.webmanifest/,
    );
  });

  test("serves an installable manifest and a safely scoped service worker", async ({
    request,
  }) => {
    const manifestResponse = await request.get("/manifest.webmanifest");
    expect(manifestResponse.ok()).toBe(true);
    expect(await manifestResponse.json()).toMatchObject({
      id: "/",
      name: "MyShule",
      short_name: "MyShule",
      start_url: "/app",
      scope: "/",
      display: "standalone",
    });

    const workerResponse = await request.get("/service-worker.js");
    expect(workerResponse.ok()).toBe(true);
    expect(workerResponse.headers()["service-worker-allowed"]).toBe("/");
    expect(workerResponse.headers()["cache-control"]).toContain("no-store");
    expect(await workerResponse.text()).toContain(
      'if (request.mode === "navigate")',
    );
  });

  test("shows only the School and Parent entry paths before authentication", async ({
    page,
  }) => {
    await page.goto("/app");

    const entry = page.getByTestId("installed-app-entry");
    await expect(entry).toBeVisible();
    await expect(
      entry.getByRole("link", { name: /School Staff and school operations/i }),
    ).toHaveAttribute("href", "/school/login?source=app");
    await expect(
      entry.getByRole("link", {
        name: /Parent Linked learner and family portal/i,
      }),
    ).toHaveAttribute("href", "/parent/login?source=app");
    await expect(page.locator("header, footer")).toHaveCount(0);
    await expect(entry.getByText(/Pricing|Features|About|Request Demo/i)).toHaveCount(0);

    await entry
      .getByRole("link", { name: /School Staff and school operations/i })
      .click();
    await expect(page).toHaveURL(/\/school\/login\?source=app$/);
    await expect(
      page.getByRole("heading", { name: /secure admin access/i }),
    ).toBeVisible();

    await page.goto("/app");
    await page
      .getByRole("link", { name: /Parent Linked learner and family portal/i })
      .click();
    await expect(page).toHaveURL(/\/parent\/login\?source=app$/);
    await expect(
      page.getByRole("heading", { name: /stay connected to your child/i }),
    ).toBeVisible();
  });

  test("redirects legacy installed launches away from public marketing", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const browserMatchMedia = window.matchMedia.bind(window);

      window.matchMedia = (query: string) => {
        if (query === "(display-mode: standalone)") {
          return {
            matches: true,
            media: query,
            onchange: null,
            addListener: () => undefined,
            removeListener: () => undefined,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            dispatchEvent: () => true,
          } as MediaQueryList;
        }

        return browserMatchMedia(query);
      };
    });

    await page.goto("/");

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByTestId("installed-app-entry")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /from manual school operations to structured institutional intelligence/i,
      }),
    ).toHaveCount(0);
  });

  test("opens the backend-selected school dashboard for a valid active session", async ({
    page,
  }) => {
    await page.context().addCookies([
      { name: AUDIENCE_COOKIE, value: "school", url: appOrigin },
      {
        name: SCHOOL_SESSION_COOKIE,
        value: serializeExperienceSession({
          experience: "school",
          homePath: "/school/teacher",
          role: "teacher",
          tenantSlug: "barakaacademy",
          userLabel: "Teacher",
        }),
        url: appOrigin,
      },
    ]);
    await page.route("**/api/auth/me**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            audience: "school",
            homePath: "/school/teacher",
            redirectTo: "/school/teacher",
            tenantSlug: "barakaacademy",
            userLabel: "Teacher",
            role: "teacher",
            roleContext: {
              primaryRole: "teacher",
              primaryAuthorizationRoleCode: "teacher",
              activeRole: "teacher",
              activeAuthorizationRoleCode: "teacher",
              assignedRoles: ["teacher"],
              assignedAuthorizationRoleCodes: ["teacher"],
              availableRoles: [
                {
                  roleCode: "teacher",
                  authorizationRoleCode: "teacher",
                  roleName: "Teacher Dashboard",
                  isPrimary: true,
                  isTeacherMode: true,
                  sources: ["primary_membership"],
                },
              ],
              teacherDashboardEligible: true,
            },
            user: {
              user_id: "teacher-pwa-test",
              display_name: "Teacher",
              email: "teacher@example.test",
              role: "teacher",
              tenant_id: "barakaacademy",
            },
          },
          user: {
            user_id: "teacher-pwa-test",
            display_name: "Teacher",
            email: "teacher@example.test",
            role: "teacher",
            tenant_id: "barakaacademy",
          },
        }),
      });
    });

    await page.goto("/app");

    await expect(page).toHaveURL(/\/school\/teacher$/);
    await expect(
      page.getByRole("heading", { name: /teacher dashboard/i }).first(),
    ).toBeVisible();
  });

  test("opens the existing parent dashboard for a valid portal session", async ({
    page,
  }) => {
    await page.context().addCookies([
      { name: AUDIENCE_COOKIE, value: "portal", url: appOrigin },
      {
        name: PORTAL_SESSION_COOKIE,
        value: serializeExperienceSession({
          experience: "portal",
          homePath: "/portal/parent",
          viewer: "parent",
          userLabel: "Parent",
        }),
        url: appOrigin,
      },
    ]);
    await page.route("**/api/auth/me**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            audience: "portal",
            homePath: "/portal/parent",
            redirectTo: "/portal/parent",
            tenantSlug: "barakaacademy",
            userLabel: "Parent",
            viewer: "parent",
            user: {
              user_id: "parent-pwa-test",
              display_name: "Parent",
              email: "parent@example.test",
              role: "parent",
              tenant_id: "barakaacademy",
            },
          },
          user: {
            user_id: "parent-pwa-test",
            display_name: "Parent",
            email: "parent@example.test",
            role: "parent",
            tenant_id: "barakaacademy",
          },
        }),
      });
    });

    await page.goto("/app");

    await expect(page).toHaveURL(/\/portal\/parent$/);
    await expect(
      page.getByRole("heading", { name: /parent dashboard/i }).first(),
    ).toBeVisible();
  });
});
