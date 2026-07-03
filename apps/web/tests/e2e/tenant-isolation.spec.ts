import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures/database.fixture";
import {
  SCHOOL_SESSION_COOKIE,
  serializeExperienceSession,
} from "../../src/lib/auth/experience-routing";
import { CSRF_COOKIE, CSRF_HEADER } from "../../src/lib/auth/csrf";
import { ACCESS_COOKIE, REFRESH_COOKIE, TENANT_COOKIE } from "../../src/lib/auth/session-cookies";
import type { SchoolExperienceRole } from "../../src/lib/experiences/types";

const APP_PORT = 3005;
const BASE_URL = `http://127.0.0.1:${APP_PORT}`;
const SCHOOL_A_URL = `http://barakaacademy.localhost:${APP_PORT}`;
const SCHOOL_B_URL = `http://alliance.localhost:${APP_PORT}`;

// Helper to inject mock session cookies
async function seedSession(
  page: Page,
  config: {
    tenantSlug: string;
    role: SchoolExperienceRole;
    targetUrl: string;
    token?: string;
  }
) {
  const sessionValue = serializeExperienceSession({
    experience: "school",
    homePath: "/dashboard",
    role: config.role,
    tenantSlug: config.tenantSlug,
    userLabel: `${config.role} User`,
  });

  await page.context().addCookies([
    {
      name: SCHOOL_SESSION_COOKIE,
      value: sessionValue,
      url: config.targetUrl,
    },
    {
      name: ACCESS_COOKIE,
      value: config.token ?? "mock-valid-jwt-token-xyz",
      url: config.targetUrl,
    },
    {
      name: REFRESH_COOKIE,
      value: "mock-refresh-token",
      url: config.targetUrl,
    },
    {
      name: TENANT_COOKIE,
      value: config.tenantSlug,
      url: config.targetUrl,
    },
  ]);
}

test.describe("Tenant Isolation and Router Security", () => {
  
  test.beforeEach(async ({ context }) => {
    // Clear cookies between tests to ensure isolation
    await context.clearCookies();
  });

  // ==========================================
  // SCENARIO 1: Unauthenticated Requests & Routing Checks
  // ==========================================

  test("unauthenticated access to dashboard redirects to login", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated access to school admin with swap params redirects to login", async ({ page }) => {
    await page.goto(`${BASE_URL}/school/admin?school_id=foreign-id`);
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated access to school subdomain root routes to public tenant page", async ({ page }) => {
    await page.goto(`${SCHOOL_A_URL}/`);
    await expect(page).toHaveURL(/\/login/);
  });

  test("GET /api/academics/students fails with 401 when no session is present", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/academics/students`);
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toContain("A signed-in session is required");
  });

  test("GET /api/workflow/events fails with 401 when no session is present", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/workflow/events`);
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toContain("A signed-in session is required");
  });

  // ==========================================
  // SCENARIO 2: Session Cookie Seeding & Cross-Tenant Redirect Prevention
  // ==========================================

  test("mismatched subdomain access forces redirect to login (cross-tenant prevention)", async ({ page }) => {
    // Seed a session for School A
    await seedSession(page, {
      tenantSlug: "barakaacademy",
      role: "principal",
      targetUrl: SCHOOL_A_URL,
    });

    // Attempt to access School B dashboard
    await page.goto(`${SCHOOL_B_URL}/dashboard`);

    // Should detect subdomain mismatch and redirect back to login
    await expect(page).toHaveURL(new RegExp(`${SCHOOL_B_URL}/login`));
  });

  test("role-locked school routes enforce redirect to forbidden", async ({ page }) => {
    // Seed a Principal session (who is NOT authorized for storekeeper inventory routes)
    await seedSession(page, {
      tenantSlug: "barakaacademy",
      role: "principal",
      targetUrl: SCHOOL_A_URL,
    });

    await page.goto(`${SCHOOL_A_URL}/inventory`);
    
    // Expect redirect to login page because we don't have a valid real JWT
    await expect(page).toHaveURL(/\/login/);
  });

  // ==========================================
  // SCENARIO 3: LocalStorage Leak Prevention
  // ==========================================

  test("sensitive session keys are not stored or leaked in localStorage", async ({ page }) => {
    await seedSession(page, {
      tenantSlug: "barakaacademy",
      role: "principal",
      targetUrl: SCHOOL_A_URL,
    });

    await page.goto(`${SCHOOL_A_URL}/dashboard`);
    
    // Verify local storage is clean of session tokens
    const schoolAuthStored = await page.evaluate(() => window.localStorage.getItem("myshule_auth_school"));
    const superadminAuthStored = await page.evaluate(() => window.localStorage.getItem("myshule_auth_superadmin"));
    
    expect(schoolAuthStored).toBeNull();
    expect(superadminAuthStored).toBeNull();
  });

  // ==========================================
  // SCENARIO 4: API Gateway Boundaries (Swapped Tenant)
  // ==========================================

  test("logged-in Accountant cannot access another school via tenantSlug swap", async ({ page }) => {
    await seedSession(page, {
      tenantSlug: "barakaacademy",
      role: "accountant",
      targetUrl: BASE_URL,
    });

    const response = await page.request.get(`${BASE_URL}/api/finance/summary?tenantSlug=another-school`);
    const body = await response.json();

    expect(response.status()).toBe(403);
    expect(body.message).toContain("does not match the signed-in session");
  });

  test("logged-in Accountant cannot swap tenant through the tenant cookie", async ({ page }) => {
    await seedSession(page, {
      tenantSlug: "barakaacademy",
      role: "accountant",
      targetUrl: BASE_URL,
    });
    await page.context().addCookies([
      {
        name: TENANT_COOKIE,
        value: "another-school",
        url: BASE_URL,
      },
    ]);

    const response = await page.request.get(`${BASE_URL}/api/billing/student-balances`);
    const body = await response.json();

    expect(response.status()).toBe(403);
    expect(body.message).toContain("does not match the signed-in session");
  });

  test("logged-in Storekeeper cannot submit inventory data under a swapped tenant cookie", async ({ page }) => {
    await seedSession(page, {
      tenantSlug: "barakaacademy",
      role: "storekeeper",
      targetUrl: BASE_URL,
    });
    const csrf = await page.request.get(`${BASE_URL}/api/auth/csrf`);
    const csrfPayload = (await csrf.json()) as { token?: string };
    const csrfToken = csrfPayload.token ?? "";

    await page.context().addCookies([
      {
        name: CSRF_COOKIE,
        value: csrfToken,
        url: BASE_URL,
      },
      {
        name: TENANT_COOKIE,
        value: "another-school",
        url: BASE_URL,
      },
    ]);

    const response = await page.request.post(`${BASE_URL}/api/inventory/stock-requests`, {
      headers: { [CSRF_HEADER]: csrfToken },
      data: { itemId: "chalk", quantity: 12, reason: "Classroom restock" },
    });
    const body = await response.json();

    expect(response.status()).toBe(403);
    expect(body.message).toContain("does not match the signed-in session");
  });

  test("logged-in Librarian cannot submit circulation data under a swapped tenant cookie", async ({ page }) => {
    await seedSession(page, {
      tenantSlug: "barakaacademy",
      role: "librarian",
      targetUrl: BASE_URL,
    });
    const csrf = await page.request.get(`${BASE_URL}/api/auth/csrf`);
    const csrfPayload = (await csrf.json()) as { token?: string };
    const csrfToken = csrfPayload.token ?? "";

    await page.context().addCookies([
      {
        name: CSRF_COOKIE,
        value: csrfToken,
        url: BASE_URL,
      },
      {
        name: TENANT_COOKIE,
        value: "another-school",
        url: BASE_URL,
      },
    ]);

    const response = await page.request.post(`${BASE_URL}/api/library/borrowings`, {
      headers: { [CSRF_HEADER]: csrfToken },
      data: { bookId: "bk-001", studentId: "student-001", dueDate: "2026-07-03" },
    });
    const body = await response.json();

    expect(response.status()).toBe(403);
    expect(body.message).toContain("does not match the signed-in session");
  });

  test("logged-in Exams Manager cannot submit workflow events under a swapped tenant cookie", async ({ page }) => {
    await seedSession(page, {
      tenantSlug: "barakaacademy",
      role: "exams-manager",
      targetUrl: BASE_URL,
    });
    const csrf = await page.request.get(`${BASE_URL}/api/auth/csrf`);
    const csrfPayload = (await csrf.json()) as { token?: string };
    const csrfToken = csrfPayload.token ?? "";

    await page.context().addCookies([
      {
        name: CSRF_COOKIE,
        value: csrfToken,
        url: BASE_URL,
      },
      {
        name: TENANT_COOKIE,
        value: "another-school",
        url: BASE_URL,
      },
    ]);

    const response = await page.request.post(`${BASE_URL}/api/workflow/events`, {
      headers: { [CSRF_HEADER]: csrfToken },
      data: {
        eventType: "exams.report.generated",
        entityType: "report",
        title: "Generate report",
        targetRoles: ["principal"],
        payload: { moduleId: "reports-exam" },
      },
    });
    const body = await response.json();

    expect(response.status()).toBe(403);
    expect(body.message).toContain("does not match the signed-in session");
  });
});
