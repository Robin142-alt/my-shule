import { expect, test } from "@playwright/test";
import { normalizeDashboardRoleContext } from "@/lib/auth/dashboard-role-context";
import { SCHOOL_SESSION_COOKIE, serializeExperienceSession } from "@/lib/auth/experience-routing";

for (const width of [1440, 390]) {
  test(`sidebar navigation reuses authentication at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const user = { user_id: "navigation-test-user", tenant_id: "navigation-test-school", role: "principal",
      display_name: "Test Principal", email: "principal@example.test", session_id: "navigation-test-session", permissions: ["*:*"] };
    const session = { audience: "school", tenantSlug: "navigation-test-school", userLabel: "Test Principal",
      user, role: "principal", roleContext: normalizeDashboardRoleContext(null, "principal"),
      homePath: "/school/principal", redirectTo: "/school/principal" };
    await page.context().addCookies([
      { name: SCHOOL_SESSION_COOKIE, value: serializeExperienceSession({ experience: "school", role: "principal",
        tenantSlug: session.tenantSlug, userLabel: session.userLabel, homePath: session.homePath }), url: "http://127.0.0.1:3005" },
      { name: "myshule_access", value: "local-navigation-test", url: "http://127.0.0.1:3005" },
    ]);
    let authRequests = 0;
    // Controlled gateway responses test navigation without touching school data.
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/auth/me") {
        authRequests += 1;
        await route.fulfill({ json: { session, user } });
      } else if (path === "/api/school/modules/me") {
        await route.fulfill({ json: ["principal_dashboard", "students", "admissions", "academics", "finance", "reports"] });
      } else {
        await route.fulfill({ status: 503, json: { message: "Navigation test: data service unavailable" } });
      }
    });
    await page.goto("/school/principal");
    const shell = page.getByTestId("principal-practical-command-center");
    await expect(shell).toBeVisible();
    expect(authRequests).toBe(1);
    await page.evaluate(() => {
      document.body.dataset.authenticationFlashes = "0";
      const observer = new MutationObserver(() => {
        if (document.querySelector(".auth-shell")) document.body.dataset.authenticationFlashes = "1";
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
    for (let i = 0; i < 3; i += 1) {
      if (width < 1280) await page.getByRole("button", { name: "Open principal navigation", exact: true }).click();
      const navigation = page.getByRole("navigation", { name: "Principal dashboard sidebar" });
      const students = navigation.getByRole("button", { name: "Students", exact: true });
      if (await students.getAttribute("aria-expanded") === "false") await students.click();
      await expect(page).toHaveURL(/\/school\/principal$/);
      await expect(navigation.getByRole("group", { name: "Students", exact: true })).toBeVisible();
      await navigation.getByRole("button", { name: "Student Directory", exact: true }).click();
      await expect(page).toHaveURL(/\/school\/principal\/students$/);
      await expect(shell).toBeVisible();
      await expect(page.locator(".auth-shell")).toHaveCount(0);
      await page.goBack();
      await expect(page).toHaveURL(/\/school\/principal$/);
      await expect(shell).toBeVisible();
    }
    expect(authRequests).toBe(1);
    expect(await page.locator("body").getAttribute("data-authentication-flashes")).toBe("0");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `../../artifacts/sidebar-session-navigation-${width}.png`, fullPage: true });
  });
}
