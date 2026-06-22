# Handoff Report: E2E Tenant Isolation & API Boundary Checks in Playwright

This report provides the investigation findings and a detailed strategy for implementing API tenant isolation checks in the Playwright E2E test suite under `apps/web/tests/e2e/tenant-isolation.spec.ts`.

---

## 1. Observation

Based on a read-only code review of the workspace, here is the architecture of tenant isolation and request handling:

### A. Next.js Gateway Proxy Layer (`apps/web/src/lib/dashboard/server-api-proxy.ts`)
* **Session Validation (Lines 87-94)**:
  ```typescript
  if ((options?.requireSchoolSession ?? true) && (!session || !accessToken)) {
    const response = NextResponse.json(
      { message: "A signed-in session is required." },
      { status: 401 },
    );
    clearExperienceSessionCookies(response);
    return response;
  }
  ```
  *If a client invokes `/api/students`, `/api/attendance`, or `/api/finance` without valid session cookies (`__session` and `accessToken`), the Next.js gateway intercepts the request and blocks it immediately with `401 Unauthorized`.*
* **Tenant Slug Resolution (Line 98)**:
  ```typescript
  const tenantSlug = requestUrl.searchParams.get("tenantSlug") ?? readTenantCookie(cookieStore) ?? sessionTenantSlug ?? null;
  ```
  *Next.js resolves the tenantSlug from the request's query parameters, cookies, or the session context.*
* **Upstream Headers Forwarding (Lines 126-130)**:
  ```typescript
  headers: {
    ...
    Authorization: `Bearer ${token}`,
    "x-auth-audience": audience,
    "x-tenant-id": tenantSlug,
  }
  ```
  *The token (which belongs to a specific tenant) and the resolved `tenantSlug` (which might be swapped/maliciously modified by a client) are sent upstream to the NestJS backend.*
* **CSRF Validation (Lines 69-74)**:
  ```typescript
  if (request.method !== "GET" && !validateCsrfRequest(request)) {
    return NextResponse.json(
      { message: "Security check expired. Refresh the page and try again." },
      { status: 403 },
    );
  }
  ```
  *Any non-GET requests (POST, PATCH, DELETE, PUT) undergo a strict CSRF check, returning a `403 Forbidden` response if the `x-myshule-csrf` header is missing or mismatching.*

### B. NestJS API Tenant Resolution & JWT Binding (`apps/api`)
* **Tenant Middleware (`apps/api/src/middleware/tenant.middleware.ts`, Lines 29-33)**:
  ```typescript
  const resolvedTenant = await this.tenantService.resolveTenantContextForRequest(
    request.headers.host,
    request.headers['x-tenant-id'],
    request.headers['x-tenant-signature'],
  );
  ```
  *The host header subdomain (e.g. `tenantb.localhost`) or the `x-tenant-id` header (if backed by a valid signature) is used to set the transactional database RLS session context.*
* **Token Verification Mismatch (`apps/api/src/auth/auth.service.ts`, Line 97)**:
  ```typescript
  throw new UnauthorizedException('Access token does not belong to this tenant');
  ```
  *If the `tenant_id` claim in the verified access token does not match the request's resolved tenant context, the backend throws a `401 Unauthorized` exception.*
* **Row-Level Security (RLS) (`apps/api/src/database/tenant-database-policy.ts`)**:
  *Tables are secured using Postgres RLS. If a user queries `/api/students/some-other-tenant-uuid` using their own tenant's context, the query returns 0 rows, resulting in a NestJS controller throwing `404 Not Found`.*

### C. Playwright E2E Fixtures (`apps/web/tests/e2e/fixtures`)
* `fixtures/auth.fixture.ts` defines roles (Principal, Accountant, etc.) and a `loginAs` utility using standard browser actions that populate session cookies.
* `fixtures/database.fixture.ts` defines an extended Playwright test that supplies a `dbQuery` helper to execute direct Postgres queries.

---

## 2. Logic Chain

1. **Unauthenticated Check**:
   If a request to `/api/students` or other endpoints has no session cookies, it is blocked at the Next.js proxy layer and fails with `401` ("A signed-in session is required."). We can verify this using the Playwright `request` fixture (which is clean and has no cookies).
2. **Swapped Tenant (Tenant Replay Check)**:
   If a client logs in as Tenant A, receives Tenant A cookies, and makes a request to `/api/finance/summary?tenantSlug=tenantb`, the Next.js proxy forwards the Tenant A JWT along with `x-tenant-id: tenantb`. The NestJS backend detects the mismatch between the JWT `tenant_id` and the request `tenant_id`, throwing `401` ("Access token does not belong to this tenant"). We can verify this using `page.request` (which carries the browser's logged-in cookies) and appending a mismatched `tenantSlug` query parameter.
3. **Mismatched Resource ID (RLS Check)**:
   If a logged-in Tenant A user tries to query `/api/students/<foreign-uuid>` under their own tenant context (so the token and tenant match), Postgres RLS filters out the row from the database query. The NestJS API finds no record and returns `404 Not Found`. We can dynamically fetch a foreign student's UUID from the database via the `dbQuery` fixture and assert a `404` status on a request to `/api/students/<foreign-uuid>`.

---

## 3. Caveats

* **CSRF Token Requirement for Mutations**: Any write/mutation requests (POST/PATCH/DELETE) require a CSRF token. To test isolation on POST requests (e.g., trying to enroll a student in another tenant), the test must first fetch `/api/auth/csrf` and send the token in the `x-myshule-csrf` header.
* **Database Access**: The dynamic RLS check assumes the E2E test runner has access to the PostgreSQL database via `process.env.DATABASE_URL` (which is standard for the local/CI E2E runs). If database access is unavailable, the test must fallback to using a hardcoded dummy UUID (e.g., `00000000-0000-0000-0000-000000000000`) where RLS will still ensure a 404 response is returned.

---

## 4. Conclusion

We recommend establishing `apps/web/tests/e2e/tenant-isolation.spec.ts` using the following implementation template. This leverages Playwright's `APIRequestContext` for direct API validation and the custom `dbQuery` fixture for robust, database-driven test data retrieval:

```typescript
import { expect } from "@playwright/test";
import { test } from "./fixtures/database.fixture";
import { loginAs } from "./fixtures/auth.fixture";

test.describe("E2E Tenant Isolation & API Boundary Protections", () => {
  
  // ==========================================
  // SCENARIO 1: Unauthenticated Requests (Missing Context)
  // ==========================================

  test("GET /api/students fails with 401 when no session is present", async ({ request }) => {
    const response = await request.get("/api/students");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toContain("A signed-in session is required");
  });

  test("GET /api/finance/summary fails with 401 when no session is present", async ({ request }) => {
    const response = await request.get("/api/finance/summary");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toContain("A signed-in session is required");
  });

  test("GET /api/attendance fails with 401 when no session is present", async ({ request }) => {
    const response = await request.get("/api/attendance");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toContain("A signed-in session is required");
  });

  // ==========================================
  // SCENARIO 2: Tenant Replay Attack (Swapped Tenant Context)
  // ==========================================

  test("logged-in Accountant cannot access another school via tenantSlug swap", async ({ page }) => {
    // 1. Log in to establish Tenant A session (kisumuboys)
    await loginAs(page, "Accountant");

    // 2. Perform a request to a school-scoped endpoint but swap the tenantSlug query parameter
    const response = await page.request.get("/api/finance/summary?tenantSlug=another-school");

    // 3. Assert the request is blocked by NestJS token-to-tenant validation
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toContain("Access token does not belong to this tenant");
  });

  test("logged-in Teacher cannot request students list for another school", async ({ page }) => {
    await loginAs(page, "Teacher");

    const response = await page.request.get("/api/students?tenantSlug=another-school");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toContain("Access token does not belong to this tenant");
  });

  // ==========================================
  // SCENARIO 3: Direct API Resource Isolation (Row-Level Security)
  // ==========================================

  test("logged-in Accountant requesting a foreign student ID receives a 404 (RLS protection)", async ({ page, dbQuery }) => {
    // 1. Log in to establish Tenant A session (kisumuboys)
    await loginAs(page, "Accountant");

    // 2. Query the database to find a student belonging to a different tenant
    const foreignStudents = await dbQuery(
      "SELECT id FROM students WHERE tenant_id != 'kisumuboys' LIMIT 1"
    );

    if (foreignStudents.length === 0) {
      test.skip("No foreign students found in the database to run the isolation check.");
    }

    const foreignStudentId = foreignStudents[0].id;

    // 3. Request the foreign student detail under Tenant A context
    const response = await page.request.get(`/api/students/${foreignStudentId}`);

    // 4. Assert 404 Not Found is returned (database RLS filtered the record)
    expect(response.status()).toBe(404);
  });
});
```

---

## 5. Verification Method

To execute the e2e isolation test suite, run the Playwright contract test command:

```powershell
npx playwright test --config=playwright.contract.config.ts tests/e2e/tenant-isolation.spec.ts
```

For parallel verification of backend RLS boundaries, execute the NestJS integration test suite:

```powershell
npm run test:tenant-isolation
```
