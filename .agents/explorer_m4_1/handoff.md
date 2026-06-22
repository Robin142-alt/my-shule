# Tenant Separation and Session Storage Investigation Report

## 1. Observation
I investigated the frontend Next.js application (`apps/web`) to map out how tenant separation, session storage, and request gating are handled. The following observations were recorded:

### A. Session Storage & Cookies
Active session data and access/refresh tokens are stored in secure cookies, rather than HTML5 local/session storage.
* **Cookie definitions (`apps/web/src/lib/auth/session-cookies.ts`):**
  ```typescript
  export const ACCESS_COOKIE = "myshule_access";
  export const REFRESH_COOKIE = "myshule_refresh";
  export const AUDIENCE_COOKIE = "myshule_audience";
  export const TENANT_COOKIE = "myshule_tenant";
  ```
* **Session serialization & names (`apps/web/src/lib/auth/experience-routing.ts`):**
  ```typescript
  export const SUPERADMIN_SESSION_COOKIE = "myshule.superadmin.session";
  export const SCHOOL_SESSION_COOKIE = "myshule.school.session";
  export const PORTAL_SESSION_COOKIE = "myshule.portal.session";
  ```
* **Wiping localStorage (`apps/web/src/lib/auth/auth-context.tsx` lines 34-43):**
  ```typescript
  function readStoredAuthState(): AuthState {
    if (typeof window === "undefined") {
      return emptyAuthState(true);
    }

    localStorage.removeItem(getStorageKey("superadmin"));
    localStorage.removeItem(getStorageKey("school"));
    localStorage.removeItem(getStorageKey("portal"));
    return emptyAuthState();
  }
  ```

### B. Tenant Context & Host Resolution
* **Subdomain resolution (`apps/web/src/lib/auth/experience-routing.ts` lines 425-501):**
  The routing logic parses the `Host` or `X-Forwarded-Host` header.
  - Subdomains that are not reserved (`www`, `app`, `localhost`) or loopback/Vercel domains are resolved as `school` experiences with the subdomain as the `tenantSlug`:
    ```typescript
    return {
      experience: "school",
      host,
      tenantSlug: subdomain,
    };
    ```
* **Localhost fallback (`apps/web/src/lib/auth/tenant-context.tsx` lines 33-40):**
  For local development, subdomain testing relies on URL query parameters if on pure `localhost` (though Playwright E2E tests can test using subdomains like `barakaacademy.localhost`):
  ```typescript
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    const params = new URLSearchParams(window.location.search);
    const tenantParam = params.get("tenant");
    if (tenantParam && TENANT_REGISTRY[tenantParam]) {
      return TENANT_REGISTRY[tenantParam];
    }
    return FALLBACK_TENANT;
  }
  ```

### C. Gating & Redirection
* **Subdomain Tenant Mismatch (`apps/web/src/lib/auth/experience-routing.ts` lines 524-535):**
  If a school experience is resolved but the subdomain's resolved tenant slug does not match the active session's tenant slug, the request is redirected to `/login`:
  ```typescript
  if (
    experience === "school" &&
    session?.experience === "school" &&
    session.tenantSlug &&
    resolution.tenantSlug !== session.tenantSlug
  ) {
    return {
      action: "redirect",
      location: getLoginPath(),
      headers,
    };
  }
  ```
* **Role Mismatches for Specific Modules (`apps/web/src/lib/auth/experience-routing.ts` lines 553-597):**
  Restricted workspace sections like `/inventory` (Storekeeper) and `/library` (Librarian) are intercepted at the middleware layer. If the user's active session role does not match, they are redirected to `/forbidden`:
  ```typescript
  if (experience === "school" && isStorekeeperInventoryPath(input.pathname)) {
    if (!session) { ... }
    if (session.experience !== "school" || session.role !== "storekeeper") {
      return {
        action: "redirect",
        location: "/forbidden",
        headers,
      };
    }
  }
  ```
* **Client-side Guards (`apps/web/src/lib/auth/auth-guards.tsx` lines 32-48):**
  The `RouteGuard` handles client-side redirects for invalid sessions or mismatching domains:
  ```typescript
  if (!isAuthenticated || !user) {
    router.replace(fallbackPath ?? LOGIN_PATHS[config.domain]);
    return;
  }
  if (user.domain !== config.domain) {
    router.replace(LOGIN_PATHS[config.domain]);
    return;
  }
  ```

### D. Downstream API Proxy Tenant Injection
* **API Proxy Headers (`apps/web/src/lib/auth/school-api-proxy.ts` lines 120-131 & `src/lib/dashboard/server-api-proxy.ts` lines 122-133):**
  The proxy intercepts API calls, extracts the tenant slug (prioritizing URL query param, then `myshule_tenant` cookie, then session cookie), resolves the backend API target base URL, and automatically injects the `x-tenant-id` header:
  ```typescript
  return fetch(`${session.baseUrl}${upstreamPath}`, {
    method: input.method,
    headers: {
      ...
      Authorization: `Bearer ${session.accessToken}`,
      "x-auth-audience": "school",
      "x-tenant-id": session.tenantSlug,
    },
    ...
  });
  ```

---

## 2. Logic Chain
1. **Subdomains are the primary isolation boundary:** The `evaluateExperienceRouting` middleware resolves subdomains as tenant identifiers. The resolved tenant identifier determines the branding, allowed experience, and matches the user's active session.
2. **Cookies enforce stateful boundary checking:** The active tenant slug is stored in both the `myshule_tenant` cookie and within the serialized `myshule.school.session` cookie.
3. **Prevention of Cross-Tenant Leakage:** By comparing the subdomain-resolved `resolution.tenantSlug` with the parsed `session.tenantSlug` on every request, the application prevents logged-in users of School A from accessing the workspace of School B on School B's subdomain (triggering a redirect to `/login`).
4. **API Proxy protects backend queries:** Because frontend clients do not interact with the database directly, all API requests flow through `/api/...` proxies. The server-side proxies enforce the tenant scope by reading the HTTP-only secure cookie and injecting `x-tenant-id` into the headers sent to the backend. The backend enforces that the user in the JWT belongs to that `x-tenant-id` school.
5. **No Token Storage on Client Disk:** Wiping local storage auth keys during `readStoredAuthState` prevents tokens from leaking through browser cache or local storage inspection, maintaining cookie-only security boundaries.

---

## 3. Caveats
* **Development subdomains:** Localhost subdomains require custom configuration (e.g. configuring `*.localhost` loops or local DNS mapping) to test subdomains. Fortunately, modern browsers and operating systems automatically loop back subdomains of `localhost` (e.g. `barakaacademy.localhost:3005`) to `127.0.0.1`.
* **Cookie attributes:** Cookies are configured with `SameSite: Lax` and `Secure` (in production). Since subdomains share the same parent domain, standard lax cookies are sent across subdomains, which is why the middleware's explicit `resolution.tenantSlug !== session.tenantSlug` check is necessary to prevent cross-subdomain request hijacking.

---

## 4. Conclusion
The frontend correctly isolates tenants by combining **subdomain-based routing** at the Next.js rewrite proxy layer and **secure HTTP-Only session cookies**. Mismatched tenant accesses are forcefully redirected to `/login`, and unauthorized module-level routes are redirected to `/forbidden`. Sensitive session tokens are kept out of `localStorage`.

---

## 5. Verification Method (Detailed E2E Test Strategy)

To verify tenant isolation and session storage behaviors, we should write `apps/web/tests/e2e/tenant-isolation.spec.ts` using Playwright. 

### A. Test Configuration
The E2E tests run against the production-built Next.js server (`http://127.0.0.1:3005`). To test subdomains, the test suite should use target URLs like `http://barakaacademy.localhost:3005` and `http://alliance.localhost:3005`.

### B. Suggested Test Cases
1. **Unauthenticated Public Root Access:** Navigate to `http://127.0.0.1:3005/`. Expect public marketing homepage to load.
2. **Unauthenticated Dashboard Redirect:** Navigate to `http://127.0.0.1:3005/dashboard`. Expect redirect to `http://127.0.0.1:3005/login`.
3. **Unauthenticated Subdomain Root Routing:** Navigate to `http://barakaacademy.localhost:3005/`. Expect rewrite/navigation to the school-portal page (`/school/barakaacademy`).
4. **Successful Authenticated Dashboard Access:** Seed cookie `SCHOOL_SESSION_COOKIE` and `ACCESS_COOKIE` for `barakaacademy` (Principal role). Navigate to `http://barakaacademy.localhost:3005/dashboard`. Expect dashboard to render successfully with "barakaacademy" context.
5. **Cross-Tenant Redirect Prevention:** Seed cookie `SCHOOL_SESSION_COOKIE` for `barakaacademy`. Navigate to `http://alliance.localhost:3005/dashboard`. Expect the middleware to intercept and redirect to `http://alliance.localhost:3005/login`.
6. **Role Isolation Route Guards:** Seed cookie for `barakaacademy` with role `principal`. Navigate to `http://barakaacademy.localhost:3005/inventory/dashboard`. Expect redirect to `/forbidden`. Seed cookie with role `storekeeper`, navigate to same route, expect page to load successfully.
7. **Session Storage Check:** Perform a login or seed a session, navigate to the dashboard, and execute `window.localStorage.getItem('myshule_auth_school')`. Expect it to be null/empty.

### C. Proposed Playwright Test Code (`apps/web/tests/e2e/tenant-isolation.spec.ts`)

```typescript
import { expect, test, type Page } from "@playwright/test";
import {
  SCHOOL_SESSION_COOKIE,
  serializeExperienceSession,
} from "../../src/lib/auth/experience-routing";
import { ACCESS_COOKIE, REFRESH_COOKIE, TENANT_COOKIE } from "../../src/lib/auth/session-cookies";

const APP_PORT = 3005;
const BASE_URL = `http://127.0.0.1:${APP_PORT}`;
const SCHOOL_A_URL = `http://barakaacademy.localhost:${APP_PORT}`;
const SCHOOL_B_URL = `http://alliance.localhost:${APP_PORT}`;

// Helper to inject mock session cookies
async function seedSession(
  page: Page,
  config: {
    tenantSlug: string;
    role: string;
    targetUrl: string;
    token?: string;
  }
) {
  const sessionValue = serializeExperienceSession({
    experience: "school",
    homePath: "/dashboard",
    role: config.role as any,
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

  test("unauthenticated access to dashboard redirects to login", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated access to school subdomain root routes to public tenant page", async ({ page }) => {
    await page.goto(`${SCHOOL_A_URL}/`);
    await expect(page).toHaveURL(/\/school\/barakaacademy/);
  });

  test("authorized principal session successfully accesses dashboard on the matching subdomain", async ({ page }) => {
    await seedSession(page, {
      tenantSlug: "barakaacademy",
      role: "principal",
      targetUrl: SCHOOL_A_URL,
    });

    await page.goto(`${SCHOOL_A_URL}/dashboard`);
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/school workspace/i).first()).toBeVisible();
    await expect(page.getByText(/tenant isolated/i)).toBeVisible();
  });

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

    await page.goto(`${SCHOOL_A_URL}/inventory/dashboard`);
    
    // Expect redirect to forbidden page
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test("authorized role-locked routes load successfully", async ({ page }) => {
    // Seed a Storekeeper session for School A
    await seedSession(page, {
      tenantSlug: "barakaacademy",
      role: "storekeeper",
      targetUrl: SCHOOL_A_URL,
    });

    await page.goto(`${SCHOOL_A_URL}/inventory/dashboard`);
    
    // Expect inventory dashboard to load successfully
    await expect(page.getByRole("heading", { name: /inventory/i })).toBeVisible();
  });

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
});
```

### D. Running the Test Suite
Execute the newly created test file in apps/web using:
```bash
npx playwright test tests/e2e/tenant-isolation.spec.ts -c playwright.config.ts
```
