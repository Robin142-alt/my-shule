# Exams Parent Academic Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Additive MyShule exams/report-card/parent academic portal refinement without creating a student exam dashboard or changing unrelated operational roles.

**Architecture:** Reuse the existing school role navigation, exams module, CBC-first report-card selector, portal shell, parent command center, and data-table components. The change is scoped to role visibility, parent-safe published academic data, and existing exam button validity states.

**Tech Stack:** Next.js React components, TypeScript, Jest/React Testing Library design tests, Tailwind utility classes, existing MyShule UI primitives.

---

### Task 1: Write Coverage For Scope Boundaries

**Files:**
- Modify: `apps/web/tests/design/role-dashboard-structure.test.tsx`
- Create: `apps/web/tests/design/academic-parent-portal-upgrade.test.tsx`
- Modify: `apps/web/tests/design/exams-workspace.test.tsx`

- [ ] **Step 1: Add role-navigation tests**

Add assertions that the academic chain roles have an `exams` sidebar item, operational roles do not gain it, and the `student` school role does not expose an exam/results workspace.

- [ ] **Step 2: Add parent portal tests**

Render `PortalPages viewer="parent" section="academics"` and assert the parent sees published report cards, published results, report labels, targets, comments, a multiple-child selector, and an acknowledgement action. Assert unpublished/draft/moderation text is absent.

- [ ] **Step 3: Add student portal non-enhancement test**

Render `PortalPages viewer="student"` and assert the student dashboard no longer exposes a `View Results` quick action or a parent-style report-card acknowledgement workflow.

- [ ] **Step 4: Add exams UX tests**

Render `ExamsModuleScreen role="principal"` and assert the principal does not see top-level marks-entry buttons unless an assigned-teacher context exists. Render `ExamsModuleScreen role="teacher"` and assert invalid/missing marks disable `Submit to HOD`.

- [ ] **Step 5: Run red tests**

Run: `npm run test:design -- academic-parent-portal-upgrade.test.tsx exams-workspace.test.tsx role-dashboard-structure.test.tsx`

Expected: FAIL before production changes because the current code is missing the new behavior.

### Task 2: Fix Role Navigation Additively

**Files:**
- Modify: `apps/web/src/lib/experiences/school-data.ts`

- [ ] **Step 1: Add missing exams nav for academic chain roles**

Add the existing `exams` route to `principal` and `grade-master`, preserving existing sidebars and labels.

- [ ] **Step 2: Remove student school-role exam/results exposure**

Remove only the `student` school role’s `exams` nav item. Keep the existing student role and its non-exam school-life items.

- [ ] **Step 3: Re-run role-navigation tests**

Run: `npm run test:design -- role-dashboard-structure.test.tsx`

Expected: PASS for new scope assertions.

### Task 3: Parent-Safe Academic Portal Data And UI

**Files:**
- Modify: `apps/web/src/lib/experiences/portal-data.ts`
- Modify: `apps/web/src/components/portal/portal-pages.tsx`

- [ ] **Step 1: Add published-only parent academic records**

Add typed published report-card rows, published result rows, child records, targets, and comments in `portal-data.ts`. Include CBC/CBE, Hybrid CBC, and Legacy 8-4-4/KCSE labels. Do not add unpublished records to the parent-facing arrays.

- [ ] **Step 2: Render parent academic sections**

Update `PortalAcademicsPage` to accept `viewer`. For parent viewers, render child switcher, published report cards, published results, academic targets, teacher/class/principal comments, and acknowledgement controls.

- [ ] **Step 3: Keep student portal unenhanced for this flow**

For student viewers, show a simple learning resources page and no report-card/results/acknowledgement workflow.

- [ ] **Step 4: Wire acknowledgement truthfully**

Use local state to mark an existing published report as acknowledged and show a visible status message. Do not claim sending or backend completion.

- [ ] **Step 5: Re-run parent portal tests**

Run: `npm run test:design -- academic-parent-portal-upgrade.test.tsx`

Expected: PASS.

### Task 4: Existing Exams Button Validity

**Files:**
- Modify: `apps/web/src/components/modules/exams/exams-module-screen.tsx`

- [ ] **Step 1: Hide top-level mark-entry actions when not assigned**

Add a role/assignment guard to `PageIntro` so principal/admin roles do not see `Continue marks entry` or `Import spreadsheet` unless the user has an assigned open mark sheet. Keep generate/report operations visible.

- [ ] **Step 2: Block invalid marks submission**

Compute missing, invalid, and outlier marks in `MarksEntryGrid`. Disable `Submit to HOD` and show a clear validation message until the marksheet is valid.

- [ ] **Step 3: Re-run exams tests**

Run: `npm run test:design -- exams-workspace.test.tsx`

Expected: PASS.

### Task 5: Final Verification

**Files:**
- No additional code changes expected.

- [ ] **Step 1: Run combined design tests**

Run: `npm run test:design -- academic-parent-portal-upgrade.test.tsx exams-workspace.test.tsx report-card-curriculum.test.tsx role-dashboard-structure.test.tsx frontend-operationalization.test.tsx discipline-human-workflows.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: PASS or report exact remaining repository lint failures if unrelated pre-existing issues block completion.

- [ ] **Step 3: Final report**

Report changed files, mapped role/workspace behavior, tests run, known limitations, and end with `BAAS`.
