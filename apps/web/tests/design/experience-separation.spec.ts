import { expect, test, type Page } from "@playwright/test";

import {
  PORTAL_SESSION_COOKIE,
  SCHOOL_SESSION_COOKIE,
  serializeExperienceSession,
  SUPERADMIN_SESSION_COOKIE,
} from "@/lib/auth/experience-routing";

async function seedExperienceSession(
  page: Page,
  cookie: {
    name: string;
    value: string;
    url: string;
  },
) {
  await page.context().addCookies([
    {
      name: cookie.name,
      value: cookie.value,
      url: cookie.url,
    },
  ]);
}

test.describe("experience separation", () => {
  test("public root opens the public MyShule overview instead of a workspace selector", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3005/");
    await expect(
      page.getByRole("heading", {
        name: /from manual school operations to structured institutional intelligence/i,
      }),
    ).toBeVisible();
    await expect(page.getByText(/one premium platform/i)).toHaveCount(0);
    await expect(page.getByText(/enter workspace/i)).toHaveCount(0);
  });

  test("public compatibility routes land on their matching login surfaces", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:3005/superadmin");
    await expect(
      page.getByRole("heading", { name: /operate the platform with confidence/i }),
    ).toBeVisible();

    await page.goto("http://127.0.0.1:3005/school/principal");
    await expect(page.getByRole("heading", { name: /school workspace/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /secure admin access/i })).toBeVisible();

    await page.goto("http://127.0.0.1:3005/portal/parent");
    await expect(
      page.getByRole("heading", { name: /school update parents wanted/i }),
    ).toBeVisible();
  });

  test("public compatibility routes open the superadmin dashboard when a superadmin session exists", async ({
    page,
  }) => {
    await seedExperienceSession(page, {
      name: SUPERADMIN_SESSION_COOKIE,
      value: serializeExperienceSession({
        experience: "superadmin",
        homePath: "/superadmin",
        userLabel: "Platform owner",
      }),
      url: "http://127.0.0.1:3005",
    });

    await page.goto("http://127.0.0.1:3005/superadmin");
    await expect(
      page.getByRole("heading", { name: /platform owner dashboard/i }),
    ).toBeVisible();
  });

  test("public compatibility routes open the school dashboard when a tenant session exists", async ({
    page,
  }) => {
    await seedExperienceSession(page, {
      name: SCHOOL_SESSION_COOKIE,
      value: serializeExperienceSession({
        experience: "school",
        homePath: "/school/bursar",
        role: "bursar",
        tenantSlug: "barakaacademy",
        userLabel: "Bursar",
      }),
      url: "http://127.0.0.1:3005",
    });

    await page.goto("http://127.0.0.1:3005/school/bursar");
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/school workspace/i).first()).toBeVisible();
    await expect(page.getByText(/tenant isolated/i)).toBeVisible();
  });

  test("public compatibility routes open the portal dashboard when a portal session exists", async ({
    page,
  }) => {
    await seedExperienceSession(page, {
      name: PORTAL_SESSION_COOKIE,
      value: serializeExperienceSession({
        experience: "portal",
        homePath: "/portal/parent",
        viewer: "parent",
        userLabel: "Parent",
      }),
      url: "http://127.0.0.1:3005",
    });

    await page.goto("http://127.0.0.1:3005/portal/parent");
    await expect(
      page.getByRole("heading", { name: /family dashboard/i }),
    ).toBeVisible();
  });

  test("superadmin host serves the platform dashboard on /dashboard", async ({
    page,
  }) => {
    await seedExperienceSession(page, {
      name: SUPERADMIN_SESSION_COOKIE,
      value: serializeExperienceSession({
        experience: "superadmin",
        homePath: "/dashboard",
        userLabel: "Platform owner",
      }),
      url: "http://superadmin.localhost:3005",
    });

    await page.goto("http://superadmin.localhost:3005/dashboard");
    await expect(
      page.getByRole("heading", { name: /platform owner dashboard/i }),
    ).toBeVisible();
    await expect(page.getByText(/platform owner workspace/i)).toBeVisible();
  });

  test("tenant host serves the school dashboard on /dashboard", async ({
    page,
  }) => {
    await seedExperienceSession(page, {
      name: SCHOOL_SESSION_COOKIE,
      value: serializeExperienceSession({
        experience: "school",
        homePath: "/dashboard",
        role: "bursar",
        tenantSlug: "barakaacademy",
        userLabel: "Bursar",
      }),
      url: "http://barakaacademy.localhost:3005",
    });

    await page.goto("http://barakaacademy.localhost:3005/dashboard");
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/school workspace/i).first()).toBeVisible();
    await expect(page.getByText(/active session/i)).toBeVisible();
    await expect(page.getByText(/^bursar$/i).first()).toBeVisible();
    await expect(page.getByText(/tenant isolated/i)).toBeVisible();
  });

  test("portal host serves the family dashboard on /dashboard", async ({
    page,
  }) => {
    await seedExperienceSession(page, {
      name: PORTAL_SESSION_COOKIE,
      value: serializeExperienceSession({
        experience: "portal",
        homePath: "/dashboard",
        viewer: "parent",
        userLabel: "Parent",
      }),
      url: "http://portal.localhost:3005",
    });

    await page.goto("http://portal.localhost:3005/dashboard");
    await expect(
      page.getByRole("heading", { name: /family dashboard/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /recent payments/i }),
    ).toBeVisible();
  });
});
