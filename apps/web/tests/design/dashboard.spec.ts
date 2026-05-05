import { expect, test } from "@playwright/test";

test.describe("dashboard design quality", () => {
  test("keeps alerts and KPIs above the fold in the right order", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1400 });
    await page.goto("/dashboard/admin");

    const alerts = page.getByTestId("alerts-section");
    const kpis = page.getByTestId("kpi-section");
    const quickActions = page.getByTestId("quick-actions-section");
    const coreWidgets = page.getByTestId("core-widgets");
    const activityFeed = page.getByTestId("activity-feed-section");

    await expect(alerts).toBeVisible();
    await expect(kpis).toBeVisible();
    await expect(quickActions).toBeVisible();

    const alertsBox = await alerts.boundingBox();
    const kpisBox = await kpis.boundingBox();
    const quickActionsBox = await quickActions.boundingBox();
    const widgetsBox = await coreWidgets.boundingBox();
    const activityBox = await activityFeed.boundingBox();

    expect(alertsBox).not.toBeNull();
    expect(kpisBox).not.toBeNull();
    expect(quickActionsBox).not.toBeNull();
    expect(widgetsBox).not.toBeNull();
    expect(activityBox).not.toBeNull();

    expect(alertsBox!.y).toBeLessThan(kpisBox!.y);
    expect(kpisBox!.y).toBeLessThan(quickActionsBox!.y);
    expect(quickActionsBox!.y).toBeLessThan(widgetsBox!.y);
    expect(widgetsBox!.y).toBeLessThan(activityBox!.y);
    expect(kpisBox!.y + kpisBox!.height).toBeLessThanOrEqual(1400);
  });

  test("enforces role-based visibility and detail navigation", async ({
    page,
  }) => {
    await page.goto("/dashboard/teacher");
    await expect(page.getByTestId("attendance-widget")).toBeVisible();
    await expect(page.getByTestId("academics-widget")).toBeVisible();
    await expect(page.getByTestId("finance-widget")).toHaveCount(0);

    await page.goto("/dashboard/admin");
    await page.getByRole("link", { name: /outstanding fees need follow-up/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/admin\/finance$/);
    await expect(
      page.getByRole("heading", { name: /collections desk/i }),
    ).toBeVisible();
  });

  test("shows offline-safe UI and disables finance actions", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/dashboard/admin");
    await expect(page.getByTestId("quick-actions-section")).toBeVisible();
    await expect(page.getByRole("button", { name: /current sync status/i })).toBeVisible();
    await context.setOffline(true);
    await expect(page.getByRole("button", { name: /record payment/i })).toBeDisabled();
    await expect(page.getByRole("button", { name: /send sms/i })).toBeDisabled();
    await page.getByRole("button", { name: /offline queue status/i }).click();
    await expect(page.getByText(/offline mode active/i)).toBeVisible();

    await context.setOffline(false);
    await page.goto("/dashboard/teacher");
    await expect(page.getByTestId("attendance-widget")).toBeVisible();
    await expect(page.getByRole("button", { name: /current sync status/i })).toBeVisible();
    await context.setOffline(true);
    await page.getByRole("button", { name: /offline queue status/i }).click();
    await expect(page.getByText(/offline mode active/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /mark attendance/i })).toBeEnabled();

    await context.close();
  });
});
