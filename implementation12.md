# Implementation 12 - Platform Owner Route Recovery, Support Workspace Differentiation, and Invitation Reliability

## Objective

Fix the visible production issues in the platform owner workspace:

- `/superadmin/sms-settings` currently opens the authentication 404 page.
- Quick action buttons route to invalid public paths such as `/support`.
- Support pages for Open, In Progress, Escalated, Resolved, SLA Monitoring, and Support Analytics feel too similar.
- Platform Owner Settings has little operational value beyond a broken SMS settings link.
- School creation waits too long during admin invitation delivery, then fails with "Invite could not be sent now."

The goal is not to redesign the full ERP. The goal is to repair broken routes, make platform-owner workflows distinct and useful, and make school onboarding reliable even when email delivery is delayed or temporarily unavailable.

## Verified Failure Map

| Area | Current failure | Verified root cause | Required fix |
| --- | --- | --- | --- |
| Super admin SMS settings | `/superadmin/sms-settings` shows auth 404 | `apps/web/src/app/superadmin/[section]/page.tsx` does not include `sms-settings` in `allowedSections` | Add `sms-settings` to the public superadmin section registry and test route availability |
| Quick actions | Buttons open `/support`, `/schools`, or other invalid public paths | `superadminQuickActions` are passed raw into `QuickActionBar`; nav links are mapped, quick actions are not | Map quick action hrefs with `mapSuperadminHref()` when `routeMode="public"` |
| Support status pages | Open, In Progress, Escalated, Resolved, SLA, and Analytics resemble each other | `PlatformSupportWorkspace` uses the same header, metric set, and panels for most views | Add a per-view workspace configuration and render distinct operational surfaces |
| Platform owner settings | Only useful action is SMS Settings; link fails | Settings page is sparse and depends on the broken route | Add operational settings cards with valid links, readiness states, and useful actions |
| School invitation | School creation spins, then invitation failure blocks onboarding | `createSchool()` sends email synchronously inside the database transaction | Persist school, admin invite token, and outbox first; send or queue email after commit; return useful delivery status |

## File Map

Primary frontend files:

- `apps/web/src/app/superadmin/[section]/page.tsx`
- `apps/web/src/components/platform/superadmin-pages.tsx`
- `apps/web/src/components/support/platform-support-workspace.tsx`
- `apps/web/src/lib/experiences/superadmin-data.ts`
- `apps/web/src/lib/routing/experience-routes.ts`
- `apps/web/src/lib/platform/school-onboarding-client.ts`

Primary backend files:

- `apps/api/src/modules/platform/platform-onboarding.service.ts`
- `apps/api/src/modules/platform/platform-onboarding.controller.ts`
- `apps/api/src/modules/platform/dto/create-school.dto.ts`
- `apps/api/src/modules/email/email.service.ts`
- `apps/api/src/modules/auth/email-action-token.service.ts`

Primary tests to add or update:

- `apps/web/tests/design/superadmin-pages.test.tsx`
- `apps/web/tests/design/platform-support-workspace.test.tsx`
- `apps/web/tests/design/school-onboarding.test.tsx`
- `apps/api/src/modules/platform/platform-onboarding.service.spec.ts`
- `apps/api/src/modules/integrations/platform-sms.controller.spec.ts`

## Phase 1 - Route Recovery and Navigation Fixes

### 1.1 Create a shared superadmin section registry

Create:

`apps/web/src/lib/routing/superadmin-sections.ts`

Include every public superadmin section:

```ts
export const SUPERADMIN_PUBLIC_SECTIONS = [
  "tenants",
  "schools",
  "revenue",
  "subscriptions",
  "mpesa-monitoring",
  "sms-settings",
  "users",
  "support",
  "support-open",
  "support-in-progress",
  "support-escalated",
  "support-resolved",
  "support-sla",
  "support-analytics",
  "audit-logs",
  "infrastructure",
  "notifications",
  "settings",
] as const;

export type SuperadminPublicSection = (typeof SUPERADMIN_PUBLIC_SECTIONS)[number];

export function isSuperadminPublicSection(section: string): section is SuperadminPublicSection {
  return SUPERADMIN_PUBLIC_SECTIONS.includes(section as SuperadminPublicSection);
}
```

Update `apps/web/src/app/superadmin/[section]/page.tsx` to use this registry instead of a local array.

Acceptance checks:

- `/superadmin/sms-settings` renders `PlatformSmsSettingsPage`.
- `/superadmin/support-open` still renders.
- Unknown sections still trigger the branded auth 404 page.

### 1.2 Fix quick action href mapping

In `apps/web/src/components/platform/superadmin-pages.tsx`, update `SuperadminOverview` so quick actions are mapped the same way sidebar navigation is mapped.

Implementation shape:

```tsx
const quickActions = superadminQuickActions.map((action) => ({
  ...action,
  href: mapSuperadminHref(action.href, routeMode),
}));

<QuickActionBar actions={quickActions} />
```

Acceptance checks:

- "Create school" links to `/superadmin/schools`.
- "Open support queue" links to `/superadmin/support`.
- "Review audit logs" links to `/superadmin/audit-logs`.
- No platform owner quick action sends the user to `/support`.

### 1.3 Add regression tests

Add tests that assert:

- `sms-settings` is accepted by the dynamic superadmin route.
- Public-mode quick actions map to `/superadmin/...`.
- Hosted-mode quick actions still use hosted section paths when needed.

## Phase 2 - SMS Settings Recovery

### 2.1 Keep SMS settings as a platform-owner only page

After route recovery, the existing `PlatformSmsSettingsPage` should load at:

`/superadmin/sms-settings`

It already calls:

- `GET /api/platform/sms/providers`
- `POST /api/platform/sms/providers`
- `PATCH /api/platform/sms/providers/:providerId`
- `POST /api/platform/sms/providers/:providerId/test`
- `POST /api/platform/sms/providers/:providerId/set-default`

Confirm `apps/web/src/app/api/platform/[...path]/route.ts` continues proxying these methods to the backend with the superadmin audience.

### 2.2 Improve failure states

Add clear operational messaging to `PlatformSmsSettingsPage`:

- If unauthenticated: "Your platform session expired. Sign in again to manage SMS providers."
- If backend unavailable: "SMS provider settings could not be loaded. Check API health and retry."
- If no provider exists: show a clean empty state with "Add SMS provider".
- If provider test fails: show provider-safe error text without exposing API keys.

Security rules:

- Never render API keys after save.
- Never log provider secrets in browser console.
- Never include SMS secrets in test failure messages.

### 2.3 Add route and UI tests

Tests must cover:

- SMS settings route renders in public superadmin mode.
- Empty provider state is visible.
- Provider connection errors show safe copy.
- Secret fields remain masked.

## Phase 3 - Distinct Support Workspaces

### 3.1 Add support view configuration

In `apps/web/src/components/support/platform-support-workspace.tsx`, add a `supportViewConfig` map:

```ts
const supportViewConfig = {
  support: {
    title: "All support tickets",
    subtitle: "Monitor every tenant conversation, escalation, and customer reply.",
    queueTitle: "Global support queue",
    emptyTitle: "No support tickets yet",
    emptyDescription: "Tickets will appear here when schools contact support.",
  },
  "support-open": {
    title: "Open ticket intake",
    subtitle: "New school requests waiting for triage and first response.",
    queueTitle: "Unassigned and newly opened tickets",
    emptyTitle: "No open tickets",
    emptyDescription: "New tickets will appear here before assignment.",
  },
  "support-in-progress": {
    title: "Active support work",
    subtitle: "Tickets already owned by support agents and being resolved.",
    queueTitle: "Tickets currently being worked",
    emptyTitle: "No tickets in progress",
    emptyDescription: "Assigned tickets will appear here after support begins work.",
  },
  "support-escalated": {
    title: "Escalated incidents",
    subtitle: "Critical issues requiring senior support, engineering, or management visibility.",
    queueTitle: "Escalated ticket queue",
    emptyTitle: "No escalated tickets",
    emptyDescription: "Critical escalations will appear here with SLA and owner visibility.",
  },
  "support-resolved": {
    title: "Resolved tickets",
    subtitle: "Recently resolved support conversations and closure quality checks.",
    queueTitle: "Resolved ticket history",
    emptyTitle: "No resolved tickets yet",
    emptyDescription: "Closed support outcomes will appear here for audit and reporting.",
  },
  "support-sla": {
    title: "SLA monitoring",
    subtitle: "Track response risk, overdue tickets, and support service health.",
    queueTitle: "Tickets at SLA risk",
    emptyTitle: "No SLA breaches",
    emptyDescription: "Overdue and at-risk tickets will appear here.",
  },
  "support-analytics": {
    title: "Support analytics",
    subtitle: "Understand ticket volume, recurring issues, tenant friction, and support performance.",
    queueTitle: "Recurring issue patterns",
    emptyTitle: "No analytics yet",
    emptyDescription: "Support analytics will populate after live ticket activity.",
  },
} satisfies Record<PlatformSupportView, SupportViewConfig>;
```

Use the config to render:

- Distinct page title.
- Distinct subtitle.
- Distinct queue heading.
- Distinct empty state.
- Distinct right-side operational panels.

### 3.2 Render support-specific panels

Open:

- New ticket intake.
- First response due.
- Unassigned tickets.
- Critical new tickets.

In Progress:

- Assigned agents.
- Waiting on support.
- Next action due.
- Tickets without recent agent activity.

Escalated:

- Critical tenants.
- Engineering handoff.
- SLA breach risk.
- Escalation owner.

Resolved:

- Resolution quality.
- Reopened ticket risk.
- Average resolution time.
- Closure audit history.

SLA Monitoring:

- First response SLA.
- Resolution SLA.
- Breach countdowns.
- Overdue tenant impact.

Support Analytics:

- Recurring issues.
- Module heatmap.
- Tenant issue frequency.
- Agent workload.

### 3.3 Keep tenant isolation and empty states honest

Do not add fake sample support tickets. Empty pages should say what will appear after real schools create tickets.

Acceptance checks:

- Each support route has a unique title and operational purpose.
- Empty states are specific to each status.
- Support analytics does not look like the open queue.
- SLA monitoring prioritizes SLA data over the generic queue.

## Phase 4 - Platform Owner Settings Completion

### 4.1 Replace sparse settings with operational cards

Update `SettingsPage` in `apps/web/src/components/platform/superadmin-pages.tsx` to include:

- Messaging and SMS providers.
- School invitations and email delivery health.
- Support routing and SLA policy.
- Authentication and MFA policy.
- Platform identity and branding.
- Infrastructure readiness.
- Audit and compliance posture.

Each card should include:

- A clear title.
- Current status.
- What the owner can do next.
- A valid link to the relevant page.

Valid links:

- SMS providers: `/superadmin/sms-settings`
- School onboarding: `/superadmin/schools`
- Support settings: `/superadmin/support`
- Audit logs: `/superadmin/audit-logs`
- Infrastructure: `/superadmin/infrastructure`
- Notifications: `/superadmin/notifications`

### 4.2 Show live readiness without fake configuration

Use existing readiness helpers where available:

- API health.
- Email configuration state.
- SMS provider state.
- Support integration state.

If live state is unavailable, show "Not connected" or "Needs setup" instead of optimistic fake readiness.

Acceptance checks:

- Settings page has multiple useful owner actions.
- All links resolve inside `/superadmin/...`.
- No card claims a feature is configured when backend readiness is unknown.

## Phase 5 - School Invitation Reliability

### 5.1 Decouple school creation from email delivery

Current behavior:

`createSchool()` creates tenant data, creates invite token, inserts email outbox, and calls `emailService.sendInvitationEmail()` inside the request transaction.

Required behavior:

1. Validate school and admin input.
2. Create the tenant, school baseline, owner/admin user record, invite token, and email outbox record inside the database transaction.
3. Commit the transaction.
4. Attempt email delivery after commit with a bounded timeout.
5. If email delivery succeeds, mark outbox `sent`.
6. If email delivery fails, mark outbox `failed` or keep it `pending_retry`.
7. Return the created school response either way.
8. Show the user a clear state:
   - "School created. Invitation sent."
   - "School created. Invitation queued for retry."
   - "School created. Invitation delivery failed. Use resend invite."

The school must not be rolled back only because email delivery failed.

### 5.2 Add response fields

Update the backend response DTO to include:

```ts
invitation_status: "sent" | "queued" | "failed";
invitation_message: string;
invite_expires_at: string;
```

Do not return the raw invite token.

### 5.3 Add resend invite support

Add or verify an endpoint:

`POST /platform/schools/:tenantId/admin-invite/resend`

Behavior:

- Requires platform owner permission.
- Creates a fresh signed invite token.
- Invalidates old unconsumed invite tokens for the same admin email.
- Queues or sends the invite.
- Returns safe delivery status.

Frontend:

- Add "Resend invite" action in school detail or onboarding confirmation.
- Disable button while request is running.
- Show safe success or retry messaging.

### 5.4 Add bounded client wait

In `apps/web/src/lib/platform/school-onboarding-client.ts`, add a request timeout for school creation so the UI does not spin indefinitely.

Recommended behavior:

- 20 second request timeout.
- If timeout occurs after the backend created the school, backend response should still be recoverable by refreshing the schools list.
- UI message: "School creation is taking longer than expected. Refresh schools before trying again."

### 5.5 Backend tests

Add tests for:

- School creation succeeds when email delivery succeeds.
- School creation still succeeds when `sendInvitationEmail()` throws.
- Failed delivery updates outbox state without exposing token or secrets.
- Resend invite creates a new token and marks old active tokens consumed or superseded.
- `invitation_status` is returned accurately.

### 5.6 Frontend tests

Add tests for:

- Successful school creation with invitation sent.
- Successful school creation with invitation queued.
- Failed invite does not display as failed school creation.
- Resend invite button appears when delivery status is queued or failed.

## Phase 6 - Error Copy and UX Polish

### 6.1 Replace vague errors

Use precise, calm, operational messages:

- Bad route: "This page is not available in the platform owner workspace."
- SMS settings unavailable: "SMS provider settings could not be loaded."
- Invite queued: "School created. The admin invite is queued for delivery."
- Invite failed: "School created. The invite could not be delivered yet. You can resend it."

Avoid:

- "Something went wrong."
- "Invite could not be sent now" when the school was actually created.
- Authentication language for valid platform owner pages.

### 6.2 Preserve production safety

Do not add demo data, sample tickets, fake schools, visible credentials, test OTPs, or hardcoded emails.

## Phase 7 - Verification Checklist

Run these checks after implementation:

```powershell
npm --prefix apps/web run test -- superadmin
npm --prefix apps/web run test -- support
npm --prefix apps/web run test -- school-onboarding
npm --prefix apps/api run test -- platform-onboarding
npm --prefix apps/api run test -- integrations
npm --prefix apps/web run lint
npm --prefix apps/web run build
npm --prefix apps/api run build
```

Manual browser checks:

- Open `/superadmin/sms-settings`; confirm SMS provider workspace renders.
- Click every platform owner quick action; confirm no action opens auth 404.
- Open `/superadmin/support-open`; confirm Open page has unique title and queue copy.
- Open `/superadmin/support-in-progress`; confirm In Progress page has unique title and operational panels.
- Open `/superadmin/support-escalated`; confirm escalation-specific page.
- Open `/superadmin/support-resolved`; confirm resolved-ticket page.
- Open `/superadmin/support-sla`; confirm SLA monitoring page.
- Open `/superadmin/support-analytics`; confirm analytics page.
- Open `/superadmin/settings`; confirm multiple useful platform owner actions.
- Create a school with a valid admin email; confirm the school is created even if email delivery is delayed.
- Resend the admin invite from the school onboarding/detail surface.

## Deployment Sequence

1. Implement route registry and quick action fixes.
2. Deploy web preview and verify SMS settings no longer routes to auth 404.
3. Implement support workspace differentiation.
4. Implement platform settings improvements.
5. Implement backend invitation reliability changes.
6. Deploy API.
7. Deploy web.
8. Run manual browser smoke tests.
9. Watch production logs for:
   - `platform/sms/providers`
   - `platform/schools`
   - invitation outbox delivery
   - auth 404 route recovery

## Production Acceptance Criteria

This implementation is complete when:

- `/superadmin/sms-settings` works for the platform owner.
- No platform owner sidebar or quick action opens the auth 404 page.
- Support pages no longer feel like duplicate pages.
- Platform Owner Settings provides useful operational actions.
- School creation no longer fails only because email delivery fails.
- Admin invitations can be resent safely.
- No secrets, OTPs, raw invite tokens, or provider API keys are exposed in UI, logs, or responses.
