import { expect, test } from "@playwright/test";
import { SCHOOL_SESSION_COOKIE, serializeExperienceSession } from "@/lib/auth/experience-routing";

for (const width of [320, 768, 1024, 1440]) {
  test(`school startup and recovery stay usable at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const role = width < 1000 ? "teacher" : "deputy-principal";
    await page.context().addCookies([
      { name: SCHOOL_SESSION_COOKIE, value: serializeExperienceSession({ experience: "school", role,
        tenantSlug: "loading-test-school", userLabel: "Loading test", homePath: `/school/${role}` }),
      url: "http://127.0.0.1:3005" },
      { name: "myshule_access", value: "local-loading-test", url: "http://127.0.0.1:3005" },
    ]);
    let finishVerification!: () => void;
    const pending = new Promise<void>((resolve) => { finishVerification = resolve; });
    let attempts = 0;
    // Hold a test-only response to inspect the real production loading UI.
    // No requests reach a school backend.
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/auth/me") {
        attempts += 1;
        if (attempts === 1) await pending;
      }
      await route.fulfill({ status: 503, json: { message: "Test service is unavailable. Please retry." } });
    });
    await page.goto(`/school/${role}${role === "deputy-principal" ? "/exams" : ""}`);
    await expect(page.getByRole("status", { name: "Loading MyShule" })).toBeVisible();
    await expect(page.getByText(/Checking your session|Opening your authorized dashboard/)).toHaveCount(0);
    await expect(page.locator(".auth-shell")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(() => attempts).toBe(1);
    await page.screenshot({ path: testInfo.outputPath(`loading-${width}.png`), fullPage: true });
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await page.getByTestId("workspace-loading").evaluate((element) =>
      element.getAnimations({ subtree: true }).length)).toBe(0);
    finishVerification();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Test service is unavailable");
    await expect(page.getByTestId("workspace-loading")).toHaveCount(0);
    await page.getByRole("button", { name: "Retry session verification" }).click();
    await expect.poll(() => attempts).toBe(2);
    await expect(page.getByRole("link", { name: "Sign in again" })).toBeVisible();
  });
}
