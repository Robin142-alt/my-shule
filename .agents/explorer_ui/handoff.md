# Handoff Report — UI Completeness & Workflow Audit

This report summarizes findings and outlines remaining tasks for repairing the MyShule user interface and routing alignment.

## 1. Observation

1. **Hardcoded UI Data**:
   - `apps/web/src/components/school/nurse-command-center.tsx`:
     ```tsx
     105:             <p className="text-2xl font-black text-[#071D49] mt-1">12</p>
     109:             <p className="text-2xl font-black text-rose-700 mt-1">2</p>
     113:             <p className="text-2xl font-black text-emerald-700 mt-1">10</p>
     ```
     No query hooks are called to render statistics or rows dynamically.
2. **Decorative Action Controls**:
   - `apps/web/src/components/modules/exams-manager/workspaces/exam-calendar-workspace.tsx` (Lines 20-23): Buttons like `<Button variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Sync Academic Calendar</Button>` have no action handlers.
3. **Mocked Form Actions**:
   - `apps/web/src/components/school/principal-dashboard/exams-reports-workspace.tsx` (Lines 38-46): The `requestDashboardApi` call for creating an exam cycle is commented out.
4. **Proxy Route Mismatches**:
   - `apps/web/src/app/api/student/[...path]/route.ts` (Line 12):
     ```typescript
     return proxySchoolApiRequest(request, context, "/dashboard/student");
     ```
     While `student-portal.controller.ts` is `@Controller('student')`.
   - `apps/web/src/app/api/parent/[...path]/route.ts` (Line 12):
     ```typescript
     return proxySchoolApiRequest(request, context, "/dashboard/parent");
     ```
     While `parent-portal.controller.ts` is `@Controller('parent')`.
   - `apps/web/src/app/api/academics/[...path]/route.ts` (Line 12):
     ```typescript
     return proxySchoolApiRequest(request, context, "/academics");
     ```
     While `academic.controller.ts` is `@Controller('academic')`.
5. **Use of Prompt Inputs**:
   - `damaged-missing-workspace.tsx` (Line 60):
     ```typescript
     const itemName = prompt("Item name?");
     ```
6. **Fake Download/Print Operations**:
   - `apps/web/src/components/school/admin/reports-workspace.tsx` (Lines 24-27): Report generation triggers a local toast notification instead of downloading files.
   - `apps/web/src/lib/dashboard/export.ts` (Lines 166-168): Clicking "Download PDF" calls `window.print()`.

## 2. Logic Chain

1. Since `apps/web/src/app/api/student/[...path]/route.ts` maps requests to `/dashboard/student`, and NestJS only defines `@Controller('student')`, all student portal endpoints fetched via `/api/student/*` result in HTTP 404 errors.
2. Since `prompt(...)` blocks the main thread and offers no HTML form validation, workspaces utilizing `prompt()` are prone to malformed payloads, lack rate-limiting/double-submit safeguards, and offer a poor user experience.
3. Commenting out backend calls (like in `exams-reports-workspace.tsx` for creating exam series) results in "fake success" messages where the UI closes successfully, but no state is persisted.

## 3. Caveats

- **Scope**: The audit was conducted purely via static code analysis. No live execution or API integration verification was performed.
- **Assumptions**: We assume the NestJS `@Controller` route annotations are correct and represent the intended API endpoints.

## 4. Conclusion

The MyShule workspace layout and user flows are non-compliant with the AGENTS.md Constitution across several metrics:
1. **Broken Portals**: Mismatched Next.js API proxy configurations break the Student, Parent, and Academics portals.
2. **Mock Workflows**: Key forms (Clinic Visits, Exam Creation, and Report Generation) are either hardcoded or mock-submitting.
3. **UX Shortcuts**: Native prompt dialogs bypass Section 13 form validation rules.
4. **Fake Exports**: Print/PDF downloads are simulated via `window.print()` or toasts.

## 5. Verification Method

To independently verify these findings:
1. **Route Check**: Run a typecheck on NestJS controllers and compare active paths against proxy routes.
2. **Static Inspection**: Use `view_file` to verify the commented-out lines in `principal-dashboard/exams-reports-workspace.tsx` and the `prompt()` usages in `storekeeper/damaged-missing-workspace.tsx`.
3. **Execution check**: Run `npm run typecheck` to confirm frontend compilation.
