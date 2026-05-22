# MyShule ERP Command Center Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the MyShule school dashboard ecosystem into a premium, dark, module-aware institutional command center with RBAC, tenant isolation, approvals, audit visibility, AI insights, and role-specific dashboards.

**Architecture:** Apply the redesign through shared tokens, shell components, and reusable command-center primitives first so the work lands fast across many routes. Keep the existing Next.js App Router, React 19, Tailwind 4, Nest API, module-access map, admin-command API, and existing module screens, then upgrade high-value surfaces in priority order.

**Tech Stack:** Next.js 16, React 19, TypeScript, TailwindCSS tokens, Framer Motion, lucide-react, Jest design tests, Playwright e2e, existing NestJS APIs, tenant-aware module access, RBAC/ABAC guards, audit logs, and admin-command principal dashboard endpoints.

---

## Fast Implementation Rule

This implementation must be as fast as possible without becoming superficial.

- Change shared primitives before individual pages.
- Reuse existing APIs and module data instead of creating new backend flows unless a required UI cannot be driven by current data.
- Use CSS-native mini charts, heat strips, progress rings, sparklines, and status matrices before adding chart libraries.
- Split only the files that block speed or safe testing. Do not perform broad unrelated refactors.
- Prioritize the routes users see most: school shell, principal dashboard, school login, parent login, parent portal, shared tables/forms/cards, and module shell.
- Use focused tests for design gates and module hiding. Avoid rewriting snapshots unless the snapshot exists only to preserve the old light UI.

## Current Fit Verification

The current system partially satisfies the architecture brief, but it does not yet satisfy the visual and executive experience brief.

### What Already Exists

- Tenant/module awareness exists in `apps/web/src/lib/module-access/module-access-map.ts`.
- School routes filter modules through `filterNavItemsByEnabledModules(...)` in `apps/web/src/components/school/school-pages.tsx`.
- The principal dashboard already calls `/api/admin-command/principal/dashboard` and streams updates from `/api/admin-command/principal/dashboard/stream`.
- Many operational modules already exist under `apps/web/src/components/modules`.
- Shared shell components already exist in `apps/web/src/components/system/app-frame.tsx`, `apps/web/src/components/system/app-sidebar.tsx`, and `apps/web/src/components/system/app-topbar.tsx`.
- Existing tests cover module hiding, experience separation, dashboard order, role routing, and Implementation 100 theme.

### Critical Gaps

- `apps/web/src/app/globals.css` still defines a light system: `--background: #f3f4f6`, `--surface: #ffffff`, and dark text on light surfaces.
- Shared cards, tables, forms, topbars, and sidebars are still built around `bg-white`, `bg-surface`, `bg-surface-muted`, and slate/emerald accents.
- `apps/web/src/components/auth/auth-shell.tsx` defaults to a light theme and uses emerald/teal atmosphere instead of MyShule navy/orange command-center branding.
- `apps/web/src/components/auth/school-login-view.tsx` and `apps/web/src/components/auth/portal-login-view.tsx` still read as secure SaaS forms, not elite institutional login experiences.
- Principal navigation in `apps/web/src/lib/experiences/school-data.ts` exposes operational modules directly. The brief requires Principal sidebar: Dashboard, Executive Analytics, Alerts & Risks, Approvals, Users & Staff, Reports, AI Insights, Audit Logs, Settings.
- While module access loads, `SchoolPages` can show broad nav from fallback data. Disabled module content should never flash visibly.
- The role model does not cover all requested roles: HOD, class teacher, nurse, transport manager, HR officer, procurement officer, boarding master, security officer, lab technician, and student.
- Parent portal surfaces are light/blue and not yet module-aware for clinic, transport, attendance, communication, and child-only visibility.
- Tables and module screens include many direct `bg-white` usages, especially exams, procurement, live module wrappers, auth components, old school/portal shells, and public dashboard cards.

## Target Visual System

### Tokens

| Token | Value | Usage |
| --- | --- | --- |
| `--background` | `#071B3B` | App base, no pure white backgrounds |
| `--background-2` | `#0B2447` | Shell gradients and page bands |
| `--background-3` | `#102C57` | Deep panels and section depth |
| `--surface` | `#13294B` | Cards, tables, login cards |
| `--surface-muted` | `#162F57` | Nested surfaces, filters, rows |
| `--surface-strong` | `#1D3B68` | Hover, selected rows, elevated panels |
| `--foreground` | `#F8FAFC` | Primary text |
| `--muted` | `#CBD5E1` | Secondary text |
| `--muted-strong` | `#94A3B8` | Quiet labels |
| `--border` | `rgba(148, 163, 184, 0.18)` | Default borders |
| `--border-strong` | `rgba(249, 115, 22, 0.36)` | Focus and active borders |
| `--primary` | `#071B3B` | Sidebar, topbar, deep brand panels |
| `--primary-hover` | `#0B2447` | Hover on navy controls |
| `--accent` | `#F97316` | Primary CTAs, active states, pulse |
| `--accent-hover` | `#FB923C` | CTA hover |
| `--accent-soft` | `rgba(249, 115, 22, 0.14)` | Accent panels |
| `--accent-glow` | `0 0 34px rgba(249, 115, 22, 0.24)` | Premium hover glow |

### Required UI Motifs

- Layered navy gradients with subtle grid overlay.
- Dark glass panels with backdrop blur and steel borders.
- Orange active indicators, live pulses, and hover glow.
- Metric cards with sparklines, rings, trend strips, and operational status.
- Tables inside dark panels with sticky headers, dark row hover, and soft border glow.
- Inputs on dark fields with orange focus glow.
- Mobile stacked panels, sticky command topbar, and high-density card rhythm.

## Module-Aware Dynamic Rules

The UI must treat enabled modules as the source of truth.

- Disabled modules must not appear in menus, dashboards, search, quick actions, alerts, approvals, notifications, reports, AI insights, or direct-route rendered content.
- Principal executive dashboard sections must be generated only from `dashboard.enabled_modules`.
- Parent portal nav must hide fees, academics, discipline, clinic, transport, messages, downloads, and notifications unless the corresponding modules are enabled.
- Workflow approvals must be catalog-driven by enabled module code.
- AI insights must be hidden unless `ai_insights` is enabled and must only reference enabled modules.
- When module status is unknown, render a restrained "verifying access" command panel instead of showing fallback operational navigation.

## Role Model Target

Add role-aware UI definitions for:

- owner/principal
- deputy principal
- secretary
- bursar/accountant
- HOD
- teacher
- class teacher
- nurse
- librarian
- storekeeper
- transport manager
- HR officer
- procurement officer
- boarding master
- security officer
- lab technician
- parent
- student

Fast path: map closely related roles to existing dashboards where acceptable, but give each role its own shell label, nav policy, and dashboard summary so the UI never feels like a mislabeled generic admin panel.

## Implementation Tasks

### Task 1: Add Design Gates for Implementation 200

**Files:**

- Create: `apps/web/tests/design/implementation200-theme.test.ts`
- Modify: `apps/web/tests/design/implementation100-theme.test.ts`
- Modify: `apps/web/tests/design/module-readiness.test.ts`

- [ ] **Step 1: Create dark command theme test**

Create `apps/web/tests/design/implementation200-theme.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Implementation 200 command-center theme", () => {
  const globalsCss = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

  it("uses the MyShule dark command-center palette", () => {
    expect(globalsCss).toContain("--background: #071B3B;");
    expect(globalsCss).toContain("--background-2: #0B2447;");
    expect(globalsCss).toContain("--background-3: #102C57;");
    expect(globalsCss).toContain("--surface: #13294B;");
    expect(globalsCss).toContain("--surface-muted: #162F57;");
    expect(globalsCss).toContain("--surface-strong: #1D3B68;");
    expect(globalsCss).toContain("--foreground: #F8FAFC;");
    expect(globalsCss).toContain("--muted: #CBD5E1;");
    expect(globalsCss).toContain("--muted-strong: #94A3B8;");
    expect(globalsCss).toContain("--accent: #F97316;");
  });

  it("keeps pure white out of app chrome tokens", () => {
    expect(globalsCss).not.toContain("--surface: #ffffff;");
    expect(globalsCss).not.toContain("--background: #f3f4f6;");
  });
});
```

- [ ] **Step 2: Update old theme test**

Change `implementation100-theme.test.ts` so it verifies the new Implementation 200 palette and no longer asserts the old off-white/white system.

- [ ] **Step 3: Add principal executive nav assertions**

Extend `module-readiness.test.ts`:

```ts
it("keeps principal navigation executive-only", () => {
  const principalNavIds = getSchoolWorkspace("principal").navItems.map((item) => item.id);

  expect(principalNavIds).toEqual(
    expect.arrayContaining([
      "dashboard",
      "executive-analytics",
      "alerts-risks",
      "approvals",
      "users-staff",
      "reports",
      "ai-insights",
      "audit-logs",
      "settings",
    ]),
  );
  expect(principalNavIds).not.toContain("students");
  expect(principalNavIds).not.toContain("finance");
  expect(principalNavIds).not.toContain("transport");
  expect(principalNavIds).not.toContain("procurement");
});
```

- [ ] **Step 4: Run the expected failing tests**

Run:

```powershell
npm --prefix apps/web run test:design -- implementation200-theme implementation100-theme module-readiness
```

Expected: fails until the theme and principal nav are updated.

### Task 2: Replace Global Tokens With Dark Command-Center System

**Files:**

- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/components/ui/card.tsx`
- Modify: `apps/web/src/components/ui/button.tsx`
- Modify: `apps/web/src/components/ui/data-table.tsx`
- Modify: `apps/web/src/components/ui/page-header.tsx`
- Modify: `apps/web/src/components/ui/status-pill.tsx`
- Modify: `apps/web/src/components/ui/tabs.tsx`
- Modify: `apps/web/src/components/ui/modal.tsx`
- Modify: `apps/web/src/components/ui/empty-state.tsx`
- Modify: `apps/web/src/components/ui/skeleton-card.tsx`

- [ ] **Step 1: Update CSS variables**

In `globals.css`, replace the light tokens with the target visual system tokens. Keep the existing variable names where possible to minimize file churn.

- [ ] **Step 2: Add reusable background utilities**

Add these utilities to `globals.css`:

```css
.command-background {
  background:
    radial-gradient(circle at top left, rgba(249, 115, 22, 0.15), transparent 32rem),
    radial-gradient(circle at 85% 15%, rgba(59, 130, 246, 0.16), transparent 28rem),
    linear-gradient(135deg, #071B3B 0%, #0B2447 44%, #111827 100%);
}

.command-grid {
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
  background-size: 42px 42px;
}

.glass-panel {
  background: linear-gradient(145deg, rgba(19, 41, 75, 0.88), rgba(22, 47, 87, 0.76));
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);
  backdrop-filter: blur(18px);
}
```

- [ ] **Step 3: Upgrade shared `Card`**

Make `Card` render dark glass panels by default while keeping `dashboard-card` compatibility.

- [ ] **Step 4: Upgrade buttons**

Primary buttons must use orange gradient, glow hover, and slight scale. Secondary buttons must use dark navy glass with soft border.

- [ ] **Step 5: Upgrade tables**

Update `DataTable` so headers, rows, pagination, and mobile cards are dark. The table must not contain white headers or white mobile cards.

- [ ] **Step 6: Upgrade forms and states**

Update `.input-base`, `Modal`, `Tabs`, `EmptyState`, `SkeletonCard`, and status badges to work on dark backgrounds with accessible contrast.

- [ ] **Step 7: Verify theme gates**

Run:

```powershell
npm --prefix apps/web run test:design -- implementation200-theme implementation100-theme
```

Expected: pass.

### Task 3: Add Command-Center UI Primitives

**Files:**

- Create: `apps/web/src/components/ui/command-primitives.tsx`
- Modify: `apps/web/src/components/experience/metric-grid.tsx`
- Modify: `apps/web/src/components/dashboard/kpi-cards.tsx`
- Modify: `apps/web/src/components/dashboard/alerts-panel.tsx`
- Modify: `apps/web/src/components/dashboard/activity-feed.tsx`

- [ ] **Step 1: Create command primitives**

Create components:

- `CommandMetricCard`
- `CommandInsightCard`
- `OperationalTimeline`
- `SignalStrip`
- `ProgressRing`
- `MiniSparkline`
- `RiskHeatmap`
- `LiveIndicator`

Keep props plain and data-driven so they can be reused across school, parent, platform, and module screens.

- [ ] **Step 2: Convert metric grids**

Use `CommandMetricCard` inside `MetricGrid` and `KpiCards`. Preserve existing props and tests.

- [ ] **Step 3: Convert alerts and activity**

Use `SignalStrip`, `RiskHeatmap`, and `OperationalTimeline` in alert and activity components.

- [ ] **Step 4: Run component tests**

Run:

```powershell
npm --prefix apps/web run test:design -- layout hierarchy density dashboard
```

Expected: pass after snapshots are updated only where they preserve the previous light UI.

### Task 4: Upgrade Global App Shells

**Files:**

- Modify: `apps/web/src/components/system/app-frame.tsx`
- Modify: `apps/web/src/components/system/app-sidebar.tsx`
- Modify: `apps/web/src/components/system/app-topbar.tsx`
- Modify: `apps/web/src/components/school/erp-shell.tsx`
- Modify: `apps/web/src/components/dashboard/dashboard-layout.tsx`
- Modify: `apps/web/src/components/dashboard/sidebar.tsx`
- Modify: `apps/web/src/components/dashboard/topbar.tsx`
- Modify: `apps/web/src/components/layouts/school-shell.tsx`
- Modify: `apps/web/src/components/layouts/portal-shell.tsx`
- Modify: `apps/web/src/components/portal/portal-shell.tsx`

- [ ] **Step 1: AppFrame dark layered base**

Use `command-background`, `command-grid`, and constrained content width. Avoid `bg-background` alone when it produces a flat panel.

- [ ] **Step 2: Sidebar command center**

Make sidebars dark navy glass panels with grouped modules, orange active indicator, glow hover state, profile panel, and live session state.

- [ ] **Step 3: Topbar live operations**

Add school identity, global search, notifications, operational status, profile dropdown, emergency alert affordance, and sync indicators in the topbar. Use orange pulse indicators for live/sync status.

- [ ] **Step 4: Preserve responsive behavior**

Mobile sidebars must use the same dark panel styling and close reliably through the existing `mobileOpen` state.

- [ ] **Step 5: Run shell tests**

Run:

```powershell
npm --prefix apps/web run test:design -- experience-shells layout interaction
```

Expected: pass.

### Task 5: Make Principal Navigation Executive-Only

**Files:**

- Modify: `apps/web/src/lib/experiences/school-data.ts`
- Modify: `apps/web/src/lib/module-access/module-access-map.ts`
- Modify: `apps/web/src/components/school/school-pages.tsx`
- Modify: `apps/web/tests/design/module-readiness.test.ts`

- [ ] **Step 1: Replace principal nav list**

Principal nav must contain only:

- `dashboard`
- `executive-analytics`
- `alerts-risks`
- `approvals`
- `users-staff`
- `reports`
- `ai-insights`
- `audit-logs`
- `settings`

- [ ] **Step 2: Add section labels**

Add labels for the new sections to `schoolSectionLabels`.

- [ ] **Step 3: Map executive sections**

In `module-access-map.ts`, map:

- `executive-analytics` -> `principal_dashboard`
- `alerts-risks` -> `principal_dashboard`
- `approvals` -> `admin_command_centers`
- `users-staff` -> `staff`
- `audit-logs` -> `admin_command_centers`
- `ai-insights` -> `ai_insights`

- [ ] **Step 4: Avoid disabled module flash**

In `SchoolPages`, while module access is still unknown, render shell plus a `Verifying command access` panel instead of broad fallback nav for tenant-bound users.

- [ ] **Step 5: Route executive sections**

Use the existing principal dashboard payload for executive analytics, risks, reports, and live channels. Add compact pages for approvals, users/staff, audit logs, and settings using shared command primitives and enabled module filters.

- [ ] **Step 6: Verify**

Run:

```powershell
npm --prefix apps/web run test:design -- module-readiness experience-shells
```

Expected: principal nav is executive-only and disabled module sections remain invisible.

### Task 6: Redesign Principal Executive Command Center

**Files:**

- Create: `apps/web/src/components/school/principal-command-center.tsx`
- Modify: `apps/web/src/components/school/school-pages.tsx`
- Modify: `apps/web/tests/design/principal-command-center.test.tsx`

- [ ] **Step 1: Extract principal dashboard UI**

Move the existing `PrincipalExecutiveDashboardPage` UI from `school-pages.tsx` into `principal-command-center.tsx`.

- [ ] **Step 2: Build executive layout**

The page must include:

- Header zone with live school status and generated timestamp.
- Insight zone with school health, fee collection, attendance, discipline, clinic, inventory, transport, staff, visitor, and exam signals only when modules are enabled.
- Operational cards for risk categories.
- Approval queue filtered by enabled module.
- Activity/audit timeline.
- AI insight panel when `ai_insights` is enabled.
- Realtime stream panel using current channels.

- [ ] **Step 3: Add CSS-native charts**

Use `MiniSparkline`, `ProgressRing`, and `RiskHeatmap`. Do not add a chart dependency in this fast pass.

- [ ] **Step 4: Keep operational modules out**

Do not link principal cards to operational module workspaces unless the link is an executive report, approval, risk, or audit view.

- [ ] **Step 5: Verify principal page**

Run:

```powershell
npm --prefix apps/web run test:design -- principal-command-center module-readiness
```

Expected: pass.

### Task 7: Add Missing Role Experiences Fast

**Files:**

- Modify: `apps/web/src/lib/experiences/types.ts`
- Modify: `apps/web/src/lib/experiences/school-data.ts`
- Modify: `apps/web/src/lib/auth/school-role-normalization.ts`
- Modify: `apps/web/src/app/school/[role]/page.tsx`
- Modify: `apps/web/src/app/school/[role]/[section]/page.tsx`
- Modify: `apps/web/tests/design/role-routing.test.ts`
- Modify: `apps/web/tests/design/module-readiness.test.ts`

- [ ] **Step 1: Add requested roles**

Add role keys for:

- `hod`
- `class-teacher`
- `nurse`
- `transport-manager`
- `hr-officer`
- `procurement-officer`
- `boarding-master`
- `security-officer`
- `lab-technician`
- `student`

- [ ] **Step 2: Map roles to dashboard source roles**

Fast path mapping:

- HOD -> teacher dashboard role plus academics/exams/reports.
- Class teacher -> teacher dashboard role plus students/discipline/communication.
- Nurse -> admin dashboard role limited to clinic.
- Transport manager -> admin dashboard role limited to transport.
- HR officer -> admin dashboard role limited to staff/teacher attendance.
- Procurement officer -> admin dashboard role limited to procurement/inventory.
- Boarding master -> admin dashboard role limited to hostel/boarding/discipline.
- Security officer -> admin dashboard role limited to visitors/security alerts.
- Lab technician -> teacher dashboard role limited to labs.
- Student -> portal-style student dashboard.

- [ ] **Step 3: Add nav policies**

Each role must receive only assigned modules. For roles tied to a module, the nav must disappear if that module is disabled.

- [ ] **Step 4: Add dashboard summaries**

Use shared `SchoolDashboardHome`, `LeadershipCommandCenterPage`, and module screens to create role-specific dashboard summaries without building ten bespoke pages.

- [ ] **Step 5: Verify**

Run:

```powershell
npm --prefix apps/web run test:design -- role-routing module-readiness experience-shells
```

Expected: all new roles route without exposing unauthorized modules.

### Task 8: Redesign School Login

**Files:**

- Modify: `apps/web/src/components/auth/auth-shell.tsx`
- Modify: `apps/web/src/components/auth/auth-card.tsx`
- Modify: `apps/web/src/components/auth/auth-field.tsx`
- Modify: `apps/web/src/components/auth/auth-password-field.tsx`
- Modify: `apps/web/src/components/auth/auth-checkbox.tsx`
- Modify: `apps/web/src/components/auth/auth-message.tsx`
- Modify: `apps/web/src/components/auth/auth-submit-button.tsx`
- Modify: `apps/web/src/components/auth/auth-security.tsx`
- Modify: `apps/web/src/components/auth/school-login-view.tsx`
- Modify: `apps/web/tests/design/auth.test.tsx`

- [ ] **Step 1: Remove light default**

Make auth pages dark by default. Remove or restyle the light/dark toggle so school login does not start as a white form.

- [ ] **Step 2: School login hero copy**

Use the message:

```text
Run your school with operational clarity.
```

Supporting proof lines:

- Visibility across departments
- Every payment accountable
- Every incident traceable
- Every student monitored responsibly

- [ ] **Step 3: Add live dashboard graphics**

Use CSS-native floating metric widgets, sync badges, audit cards, and command grid background. Keep all form controls code-native.

- [ ] **Step 4: Make login card glass**

The form card must be a dark glass panel with orange focus glow and secure session badges.

- [ ] **Step 5: Verify**

Run:

```powershell
npm --prefix apps/web run test:design -- auth
```

Expected: pass with updated dark UI expectations.

### Task 9: Redesign Parent Login and Parent Portal

**Files:**

- Modify: `apps/web/src/components/auth/portal-login-view.tsx`
- Modify: `apps/web/src/components/portal/portal-shell.tsx`
- Modify: `apps/web/src/components/portal/portal-pages.tsx`
- Modify: `apps/web/src/lib/experiences/portal-data.ts`
- Modify: `apps/web/tests/design/experience-shells.test.tsx`

- [ ] **Step 1: Parent login atmosphere**

Use dark blue gradients, warm orange highlights, child progress widgets, attendance summary, secure communication indicators, and family-safe copy.

- [ ] **Step 2: Parent portal module gating**

Hide portal sections based on enabled modules:

- fees -> `finance`
- academics -> `academics` or `exams`
- discipline -> `discipline`
- health -> `clinic_health`
- transport -> `transport`
- messages -> `communication_sms`
- downloads/reports -> `reports`

- [ ] **Step 3: Parent dashboard content**

Add:

- child progress timeline
- attendance snapshot
- fee summary
- clinic report card when clinic is enabled
- teacher communication feed when communication is enabled
- transport status when transport is enabled

- [ ] **Step 4: Student dashboard content**

Add:

- assignments
- timetable
- results
- attendance summary when enabled
- eLearning/LMS when enabled
- CBT exams when enabled
- notices

- [ ] **Step 5: Verify**

Run:

```powershell
npm --prefix apps/web run test:design -- experience-shells portal
```

Expected: portal is dark/premium and parent/student sections do not expose disabled modules.

### Task 10: Upgrade Shared Module Screens

**Files:**

- Modify: `apps/web/src/components/modules/shared/module-shell.tsx`
- Modify: `apps/web/src/components/modules/shared/ops-table.tsx`
- Modify: `apps/web/src/components/modules/shared/workflow-card.tsx`
- Modify: `apps/web/src/components/modules/shared/stat-strip.tsx`
- Modify: `apps/web/src/components/modules/shared/form-section.tsx`
- Modify: `apps/web/src/components/modules/shared/implementation100-live-module.tsx`
- Modify: `apps/web/src/components/modules/exams/exams-module-screen.tsx`
- Modify: `apps/web/src/components/modules/procurement/procurement-module-screen.tsx`
- Modify: `apps/web/src/components/modules/inventory/inventory-module-screen.tsx`
- Modify: `apps/web/src/components/modules/admissions/admissions-module-screen.tsx`

- [ ] **Step 1: Convert module shell**

Module screens must have header zone, insight zone, operational cards, tables/activity, and side intelligence panel where useful.

- [ ] **Step 2: Convert OpsTable**

OpsTable must render dark filters, dark sticky table headers, dark mobile cards, and orange focus states.

- [ ] **Step 3: Convert workflow cards**

Workflow cards must show request -> review -> approval -> release -> audit -> notification stages where relevant.

- [ ] **Step 4: Convert high-white modules**

Remove direct `bg-white` usage from exams, procurement, live module wrapper, inventory, and admissions module surfaces unless it is inside print-only content.

- [ ] **Step 5: Verify**

Run:

```powershell
npm --prefix apps/web run test:design -- exams-workspace procurement-module inventory-workflow admissions-workspace
```

Expected: module tests pass with dark design updates.

### Task 11: Add Workflow Approval Catalog

**Files:**

- Create: `apps/web/src/lib/workflows/workflow-catalog.ts`
- Create: `apps/web/src/components/workflows/approval-command-panel.tsx`
- Modify: `apps/web/src/components/school/principal-command-center.tsx`
- Modify: `apps/web/src/components/school/school-pages.tsx`
- Create: `apps/web/tests/design/workflow-approval-catalog.test.tsx`

- [ ] **Step 1: Create workflow catalog**

Create catalog entries:

- exam release approvals -> `exams`
- procurement approvals -> `procurement`
- leave approvals -> `staff`
- inventory write-offs -> `inventory`
- disciplinary approvals -> `discipline`
- medicine disposal approvals -> `clinic_health`
- budget approvals -> `finance`

- [ ] **Step 2: Filter by role and enabled module**

Expose helper:

```ts
export function getVisibleApprovalWorkflows(input: {
  role: string;
  enabledModuleCodes: ReadonlySet<string> | string[] | null | undefined;
}) {
  return approvalWorkflowCatalog.filter(
    (workflow) =>
      workflow.roles.includes(input.role) &&
      isModuleCodeEnabled(workflow.moduleCode, input.enabledModuleCodes),
  );
}
```

- [ ] **Step 3: Render approval panel**

Use the approval panel in principal, deputy principal, HOD, bursar, procurement, inventory, clinic, and HR role dashboards where applicable.

- [ ] **Step 4: Verify**

Run:

```powershell
npm --prefix apps/web run test:design -- workflow-approval-catalog
```

Expected: disabled module approvals are invisible.

### Task 12: Add AI Insight Filtering and Explainability UI

**Files:**

- Modify: `apps/web/src/components/modules/ai-insights/ai-insights-module-screen.tsx`
- Modify: `apps/web/src/components/school/principal-command-center.tsx`
- Modify: `apps/web/src/lib/module-access/module-access-map.ts`
- Create: `apps/web/tests/design/ai-insights-module-access.test.tsx`

- [ ] **Step 1: Hide AI when disabled**

If `ai_insights` is disabled, no AI nav, AI cards, AI alerts, or AI reports should render.

- [ ] **Step 2: Filter insight categories**

AI cards must reference only enabled modules:

- declining performance -> `academics` or `exams`
- absenteeism trends -> attendance-related enabled modules
- fee default prediction -> `finance`
- inventory anomalies -> `inventory`
- illness outbreaks -> `clinic_health`
- transport delays -> `transport`
- repeated discipline patterns -> `discipline`

- [ ] **Step 3: Add explainability fields**

Each AI card must show timestamp, source module, confidence, reason summary, and audit status.

- [ ] **Step 4: Verify**

Run:

```powershell
npm --prefix apps/web run test:design -- ai-insights-module-access
```

Expected: pass.

### Task 13: Upgrade Tables, Forms, and Print Exceptions

**Files:**

- Modify: `apps/web/src/components/ui/data-table.tsx`
- Modify: `apps/web/src/components/modules/shared/ops-table.tsx`
- Modify: `apps/web/src/components/dashboard/erp-pages.tsx`
- Modify: `apps/web/src/components/library/library-workspace.tsx`
- Modify: `apps/web/src/components/modules/procurement/procurement-module-screen.tsx`
- Modify: `apps/web/src/components/modules/exams/exams-module-screen.tsx`

- [ ] **Step 1: Dark tables**

No user-facing table may use plain white backgrounds.

- [ ] **Step 2: Dark forms**

Inputs, selects, textareas, and form sections must use dark backgrounds, steel borders, orange focus glow, and readable placeholder text.

- [ ] **Step 3: Preserve print content**

Print sheets may keep white paper styling inside explicit print previews only. Wrap those with a class such as `print-paper-preview` so design tests can distinguish them from app chrome.

- [ ] **Step 4: Add grep-based guard**

Add a design test that scans app chrome files for forbidden `bg-white` occurrences while allowing marketing pages, OpenGraph image, and `print-paper-preview`.

- [ ] **Step 5: Verify**

Run:

```powershell
npm --prefix apps/web run test:design -- implementation200-theme
```

Expected: pass.

### Task 14: Browser Verification Pass

**Files:**

- Modify only files required by fixes found during browser QA.

- [ ] **Step 1: Start web dev server**

Run:

```powershell
npm --prefix apps/web run dev -- --port 3005
```

- [ ] **Step 2: Verify desktop routes**

Use Browser/IAB first, then Playwright only if Browser is unavailable:

- `/school/principal`
- `/school/deputy-principal`
- `/school/bursar`
- `/school/teacher`
- `/school/secretary`
- `/school/login`
- `/portal/login`
- `/portal/parent`

- [ ] **Step 3: Verify mobile routes**

Check 390px wide viewport for:

- principal command center
- school login
- parent login
- parent dashboard
- one data-heavy module table

- [ ] **Step 4: Check visual criteria**

Record:

- no pure white app background
- sidebar dark glass
- topbar live status
- orange active indicators
- dark table rendering
- parent portal emotional trust
- principal dashboard executive-only
- disabled module invisibility
- mobile no overlap

- [ ] **Step 5: Run full focused verification**

Run:

```powershell
npm --prefix apps/web run lint
npm --prefix apps/web run test:design
npm --prefix apps/web run test:design:e2e:list
```

Run Playwright smoke if the dev server is stable:

```powershell
npm --prefix apps/web run test:design:e2e -- dashboard.spec.ts
```

Expected: focused tests pass or failures are documented with exact blockers.

## Acceptance Criteria

- No core school dashboard or portal page uses a pure white app background.
- Shared `Card`, `Button`, `DataTable`, `PageHeader`, `Modal`, `Tabs`, and form controls match the dark command-center system.
- Sidebar and topbar feel like a school control center with live status, search, notifications, profile, and emergency/status affordances.
- Principal dashboard is executive-only and does not expose operational module navigation.
- Disabled modules are invisible in nav, dashboards, workflows, approvals, alerts, notifications, reports, and AI insights.
- Parent portal is dark, premium, child-focused, emotionally reassuring, and module-aware.
- Login pages are dark, elite, branded, and operational, not generic SaaS forms.
- Tables are dark, dense, sticky-headed, hoverable, and readable on mobile.
- Role dashboards show only assigned modules and assigned workflows.
- AI insight cards are explainable, timestamped, auditable, and module-filtered.
- Mobile layouts do not overflow or overlap.
- Design, routing, module-readiness, and shell tests pass.

## Execution Order

1. Task 1: tests first.
2. Task 2: global tokens and primitives.
3. Task 4: shell-wide visual lift.
4. Task 5: principal executive-only navigation.
5. Task 6: principal command center.
6. Task 8: school login.
7. Task 9: parent login and portal.
8. Task 10: shared module screens.
9. Task 11: workflow approvals.
10. Task 12: AI insight filtering.
11. Task 7: missing roles, if the deadline allows after principal/parent/shell are stable.
12. Task 13: white-surface cleanup.
13. Task 14: browser verification and final fixes.

## Notes for Speed

- The fastest credible release is Tasks 1, 2, 4, 5, 6, 8, 9, 10, and 14. This changes the emotional quality of the product quickly because it hits shared surfaces and primary journeys first.
- Missing roles in Task 7 can be implemented through role mapping and nav policy first, then deep role-specific workflows later.
- Backend changes should be avoided in this redesign pass unless tests prove disabled modules can leak through API-provided data.
- Keep module screens working with their existing data. The redesign is primarily a shell, primitive, and composition upgrade.
