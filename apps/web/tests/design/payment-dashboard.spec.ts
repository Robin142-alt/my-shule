import { expect, test } from "@playwright/test";
import { normalizeDashboardRoleContext } from "@/lib/auth/dashboard-role-context";
import {
  SCHOOL_SESSION_COOKIE,
  SUPERADMIN_SESSION_COOKIE,
  serializeExperienceSession,
} from "@/lib/auth/experience-routing";

// Real dashboard rendering against controlled API responses; database/RBAC
// behaviour is exercised separately by the disposable PostgreSQL suite.
for (const role of ["principal", "accountant", "bursar"] as const) {
  for (const width of [1440, 390]) {
    test(`${role} payment setup and notification links at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const school = "payment-dashboard-fixture";
      const user = {
        user_id: "fixture-user",
        tenant_id: school,
        role,
        display_name: "School staff",
        email: "staff@example.test",
        session_id: "fixture-session",
        permissions:
          role === "principal"
            ? [
                "auth:read",
                "principal:read",
                "principal:write",
                "billing:read",
                "notifications:read",
              ]
            : [
                "auth:read",
                "billing:read",
                "billing:write",
                "notifications:read",
              ],
      };
      const session = {
        audience: "school",
        tenantSlug: school,
        userLabel: "School staff",
        user,
        role,
        roleContext: normalizeDashboardRoleContext(null, role),
        homePath: `/school/${role}`,
        redirectTo: `/school/${role}`,
      };
      await page.context().addCookies([
        {
          name: SCHOOL_SESSION_COOKIE,
          value: serializeExperienceSession({
            experience: "school",
            role,
            tenantSlug: school,
            userLabel: "School staff",
            homePath: session.homePath,
          }),
          url: "http://127.0.0.1:3005",
        },
        {
          name: "myshule_access",
          value: "local-payment-dashboard-fixture",
          url: "http://127.0.0.1:3005",
        },
      ]);
      const revision = {
        id: "00000000-0000-4000-8000-000000000411",
        tenant_id: school,
        provider_code: "equity",
        channel_kind: "bank_account",
        display_name: "School fees account",
        account_name: "Fixture School",
        account_number: "0123456789",
        bank_name: "Equity",
        status: "pending_approval",
        reason: "School fees collection",
        requested_by: "accountant",
        created_at: "2026-09-30T08:00:00Z",
      };
      await page.route("**/api/**", async (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname;
        let response: unknown = [];
        if (path === "/api/auth/csrf") response = { token: "local-fixture-csrf" };
        else if (path === "/api/auth/me") response = { session, user };
        else if (path === "/api/school/modules/me")
          response = ["principal_dashboard", "finance", "communication"];
        else if (path.includes("permissions"))
          response = { data: user.permissions };
        else if (path.endsWith("/collection-channel-summary"))
          response = {
            total: 1,
            pending_approval: revision.status === "pending_approval" ? 1 : 0,
            awaiting_connection: revision.status === "approved" ? 1 : 0,
            ready: 0,
            active: 0,
            sandbox: 0,
            attention: 0,
          };
        else if (path.endsWith("/collection-providers"))
          response = [
            {
              code: "equity",
              name: "Equity",
              channel_kinds: ["bank_account"],
              connection_modes: ["statement"],
              credential_fields: [],
            },
          ];
        else if (path.endsWith("/decision")) {
          expect(role).toBe("principal");
          expect(route.request().postDataJSON().reason).toBe(
            "Verified against school bank records",
          );
          revision.status = "approved";
          response = revision;
        } else if (path.endsWith("/collection-channels"))
          response =
            url.searchParams.get("status") === "pending_approval" &&
            revision.status !== "pending_approval"
              ? []
              : [revision];
        else if (path.endsWith("/principal/approvals"))
          response = {
            pendingTotal: 0,
            urgentApprovals: 0,
            requests: [],
            categories: [],
            recentApprovals: [],
          };
        else if (path.endsWith("/principal/exams"))
          response = { reportsPending: 0, recentResults: [] };
        else if (path.endsWith("/notifications/badges"))
          response = {
            unreadCount: 1,
            urgentCount: 0,
            byModule: { finance: 1 },
          };
        else if (path.endsWith("/notifications"))
          response = [
            {
              id: "notice-a",
              title: "Payment setup requested",
              message: "Review your school fees account",
              status: "ACTION_REQUIRED",
              actionUrl: `/payment-setup?revision=${revision.id}`,
              actionLabel: "Review payment setup",
            },
          ];
        else if (
          path.endsWith("/school-profile") ||
          path.endsWith("/school/identity")
        )
          response = { schoolName: "Fixture School" };
        else if (path.endsWith("/principal/dashboard"))
          response = {
            tenant_id: school,
            generated_at: new Date().toISOString(),
            enabled_modules: ["finance"],
            alerts: [],
            notifications: [],
            realtime_channels: [],
          };
        await route.fulfill({ json: response });
      });
      await page.goto(
        `/school/${role}/${role === "principal" ? "approvals" : "payment-setup"}`,
      );
      await expect(
        page.getByRole("heading", { name: "School payment channels" }),
      ).toBeVisible();
      await expect(
        page.getByText("School fees account", { exact: true }),
      ).toBeVisible();
      if (role === "principal") {
        await expect(page.getByText("Payment setup", { exact: true })).toBeVisible();
        await expect(page.getByText("All caught up! No pending approvals.")).toHaveCount(0);
        await page
          .getByRole("button", { name: "Review request", exact: true })
          .click();
        await expect(
          page.getByRole("button", { name: "Approve destination" }),
        ).toBeDisabled();
        await page
          .getByLabel("Decision reason")
          .fill("Verified against school bank records");
        await page.getByLabel(/I have verified/).check();
        await page.getByRole("button", { name: "Approve destination" }).click();
        await expect(
          page.getByText("Approved for technical connection by Super Admin."),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Review request", exact: true }),
        ).toHaveCount(0);
      } else {
        await expect(
          page.getByRole("button", { name: "Add payment channel" }),
        ).toBeEnabled();
        await expect(
          page.getByRole("button", { name: "Review request", exact: true }),
        ).toHaveCount(0);
      }
      await page
        .getByRole("button", { name: "Open school notifications", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Review payment setup", exact: true })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/school/${role}/payment-setup\\?revision=${revision.id}$`),
      );
      await expect(
        page.getByText("Showing the setup linked from your notification."),
      ).toBeVisible();
      await expect(
        page.getByText("School fees account", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "View all setups" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "View all setups" }).click();
      await expect(page.getByLabel("Show setups")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
      await page.screenshot({
        path: `../../artifacts/payment-dashboard/${role}-${width}.png`,
        fullPage: true,
      });
    });
  }
}

for (const width of [1440, 390]) {
  test(`Super Admin connects an approved account and refreshes queue counts at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.context().addCookies([{ name: SUPERADMIN_SESSION_COOKIE,
      value: serializeExperienceSession({ experience: "superadmin", homePath: "/superadmin/dashboard", userLabel: "Fixture Owner" }),
      url: "http://127.0.0.1:3005" }]);
    const revision = { id: "00000000-0000-4000-8000-000000000422", tenant_id: "payment-dashboard-fixture", school_name: "Fixture School", provider_code: "equity", channel_kind: "bank_account", display_name: "School fees account", account_name: "Fixture School", account_number: "0123456789", bank_name: "Equity", status: "approved", reason: "School fees collection", requested_by: "accountant", created_at: "2026-09-30T08:00:00Z", connection_mode: "statement", environment: "production", last_test_status: "" };
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      let response: unknown = [];
      if (path === "/api/auth/csrf") response = { token: "local-fixture-csrf" };
      else if (path.endsWith("/payment-integrations/summary")) response = { total: 1, pending_approval: 0, awaiting_connection: revision.status === "active" ? 0 : 1, ready: revision.status === "ready" ? 1 : 0, active: revision.status === "active" ? 1 : 0, sandbox: 0, attention: 0 };
      else if (path.endsWith("/payment-integrations/providers")) response = [{ code: "equity", name: "Equity", description: "Statement review", channel_kinds: ["bank_account"], connection_modes: ["statement"], credential_fields: [] }];
      else if (path.endsWith("/payment-integrations")) response = [revision];
      else if (path.endsWith("/connect")) { revision.status = "connecting"; response = revision; }
      else if (path.endsWith("/test")) { revision.status = "ready"; revision.last_test_status = "statement_review_ready"; response = revision; }
      else if (path.endsWith("/activate")) { revision.status = "active"; response = revision; }
      await route.fulfill({ json: response });
    });
    await page.goto("/superadmin/gateways");
    const summary = page.getByRole("region", { name: "Payment integration queue" });
    await expect(summary.getByText("Awaiting Super Admin").locator("..")).toHaveText("Awaiting Super Admin1");
    await page.getByRole("button", { name: "Connect channel", exact: true }).click();
    await expect(page.getByLabel("Connection method")).toHaveValue("statement");
    await page.getByRole("button", { name: "Save connection" }).click();
    await page.getByRole("button", { name: "Check connection" }).click();
    await expect(summary.getByText("Ready to activate").locator("..")).toHaveText("Ready to activate1");
    await page.getByRole("button", { name: "Activate channel" }).click();
    await expect(summary.getByText("Awaiting Super Admin").locator("..")).toHaveText("Awaiting Super Admin0");
    await expect(summary.getByText("Live channels").locator("..")).toHaveText("Live channels1");
    await expect(page.getByText("Active — statement review required", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `../../artifacts/payment-dashboard/superadmin-${width}.png`, fullPage: true });
  });
}
