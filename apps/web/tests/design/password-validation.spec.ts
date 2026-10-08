import { expect, test } from "@playwright/test";

for (const width of [360, 1440]) {
  test(`password screens give live feedback without overflow at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of ["/reset-password", "/new-password", "/school/reset-password", "/portal/reset-password", "/superadmin/reset-password", "/invite/accept"]) {
      await page.goto(`${path}?token=${"a".repeat(40)}`);
      const password = page.getByLabel(/^(New password|Create password)$/);
      const confirmation = page.getByLabel(/^Confirm (new )?password$/);
      await expect(page.getByRole("list", { name: "Password requirements" })).toBeVisible();
      await password.fill("short");
      await expect(password).toHaveAttribute("aria-invalid", "true");
      await expect(page.getByText(/Add at least 5 more characters/)).toBeVisible();
      await password.fill("NairobiBooks7!");
      await expect(password).toHaveAttribute("aria-invalid", "false");
      await confirmation.fill("different");
      await expect(page.getByText(/Passwords do not match/)).toBeVisible();
      await confirmation.fill("NairobiBooks7!");
      await expect(page.getByText("Passwords match.")).toBeVisible();
      await password.fill("NairobiBooks8!");
      await expect(confirmation).toHaveAttribute("aria-invalid", "true");
      await page.getByRole("button", { name: "Show password", exact: true }).first().click();
      await expect(password).toHaveAttribute("type", "text");
      await page.getByRole("button", { name: "Hide password", exact: true }).click();
      await expect(password).toHaveAttribute("type", "password");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
      await page.getByRole("button", { name: /Save new password|Create account/ }).scrollIntoViewIfNeeded();
      await expect(page.getByRole("button", { name: /Save new password|Create account/ })).toBeInViewport();
    }
    await page.screenshot({ path: `../../artifacts/password-validation-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("reset preserves supported symbols and whitespace, blocks invalid submission, and supports retry", async ({ page }) => {
  let submissions = 0;
  const password = "  Nairobi7!😀  ";
  await page.route("**/api/auth/csrf", (route) => route.fulfill({ json: { token: "test-csrf" } }));
  await page.route("**/api/auth/password-recovery/reset", (route) => {
    submissions++;
    expect(route.request().postDataJSON().password).toBe(password);
    expect(route.request().headers()["x-myshule-csrf"]).toBe("test-csrf");
    return route.fulfill({ status: submissions === 1 ? 503 : 200, json: submissions === 1 ? { message: "Please try again." } : { success: true } });
  });
  await page.goto(`/reset-password?token=${"a".repeat(40)}`);
  await page.getByLabel("New password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Save new password" }).click();
  expect(submissions).toBe(0);
  await page.getByLabel("New password", { exact: true }).fill(password);
  await page.getByLabel("Confirm new password").fill(password);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Unable to reset password" })).toContainText("Please try again.");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("Password updated", { exact: true })).toBeVisible();
  expect(submissions).toBe(2);
});
