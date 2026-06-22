# MyShule UI Completeness and Workflow Audit Report

This report documents UI completeness gaps, workflow inconsistencies, route mismatches, validation weaknesses, offline sync omissions, and printing issues discovered during the static audit of the MyShule Next.js frontend (`apps/web/src`) and NestJS backend (`apps/api/src`).

---

## 1. Executive Summary

An audit of the MyShule codebase was conducted to identify compliance gaps with the **MyShule AGENTS.md Operating Constitution** rules (specifically Sections 10, 11, 12, 13, 21, and 22). The investigation uncovered critical routing mismatches that completely break the Learner and Parent portals, extensive use of browser-native `prompt()` dialogs instead of secure web forms, hardcoded statistics and tables in core dashboards, and mocked report generation/printing actions that do not persist or communicate with the backend.

---

## 2. Incomplete Workflows and Placeholders

### 2.1 Hardcoded Dashboard Data (Nurse Command Center)
* **File Path**: `apps/web/src/components/school/nurse-command-center.tsx`
* **Observation**:
  ```tsx
  105:             <p className="text-2xl font-black text-[#071D49] mt-1">12</p>
  ...
  109:             <p className="text-2xl font-black text-rose-700 mt-1">2</p>
  ...
  113:             <p className="text-2xl font-black text-emerald-700 mt-1">10</p>
  ...
  129:               <tr className="hover:bg-[#F8FAFC]">
  130:                 <td className="px-4 py-3 text-[#64748B]">09:15 AM</td>
  131:                 <td className="px-4 py-3 font-semibold text-[#071D49]">Brian Otieno</td>
  132:                 <td className="px-4 py-3 text-[#64748B]">Headache</td>
  133:                 <td className="px-4 py-3 text-[#64748B]">Painkillers, Rest</td>
  134:                 <td className="px-4 py-3 font-medium text-emerald-600">Returned to class</td>
  135:               </tr>
  ```
* **Gaps**: Statistics and student visit records are fully hardcoded. Even though the file imports `useSchoolQuery`, it is never invoked to fetch active clinic data from the database.
* **AGENTS.md Compliance**: Violates **Section 2.1 (Never Do These)**: *"Use demo data as real production data"* and **Section 11 (Dashboard, Sidebar, and Workspace Rules)**: *"A workspace must never be: a table with no actions... repeated generic content... static explanation only."*

### 2.2 Dead Actions & Buttons (Exam Setup)
* **File Path**: `apps/web/src/components/modules/exams-manager/workspaces/exam-calendar-workspace.tsx`
* **Observation**:
  ```tsx
  20:           <Button variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Sync Academic Calendar</Button>
  21:           <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> Print</Button>
  22:           <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
  23:           <Button><Plus className="mr-2 h-4 w-4" /> Add Event</Button>
  ```
* **Gaps**: Crucial workflow buttons like "Sync Academic Calendar", "Print", "Export", and "Add Event" are purely visual and lack `onClick` handlers.
* **AGENTS.md Compliance**: Violates **Section 12 (Button and Action Rules)**: *"Buttons must never be decorative. Every button must have: click handler."*

### 2.3 Fake Form Success State (Principal Exams Reports)
* **File Path**: `apps/web/src/components/school/principal-dashboard/exams-reports-workspace.tsx`
* **Observation**:
  ```tsx
  31:   const handleCreateExam = async (e: React.FormEvent<HTMLFormElement>) => {
  32:     e.preventDefault();
  33:     setIsSubmitting(true);
  34:     setFormError("");
  35:     const formData = new FormData(e.currentTarget);
  36:     
  37:     try {
  38:       // await requestDashboardApi('/admin-command/exams/cycles', {
  39:       //   method: "POST",
  40:       //   body: {
  41:       //     name: formData.get("name"),
  42:       //     academicYearId: formData.get("academicYearId"),
  43:       //     termId: formData.get("termId"),
  44:       //     examType: formData.get("examType"),
  45:       //   }
  46:       // });
  47:       setIsExamModalOpen(false);
  48:       refetch();
  ```
* **Gaps**: Creating a new exam series has its backend API request commented out. Submitting the form closes the modal and pretends it succeeded without posting anything to the backend.
* **AGENTS.md Compliance**: Violates **Section 2.1 (Never Do These)**: *"Fake success messages when no real action happened"* and **Section 13 (Form and Import Rules)**.

### 2.4 Empty Placeholders & Scaffolded Templates (Discipline Master & Learner Portal)
* **File Paths**:
  - `apps/web/src/components/school/principal-dashboard/exams-reports-workspace.tsx` (Line 146: `{/* Report tasks will go here */}`)
  - `apps/web/src/components/school/student-command-center.tsx` (Lines 121-125: Static card placeholder for recent activity and grades).
  - `apps/web/src/components/school/discipline-master/actions-interventions-workspace.tsx` (and other workspaces in `discipline-master/`): These files are identical ~2.5KB copy-pasted scaffolds with dead "Export" and "New Record" buttons and point to unmapped endpoints.
* **Gaps**: Important interface areas are left as empty comment placeholders or static descriptions.
* **AGENTS.md Compliance**: Violates **Section 11 (Dashboard, Sidebar, and Workspace Rules)**: *"A workspace must never be: a blank page, coming soon, static explanation only."*

---

## 3. Route Prefix Mismatch Patterns

There are severe routing mismatches between the React client requests, Next.js proxy route mappings, and NestJS controllers:

| Client Request Path | Next.js Proxy File Route | Upstream Proxied URL | NestJS Backend Controller Route | Status |
|---|---|---|---|---|
| `/api/student/dashboard` | `api/student/[...path]/route.ts` | `/dashboard/student/dashboard` | `@Controller('student')` (`student-portal.controller.ts`) | **404 Broken** |
| `/api/parent/dashboard` | `api/parent/[...path]/route.ts` | `/dashboard/parent/dashboard` | `@Controller('parent')` (`parent-portal.controller.ts`) | **404 Broken** |
| `/api/academics/communications` | `api/academics/[...path]/route.ts` | `/academics/communications` | `@Controller('academic')` (`academic.controller.ts`) | **404 Broken** |
| `/api/admin-command/frontoffice/visitors` (POST) | `api/admin-command/[...path]/route.ts` | `/admin-command/frontoffice/visitors` | `@Post('frontoffice/visitor')` (`admin-command.controller.ts`) | **404 Broken** |
| `/api/admin-command/frontoffice/appointments` (POST) | `api/admin-command/[...path]/route.ts` | `/admin-command/frontoffice/appointments` | `@Post('frontoffice/appointment')` (`admin-command.controller.ts`) | **404 Broken** |
| `/api/admin-command/frontoffice/mail` (POST) | `api/admin-command/[...path]/route.ts` | `/admin-command/frontoffice/mail` | `@Post('frontoffice/dispatch')` (`admin-command.controller.ts`) | **404 Broken** |

### Key Observations:
1. **Student & Parent Portals**: The proxies under `api/student` and `api/parent` insert an extra `/dashboard` prefix (mapping to `/dashboard/student` and `/dashboard/parent` upstream), whereas the backend controllers expect a clean `/student/...` and `/parent/...` route.
2. **Academics Route Pluralization Mismatch**: The Next.js API route proxies to `/academics` (plural) but the backend controller is mapped to `/academic` (singular), breaking endpoints like `/academic/communications`.
3. **Secretary Command Pluralization & Action Mismatch**: The frontend calls plural endpoints (`frontoffice/visitors` and `frontoffice/appointments`) for POST requests, but the NestJS controller defines singular routes (`frontoffice/visitor` and `frontoffice/appointment`). Additionally, the mail dispatch POST endpoint is called as `frontoffice/mail` by the frontend, but the backend maps it to `frontoffice/dispatch`.

---

## 4. Forms Lacking Proper Validation & UX States

### 4.1 Use of Browser `prompt()` Dialogs for Mutations
Instead of using secure form validation and user-friendly dialog states, multiple components collect input via raw browser `prompt(...)` calls:

* **Storekeeper Workspace**:
  - `damaged-missing-workspace.tsx` (Lines 60-66, 80): Collects `itemName`, `type`, `quantity`, `reason`, and write-off approval `notes` using `prompt()`.
  - `items-workspace.tsx` (Lines 60, 62, 74, 76, 90-97): Collects item name, category, unit, cost, supplier, and quantities using `prompt()`.
  - `reports-workspace.tsx` (Lines 54, 62): Prompt for report type and period.
  - `requests-workspace.tsx` (Line 70): Prompt for rejection reason.
  - `stocktake-workspace.tsx` (Lines 51, 53): Prompt for title and scope.
* **Other Workspaces**:
  - `admin/staff-records-workspace.tsx` (Lines 58, 100): Prompt for staff number and override reason.
  - `deputy-principal/timetable-relief-workspace.tsx` (Line 46): Prompt for relief teacher name.
  - `exams-manager/moderation-workspace.tsx` (Line 62): Prompt for rejection reason.
  - `nurse/medicine-inventory-workspace.tsx` (Line 61): Prompt for stock adjustment.
* **AGENTS.md Compliance**: Violates **Section 13 (Form and Import Rules)**: *"Every form must include: Required field validation, Correct input types, Helpful error messages, Submit loading state, Disabled double-submit..."* Raw prompt inputs bypass validation and are highly vulnerable to typing errors and double-submits.

### 4.2 Lack of Custom Validation States
* **File Path**: `apps/web/src/components/school/nurse-command-center.tsx` (Log Clinic Visit Form)
* **Observation**: The form uses simple browser-native HTML5 `required` constraints. There are no client-side error indicators, no checking of input boundaries (e.g. valid student IDs), and no detailed input feedback to prevent incorrect submissions.

---

## 5. Offline Sync Indicator Omissions

### 5.1 Custom Local Topbar Lacks Sync Queue Indicator
* **File Path**: `apps/web/src/components/school/class-teacher-command-center.tsx`
* **Observation**: The Class Teacher workspace implements a custom local `Topbar` component (lines 166-182) that lacks the Wifi/WifiOff sync indicator, pending queue counts, and failed count states that are implemented in the global `Topbar.tsx`.
* **Gaps**: Although Class Teacher actions (like attendance or welfare referrals) use `useOfflineMutation`, there is no top-level indicator showing the teacher how many mutations are currently queued or pending sync.

### 5.2 Fake Success Messages for Offline Mutations
* **File Path**: `apps/web/src/components/school/class-teacher/workspaces/discipline.tsx`
* **Observation**:
  ```tsx
  58:       {reportMutation.isSuccess && <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700 font-bold">Discipline incident reported successfully!</div>}
  ```
* **Gaps**: If the user is offline, the mutation is captured in the offline queue (via `useOfflineMutation`), but the UI immediately shows "Discipline incident reported successfully!" instead of stating that it has been saved for later sync.
* **AGENTS.md Compliance**: Violates **Section 21 (Offline Sync Rules)**: *"Never pretend offline data has reached the server before it syncs."*

---

## 6. Reports and Printing Components (Real vs Fake)

### 6.1 Fake Download Actions (Reports Center)
* **File Path**: `apps/web/src/components/school/admin/reports-workspace.tsx`
* **Observation**:
  ```tsx
  24:   const handleDownload = async (reportId: string) => {
  25:     // In reality, this would fetch a blob and trigger browser download
  26:     toast.info(`Generating report: ${reportId}. The download will begin shortly.`);
  27:   };
  ```
* **Gaps**: Clicking "Generate PDF" or "Export CSV" on any report only renders a toast notification. It does not execute a request to the backend or download any document.
* **AGENTS.md Compliance**: Violates **Section 22 (Report and Print Rules)**: *"Reports and print documents must be previewable and downloadable... Never fake printing."*

### 6.2 Print Dialog Hijack for Download PDF
* **File Path**: `apps/web/src/lib/dashboard/export.ts`
* **Observation**:
  ```typescript
  166:   overlay.querySelector("[data-myshule-download-pdf]")?.addEventListener("click", () => {
  167:     window.print?.();
  168:   });
  ```
* **Gaps**: In the print preview overlay, clicking "Download PDF" simply calls `window.print()` instead of serving a real PDF file.
* **File Path**: `apps/web/src/components/modules/exams/exams-module-screen.tsx`
* **Observation**:
  ```typescript
  1868:   function downloadPdf(report: ReportCardDocumentData) {
  1869:     openPrintPreview(report);
  1870:     setNotice(`${report.learner.fullName}: choose "Save as PDF" in the print dialog.`);
  1871:   }
  ```
* **Gaps**: The report card PDF download function hijacks the print dialog and instructs the user to choose "Save as PDF" manually.
* **AGENTS.md Compliance**: Violates **Section 22 (Report and Print Rules)**: *"Every printable document must support: Preview, Download, Print... Never fake printing."*

---

## 7. Recommended Remediations

1. **Proxy Path Alignment**:
   - Correct `apps/web/src/app/api/student/[...path]/route.ts` to forward to `/student` instead of `/dashboard/student`.
   - Correct `apps/web/src/app/api/parent/[...path]/route.ts` to forward to `/parent` instead of `/dashboard/parent`.
   - Correct `apps/web/src/app/api/academics/[...path]/route.ts` to forward to `/academic` (or update NestJS `AcademicController` to `@Controller('academics')`).
2. **Secretary Command Center Endpoint Correction**:
   - Update `secretary-command-center-full.tsx` to POST to `/api/admin-command/frontoffice/visitor` (singular) and `/api/admin-command/frontoffice/appointment` (singular), and POST mail/parcels to `/api/admin-command/frontoffice/dispatch`.
3. **Form Refactoring**:
   - Replace all `prompt()` calls in the Storekeeper, Admin, and Deputy workspaces with proper React form components or Modals that enforce data types and input validation.
4. **Dynamic Data Integration**:
   - Wire the Nurse Command Center to fetch clinic visit logs from the `/api/clinic/visits` endpoint instead of displaying hardcoded rows.
5. **Offline Sync Feedback**:
   - Integrate the global `Topbar`'s Wifi sync status indicator into the custom local Class Teacher header.
   - Update mutation success states (e.g. in `discipline.tsx` and `welfare.tsx`) to check for the `_offline` metadata flag before displaying success messages.
