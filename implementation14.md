# Implementation 14 — Emergency School Invite Delivery & Tenant Deletion Repair Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` for parallel backend/frontend execution or `superpowers:executing-plans` for inline execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make school onboarding operationally trustworthy by fixing repeated invite delivery failures, surfacing the real email-provider blocker, and adding a safe platform-owner school deletion/deprovision flow.

**Architecture:** Keep the current Next.js + NestJS + PostgreSQL architecture. Fix the root cause at the email provider/readiness boundary, preserve token secrecy, improve outbox diagnostics, and add tenant deletion through a guarded backend service rather than UI-only row removal.

**Tech Stack:** Next.js App Router, React, NestJS, PostgreSQL, existing `auth_email_outbox`, existing platform onboarding service, existing CSRF/session proxy, Resend transactional email.

**Implementation status:** Backend and frontend code changes are implemented on branch `codex/implementation14-invite-delete-repair`. API build, web build, and targeted invite/delete tests pass. One operational action remains outside code: verify a Resend sending domain and set `EMAIL_FROM` to that verified domain so real school-admin invites can leave Resend testing mode.

---

## 0. Root Cause Confirmed

Live Railway logs for repeated resend attempts show:

```text
Transactional email provider rejected You have been invited to My Shule ERP:
status=403; detail={"statusCode":403,"name":"validation_error","message":"You can only send testing emails to your own email address ([email]). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain."}
```

This means the application is generating invites and rotating invite tokens correctly, but Resend is blocking delivery because the account/domain is not production-ready.

Code cannot bypass this safely. The fix must do both:

- Configure Resend production sending with a verified domain and valid `EMAIL_FROM`.
- Improve My Shule so the UI says the exact operational problem instead of “try resend” forever.

---

## 1. Non-Negotiables

- Do not print or expose API keys, JWTs, invite tokens, password reset tokens, OTPs, or raw provider responses in the UI.
- Do not expose a “copy invite link” button by default. Invite links are account activation credentials.
- Do not hard-delete schools with operational records unless the backend proves the tenant is empty or the platform owner uses an explicit deprovision path.
- Do not let the frontend delete rows locally without a backend transaction.
- Every delete/deprovision action must be audit logged.
- Resend provider failures must be categorized into safe operator-facing codes.

---

## 2. Files To Modify

### Backend

- `apps/api/src/auth/auth-email.service.ts`
  - Add typed email delivery errors with safe provider error classification.
  - Classify Resend testing-mode/domain-verification failures.

- `apps/api/src/auth/auth-email.service.test.ts`
  - Add tests for Resend 403 testing-mode rejection and safe redaction.

- `apps/api/src/auth/auth-schema.service.ts`
  - Add outbox diagnostic columns and update `app.mark_auth_email_outbox_delivery`.

- `apps/api/src/database/schema.sql`
  - Mirror outbox diagnostic schema updates.

- `apps/api/src/modules/platform/dto/create-school.dto.ts`
  - Extend platform school response with invite diagnostic fields.
  - Add `DeleteSchoolDto`.

- `apps/api/src/modules/platform/platform-onboarding.service.ts`
  - Store safe invite delivery failure code/summary.
  - Return actionable invite status.
  - Add guarded tenant deletion/deprovision method.

- `apps/api/src/modules/platform/platform-onboarding.controller.ts`
  - Add email readiness endpoint.
  - Add `DELETE /platform/schools/:tenantId`.

- `apps/api/src/modules/platform/platform-onboarding.service.test.ts`
  - Add tests for Resend blocked delivery, successful resend after provider recovery, empty-school deletion, and deletion blocked for non-empty tenants.

- `apps/api/src/modules/events/repositories/audit-logs.repository.ts`
  - Reuse for delete/deprovision audit logs if suitable, otherwise insert audit logs directly from platform onboarding service.

### Frontend

- `apps/web/src/lib/platform/school-onboarding-client.ts`
  - Add `deletePlatformSchool`.
  - Extend `PlatformSchool` type with invite diagnostics.

- `apps/web/src/components/platform/superadmin-pages.tsx`
  - Show actionable email delivery blocker.
  - Disable misleading resend loops when provider configuration is blocked.
  - Add delete school action and confirmation modal.

- `apps/web/tests/design/support-workspace.test.tsx` or new `apps/web/tests/design/school-onboarding-actions.test.tsx`
  - Add UI tests for blocked invite message and delete confirmation.

---

## 3. Emergency Provider Configuration

This is required before invites can actually deliver to school administrators.

- [ ] **Step 1: Verify a sending domain in Resend**

Open Resend Domains and verify a real domain such as `My Shule.co.ke` or a subdomain such as `mail.My Shule.co.ke`.

Add the DNS records Resend gives you:

```text
DKIM: Resend-provided CNAME/TXT records
SPF: include Resend sender policy
DMARC: start with p=none during setup, then schedule a separate email hardening change to move toward quarantine/reject after delivery is verified
```

Expected: Resend domain status becomes verified.

- [ ] **Step 2: Set a production sender in Railway**

Set this in Railway for the API service:

```text
EMAIL_PROVIDER=resend
EMAIL_FROM=My Shule ERP <no-reply@verified-domain>
PUBLIC_APP_URL=https://my-shule-erp.vercel.app
```

Use the verified domain from Step 1. Do not use an unverified Gmail address as `EMAIL_FROM`.

- [ ] **Step 3: Redeploy API and run a real invite test**

Run:

```powershell
npx @railway/cli up --service My Shule --environment production --detach --message "Apply verified transactional email sender"
```

Expected: API deploys successfully.

Then create/resend one invite from `/superadmin/schools`.

Expected:

```text
School created. Invitation sent to admin@example.com.
```

---

## 4. Task 1 — Typed Email Delivery Errors

**Files:**

- Modify: `apps/api/src/auth/auth-email.service.ts`
- Test: `apps/api/src/auth/auth-email.service.test.ts`

- [ ] **Step 1: Write failing tests for Resend production blocker**

Add a test that mocks Resend returning status `403` with this body:

```json
{
  "statusCode": 403,
  "name": "validation_error",
  "message": "You can only send testing emails to your own email address (owner@example.com). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain."
}
```

Expected assertion:

```ts
await assert.rejects(
  () => service.sendInvitationEmail(input),
  (error: unknown) =>
    error instanceof EmailDeliveryError &&
    error.code === 'resend_domain_not_verified' &&
    error.safeMessage.includes('Verify a Resend sending domain'),
);
```

Run:

```powershell
npm run build
node --test dist/apps/api/src/auth/auth-email.service.test.js
```

Expected: FAIL because `EmailDeliveryError` does not exist yet.

- [ ] **Step 2: Implement safe error classification**

Add:

```ts
export type EmailDeliveryErrorCode =
  | 'email_not_configured'
  | 'resend_domain_not_verified'
  | 'provider_rejected'
  | 'provider_timeout'
  | 'provider_network_error';

export class EmailDeliveryError extends ServiceUnavailableException {
  constructor(
    readonly code: EmailDeliveryErrorCode,
    readonly safeMessage: string,
    readonly providerStatus?: number,
  ) {
    super(safeMessage);
  }
}
```

In `sendTransactionalEmail`, when Resend responds with the testing-mode message, throw:

```ts
throw new EmailDeliveryError(
  'resend_domain_not_verified',
  'Email delivery is blocked by Resend testing mode. Verify a Resend sending domain and set EMAIL_FROM to that verified domain before resending school invitations.',
  response.status,
);
```

Keep logger output sanitized.

- [ ] **Step 3: Verify tests**

Run:

```powershell
npm run build
node --test dist/apps/api/src/auth/auth-email.service.test.js
```

Expected: PASS.

---

## 5. Task 2 — Persist Invite Delivery Diagnostics

**Files:**

- Modify: `apps/api/src/auth/auth-schema.service.ts`
- Modify: `apps/api/src/database/schema.sql`
- Test: `apps/api/src/auth/auth-schema.service.test.ts`

- [ ] **Step 1: Add outbox diagnostic columns**

Add to `auth_email_outbox`:

```sql
last_error_code text,
last_error_summary text,
provider_status_code integer,
last_attempt_at timestamptz
```

Add constraints:

```sql
CONSTRAINT ck_auth_email_outbox_provider_status_code
  CHECK (provider_status_code IS NULL OR provider_status_code BETWEEN 100 AND 599)
```

- [ ] **Step 2: Extend delivery marker function**

Update `app.mark_auth_email_outbox_delivery` signature:

```sql
CREATE OR REPLACE FUNCTION app.mark_auth_email_outbox_delivery(
  input_outbox_id uuid,
  input_status text,
  input_error_code text DEFAULT NULL,
  input_error_summary text DEFAULT NULL,
  input_provider_status_code integer DEFAULT NULL
)
```

On failure, store safe diagnostics:

```sql
last_error_code = NULLIF(input_error_code, ''),
last_error_summary = NULLIF(input_error_summary, ''),
provider_status_code = input_provider_status_code,
last_attempt_at = NOW()
```

On sent, clear diagnostics:

```sql
last_error_code = NULL,
last_error_summary = NULL,
provider_status_code = NULL,
last_attempt_at = NOW()
```

- [ ] **Step 3: Verify schema tests**

Run:

```powershell
npm run build
node --test dist/apps/api/src/auth/auth-schema.service.test.js
```

Expected: PASS.

---

## 6. Task 3 — Return Actionable Invite Status

**Files:**

- Modify: `apps/api/src/modules/platform/dto/create-school.dto.ts`
- Modify: `apps/api/src/modules/platform/platform-onboarding.service.ts`
- Test: `apps/api/src/modules/platform/platform-onboarding.service.test.ts`

- [ ] **Step 1: Extend response DTO**

Add:

```ts
export type PlatformSchoolResponseDto = {
  tenant_id: string;
  school_name: string;
  subdomain: string;
  status: 'active' | 'inactive';
  invitation_sent: boolean;
  invitation_status: 'sent' | 'queued' | 'failed' | 'blocked';
  invitation_message: string;
  invitation_failure_code?: string;
  invitation_failure_reason?: string;
  invitation_action_required?: string;
  can_resend_invite: boolean;
  invite_expires_at: string;
  admin_email: string;
  created_at: string;
};
```

- [ ] **Step 2: Add failing service test for Resend blocker**

Expected response when `EmailDeliveryError('resend_domain_not_verified', ...)` is thrown:

```ts
assert.equal(response.invitation_status, 'blocked');
assert.equal(response.can_resend_invite, false);
assert.equal(response.invitation_failure_code, 'resend_domain_not_verified');
assert.match(response.invitation_action_required ?? '', /Verify a Resend sending domain/i);
```

- [ ] **Step 3: Implement status mapping**

When email failure code is `resend_domain_not_verified`, return:

```text
School created. Email delivery is blocked by Resend testing mode. Verify a Resend sending domain and update EMAIL_FROM, then resend the invite.
```

For transient network/timeout errors, keep `queued` and `can_resend_invite=true`.

For unknown provider rejection, return `failed` and `can_resend_invite=true`.

- [ ] **Step 4: Verify platform onboarding tests**

Run:

```powershell
npm run build
node --test dist/apps/api/src/modules/platform/platform-onboarding.service.test.js
```

Expected: PASS.

---

## 7. Task 4 — Platform Email Readiness Endpoint

**Files:**

- Modify: `apps/api/src/modules/platform/platform-onboarding.controller.ts`
- Modify: `apps/api/src/modules/platform/platform-onboarding.service.ts`
- Test: `apps/api/src/modules/platform/platform-onboarding.service.test.ts`

- [ ] **Step 1: Add endpoint**

Add:

```ts
@Get('email/readiness')
getEmailReadiness() {
  return this.onboardingService.getEmailReadiness();
}
```

- [ ] **Step 2: Return safe readiness payload**

Return:

```ts
{
  provider: 'resend',
  configured: true,
  sender_configured: true,
  public_app_url_configured: true,
  last_school_invite_status: 'blocked',
  last_failure_code: 'resend_domain_not_verified',
  action_required: 'Verify a Resend sending domain and set EMAIL_FROM to an address on that domain.'
}
```

Do not return API keys, raw sender secrets, or raw invite tokens.

---

## 8. Task 5 — Frontend Invite UX That Stops Resend Loops

**Files:**

- Modify: `apps/web/src/lib/platform/school-onboarding-client.ts`
- Modify: `apps/web/src/components/platform/superadmin-pages.tsx`
- Test: `apps/web/tests/design/school-onboarding-actions.test.tsx`

- [ ] **Step 1: Extend frontend type**

Add:

```ts
invitation_status: "sent" | "queued" | "failed" | "blocked";
invitation_failure_code?: string;
invitation_failure_reason?: string;
invitation_action_required?: string;
can_resend_invite: boolean;
```

- [ ] **Step 2: Show provider blocker clearly**

When `invitation_status === "blocked"` show:

```text
Email provider setup required
Resend is blocking delivery because the sending domain is not verified. Verify the domain and update EMAIL_FROM, then resend.
```

- [ ] **Step 3: Disable pointless resend when blocked**

Disable the resend button when `can_resend_invite === false` and show:

```text
Fix email setup first
```

After email readiness changes to configured, the backend can return `can_resend_invite=true`.

- [ ] **Step 4: Add test**

Render a row with:

```ts
invitation_status: "blocked",
can_resend_invite: false,
invitation_failure_code: "resend_domain_not_verified",
```

Assert:

```ts
expect(screen.getByText(/Email provider setup required/i)).toBeInTheDocument();
expect(screen.getByRole("button", { name: /Fix email setup first/i })).toBeDisabled();
```

Run:

```powershell
npm --prefix apps/web run test:design -- school-onboarding-actions --runInBand
```

Expected: PASS.

---

## 9. Task 6 — Guarded School Delete / Deprovision Backend

**Files:**

- Modify: `apps/api/src/modules/platform/dto/create-school.dto.ts`
- Modify: `apps/api/src/modules/platform/platform-onboarding.controller.ts`
- Modify: `apps/api/src/modules/platform/platform-onboarding.service.ts`
- Test: `apps/api/src/modules/platform/platform-onboarding.service.test.ts`

- [ ] **Step 1: Add delete DTO**

```ts
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteSchoolDto {
  @IsString()
  confirmation!: string;

  @IsString()
  @MaxLength(240)
  reason!: string;

  @IsOptional()
  @IsBoolean()
  hard_delete_empty_tenant?: boolean;
}
```

- [ ] **Step 2: Add controller route**

```ts
@Delete('schools/:tenantId')
deleteSchool(
  @Param('tenantId') tenantId: string,
  @Body() dto: DeleteSchoolDto,
) {
  return this.onboardingService.deleteSchool(tenantId, dto);
}
```

- [ ] **Step 3: Implement usage summary**

Before hard deletion, count operational data:

```sql
SELECT
  (SELECT count(*) FROM tenant_memberships WHERE tenant_id = $1) AS memberships,
  (SELECT count(*) FROM students WHERE tenant_id = $1) AS students,
  (SELECT count(*) FROM invoices WHERE tenant_id = $1) AS invoices,
  (SELECT count(*) FROM support_tickets WHERE tenant_id = $1) AS support_tickets,
  (SELECT count(*) FROM mpesa_transactions WHERE tenant_id = $1) AS mpesa_transactions
```

If a table does not exist in this repo version, use the existing table name for that module or omit it only after confirming with `rg`.

- [ ] **Step 4: Hard-delete only empty tenants**

Allow hard deletion only if:

```ts
summary.students === 0 &&
summary.invoices === 0 &&
summary.support_tickets === 0 &&
summary.mpesa_transactions === 0
```

For empty tenants, transactionally delete:

```sql
DELETE FROM auth_email_outbox WHERE tenant_id = $1;
DELETE FROM auth_action_tokens WHERE tenant_id = $1;
DELETE FROM tenant_memberships WHERE tenant_id = $1;
DELETE FROM school_sms_wallets WHERE school_id = $1 OR tenant_id = $1;
DELETE FROM school_integrations WHERE school_id = $1 OR tenant_id = $1;
DELETE FROM tenants WHERE tenant_id = $1;
```

Only include tables that exist. Use one transaction.

- [ ] **Step 5: Soft-deprovision non-empty tenants**

For non-empty tenants, do not hard delete. Update:

```sql
UPDATE tenants
SET
  status = 'inactive',
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'deprovisioned_at', NOW(),
    'deprovisioned_by_user_id', $2,
    'deprovision_reason', $3
  )
WHERE tenant_id = $1
RETURNING tenant_id, name, subdomain, status, created_at
```

- [ ] **Step 6: Audit log**

Insert audit log:

```ts
action: hardDelete ? 'platform.school.deleted' : 'platform.school.deprovisioned',
resource_type: 'tenant',
resource_id: tenantUuidOrNull,
metadata: {
  tenant_id: tenantId,
  hard_delete_empty_tenant: hardDelete,
  reason,
  usage_summary: summary,
}
```

- [ ] **Step 7: Tests**

Add tests:

```ts
test('PlatformOnboardingService hard deletes an empty failed-invite school after slug confirmation', async () => {});
test('PlatformOnboardingService refuses hard delete when confirmation does not match tenant id', async () => {});
test('PlatformOnboardingService deprovisions instead of hard deleting a tenant with operational records', async () => {});
```

Run:

```powershell
npm run build
node --test dist/apps/api/src/modules/platform/platform-onboarding.service.test.js
```

Expected: PASS.

---

## 10. Task 7 — Frontend Delete School UX

**Files:**

- Modify: `apps/web/src/lib/platform/school-onboarding-client.ts`
- Modify: `apps/web/src/components/platform/superadmin-pages.tsx`
- Test: `apps/web/tests/design/school-onboarding-actions.test.tsx`

- [ ] **Step 1: Add client function**

```ts
export async function deletePlatformSchool(input: {
  tenantId: string;
  confirmation: string;
  reason: string;
  hardDeleteEmptyTenant: boolean;
}) {
  const response = await fetchWithTimeout(
    `/api/platform/schools/${encodeURIComponent(input.tenantId)}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-myshule-csrf": await getCsrfToken(),
      },
      credentials: "same-origin",
      body: JSON.stringify({
        confirmation: input.confirmation,
        reason: input.reason,
        hard_delete_empty_tenant: input.hardDeleteEmptyTenant,
      }),
    },
  );

  return parsePlatformResponse(response);
}
```

- [ ] **Step 2: Add danger action**

Add a `Delete` button beside `Suspend`, but keep it visually distinct:

```text
Delete
```

Open a modal requiring:

```text
Type the school URL slug to confirm deletion.
Reason for deletion.
Checkbox: Permanently delete if this tenant has no operational records.
```

- [ ] **Step 3: Remove row only after backend success**

If backend returns `deleted: true`, remove row from table.

If backend returns `deprovisioned: true`, update status to `Suspended`/`Inactive` and show:

```text
School deprovisioned. Operational records were preserved.
```

- [ ] **Step 4: Tests**

Assert:

```ts
expect(screen.getByRole("button", { name: /Delete Kaimosi/i })).toBeInTheDocument();
expect(screen.getByText(/Type kaimosi-high to confirm/i)).toBeInTheDocument();
```

Run:

```powershell
npm --prefix apps/web run test:design -- school-onboarding-actions --runInBand
```

Expected: PASS.

---

## 11. Task 8 — Deployment Verification

- [ ] **Step 1: Backend build and targeted tests**

Run:

```powershell
npm run build
node --test dist/apps/api/src/auth/auth-email.service.test.js dist/apps/api/src/auth/auth-schema.service.test.js dist/apps/api/src/modules/platform/platform-onboarding.service.test.js
```

Expected: all tests pass.

- [ ] **Step 2: Frontend tests and build**

Run:

```powershell
npm --prefix apps/web run test:design -- school-onboarding-actions --runInBand
npm --prefix apps/web run build
```

Expected: all tests and build pass.

- [ ] **Step 3: Deploy API**

Run:

```powershell
npx @railway/cli up --service My Shule --environment production --detach --message "Fix school invite diagnostics and deletion"
```

Expected: Railway deployment succeeds and `/health` returns `{"status":"ok"}`.

- [ ] **Step 4: Deploy frontend**

Run:

```powershell
npx vercel --prod --yes
```

Expected: production deployment is ready and aliased to `https://my-shule-erp.vercel.app`.

- [ ] **Step 5: Live smoke tests**

1. Open `/superadmin/schools`.
2. Confirm failed schools show the Resend domain/setup blocker.
3. Confirm resend no longer encourages repeated attempts while provider setup is blocked.
4. Verify Resend domain and `EMAIL_FROM`.
5. Resend invite to a non-owner Gmail address.
6. Confirm row changes to `Invitation sent`.
7. Create a test school with zero records.
8. Delete it using slug confirmation.
9. Refresh and confirm it is gone.

---

## 12. Final Acceptance Criteria

- School invite failures tell the platform owner the real safe reason.
- Resend testing-mode/domain errors stop producing endless “resend again” loops.
- Once Resend domain is verified and `EMAIL_FROM` is valid, school admin invites deliver to real external emails.
- Each resend rotates the invite token and does not expose it.
- School deletion exists in the UI.
- Empty failed-invite schools can be permanently deleted.
- Non-empty schools are deprovisioned safely instead of destructively deleted.
- Every delete/deprovision is audit logged.
- Production deploys pass health checks.

---

## 13. Fastest Safe Execution Order

1. Configure Resend verified domain and Railway `EMAIL_FROM`.
2. Implement Task 1 and Task 3 so provider blockers are typed and actionable.
3. Implement Task 5 so the UI stops misleading repeated resends.
4. Implement Task 6 and Task 7 for safe deletion.
5. Run targeted tests, deploy API, deploy frontend.
