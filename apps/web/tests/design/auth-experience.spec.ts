import { expect, test } from "@playwright/test";

const routes = [
  "/login",
  "/school/login",
  "/parent/login",
  "/student/login",
  "/portal/login",
  "/superadmin/login",
  "/forgot-password",
  "/reset-password?token=reset-test-token",
  "/invite/accept?token=" + "a".repeat(40),
  "/verify-code",
  "/verify-email",
  "/session-expired",
  "/access-denied",
  "/app",
];
for (const viewport of [
  { width: 360, height: 800 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`authentication routes use one compact layout at ${viewport.width}px`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(viewport);
    for (const path of routes) {
      await page.goto(path);
      await expect(page.locator(".auth-shell")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.locator("header, footer")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path,
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight + 24,
        ),
        path,
      ).toBe(true);
      const inputs = await page
        .locator('input:not([type="checkbox"])')
        .evaluateAll((elements) =>
          elements.map((el) => parseFloat(getComputedStyle(el).fontSize)),
        );
      expect(
        inputs.every((size) => size >= 16),
        path,
      ).toBe(true);
    }
  });
}

test("installed session outage can reach login and another account without bouncing to app entry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const original = matchMedia.bind(window);
    window.matchMedia = (query) =>
      query === "(display-mode: standalone)"
        ? ({ ...original(query), matches: true } as MediaQueryList)
        : original(query);
  });
  await page
    .context()
    .addCookies([
      {
        name: "myshule_audience",
        value: "school",
        url: "http://127.0.0.1:3005",
      },
    ]);
  await page.route("**/api/auth/me**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Service unavailable" }),
    }),
  );
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Let’s get you signed in" }),
  ).toBeVisible();
  await page.screenshot({
    path: "../../artifacts/auth-mobile-session-recovery.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Sign in again" }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in to MyShule" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/school\/login\?expired=1/);
  await page.getByRole("link", { name: "Parent login" }).click();
  await expect(
    page.getByRole("heading", { name: "Parent sign in" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/parent\/login/);
});

test("verification supports paste, resend, failure recovery and account switching on a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "myshule:mfa-login-challenge",
      JSON.stringify({
        audience: "school",
        identifier: "teacher@example.test",
        password: "test-password",
        tenantSlug: "school-a",
        redirectFallback: "/school/teacher",
        rememberSession: false,
        createdAt: Date.now() - 31_000,
      }),
    );
  });
  await page.route("**/api/auth/csrf", (route) =>
    route.fulfill({ json: { token: "csrf" } }),
  );
  await page.route("**/api/auth/login", (route) => {
    const body = route.request().postDataJSON();
    expect(body.tenantSlug).toBe("school-a");
    expect(body.rememberSession).toBe(false);
    return route.fulfill({
      status: 401,
      json: {
        message: body.verificationCode
          ? "MFA challenge is invalid or expired"
          : "MFA challenge required for this role",
      },
    });
  });
  await page.goto("/verify-code?audience=school");
  await expect(
    page.getByRole("heading", { name: "Enter verification code" }),
  ).toBeVisible();
  await page.getByLabel("Verification code").fill("123 456");
  await expect(page.getByLabel("Verification code")).toHaveValue("123456");
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(
    page.getByText(
      "That code is incorrect or expired. Try again or resend a code.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resend code" }).click();
  await expect(page.getByRole("status")).toContainText("A new code was sent");
  await page.screenshot({
    path: "../../artifacts/auth-mobile-verification.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Use another account" }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in to MyShule" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("myshule:mfa-login-challenge"),
    ),
  ).toBeNull();
});

test("parent first access and keyboard-sized viewports stay usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.route("**/api/auth/csrf", (route) =>
    route.fulfill({ json: { token: "csrf" } }),
  );
  await page.route("**/api/auth/parent/otp/request", (route) =>
    route.fulfill({
      json: {
        challenge_id: "challenge-a",
        password_setup_required: true,
        delivery_channel: "sms",
      },
    }),
  );
  await page.goto("/parent/login");
  await page
    .getByRole("button", { name: /First time or forgot password/ })
    .click();
  await page.getByLabel("Child admission number").fill("ADM123");
  await page.getByLabel("Registered guardian phone").fill("0712345678");
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(
    page.getByRole("heading", { name: "Enter verification code" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight + 24,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../../artifacts/auth-mobile-first-access.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 380 });
  await page.getByLabel("Confirm new password").focus();
  await page
    .getByRole("button", { name: "Verify and set password" })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Verify and set password" }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Change details" }).click();
  await expect(page.getByLabel("Child admission number")).toHaveValue("ADM123");
});
