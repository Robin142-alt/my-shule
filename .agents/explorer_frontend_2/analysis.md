# Backend API Endpoints Extracted from React Frontend

Extracted from: `C:\Users\user\Desktop\PROJECTS\Shule hub\apps\web\src`

Total unique API integration references found: 891

## Summary Table
| File | Line | Type | Endpoint / Method Call | Method | Parameters | Raw Usage |
| --- | --- | --- | --- | --- | --- | --- |
| `web\src\app\dashboard\page.tsx` | 29 | `fetch` | `${baseUrl}/dashboard/layout?${qs}` | `GET` | Request options: {         headers: {           "Authorization": `Bearer ${token}`,           "x-tenant-id": tenantId,           "Cache-Control": "no-cache",         },         cache: "no-store"       } | `fetch(`${baseUrl}/dashboard/layout?${qs}`, {
        headers: {
  ...)` |
| `web\src\app\support\status\page.tsx` | 158 | `apiString` | `/api/support/public/status-subscriptions` | `POST (Guess)` | Literal string usage | `<form action="/api/support/public/status-subscriptions" method="post" className="mt-4 flex flex-col gap-3">` |
| `web\src\app\support\status\page.tsx` | 191 | `apiString` | `/api/support/public/status-subscriptions/unsubscribe` | `GET` | Literal string usage | `action="/api/support/public/status-subscriptions/unsubscribe"` |
| `web\src\components\auth\mfa-verification-view.tsx` | 103 | `fetch` | `/api/auth/login` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": await getCsrfToken(),         },         credentials: "same-origin",         body: JSON.stringify({           audience: activeChallenge.audience,           identifier: activeChallenge.identifier,           password: activeChallenge.password,           verificationCode: normalizedCode,           tenantSlug: activeChallenge.tenantSlug,         }),       } | `fetch("/api/auth/login", {
        method: "POST",
        headers...)` |
| `web\src\components\auth\portal-login-view.tsx` | 114 | `fetch` | `/api/auth/parent/otp/request` | `POST` | Request options: {             method: "POST",             headers: {               "Content-Type": "application/json",               "x-myshule-csrf": await getCsrfToken(),             },             credentials: "same-origin",             body: JSON.stringify({ identifier: values.identifier.trim() }),           } | `fetch("/api/auth/parent/otp/request", {
            method: "POST"...)` |
| `web\src\components\auth\portal-login-view.tsx` | 136 | `fetch` | `/api/auth/parent/otp/verify` | `POST` | Request options: {           method: "POST",           headers: {             "Content-Type": "application/json",             "x-myshule-csrf": await getCsrfToken(),           },           credentials: "same-origin",           body: JSON.stringify({             challenge_id: challengeId,             otp_code: values.secret.trim(),           }),         } | `fetch("/api/auth/parent/otp/verify", {
          method: "POST",
 ...)` |
| `web\src\components\common\notifications\notification-drawer.tsx` | 38 | `fetch` | `/api/v1/notifications?status=${statusQuery}` | `GET` | Request options: {         headers: { Authorization: `Bearer ${token}` },       } | `fetch(`/api/v1/notifications?status=${statusQuery}`, {
        hea...)` |
| `web\src\components\common\notifications\notification-drawer.tsx` | 60 | `fetch` | `/api/v1/notifications/${id}/read` | `PATCH` | Request options: {         method: "PATCH",         headers: { Authorization: `Bearer ${token}` },       } | `fetch(`/api/v1/notifications/${id}/read`, {
        method: "PATCH...)` |
| `web\src\components\common\notifications\notification-drawer.tsx` | 74 | `fetch` | `/api/v1/notifications/read-all` | `PATCH` | Request options: {         method: "PATCH",         headers: { Authorization: `Bearer ${token}` },       } | `fetch(`/api/v1/notifications/read-all`, {
        method: "PATCH",...)` |
| `web\src\components\dashboard\dashboard-engine.tsx` | 32 | `useSchoolQuery` | `/dashboard/layout?role=${role}` | `GET` | Query / Path variables from context | `useSchoolQuery(`/dashboard/layout?role=${role}`)` |
| `web\src\components\layouts\school-shell.tsx` | 90 | `fetch` | `/api/v1/notifications/badges` | `GET` | Request options: {           headers: { Authorization: `Bearer ${token}` },         } | `fetch("/api/v1/notifications/badges", {
          headers: { Autho...)` |
| `web\src\components\library\library-workspace.tsx` | 209 | `apiString` | `/api/library/scan-issue` | `POST (Guess)` | Literal string usage | `const result = await postScannerAction("/api/library/scan-issue", {` |
| `web\src\components\library\library-workspace.tsx` | 291 | `apiString` | `/api/library/scan-return` | `POST (Guess)` | Literal string usage | `const result = await postScannerAction("/api/library/scan-return", {` |
| `web\src\components\modules\academics\AcademicSetup.tsx` | 21 | `fetch` | `/api/academics/terms${tenantId ? `?tenant_id=${tenantId}` : ""}` | `GET` | None | `fetch(`/api/academics/terms${tenantId ? `?tenant_id=${tenantId}` :...)` |
| `web\src\components\modules\academics\AcademicSetup.tsx` | 30 | `fetch` | `/api/academics/subjects${tenantId ? `?tenant_id=${tenantId}` : ""}` | `GET` | None | `fetch(`/api/academics/subjects${tenantId ? `?tenant_id=${tenantId}...)` |
| `web\src\components\modules\ai-insights\ai-insights-module-screen.tsx` | 14 | `apiString` | `/api/ai-insights` | `GET` | Literal string usage | `apiBase="/api/ai-insights"` |
| `web\src\components\modules\assets\asset-tracking-module-screen.tsx` | 374 | `apiString` | `/api/assets` | `GET` | Literal string usage | `apiBase="/api/assets"` |
| `web\src\components\modules\boarding\boarding-module-screen.tsx` | 14 | `apiString` | `/api/boarding` | `GET` | Literal string usage | `apiBase="/api/boarding"` |
| `web\src\components\modules\cbt\cbt-module-screen.tsx` | 14 | `apiString` | `/api/cbt` | `GET` | Literal string usage | `apiBase="/api/cbt"` |
| `web\src\components\modules\exams-manager\workspaces\approvals-publishing-workspace.tsx` | 13 | `useSchoolQuery` | `/exams/report-cards?status=under_review,approved,published` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/report-cards?status=under_review,approved,published")` |
| `web\src\components\modules\exams-manager\workspaces\audit-logs-workspace.tsx` | 14 | `useSchoolQuery` | `/exams/audit-logs` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/audit-logs")` |
| `web\src\components\modules\exams-manager\workspaces\communication-workspace.tsx` | 13 | `useSchoolQuery` | `/exams/series` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/series")` |
| `web\src\components\modules\exams-manager\workspaces\exam-attendance-workspace.tsx` | 13 | `useSchoolQuery` | `/exams/attendance` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/attendance")` |
| `web\src\components\modules\exams-manager\workspaces\exam-calendar-workspace.tsx` | 10 | `useSchoolQuery` | `/exams/series` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/series")` |
| `web\src\components\modules\exams-manager\workspaces\exam-classes-workspace.tsx` | 13 | `useSchoolQuery` | `/exams/subject-weightings` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/subject-weightings")` |
| `web\src\components\modules\exams-manager\workspaces\exam-settings-workspace.tsx` | 13 | `useSchoolQuery` | `/exams/grading-policies` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/grading-policies")` |
| `web\src\components\modules\exams-manager\workspaces\exam-setup-workspace.tsx` | 25 | `useSchoolMutation` | `/exams/draft` | `POST` | Variables passed to mutate function | `useSchoolMutation("/exams/draft", "POST")` |
| `web\src\components\modules\exams-manager\workspaces\exam-setup-workspace.tsx` | 101 | `useSchoolQuery` | `/exams/assessments` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/assessments")` |
| `web\src\components\modules\exams-manager\workspaces\exam-timetable-workspace.tsx` | 13 | `useSchoolQuery` | `/exams/timetable-slots` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/timetable-slots")` |
| `web\src\components\modules\exams-manager\workspaces\grading-rubrics-workspace.tsx` | 13 | `useSchoolQuery` | `/exams/grading-policies` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/grading-policies")` |
| `web\src\components\modules\exams-manager\workspaces\imports-templates-workspace.tsx` | 13 | `useSchoolQuery` | `/exams/assessments` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/assessments")` |
| `web\src\components\modules\exams-manager\workspaces\invigilation-workspace.tsx` | 13 | `useSchoolQuery` | `/exams/invigilators` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/invigilators")` |
| `web\src\components\modules\exams-manager\workspaces\marks-monitor-workspace.tsx` | 13 | `useSchoolQuery` | `/exams/mark-entry-windows` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/mark-entry-windows")` |
| `web\src\components\modules\exams-manager\workspaces\moderation-workspace.tsx` | 13 | `useSchoolQuery` | `/exams/mark-versions` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/mark-versions")` |
| `web\src\components\modules\exams-manager\workspaces\my-marks-workspace.tsx` | 13 | `useSchoolQuery` | `/exams/marks` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/marks")` |
| `web\src\components\modules\exams-manager\workspaces\overview-workspace.tsx` | 13 | `useSchoolQuery` | `/exams/dashboard-stats` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/dashboard-stats")` |
| `web\src\components\modules\exams-manager\workspaces\overview-workspace.tsx` | 14 | `useSchoolQuery` | `/exams/series` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/series")` |
| `web\src\components\modules\exams-manager\workspaces\papers-components-workspace.tsx` | 13 | `useSchoolQuery` | `/exams/assessment-components` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/assessment-components")` |
| `web\src\components\modules\exams-manager\workspaces\report-cards-workspace.tsx` | 13 | `useSchoolQuery` | `/exams/report-cards` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/report-cards")` |
| `web\src\components\modules\exams-manager\workspaces\reports-workspace.tsx` | 10 | `useSchoolQuery` | `/exams/series` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/series")` |
| `web\src\components\modules\exams-manager\workspaces\results-processing-workspace.tsx` | 13 | `useSchoolQuery` | `/exams/report-card-batches` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/report-card-batches")` |
| `web\src\components\modules\exams-manager\workspaces\student-cases-workspace.tsx` | 13 | `useSchoolQuery` | `/exams/student-cases` | `GET` | Query / Path variables from context | `useSchoolQuery("/exams/student-cases")` |
| `web\src\components\modules\exams\MarksEntryTable.tsx` | 33 | `fetch` | `/api/exams/marks?exam_series_id=${examSeriesId}&subject_id=${subjectId}&class_section_id=${classSectionId}${tenantId ? `&tenant_id=${tenantId}` : ""}` | `GET` | None | `fetch(`/api/exams/marks?exam_series_id=${examSeriesId}&subject_id=...)` |
| `web\src\components\modules\exams\MarksEntryTable.tsx` | 41 | `fetch` | `/api/exams/marks/enter` | `POST` | Request options: {         method: "POST",         headers: { "Content-Type": "application/json" },         body: JSON.stringify({           exam_series_id: examSeriesId,           assessment_id: assessmentId,           academic_term_id: academicTermId,           class_section_id: classSectionId,           subject_id: subjectId,           student_id: studentId,           score,           tenant_id: tenantId,         }),       } | `fetch(`/api/exams/marks/enter`, {
        method: "POST",
        ...)` |
| `web\src\components\modules\exams\ReportCardGenerator.tsx` | 20 | `fetch` | `/api/exams/series/${examSeriesId}/readiness${tenantId ? `?tenant_id=${tenantId}` : ""}` | `GET` | None | `fetch(`/api/exams/series/${examSeriesId}/readiness${tenantId ? `?t...)` |
| `web\src\components\modules\exams\ReportCardGenerator.tsx` | 29 | `fetch` | `/api/exams/series/publish` | `POST` | Request options: {         method: "POST",         headers: { "Content-Type": "application/json" },         body: JSON.stringify({           exam_series_id: examSeriesId,           tenant_id: tenantId,         }),       } | `fetch(`/api/exams/series/publish`, {
        method: "POST",
     ...)` |
| `web\src\components\modules\hostel\hostel-module-screen.tsx` | 14 | `apiString` | `/api/hostel` | `GET` | Literal string usage | `apiBase="/api/hostel"` |
| `web\src\components\modules\iot\iot-module-screen.tsx` | 410 | `fetch` | `/api/iot/dashboard` | `GET` | Request options: {         method: "GET",         credentials: "same-origin",         cache: "no-store",       } | `fetch("/api/iot/dashboard", {
        method: "GET",
        crede...)` |
| `web\src\components\modules\iot\iot-module-screen.tsx` | 440 | `fetch` | `/api/iot${path}` | `GET` | Request options: {       method,       credentials: "same-origin",       headers: {         "Content-Type": "application/json",         ...(csrfToken ? { "x-myshule-csrf": csrfToken } : {}),       },       body: JSON.stringify(body),     } | `fetch(`/api/iot${path}`, {
      method,
      credentials: "same-...)` |
| `web\src\components\modules\lms\lms-module-screen.tsx` | 14 | `apiString` | `/api/lms` | `GET` | Literal string usage | `apiBase="/api/lms"` |
| `web\src\components\modules\procurement\procurement-module-screen.tsx` | 462 | `fetch` | `/api/procurement/dashboard` | `GET` | Request options: {         method: "GET",         credentials: "same-origin",         cache: "no-store",       } | `fetch("/api/procurement/dashboard", {
        method: "GET",
     ...)` |
| `web\src\components\modules\procurement\procurement-module-screen.tsx` | 576 | `fetch` | `/api/procurement${request.path}` | `GET` | Request options: {         method: request.method,         credentials: "same-origin",         headers: {           "Content-Type": "application/json",           ...(csrfToken ? { "x-myshule-csrf": csrfToken } : {}),         },         body: JSON.stringify(request.body),       } | `fetch(`/api/procurement${request.path}`, {
        method: request...)` |
| `web\src\components\modules\shared\implementation100-live-module.tsx` | 140 | `fetch` | `${apiBase}/dashboard` | `GET` | Request options: {         method: "GET",         credentials: "same-origin",         cache: "no-store",       } | `fetch(`${apiBase}/dashboard`, {
        method: "GET",
        cre...)` |
| `web\src\components\modules\shared\implementation100-live-module.tsx` | 181 | `fetch` | `${apiBase}/records` | `POST` | Request options: {         method: "POST",         credentials: "same-origin",         headers: {           "Content-Type": "application/json",           ...(csrfToken ? { "x-myshule-csrf": csrfToken } : {}),         },         body: JSON.stringify({           title: value(formData, "title"),           category: value(formData, "category") || undefined,           owner_name: value(formData, "owner_name") || undefined,           priority: value(formData, "priority") || "normal",           due_date: value(formData, "due_date") || undefined,           metric_count: Number(value(formData, "metric_count") || 0),           notes: value(formData, "notes") || undefined,         }),       } | `fetch(`${apiBase}/records`, {
        method: "POST",
        cred...)` |
| `web\src\components\modules\shared\implementation100-live-module.tsx` | 219 | `fetch` | `${apiBase}/records/${record.id}/status` | `PATCH` | Request options: {         method: "PATCH",         credentials: "same-origin",         headers: {           "Content-Type": "application/json",           ...(csrfToken ? { "x-myshule-csrf": csrfToken } : {}),         },         body: JSON.stringify({ status: "completed" }),       } | `fetch(`${apiBase}/records/${record.id}/status`, {
        method: ...)` |
| `web\src\components\modules\transport\transport-module-screen.tsx` | 630 | `fetch` | `/api/transport/dashboard` | `GET` | Request options: {         method: "GET",         credentials: "same-origin",         cache: "no-store",       } | `fetch("/api/transport/dashboard", {
        method: "GET",
       ...)` |
| `web\src\components\modules\transport\transport-module-screen.tsx` | 660 | `fetch` | `/api/transport${path}` | `GET` | Request options: {       method,       credentials: "same-origin",       headers: {         "Content-Type": "application/json",         ...(csrfToken ? { "x-myshule-csrf": csrfToken } : {}),       },       body: JSON.stringify(body),     } | `fetch(`/api/transport${path}`, {
      method,
      credentials: ...)` |
| `web\src\components\modules\visitors\visitor-management-module-screen.tsx` | 14 | `apiString` | `/api/visitors` | `GET` | Literal string usage | `apiBase="/api/visitors"` |
| `web\src\components\parent\parent-command-center.tsx` | 28 | `useSchoolQuery` | `/api/parent/overview` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/parent/overview")` |
| `web\src\components\parent\parent-command-center.tsx` | 48 | `useSchoolQuery` | `/api/parent/academics` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/parent/academics")` |
| `web\src\components\parent\parent-command-center.tsx` | 68 | `useSchoolQuery` | `/api/parent/finance` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/parent/finance")` |
| `web\src\components\parent\parent-command-center.tsx` | 88 | `useSchoolQuery` | `/api/parent/communication` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/parent/communication")` |
| `web\src\components\platform\superadmin-pages.tsx` | 535 | `fetch` | `/api/auth/logout` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": await getCsrfToken(),         },         credentials: "same-origin",         body: JSON.stringify({ audience: "superadmin" }),       } | `fetch("/api/auth/logout", {
        method: "POST",
        header...)` |
| `web\src\components\platform\workspaces\PlatformSmsSettingsWorkspace.tsx` | 14 | `fetch` | `/api/platform/sms-settings` | `GET` | None | `fetch("/api/platform/sms-settings")` |
| `web\src\components\platform\workspaces\SecurityPoliciesWorkspace.tsx` | 13 | `fetch` | `/api/platform/security-policies` | `GET` | None | `fetch("/api/platform/security-policies")` |
| `web\src\components\portal\parent-command-center.tsx` | 745 | `useSchoolQuery` | `/api/parent/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/parent/dashboard")` |
| `web\src\components\portal\portal-pages.tsx` | 943 | `fetch` | `/api/clinic/parent/students/${encodeURIComponent(studentId.trim())}/history` | `GET` | Request options: {           credentials: "same-origin",           cache: "no-store",         } | `fetch(`/api/clinic/parent/students/${encodeURIComponent(studentId....)` |
| `web\src\components\providers\permission-context.tsx` | 29 | `fetch` | `/api/permissions/me?schoolId=${schoolId}` | `GET` | None | `fetch(`/api/permissions/me?schoolId=${schoolId}`)` |
| `web\src\components\school\academics-workspace-admin.tsx` | 35 | `fetch` | `buildBillingApiPath("/api/academics/summary", tenantSlug)` | `GET` | Request options: {           cache: "no-store",         } | `fetch(buildBillingApiPath("/api/academics/summary", tenantSlug), {...)` |
| `web\src\components\school\accountant\arrears-workspace.tsx` | 31 | `fetch` | `buildBillingApiPath("/api/billing/student-balances", tenantSlug || "demo")` | `GET` | Request options: { cache: "no-store" } | `fetch(
          buildBillingApiPath("/api/billing/student-balance...)` |
| `web\src\components\school\accountant\arrears-workspace.tsx` | 32 | `apiString` | `/api/billing/student-balances` | `GET` | Literal string usage | `buildBillingApiPath("/api/billing/student-balances", tenantSlug \|\| "demo"),` |
| `web\src\components\school\accountant\expenses-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/accountant/expenses` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/accountant/expenses")` |
| `web\src\components\school\accountant\fee-structures-workspace.tsx` | 173 | `fetch` | `buildBillingApiPath("/api/finance/summary", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/finance/summary", tenantSlug), {
 ...)` |
| `web\src\components\school\accountant\fee-structures-workspace.tsx` | 189 | `fetch` | `buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/billing/finance-activity?limit=25&...)` |
| `web\src\components\school\accountant\fee-structures-workspace.tsx` | 213 | `fetch` | `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/billing/student-balances", tenantS...)` |
| `web\src\components\school\accountant\fee-structures-workspace.tsx` | 250 | `fetch` | `buildBillingApiPath(`/api/billing/reconciliation?${params.toString()}`, tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(`/api/billing/reconciliation?${...)` |
| `web\src\components\school\accountant\fee-structures-workspace.tsx` | 281 | `fetch` | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlu...)` |
| `web\src\components\school\accountant\fee-structures-workspace.tsx` | 356 | `fetch` | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        )` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(
          `/api/billing/studen...)` |
| `web\src\components\school\accountant\fee-structures-workspace.tsx` | 389 | `fetch` | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        )` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(
          `/api/billing/studen...)` |
| `web\src\components\school\accountant\fee-structures-workspace.tsx` | 437 | `fetch` | `buildBillingApiPath(`/api/billing/reconciliation/export?${params.toString()}`, tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(`/api/billing/reconciliation/ex...)` |
| `web\src\components\school\accountant\fee-structures-workspace.tsx` | 578 | `fetch` | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },         body: JSON.stringify({           name: feeStructureDraft.name.trim(),           academic_year: feeStructureDraft.academic_year.trim(),           term: feeStructureDraft.term.trim(),           grade_level: feeStructureDraft.grade_level.trim(),           class_name: feeStructureDraft.class_name.trim() || undefined,           status: feeStructureDraft.status,           due_days: dueDays,           line_items: lineItemResult.lineItems,           metadata: {             source: "school_finance_fee_setup",           },         }),       } | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlu...)` |
| `web\src\components\school\accountant\fee-structures-workspace.tsx` | 627 | `fetch` | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`, tenantSlug)` | `POST` | Request options: {           method: "POST",           headers: {             "Content-Type": "application/json",             "x-myshule-csrf": csrfToken,           },         } | `fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${...)` |
| `web\src\components\school\accountant\fee-structures-workspace.tsx` | 680 | `fetch` | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`, tenantSlug)` | `POST` | Request options: {           method: "POST",           headers: {             "Content-Type": "application/json",             "x-myshule-csrf": csrfToken,           },           body: JSON.stringify({             idempotency_key: idempotencyKey,             due_at: bulkDraft.due_at.trim()               ? new Date(`${bulkDraft.due_at.trim()}T23:59:59.000Z`).toISOString()               : undefined,             target_students: studentResult.students.map((student) => ({               student_id: student.student_id,               student_name: student.student_name,               admission_number: student.admission_number || undefined,               class_name: student.class_name || undefined,               guardian_phone: student.guardian_phone || undefined,             })),             metadata: {               source: "school_finance_bulk_billing",             },           }),         } | `fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${...)` |
| `web\src\components\school\accountant\fee-structures-workspace.tsx` | 740 | `fetch` | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`, tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${...)` |
| `web\src\components\school\accountant\fee-structures-workspace.tsx` | 795 | `fetch` | `buildBillingApiPath("/api/billing/invoices", tenantSlug)` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },         body: JSON.stringify({           description: `Fees for ${invoiceDraft.studentName.trim()}`,           total_amount_minor: amountMinor,           due_at: invoiceDraft.dueAt.trim()             ? new Date(invoiceDraft.dueAt.trim()).toISOString()             : undefined,           metadata: {             student_id: invoiceDraft.studentId.trim(),             student_name: invoiceDraft.studentName.trim(),           },         }),       } | `fetch(buildBillingApiPath("/api/billing/invoices", tenantSlug), {
...)` |
| `web\src\components\school\accountant\fee-structures-workspace.tsx` | 851 | `fetch` | `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },         body: JSON.stringify({           idempotency_key: `finance-quick-${Date.now()}-${Math.random().toString(36).slice(2)}`,           payment_method: paymentDraft.payment_method,           amount_minor: amountMinor,           student_id: paymentDraft.student_id.trim() || undefined,           invoice_id: paymentDraft.invoice_id.trim() || undefined,           payer_name: paymentDraft.payer_name.trim() || undefined,           deposit_reference: paymentDraft.reference.trim(),           external_reference: paymentDraft.reference.trim(),           metadata: {             source: "school_finance_quick_entry",             student_name: paymentDraft.payer_name.trim() || undefined,           },         }),       } | `fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tena...)` |
| `web\src\components\school\accountant\invoices-workspace.tsx` | 173 | `fetch` | `buildBillingApiPath("/api/finance/summary", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/finance/summary", tenantSlug), {
 ...)` |
| `web\src\components\school\accountant\invoices-workspace.tsx` | 189 | `fetch` | `buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/billing/finance-activity?limit=25&...)` |
| `web\src\components\school\accountant\invoices-workspace.tsx` | 213 | `fetch` | `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/billing/student-balances", tenantS...)` |
| `web\src\components\school\accountant\invoices-workspace.tsx` | 250 | `fetch` | `buildBillingApiPath(`/api/billing/reconciliation?${params.toString()}`, tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(`/api/billing/reconciliation?${...)` |
| `web\src\components\school\accountant\invoices-workspace.tsx` | 281 | `fetch` | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlu...)` |
| `web\src\components\school\accountant\invoices-workspace.tsx` | 313 | `fetch` | `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(buildBillingApiPath("/api/billing/student-balances", tenantS...)` |
| `web\src\components\school\accountant\invoices-workspace.tsx` | 373 | `fetch` | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        )` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(
          `/api/billing/studen...)` |
| `web\src\components\school\accountant\invoices-workspace.tsx` | 406 | `fetch` | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        )` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(
          `/api/billing/studen...)` |
| `web\src\components\school\accountant\invoices-workspace.tsx` | 454 | `fetch` | `buildBillingApiPath(`/api/billing/reconciliation/export?${params.toString()}`, tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(`/api/billing/reconciliation/ex...)` |
| `web\src\components\school\accountant\invoices-workspace.tsx` | 595 | `fetch` | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },         body: JSON.stringify({           name: feeStructureDraft.name.trim(),           academic_year: feeStructureDraft.academic_year.trim(),           term: feeStructureDraft.term.trim(),           grade_level: feeStructureDraft.grade_level.trim(),           class_name: feeStructureDraft.class_name.trim() || undefined,           status: feeStructureDraft.status,           due_days: dueDays,           line_items: lineItemResult.lineItems,           metadata: {             source: "school_finance_fee_setup",           },         }),       } | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlu...)` |
| `web\src\components\school\accountant\invoices-workspace.tsx` | 644 | `fetch` | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`, tenantSlug)` | `POST` | Request options: {           method: "POST",           headers: {             "Content-Type": "application/json",             "x-myshule-csrf": csrfToken,           },         } | `fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${...)` |
| `web\src\components\school\accountant\invoices-workspace.tsx` | 697 | `fetch` | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`, tenantSlug)` | `POST` | Request options: {           method: "POST",           headers: {             "Content-Type": "application/json",             "x-myshule-csrf": csrfToken,           },           body: JSON.stringify({             idempotency_key: idempotencyKey,             due_at: bulkDraft.due_at.trim()               ? new Date(`${bulkDraft.due_at.trim()}T23:59:59.000Z`).toISOString()               : undefined,             target_students: studentResult.students.map((student) => ({               student_id: student.student_id,               student_name: student.student_name,               admission_number: student.admission_number || undefined,               class_name: student.class_name || undefined,               guardian_phone: student.guardian_phone || undefined,             })),             metadata: {               source: "school_finance_bulk_billing",             },           }),         } | `fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${...)` |
| `web\src\components\school\accountant\invoices-workspace.tsx` | 757 | `fetch` | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`, tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${...)` |
| `web\src\components\school\accountant\invoices-workspace.tsx` | 812 | `fetch` | `buildBillingApiPath("/api/billing/invoices", tenantSlug)` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },         body: JSON.stringify({           description: `Fees for ${invoiceDraft.studentName.trim()}`,           total_amount_minor: amountMinor,           due_at: invoiceDraft.dueAt.trim()             ? new Date(invoiceDraft.dueAt.trim()).toISOString()             : undefined,           metadata: {             student_id: invoiceDraft.studentId.trim(),             student_name: invoiceDraft.studentName.trim(),           },         }),       } | `fetch(buildBillingApiPath("/api/billing/invoices", tenantSlug), {
...)` |
| `web\src\components\school\accountant\invoices-workspace.tsx` | 868 | `fetch` | `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },         body: JSON.stringify({           idempotency_key: `finance-quick-${Date.now()}-${Math.random().toString(36).slice(2)}`,           payment_method: paymentDraft.payment_method,           amount_minor: amountMinor,           student_id: paymentDraft.student_id.trim() || undefined,           invoice_id: paymentDraft.invoice_id.trim() || undefined,           payer_name: paymentDraft.payer_name.trim() || undefined,           deposit_reference: paymentDraft.reference.trim(),           external_reference: paymentDraft.reference.trim(),           metadata: {             source: "school_finance_quick_entry",             student_name: paymentDraft.payer_name.trim() || undefined,           },         }),       } | `fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tena...)` |
| `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx` | 36 | `fetch` | `buildPaymentsApiPath("/api/payments/mpesa/c2b/payments", tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(
          buildPaymentsApiPath("/api/payments/mpesa/c2b/pay...)` |
| `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx` | 37 | `apiString` | `/api/payments/mpesa/c2b/payments` | `GET` | Literal string usage | `buildPaymentsApiPath("/api/payments/mpesa/c2b/payments", tenantSlug),` |
| `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx` | 112 | `fetch` | `buildPaymentsApiPath("/api/payments/mpesa/c2b/payments?status=pending_review", tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(
          buildPaymentsApiPath("/api/payments/mpesa/c2b/pay...)` |
| `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx` | 113 | `apiString` | `/api/payments/mpesa/c2b/payments?status=pending_review` | `GET` | Literal string usage | `buildPaymentsApiPath("/api/payments/mpesa/c2b/payments?status=pending_review", tenantSlug),` |
| `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx` | 170 | `fetch` | `buildPaymentsApiPath(`/api/payments/mpesa/c2b/payments/${selectedPaymentId}/reconcile`, tenantSlug)` | `POST` | Request options: {           method: "POST",           headers: {             "Content-Type": "application/json",             "x-myshule-csrf": csrfToken,           },           body: JSON.stringify({             invoice_id: invoiceId.trim() || undefined,             student_id: studentId.trim() || undefined,             notes: notes.trim() || undefined,           }),         } | `fetch(
        buildPaymentsApiPath(`/api/payments/mpesa/c2b/payme...)` |
| `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx` | 171 | `apiString` | `/api/payments/mpesa/c2b/payments/${selectedPaymentId}/reconcile` | `GET` | Literal string usage | `buildPaymentsApiPath(`/api/payments/mpesa/c2b/payments/${selectedPaymentId}/reconcile`, tenantSlug),` |
| `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx` | 322 | `fetch` | `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `GET` | Request options: {           cache: "no-store",         } | `fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tena...)` |
| `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx` | 382 | `fetch` | `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },         body: JSON.stringify({           idempotency_key: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,           payment_method: draft.payment_method,           amount_minor: amountMinor,           student_id: draft.student_id.trim() || undefined,           invoice_id: draft.invoice_id.trim() || undefined,           payer_name: draft.payer_name.trim() || undefined,           cheque_number: draft.cheque_number.trim() || undefined,           drawer_bank: draft.drawer_bank.trim() || undefined,           deposit_reference: draft.deposit_reference.trim() || undefined,           asset_account_code: draft.asset_account_code.trim() || undefined,           fee_control_account_code: draft.fee_control_account_code.trim() || undefined,           notes: draft.notes.trim() || undefined,         }),       } | `fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tena...)` |
| `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx` | 447 | `fetch` | `buildBillingApiPath(`/api/billing/manual-fee-payments/${receipt.id}/${action}`, tenantSlug)` | `POST` | Request options: {           method: "POST",           headers: {             "Content-Type": "application/json",             "x-myshule-csrf": csrfToken,           },           body: JSON.stringify({             occurred_at: new Date().toISOString(),             notes:               action === "bounce"                 ? "Cheque returned unpaid"                 : action === "reverse"                   ? "Manual receipt reversed by accountant"                   : undefined,           }),         } | `fetch(
        buildBillingApiPath(`/api/billing/manual-fee-paymen...)` |
| `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx` | 448 | `apiString` | `/api/billing/manual-fee-payments/${receipt.id}/${action}` | `GET` | Literal string usage | `buildBillingApiPath(`/api/billing/manual-fee-payments/${receipt.id}/${action}`, tenantSlug),` |
| `web\src\components\school\accountant\overview-workspace.tsx` | 37 | `fetch` | `buildBillingApiPath("/api/billing/finance-activity?limit=10&offset=0", tenantSlug || "demo")` | `GET` | Request options: { cache: "no-store" } | `fetch(
          buildBillingApiPath("/api/billing/finance-activit...)` |
| `web\src\components\school\accountant\overview-workspace.tsx` | 38 | `apiString` | `/api/billing/finance-activity?limit=10&offset=0` | `GET` | Literal string usage | `buildBillingApiPath("/api/billing/finance-activity?limit=10&offset=0", tenantSlug \|\| "demo"),` |
| `web\src\components\school\accountant\payments-workspace.tsx` | 173 | `fetch` | `buildBillingApiPath("/api/finance/summary", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/finance/summary", tenantSlug), {
 ...)` |
| `web\src\components\school\accountant\payments-workspace.tsx` | 189 | `fetch` | `buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/billing/finance-activity?limit=25&...)` |
| `web\src\components\school\accountant\payments-workspace.tsx` | 213 | `fetch` | `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/billing/student-balances", tenantS...)` |
| `web\src\components\school\accountant\payments-workspace.tsx` | 250 | `fetch` | `buildBillingApiPath(`/api/billing/reconciliation?${params.toString()}`, tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(`/api/billing/reconciliation?${...)` |
| `web\src\components\school\accountant\payments-workspace.tsx` | 281 | `fetch` | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlu...)` |
| `web\src\components\school\accountant\payments-workspace.tsx` | 313 | `fetch` | `buildBillingApiPath("/api/billing/finance-activity", tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(buildBillingApiPath("/api/billing/finance-activity", tenantS...)` |
| `web\src\components\school\accountant\payments-workspace.tsx` | 385 | `fetch` | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        )` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(
          `/api/billing/studen...)` |
| `web\src\components\school\accountant\payments-workspace.tsx` | 418 | `fetch` | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        )` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(
          `/api/billing/studen...)` |
| `web\src\components\school\accountant\payments-workspace.tsx` | 466 | `fetch` | `buildBillingApiPath(`/api/billing/reconciliation/export?${params.toString()}`, tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(`/api/billing/reconciliation/ex...)` |
| `web\src\components\school\accountant\payments-workspace.tsx` | 607 | `fetch` | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },         body: JSON.stringify({           name: feeStructureDraft.name.trim(),           academic_year: feeStructureDraft.academic_year.trim(),           term: feeStructureDraft.term.trim(),           grade_level: feeStructureDraft.grade_level.trim(),           class_name: feeStructureDraft.class_name.trim() || undefined,           status: feeStructureDraft.status,           due_days: dueDays,           line_items: lineItemResult.lineItems,           metadata: {             source: "school_finance_fee_setup",           },         }),       } | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlu...)` |
| `web\src\components\school\accountant\payments-workspace.tsx` | 656 | `fetch` | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`, tenantSlug)` | `POST` | Request options: {           method: "POST",           headers: {             "Content-Type": "application/json",             "x-myshule-csrf": csrfToken,           },         } | `fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${...)` |
| `web\src\components\school\accountant\payments-workspace.tsx` | 709 | `fetch` | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`, tenantSlug)` | `POST` | Request options: {           method: "POST",           headers: {             "Content-Type": "application/json",             "x-myshule-csrf": csrfToken,           },           body: JSON.stringify({             idempotency_key: idempotencyKey,             due_at: bulkDraft.due_at.trim()               ? new Date(`${bulkDraft.due_at.trim()}T23:59:59.000Z`).toISOString()               : undefined,             target_students: studentResult.students.map((student) => ({               student_id: student.student_id,               student_name: student.student_name,               admission_number: student.admission_number || undefined,               class_name: student.class_name || undefined,               guardian_phone: student.guardian_phone || undefined,             })),             metadata: {               source: "school_finance_bulk_billing",             },           }),         } | `fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${...)` |
| `web\src\components\school\accountant\payments-workspace.tsx` | 769 | `fetch` | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`, tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${...)` |
| `web\src\components\school\accountant\payments-workspace.tsx` | 824 | `fetch` | `buildBillingApiPath("/api/billing/invoices", tenantSlug)` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },         body: JSON.stringify({           description: `Fees for ${invoiceDraft.studentName.trim()}`,           total_amount_minor: amountMinor,           due_at: invoiceDraft.dueAt.trim()             ? new Date(invoiceDraft.dueAt.trim()).toISOString()             : undefined,           metadata: {             student_id: invoiceDraft.studentId.trim(),             student_name: invoiceDraft.studentName.trim(),           },         }),       } | `fetch(buildBillingApiPath("/api/billing/invoices", tenantSlug), {
...)` |
| `web\src\components\school\accountant\payments-workspace.tsx` | 880 | `fetch` | `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },         body: JSON.stringify({           idempotency_key: `finance-quick-${Date.now()}-${Math.random().toString(36).slice(2)}`,           payment_method: paymentDraft.payment_method,           amount_minor: amountMinor,           student_id: paymentDraft.student_id.trim() || undefined,           invoice_id: paymentDraft.invoice_id.trim() || undefined,           payer_name: paymentDraft.payer_name.trim() || undefined,           deposit_reference: paymentDraft.reference.trim(),           external_reference: paymentDraft.reference.trim(),           metadata: {             source: "school_finance_quick_entry",             student_name: paymentDraft.payer_name.trim() || undefined,           },         }),       } | `fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tena...)` |
| `web\src\components\school\accountant\receipts-workspace.tsx` | 33 | `fetch` | `buildBillingApiPath("/api/billing/finance-activity?limit=100&offset=0", tenantSlug || "demo")` | `GET` | Request options: { cache: "no-store" } | `fetch(
          buildBillingApiPath("/api/billing/finance-activit...)` |
| `web\src\components\school\accountant\receipts-workspace.tsx` | 34 | `apiString` | `/api/billing/finance-activity?limit=100&offset=0` | `GET` | Literal string usage | `buildBillingApiPath("/api/billing/finance-activity?limit=100&offset=0", tenantSlug \|\| "demo"),` |
| `web\src\components\school\accountant\reports-workspace.tsx` | 28 | `fetch` | `buildBillingApiPath(apiPath, tenantSlug || "demo")` | `GET` | Request options: {         cache: "no-store"       } | `fetch(buildBillingApiPath(apiPath, tenantSlug \|\| "demo"), {
      ...)` |
| `web\src\components\school\accountant\reports-workspace.tsx` | 54 | `apiString` | `/api/billing/student-balances/csv` | `GET` | Literal string usage | `apiPath: "/api/billing/student-balances/csv"` |
| `web\src\components\school\accountant\reports-workspace.tsx` | 60 | `apiString` | `/api/billing/reconciliation/csv` | `GET` | Literal string usage | `apiPath: "/api/billing/reconciliation/csv"` |
| `web\src\components\school\accountant\waivers-discounts-workspace.tsx` | 37 | `fetch` | `buildBillingApiPath("/api/billing/waivers", tenantSlug || "demo")` | `GET` | Request options: { cache: "no-store" } | `fetch(
          buildBillingApiPath("/api/billing/waivers", tenan...)` |
| `web\src\components\school\accountant\waivers-discounts-workspace.tsx` | 38 | `apiString` | `/api/billing/waivers` | `GET` | Literal string usage | `buildBillingApiPath("/api/billing/waivers", tenantSlug \|\| "demo"),` |
| `web\src\components\school\accountant\waivers-discounts-workspace.tsx` | 68 | `fetch` | `buildBillingApiPath("/api/billing/waivers", tenantSlug || "demo")` | `POST` | Request options: {         method: "POST",         headers: { "Content-Type": "application/json" },         body: JSON.stringify(formDraft),       } | `fetch(buildBillingApiPath("/api/billing/waivers", tenantSlug \|\| "d...)` |
| `web\src\components\school\admin\classes-streams-workspace.tsx` | 12 | `useSchoolQuery` | `/api/academics/academic-years` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/academics/academic-years", { enabled: activeTab === "y...)` |
| `web\src\components\school\admin\classes-streams-workspace.tsx` | 13 | `useSchoolQuery` | `/api/academics/academic-terms` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/academics/academic-terms", { enabled: activeTab === "y...)` |
| `web\src\components\school\admin\classes-streams-workspace.tsx` | 14 | `useSchoolQuery` | `/api/academics/class-sections` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/academics/class-sections", { enabled: activeTab === "s...)` |
| `web\src\components\school\admin\classes-streams-workspace.tsx` | 16 | `useSchoolMutation` | `/api/academics/years` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/academics/years")` |
| `web\src\components\school\admin\classes-streams-workspace.tsx` | 17 | `useSchoolMutation` | `/api/academics/terms` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/academics/terms")` |
| `web\src\components\school\admin\classes-streams-workspace.tsx` | 18 | `useSchoolMutation` | `/api/academics/class-sections` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/academics/class-sections")` |
| `web\src\components\school\admin\data-quality-workspace.tsx` | 9 | `useSchoolQuery` | `/api/ai-insights/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/ai-insights/dashboard")` |
| `web\src\components\school\admin\data-setup-workspace.tsx` | 12 | `useSchoolQuery` | `/api/academics/grading-systems` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/academics/grading-systems", { enabled: activeTab === "...)` |
| `web\src\components\school\admin\data-setup-workspace.tsx` | 13 | `useSchoolQuery` | `/api/academics/attendance-settings` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/academics/attendance-settings", { enabled: activeTab =...)` |
| `web\src\components\school\admin\data-setup-workspace.tsx` | 15 | `useSchoolMutation` | `/api/academics/grading-systems` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/academics/grading-systems")` |
| `web\src\components\school\admin\data-setup-workspace.tsx` | 16 | `useSchoolMutation` | `/api/academics/attendance-settings` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/academics/attendance-settings")` |
| `web\src\components\school\admin\imports-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admin/imports` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admin/imports")` |
| `web\src\components\school\admin\overview-workspace.tsx` | 9 | `useSchoolQuery` | `/api/dashboard/layout` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/dashboard/layout")` |
| `web\src\components\school\admin\parents-workspace.tsx` | 12 | `useSchoolQuery` | `/api/students/guardians/directory` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/students/guardians/directory", { enabled: activeTab ==...)` |
| `web\src\components\school\admin\parents-workspace.tsx` | 13 | `useSchoolQuery` | `/api/students` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/students", { enabled: activeTab === "add" })` |
| `web\src\components\school\admin\parents-workspace.tsx` | 15 | `useSchoolMutation` | `/api/students/guardians` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/students/guardians")` |
| `web\src\components\school\admin\reports-workspace.tsx` | 13 | `useSchoolQuery` | `/api/admin-command/principal/reports` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/admin-command/principal/reports")` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 18 | `useSchoolQuery` | `/api/hr/staff` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/hr/staff", { enabled: activeTab === "directory" \|\| act...)` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 19 | `useSchoolQuery` | `/api/hr/departments` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/hr/departments")` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 20 | `useSchoolQuery` | `/api/hr/job-titles` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/hr/job-titles")` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 21 | `useSchoolQuery` | `/api/hr/attendance?date=${attendanceDate}` | `GET` | Query / Path variables from context | `useSchoolQuery(`/api/hr/attendance?date=${attendanceDate}`, { enabled: acti...)` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 22 | `useSchoolQuery` | `/api/hr/leave` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/hr/leave", { enabled: activeTab === "leave" })` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 23 | `useSchoolQuery` | `/api/hr/payroll/bands` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/hr/payroll/bands", { enabled: activeTab === "payroll" ...)` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 24 | `useSchoolQuery` | `/api/hr/payroll/payslips?month=${payslipMonth}&year=${payslipYear}` | `GET` | Query / Path variables from context | `useSchoolQuery(`/api/hr/payroll/payslips?month=${payslipMonth}&year=${paysl...)` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 25 | `useSchoolQuery` | `/api/hr/performance/reviews` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/hr/performance/reviews", { enabled: activeTab === "per...)` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 26 | `useSchoolQuery` | `/api/hr/performance/disciplinary` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/hr/performance/disciplinary", { enabled: activeTab ===...)` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 28 | `useSchoolMutation` | `/api/hr/staff/invite` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/hr/staff/invite")` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 29 | `useSchoolMutation` | `/api/hr/staff/approve` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/hr/staff/approve")` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 30 | `useSchoolMutation` | `/api/hr/staff/reactivate` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/hr/staff/reactivate")` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 31 | `useSchoolMutation` | `/api/hr/staff/accept-invite` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/hr/staff/accept-invite")` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 32 | `useSchoolMutation` | `/api/hr/staff/complete-profile` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/hr/staff/complete-profile")` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 33 | `useSchoolMutation` | `/api/hr/attendance` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/hr/attendance")` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 34 | `useSchoolMutation` | `/api/hr/leave/request` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/hr/leave/request")` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 35 | `useSchoolMutation` | `(vars: { id: string; status: string; reason?: string }) => `/api/hr/leave/${vars.id}/status` | `POST` | Variables passed to mutate function | `useSchoolMutation((vars: { id: string; status: string; reason?: string }) => `...)` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 36 | `useSchoolMutation` | `/api/hr/departments` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/hr/departments")` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 37 | `useSchoolMutation` | `/api/hr/job-titles` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/hr/job-titles")` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 38 | `useSchoolMutation` | `/api/hr/staff/role` | `PATCH` | Variables passed to mutate function | `useSchoolMutation("/api/hr/staff/role", "PATCH")` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 39 | `useSchoolMutation` | `/api/hr/payroll/bands` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/hr/payroll/bands")` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 40 | `useSchoolMutation` | `/api/hr/staff/salary` | `PATCH` | Variables passed to mutate function | `useSchoolMutation("/api/hr/staff/salary", "PATCH")` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 41 | `useSchoolMutation` | `/api/hr/payroll/payslips` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/hr/payroll/payslips")` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 42 | `useSchoolMutation` | `/api/hr/performance/reviews` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/hr/performance/reviews")` |
| `web\src\components\school\admin\staff-records-workspace.tsx` | 43 | `useSchoolMutation` | `/api/hr/performance/disciplinary` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/hr/performance/disciplinary")` |
| `web\src\components\school\admin\students-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admin/students` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admin/students")` |
| `web\src\components\school\admin\subjects-workspace.tsx` | 12 | `useSchoolQuery` | `/api/academics/subjects` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/academics/subjects", { enabled: activeTab === "subject...)` |
| `web\src\components\school\admin\subjects-workspace.tsx` | 13 | `useSchoolQuery` | `/api/academics/teacher-assignments` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/academics/teacher-assignments", { enabled: activeTab =...)` |
| `web\src\components\school\admin\subjects-workspace.tsx` | 15 | `useSchoolQuery` | `/api/hr/staff` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/hr/staff", { enabled: activeTab === "teachers" })` |
| `web\src\components\school\admin\subjects-workspace.tsx` | 16 | `useSchoolQuery` | `/api/academics/class-sections` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/academics/class-sections", { enabled: activeTab === "t...)` |
| `web\src\components\school\admin\subjects-workspace.tsx` | 17 | `useSchoolQuery` | `/api/academics/academic-terms` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/academics/academic-terms", { enabled: activeTab === "t...)` |
| `web\src\components\school\admin\subjects-workspace.tsx` | 19 | `useSchoolMutation` | `/api/academics/subjects` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/academics/subjects")` |
| `web\src\components\school\admin\subjects-workspace.tsx` | 20 | `useSchoolMutation` | `/api/academics/teacher-assignments` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/academics/teacher-assignments")` |
| `web\src\components\school\admissions-dashboard\applicant-profiles-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admissions/applicant-profiles` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admissions/applicant-profiles")` |
| `web\src\components\school\admissions-dashboard\applications-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admissions/applications` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admissions/applications")` |
| `web\src\components\school\admissions-dashboard\appointments-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admissions/appointments` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admissions/appointments")` |
| `web\src\components\school\admissions-dashboard\communication-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admissions/communication` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admissions/communication")` |
| `web\src\components\school\admissions-dashboard\documents-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admissions/documents` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admissions/documents")` |
| `web\src\components\school\admissions-dashboard\enquiries-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admissions/enquiries` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admissions/enquiries")` |
| `web\src\components\school\admissions-dashboard\enrolment-workspace.tsx` | 21 | `useSchoolQuery` | `/api/admissions/applications?status=pending_enrolment` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/admissions/applications?status=pending_enrolment")` |
| `web\src\components\school\admissions-dashboard\enrolment-workspace.tsx` | 26 | `useSchoolMutation` | `(id: string) => `/api/admissions/applications/${id}/enrol` | `POST` | Variables passed to mutate function | `useSchoolMutation((id: string) => `/api/admissions/applications/${id}/enrol`, ...)` |
| `web\src\components\school\admissions-dashboard\fee-clearance-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admissions/fee-clearance` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admissions/fee-clearance")` |
| `web\src\components\school\admissions-dashboard\imports-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admissions/imports` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admissions/imports")` |
| `web\src\components\school\admissions-dashboard\interviews-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admissions/interviews` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admissions/interviews")` |
| `web\src\components\school\admissions-dashboard\overview-workspace.tsx` | 8 | `useSchoolQuery` | `/admin-command/admissions/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/admissions/overview')` |
| `web\src\components\school\admissions-dashboard\parents-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admissions/parents` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admissions/parents")` |
| `web\src\components\school\admissions-dashboard\placement-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admissions/placement` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admissions/placement")` |
| `web\src\components\school\admissions-dashboard\reports-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admissions/reports` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admissions/reports")` |
| `web\src\components\school\admissions-dashboard\selection-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admissions/selection` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admissions/selection")` |
| `web\src\components\school\admissions-dashboard\tasks-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admissions/tasks` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admissions/tasks")` |
| `web\src\components\school\admissions-dashboard\templates-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admissions/templates` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admissions/templates")` |
| `web\src\components\school\admissions-dashboard\transfers-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/admissions/transfers` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/admissions/transfers")` |
| `web\src\components\school\admissions\admissions-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/admissions/admissions` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/admissions/admissions')` |
| `web\src\components\school\admissions\applications-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/admissions/applications` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/admissions/applications')` |
| `web\src\components\school\admissions\class-placement-workspace.tsx` | 24 | `useSchoolQuery` | `/admin-command/admissions/class-placement` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/admissions/class-placement')` |
| `web\src\components\school\admissions\documents-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/admissions/documents` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/admissions/documents')` |
| `web\src\components\school\admissions\interviews-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/admissions/interviews` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/admissions/interviews')` |
| `web\src\components\school\admissions\overview-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/admissions/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/admissions/overview')` |
| `web\src\components\school\admissions\parent-linking-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/admissions/parent-linking` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/admissions/parent-linking')` |
| `web\src\components\school\admissions\reports-workspace.tsx` | 22 | `useSchoolQuery` | `/admin-command/admissions/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/admissions/reports')` |
| `web\src\components\school\boarding-master-command-center.tsx` | 231 | `useSchoolQuery` | `/api/boarding/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/boarding/dashboard")` |
| `web\src\components\school\boarding-master-command-center.tsx` | 291 | `useSchoolQuery` | `/api/boarding/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/boarding/dashboard")` |
| `web\src\components\school\boarding-master-command-center.tsx` | 316 | `useSchoolQuery` | `/api/boarding/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/boarding/dashboard")` |
| `web\src\components\school\boarding-master-command-center.tsx` | 331 | `useSchoolQuery` | `/api/boarding/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/boarding/dashboard")` |
| `web\src\components\school\boarding-master-command-center.tsx` | 337 | `apiString` | `/api/admin-command/boarding/assign-bed` | `GET` | Literal string usage | `await requestDashboardApi("/api/admin-command/boarding/assign-bed", {` |
| `web\src\components\school\boarding-master-command-center.tsx` | 383 | `useSchoolQuery` | `/api/boarding/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/boarding/dashboard")` |
| `web\src\components\school\boarding-master-command-center.tsx` | 389 | `apiString` | `/api/admin-command/boarding/roll-call` | `GET` | Literal string usage | `await requestDashboardApi("/api/admin-command/boarding/roll-call", {` |
| `web\src\components\school\boarding-master-command-center.tsx` | 478 | `useSchoolQuery` | `/api/boarding/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/boarding/dashboard")` |
| `web\src\components\school\boarding-master-command-center.tsx` | 484 | `apiString` | `/api/admin-command/boarding/incidents` | `GET` | Literal string usage | `await requestDashboardApi("/api/admin-command/boarding/incidents", {` |
| `web\src\components\school\boarding-master\allocation-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/boarding-master/allocation` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/boarding-master/allocation')` |
| `web\src\components\school\boarding-master\boarding-attendance-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/boarding-master/boarding-attendance` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/boarding-master/boarding-attendance')` |
| `web\src\components\school\boarding-master\hostels-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/boarding-master/hostels` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/boarding-master/hostels')` |
| `web\src\components\school\boarding-master\incidents-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/boarding-master/incidents` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/boarding-master/incidents')` |
| `web\src\components\school\boarding-master\leave-exit-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/boarding-master/leave-exit` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/boarding-master/leave-exit')` |
| `web\src\components\school\boarding-master\overview-workspace.tsx` | 23 | `useSchoolQuery` | `/admin-command/boarding-master/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/boarding-master/overview')` |
| `web\src\components\school\boarding-master\reports-workspace.tsx` | 22 | `useSchoolQuery` | `/admin-command/boarding-master/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/boarding-master/reports')` |
| `web\src\components\school\boarding-master\rooms-beds-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/boarding-master/rooms-beds` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/boarding-master/rooms-beds')` |
| `web\src\components\school\class-teacher\attendance-follow-up-workspace.tsx` | 32 | `useSchoolQuery` | `/admin-command/class-teacher/attendance-follow-up` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/class-teacher/attendance-follow-up')` |
| `web\src\components\school\class-teacher\class-academics-workspace.tsx` | 30 | `useSchoolQuery` | `/admin-command/class-teacher/class-academics` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/class-teacher/class-academics')` |
| `web\src\components\school\class-teacher\discipline-follow-up-workspace.tsx` | 33 | `useSchoolQuery` | `/admin-command/class-teacher/discipline-follow-up` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/class-teacher/discipline-follow-up')` |
| `web\src\components\school\class-teacher\learner-profiles-workspace.tsx` | 35 | `useSchoolQuery` | `/admin-command/class-teacher/learner-profiles` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/class-teacher/learner-profiles')` |
| `web\src\components\school\class-teacher\my-class-workspace.tsx` | 32 | `useSchoolQuery` | `/admin-command/class-teacher/my-class` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/class-teacher/my-class')` |
| `web\src\components\school\class-teacher\overview-workspace.tsx` | 30 | `useSchoolQuery` | `/admin-command/class-teacher/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/class-teacher/overview')` |
| `web\src\components\school\class-teacher\parent-contacts-workspace.tsx` | 32 | `useSchoolQuery` | `/admin-command/class-teacher/parent-contacts` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/class-teacher/parent-contacts')` |
| `web\src\components\school\class-teacher\report-comments-workspace.tsx` | 32 | `useSchoolQuery` | `/admin-command/class-teacher/report-comments` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/class-teacher/report-comments')` |
| `web\src\components\school\class-teacher\reports-workspace.tsx` | 30 | `useSchoolQuery` | `/admin-command/class-teacher/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/class-teacher/reports')` |
| `web\src\components\school\class-teacher\welfare-notes-workspace.tsx` | 32 | `useSchoolQuery` | `/admin-command/class-teacher/welfare-notes` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/class-teacher/welfare-notes')` |
| `web\src\components\school\class-teacher\workspaces\communication.tsx` | 18 | `apiString` | `/api/academic/communications` | `GET` | Literal string usage | `await requestDashboardApi("/api/academic/communications", {` |
| `web\src\components\school\counsellor-command-center.tsx` | 142 | `useSchoolQuery` | `/api/counselling/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/counselling/dashboard")` |
| `web\src\components\school\counsellor-command-center.tsx` | 143 | `useSchoolQuery` | `/api/counselling/referrals` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/counselling/referrals")` |
| `web\src\components\school\counsellor-command-center.tsx` | 144 | `useSchoolQuery` | `/api/counselling/sessions` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/counselling/sessions")` |
| `web\src\components\school\dean-academics-command-center.tsx` | 445 | `useSchoolQuery` | `/api/exams/marks/school` | `GET` | Query / Path variables from context | `useSchoolQuery('/api/exams/marks/school', { enabled: !!liveSession.session ...)` |
| `web\src\components\school\dean-academics-command-center.tsx` | 458 | `apiString` | `/api/academic/dean/lock-batch` | `GET` | Literal string usage | `await requestDashboardApi("/api/academic/dean/lock-batch", {` |
| `web\src\components\school\dean-academics-command-center.tsx` | 880 | `apiString` | `/api/academic/dean/action` | `GET` | Literal string usage | `await requestDashboardApi("/api/academic/dean/action", {` |
| `web\src\components\school\dean-academics\academic-interventions-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/dean-academics/academic-interventions` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/dean-academics/academic-interventions')` |
| `web\src\components\school\dean-academics\assessments-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/dean-academics/assessments` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/dean-academics/assessments')` |
| `web\src\components\school\dean-academics\curriculum-coverage-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/dean-academics/curriculum-coverage` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/dean-academics/curriculum-coverage')` |
| `web\src\components\school\dean-academics\department-performance-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/dean-academics/department-performance` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/dean-academics/department-performance')` |
| `web\src\components\school\dean-academics\lesson-logs-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/dean-academics/lesson-logs` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/dean-academics/lesson-logs')` |
| `web\src\components\school\dean-academics\lesson-plans-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/dean-academics/lesson-plans` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/dean-academics/lesson-plans')` |
| `web\src\components\school\dean-academics\overview-workspace.tsx` | 23 | `useSchoolQuery` | `/admin-command/dean-academics/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/dean-academics/overview')` |
| `web\src\components\school\dean-academics\reports-workspace.tsx` | 22 | `useSchoolQuery` | `/admin-command/dean-academics/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/dean-academics/reports')` |
| `web\src\components\school\dean-academics\teacher-workload-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/dean-academics/teacher-workload` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/dean-academics/teacher-workload')` |
| `web\src\components\school\deputy-principal\academics-monitoring-workspace.tsx` | 30 | `useSchoolQuery` | `/admin-command/deputy/academics` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/deputy/academics')` |
| `web\src\components\school\deputy-principal\approvals-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/deputy/approvals` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/deputy/approvals')` |
| `web\src\components\school\deputy-principal\attendance-workspace.tsx` | 28 | `useSchoolQuery` | `/admin-command/deputy/attendance` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/deputy/attendance')` |
| `web\src\components\school\deputy-principal\classes-streams-workspace.tsx` | 28 | `useSchoolQuery` | `/admin-command/deputy/classes` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/deputy/classes')` |
| `web\src\components\school\deputy-principal\communication-workspace.tsx` | 22 | `apiString` | `/api/communication/sms` | `GET` | Literal string usage | `const { data: smsData, isLoading, refetch } = useSchoolQuery<{ data: CommMessage[] }>('/api/communication/sms');` |
| `web\src\components\school\deputy-principal\communication-workspace.tsx` | 30 | `apiString` | `/api/communication/sms` | `GET` | Literal string usage | `await requestDashboardApi('/api/communication/sms', {` |
| `web\src\components\school\deputy-principal\daily-operations-workspace.tsx` | 34 | `useSchoolQuery` | `/admin-command/deputy/daily-operations` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/deputy/daily-operations')` |
| `web\src\components\school\deputy-principal\discipline-workspace.tsx` | 32 | `useSchoolQuery` | `/admin-command/deputy/discipline` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/deputy/discipline')` |
| `web\src\components\school\deputy-principal\exams-marks-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/deputy/exams` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/deputy/exams')` |
| `web\src\components\school\deputy-principal\overview-workspace.tsx` | 31 | `useSchoolQuery` | `/admin-command/deputy/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/deputy/overview')` |
| `web\src\components\school\deputy-principal\reports-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/deputy/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/deputy/reports')` |
| `web\src\components\school\deputy-principal\staff-duty-workspace.tsx` | 28 | `useSchoolQuery` | `/admin-command/deputy/staff-duty` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/deputy/staff-duty')` |
| `web\src\components\school\deputy-principal\staff-roles-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/deputy/staff` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/deputy/staff')` |
| `web\src\components\school\deputy-principal\teaching-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/deputy/teaching` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/deputy/teaching')` |
| `web\src\components\school\deputy-principal\timetable-relief-workspace.tsx` | 29 | `useSchoolQuery` | `/admin-command/deputy/timetable` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/deputy/timetable')` |
| `web\src\components\school\deputy-principal\welfare-workspace.tsx` | 31 | `useSchoolQuery` | `/admin-command/deputy/welfare` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/deputy/welfare')` |
| `web\src\components\school\deputy-principal\welfare-workspace.tsx` | 33 | `useSchoolMutation` | `/admin-command/deputy/welfare` | `POST` | Variables passed to mutate function | `useSchoolMutation('/admin-command/deputy/welfare', 'POST', {
    onSuccess: ()...)` |
| `web\src\components\school\discipline-master\actions-interventions-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/actions-interventions` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/actions-interventions")` |
| `web\src\components\school\discipline-master\actions-sanctions-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/actions-sanctions` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/actions-sanctions")` |
| `web\src\components\school\discipline-master\audit-trail-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/audit-trail` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/audit-trail")` |
| `web\src\components\school\discipline-master\cases-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/cases` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/cases")` |
| `web\src\components\school\discipline-master\class-house-monitoring-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/class-house-monitoring` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/class-house-monitoring")` |
| `web\src\components\school\discipline-master\counselling-referrals-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/counselling-referrals` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/counselling-referrals")` |
| `web\src\components\school\discipline-master\detention-programs-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/detention-programs` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/detention-programs")` |
| `web\src\components\school\discipline-master\incident-log-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/incident-log` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/incident-log")` |
| `web\src\components\school\discipline-master\incident-register-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/incident-register` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/incident-register")` |
| `web\src\components\school\discipline-master\investigations-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/investigations` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/investigations")` |
| `web\src\components\school\discipline-master\log-incident-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/log-incident` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/log-incident")` |
| `web\src\components\school\discipline-master\overview-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/overview` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/overview")` |
| `web\src\components\school\discipline-master\parent-communication-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/parent-communication` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/parent-communication")` |
| `web\src\components\school\discipline-master\parent-summons-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/parent-summons` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/parent-summons")` |
| `web\src\components\school\discipline-master\report-intake-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/report-intake` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/report-intake")` |
| `web\src\components\school\discipline-master\reports-downloads-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/reports-downloads` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/reports-downloads")` |
| `web\src\components\school\discipline-master\reports-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/reports` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/reports")` |
| `web\src\components\school\discipline-master\serious-cases-approvals-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/serious-cases-approvals` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/serious-cases-approvals")` |
| `web\src\components\school\discipline-master\settings-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/settings` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/settings")` |
| `web\src\components\school\discipline-master\student-conduct-profiles-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/student-conduct-profiles` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/student-conduct-profiles")` |
| `web\src\components\school\discipline-master\templates-rules-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/templates-rules` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/templates-rules")` |
| `web\src\components\school\discipline-master\triage-queue-workspace.tsx` | 14 | `useSchoolQuery` | `/discipline/triage-queue` | `GET` | Query / Path variables from context | `useSchoolQuery("/discipline/triage-queue")` |
| `web\src\components\school\docx-operational-workspace.tsx` | 43 | `fetch` | `/api/workflow/events` | `POST` | Request options: {         method: "POST",         headers: { "Content-Type": "application/json" },         body: JSON.stringify({           eventType: `UI_ACTION_TRIGGERED`,           payload: { action, context, moduleId }         })       } | `fetch("/api/workflow/events", {
        method: "POST",
        he...)` |
| `web\src\components\school\docx-operational-workspace.tsx` | 135 | `fetch` | `/api/workflow/events` | `POST` | Request options: {                       method: "POST",                       headers: { "Content-Type": "application/json" },                       body: JSON.stringify({                         eventType: `FORM_SUBMISSION`,                         payload: { action, formId: contract.id, values, moduleId }                       })                     } | `fetch("/api/workflow/events", {
                      method: "POS...)` |
| `web\src\components\school\exams-dashboard\academic-setup-approval-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/exams/academic-setup-approval` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/exams/academic-setup-approval")` |
| `web\src\components\school\exams-dashboard\exam-readiness-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/exams/readiness` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/exams/readiness")` |
| `web\src\components\school\exams-manager-command-center.tsx` | 950 | `apiString` | `/api/academic/exams-manager/export-marks` | `GET` | Literal string usage | `await requestDashboardApi("/api/academic/exams-manager/export-marks", {` |
| `web\src\components\school\exams-manager-command-center.tsx` | 970 | `apiString` | `/api/academic/exams-manager/zeraki-sync` | `GET` | Literal string usage | `await requestDashboardApi("/api/academic/exams-manager/zeraki-sync", {` |
| `web\src\components\school\exams-manager-command-center.tsx` | 1298 | `useSchoolQuery` | `/api/exams/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/exams/dashboard")` |
| `web\src\components\school\exams-manager-command-center.tsx` | 1334 | `useSchoolMutation` | `/api/exams/configuration` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/exams/configuration")` |
| `web\src\components\school\exams-manager-command-center.tsx` | 1335 | `useSchoolMutation` | `/api/exams/draft` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/exams/draft")` |
| `web\src\components\school\exams-manager-command-center.tsx` | 1336 | `useSchoolMutation` | `/api/exams/alignment` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/exams/alignment")` |
| `web\src\components\school\exams-manager-command-center.tsx` | 1337 | `useSchoolMutation` | `/api/exams/marks` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/exams/marks")` |
| `web\src\components\school\exams-manager-command-center.tsx` | 1338 | `useSchoolMutation` | `/api/exams/review` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/exams/review")` |
| `web\src\components\school\exams-manager-command-center.tsx` | 1339 | `useSchoolMutation` | `/api/exams/lifecycle` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/exams/lifecycle")` |
| `web\src\components\school\exams-manager\analysis-workspace.tsx` | 28 | `useSchoolQuery` | `/admin-command/exams-manager/analysis` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/exams-manager/analysis')` |
| `web\src\components\school\exams-manager\exam-setup-workspace.tsx` | 34 | `useSchoolQuery` | `/admin-command/exams-manager/exam-setup` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/exams-manager/exam-setup')` |
| `web\src\components\school\exams-manager\exam-timetable-workspace.tsx` | 33 | `useSchoolQuery` | `/admin-command/exams-manager/exam-timetable` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/exams-manager/exam-timetable')` |
| `web\src\components\school\exams-manager\marks-entry-workspace.tsx` | 34 | `useSchoolQuery` | `/admin-command/exams-manager/marks-entry` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/exams-manager/marks-entry')` |
| `web\src\components\school\exams-manager\moderation-workspace.tsx` | 34 | `useSchoolQuery` | `/admin-command/exams-manager/moderation` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/exams-manager/moderation')` |
| `web\src\components\school\exams-manager\overview-workspace.tsx` | 31 | `useSchoolQuery` | `/admin-command/exams-manager/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/exams-manager/overview')` |
| `web\src\components\school\exams-manager\publishing-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/exams-manager/publishing` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/exams-manager/publishing')` |
| `web\src\components\school\exams-manager\report-cards-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/exams-manager/report-cards` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/exams-manager/report-cards')` |
| `web\src\components\school\exams-manager\reports-workspace.tsx` | 22 | `useSchoolQuery` | `/admin-command/exams-manager/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/exams-manager/reports')` |
| `web\src\components\school\grade-master-command-center.tsx` | 288 | `useSchoolQuery` | `/api/grade-master/overview` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/grade-master/overview", { enabled: !!liveSession.sessi...)` |
| `web\src\components\school\grade-master-command-center.tsx` | 383 | `apiString` | `/api/academic/communications` | `POST (Guess)` | Literal string usage | `await requestDashboardApi("/api/academic/communications", { method: "POST", body: JSON.stringify({ type: "teacher_message" }) });` |
| `web\src\components\school\grade-master-command-center.tsx` | 458 | `apiString` | `/api/academic/grade-master/compile` | `POST (Guess)` | Literal string usage | `await requestDashboardApi("/api/academic/grade-master/compile", { method: "POST", body: JSON.stringify({ action }) });` |
| `web\src\components\school\grade-master-command-center.tsx` | 529 | `apiString` | `/api/academic/communications` | `POST (Guess)` | Literal string usage | `await requestDashboardApi("/api/academic/communications", { method: "POST", body: JSON.stringify({ type: "bulk_notice" }) });` |
| `web\src\components\school\grade-master-command-center.tsx` | 599 | `apiString` | `/api/academic/grade-master/comment` | `POST (Guess)` | Literal string usage | `await requestDashboardApi("/api/academic/grade-master/comment", { method: "POST", body: JSON.stringify({ action: "add_comment" }) });` |
| `web\src\components\school\guidance-counselling\follow-ups-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/guidance-counselling/follow-ups` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/guidance-counselling/follow-ups')` |
| `web\src\components\school\guidance-counselling\overview-workspace.tsx` | 23 | `useSchoolQuery` | `/admin-command/guidance-counselling/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/guidance-counselling/overview')` |
| `web\src\components\school\guidance-counselling\parent-engagement-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/guidance-counselling/parent-engagement` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/guidance-counselling/parent-engagement')` |
| `web\src\components\school\guidance-counselling\referrals-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/guidance-counselling/referrals` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/guidance-counselling/referrals')` |
| `web\src\components\school\guidance-counselling\reports-workspace.tsx` | 22 | `useSchoolQuery` | `/admin-command/guidance-counselling/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/guidance-counselling/reports')` |
| `web\src\components\school\guidance-counselling\sessions-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/guidance-counselling/sessions` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/guidance-counselling/sessions')` |
| `web\src\components\school\guidance-counselling\welfare-notes-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/guidance-counselling/welfare-notes` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/guidance-counselling/welfare-notes')` |
| `web\src\components\school\hod-command-center.tsx` | 182 | `useSchoolQuery` | `/api/academics/my-assignments` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/academics/my-assignments", { enabled: !!liveSession.se...)` |
| `web\src\components\school\hod-command-center.tsx` | 183 | `useSchoolQuery` | `/api/academics/my-lesson-logs` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/academics/my-lesson-logs", { enabled: !!liveSession.se...)` |
| `web\src\components\school\hod-command-center.tsx` | 239 | `useSchoolQuery` | `/api/hr/staff?department=academics` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/hr/staff?department=academics", { enabled: !!liveSessi...)` |
| `web\src\components\school\hod-command-center.tsx` | 246 | `apiString` | `/api/academic/hod/requests` | `GET` | Literal string usage | `const response = await requestDashboardApi("/api/academic/hod/requests", {` |
| `web\src\components\school\hod-command-center.tsx` | 309 | `useSchoolQuery` | `/api/academics/teacher-assignments` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/academics/teacher-assignments", { enabled: !!liveSessi...)` |
| `web\src\components\school\hod-command-center.tsx` | 319 | `apiString` | `/api/academic/hod/subject-allocation` | `GET` | Literal string usage | `const response = await requestDashboardApi("/api/academic/hod/subject-allocation", {` |
| `web\src\components\school\hod-command-center.tsx` | 417 | `apiString` | `/api/academic/hod/department-meetings` | `GET` | Literal string usage | `const response = await requestDashboardApi("/api/academic/hod/department-meetings", {` |
| `web\src\components\school\hod-command-center.tsx` | 472 | `useSchoolQuery` | `/api/academics/summary` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/academics/summary", { enabled: !!liveSession.session })` |
| `web\src\components\school\hod-command-center.tsx` | 480 | `apiString` | `/api/academic/hod/requests` | `GET` | Literal string usage | `const response = await requestDashboardApi("/api/academic/hod/requests", {` |
| `web\src\components\school\hod-command-center.tsx` | 497 | `apiString` | `/api/academic/hod/requests` | `GET` | Literal string usage | `const response = await requestDashboardApi("/api/academic/hod/requests", {` |
| `web\src\components\school\hod-dashboard\department-overview-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/hod/department-overview` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/hod/department-overview")` |
| `web\src\components\school\hod-dashboard\review-queue-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/hod/review-queue` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/hod/review-queue")` |
| `web\src\components\school\hod\coverage-review-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/hod/coverage-review` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/hod/coverage-review')` |
| `web\src\components\school\hod\department-teachers-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/hod/department-teachers` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/hod/department-teachers')` |
| `web\src\components\school\hod\lesson-plans-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/hod/lesson-plans` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/hod/lesson-plans')` |
| `web\src\components\school\hod\marks-moderation-workspace.tsx` | 28 | `useSchoolQuery` | `/admin-command/hod/marks-moderation` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/hod/marks-moderation')` |
| `web\src\components\school\hod\overview-workspace.tsx` | 23 | `useSchoolQuery` | `/admin-command/hod/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/hod/overview')` |
| `web\src\components\school\hod\reports-workspace.tsx` | 22 | `useSchoolQuery` | `/admin-command/hod/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/hod/reports')` |
| `web\src\components\school\hod\resource-requests-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/hod/resource-requests` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/hod/resource-requests')` |
| `web\src\components\school\hod\subject-allocation-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/hod/subject-allocation` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/hod/subject-allocation')` |
| `web\src\components\school\ict-manager-command-center.tsx` | 35 | `useSchoolQuery` | `/api/support/tickets?limit=5` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/support/tickets?limit=5")` |
| `web\src\components\school\ict-manager-command-center.tsx` | 36 | `useSchoolQuery` | `/api/observability/alerts` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/observability/alerts")` |
| `web\src\components\school\ict-manager-command-center.tsx` | 37 | `useSchoolQuery` | `/api/observability/health` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/observability/health")` |
| `web\src\components\school\ict-manager-command-center.tsx` | 38 | `useSchoolQuery` | `/api/assets/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/assets/dashboard")` |
| `web\src\components\school\ict-manager-command-center.tsx` | 90 | `useSchoolQuery` | `/api/support/tickets` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/support/tickets")` |
| `web\src\components\school\ict-manager-command-center.tsx` | 134 | `useSchoolQuery` | `/api/assets/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/assets/dashboard")` |
| `web\src\components\school\ict-manager-command-center.tsx` | 186 | `useSchoolQuery` | `/api/observability/alerts` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/observability/alerts")` |
| `web\src\components\school\ict-manager-command-center.tsx` | 228 | `useSchoolQuery` | `/api/support/tickets` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/support/tickets")` |
| `web\src\components\school\ict-manager-command-center.tsx` | 229 | `useSchoolQuery` | `/api/observability/alerts` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/observability/alerts")` |
| `web\src\components\school\ict-manager-command-center.tsx` | 230 | `useSchoolQuery` | `/api/health` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/health")` |
| `web\src\components\school\ict-manager-command-center.tsx` | 231 | `useSchoolQuery` | `/api/assets` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/assets")` |
| `web\src\components\school\ict-manager\asset-assignment-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/ict-manager/asset-assignment` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/ict-manager/asset-assignment')` |
| `web\src\components\school\ict-manager\assets-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/ict-manager/assets` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/ict-manager/assets')` |
| `web\src\components\school\ict-manager\facilities-issues-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/ict-manager/facilities-issues` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/ict-manager/facilities-issues')` |
| `web\src\components\school\ict-manager\loans-returns-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/ict-manager/loans-returns` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/ict-manager/loans-returns')` |
| `web\src\components\school\ict-manager\maintenance-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/ict-manager/maintenance` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/ict-manager/maintenance')` |
| `web\src\components\school\ict-manager\overview-workspace.tsx` | 23 | `useSchoolQuery` | `/admin-command/ict-manager/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/ict-manager/overview')` |
| `web\src\components\school\ict-manager\reports-workspace.tsx` | 22 | `useSchoolQuery` | `/admin-command/ict-manager/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/ict-manager/reports')` |
| `web\src\components\school\laboratory-technician-command-center.tsx` | 169 | `useSchoolQuery` | `/api/labs/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/labs/dashboard")` |
| `web\src\components\school\laboratory-technician\apparatus-issue-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/laboratory-technician/apparatus-issue` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/laboratory-technician/apparatus-issue')` |
| `web\src\components\school\laboratory-technician\chemicals-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/laboratory-technician/chemicals` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/laboratory-technician/chemicals')` |
| `web\src\components\school\laboratory-technician\lab-inventory-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/laboratory-technician/lab-inventory` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/laboratory-technician/lab-inventory')` |
| `web\src\components\school\laboratory-technician\lab-timetable-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/laboratory-technician/lab-timetable` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/laboratory-technician/lab-timetable')` |
| `web\src\components\school\laboratory-technician\overview-workspace.tsx` | 23 | `useSchoolQuery` | `/admin-command/laboratory-technician/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/laboratory-technician/overview')` |
| `web\src\components\school\laboratory-technician\reports-workspace.tsx` | 22 | `useSchoolQuery` | `/admin-command/laboratory-technician/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/laboratory-technician/reports')` |
| `web\src\components\school\laboratory-technician\safety-incidents-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/laboratory-technician/safety-incidents` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/laboratory-technician/safety-incidents')` |
| `web\src\components\school\librarian-command-center.tsx` | 171 | `useSchoolQuery` | `/api/library/summary` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/library/summary")` |
| `web\src\components\school\librarian-command-center.tsx` | 172 | `useSchoolQuery` | `/api/library/circulation` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/library/circulation")` |
| `web\src\components\school\librarian-command-center.tsx` | 330 | `apiString` | `/api/admin-command/library/issue` | `GET` | Literal string usage | `await requestDashboardApi("/api/admin-command/library/issue", {` |
| `web\src\components\school\librarian-command-center.tsx` | 434 | `apiString` | `/api/admin-command/library/return` | `GET` | Literal string usage | `await requestDashboardApi("/api/admin-command/library/return", {` |
| `web\src\components\school\librarian-command-center.tsx` | 481 | `apiString` | `/api/admin-command/library/add` | `POST (Guess)` | Literal string usage | `await requestDashboardApi("/api/admin-command/library/add", {` |
| `web\src\components\school\librarian-command-center.tsx` | 535 | `useSchoolQuery` | `/api/library/catalog` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/library/catalog")` |
| `web\src\components\school\librarian\books-workspace.tsx` | 32 | `useSchoolQuery` | `/admin-command/librarian/books` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/librarian/books')` |
| `web\src\components\school\librarian\borrowers-workspace.tsx` | 30 | `useSchoolQuery` | `/admin-command/librarian/borrowers` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/librarian/borrowers')` |
| `web\src\components\school\librarian\fines-lost-damaged-workspace.tsx` | 33 | `useSchoolQuery` | `/admin-command/librarian/fines-lost-damaged` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/librarian/fines-lost-damaged')` |
| `web\src\components\school\librarian\issue-book-workspace.tsx` | 31 | `useSchoolQuery` | `/admin-command/librarian/issue-book` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/librarian/issue-book')` |
| `web\src\components\school\librarian\overdue-books-workspace.tsx` | 34 | `useSchoolQuery` | `/admin-command/librarian/overdue-books` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/librarian/overdue-books')` |
| `web\src\components\school\librarian\overview-workspace.tsx` | 30 | `useSchoolQuery` | `/admin-command/librarian/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/librarian/overview')` |
| `web\src\components\school\librarian\reports-workspace.tsx` | 30 | `useSchoolQuery` | `/admin-command/librarian/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/librarian/reports')` |
| `web\src\components\school\librarian\return-book-workspace.tsx` | 32 | `useSchoolQuery` | `/admin-command/librarian/return-book` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/librarian/return-book')` |
| `web\src\components\school\nurse-command-center.tsx` | 23 | `apiString` | `/api/admin-command/clinic/visit` | `GET` | Literal string usage | `await requestDashboardApi("/api/admin-command/clinic/visit", {` |
| `web\src\components\school\nurse\dispensing-log-workspace.tsx` | 28 | `useSchoolQuery` | `/admin-command/nurse/dispensing-log` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/nurse/dispensing-log')` |
| `web\src\components\school\nurse\health-reports-workspace.tsx` | 28 | `useSchoolQuery` | `/admin-command/nurse/health-reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/nurse/health-reports')` |
| `web\src\components\school\nurse\medicine-inventory-workspace.tsx` | 28 | `useSchoolQuery` | `/admin-command/nurse/medicine-inventory` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/nurse/medicine-inventory')` |
| `web\src\components\school\nurse\overview-workspace.tsx` | 28 | `useSchoolQuery` | `/admin-command/nurse/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/nurse/overview')` |
| `web\src\components\school\nurse\parent-notifications-workspace.tsx` | 28 | `useSchoolQuery` | `/admin-command/nurse/parent-notifications` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/nurse/parent-notifications')` |
| `web\src\components\school\nurse\sick-bay-queue-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/nurse/sick-bay-queue` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/nurse/sick-bay-queue')` |
| `web\src\components\school\nurse\visits-workspace.tsx` | 28 | `useSchoolQuery` | `/admin-command/nurse/visits` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/nurse/visits')` |
| `web\src\components\school\operational-blueprint-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/school/operational-blueprint` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/school/operational-blueprint")` |
| `web\src\components\school\parent\academics-workspace.tsx` | 10 | `useSchoolQuery` | `/api/academics/my-assignments` | `GET` | Query / Path variables from context | `useSchoolQuery('/api/academics/my-assignments')` |
| `web\src\components\school\parent\academics-workspace.tsx` | 11 | `useSchoolQuery` | `/api/exams/report-cards` | `GET` | Query / Path variables from context | `useSchoolQuery('/api/exams/report-cards')` |
| `web\src\components\school\parent\academics-workspace.tsx` | 12 | `useSchoolQuery` | `/api/exams/marks` | `GET` | Query / Path variables from context | `useSchoolQuery('/api/exams/marks')` |
| `web\src\components\school\parent\behavior-workspace.tsx` | 13 | `apiString` | `/api/discipline/parent/incidents` | `GET` | Literal string usage | `const { data: incidentsData, isLoading: incidentsLoading, refetch } = useSchoolQuery<{ data?: any[] }>('/api/discipline/parent/incidents');` |
| `web\src\components\school\parent\behavior-workspace.tsx` | 16 | `apiString` | `/api/discipline/students/me/behavior-score` | `GET` | Literal string usage | `const { data: scoreData, isLoading: scoreLoading } = useSchoolQuery<{ score?: number }>('/api/discipline/students/me/behavior-score');` |
| `web\src\components\school\parent\behavior-workspace.tsx` | 30 | `apiString` | `/api/parent-portal/behavior/acknowledge` | `GET` | Literal string usage | `await requestDashboardApi(`/api/parent-portal/behavior/acknowledge`, {` |
| `web\src\components\school\parent\clinic-health-workspace.tsx` | 10 | `apiString` | `/api/clinic/parent/students/me/history` | `GET` | Literal string usage | `const { data: historyData, isLoading } = useSchoolQuery<{ visits?: any[]; allergies?: string[]; medications?: any[] }>('/api/clinic/parent/students/me/history');` |
| `web\src\components\school\parent\dashboard-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/parent/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/parent/dashboard")` |
| `web\src\components\school\parent\downloads-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/parent/downloads` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/parent/downloads")` |
| `web\src\components\school\parent\fees-workspace.tsx` | 15 | `useSchoolQuery` | `/api/finance/accounts-overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/api/finance/accounts-overview')` |
| `web\src\components\school\parent\fees-workspace.tsx` | 16 | `useSchoolQuery` | `/api/finance/collections` | `GET` | Query / Path variables from context | `useSchoolQuery('/api/finance/collections')` |
| `web\src\components\school\parent\fees-workspace.tsx` | 17 | `useSchoolQuery` | `/api/finance/invoices` | `GET` | Query / Path variables from context | `useSchoolQuery('/api/finance/invoices')` |
| `web\src\components\school\parent\fees-workspace.tsx` | 22 | `apiString` | `/api/parent-portal/fees/pay` | `GET` | Literal string usage | `await requestDashboardApi("/api/parent-portal/fees/pay", {` |
| `web\src\components\school\parent\health-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/parent/health` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/parent/health")` |
| `web\src\components\school\parent\messages-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/parent/messages` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/parent/messages")` |
| `web\src\components\school\parent\notifications-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/parent/notifications` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/parent/notifications")` |
| `web\src\components\school\principal-dashboard\academic-setup-workspace.tsx` | 24 | `useSchoolQuery` | `/admin-command/principal/academic-setup` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/academic-setup')` |
| `web\src\components\school\principal-dashboard\academic-setup-workspace.tsx` | 26 | `useSchoolQuery` | `/academics/academic-years` | `GET` | Query / Path variables from context | `useSchoolQuery('/academics/academic-years')` |
| `web\src\components\school\principal-dashboard\academic-setup-workspace.tsx` | 95 | `useSchoolQuery` | `/academics/grading-systems` | `GET` | Query / Path variables from context | `useSchoolQuery('/academics/grading-systems')` |
| `web\src\components\school\principal-dashboard\academic-setup-workspace.tsx` | 96 | `useSchoolQuery` | `/academics/attendance-settings` | `GET` | Query / Path variables from context | `useSchoolQuery('/academics/attendance-settings')` |
| `web\src\components\school\principal-dashboard\academic-setup-workspace.tsx` | 97 | `useSchoolQuery` | `/academics/report-card-settings` | `GET` | Query / Path variables from context | `useSchoolQuery('/academics/report-card-settings')` |
| `web\src\components\school\principal-dashboard\academics-workspace.tsx` | 17 | `useSchoolQuery` | `/admin-command/principal/academics` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/academics')` |
| `web\src\components\school\principal-dashboard\approvals-workspace.tsx` | 16 | `useSchoolQuery` | `/admin-command/principal/approvals` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/approvals')` |
| `web\src\components\school\principal-dashboard\attendance-workspace.tsx` | 24 | `useSchoolQuery` | `/admin-command/principal/attendance` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/attendance')` |
| `web\src\components\school\principal-dashboard\classes-streams-workspace.tsx` | 24 | `useSchoolQuery` | `/admin-command/principal/classes` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/classes')` |
| `web\src\components\school\principal-dashboard\classes-streams-workspace.tsx` | 25 | `useSchoolQuery` | `/academics/academic-years` | `GET` | Query / Path variables from context | `useSchoolQuery('/academics/academic-years')` |
| `web\src\components\school\principal-dashboard\classes-streams-workspace.tsx` | 26 | `useSchoolQuery` | `/academics/class-sections` | `GET` | Query / Path variables from context | `useSchoolQuery('/academics/class-sections')` |
| `web\src\components\school\principal-dashboard\communication-workspace.tsx` | 24 | `useSchoolQuery` | `/admin-command/principal/communication` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/communication')` |
| `web\src\components\school\principal-dashboard\communication-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/communication-templates` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/communication-templates')` |
| `web\src\components\school\principal-dashboard\discipline-workspace.tsx` | 22 | `useSchoolQuery` | `/admin-command/principal/discipline` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/discipline')` |
| `web\src\components\school\principal-dashboard\exams-reports-workspace.tsx` | 23 | `useSchoolQuery` | `/admin-command/principal/exams` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/exams')` |
| `web\src\components\school\principal-dashboard\finance-overview-workspace.tsx` | 22 | `useSchoolQuery` | `/admin-command/principal/finance-overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/finance-overview')` |
| `web\src\components\school\principal-dashboard\finance-overview-workspace.tsx` | 23 | `useSchoolQuery` | `/finance/fee-categories` | `GET` | Query / Path variables from context | `useSchoolQuery('/finance/fee-categories')` |
| `web\src\components\school\principal-dashboard\overview-workspace.tsx` | 23 | `useSchoolQuery` | `/admin-command/principal/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/overview')` |
| `web\src\components\school\principal-dashboard\reports-workspace.tsx` | 23 | `useSchoolQuery` | `/admin-command/principal/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/reports')` |
| `web\src\components\school\principal-dashboard\school-profile-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/principal/school-profile` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/school-profile')` |
| `web\src\components\school\principal-dashboard\settings-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/principal/settings` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/settings')` |
| `web\src\components\school\principal-dashboard\setup-checklist-workspace.tsx` | 14 | `useSchoolQuery` | `/admin-command/principal/setup-checklist` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/setup-checklist')` |
| `web\src\components\school\principal-dashboard\staff-roles-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/principal/staff` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/staff')` |
| `web\src\components\school\principal-dashboard\staff-roles-workspace.tsx` | 26 | `useSchoolQuery` | `/academics/academic-terms` | `GET` | Query / Path variables from context | `useSchoolQuery('/academics/academic-terms')` |
| `web\src\components\school\principal-dashboard\staff-roles-workspace.tsx` | 27 | `useSchoolQuery` | `/academics/academic-years` | `GET` | Query / Path variables from context | `useSchoolQuery('/academics/academic-years')` |
| `web\src\components\school\principal-dashboard\staff-roles-workspace.tsx` | 28 | `useSchoolQuery` | `/academics/class-sections` | `GET` | Query / Path variables from context | `useSchoolQuery('/academics/class-sections')` |
| `web\src\components\school\principal-dashboard\staff-roles-workspace.tsx` | 29 | `useSchoolQuery` | `/academics/subjects` | `GET` | Query / Path variables from context | `useSchoolQuery('/academics/subjects')` |
| `web\src\components\school\principal-dashboard\staff-roles-workspace.tsx` | 30 | `useSchoolQuery` | `/academics/class-teachers` | `GET` | Query / Path variables from context | `useSchoolQuery('/academics/class-teachers')` |
| `web\src\components\school\principal-dashboard\students-workspace.tsx` | 24 | `useSchoolQuery` | `/admin-command/principal/students` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/students')` |
| `web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx` | 24 | `useSchoolQuery` | `/admin-command/principal/subjects` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/subjects')` |
| `web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx` | 25 | `useSchoolQuery` | `/academics/academic-years` | `GET` | Query / Path variables from context | `useSchoolQuery('/academics/academic-years')` |
| `web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx` | 26 | `useSchoolQuery` | `/academics/subjects` | `GET` | Query / Path variables from context | `useSchoolQuery('/academics/subjects')` |
| `web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx` | 27 | `useSchoolQuery` | `/academics/departments` | `GET` | Query / Path variables from context | `useSchoolQuery('/academics/departments')` |
| `web\src\components\school\principal-dashboard\teaching-workspace.tsx` | 16 | `useSchoolQuery` | `/admin-command/principal/teaching` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/teaching')` |
| `web\src\components\school\principal\academic-setup-workspace.tsx` | 18 | `useSchoolQuery` | `/admin-command/principal/academic-setup` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/academic-setup')` |
| `web\src\components\school\principal\academics-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/principal/academics` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/academics')` |
| `web\src\components\school\principal\approvals-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/principal/approvals` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/approvals')` |
| `web\src\components\school\principal\attendance-monitoring-workspace.tsx` | 32 | `useSchoolQuery` | `/admin-command/principal/attendance-monitoring` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/attendance-monitoring')` |
| `web\src\components\school\principal\classes-streams-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/principal/classes-streams` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/classes-streams')` |
| `web\src\components\school\principal\communication-workspace.tsx` | 31 | `useSchoolQuery` | `/admin-command/principal/communication` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/communication')` |
| `web\src\components\school\principal\discipline-workspace.tsx` | 28 | `useSchoolQuery` | `/admin-command/principal/discipline` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/discipline')` |
| `web\src\components\school\principal\exams-report-cards-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/principal/exams-report-cards` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/exams-report-cards')` |
| `web\src\components\school\principal\finance-overview-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/principal/finance-overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/finance-overview')` |
| `web\src\components\school\principal\overview-workspace.tsx` | 30 | `useSchoolQuery` | `/admin-command/principal/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/overview')` |
| `web\src\components\school\principal\reports-workspace.tsx` | 22 | `useSchoolQuery` | `/admin-command/principal/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/reports')` |
| `web\src\components\school\principal\school-profile-workspace.tsx` | 30 | `useSchoolQuery` | `/admin-command/principal/school-profile` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/school-profile')` |
| `web\src\components\school\principal\setup-checklist-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/principal/setup-checklist` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/setup-checklist')` |
| `web\src\components\school\principal\staff-roles-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/principal/staff-roles` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/staff-roles')` |
| `web\src\components\school\principal\students-workspace.tsx` | 28 | `useSchoolQuery` | `/admin-command/principal/students` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/students')` |
| `web\src\components\school\principal\subjects-departments-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/principal/subjects-departments` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/principal/subjects-departments')` |
| `web\src\components\school\procurement-officer-command-center.tsx` | 37 | `useSchoolQuery` | `/api/inventory/purchase-orders?limit=5` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/inventory/purchase-orders?limit=5")` |
| `web\src\components\school\procurement-officer-command-center.tsx` | 38 | `useSchoolQuery` | `/api/inventory/requests?status=pending` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/inventory/requests?status=pending")` |
| `web\src\components\school\procurement-officer-command-center.tsx` | 39 | `useSchoolQuery` | `/api/inventory/summary` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/inventory/summary")` |
| `web\src\components\school\procurement-officer-command-center.tsx` | 89 | `useSchoolQuery` | `/api/inventory/purchase-orders` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/inventory/purchase-orders")` |
| `web\src\components\school\procurement-officer-command-center.tsx` | 133 | `useSchoolQuery` | `/api/inventory/suppliers` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/inventory/suppliers")` |
| `web\src\components\school\procurement-officer-command-center.tsx` | 175 | `useSchoolQuery` | `/api/inventory/requests` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/inventory/requests")` |
| `web\src\components\school\procurement-officer\deliveries-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/procurement-officer/deliveries` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/procurement-officer/deliveries')` |
| `web\src\components\school\procurement-officer\overview-workspace.tsx` | 23 | `useSchoolQuery` | `/admin-command/procurement-officer/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/procurement-officer/overview')` |
| `web\src\components\school\procurement-officer\purchase-orders-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/procurement-officer/purchase-orders` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/procurement-officer/purchase-orders')` |
| `web\src\components\school\procurement-officer\purchase-requests-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/procurement-officer/purchase-requests` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/procurement-officer/purchase-requests')` |
| `web\src\components\school\procurement-officer\quotations-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/procurement-officer/quotations` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/procurement-officer/quotations')` |
| `web\src\components\school\procurement-officer\reports-workspace.tsx` | 22 | `useSchoolQuery` | `/admin-command/procurement-officer/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/procurement-officer/reports')` |
| `web\src\components\school\procurement-officer\suppliers-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/procurement-officer/suppliers` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/procurement-officer/suppliers')` |
| `web\src\components\school\registrar-command-center.tsx` | 1004 | `useSchoolQuery` | `/admin-command/admissions/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/admissions/dashboard')` |
| `web\src\components\school\registrar-command-center.tsx` | 1099 | `apiString` | `/api/admissions/applications/${selectedApplicantPreview.id}/approve` | `GET` | Literal string usage | `await requestDashboardApi(`/api/admissions/applications/${selectedApplicantPreview.id}/approve`, {` |
| `web\src\components\school\registrar-command-center.tsx` | 1167 | `apiString` | `/api/admissions/quick-actions` | `GET` | Literal string usage | `await requestDashboardApi("/api/admissions/quick-actions", {` |
| `web\src\components\school\role-operational-command-center.tsx` | 4905 | `useSchoolQuery` | `/api/clinic/visits` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/clinic/visits")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4907 | `useSchoolMutation` | `/api/clinic/visits` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/clinic/visits")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4909 | `useSchoolQuery` | `/api/clinic/medicines/stock` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/clinic/medicines/stock")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4911 | `useSchoolMutation` | `/api/clinic/medicines/stock` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/clinic/medicines/stock")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4914 | `useSchoolQuery` | `/api/admissions/applicants` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/admissions/applicants")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4916 | `useSchoolMutation` | `/api/admissions/applicants` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/admissions/applicants")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4919 | `useSchoolQuery` | `/api/library/books` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/library/books")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4921 | `useSchoolMutation` | `/api/library/books` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/library/books")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4923 | `useSchoolQuery` | `/api/library/loans` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/library/loans")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4925 | `useSchoolMutation` | `/api/library/loans` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/library/loans")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4931 | `useSchoolQuery` | `/api/boarding/roll-calls` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/boarding/roll-calls")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4933 | `useSchoolMutation` | `/api/boarding/roll-calls` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/boarding/roll-calls")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4935 | `useSchoolQuery` | `/api/boarding/exeats` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/boarding/exeats")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4937 | `useSchoolMutation` | `/api/boarding/exeats` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/boarding/exeats")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4941 | `useSchoolQuery` | `/api/transport/vehicles` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/transport/vehicles")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4943 | `useSchoolMutation` | `/api/transport/vehicles` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/transport/vehicles")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4945 | `useSchoolQuery` | `/api/transport/trips` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/transport/trips")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4947 | `useSchoolMutation` | `/api/transport/trips` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/transport/trips")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4950 | `useSchoolQuery` | `/api/labs/inventory` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/labs/inventory")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4952 | `useSchoolMutation` | `/api/labs/inventory` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/labs/inventory")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4954 | `useSchoolQuery` | `/api/labs/requests` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/labs/requests")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4956 | `useSchoolMutation` | `/api/labs/requests` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/labs/requests")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4958 | `useSchoolQuery` | `/api/labs/issues` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/labs/issues")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4960 | `useSchoolMutation` | `/api/labs/issues` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/labs/issues")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4963 | `useSchoolQuery` | `/api/finance/balances` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/finance/balances")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4965 | `useSchoolMutation` | `/api/finance/balances` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/finance/balances")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4967 | `useSchoolQuery` | `/api/finance/payments` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/finance/payments")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4969 | `useSchoolMutation` | `/api/finance/payments` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/finance/payments")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4973 | `useSchoolQuery` | `/api/secretary/visitors` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/secretary/visitors")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4975 | `useSchoolMutation` | `/api/secretary/visitors` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/secretary/visitors")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4977 | `useSchoolQuery` | `/api/secretary/inquiries` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/secretary/inquiries")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4979 | `useSchoolMutation` | `/api/secretary/inquiries` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/secretary/inquiries")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4983 | `useSchoolQuery` | `/api/support/discipline` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/support/discipline")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4985 | `useSchoolMutation` | `/api/support/discipline` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/support/discipline")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4989 | `useSchoolQuery` | `/api/support/counselling` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/support/counselling")` |
| `web\src\components\school\role-operational-command-center.tsx` | 4991 | `useSchoolMutation` | `/api/support/counselling` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/support/counselling")` |
| `web\src\components\school\school-finance-page.tsx` | 271 | `fetch` | `buildBillingApiPath("/api/finance/summary", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/finance/summary", tenantSlug), {
 ...)` |
| `web\src\components\school\school-finance-page.tsx` | 287 | `fetch` | `buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/billing/finance-activity?limit=25&...)` |
| `web\src\components\school\school-finance-page.tsx` | 311 | `fetch` | `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/billing/student-balances", tenantS...)` |
| `web\src\components\school\school-finance-page.tsx` | 348 | `fetch` | `buildBillingApiPath(`/api/billing/reconciliation?${params.toString()}`, tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(`/api/billing/reconciliation?${...)` |
| `web\src\components\school\school-finance-page.tsx` | 379 | `fetch` | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlu...)` |
| `web\src\components\school\school-finance-page.tsx` | 454 | `fetch` | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        )` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(
          `/api/billing/studen...)` |
| `web\src\components\school\school-finance-page.tsx` | 487 | `fetch` | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        )` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(
          `/api/billing/studen...)` |
| `web\src\components\school\school-finance-page.tsx` | 535 | `fetch` | `buildBillingApiPath(`/api/billing/reconciliation/export?${params.toString()}`, tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(`/api/billing/reconciliation/ex...)` |
| `web\src\components\school\school-finance-page.tsx` | 676 | `fetch` | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },         body: JSON.stringify({           name: feeStructureDraft.name.trim(),           academic_year: feeStructureDraft.academic_year.trim(),           term: feeStructureDraft.term.trim(),           grade_level: feeStructureDraft.grade_level.trim(),           class_name: feeStructureDraft.class_name.trim() || undefined,           status: feeStructureDraft.status,           due_days: dueDays,           line_items: lineItemResult.lineItems,           metadata: {             source: "school_finance_fee_setup",           },         }),       } | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlu...)` |
| `web\src\components\school\school-finance-page.tsx` | 725 | `fetch` | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`, tenantSlug)` | `POST` | Request options: {           method: "POST",           headers: {             "Content-Type": "application/json",             "x-myshule-csrf": csrfToken,           },         } | `fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${...)` |
| `web\src\components\school\school-finance-page.tsx` | 778 | `fetch` | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`, tenantSlug)` | `POST` | Request options: {           method: "POST",           headers: {             "Content-Type": "application/json",             "x-myshule-csrf": csrfToken,           },           body: JSON.stringify({             idempotency_key: idempotencyKey,             due_at: bulkDraft.due_at.trim()               ? new Date(`${bulkDraft.due_at.trim()}T23:59:59.000Z`).toISOString()               : undefined,             target_students: studentResult.students.map((student) => ({               student_id: student.student_id,               student_name: student.student_name,               admission_number: student.admission_number || undefined,               class_name: student.class_name || undefined,               guardian_phone: student.guardian_phone || undefined,             })),             metadata: {               source: "school_finance_bulk_billing",             },           }),         } | `fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${...)` |
| `web\src\components\school\school-finance-page.tsx` | 838 | `fetch` | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`, tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${...)` |
| `web\src\components\school\school-finance-page.tsx` | 893 | `fetch` | `buildBillingApiPath("/api/billing/invoices", tenantSlug)` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },         body: JSON.stringify({           description: `Fees for ${invoiceDraft.studentName.trim()}`,           total_amount_minor: amountMinor,           due_at: invoiceDraft.dueAt.trim()             ? new Date(invoiceDraft.dueAt.trim()).toISOString()             : undefined,           metadata: {             student_id: invoiceDraft.studentId.trim(),             student_name: invoiceDraft.studentName.trim(),           },         }),       } | `fetch(buildBillingApiPath("/api/billing/invoices", tenantSlug), {
...)` |
| `web\src\components\school\school-finance-page.tsx` | 949 | `fetch` | `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },         body: JSON.stringify({           idempotency_key: `finance-quick-${Date.now()}-${Math.random().toString(36).slice(2)}`,           payment_method: paymentDraft.payment_method,           amount_minor: amountMinor,           student_id: paymentDraft.student_id.trim() || undefined,           invoice_id: paymentDraft.invoice_id.trim() || undefined,           payer_name: paymentDraft.payer_name.trim() || undefined,           deposit_reference: paymentDraft.reference.trim(),           external_reference: paymentDraft.reference.trim(),           metadata: {             source: "school_finance_quick_entry",             student_name: paymentDraft.payer_name.trim() || undefined,           },         }),       } | `fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tena...)` |
| `web\src\components\school\school-pages.tsx` | 1117 | `fetch` | `buildBillingApiPath("/api/finance/summary", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/finance/summary", tenantSlug), {
 ...)` |
| `web\src\components\school\school-pages.tsx` | 1133 | `fetch` | `buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/billing/finance-activity?limit=25&...)` |
| `web\src\components\school\school-pages.tsx` | 1157 | `fetch` | `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/billing/student-balances", tenantS...)` |
| `web\src\components\school\school-pages.tsx` | 1194 | `fetch` | `buildBillingApiPath(`/api/billing/reconciliation?${params.toString()}`, tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(`/api/billing/reconciliation?${...)` |
| `web\src\components\school\school-pages.tsx` | 1225 | `fetch` | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `GET` | Request options: {         cache: "no-store",       } | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlu...)` |
| `web\src\components\school\school-pages.tsx` | 1300 | `fetch` | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        )` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(
          `/api/billing/studen...)` |
| `web\src\components\school\school-pages.tsx` | 1333 | `fetch` | `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        )` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(
          `/api/billing/studen...)` |
| `web\src\components\school\school-pages.tsx` | 1381 | `fetch` | `buildBillingApiPath(`/api/billing/reconciliation/export?${params.toString()}`, tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(`/api/billing/reconciliation/ex...)` |
| `web\src\components\school\school-pages.tsx` | 1522 | `fetch` | `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },         body: JSON.stringify({           name: feeStructureDraft.name.trim(),           academic_year: feeStructureDraft.academic_year.trim(),           term: feeStructureDraft.term.trim(),           grade_level: feeStructureDraft.grade_level.trim(),           class_name: feeStructureDraft.class_name.trim() || undefined,           status: feeStructureDraft.status,           due_days: dueDays,           line_items: lineItemResult.lineItems,           metadata: {             source: "school_finance_fee_setup",           },         }),       } | `fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlu...)` |
| `web\src\components\school\school-pages.tsx` | 1571 | `fetch` | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`, tenantSlug)` | `POST` | Request options: {           method: "POST",           headers: {             "Content-Type": "application/json",             "x-myshule-csrf": csrfToken,           },         } | `fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${...)` |
| `web\src\components\school\school-pages.tsx` | 1624 | `fetch` | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`, tenantSlug)` | `POST` | Request options: {           method: "POST",           headers: {             "Content-Type": "application/json",             "x-myshule-csrf": csrfToken,           },           body: JSON.stringify({             idempotency_key: idempotencyKey,             due_at: bulkDraft.due_at.trim()               ? new Date(`${bulkDraft.due_at.trim()}T23:59:59.000Z`).toISOString()               : undefined,             target_students: studentResult.students.map((student) => ({               student_id: student.student_id,               student_name: student.student_name,               admission_number: student.admission_number || undefined,               class_name: student.class_name || undefined,               guardian_phone: student.guardian_phone || undefined,             })),             metadata: {               source: "school_finance_bulk_billing",             },           }),         } | `fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${...)` |
| `web\src\components\school\school-pages.tsx` | 1684 | `fetch` | `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`, tenantSlug)` | `GET` | Request options: { cache: "no-store" } | `fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${...)` |
| `web\src\components\school\school-pages.tsx` | 1739 | `fetch` | `buildBillingApiPath("/api/billing/invoices", tenantSlug)` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },         body: JSON.stringify({           description: `Fees for ${invoiceDraft.studentName.trim()}`,           total_amount_minor: amountMinor,           due_at: invoiceDraft.dueAt.trim()             ? new Date(invoiceDraft.dueAt.trim()).toISOString()             : undefined,           metadata: {             student_id: invoiceDraft.studentId.trim(),             student_name: invoiceDraft.studentName.trim(),           },         }),       } | `fetch(buildBillingApiPath("/api/billing/invoices", tenantSlug), {
...)` |
| `web\src\components\school\school-pages.tsx` | 1795 | `fetch` | `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },         body: JSON.stringify({           idempotency_key: `finance-quick-${Date.now()}-${Math.random().toString(36).slice(2)}`,           payment_method: paymentDraft.payment_method,           amount_minor: amountMinor,           student_id: paymentDraft.student_id.trim() || undefined,           invoice_id: paymentDraft.invoice_id.trim() || undefined,           payer_name: paymentDraft.payer_name.trim() || undefined,           deposit_reference: paymentDraft.reference.trim(),           external_reference: paymentDraft.reference.trim(),           metadata: {             source: "school_finance_quick_entry",             student_name: paymentDraft.payer_name.trim() || undefined,           },         }),       } | `fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tena...)` |
| `web\src\components\school\school-pages.tsx` | 2858 | `fetch` | `/api/school/sms/wallet` | `GET` | Request options: {           method: "GET",           credentials: "same-origin",         } | `fetch("/api/school/sms/wallet", {
          method: "GET",
       ...)` |
| `web\src\components\school\school-pages.tsx` | 2913 | `fetch` | `/api/sms/send` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": await getCsrfToken(),         },         credentials: "same-origin",         body: JSON.stringify({           recipient: trimmedRecipient,           message: trimmedMessage,           message_type: "school_communication",         }),       } | `fetch("/api/sms/send", {
        method: "POST",
        headers: ...)` |
| `web\src\components\school\school-pages.tsx` | 3114 | `fetch` | `/api/integrations/daraja` | `GET` | Request options: {           method: "GET",           credentials: "same-origin",         } | `fetch("/api/integrations/daraja", {
          method: "GET",
     ...)` |
| `web\src\components\school\school-pages.tsx` | 3154 | `fetch` | `/api/integrations/daraja` | `PUT` | Request options: {         method: "PUT",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": await getCsrfToken(),         },         credentials: "same-origin",         body: JSON.stringify({           ...form,           is_active: false,         }),       } | `fetch("/api/integrations/daraja", {
        method: "PUT",
       ...)` |
| `web\src\components\school\school-pages.tsx` | 3193 | `fetch` | `/api/integrations/daraja/test?environment=${encodeURIComponent(form.environment)}` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": await getCsrfToken(),         },         credentials: "same-origin",       } | `fetch(`/api/integrations/daraja/test?environment=${encodeURICompon...)` |
| `web\src\components\school\school-pages.tsx` | 3600 | `fetch` | `/api/clinic/analytics/principal${query}` | `GET` | Request options: { credentials: "same-origin", cache: "no-store" } | `fetch(`/api/clinic/analytics/principal${query}`, { credentials: "s...)` |
| `web\src\components\school\school-pages.tsx` | 3601 | `fetch` | `/api/clinic/medicines${query}` | `GET` | Request options: { credentials: "same-origin", cache: "no-store" } | `fetch(`/api/clinic/medicines${query}`, { credentials: "same-origin...)` |
| `web\src\components\school\school-pages.tsx` | 3911 | `fetch` | `/api/school/modules/me` | `GET` | Request options: {           method: "GET",           credentials: "same-origin",           cache: "no-store",             } | `fetch("/api/school/modules/me", {
          method: "GET",
       ...)` |
| `web\src\components\school\school-pages.tsx` | 3987 | `fetch` | `/api/events/notifications?limit=8` | `GET` | Request options: {           method: "GET",           credentials: "same-origin",           cache: "no-store",         } | `fetch("/api/events/notifications?limit=8", {
          method: "GE...)` |
| `web\src\components\school\school-pages.tsx` | 4055 | `useSchoolQuery` | `/api/academics/teacher-assignments` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/academics/teacher-assignments")` |
| `web\src\components\school\school-pages.tsx` | 4099 | `fetch` | `/api/events/notifications/${encodeURIComponent(item.id)}/read` | `POST` | Request options: {         method: "POST",         credentials: "same-origin",         headers: {           "content-type": "application/json",           "x-myshule-csrf": csrfToken,         },       } | `fetch(`/api/events/notifications/${encodeURIComponent(item.id)}/re...)` |
| `web\src\components\school\secretary-command-center-full.tsx` | 288 | `useSchoolQuery` | `/api/visitors/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/visitors/dashboard")` |
| `web\src\components\school\secretary-command-center-full.tsx` | 352 | `useSchoolQuery` | `/api/visitors/logs` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/visitors/logs")` |
| `web\src\components\school\secretary-command-center-full.tsx` | 370 | `useSchoolQuery` | `/api/communication/summary` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/communication/summary")` |
| `web\src\components\school\secretary-command-center-full.tsx` | 388 | `useSchoolQuery` | `/api/admissions` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/admissions")` |
| `web\src\components\school\secretary-command-center-full.tsx` | 425 | `apiString` | `/api/admin-command/frontoffice/visitors` | `GET` | Literal string usage | `await requestDashboardApi("/api/admin-command/frontoffice/visitors", {` |
| `web\src\components\school\secretary-command-center-full.tsx` | 472 | `useSchoolQuery` | `/api/visitors/logs` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/visitors/logs")` |
| `web\src\components\school\secretary-command-center-full.tsx` | 501 | `useSchoolQuery` | `/api/communication/summary` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/communication/summary")` |
| `web\src\components\school\secretary-command-center-full.tsx` | 528 | `apiString` | `/api/admin-command/frontoffice/appointments` | `GET` | Literal string usage | `await requestDashboardApi("/api/admin-command/frontoffice/appointments", {` |
| `web\src\components\school\secretary-command-center-full.tsx` | 582 | `useSchoolQuery` | `/api/visitors/appointments` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/visitors/appointments")` |
| `web\src\components\school\secretary-command-center-full.tsx` | 611 | `useSchoolQuery` | `/api/communication/summary` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/communication/summary")` |
| `web\src\components\school\secretary-command-center-full.tsx` | 629 | `useSchoolQuery` | `/api/admissions/applications` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/admissions/applications")` |
| `web\src\components\school\secretary-command-center-full.tsx` | 647 | `useSchoolQuery` | `/api/communication/messages` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/communication/messages")` |
| `web\src\components\school\secretary-command-center-full.tsx` | 674 | `apiString` | `/api/admin-command/frontoffice/mail` | `GET` | Literal string usage | `await requestDashboardApi("/api/admin-command/frontoffice/mail", {` |
| `web\src\components\school\secretary-command-center-full.tsx` | 726 | `useSchoolQuery` | `/api/operations/reports` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/operations/reports")` |
| `web\src\components\school\secretary-command-center-full.tsx` | 755 | `useSchoolQuery` | `/api/hr/staff` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/hr/staff")` |
| `web\src\components\school\secretary-command-center-full.tsx` | 773 | `useSchoolQuery` | `/api/operations/reports` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/operations/reports")` |
| `web\src\components\school\secretary-command-center-full.tsx` | 791 | `useSchoolQuery` | `/api/dashboard/summary?role=secretary` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/dashboard/summary?role=secretary")` |
| `web\src\components\school\secretary-command-center-full.tsx` | 809 | `useSchoolQuery` | `/api/school/settings` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/school/settings")` |
| `web\src\components\school\secretary-command-center.tsx` | 18 | `useSchoolQuery` | `/admin-command/secretary/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/secretary/dashboard')` |
| `web\src\components\school\secretary\appointments-workspace.tsx` | 33 | `useSchoolQuery` | `/admin-command/secretary/appointments` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/secretary/appointments')` |
| `web\src\components\school\secretary\calls-log-workspace.tsx` | 36 | `useSchoolQuery` | `/admin-command/secretary/calls-log` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/secretary/calls-log')` |
| `web\src\components\school\secretary\letters-documents-workspace.tsx` | 32 | `useSchoolQuery` | `/admin-command/secretary/letters-documents` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/secretary/letters-documents')` |
| `web\src\components\school\secretary\overview-workspace.tsx` | 29 | `useSchoolQuery` | `/admin-command/secretary/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/secretary/overview')` |
| `web\src\components\school\secretary\parent-messages-workspace.tsx` | 34 | `useSchoolQuery` | `/admin-command/secretary/parent-messages` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/secretary/parent-messages')` |
| `web\src\components\school\secretary\reception-queue-workspace.tsx` | 31 | `useSchoolQuery` | `/admin-command/secretary/reception-queue` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/secretary/reception-queue')` |
| `web\src\components\school\secretary\reports-workspace.tsx` | 31 | `useSchoolQuery` | `/admin-command/secretary/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/secretary/reports')` |
| `web\src\components\school\secretary\student-clearance-workspace.tsx` | 34 | `useSchoolQuery` | `/admin-command/secretary/student-clearance` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/secretary/student-clearance')` |
| `web\src\components\school\secretary\visitors-workspace.tsx` | 34 | `useSchoolQuery` | `/admin-command/secretary/visitors` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/secretary/visitors')` |
| `web\src\components\school\security-command-center.tsx` | 157 | `useSchoolQuery` | `/api/visitors/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/visitors/dashboard")` |
| `web\src\components\school\security-command-center.tsx` | 251 | `apiString` | `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | Literal string usage | `await requestDashboardApi("/api/admin-command/frontoffice/dispatch", {` |
| `web\src\components\school\security-command-center.tsx` | 266 | `apiString` | `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | Literal string usage | `await requestDashboardApi("/api/admin-command/frontoffice/dispatch", {` |
| `web\src\components\school\security-command-center.tsx` | 308 | `useSchoolMutation` | `/api/visitors/logs` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/visitors/logs")` |
| `web\src\components\school\security-command-center.tsx` | 309 | `useSchoolQuery` | `/api/visitors/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/visitors/dashboard")` |
| `web\src\components\school\security-command-center.tsx` | 327 | `useSchoolMutation` | `/api/visitors/logs/${recordId}/checkout` | `POST` | Variables passed to mutate function | `useSchoolMutation(`/api/visitors/logs/${recordId}/checkout`, {
      method: "...)` |
| `web\src\components\school\security-command-center.tsx` | 327 | `fetch` | `/api/visitors/logs/${recordId}/checkout` | `PATCH` | Request options: {       method: "PATCH",       headers: { "Content-Type": "application/json" }     } | `fetch(`/api/visitors/logs/${recordId}/checkout`, {
      method: "...)` |
| `web\src\components\school\security-command-center.tsx` | 328 | `apiString` | `/api/visitors/logs/${recordId}/checkout` | `GET` | Literal string usage | `await fetch(`/api/visitors/logs/${recordId}/checkout`, {` |
| `web\src\components\school\security-command-center.tsx` | 395 | `useSchoolQuery` | `/api/visitors/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/visitors/dashboard")` |
| `web\src\components\school\security-command-center.tsx` | 455 | `useSchoolQuery` | `/api/visitors/appointments` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/visitors/appointments")` |
| `web\src\components\school\security-command-center.tsx` | 498 | `useSchoolQuery` | `/api/visitors/student-exits` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/visitors/student-exits")` |
| `web\src\components\school\security-command-center.tsx` | 546 | `apiString` | `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | Literal string usage | `await requestDashboardApi("/api/admin-command/frontoffice/dispatch", {` |
| `web\src\components\school\security-command-center.tsx` | 597 | `apiString` | `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | Literal string usage | `await requestDashboardApi("/api/admin-command/frontoffice/dispatch", {` |
| `web\src\components\school\security-command-center.tsx` | 650 | `apiString` | `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | Literal string usage | `await requestDashboardApi("/api/admin-command/frontoffice/dispatch", {` |
| `web\src\components\school\security-command-center.tsx` | 665 | `apiString` | `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | Literal string usage | `await requestDashboardApi("/api/admin-command/frontoffice/dispatch", {` |
| `web\src\components\school\security-command-center.tsx` | 721 | `apiString` | `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | Literal string usage | `await requestDashboardApi("/api/admin-command/frontoffice/dispatch", {` |
| `web\src\components\school\security-command-center.tsx` | 772 | `apiString` | `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | Literal string usage | `await requestDashboardApi("/api/admin-command/frontoffice/dispatch", {` |
| `web\src\components\school\security-command-center.tsx` | 826 | `apiString` | `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | Literal string usage | `await requestDashboardApi("/api/admin-command/frontoffice/dispatch", {` |
| `web\src\components\school\security-command-center.tsx` | 841 | `apiString` | `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | Literal string usage | `await requestDashboardApi("/api/admin-command/frontoffice/dispatch", {` |
| `web\src\components\school\security-officer\gate-register-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/security-officer/gate-register` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/security-officer/gate-register')` |
| `web\src\components\school\security-officer\incidents-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/security-officer/incidents` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/security-officer/incidents')` |
| `web\src\components\school\security-officer\overview-workspace.tsx` | 23 | `useSchoolQuery` | `/admin-command/security-officer/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/security-officer/overview')` |
| `web\src\components\school\security-officer\reports-workspace.tsx` | 22 | `useSchoolQuery` | `/admin-command/security-officer/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/security-officer/reports')` |
| `web\src\components\school\security-officer\staff-movement-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/security-officer/staff-movement` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/security-officer/staff-movement')` |
| `web\src\components\school\security-officer\student-exit-passes-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/security-officer/student-exit-passes` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/security-officer/student-exit-passes')` |
| `web\src\components\school\security-officer\visitors-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/security-officer/visitors` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/security-officer/visitors')` |
| `web\src\components\school\session-management-panel.tsx` | 22 | `useSchoolQuery` | `/api/auth/sessions` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/auth/sessions")` |
| `web\src\components\school\session-management-panel.tsx` | 24 | `useSchoolMutation` | `/api/auth/sessions/revoke` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/auth/sessions/revoke")` |
| `web\src\components\school\storekeeper-command-center.tsx` | 1188 | `useSchoolQuery` | `/api/inventory/requests` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/inventory/requests")` |
| `web\src\components\school\storekeeper-command-center.tsx` | 1193 | `useSchoolMutation` | `/api/inventory/requisitions` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/inventory/requisitions")` |
| `web\src\components\school\storekeeper-command-center.tsx` | 1289 | `useSchoolQuery` | `/api/inventory/heatmap` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/inventory/heatmap")` |
| `web\src\components\school\storekeeper-command-center.tsx` | 1336 | `useSchoolQuery` | `/api/inventory/suppliers` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/inventory/suppliers")` |
| `web\src\components\school\storekeeper-command-center.tsx` | 1387 | `useSchoolQuery` | `/api/inventory/incidents` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/inventory/incidents")` |
| `web\src\components\school\storekeeper-command-center.tsx` | 1411 | `useSchoolQuery` | `/api/inventory/stock-movements` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/inventory/stock-movements")` |
| `web\src\components\school\storekeeper-command-center.tsx` | 1457 | `useSchoolQuery` | `/api/inventory/insights` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/inventory/insights")` |
| `web\src\components\school\storekeeper-command-center.tsx` | 1595 | `useSchoolQuery` | `/api/inventory/summary` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/inventory/summary")` |
| `web\src\components\school\storekeeper\damaged-missing-workspace.tsx` | 35 | `useSchoolQuery` | `/admin-command/storekeeper/damaged-missing` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/storekeeper/damaged-missing')` |
| `web\src\components\school\storekeeper\items-workspace.tsx` | 33 | `useSchoolQuery` | `/admin-command/storekeeper/items` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/storekeeper/items')` |
| `web\src\components\school\storekeeper\low-stock-workspace.tsx` | 31 | `useSchoolQuery` | `/admin-command/storekeeper/low-stock` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/storekeeper/low-stock')` |
| `web\src\components\school\storekeeper\overview-workspace.tsx` | 32 | `useSchoolQuery` | `/admin-command/storekeeper/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/storekeeper/overview')` |
| `web\src\components\school\storekeeper\reports-workspace.tsx` | 30 | `useSchoolQuery` | `/admin-command/storekeeper/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/storekeeper/reports')` |
| `web\src\components\school\storekeeper\requests-workspace.tsx` | 35 | `useSchoolQuery` | `/admin-command/storekeeper/requests` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/storekeeper/requests')` |
| `web\src\components\school\storekeeper\stock-in-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/storekeeper/stock-in` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/storekeeper/stock-in")` |
| `web\src\components\school\storekeeper\stock-issue-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/storekeeper/stock-issue` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/storekeeper/stock-issue")` |
| `web\src\components\school\storekeeper\stocktake-workspace.tsx` | 34 | `useSchoolQuery` | `/admin-command/storekeeper/stocktake` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/storekeeper/stocktake')` |
| `web\src\components\school\student-command-center.tsx` | 9 | `useSchoolQuery` | `/api/student/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/student/dashboard")` |
| `web\src\components\school\student-directory-workspace.tsx` | 43 | `fetch` | `buildBillingApiPath("/api/students/summary/dashboard", tenantSlug)` | `GET` | Request options: {           cache: "no-store",         } | `fetch(buildBillingApiPath("/api/students/summary/dashboard", tenan...)` |
| `web\src\components\school\student\academics-workspace.tsx` | 14 | `useSchoolQuery` | `/api/academics/my-assignments` | `GET` | Query / Path variables from context | `useSchoolQuery('/api/academics/my-assignments')` |
| `web\src\components\school\student\academics-workspace.tsx` | 15 | `useSchoolQuery` | `/api/exams/report-cards` | `GET` | Query / Path variables from context | `useSchoolQuery('/api/exams/report-cards')` |
| `web\src\components\school\student\academics-workspace.tsx` | 25 | `apiString` | `/api/student-portal/assignments/mark-done` | `GET` | Literal string usage | `const res: any = await requestDashboardApi("/api/student-portal/assignments/mark-done", {` |
| `web\src\components\school\student\behavior-workspace.tsx` | 10 | `useSchoolQuery` | `/api/discipline/parent/incidents` | `GET` | Query / Path variables from context | `useSchoolQuery('/api/discipline/parent/incidents')` |
| `web\src\components\school\student\behavior-workspace.tsx` | 13 | `useSchoolQuery` | `/api/discipline/students/me/behavior-score` | `GET` | Query / Path variables from context | `useSchoolQuery('/api/discipline/students/me/behavior-score')` |
| `web\src\components\school\student\dashboard-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/student/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/student/dashboard")` |
| `web\src\components\school\student\downloads-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/student/downloads` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/student/downloads")` |
| `web\src\components\school\student\fees-workspace.tsx` | 10 | `useSchoolQuery` | `/api/finance/accounts-overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/api/finance/accounts-overview')` |
| `web\src\components\school\student\messages-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/student/messages` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/student/messages")` |
| `web\src\components\school\student\notifications-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/student/notifications` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/student/notifications")` |
| `web\src\components\school\teacher\assignments-homework-workspace.tsx` | 17 | `useSchoolQuery` | `/api/academics/my-assignments` | `GET` | Query / Path variables from context | `useSchoolQuery('/api/academics/my-assignments')` |
| `web\src\components\school\teacher\assignments-homework-workspace.tsx` | 19 | `useSchoolMutation` | `{
    endpoint: '/api/academics/assignments',
    method: 'POST',
    onSuccess: () => {
      refetch();
      setIsCreating(false);
      setNewTitle("");
      setNewDesc("");
      setNewDueDate("");
    }
  }` | `POST` | Variables passed to mutate function | `useSchoolMutation({
    endpoint: '/api/academics/assignments',
    method: 'P...)` |
| `web\src\components\school\teacher\assignments-homework-workspace.tsx` | 20 | `apiString` | `/api/academics/assignments` | `GET` | Literal string usage | `endpoint: '/api/academics/assignments',` |
| `web\src\components\school\teacher\lesson-logs-workspace.tsx` | 12 | `useSchoolQuery` | `/api/academics/my-lesson-logs?date=${activeDate}` | `GET` | Query / Path variables from context | `useSchoolQuery(`/api/academics/my-lesson-logs?date=${activeDate}`)` |
| `web\src\components\school\teacher\lesson-logs-workspace.tsx` | 13 | `useSchoolMutation` | `/api/academics/lesson-logs` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/academics/lesson-logs", "POST")` |
| `web\src\components\school\teacher\lesson-plans-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/teacher/lesson-plans` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/teacher/lesson-plans")` |
| `web\src\components\school\teacher\marks-entry-workspace.tsx` | 17 | `useSchoolQuery` | `/api/students?class=' + encodeURIComponent(selectedClass)` | `GET` | Query / Path variables from context | `useSchoolQuery('/api/students?class=' + encodeURIComponent(selectedClass))` |
| `web\src\components\school\teacher\marks-entry-workspace.tsx` | 18 | `useSchoolQuery` | `/api/exams/marks?exam=' + encodeURIComponent(selectedExam)` | `GET` | Query / Path variables from context | `useSchoolQuery('/api/exams/marks?exam=' + encodeURIComponent(selectedExam))` |
| `web\src\components\school\teacher\marks-entry-workspace.tsx` | 50 | `apiString` | `/api/academic/marks/enter` | `GET` | Literal string usage | `await requestDashboardApi("/api/academic/marks/enter", {` |
| `web\src\components\school\teacher\messages-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/teacher/messages` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/teacher/messages")` |
| `web\src\components\school\teacher\my-timetable-workspace.tsx` | 23 | `useSchoolQuery` | `/api/timetable/my-schedule` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/timetable/my-schedule")` |
| `web\src\components\school\teacher\overview-workspace.tsx` | 9 | `useSchoolQuery` | `/api/dashboard/layout?role=teacher` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/dashboard/layout?role=teacher")` |
| `web\src\components\school\teacher\reports-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/teacher/reports` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/teacher/reports")` |
| `web\src\components\school\teacher\resource-requests-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/teacher/resource-requests` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/teacher/resource-requests")` |
| `web\src\components\school\teacher\student-notes-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/teacher/student-notes` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/teacher/student-notes")` |
| `web\src\components\school\teacher\subjects-classes-workspace.tsx` | 9 | `useSchoolQuery` | `/api/academics/teacher-assignments` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/academics/teacher-assignments")` |
| `web\src\components\school\teacher\teacher-attendance-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/teacher/attendance` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/teacher/attendance")` |
| `web\src\components\school\teacher\utilities-workspace.tsx` | 11 | `useSchoolQuery` | `/admin-command/teacher/utilities` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/teacher/utilities")` |
| `web\src\components\school\transport-manager-command-center.tsx` | 481 | `useSchoolQuery` | `/api/transport/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/transport/dashboard")` |
| `web\src\components\school\transport-manager-command-center.tsx` | 604 | `useSchoolQuery` | `/api/transport/dashboard` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/transport/dashboard")` |
| `web\src\components\school\transport-manager-command-center.tsx` | 692 | `apiString` | `/api/admin-command/transport/route` | `GET` | Literal string usage | `await requestDashboardApi("/api/admin-command/transport/route", {` |
| `web\src\components\school\transport-manager-command-center.tsx` | 814 | `apiString` | `/api/admin-command/transport/maintenance` | `GET` | Literal string usage | `await requestDashboardApi("/api/admin-command/transport/maintenance", {` |
| `web\src\components\school\transport-manager\drivers-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/transport-manager/drivers` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/transport-manager/drivers')` |
| `web\src\components\school\transport-manager\fuel-maintenance-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/transport-manager/fuel-maintenance` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/transport-manager/fuel-maintenance')` |
| `web\src\components\school\transport-manager\overview-workspace.tsx` | 23 | `useSchoolQuery` | `/admin-command/transport-manager/overview` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/transport-manager/overview')` |
| `web\src\components\school\transport-manager\reports-workspace.tsx` | 22 | `useSchoolQuery` | `/admin-command/transport-manager/reports` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/transport-manager/reports')` |
| `web\src\components\school\transport-manager\routes-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/transport-manager/routes` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/transport-manager/routes')` |
| `web\src\components\school\transport-manager\student-transport-list-workspace.tsx` | 25 | `useSchoolQuery` | `/admin-command/transport-manager/student-transport-list` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/transport-manager/student-transport-list')` |
| `web\src\components\school\transport-manager\trips-workspace.tsx` | 27 | `useSchoolQuery` | `/admin-command/transport-manager/trips` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/transport-manager/trips')` |
| `web\src\components\school\transport-manager\vehicles-workspace.tsx` | 26 | `useSchoolQuery` | `/admin-command/transport-manager/vehicles` | `GET` | Query / Path variables from context | `useSchoolQuery('/admin-command/transport-manager/vehicles')` |
| `web\src\components\school\user-management-panel.tsx` | 83 | `fetch` | `/api/auth/invitations?limit=50&offset=0` | `GET` | Request options: {           method: "GET",           credentials: "same-origin",           cache: "no-store",         } | `fetch("/api/auth/invitations?limit=50&offset=0", {
          metho...)` |
| `web\src\components\school\user-management-panel.tsx` | 130 | `fetch` | `/api/auth/invitations` | `POST` | Request options: {         method: "POST",         credentials: "same-origin",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": await getCsrfToken(),         },         body: JSON.stringify({           display_name: displayName,           email: inviteEmail,           role_code: roleCode,         }),       } | `fetch("/api/auth/invitations", {
        method: "POST",
        c...)` |
| `web\src\components\school\user-management-panel.tsx` | 179 | `fetch` | `/api/auth/invitations/${user.id}/resend` | `POST` | Request options: {         method: "POST",         credentials: "same-origin",         headers: {           "x-myshule-csrf": await getCsrfToken(),         },       } | `fetch(`/api/auth/invitations/${user.id}/resend`, {
        method:...)` |
| `web\src\components\school\user-management-panel.tsx` | 210 | `fetch` | `/api/auth/invitations/${user.id}` | `DELETE` | Request options: {         method: "DELETE",         credentials: "same-origin",         headers: {           "x-myshule-csrf": await getCsrfToken(),         },       } | `fetch(`/api/auth/invitations/${user.id}`, {
        method: "DELET...)` |
| `web\src\components\school\user-management-panel.tsx` | 237 | `fetch` | `/api/auth/tenant-users/${user.id}/status` | `PATCH` | Request options: {         method: "PATCH",         credentials: "same-origin",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": await getCsrfToken(),         },         body: JSON.stringify({ status }),       } | `fetch(`/api/auth/tenant-users/${user.id}/status`, {
        method...)` |
| `web\src\components\school\user-management-panel.tsx` | 274 | `fetch` | `/api/auth/tenant-users/${user.id}/role` | `PATCH` | Request options: {         method: "PATCH",         credentials: "same-origin",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": await getCsrfToken(),         },         body: JSON.stringify({ role_code: nextRoleCode }),       } | `fetch(`/api/auth/tenant-users/${user.id}/role`, {
        method: ...)` |
| `web\src\components\school\user-management-workspace.tsx` | 573 | `fetch` | `/api/auth/invitations?limit=50&offset=0` | `GET` | Request options: {           method: "GET",           credentials: "same-origin",           cache: "no-store",         } | `fetch("/api/auth/invitations?limit=50&offset=0", {
          metho...)` |
| `web\src\components\school\user-management-workspace.tsx` | 683 | `fetch` | `/api/auth/tenant-users/${encodeURIComponent(user.id)}/status` | `PATCH` | Request options: {           method: "PATCH",           credentials: "same-origin",           headers: {             "Content-Type": "application/json",             "x-myshule-csrf": csrfToken,           },           body: JSON.stringify({ status: status === "Active" ? "active" : "suspended" }),         } | `fetch(`/api/auth/tenant-users/${encodeURIComponent(user.id)}/statu...)` |
| `web\src\components\school\user-management-workspace.tsx` | 767 | `fetch` | `/api/auth/invitations/${encodeURIComponent(invite.id)}/resend` | `POST` | Request options: {         method: "POST",         credentials: "same-origin",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },       } | `fetch(`/api/auth/invitations/${encodeURIComponent(invite.id)}/rese...)` |
| `web\src\components\school\user-management-workspace.tsx` | 834 | `fetch` | `/api/auth/invitations/${encodeURIComponent(invite.id)}` | `DELETE` | Request options: {         method: "DELETE",         credentials: "same-origin",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },       } | `fetch(`/api/auth/invitations/${encodeURIComponent(invite.id)}`, {
...)` |
| `web\src\components\school\user-management-workspace.tsx` | 924 | `fetch` | `/api/auth/tenant-users/${encodeURIComponent(editingUser.id)}/role` | `PATCH` | Request options: {           method: "PATCH",           credentials: "same-origin",           headers: {             "Content-Type": "application/json",             "x-myshule-csrf": csrfToken,           },           body: JSON.stringify({ role_code: roleCodeForLabel(updates.role) }),         } | `fetch(`/api/auth/tenant-users/${encodeURIComponent(editingUser.id)...)` |
| `web\src\components\school\user-management-workspace.tsx` | 1013 | `fetch` | `/api/auth/invitations` | `POST` | Request options: {         method: "POST",         credentials: "same-origin",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": csrfToken,         },         body: JSON.stringify({           display_name: invitedName,           email,           role_code: roleCodeForLabel(role),           phone,           department,           assignment,           identifier,           delivery_method: "Email",           note,         }),       } | `fetch("/api/auth/invitations", {
        method: "POST",
        c...)` |
| `web\src\components\student\student-command-center.tsx` | 27 | `useSchoolQuery` | `/api/student/overview` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/student/overview")` |
| `web\src\components\student\student-command-center.tsx` | 47 | `useSchoolQuery` | `/api/student/academics` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/student/academics")` |
| `web\src\components\student\student-command-center.tsx` | 67 | `useSchoolQuery` | `/api/student/attendance` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/student/attendance")` |
| `web\src\components\sync\SyncCenter.tsx` | 30 | `fetch` | `/api/sync/retry` | `POST` | Request options: {             method: 'POST',             headers: { 'Content-Type': 'application/json' },             body: JSON.stringify({ operations: [record] })           } | `fetch('/api/sync/retry', {
            method: 'POST',
           ...)` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1350 | `apiString` | `/api/exams/marks/school` | `GET` | Literal string usage | `sourcePath: "/api/exams/marks/school",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1351 | `apiString` | `/api/exams/series/{id}/publish` | `GET` | Literal string usage | `handlerPath: "/api/exams/series/{id}/publish",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1402 | `apiString` | `/api/exams/report-cards` | `GET` | Literal string usage | `sourcePath: "/api/exams/report-cards",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1403 | `apiString` | `/api/operational-workflows/.../dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: "/api/operational-workflows/.../dispatch",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1418 | `apiString` | `/api/procurement/dashboard` | `GET` | Literal string usage | `sourcePath: "/api/procurement/dashboard",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1419 | `apiString` | `/api/procurement/requests/{id}/approval` | `GET` | Literal string usage | `handlerPath: "/api/procurement/requests/{id}/approval",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1432 | `apiString` | `/api/procurement/dashboard` | `GET` | Literal string usage | `sourcePath: "/api/procurement/dashboard",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1433 | `apiString` | `/api/operational-workflows/principal/actions/assign-reviewer/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: "/api/operational-workflows/principal/actions/assign-reviewer/dispatch",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1450 | `apiString` | `/api/inventory/requests` | `GET` | Literal string usage | `sourcePath: "/api/inventory/requests",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1451 | `apiString` | `/api/inventory/requests/{id}/status` | `GET` | Literal string usage | `handlerPath: "/api/inventory/requests/{id}/status",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1464 | `apiString` | `/api/procurement/dashboard` | `GET` | Literal string usage | `sourcePath: "/api/procurement/dashboard",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1465 | `apiString` | `/api/procurement/purchase-orders` | `GET` | Literal string usage | `handlerPath: "/api/procurement/purchase-orders",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1478 | `apiString` | `/api/procurement/dashboard` | `GET` | Literal string usage | `sourcePath: "/api/procurement/dashboard",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1479 | `apiString` | `/api/operational-workflows/principal/actions/request-supplier-revision/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: "/api/operational-workflows/principal/actions/request-supplier-revision/dispatch",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1496 | `apiString` | `/api/procurement/dashboard` | `GET` | Literal string usage | `sourcePath: "/api/procurement/dashboard",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1497 | `apiString` | `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1510 | `apiString` | `/api/admissions/applications?limit=200` | `GET` | Literal string usage | `sourcePath: "/api/admissions/applications?limit=200",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1511 | `apiString` | `/api/admissions/applications/{id}` | `GET` | Literal string usage | `handlerPath: "/api/admissions/applications/{id}",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1524 | `apiString` | `/api/admissions/applications?limit=200` | `GET` | Literal string usage | `sourcePath: "/api/admissions/applications?limit=200",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1525 | `apiString` | `/api/admissions/applications/{id}` | `GET` | Literal string usage | `handlerPath: "/api/admissions/applications/{id}",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1538 | `apiString` | `/api/admissions/applications?limit=200` | `GET` | Literal string usage | `sourcePath: "/api/admissions/applications?limit=200",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1539 | `apiString` | `/api/operational-workflows/principal/actions/print-admission-letter/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: "/api/operational-workflows/principal/actions/print-admission-letter/dispatch",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1556 | `apiString` | `/api/staff/dashboard` | `GET` | Literal string usage | `sourcePath: "/api/staff/dashboard",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1557 | `apiString` | `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1574 | `apiString` | `/api/staff/dashboard` | `GET` | Literal string usage | `sourcePath: "/api/staff/dashboard",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1575 | `apiString` | `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1592 | `apiString` | `/api/inventory/incidents` | `GET` | Literal string usage | `sourcePath: "/api/inventory/incidents",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1593 | `apiString` | `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1611 | `apiString` | `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1628 | `apiString` | `/api/timetable/dashboard` | `GET` | Literal string usage | `sourcePath: "/api/timetable/dashboard",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1629 | `apiString` | `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1646 | `apiString` | `/api/clinic/medicines` | `GET` | Literal string usage | `sourcePath: "/api/clinic/medicines",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1647 | `apiString` | `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1664 | `apiString` | `/api/transport/dashboard` | `GET` | Literal string usage | `sourcePath: "/api/transport/dashboard",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1665 | `apiString` | `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1682 | `apiString` | `/api/labs/dashboard` | `GET` | Literal string usage | `sourcePath: "/api/labs/dashboard",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1683 | `apiString` | `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1700 | `apiString` | `/api/labs/dashboard` | `GET` | Literal string usage | `sourcePath: "/api/labs/dashboard",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1701 | `apiString` | `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1714 | `apiString` | `/api/support/admin/notifications/dead-letter?audience=superadmin&channel=sms` | `GET` | Literal string usage | `sourcePath: "/api/support/admin/notifications/dead-letter?audience=superadmin&channel=sms",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1715 | `apiString` | `/api/support/admin/notifications/dead-letter/{id}/retry` | `GET` | Literal string usage | `handlerPath: "/api/support/admin/notifications/dead-letter/{id}/retry",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1728 | `apiString` | `/api/support/admin/notifications/dead-letter?audience=superadmin&channel=sms` | `GET` | Literal string usage | `sourcePath: "/api/support/admin/notifications/dead-letter?audience=superadmin&channel=sms",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1729 | `apiString` | `/api/operational-workflows/principal/actions/change-sms-channel/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: "/api/operational-workflows/principal/actions/change-sms-channel/dispatch",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1742 | `apiString` | `/api/payments/mpesa/c2b/payments?status=pending_review` | `GET` | Literal string usage | `sourcePath: "/api/payments/mpesa/c2b/payments?status=pending_review",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1743 | `apiString` | `/api/payments/mpesa/c2b/payments/{id}/reconcile` | `GET` | Literal string usage | `handlerPath: "/api/payments/mpesa/c2b/payments/{id}/reconcile",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1756 | `apiString` | `/api/payments/mpesa/c2b/payments?status=pending_review` | `GET` | Literal string usage | `sourcePath: "/api/payments/mpesa/c2b/payments?status=pending_review",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1757 | `apiString` | `/api/operational-workflows/principal/actions/flag-mpesa-exception/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: "/api/operational-workflows/principal/actions/flag-mpesa-exception/dispatch",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1770 | `apiString` | `/api/discipline/incidents` | `GET` | Literal string usage | `sourcePath: "/api/discipline/incidents",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1771 | `apiString` | `/api/operational-workflows/principal/actions/open-incident-center/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: "/api/operational-workflows/principal/actions/open-incident-center/dispatch",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1787 | `apiString` | `/api/discipline/incidents` | `GET` | Literal string usage | `sourcePath: "/api/discipline/incidents",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1788 | `apiString` | `/api/discipline/incidents/{id}/actions` | `GET` | Literal string usage | `handlerPath: "/api/discipline/incidents/{id}/actions",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1813 | `apiString` | `/api/visitors/dashboard` | `GET` | Literal string usage | `sourcePath: "/api/visitors/dashboard",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1814 | `apiString` | `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1831 | `apiString` | `/api/boarding/dashboard` | `GET` | Literal string usage | `sourcePath: "/api/boarding/dashboard",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1833 | `apiString` | `/api/boarding/records/{id}/status` | `GET` | Literal string usage | `? "/api/boarding/records/{id}/status"` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1834 | `apiString` | `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | Literal string usage | `: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1849 | `apiString` | `/api/discipline/incidents` | `GET` | Literal string usage | `sourcePath: "/api/discipline/incidents",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1850 | `apiString` | `/api/discipline/incidents/{id}/actions` | `GET` | Literal string usage | `handlerPath: "/api/discipline/incidents/{id}/actions",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1871 | `apiString` | `/api/discipline/incidents` | `GET` | Literal string usage | `sourcePath: "/api/discipline/incidents",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1872 | `apiString` | `/api/counselling/referrals` | `GET` | Literal string usage | `handlerPath: "/api/counselling/referrals",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1888 | `apiString` | `/api/counselling/referrals` | `GET` | Literal string usage | `sourcePath: "/api/counselling/referrals",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1889 | `apiString` | `/api/operational-workflows/principal/actions/escalate-counselling-case/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: "/api/operational-workflows/principal/actions/escalate-counselling-case/dispatch",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1907 | `apiString` | `/api/counselling/referrals` | `GET` | Literal string usage | `sourcePath: "/api/counselling/referrals",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1908 | `apiString` | `/api/operational-workflows/principal/actions/schedule-parent-welfare-meeting/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: "/api/operational-workflows/principal/actions/schedule-parent-welfare-meeting/dispatch",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1926 | `apiString` | `/api/exams/report-cards` | `GET` | Literal string usage | `sourcePath: "/api/exams/report-cards",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1927 | `apiString` | `/api/exams/report-cards/{id}/parent-download` | `GET` | Literal string usage | `handlerPath: "/api/exams/report-cards/{id}/parent-download",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1940 | `apiString` | `/api/exams/report-cards` | `GET` | Literal string usage | `sourcePath: "/api/exams/report-cards",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1941 | `apiString` | `/api/operational-workflows/principal/actions/schedule-report/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: "/api/operational-workflows/principal/actions/schedule-report/dispatch",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1958 | `apiString` | `/api/exams/report-cards` | `GET` | Literal string usage | `sourcePath: "/api/exams/report-cards",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1960 | `apiString` | `/api/exams/report-cards/{id}/parent-download` | `GET` | Literal string usage | `? "/api/exams/report-cards/{id}/parent-download"` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1961 | `apiString` | `/api/operational-workflows/principal/actions/retry-document-generation/dispatch` | `PATCH (Guess)` | Literal string usage | `: "/api/operational-workflows/principal/actions/retry-document-generation/dispatch",` |
| `web\src\components\workflows\approval-command-panel.tsx` | 1979 | `apiString` | `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | Literal string usage | `handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,` |
| `web\src\components\workflows\approvals\ApprovalDetailDrawer.tsx` | 23 | `ApprovalsApi usage` | `ApprovalsApi.processAction` | `Depends on wrapper API definition` | request.id, action, comment | `ApprovalsApi.processAction(request.id, action, comment)` |
| `web\src\components\workflows\approvals\ApprovalWorkspace.tsx` | 17 | `ApprovalsApi usage` | `ApprovalsApi.getPendingRequests` | `Depends on wrapper API definition` |  | `ApprovalsApi.getPendingRequests()` |
| `web\src\components\workflows\approvals\ApprovalWorkspace.tsx` | 20 | `ApprovalsApi usage` | `ApprovalsApi.getMyRequests` | `Depends on wrapper API definition` |  | `ApprovalsApi.getMyRequests()` |
| `web\src\hooks\useApprovals.ts` | 11 | `DashboardApi usage` | `DashboardApi.getApprovals` | `Depends on wrapper API definition` |  | `DashboardApi.getApprovals()` |
| `web\src\hooks\useApprovals.ts` | 22 | `DashboardApi usage` | `DashboardApi.approveRequest` | `Depends on wrapper API definition` | id, userId, comment | `DashboardApi.approveRequest(id, userId, comment)` |
| `web\src\hooks\useApprovals.ts` | 32 | `DashboardApi usage` | `DashboardApi.rejectRequest` | `Depends on wrapper API definition` | id, userId, reason | `DashboardApi.rejectRequest(id, userId, reason)` |
| `web\src\hooks\useAttendance.ts` | 12 | `useSchoolQuery` | `studentId ? `/api/students/${studentId}/attendance` : null` | `GET` | Query / Path variables from context | `useSchoolQuery(
    studentId ? `/api/students/${studentId}/attendance` : n...)` |
| `web\src\hooks\useAttendance.ts` | 13 | `apiString` | `/api/students/${studentId}/attendance` | `GET` | Literal string usage | `studentId ? `/api/students/${studentId}/attendance` : null` |
| `web\src\hooks\useAttendance.ts` | 21 | `useSchoolQuery` | `/api/attendance${queryParams}` | `GET` | Query / Path variables from context | `useSchoolQuery(`/api/attendance${queryParams}`)` |
| `web\src\hooks\useAttendance.ts` | 26 | `apiString` | `/api/attendance/mark` | `GET` | Literal string usage | `"/api/attendance/mark"` |
| `web\src\hooks\useDashboardFeed.ts` | 14 | `DashboardApi usage` | `DashboardApi.getFeed` | `Depends on wrapper API definition` | role | `DashboardApi.getFeed(role)` |
| `web\src\hooks\useDashboardFeed.ts` | 15 | `DashboardApi usage` | `DashboardApi.getSummary` | `Depends on wrapper API definition` | role | `DashboardApi.getSummary(role)` |
| `web\src\hooks\useDashboardTasks.ts` | 11 | `DashboardApi usage` | `DashboardApi.getTasks` | `Depends on wrapper API definition` |  | `DashboardApi.getTasks()` |
| `web\src\hooks\useDashboardTasks.ts` | 22 | `DashboardApi usage` | `DashboardApi.completeTask` | `Depends on wrapper API definition` | id | `DashboardApi.completeTask(id)` |
| `web\src\hooks\useDiscipline.ts` | 12 | `useSchoolQuery` | `studentId ? `/api/students/${studentId}/discipline` : null` | `GET` | Query / Path variables from context | `useSchoolQuery(
    studentId ? `/api/students/${studentId}/discipline` : n...)` |
| `web\src\hooks\useDiscipline.ts` | 13 | `apiString` | `/api/students/${studentId}/discipline` | `GET` | Literal string usage | `studentId ? `/api/students/${studentId}/discipline` : null` |
| `web\src\hooks\useDiscipline.ts` | 21 | `useSchoolQuery` | `/api/discipline${queryParams}` | `GET` | Query / Path variables from context | `useSchoolQuery(`/api/discipline${queryParams}`)` |
| `web\src\hooks\useDiscipline.ts` | 25 | `useSchoolMutation` | `/api/discipline/cases` | `POST` | Variables passed to mutate function | `useSchoolMutation(
    "/api/discipline/cases"
  )` |
| `web\src\hooks\useDiscipline.ts` | 26 | `apiString` | `/api/discipline/cases` | `GET` | Literal string usage | `"/api/discipline/cases"` |
| `web\src\hooks\useDiscipline.ts` | 31 | `useSchoolMutation` | `/api/discipline/cases/${caseId}` | `PATCH` | Variables passed to mutate function | `useSchoolMutation(
    `/api/discipline/cases/${caseId}`,
    "PATCH"
  )` |
| `web\src\hooks\useDiscipline.ts` | 32 | `apiString` | `/api/discipline/cases/${caseId}` | `GET` | Literal string usage | ``/api/discipline/cases/${caseId}`,` |
| `web\src\hooks\useFees.ts` | 12 | `useSchoolQuery` | `studentId ? `/api/students/${studentId}/fees` : null` | `GET` | Query / Path variables from context | `useSchoolQuery(
    studentId ? `/api/students/${studentId}/fees` : null
  )` |
| `web\src\hooks\useFees.ts` | 13 | `apiString` | `/api/students/${studentId}/fees` | `GET` | Literal string usage | `studentId ? `/api/students/${studentId}/fees` : null` |
| `web\src\hooks\useFees.ts` | 21 | `useSchoolQuery` | `/api/fees${queryParams}` | `GET` | Query / Path variables from context | `useSchoolQuery(`/api/fees${queryParams}`)` |
| `web\src\hooks\useFees.ts` | 26 | `apiString` | `/api/fees/payments` | `GET` | Literal string usage | `"/api/fees/payments"` |
| `web\src\hooks\useFees.ts` | 32 | `apiString` | `/api/fees/summary` | `GET` | Literal string usage | `"/api/fees/summary"` |
| `web\src\hooks\useHealth.ts` | 12 | `useSchoolQuery` | `studentId ? `/api/students/${studentId}/health` : null` | `GET` | Query / Path variables from context | `useSchoolQuery(
    studentId ? `/api/students/${studentId}/health` : null
...)` |
| `web\src\hooks\useHealth.ts` | 13 | `apiString` | `/api/students/${studentId}/health` | `GET` | Literal string usage | `studentId ? `/api/students/${studentId}/health` : null` |
| `web\src\hooks\useHealth.ts` | 21 | `useSchoolQuery` | `/api/health${queryParams}` | `GET` | Query / Path variables from context | `useSchoolQuery(`/api/health${queryParams}`)` |
| `web\src\hooks\useHealth.ts` | 25 | `useSchoolMutation` | `/api/health/visits` | `POST` | Variables passed to mutate function | `useSchoolMutation(
    "/api/health/visits"
  )` |
| `web\src\hooks\useHealth.ts` | 26 | `apiString` | `/api/health/visits` | `GET` | Literal string usage | `"/api/health/visits"` |
| `web\src\hooks\useLibrary.ts` | 12 | `useSchoolQuery` | `studentId ? `/api/students/${studentId}/library` : null` | `GET` | Query / Path variables from context | `useSchoolQuery(
    studentId ? `/api/students/${studentId}/library` : null...)` |
| `web\src\hooks\useLibrary.ts` | 13 | `apiString` | `/api/students/${studentId}/library` | `GET` | Literal string usage | `studentId ? `/api/students/${studentId}/library` : null` |
| `web\src\hooks\useLibrary.ts` | 21 | `useSchoolQuery` | `/api/library/loans${queryParams}` | `GET` | Query / Path variables from context | `useSchoolQuery(`/api/library/loans${queryParams}`)` |
| `web\src\hooks\useLibrary.ts` | 25 | `useSchoolMutation` | `/api/library/issue` | `POST` | Variables passed to mutate function | `useSchoolMutation(
    "/api/library/issue"
  )` |
| `web\src\hooks\useLibrary.ts` | 26 | `apiString` | `/api/library/issue` | `GET` | Literal string usage | `"/api/library/issue"` |
| `web\src\hooks\useLibrary.ts` | 32 | `apiString` | `/api/library/loans/${loanId}` | `GET` | Literal string usage | ``/api/library/loans/${loanId}`,` |
| `web\src\hooks\useNotifications.ts` | 11 | `DashboardApi usage` | `DashboardApi.getNotifications` | `Depends on wrapper API definition` |  | `DashboardApi.getNotifications()` |
| `web\src\hooks\useNotifications.ts` | 22 | `DashboardApi usage` | `DashboardApi.markNotificationRead` | `Depends on wrapper API definition` | id | `DashboardApi.markNotificationRead(id)` |
| `web\src\hooks\useStudents.ts` | 21 | `useSchoolQuery` | `/api/students${queryParams}` | `GET` | Query / Path variables from context | `useSchoolQuery(`/api/students${queryParams}`)` |
| `web\src\hooks\useStudents.ts` | 25 | `useSchoolQuery` | `studentId ? `/api/students/${studentId}` : null` | `GET` | Query / Path variables from context | `useSchoolQuery(studentId ? `/api/students/${studentId}` : null)` |
| `web\src\hooks\useStudents.ts` | 29 | `useSchoolQuery` | `studentId ? `/api/students/${studentId}/guardians` : null` | `GET` | Query / Path variables from context | `useSchoolQuery(
    studentId ? `/api/students/${studentId}/guardians` : nu...)` |
| `web\src\hooks\useStudents.ts` | 30 | `apiString` | `/api/students/${studentId}/guardians` | `GET` | Literal string usage | `studentId ? `/api/students/${studentId}/guardians` : null` |
| `web\src\hooks\useStudents.ts` | 35 | `useSchoolMutation` | `/api/students/admit` | `POST` | Variables passed to mutate function | `useSchoolMutation("/api/students/admit")` |
| `web\src\hooks\useStudents.ts` | 39 | `useSchoolMutation` | `/api/students/${studentId}` | `PATCH` | Variables passed to mutate function | `useSchoolMutation(
    `/api/students/${studentId}`,
    "PATCH"
  )` |
| `web\src\hooks\useStudents.ts` | 40 | `apiString` | `/api/students/${studentId}` | `GET` | Literal string usage | ``/api/students/${studentId}`,` |
| `web\src\lib\auth\csrf-client.ts` | 5 | `fetch` | `/api/auth/csrf` | `GET` | Request options: {       method: "GET",       credentials: "same-origin",       cache: "no-store",     } | `fetch("/api/auth/csrf", {
      method: "GET",
      credentials: ...)` |
| `web\src\lib\auth\email-verification-client.ts` | 38 | `apiString` | `/api/auth/email-verification/request` | `POST (Guess)` | Literal string usage | `return postEmailVerificationAction("/api/auth/email-verification/request", input);` |
| `web\src\lib\auth\email-verification-client.ts` | 42 | `apiString` | `/api/auth/email-verification/verify` | `POST (Guess)` | Literal string usage | `return postEmailVerificationAction("/api/auth/email-verification/verify", input);` |
| `web\src\lib\auth\invitation-client.ts` | 18 | `fetch` | `/api/auth/invitations/accept` | `POST` | Request options: {     method: "POST",     headers: {       "Content-Type": "application/json",       "x-myshule-csrf": await getCsrfToken(),     },     credentials: "same-origin",     body: JSON.stringify(input),   } | `fetch("/api/auth/invitations/accept", {
    method: "POST",
    he...)` |
| `web\src\lib\auth\recovery-client.ts` | 43 | `apiString` | `/api/auth/password-recovery/request` | `POST (Guess)` | Literal string usage | `return postRecoveryAction("/api/auth/password-recovery/request", input);` |
| `web\src\lib\auth\recovery-client.ts` | 47 | `apiString` | `/api/auth/password-recovery/reset` | `POST (Guess)` | Literal string usage | `return postRecoveryAction("/api/auth/password-recovery/reset", input);` |
| `web\src\lib\auth\use-experience-session.ts` | 72 | `fetch` | `/api/auth/me?${query.toString()}` | `GET` | Request options: {           method: "GET",           credentials: "same-origin",         } | `fetch(`/api/auth/me?${query.toString()}`, {
          method: "GET...)` |
| `web\src\lib\auth\use-experience-session.ts` | 119 | `fetch` | `/api/auth/login` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": await getCsrfToken(),         },         credentials: "same-origin",         body: JSON.stringify({           audience,           ...input,           tenantSlug: input.tenantSlug ?? options?.tenantSlug ?? null,         }),       } | `fetch("/api/auth/login", {
        method: "POST",
        headers...)` |
| `web\src\lib\auth\use-experience-session.ts` | 152 | `fetch` | `/api/auth/logout` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": await getCsrfToken(),         },         credentials: "same-origin",         body: JSON.stringify({ audience }),       } | `fetch("/api/auth/logout", {
        method: "POST",
        header...)` |
| `web\src\lib\auth\use-experience-session.ts` | 173 | `fetch` | `/api/auth/refresh` | `POST` | Request options: {         method: "POST",         headers: {           "Content-Type": "application/json",           "x-myshule-csrf": await getCsrfToken(),         },         credentials: "same-origin",         body: JSON.stringify({           audience,           tenantSlug: options?.tenantSlug ?? null,         }),       } | `fetch("/api/auth/refresh", {
        method: "POST",
        heade...)` |
| `web\src\lib\client\approvals-api.ts` | 19 | `fetch` | `/api/approvals/pending` | `GET` | None | `fetch('/api/approvals/pending')` |
| `web\src\lib\client\approvals-api.ts` | 26 | `fetch` | `/api/approvals/my-requests` | `GET` | None | `fetch('/api/approvals/my-requests')` |
| `web\src\lib\client\approvals-api.ts` | 33 | `fetch` | `/api/approvals/${id}/action` | `PATCH` | Request options: {       method: 'PATCH',       headers: { 'Content-Type': 'application/json' },       body: JSON.stringify({ action, comment })     } | `fetch(`/api/approvals/${id}/action`, {
      method: 'PATCH',
    ...)` |
| `web\src\lib\client\dashboard-api.ts` | 3 | `fetchWithTenant` | `/apiurl: string` | `GET` | Request options: options: RequestInit = {} | `fetchWithTenant(url: string, options: RequestInit = {})` |
| `web\src\lib\client\dashboard-api.ts` | 29 | `fetchWithTenant` | `/api/dashboard/feed?role=${role}&limit=${limit}&offset=${offset}` | `GET` | None | `fetchWithTenant(`/dashboard/feed?role=${role}&limit=${limit}&offset=${offset...)` |
| `web\src\lib\client\dashboard-api.ts` | 32 | `fetchWithTenant` | `/api/dashboard/summary?role=${role}` | `GET` | None | `fetchWithTenant(`/dashboard/summary?role=${role}`)` |
| `web\src\lib\client\dashboard-api.ts` | 35 | `fetchWithTenant` | `/api/notifications` | `GET` | None | `fetchWithTenant('/notifications')` |
| `web\src\lib\client\dashboard-api.ts` | 36 | `fetchWithTenant` | `/api/notifications/${id}/read` | `PATCH` | Request options: { method: 'PATCH' } | `fetchWithTenant(`/notifications/${id}/read`, { method: 'PATCH' })` |
| `web\src\lib\client\dashboard-api.ts` | 39 | `fetchWithTenant` | `/api/tasks` | `GET` | None | `fetchWithTenant('/tasks')` |
| `web\src\lib\client\dashboard-api.ts` | 40 | `fetchWithTenant` | `/api/tasks` | `POST` | Request options: { method: 'POST', body: JSON.stringify(data) } | `fetchWithTenant('/tasks', { method: 'POST', body: JSON.stringify(data) })` |
| `web\src\lib\client\dashboard-api.ts` | 41 | `fetchWithTenant` | `/api/tasks/${id}/complete` | `PATCH` | Request options: { method: 'PATCH' } | `fetchWithTenant(`/tasks/${id}/complete`, { method: 'PATCH' })` |
| `web\src\lib\client\dashboard-api.ts` | 42 | `fetchWithTenant` | `/api/tasks/${id}/assign` | `PATCH` | Request options: { method: 'PATCH', body: JSON.stringify({ userId }) } | `fetchWithTenant(`/tasks/${id}/assign`, { method: 'PATCH', body: JSON.stringi...)` |
| `web\src\lib\client\dashboard-api.ts` | 45 | `fetchWithTenant` | `/api/approvals` | `GET` | None | `fetchWithTenant('/approvals')` |
| `web\src\lib\client\dashboard-api.ts` | 46 | `fetchWithTenant` | `/api/approvals` | `POST` | Request options: { method: 'POST', body: JSON.stringify(data) } | `fetchWithTenant('/approvals', { method: 'POST', body: JSON.stringify(data) })` |
| `web\src\lib\client\dashboard-api.ts` | 48 | `fetchWithTenant` | `/api/approvals/${id}/approve` | `POST` | Request options: { method: 'POST', body: JSON.stringify({ userId, comment }) } | `fetchWithTenant(`/approvals/${id}/approve`, { method: 'POST', body: JSON.str...)` |
| `web\src\lib\client\dashboard-api.ts` | 50 | `fetchWithTenant` | `/api/approvals/${id}/reject` | `POST` | Request options: { method: 'POST', body: JSON.stringify({ userId, reason }) } | `fetchWithTenant(`/approvals/${id}/reject`, { method: 'POST', body: JSON.stri...)` |
| `web\src\lib\client\dashboard-api.ts` | 53 | `fetchWithTenant` | `/api/workflow/events` | `POST` | Request options: { method: 'POST', body: JSON.stringify(data) } | `fetchWithTenant('/workflow/events', { method: 'POST', body: JSON.stringify(d...)` |
| `web\src\lib\dashboard\api-client.ts` | 258 | `fetch` | `${baseUrl}${apiPath}` | `GET` | Request options: {       method,       headers: {         Accept: "application/json",         ...(options?.tenantId ? { "x-tenant-id": options.tenantId } : {}),         ...(csrfToken ? { "x-myshule-csrf": csrfToken } : {}),         ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),         ...(options?.accessToken           ? {               Authorization: `Bearer ${options.accessToken}`,               "x-auth-audience": "school",             }           : {}),       },       cache: "no-store",       credentials: "include",       signal: controller.signal,       ...(requestBody !== undefined ? { body: requestBody } : {}),     } | `fetch(`${baseUrl}${apiPath}`, {
      method,
      headers: {
   ...)` |
| `web\src\lib\dashboard\school-api-proxy-client.ts` | 47 | `fetch` | `/api${path}` | `GET` | Request options: {     method,     headers,     credentials: "same-origin",     cache: "no-store",     ...(requestBody !== undefined ? { body: requestBody } : {}),   } | `fetch(`/api${path}`, {
    method,
    headers,
    credentials: "...)` |
| `web\src\lib\data\school-hooks.test.tsx` | 29 | `useSchoolQuery` | `` | `GET` | Query / Path variables from context | `useSchoolQuery()` |
| `web\src\lib\data\school-hooks.test.tsx` | 33 | `useSchoolQuery` | `/test-route` | `GET` | Query / Path variables from context | `useSchoolQuery("/test-route")` |
| `web\src\lib\data\school-hooks.test.tsx` | 45 | `useSchoolQuery` | `/test-route` | `GET` | Query / Path variables from context | `useSchoolQuery("/test-route")` |
| `web\src\lib\data\school-hooks.test.tsx` | 56 | `useSchoolQuery` | `/test-route` | `GET` | Query / Path variables from context | `useSchoolQuery("/test-route", { tenantId: "explicit-tenant" })` |
| `web\src\lib\data\school-hooks.test.tsx` | 71 | `useSchoolQuery` | `/admin-command/principal/overview` | `GET` | Query / Path variables from context | `useSchoolQuery("/admin-command/principal/overview")` |
| `web\src\lib\data\school-hooks.test.tsx` | 79 | `useSchoolMutation` | `` | `POST` | Variables passed to mutate function | `useSchoolMutation()` |
| `web\src\lib\data\school-hooks.test.tsx` | 83 | `useSchoolMutation` | `/test-mutation` | `POST` | Variables passed to mutate function | `useSchoolMutation("/test-mutation")` |
| `web\src\lib\data\school-hooks.ts` | 37 | `useSchoolQuery` | `path: string | null` | `GET` | Query / Path variables from context | `useSchoolQuery(path: string \| null, options?: SchoolQueryOptions<T>)` |
| `web\src\lib\data\school-hooks.ts` | 62 | `useSchoolMutation` | `path: string | ((vars: TVariables) => string)` | `POST` | Variables passed to mutate function | `useSchoolMutation(
  path: string \| ((vars: TVariables) => string),
  method: ...)` |
| `web\src\lib\discipline\discipline-live.ts` | 176 | `fetch` | `/api/discipline/${path}${query}` | `GET` | Request options: {     method,     headers: {       Accept: "application/json",       ...(token ? { "x-myshule-csrf": token } : {}),       ...(!isFormData && options?.body ? { "Content-Type": "application/json" } : {}),     },     body: requestBody,     cache: "no-store",   } | `fetch(`/api/discipline/${path}${query}`, {
    method,
    headers...)` |
| `web\src\lib\discipline\discipline-live.ts` | 206 | `fetch` | `/api/counselling/${path}${query}` | `GET` | Request options: {     method,     headers: {       Accept: "application/json",       ...(token ? { "x-myshule-csrf": token } : {}),       ...(options?.body ? { "Content-Type": "application/json" } : {}),     },     body: options?.body ? JSON.stringify(options.body) : undefined,     cache: "no-store",   } | `fetch(`/api/counselling/${path}${query}`, {
    method,
    header...)` |
| `web\src\lib\discipline\discipline-live.ts` | 256 | `fetch` | `/api/admissions/students/${encodeURIComponent(studentId)}/profile?tenantSlug=${encodeURIComponent(tenantSlug)}` | `GET` | Request options: { credentials: "same-origin", cache: "no-store" } | `fetch(
    `/api/admissions/students/${encodeURIComponent(studentI...)` |
| `web\src\lib\experiences\portal-api.ts` | 45 | `useSchoolQuery` | `/api/portals/parent/children` | `GET` | Query / Path variables from context | `useSchoolQuery("/api/portals/parent/children")` |
| `web\src\lib\experiences\portal-api.ts` | 49 | `useSchoolQuery` | `/api/portals/reports${studentId ? `?studentId=${studentId}` : ""}` | `GET` | Query / Path variables from context | `useSchoolQuery(
    `/api/portals/reports${studentId ? `?studentId=${studen...)` |
| `web\src\lib\experiences\portal-api.ts` | 56 | `useSchoolQuery` | `/api/portals/fees/history${studentId ? `?studentId=${studentId}` : ""}` | `GET` | Query / Path variables from context | `useSchoolQuery(
    `/api/portals/fees/history${studentId ? `?studentId=${s...)` |
| `web\src\lib\library\library-sync.ts` | 54 | `apiString` | `/api/library/borrowings` | `GET` | Literal string usage | `"/api/library/borrowings",` |
| `web\src\lib\library\library-sync.ts` | 61 | `apiString` | `/api/library/returns` | `GET` | Literal string usage | `"/api/library/returns",` |
| `web\src\lib\platform\school-onboarding-client.ts` | 208 | `fetch` | `/api/platform/schools` | `GET` | Request options: {     method: "GET",     credentials: "same-origin",     cache: "no-store",   } | `fetch("/api/platform/schools", {
    method: "GET",
    credential...)` |
| `web\src\lib\platform\school-onboarding-client.ts` | 219 | `fetch` | `/api/platform/schools/summary` | `GET` | Request options: {     method: "GET",     credentials: "same-origin",     cache: "no-store",   } | `fetch("/api/platform/schools/summary", {
    method: "GET",
    cr...)` |
| `web\src\lib\platform\school-onboarding-client.ts` | 233 | `fetch` | `/api/platform/modules` | `GET` | Request options: {     method: "GET",     credentials: "same-origin",     cache: "no-store",   } | `fetch("/api/platform/modules", {
    method: "GET",
    credential...)` |
| `web\src\lib\platform\school-onboarding-client.ts` | 247 | `fetch` | `/api/platform/schools/${encodeURIComponent(tenantId)}/modules` | `GET` | Request options: {       method: "GET",       credentials: "same-origin",       cache: "no-store",     } | `fetch(
    `/api/platform/schools/${encodeURIComponent(tenantId)}/...)` |
| `web\src\lib\platform\school-onboarding-client.ts` | 271 | `apiString` | `/api/platform/schools` | `GET` | Literal string usage | `const response = await fetchWithTimeout("/api/platform/schools", {` |
| `web\src\lib\platform\school-onboarding-client.ts` | 292 | `DashboardApi usage` | `DashboardApi.createEvent` | `Depends on wrapper API definition` | {       event_type: 'SCHOOL_CREATED',       entity_type: 'school',       entity_id: payload.tenant_id,       module_name: 'superadmin',       action_name: 'create_school',       metadata: { schoolName: payload.school_name }     } | `DashboardApi.createEvent({
      event_type: 'SCHOOL_CREATED',
      entity_type: 'sc...)` |
| `web\src\lib\platform\school-onboarding-client.ts` | 330 | `DashboardApi usage` | `DashboardApi.createEvent` | `Depends on wrapper API definition` | {       event_type: 'MODULES_UPDATED',       entity_type: 'school',       entity_id: input.tenantId,       module_name: 'superadmin',       action_name: 'update_modules',       metadata: { moduleCodes: input.moduleCodes }     } | `DashboardApi.createEvent({
      event_type: 'MODULES_UPDATED',
      entity_type: 's...)` |
| `web\src\lib\platform\school-onboarding-client.ts` | 372 | `DashboardApi usage` | `DashboardApi.createEvent` | `Depends on wrapper API definition` | {       event_type: 'BILLING_UPDATED',       entity_type: 'school',       entity_id: input.tenantId,       module_name: 'superadmin',       action_name: 'update_billing',       metadata: { state: input.state }     } | `DashboardApi.createEvent({
      event_type: 'BILLING_UPDATED',
      entity_type: 's...)` |
| `web\src\lib\platform\school-onboarding-client.ts` | 428 | `DashboardApi usage` | `DashboardApi.createEvent` | `Depends on wrapper API definition` | {       event_type: 'SCHOOL_DELETED',       entity_type: 'school',       entity_id: input.tenantId,       module_name: 'superadmin',       action_name: 'delete_school',       metadata: { reason: input.reason }     } | `DashboardApi.createEvent({
      event_type: 'SCHOOL_DELETED',
      entity_type: 'sc...)` |
| `web\src\lib\platform\school-onboarding-client.ts` | 465 | `DashboardApi usage` | `DashboardApi.createEvent` | `Depends on wrapper API definition` | {       event_type: 'SCHOOL_HARD_DELETED',       entity_type: 'school',       entity_id: input.tenantId,       module_name: 'superadmin',       action_name: 'hard_delete_school',       metadata: { reason: input.reason }     } | `DashboardApi.createEvent({
      event_type: 'SCHOOL_HARD_DELETED',
      entity_type...)` |
| `web\src\lib\platform\school-onboarding-client.ts` | 479 | `fetch` | `/api/platform/templates` | `GET` | Request options: { method: "GET", credentials: "same-origin", cache: "no-store" } | `fetch("/api/platform/templates", { method: "GET", credentials: "sa...)` |
| `web\src\lib\platform\school-onboarding-client.ts` | 485 | `fetch` | `/api/platform/broadcasts` | `GET` | Request options: { method: "GET", credentials: "same-origin", cache: "no-store" } | `fetch("/api/platform/broadcasts", { method: "GET", credentials: "s...)` |
| `web\src\lib\platform\school-onboarding-client.ts` | 491 | `fetch` | `/api/platform/audit-logs` | `GET` | Request options: { method: "GET", credentials: "same-origin", cache: "no-store" } | `fetch("/api/platform/audit-logs", { method: "GET", credentials: "s...)` |
| `web\src\lib\platform\school-onboarding-client.ts` | 497 | `fetch` | `/api/platform/backups` | `GET` | Request options: { method: "GET", credentials: "same-origin", cache: "no-store" } | `fetch("/api/platform/backups", { method: "GET", credentials: "same...)` |
| `web\src\lib\platform\school-onboarding-client.ts` | 503 | `fetch` | `/api/platform/security-policies` | `GET` | Request options: { method: "GET", credentials: "same-origin", cache: "no-store" } | `fetch("/api/platform/security-policies", { method: "GET", credenti...)` |
| `web\src\lib\platform\school-onboarding-client.ts` | 509 | `fetch` | `/api/platform/reports` | `GET` | Request options: { method: "GET", credentials: "same-origin", cache: "no-store" } | `fetch("/api/platform/reports", { method: "GET", credentials: "same...)` |
| `web\src\lib\platform\school-onboarding-client.ts` | 515 | `fetch` | `/api/platform/users` | `GET` | Request options: { method: "GET", credentials: "same-origin", cache: "no-store" } | `fetch("/api/platform/users", { method: "GET", credentials: "same-o...)` |
| `web\src\lib\platform\school-onboarding-client.ts` | 521 | `apiString` | `/api/platform/templates` | `GET` | Literal string usage | `const response = await fetchWithTimeout("/api/platform/templates", {` |
| `web\src\lib\platform\school-onboarding-client.ts` | 534 | `apiString` | `/api/platform/broadcasts` | `GET` | Literal string usage | `const response = await fetchWithTimeout("/api/platform/broadcasts", {` |
| `web\src\lib\platform\school-onboarding-client.ts` | 547 | `apiString` | `/api/platform/security-policies` | `GET` | Literal string usage | `const response = await fetchWithTimeout("/api/platform/security-policies", {` |
| `web\src\lib\platform\school-onboarding-client.ts` | 560 | `apiString` | `/api/platform/reports/request` | `GET` | Literal string usage | `const response = await fetchWithTimeout("/api/platform/reports/request", {` |
| `web\src\lib\platform\school-onboarding-client.ts` | 573 | `apiString` | `/api/platform/settings` | `GET` | Literal string usage | `const response = await fetchWithTimeout("/api/platform/settings", {` |
| `web\src\lib\platform\school-onboarding-client.ts` | 586 | `fetch` | `/api/platform/settings` | `GET` | Request options: { method: "GET", credentials: "same-origin", cache: "no-store" } | `fetch("/api/platform/settings", { method: "GET", credentials: "sam...)` |
| `web\src\lib\platform\school-onboarding-client.ts` | 591 | `fetch` | `/api/platform/gateways` | `GET` | Request options: { method: "GET", credentials: "same-origin", cache: "no-store" } | `fetch("/api/platform/gateways", { method: "GET", credentials: "sam...)` |
| `web\src\lib\school\school-operational-store.ts` | 502 | `apiString` | `/api/events/school-operations` | `GET` | Literal string usage | `endpoint: "/api/events/school-operations",` |
| `web\src\lib\school\school-operational-store.ts` | 517 | `apiString` | `/api/events/school-operations` | `GET` | Literal string usage | `endpoint: "/api/events/school-operations",` |
| `web\src\lib\school\school-operational-store.ts` | 526 | `apiString` | `/api/events/school-operations` | `GET` | Literal string usage | `const endpoint = "/api/events/school-operations";` |
| `web\src\lib\school\school-operational-store.ts` | 875 | `apiString` | `/api/events/school-operations` | `GET` | Literal string usage | `endpoint: "/api/events/school-operations",` |
| `web\src\lib\storekeeper\storekeeper-sync.ts` | 64 | `apiString` | `/api/inventory/stock-issues` | `GET` | Literal string usage | `"/api/inventory/stock-issues",` |
| `web\src\lib\storekeeper\storekeeper-sync.ts` | 71 | `apiString` | `/api/inventory/stock-receipts` | `GET` | Literal string usage | `"/api/inventory/stock-receipts",` |
| `web\src\lib\students\student-lifecycle.api.ts` | 15 | `fetch` | `/api/students/lifecycle/${studentId}/enroll` | `POST` | Request options: {     method: 'POST',     credentials: 'same-origin',   } | `fetch(`/api/students/lifecycle/${studentId}/enroll`, {
    method:...)` |
| `web\src\lib\students\student-lifecycle.api.ts` | 24 | `fetch` | `/api/students/lifecycle/${studentId}/place-in-class` | `POST` | Request options: {     method: 'POST',     headers: { 'Content-Type': 'application/json' },     body: JSON.stringify(payload),     credentials: 'same-origin',   } | `fetch(`/api/students/lifecycle/${studentId}/place-in-class`, {
   ...)` |
| `web\src\lib\students\student-lifecycle.api.ts` | 35 | `fetch` | `/api/students/lifecycle/${studentId}/promote` | `POST` | Request options: {     method: 'POST',     headers: { 'Content-Type': 'application/json' },     body: JSON.stringify(payload),     credentials: 'same-origin',   } | `fetch(`/api/students/lifecycle/${studentId}/promote`, {
    method...)` |
| `web\src\lib\students\student-lifecycle.api.ts` | 46 | `fetch` | `/api/students/lifecycle/${studentId}/suspend` | `POST` | Request options: {     method: 'POST',     headers: { 'Content-Type': 'application/json' },     body: JSON.stringify({ reason }),     credentials: 'same-origin',   } | `fetch(`/api/students/lifecycle/${studentId}/suspend`, {
    method...)` |
| `web\src\lib\students\student-lifecycle.api.ts` | 57 | `fetch` | `/api/students/lifecycle/${studentId}/initiate-clearance` | `POST` | Request options: {     method: 'POST',     credentials: 'same-origin',   } | `fetch(`/api/students/lifecycle/${studentId}/initiate-clearance`, {...)` |
| `web\src\lib\students\student-lifecycle.api.ts` | 66 | `fetch` | `/api/students/lifecycle/${studentId}/exit` | `POST` | Request options: {     method: 'POST',     headers: { 'Content-Type': 'application/json' },     body: JSON.stringify(payload),     credentials: 'same-origin',   } | `fetch(`/api/students/lifecycle/${studentId}/exit`, {
    method: '...)` |
| `web\src\lib\students\student-lifecycle.api.ts` | 77 | `fetch` | `/api/students/lifecycle/${studentId}/archive` | `PATCH` | Request options: {     method: 'PATCH',     credentials: 'same-origin',   } | `fetch(`/api/students/lifecycle/${studentId}/archive`, {
    method...)` |
| `web\src\lib\students\student-lookup.ts` | 19 | `fetch` | `/api/admissions/students?${params.toString()}` | `GET` | Request options: {     credentials: "same-origin",     cache: "no-store",   } | `fetch(`/api/admissions/students?${params.toString()}`, {
    crede...)` |
| `web\src\lib\support\support-live.ts` | 607 | `fetch` | `/api/support${path}${query ? `${separator}${query}` : ""}` | `GET` | Request options: {     method,     credentials: "same-origin",     headers: options?.formData       ? csrfHeaders       : {           Accept: "application/json",           ...csrfHeaders,           ...(options?.body ? { "Content-Type": "application/json" } : {}),         },     body: options?.formData ?? (options?.body ? JSON.stringify(options.body) : undefined),   } | `fetch(`/api/support${path}${query ? `${separator}${query}` : ""}`,...)` |
| `web\src\lib\support\support-live.ts` | 638 | `fetch` | `/api/support${path}` | `GET` | Request options: {     method: "GET",     credentials: "same-origin",     headers: {       Accept: "application/json",     },   } | `fetch(`/api/support${path}`, {
    method: "GET",
    credentials:...)` |
| `web\src\lib\workflows\offline-sync-engine.ts` | 80 | `fetch` | `/api/operational-workflows/offline-sync` | `POST` | Request options: {             method: 'POST',             headers: { 'Content-Type': 'application/json' },             body: JSON.stringify({               action_id: item.actionId,               workflow_binding: item.workflowBinding,               aggregate_id: item.aggregateId,               payload: item.payload,             }),           } | `fetch('/api/operational-workflows/offline-sync', {
            met...)` |

## Analysis of Endpoints and Modules

### Module: Academic (15 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/academic/communications` | `GET` | `web\src\components\school\class-teacher\workspaces\communication.tsx:18` |
| `/api/academic/dean/lock-batch` | `GET` | `web\src\components\school\dean-academics-command-center.tsx:458` |
| `/api/academic/dean/action` | `GET` | `web\src\components\school\dean-academics-command-center.tsx:880` |
| `/api/academic/exams-manager/export-marks` | `GET` | `web\src\components\school\exams-manager-command-center.tsx:950` |
| `/api/academic/exams-manager/zeraki-sync` | `GET` | `web\src\components\school\exams-manager-command-center.tsx:970` |
| `/api/academic/communications` | `POST (Guess)` | `web\src\components\school\grade-master-command-center.tsx:383` |
| `/api/academic/grade-master/compile` | `POST (Guess)` | `web\src\components\school\grade-master-command-center.tsx:458` |
| `/api/academic/communications` | `POST (Guess)` | `web\src\components\school\grade-master-command-center.tsx:529` |
| `/api/academic/grade-master/comment` | `POST (Guess)` | `web\src\components\school\grade-master-command-center.tsx:599` |
| `/api/academic/hod/requests` | `GET` | `web\src\components\school\hod-command-center.tsx:246` |
| `/api/academic/hod/subject-allocation` | `GET` | `web\src\components\school\hod-command-center.tsx:319` |
| `/api/academic/hod/department-meetings` | `GET` | `web\src\components\school\hod-command-center.tsx:417` |
| `/api/academic/hod/requests` | `GET` | `web\src\components\school\hod-command-center.tsx:480` |
| `/api/academic/hod/requests` | `GET` | `web\src\components\school\hod-command-center.tsx:497` |
| `/api/academic/marks/enter` | `GET` | `web\src\components\school\teacher\marks-entry-workspace.tsx:50` |

### Module: Academics (30 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/academics/terms${tenantId ? `?tenant_id=${tenantId}` : ""}` | `GET` | `web\src\components\modules\academics\AcademicSetup.tsx:21` |
| `/api/academics/subjects${tenantId ? `?tenant_id=${tenantId}` : ""}` | `GET` | `web\src\components\modules\academics\AcademicSetup.tsx:30` |
| `/api/academics/academic-years` | `GET` | `web\src\components\school\admin\classes-streams-workspace.tsx:12` |
| `/api/academics/academic-terms` | `GET` | `web\src\components\school\admin\classes-streams-workspace.tsx:13` |
| `/api/academics/class-sections` | `GET` | `web\src\components\school\admin\classes-streams-workspace.tsx:14` |
| `/api/academics/years` | `POST` | `web\src\components\school\admin\classes-streams-workspace.tsx:16` |
| `/api/academics/terms` | `POST` | `web\src\components\school\admin\classes-streams-workspace.tsx:17` |
| `/api/academics/class-sections` | `POST` | `web\src\components\school\admin\classes-streams-workspace.tsx:18` |
| `/api/academics/grading-systems` | `GET` | `web\src\components\school\admin\data-setup-workspace.tsx:12` |
| `/api/academics/attendance-settings` | `GET` | `web\src\components\school\admin\data-setup-workspace.tsx:13` |
| `/api/academics/grading-systems` | `POST` | `web\src\components\school\admin\data-setup-workspace.tsx:15` |
| `/api/academics/attendance-settings` | `POST` | `web\src\components\school\admin\data-setup-workspace.tsx:16` |
| `/api/academics/subjects` | `GET` | `web\src\components\school\admin\subjects-workspace.tsx:12` |
| `/api/academics/teacher-assignments` | `GET` | `web\src\components\school\admin\subjects-workspace.tsx:13` |
| `/api/academics/class-sections` | `GET` | `web\src\components\school\admin\subjects-workspace.tsx:16` |
| `/api/academics/academic-terms` | `GET` | `web\src\components\school\admin\subjects-workspace.tsx:17` |
| `/api/academics/subjects` | `POST` | `web\src\components\school\admin\subjects-workspace.tsx:19` |
| `/api/academics/teacher-assignments` | `POST` | `web\src\components\school\admin\subjects-workspace.tsx:20` |
| `/api/academics/my-assignments` | `GET` | `web\src\components\school\hod-command-center.tsx:182` |
| `/api/academics/my-lesson-logs` | `GET` | `web\src\components\school\hod-command-center.tsx:183` |
| `/api/academics/teacher-assignments` | `GET` | `web\src\components\school\hod-command-center.tsx:309` |
| `/api/academics/summary` | `GET` | `web\src\components\school\hod-command-center.tsx:472` |
| `/api/academics/my-assignments` | `GET` | `web\src\components\school\parent\academics-workspace.tsx:10` |
| `/api/academics/teacher-assignments` | `GET` | `web\src\components\school\school-pages.tsx:4055` |
| `/api/academics/my-assignments` | `GET` | `web\src\components\school\student\academics-workspace.tsx:14` |
| `/api/academics/my-assignments` | `GET` | `web\src\components\school\teacher\assignments-homework-workspace.tsx:17` |
| `/api/academics/assignments` | `GET` | `web\src\components\school\teacher\assignments-homework-workspace.tsx:20` |
| `/api/academics/my-lesson-logs?date=${activeDate}` | `GET` | `web\src\components\school\teacher\lesson-logs-workspace.tsx:12` |
| `/api/academics/lesson-logs` | `POST` | `web\src\components\school\teacher\lesson-logs-workspace.tsx:13` |
| `/api/academics/teacher-assignments` | `GET` | `web\src\components\school\teacher\subjects-classes-workspace.tsx:9` |

### Module: Admin-command (23 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/admin-command/principal/reports` | `GET` | `web\src\components\school\admin\reports-workspace.tsx:13` |
| `/api/admin-command/boarding/assign-bed` | `GET` | `web\src\components\school\boarding-master-command-center.tsx:337` |
| `/api/admin-command/boarding/roll-call` | `GET` | `web\src\components\school\boarding-master-command-center.tsx:389` |
| `/api/admin-command/boarding/incidents` | `GET` | `web\src\components\school\boarding-master-command-center.tsx:484` |
| `/api/admin-command/library/issue` | `GET` | `web\src\components\school\librarian-command-center.tsx:330` |
| `/api/admin-command/library/return` | `GET` | `web\src\components\school\librarian-command-center.tsx:434` |
| `/api/admin-command/library/add` | `POST (Guess)` | `web\src\components\school\librarian-command-center.tsx:481` |
| `/api/admin-command/clinic/visit` | `GET` | `web\src\components\school\nurse-command-center.tsx:23` |
| `/api/admin-command/frontoffice/visitors` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:425` |
| `/api/admin-command/frontoffice/appointments` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:528` |
| `/api/admin-command/frontoffice/mail` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:674` |
| `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | `web\src\components\school\security-command-center.tsx:251` |
| `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | `web\src\components\school\security-command-center.tsx:266` |
| `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | `web\src\components\school\security-command-center.tsx:546` |
| `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | `web\src\components\school\security-command-center.tsx:597` |
| `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | `web\src\components\school\security-command-center.tsx:650` |
| `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | `web\src\components\school\security-command-center.tsx:665` |
| `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | `web\src\components\school\security-command-center.tsx:721` |
| `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | `web\src\components\school\security-command-center.tsx:772` |
| `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | `web\src\components\school\security-command-center.tsx:826` |
| `/api/admin-command/frontoffice/dispatch` | `PATCH (Guess)` | `web\src\components\school\security-command-center.tsx:841` |
| `/api/admin-command/transport/route` | `GET` | `web\src\components\school\transport-manager-command-center.tsx:692` |
| `/api/admin-command/transport/maintenance` | `GET` | `web\src\components\school\transport-manager-command-center.tsx:814` |

### Module: Admissions (14 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/admissions/applications?status=pending_enrolment` | `GET` | `web\src\components\school\admissions-dashboard\enrolment-workspace.tsx:21` |
| `/api/admissions/applications/${selectedApplicantPreview.id}/approve` | `GET` | `web\src\components\school\registrar-command-center.tsx:1099` |
| `/api/admissions/quick-actions` | `GET` | `web\src\components\school\registrar-command-center.tsx:1167` |
| `/api/admissions/applicants` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4914` |
| `/api/admissions/applicants` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4916` |
| `/api/admissions` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:388` |
| `/api/admissions/applications` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:629` |
| `/api/admissions/applications?limit=200` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1510` |
| `/api/admissions/applications/{id}` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1511` |
| `/api/admissions/applications?limit=200` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1524` |
| `/api/admissions/applications/{id}` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1525` |
| `/api/admissions/applications?limit=200` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1538` |
| `/api/admissions/students/${encodeURIComponent(studentId)}/profile?tenantSlug=${encodeURIComponent(tenantSlug)}` | `GET` | `web\src\lib\discipline\discipline-live.ts:256` |
| `/api/admissions/students?${params.toString()}` | `GET` | `web\src\lib\students\student-lookup.ts:19` |

### Module: Ai-insights (2 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/ai-insights` | `GET` | `web\src\components\modules\ai-insights\ai-insights-module-screen.tsx:14` |
| `/api/ai-insights/dashboard` | `GET` | `web\src\components\school\admin\data-quality-workspace.tsx:9` |

### Module: Approvals (7 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/approvals/pending` | `GET` | `web\src\lib\client\approvals-api.ts:19` |
| `/api/approvals/my-requests` | `GET` | `web\src\lib\client\approvals-api.ts:26` |
| `/api/approvals/${id}/action` | `PATCH` | `web\src\lib\client\approvals-api.ts:33` |
| `/api/approvals` | `GET` | `web\src\lib\client\dashboard-api.ts:45` |
| `/api/approvals` | `POST` | `web\src\lib\client\dashboard-api.ts:46` |
| `/api/approvals/${id}/approve` | `POST` | `web\src\lib\client\dashboard-api.ts:48` |
| `/api/approvals/${id}/reject` | `POST` | `web\src\lib\client\dashboard-api.ts:50` |

### Module: Assets (4 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/assets` | `GET` | `web\src\components\modules\assets\asset-tracking-module-screen.tsx:374` |
| `/api/assets/dashboard` | `GET` | `web\src\components\school\ict-manager-command-center.tsx:38` |
| `/api/assets/dashboard` | `GET` | `web\src\components\school\ict-manager-command-center.tsx:134` |
| `/api/assets` | `GET` | `web\src\components\school\ict-manager-command-center.tsx:231` |

### Module: Attendance (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/attendance/mark` | `GET` | `web\src\hooks\useAttendance.ts:26` |

### Module: Attendance${queryparams} (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/attendance${queryParams}` | `GET` | `web\src\hooks\useAttendance.ts:21` |

### Module: Auth (28 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/auth/login` | `POST` | `web\src\components\auth\mfa-verification-view.tsx:103` |
| `/api/auth/parent/otp/request` | `POST` | `web\src\components\auth\portal-login-view.tsx:114` |
| `/api/auth/parent/otp/verify` | `POST` | `web\src\components\auth\portal-login-view.tsx:136` |
| `/api/auth/logout` | `POST` | `web\src\components\platform\superadmin-pages.tsx:535` |
| `/api/auth/sessions` | `GET` | `web\src\components\school\session-management-panel.tsx:22` |
| `/api/auth/sessions/revoke` | `POST` | `web\src\components\school\session-management-panel.tsx:24` |
| `/api/auth/invitations?limit=50&offset=0` | `GET` | `web\src\components\school\user-management-panel.tsx:83` |
| `/api/auth/invitations` | `POST` | `web\src\components\school\user-management-panel.tsx:130` |
| `/api/auth/invitations/${user.id}/resend` | `POST` | `web\src\components\school\user-management-panel.tsx:179` |
| `/api/auth/invitations/${user.id}` | `DELETE` | `web\src\components\school\user-management-panel.tsx:210` |
| `/api/auth/tenant-users/${user.id}/status` | `PATCH` | `web\src\components\school\user-management-panel.tsx:237` |
| `/api/auth/tenant-users/${user.id}/role` | `PATCH` | `web\src\components\school\user-management-panel.tsx:274` |
| `/api/auth/invitations?limit=50&offset=0` | `GET` | `web\src\components\school\user-management-workspace.tsx:573` |
| `/api/auth/tenant-users/${encodeURIComponent(user.id)}/status` | `PATCH` | `web\src\components\school\user-management-workspace.tsx:683` |
| `/api/auth/invitations/${encodeURIComponent(invite.id)}/resend` | `POST` | `web\src\components\school\user-management-workspace.tsx:767` |
| `/api/auth/invitations/${encodeURIComponent(invite.id)}` | `DELETE` | `web\src\components\school\user-management-workspace.tsx:834` |
| `/api/auth/tenant-users/${encodeURIComponent(editingUser.id)}/role` | `PATCH` | `web\src\components\school\user-management-workspace.tsx:924` |
| `/api/auth/invitations` | `POST` | `web\src\components\school\user-management-workspace.tsx:1013` |
| `/api/auth/csrf` | `GET` | `web\src\lib\auth\csrf-client.ts:5` |
| `/api/auth/email-verification/request` | `POST (Guess)` | `web\src\lib\auth\email-verification-client.ts:38` |
| `/api/auth/email-verification/verify` | `POST (Guess)` | `web\src\lib\auth\email-verification-client.ts:42` |
| `/api/auth/invitations/accept` | `POST` | `web\src\lib\auth\invitation-client.ts:18` |
| `/api/auth/password-recovery/request` | `POST (Guess)` | `web\src\lib\auth\recovery-client.ts:43` |
| `/api/auth/password-recovery/reset` | `POST (Guess)` | `web\src\lib\auth\recovery-client.ts:47` |
| `/api/auth/me?${query.toString()}` | `GET` | `web\src\lib\auth\use-experience-session.ts:72` |
| `/api/auth/login` | `POST` | `web\src\lib\auth\use-experience-session.ts:119` |
| `/api/auth/logout` | `POST` | `web\src\lib\auth\use-experience-session.ts:152` |
| `/api/auth/refresh` | `POST` | `web\src\lib\auth\use-experience-session.ts:173` |

### Module: Billing (7 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/billing/student-balances` | `GET` | `web\src\components\school\accountant\arrears-workspace.tsx:32` |
| `/api/billing/manual-fee-payments/${receipt.id}/${action}` | `GET` | `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:448` |
| `/api/billing/finance-activity?limit=10&offset=0` | `GET` | `web\src\components\school\accountant\overview-workspace.tsx:38` |
| `/api/billing/finance-activity?limit=100&offset=0` | `GET` | `web\src\components\school\accountant\receipts-workspace.tsx:34` |
| `/api/billing/student-balances/csv` | `GET` | `web\src\components\school\accountant\reports-workspace.tsx:54` |
| `/api/billing/reconciliation/csv` | `GET` | `web\src\components\school\accountant\reports-workspace.tsx:60` |
| `/api/billing/waivers` | `GET` | `web\src\components\school\accountant\waivers-discounts-workspace.tsx:38` |

### Module: Boarding (13 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/boarding` | `GET` | `web\src\components\modules\boarding\boarding-module-screen.tsx:14` |
| `/api/boarding/dashboard` | `GET` | `web\src\components\school\boarding-master-command-center.tsx:231` |
| `/api/boarding/dashboard` | `GET` | `web\src\components\school\boarding-master-command-center.tsx:291` |
| `/api/boarding/dashboard` | `GET` | `web\src\components\school\boarding-master-command-center.tsx:316` |
| `/api/boarding/dashboard` | `GET` | `web\src\components\school\boarding-master-command-center.tsx:331` |
| `/api/boarding/dashboard` | `GET` | `web\src\components\school\boarding-master-command-center.tsx:383` |
| `/api/boarding/dashboard` | `GET` | `web\src\components\school\boarding-master-command-center.tsx:478` |
| `/api/boarding/roll-calls` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4931` |
| `/api/boarding/roll-calls` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4933` |
| `/api/boarding/exeats` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4935` |
| `/api/boarding/exeats` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4937` |
| `/api/boarding/dashboard` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1831` |
| `/api/boarding/records/{id}/status` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1833` |

### Module: Cbt (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/cbt` | `GET` | `web\src\components\modules\cbt\cbt-module-screen.tsx:14` |

### Module: Clinic (9 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/clinic/parent/students/${encodeURIComponent(studentId.trim())}/history` | `GET` | `web\src\components\portal\portal-pages.tsx:943` |
| `/api/clinic/parent/students/me/history` | `GET` | `web\src\components\school\parent\clinic-health-workspace.tsx:10` |
| `/api/clinic/visits` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4905` |
| `/api/clinic/visits` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4907` |
| `/api/clinic/medicines/stock` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4909` |
| `/api/clinic/medicines/stock` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4911` |
| `/api/clinic/analytics/principal${query}` | `GET` | `web\src\components\school\school-pages.tsx:3600` |
| `/api/clinic/medicines${query}` | `GET` | `web\src\components\school\school-pages.tsx:3601` |
| `/api/clinic/medicines` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1646` |

### Module: Communication (6 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/communication/sms` | `GET` | `web\src\components\school\deputy-principal\communication-workspace.tsx:22` |
| `/api/communication/sms` | `GET` | `web\src\components\school\deputy-principal\communication-workspace.tsx:30` |
| `/api/communication/summary` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:370` |
| `/api/communication/summary` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:501` |
| `/api/communication/summary` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:611` |
| `/api/communication/messages` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:647` |

### Module: Counselling (7 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/counselling/dashboard` | `GET` | `web\src\components\school\counsellor-command-center.tsx:142` |
| `/api/counselling/referrals` | `GET` | `web\src\components\school\counsellor-command-center.tsx:143` |
| `/api/counselling/sessions` | `GET` | `web\src\components\school\counsellor-command-center.tsx:144` |
| `/api/counselling/referrals` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1872` |
| `/api/counselling/referrals` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1888` |
| `/api/counselling/referrals` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1907` |
| `/api/counselling/${path}${query}` | `GET` | `web\src\lib\discipline\discipline-live.ts:206` |

### Module: Dashboard (5 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/dashboard/layout` | `GET` | `web\src\components\school\admin\overview-workspace.tsx:9` |
| `/api/dashboard/summary?role=secretary` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:791` |
| `/api/dashboard/layout?role=teacher` | `GET` | `web\src\components\school\teacher\overview-workspace.tsx:9` |
| `/api/dashboard/feed?role=${role}&limit=${limit}&offset=${offset}` | `GET` | `web\src\lib\client\dashboard-api.ts:29` |
| `/api/dashboard/summary?role=${role}` | `GET` | `web\src\lib\client\dashboard-api.ts:32` |

### Module: Discipline (15 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/discipline/parent/incidents` | `GET` | `web\src\components\school\parent\behavior-workspace.tsx:13` |
| `/api/discipline/students/me/behavior-score` | `GET` | `web\src\components\school\parent\behavior-workspace.tsx:16` |
| `/api/discipline/parent/incidents` | `GET` | `web\src\components\school\student\behavior-workspace.tsx:10` |
| `/api/discipline/students/me/behavior-score` | `GET` | `web\src\components\school\student\behavior-workspace.tsx:13` |
| `/api/discipline/incidents` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1770` |
| `/api/discipline/incidents` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1787` |
| `/api/discipline/incidents/{id}/actions` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1788` |
| `/api/discipline/incidents` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1849` |
| `/api/discipline/incidents/{id}/actions` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1850` |
| `/api/discipline/incidents` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1871` |
| `/api/discipline/cases` | `POST` | `web\src\hooks\useDiscipline.ts:25` |
| `/api/discipline/cases` | `GET` | `web\src\hooks\useDiscipline.ts:26` |
| `/api/discipline/cases/${caseId}` | `PATCH` | `web\src\hooks\useDiscipline.ts:31` |
| `/api/discipline/cases/${caseId}` | `GET` | `web\src\hooks\useDiscipline.ts:32` |
| `/api/discipline/${path}${query}` | `GET` | `web\src\lib\discipline\discipline-live.ts:176` |

### Module: Discipline${queryparams} (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/discipline${queryParams}` | `GET` | `web\src\hooks\useDiscipline.ts:21` |

### Module: Events (6 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/events/notifications?limit=8` | `GET` | `web\src\components\school\school-pages.tsx:3987` |
| `/api/events/notifications/${encodeURIComponent(item.id)}/read` | `POST` | `web\src\components\school\school-pages.tsx:4099` |
| `/api/events/school-operations` | `GET` | `web\src\lib\school\school-operational-store.ts:502` |
| `/api/events/school-operations` | `GET` | `web\src\lib\school\school-operational-store.ts:517` |
| `/api/events/school-operations` | `GET` | `web\src\lib\school\school-operational-store.ts:526` |
| `/api/events/school-operations` | `GET` | `web\src\lib\school\school-operational-store.ts:875` |

### Module: Exams (24 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/exams/marks?exam_series_id=${examSeriesId}&subject_id=${subjectId}&class_section_id=${classSectionId}${tenantId ? `&tenant_id=${tenantId}` : ""}` | `GET` | `web\src\components\modules\exams\MarksEntryTable.tsx:33` |
| `/api/exams/marks/enter` | `POST` | `web\src\components\modules\exams\MarksEntryTable.tsx:41` |
| `/api/exams/series/${examSeriesId}/readiness${tenantId ? `?tenant_id=${tenantId}` : ""}` | `GET` | `web\src\components\modules\exams\ReportCardGenerator.tsx:20` |
| `/api/exams/series/publish` | `POST` | `web\src\components\modules\exams\ReportCardGenerator.tsx:29` |
| `/api/exams/marks/school` | `GET` | `web\src\components\school\dean-academics-command-center.tsx:445` |
| `/api/exams/dashboard` | `GET` | `web\src\components\school\exams-manager-command-center.tsx:1298` |
| `/api/exams/configuration` | `POST` | `web\src\components\school\exams-manager-command-center.tsx:1334` |
| `/api/exams/draft` | `POST` | `web\src\components\school\exams-manager-command-center.tsx:1335` |
| `/api/exams/alignment` | `POST` | `web\src\components\school\exams-manager-command-center.tsx:1336` |
| `/api/exams/marks` | `POST` | `web\src\components\school\exams-manager-command-center.tsx:1337` |
| `/api/exams/review` | `POST` | `web\src\components\school\exams-manager-command-center.tsx:1338` |
| `/api/exams/lifecycle` | `POST` | `web\src\components\school\exams-manager-command-center.tsx:1339` |
| `/api/exams/report-cards` | `GET` | `web\src\components\school\parent\academics-workspace.tsx:11` |
| `/api/exams/marks` | `GET` | `web\src\components\school\parent\academics-workspace.tsx:12` |
| `/api/exams/report-cards` | `GET` | `web\src\components\school\student\academics-workspace.tsx:15` |
| `/api/exams/marks?exam=' + encodeURIComponent(selectedExam)` | `GET` | `web\src\components\school\teacher\marks-entry-workspace.tsx:18` |
| `/api/exams/marks/school` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1350` |
| `/api/exams/series/{id}/publish` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1351` |
| `/api/exams/report-cards` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1402` |
| `/api/exams/report-cards` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1926` |
| `/api/exams/report-cards/{id}/parent-download` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1927` |
| `/api/exams/report-cards` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1940` |
| `/api/exams/report-cards` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1958` |
| `/api/exams/report-cards/{id}/parent-download` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1960` |

### Module: Fees (2 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/fees/payments` | `GET` | `web\src\hooks\useFees.ts:26` |
| `/api/fees/summary` | `GET` | `web\src\hooks\useFees.ts:32` |

### Module: Fees${queryparams} (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/fees${queryParams}` | `GET` | `web\src\hooks\useFees.ts:21` |

### Module: Finance (8 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/finance/accounts-overview` | `GET` | `web\src\components\school\parent\fees-workspace.tsx:15` |
| `/api/finance/collections` | `GET` | `web\src\components\school\parent\fees-workspace.tsx:16` |
| `/api/finance/invoices` | `GET` | `web\src\components\school\parent\fees-workspace.tsx:17` |
| `/api/finance/balances` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4963` |
| `/api/finance/balances` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4965` |
| `/api/finance/payments` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4967` |
| `/api/finance/payments` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4969` |
| `/api/finance/accounts-overview` | `GET` | `web\src\components\school\student\fees-workspace.tsx:10` |

### Module: Grade-master (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/grade-master/overview` | `GET` | `web\src\components\school\grade-master-command-center.tsx:288` |

### Module: Health (3 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/health` | `GET` | `web\src\components\school\ict-manager-command-center.tsx:230` |
| `/api/health/visits` | `POST` | `web\src\hooks\useHealth.ts:25` |
| `/api/health/visits` | `GET` | `web\src\hooks\useHealth.ts:26` |

### Module: Health${queryparams} (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/health${queryParams}` | `GET` | `web\src\hooks\useHealth.ts:21` |

### Module: Hostel (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/hostel` | `GET` | `web\src\components\modules\hostel\hostel-module-screen.tsx:14` |

### Module: Hr (27 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/hr/staff` | `GET` | `web\src\components\school\admin\staff-records-workspace.tsx:18` |
| `/api/hr/departments` | `GET` | `web\src\components\school\admin\staff-records-workspace.tsx:19` |
| `/api/hr/job-titles` | `GET` | `web\src\components\school\admin\staff-records-workspace.tsx:20` |
| `/api/hr/attendance?date=${attendanceDate}` | `GET` | `web\src\components\school\admin\staff-records-workspace.tsx:21` |
| `/api/hr/leave` | `GET` | `web\src\components\school\admin\staff-records-workspace.tsx:22` |
| `/api/hr/payroll/bands` | `GET` | `web\src\components\school\admin\staff-records-workspace.tsx:23` |
| `/api/hr/payroll/payslips?month=${payslipMonth}&year=${payslipYear}` | `GET` | `web\src\components\school\admin\staff-records-workspace.tsx:24` |
| `/api/hr/performance/reviews` | `GET` | `web\src\components\school\admin\staff-records-workspace.tsx:25` |
| `/api/hr/performance/disciplinary` | `GET` | `web\src\components\school\admin\staff-records-workspace.tsx:26` |
| `/api/hr/staff/invite` | `POST` | `web\src\components\school\admin\staff-records-workspace.tsx:28` |
| `/api/hr/staff/approve` | `POST` | `web\src\components\school\admin\staff-records-workspace.tsx:29` |
| `/api/hr/staff/reactivate` | `POST` | `web\src\components\school\admin\staff-records-workspace.tsx:30` |
| `/api/hr/staff/accept-invite` | `POST` | `web\src\components\school\admin\staff-records-workspace.tsx:31` |
| `/api/hr/staff/complete-profile` | `POST` | `web\src\components\school\admin\staff-records-workspace.tsx:32` |
| `/api/hr/attendance` | `POST` | `web\src\components\school\admin\staff-records-workspace.tsx:33` |
| `/api/hr/leave/request` | `POST` | `web\src\components\school\admin\staff-records-workspace.tsx:34` |
| `/api/hr/departments` | `POST` | `web\src\components\school\admin\staff-records-workspace.tsx:36` |
| `/api/hr/job-titles` | `POST` | `web\src\components\school\admin\staff-records-workspace.tsx:37` |
| `/api/hr/staff/role` | `PATCH` | `web\src\components\school\admin\staff-records-workspace.tsx:38` |
| `/api/hr/payroll/bands` | `POST` | `web\src\components\school\admin\staff-records-workspace.tsx:39` |
| `/api/hr/staff/salary` | `PATCH` | `web\src\components\school\admin\staff-records-workspace.tsx:40` |
| `/api/hr/payroll/payslips` | `POST` | `web\src\components\school\admin\staff-records-workspace.tsx:41` |
| `/api/hr/performance/reviews` | `POST` | `web\src\components\school\admin\staff-records-workspace.tsx:42` |
| `/api/hr/performance/disciplinary` | `POST` | `web\src\components\school\admin\staff-records-workspace.tsx:43` |
| `/api/hr/staff` | `GET` | `web\src\components\school\admin\subjects-workspace.tsx:15` |
| `/api/hr/staff?department=academics` | `GET` | `web\src\components\school\hod-command-center.tsx:239` |
| `/api/hr/staff` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:755` |

### Module: Integrations (3 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/integrations/daraja` | `GET` | `web\src\components\school\school-pages.tsx:3114` |
| `/api/integrations/daraja` | `PUT` | `web\src\components\school\school-pages.tsx:3154` |
| `/api/integrations/daraja/test?environment=${encodeURIComponent(form.environment)}` | `POST` | `web\src\components\school\school-pages.tsx:3193` |

### Module: Inventory (19 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/inventory/purchase-orders?limit=5` | `GET` | `web\src\components\school\procurement-officer-command-center.tsx:37` |
| `/api/inventory/requests?status=pending` | `GET` | `web\src\components\school\procurement-officer-command-center.tsx:38` |
| `/api/inventory/summary` | `GET` | `web\src\components\school\procurement-officer-command-center.tsx:39` |
| `/api/inventory/purchase-orders` | `GET` | `web\src\components\school\procurement-officer-command-center.tsx:89` |
| `/api/inventory/suppliers` | `GET` | `web\src\components\school\procurement-officer-command-center.tsx:133` |
| `/api/inventory/requests` | `GET` | `web\src\components\school\procurement-officer-command-center.tsx:175` |
| `/api/inventory/requests` | `GET` | `web\src\components\school\storekeeper-command-center.tsx:1188` |
| `/api/inventory/requisitions` | `POST` | `web\src\components\school\storekeeper-command-center.tsx:1193` |
| `/api/inventory/heatmap` | `GET` | `web\src\components\school\storekeeper-command-center.tsx:1289` |
| `/api/inventory/suppliers` | `GET` | `web\src\components\school\storekeeper-command-center.tsx:1336` |
| `/api/inventory/incidents` | `GET` | `web\src\components\school\storekeeper-command-center.tsx:1387` |
| `/api/inventory/stock-movements` | `GET` | `web\src\components\school\storekeeper-command-center.tsx:1411` |
| `/api/inventory/insights` | `GET` | `web\src\components\school\storekeeper-command-center.tsx:1457` |
| `/api/inventory/summary` | `GET` | `web\src\components\school\storekeeper-command-center.tsx:1595` |
| `/api/inventory/requests` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1450` |
| `/api/inventory/requests/{id}/status` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1451` |
| `/api/inventory/incidents` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1592` |
| `/api/inventory/stock-issues` | `GET` | `web\src\lib\storekeeper\storekeeper-sync.ts:64` |
| `/api/inventory/stock-receipts` | `GET` | `web\src\lib\storekeeper\storekeeper-sync.ts:71` |

### Module: Iot (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/iot/dashboard` | `GET` | `web\src\components\modules\iot\iot-module-screen.tsx:410` |

### Module: Iot${path} (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/iot${path}` | `GET` | `web\src\components\modules\iot\iot-module-screen.tsx:440` |

### Module: Labs (9 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/labs/dashboard` | `GET` | `web\src\components\school\laboratory-technician-command-center.tsx:169` |
| `/api/labs/inventory` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4950` |
| `/api/labs/inventory` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4952` |
| `/api/labs/requests` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4954` |
| `/api/labs/requests` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4956` |
| `/api/labs/issues` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4958` |
| `/api/labs/issues` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4960` |
| `/api/labs/dashboard` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1682` |
| `/api/labs/dashboard` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1700` |

### Module: Library (15 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/library/scan-issue` | `POST (Guess)` | `web\src\components\library\library-workspace.tsx:209` |
| `/api/library/scan-return` | `POST (Guess)` | `web\src\components\library\library-workspace.tsx:291` |
| `/api/library/summary` | `GET` | `web\src\components\school\librarian-command-center.tsx:171` |
| `/api/library/circulation` | `GET` | `web\src\components\school\librarian-command-center.tsx:172` |
| `/api/library/catalog` | `GET` | `web\src\components\school\librarian-command-center.tsx:535` |
| `/api/library/books` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4919` |
| `/api/library/books` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4921` |
| `/api/library/loans` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4923` |
| `/api/library/loans` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4925` |
| `/api/library/loans${queryParams}` | `GET` | `web\src\hooks\useLibrary.ts:21` |
| `/api/library/issue` | `POST` | `web\src\hooks\useLibrary.ts:25` |
| `/api/library/issue` | `GET` | `web\src\hooks\useLibrary.ts:26` |
| `/api/library/loans/${loanId}` | `GET` | `web\src\hooks\useLibrary.ts:32` |
| `/api/library/borrowings` | `GET` | `web\src\lib\library\library-sync.ts:54` |
| `/api/library/returns` | `GET` | `web\src\lib\library\library-sync.ts:61` |

### Module: Lms (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/lms` | `GET` | `web\src\components\modules\lms\lms-module-screen.tsx:14` |

### Module: Notifications (2 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/notifications` | `GET` | `web\src\lib\client\dashboard-api.ts:35` |
| `/api/notifications/${id}/read` | `PATCH` | `web\src\lib\client\dashboard-api.ts:36` |

### Module: Observability (4 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/observability/alerts` | `GET` | `web\src\components\school\ict-manager-command-center.tsx:36` |
| `/api/observability/health` | `GET` | `web\src\components\school\ict-manager-command-center.tsx:37` |
| `/api/observability/alerts` | `GET` | `web\src\components\school\ict-manager-command-center.tsx:186` |
| `/api/observability/alerts` | `GET` | `web\src\components\school\ict-manager-command-center.tsx:229` |

### Module: Operational-workflows (25 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/operational-workflows/.../dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1403` |
| `/api/operational-workflows/principal/actions/assign-reviewer/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1433` |
| `/api/operational-workflows/principal/actions/request-supplier-revision/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1479` |
| `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1497` |
| `/api/operational-workflows/principal/actions/print-admission-letter/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1539` |
| `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1557` |
| `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1575` |
| `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1593` |
| `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1611` |
| `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1629` |
| `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1647` |
| `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1665` |
| `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1683` |
| `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1701` |
| `/api/operational-workflows/principal/actions/change-sms-channel/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1729` |
| `/api/operational-workflows/principal/actions/flag-mpesa-exception/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1757` |
| `/api/operational-workflows/principal/actions/open-incident-center/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1771` |
| `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1814` |
| `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1834` |
| `/api/operational-workflows/principal/actions/escalate-counselling-case/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1889` |
| `/api/operational-workflows/principal/actions/schedule-parent-welfare-meeting/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1908` |
| `/api/operational-workflows/principal/actions/schedule-report/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1941` |
| `/api/operational-workflows/principal/actions/retry-document-generation/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1961` |
| `/api/operational-workflows/principal/actions/${action.actionId}/dispatch` | `PATCH (Guess)` | `web\src\components\workflows\approval-command-panel.tsx:1979` |
| `/api/operational-workflows/offline-sync` | `POST` | `web\src\lib\workflows\offline-sync-engine.ts:80` |

### Module: Operations (2 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/operations/reports` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:726` |
| `/api/operations/reports` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:773` |

### Module: Others (394 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `${baseUrl}/dashboard/layout?${qs}` | `GET` | `web\src\app\dashboard\page.tsx:29` |
| `/dashboard/layout?role=${role}` | `GET` | `web\src\components\dashboard\dashboard-engine.tsx:32` |
| `/exams/report-cards?status=under_review,approved,published` | `GET` | `web\src\components\modules\exams-manager\workspaces\approvals-publishing-workspace.tsx:13` |
| `/exams/audit-logs` | `GET` | `web\src\components\modules\exams-manager\workspaces\audit-logs-workspace.tsx:14` |
| `/exams/series` | `GET` | `web\src\components\modules\exams-manager\workspaces\communication-workspace.tsx:13` |
| `/exams/attendance` | `GET` | `web\src\components\modules\exams-manager\workspaces\exam-attendance-workspace.tsx:13` |
| `/exams/series` | `GET` | `web\src\components\modules\exams-manager\workspaces\exam-calendar-workspace.tsx:10` |
| `/exams/subject-weightings` | `GET` | `web\src\components\modules\exams-manager\workspaces\exam-classes-workspace.tsx:13` |
| `/exams/grading-policies` | `GET` | `web\src\components\modules\exams-manager\workspaces\exam-settings-workspace.tsx:13` |
| `/exams/draft` | `POST` | `web\src\components\modules\exams-manager\workspaces\exam-setup-workspace.tsx:25` |
| `/exams/assessments` | `GET` | `web\src\components\modules\exams-manager\workspaces\exam-setup-workspace.tsx:101` |
| `/exams/timetable-slots` | `GET` | `web\src\components\modules\exams-manager\workspaces\exam-timetable-workspace.tsx:13` |
| `/exams/grading-policies` | `GET` | `web\src\components\modules\exams-manager\workspaces\grading-rubrics-workspace.tsx:13` |
| `/exams/assessments` | `GET` | `web\src\components\modules\exams-manager\workspaces\imports-templates-workspace.tsx:13` |
| `/exams/invigilators` | `GET` | `web\src\components\modules\exams-manager\workspaces\invigilation-workspace.tsx:13` |
| `/exams/mark-entry-windows` | `GET` | `web\src\components\modules\exams-manager\workspaces\marks-monitor-workspace.tsx:13` |
| `/exams/mark-versions` | `GET` | `web\src\components\modules\exams-manager\workspaces\moderation-workspace.tsx:13` |
| `/exams/marks` | `GET` | `web\src\components\modules\exams-manager\workspaces\my-marks-workspace.tsx:13` |
| `/exams/dashboard-stats` | `GET` | `web\src\components\modules\exams-manager\workspaces\overview-workspace.tsx:13` |
| `/exams/series` | `GET` | `web\src\components\modules\exams-manager\workspaces\overview-workspace.tsx:14` |
| `/exams/assessment-components` | `GET` | `web\src\components\modules\exams-manager\workspaces\papers-components-workspace.tsx:13` |
| `/exams/report-cards` | `GET` | `web\src\components\modules\exams-manager\workspaces\report-cards-workspace.tsx:13` |
| `/exams/series` | `GET` | `web\src\components\modules\exams-manager\workspaces\reports-workspace.tsx:10` |
| `/exams/report-card-batches` | `GET` | `web\src\components\modules\exams-manager\workspaces\results-processing-workspace.tsx:13` |
| `/exams/student-cases` | `GET` | `web\src\components\modules\exams-manager\workspaces\student-cases-workspace.tsx:13` |
| `${apiBase}/dashboard` | `GET` | `web\src\components\modules\shared\implementation100-live-module.tsx:140` |
| `${apiBase}/records` | `POST` | `web\src\components\modules\shared\implementation100-live-module.tsx:181` |
| `${apiBase}/records/${record.id}/status` | `PATCH` | `web\src\components\modules\shared\implementation100-live-module.tsx:219` |
| `buildBillingApiPath("/api/academics/summary", tenantSlug)` | `GET` | `web\src\components\school\academics-workspace-admin.tsx:35` |
| `buildBillingApiPath("/api/billing/student-balances", tenantSlug || "demo")` | `GET` | `web\src\components\school\accountant\arrears-workspace.tsx:31` |
| `/admin-command/accountant/expenses` | `GET` | `web\src\components\school\accountant\expenses-workspace.tsx:11` |
| `buildBillingApiPath("/api/finance/summary", tenantSlug)` | `GET` | `web\src\components\school\accountant\fee-structures-workspace.tsx:173` |
| `buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug)` | `GET` | `web\src\components\school\accountant\fee-structures-workspace.tsx:189` |
| `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `GET` | `web\src\components\school\accountant\fee-structures-workspace.tsx:213` |
| `buildBillingApiPath(`/api/billing/reconciliation?${params.toString()}`, tenantSlug)` | `GET` | `web\src\components\school\accountant\fee-structures-workspace.tsx:250` |
| `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `GET` | `web\src\components\school\accountant\fee-structures-workspace.tsx:281` |
| `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        )` | `GET` | `web\src\components\school\accountant\fee-structures-workspace.tsx:356` |
| `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        )` | `GET` | `web\src\components\school\accountant\fee-structures-workspace.tsx:389` |
| `buildBillingApiPath(`/api/billing/reconciliation/export?${params.toString()}`, tenantSlug)` | `GET` | `web\src\components\school\accountant\fee-structures-workspace.tsx:437` |
| `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `POST` | `web\src\components\school\accountant\fee-structures-workspace.tsx:578` |
| `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`, tenantSlug)` | `POST` | `web\src\components\school\accountant\fee-structures-workspace.tsx:627` |
| `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`, tenantSlug)` | `POST` | `web\src\components\school\accountant\fee-structures-workspace.tsx:680` |
| `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`, tenantSlug)` | `GET` | `web\src\components\school\accountant\fee-structures-workspace.tsx:740` |
| `buildBillingApiPath("/api/billing/invoices", tenantSlug)` | `POST` | `web\src\components\school\accountant\fee-structures-workspace.tsx:795` |
| `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `POST` | `web\src\components\school\accountant\fee-structures-workspace.tsx:851` |
| `buildBillingApiPath("/api/finance/summary", tenantSlug)` | `GET` | `web\src\components\school\accountant\invoices-workspace.tsx:173` |
| `buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug)` | `GET` | `web\src\components\school\accountant\invoices-workspace.tsx:189` |
| `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `GET` | `web\src\components\school\accountant\invoices-workspace.tsx:213` |
| `buildBillingApiPath(`/api/billing/reconciliation?${params.toString()}`, tenantSlug)` | `GET` | `web\src\components\school\accountant\invoices-workspace.tsx:250` |
| `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `GET` | `web\src\components\school\accountant\invoices-workspace.tsx:281` |
| `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `GET` | `web\src\components\school\accountant\invoices-workspace.tsx:313` |
| `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        )` | `GET` | `web\src\components\school\accountant\invoices-workspace.tsx:373` |
| `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        )` | `GET` | `web\src\components\school\accountant\invoices-workspace.tsx:406` |
| `buildBillingApiPath(`/api/billing/reconciliation/export?${params.toString()}`, tenantSlug)` | `GET` | `web\src\components\school\accountant\invoices-workspace.tsx:454` |
| `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `POST` | `web\src\components\school\accountant\invoices-workspace.tsx:595` |
| `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`, tenantSlug)` | `POST` | `web\src\components\school\accountant\invoices-workspace.tsx:644` |
| `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`, tenantSlug)` | `POST` | `web\src\components\school\accountant\invoices-workspace.tsx:697` |
| `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`, tenantSlug)` | `GET` | `web\src\components\school\accountant\invoices-workspace.tsx:757` |
| `buildBillingApiPath("/api/billing/invoices", tenantSlug)` | `POST` | `web\src\components\school\accountant\invoices-workspace.tsx:812` |
| `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `POST` | `web\src\components\school\accountant\invoices-workspace.tsx:868` |
| `buildPaymentsApiPath("/api/payments/mpesa/c2b/payments", tenantSlug)` | `GET` | `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:36` |
| `buildPaymentsApiPath("/api/payments/mpesa/c2b/payments?status=pending_review", tenantSlug)` | `GET` | `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:112` |
| `buildPaymentsApiPath(`/api/payments/mpesa/c2b/payments/${selectedPaymentId}/reconcile`, tenantSlug)` | `POST` | `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:170` |
| `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `GET` | `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:322` |
| `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `POST` | `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:382` |
| `buildBillingApiPath(`/api/billing/manual-fee-payments/${receipt.id}/${action}`, tenantSlug)` | `POST` | `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:447` |
| `buildBillingApiPath("/api/billing/finance-activity?limit=10&offset=0", tenantSlug || "demo")` | `GET` | `web\src\components\school\accountant\overview-workspace.tsx:37` |
| `buildBillingApiPath("/api/finance/summary", tenantSlug)` | `GET` | `web\src\components\school\accountant\payments-workspace.tsx:173` |
| `buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug)` | `GET` | `web\src\components\school\accountant\payments-workspace.tsx:189` |
| `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `GET` | `web\src\components\school\accountant\payments-workspace.tsx:213` |
| `buildBillingApiPath(`/api/billing/reconciliation?${params.toString()}`, tenantSlug)` | `GET` | `web\src\components\school\accountant\payments-workspace.tsx:250` |
| `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `GET` | `web\src\components\school\accountant\payments-workspace.tsx:281` |
| `buildBillingApiPath("/api/billing/finance-activity", tenantSlug)` | `GET` | `web\src\components\school\accountant\payments-workspace.tsx:313` |
| `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        )` | `GET` | `web\src\components\school\accountant\payments-workspace.tsx:385` |
| `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        )` | `GET` | `web\src\components\school\accountant\payments-workspace.tsx:418` |
| `buildBillingApiPath(`/api/billing/reconciliation/export?${params.toString()}`, tenantSlug)` | `GET` | `web\src\components\school\accountant\payments-workspace.tsx:466` |
| `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `POST` | `web\src\components\school\accountant\payments-workspace.tsx:607` |
| `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`, tenantSlug)` | `POST` | `web\src\components\school\accountant\payments-workspace.tsx:656` |
| `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`, tenantSlug)` | `POST` | `web\src\components\school\accountant\payments-workspace.tsx:709` |
| `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`, tenantSlug)` | `GET` | `web\src\components\school\accountant\payments-workspace.tsx:769` |
| `buildBillingApiPath("/api/billing/invoices", tenantSlug)` | `POST` | `web\src\components\school\accountant\payments-workspace.tsx:824` |
| `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `POST` | `web\src\components\school\accountant\payments-workspace.tsx:880` |
| `buildBillingApiPath("/api/billing/finance-activity?limit=100&offset=0", tenantSlug || "demo")` | `GET` | `web\src\components\school\accountant\receipts-workspace.tsx:33` |
| `buildBillingApiPath(apiPath, tenantSlug || "demo")` | `GET` | `web\src\components\school\accountant\reports-workspace.tsx:28` |
| `buildBillingApiPath("/api/billing/waivers", tenantSlug || "demo")` | `GET` | `web\src\components\school\accountant\waivers-discounts-workspace.tsx:37` |
| `buildBillingApiPath("/api/billing/waivers", tenantSlug || "demo")` | `POST` | `web\src\components\school\accountant\waivers-discounts-workspace.tsx:68` |
| `/admin-command/admin/imports` | `GET` | `web\src\components\school\admin\imports-workspace.tsx:11` |
| `(vars: { id: string; status: string; reason?: string }) => `/api/hr/leave/${vars.id}/status` | `POST` | `web\src\components\school\admin\staff-records-workspace.tsx:35` |
| `/admin-command/admin/students` | `GET` | `web\src\components\school\admin\students-workspace.tsx:11` |
| `/admin-command/admissions/applicant-profiles` | `GET` | `web\src\components\school\admissions-dashboard\applicant-profiles-workspace.tsx:11` |
| `/admin-command/admissions/applications` | `GET` | `web\src\components\school\admissions-dashboard\applications-workspace.tsx:11` |
| `/admin-command/admissions/appointments` | `GET` | `web\src\components\school\admissions-dashboard\appointments-workspace.tsx:11` |
| `/admin-command/admissions/communication` | `GET` | `web\src\components\school\admissions-dashboard\communication-workspace.tsx:11` |
| `/admin-command/admissions/documents` | `GET` | `web\src\components\school\admissions-dashboard\documents-workspace.tsx:11` |
| `/admin-command/admissions/enquiries` | `GET` | `web\src\components\school\admissions-dashboard\enquiries-workspace.tsx:11` |
| `(id: string) => `/api/admissions/applications/${id}/enrol` | `POST` | `web\src\components\school\admissions-dashboard\enrolment-workspace.tsx:26` |
| `/admin-command/admissions/fee-clearance` | `GET` | `web\src\components\school\admissions-dashboard\fee-clearance-workspace.tsx:11` |
| `/admin-command/admissions/imports` | `GET` | `web\src\components\school\admissions-dashboard\imports-workspace.tsx:11` |
| `/admin-command/admissions/interviews` | `GET` | `web\src\components\school\admissions-dashboard\interviews-workspace.tsx:11` |
| `/admin-command/admissions/overview` | `GET` | `web\src\components\school\admissions-dashboard\overview-workspace.tsx:8` |
| `/admin-command/admissions/parents` | `GET` | `web\src\components\school\admissions-dashboard\parents-workspace.tsx:11` |
| `/admin-command/admissions/placement` | `GET` | `web\src\components\school\admissions-dashboard\placement-workspace.tsx:11` |
| `/admin-command/admissions/reports` | `GET` | `web\src\components\school\admissions-dashboard\reports-workspace.tsx:11` |
| `/admin-command/admissions/selection` | `GET` | `web\src\components\school\admissions-dashboard\selection-workspace.tsx:11` |
| `/admin-command/admissions/tasks` | `GET` | `web\src\components\school\admissions-dashboard\tasks-workspace.tsx:11` |
| `/admin-command/admissions/templates` | `GET` | `web\src\components\school\admissions-dashboard\templates-workspace.tsx:11` |
| `/admin-command/admissions/transfers` | `GET` | `web\src\components\school\admissions-dashboard\transfers-workspace.tsx:11` |
| `/admin-command/admissions/admissions` | `GET` | `web\src\components\school\admissions\admissions-workspace.tsx:27` |
| `/admin-command/admissions/applications` | `GET` | `web\src\components\school\admissions\applications-workspace.tsx:26` |
| `/admin-command/admissions/class-placement` | `GET` | `web\src\components\school\admissions\class-placement-workspace.tsx:24` |
| `/admin-command/admissions/documents` | `GET` | `web\src\components\school\admissions\documents-workspace.tsx:25` |
| `/admin-command/admissions/interviews` | `GET` | `web\src\components\school\admissions\interviews-workspace.tsx:26` |
| `/admin-command/admissions/overview` | `GET` | `web\src\components\school\admissions\overview-workspace.tsx:25` |
| `/admin-command/admissions/parent-linking` | `GET` | `web\src\components\school\admissions\parent-linking-workspace.tsx:27` |
| `/admin-command/admissions/reports` | `GET` | `web\src\components\school\admissions\reports-workspace.tsx:22` |
| `/admin-command/boarding-master/allocation` | `GET` | `web\src\components\school\boarding-master\allocation-workspace.tsx:26` |
| `/admin-command/boarding-master/boarding-attendance` | `GET` | `web\src\components\school\boarding-master\boarding-attendance-workspace.tsx:25` |
| `/admin-command/boarding-master/hostels` | `GET` | `web\src\components\school\boarding-master\hostels-workspace.tsx:26` |
| `/admin-command/boarding-master/incidents` | `GET` | `web\src\components\school\boarding-master\incidents-workspace.tsx:25` |
| `/admin-command/boarding-master/leave-exit` | `GET` | `web\src\components\school\boarding-master\leave-exit-workspace.tsx:27` |
| `/admin-command/boarding-master/overview` | `GET` | `web\src\components\school\boarding-master\overview-workspace.tsx:23` |
| `/admin-command/boarding-master/reports` | `GET` | `web\src\components\school\boarding-master\reports-workspace.tsx:22` |
| `/admin-command/boarding-master/rooms-beds` | `GET` | `web\src\components\school\boarding-master\rooms-beds-workspace.tsx:25` |
| `/admin-command/class-teacher/attendance-follow-up` | `GET` | `web\src\components\school\class-teacher\attendance-follow-up-workspace.tsx:32` |
| `/admin-command/class-teacher/class-academics` | `GET` | `web\src\components\school\class-teacher\class-academics-workspace.tsx:30` |
| `/admin-command/class-teacher/discipline-follow-up` | `GET` | `web\src\components\school\class-teacher\discipline-follow-up-workspace.tsx:33` |
| `/admin-command/class-teacher/learner-profiles` | `GET` | `web\src\components\school\class-teacher\learner-profiles-workspace.tsx:35` |
| `/admin-command/class-teacher/my-class` | `GET` | `web\src\components\school\class-teacher\my-class-workspace.tsx:32` |
| `/admin-command/class-teacher/overview` | `GET` | `web\src\components\school\class-teacher\overview-workspace.tsx:30` |
| `/admin-command/class-teacher/parent-contacts` | `GET` | `web\src\components\school\class-teacher\parent-contacts-workspace.tsx:32` |
| `/admin-command/class-teacher/report-comments` | `GET` | `web\src\components\school\class-teacher\report-comments-workspace.tsx:32` |
| `/admin-command/class-teacher/reports` | `GET` | `web\src\components\school\class-teacher\reports-workspace.tsx:30` |
| `/admin-command/class-teacher/welfare-notes` | `GET` | `web\src\components\school\class-teacher\welfare-notes-workspace.tsx:32` |
| `/admin-command/dean-academics/academic-interventions` | `GET` | `web\src\components\school\dean-academics\academic-interventions-workspace.tsx:27` |
| `/admin-command/dean-academics/assessments` | `GET` | `web\src\components\school\dean-academics\assessments-workspace.tsx:27` |
| `/admin-command/dean-academics/curriculum-coverage` | `GET` | `web\src\components\school\dean-academics\curriculum-coverage-workspace.tsx:27` |
| `/admin-command/dean-academics/department-performance` | `GET` | `web\src\components\school\dean-academics\department-performance-workspace.tsx:26` |
| `/admin-command/dean-academics/lesson-logs` | `GET` | `web\src\components\school\dean-academics\lesson-logs-workspace.tsx:27` |
| `/admin-command/dean-academics/lesson-plans` | `GET` | `web\src\components\school\dean-academics\lesson-plans-workspace.tsx:27` |
| `/admin-command/dean-academics/overview` | `GET` | `web\src\components\school\dean-academics\overview-workspace.tsx:23` |
| `/admin-command/dean-academics/reports` | `GET` | `web\src\components\school\dean-academics\reports-workspace.tsx:22` |
| `/admin-command/dean-academics/teacher-workload` | `GET` | `web\src\components\school\dean-academics\teacher-workload-workspace.tsx:26` |
| `/admin-command/deputy/academics` | `GET` | `web\src\components\school\deputy-principal\academics-monitoring-workspace.tsx:30` |
| `/admin-command/deputy/approvals` | `GET` | `web\src\components\school\deputy-principal\approvals-workspace.tsx:25` |
| `/admin-command/deputy/attendance` | `GET` | `web\src\components\school\deputy-principal\attendance-workspace.tsx:28` |
| `/admin-command/deputy/classes` | `GET` | `web\src\components\school\deputy-principal\classes-streams-workspace.tsx:28` |
| `/admin-command/deputy/daily-operations` | `GET` | `web\src\components\school\deputy-principal\daily-operations-workspace.tsx:34` |
| `/admin-command/deputy/discipline` | `GET` | `web\src\components\school\deputy-principal\discipline-workspace.tsx:32` |
| `/admin-command/deputy/exams` | `GET` | `web\src\components\school\deputy-principal\exams-marks-workspace.tsx:26` |
| `/admin-command/deputy/overview` | `GET` | `web\src\components\school\deputy-principal\overview-workspace.tsx:31` |
| `/admin-command/deputy/reports` | `GET` | `web\src\components\school\deputy-principal\reports-workspace.tsx:25` |
| `/admin-command/deputy/staff-duty` | `GET` | `web\src\components\school\deputy-principal\staff-duty-workspace.tsx:28` |
| `/admin-command/deputy/staff` | `GET` | `web\src\components\school\deputy-principal\staff-roles-workspace.tsx:25` |
| `/admin-command/deputy/teaching` | `GET` | `web\src\components\school\deputy-principal\teaching-workspace.tsx:26` |
| `/admin-command/deputy/timetable` | `GET` | `web\src\components\school\deputy-principal\timetable-relief-workspace.tsx:29` |
| `/admin-command/deputy/welfare` | `GET` | `web\src\components\school\deputy-principal\welfare-workspace.tsx:31` |
| `/admin-command/deputy/welfare` | `POST` | `web\src\components\school\deputy-principal\welfare-workspace.tsx:33` |
| `/discipline/actions-interventions` | `GET` | `web\src\components\school\discipline-master\actions-interventions-workspace.tsx:14` |
| `/discipline/actions-sanctions` | `GET` | `web\src\components\school\discipline-master\actions-sanctions-workspace.tsx:14` |
| `/discipline/audit-trail` | `GET` | `web\src\components\school\discipline-master\audit-trail-workspace.tsx:14` |
| `/discipline/cases` | `GET` | `web\src\components\school\discipline-master\cases-workspace.tsx:14` |
| `/discipline/class-house-monitoring` | `GET` | `web\src\components\school\discipline-master\class-house-monitoring-workspace.tsx:14` |
| `/discipline/counselling-referrals` | `GET` | `web\src\components\school\discipline-master\counselling-referrals-workspace.tsx:14` |
| `/discipline/detention-programs` | `GET` | `web\src\components\school\discipline-master\detention-programs-workspace.tsx:14` |
| `/discipline/incident-log` | `GET` | `web\src\components\school\discipline-master\incident-log-workspace.tsx:14` |
| `/discipline/incident-register` | `GET` | `web\src\components\school\discipline-master\incident-register-workspace.tsx:14` |
| `/discipline/investigations` | `GET` | `web\src\components\school\discipline-master\investigations-workspace.tsx:14` |
| `/discipline/log-incident` | `GET` | `web\src\components\school\discipline-master\log-incident-workspace.tsx:14` |
| `/discipline/overview` | `GET` | `web\src\components\school\discipline-master\overview-workspace.tsx:14` |
| `/discipline/parent-communication` | `GET` | `web\src\components\school\discipline-master\parent-communication-workspace.tsx:14` |
| `/discipline/parent-summons` | `GET` | `web\src\components\school\discipline-master\parent-summons-workspace.tsx:14` |
| `/discipline/report-intake` | `GET` | `web\src\components\school\discipline-master\report-intake-workspace.tsx:14` |
| `/discipline/reports-downloads` | `GET` | `web\src\components\school\discipline-master\reports-downloads-workspace.tsx:14` |
| `/discipline/reports` | `GET` | `web\src\components\school\discipline-master\reports-workspace.tsx:14` |
| `/discipline/serious-cases-approvals` | `GET` | `web\src\components\school\discipline-master\serious-cases-approvals-workspace.tsx:14` |
| `/discipline/settings` | `GET` | `web\src\components\school\discipline-master\settings-workspace.tsx:14` |
| `/discipline/student-conduct-profiles` | `GET` | `web\src\components\school\discipline-master\student-conduct-profiles-workspace.tsx:14` |
| `/discipline/templates-rules` | `GET` | `web\src\components\school\discipline-master\templates-rules-workspace.tsx:14` |
| `/discipline/triage-queue` | `GET` | `web\src\components\school\discipline-master\triage-queue-workspace.tsx:14` |
| `/admin-command/exams/academic-setup-approval` | `GET` | `web\src\components\school\exams-dashboard\academic-setup-approval-workspace.tsx:11` |
| `/admin-command/exams/readiness` | `GET` | `web\src\components\school\exams-dashboard\exam-readiness-workspace.tsx:11` |
| `/admin-command/exams-manager/analysis` | `GET` | `web\src\components\school\exams-manager\analysis-workspace.tsx:28` |
| `/admin-command/exams-manager/exam-setup` | `GET` | `web\src\components\school\exams-manager\exam-setup-workspace.tsx:34` |
| `/admin-command/exams-manager/exam-timetable` | `GET` | `web\src\components\school\exams-manager\exam-timetable-workspace.tsx:33` |
| `/admin-command/exams-manager/marks-entry` | `GET` | `web\src\components\school\exams-manager\marks-entry-workspace.tsx:34` |
| `/admin-command/exams-manager/moderation` | `GET` | `web\src\components\school\exams-manager\moderation-workspace.tsx:34` |
| `/admin-command/exams-manager/overview` | `GET` | `web\src\components\school\exams-manager\overview-workspace.tsx:31` |
| `/admin-command/exams-manager/publishing` | `GET` | `web\src\components\school\exams-manager\publishing-workspace.tsx:26` |
| `/admin-command/exams-manager/report-cards` | `GET` | `web\src\components\school\exams-manager\report-cards-workspace.tsx:27` |
| `/admin-command/exams-manager/reports` | `GET` | `web\src\components\school\exams-manager\reports-workspace.tsx:22` |
| `/admin-command/guidance-counselling/follow-ups` | `GET` | `web\src\components\school\guidance-counselling\follow-ups-workspace.tsx:26` |
| `/admin-command/guidance-counselling/overview` | `GET` | `web\src\components\school\guidance-counselling\overview-workspace.tsx:23` |
| `/admin-command/guidance-counselling/parent-engagement` | `GET` | `web\src\components\school\guidance-counselling\parent-engagement-workspace.tsx:26` |
| `/admin-command/guidance-counselling/referrals` | `GET` | `web\src\components\school\guidance-counselling\referrals-workspace.tsx:26` |
| `/admin-command/guidance-counselling/reports` | `GET` | `web\src\components\school\guidance-counselling\reports-workspace.tsx:22` |
| `/admin-command/guidance-counselling/sessions` | `GET` | `web\src\components\school\guidance-counselling\sessions-workspace.tsx:27` |
| `/admin-command/guidance-counselling/welfare-notes` | `GET` | `web\src\components\school\guidance-counselling\welfare-notes-workspace.tsx:26` |
| `/admin-command/hod/department-overview` | `GET` | `web\src\components\school\hod-dashboard\department-overview-workspace.tsx:11` |
| `/admin-command/hod/review-queue` | `GET` | `web\src\components\school\hod-dashboard\review-queue-workspace.tsx:11` |
| `/admin-command/hod/coverage-review` | `GET` | `web\src\components\school\hod\coverage-review-workspace.tsx:26` |
| `/admin-command/hod/department-teachers` | `GET` | `web\src\components\school\hod\department-teachers-workspace.tsx:25` |
| `/admin-command/hod/lesson-plans` | `GET` | `web\src\components\school\hod\lesson-plans-workspace.tsx:27` |
| `/admin-command/hod/marks-moderation` | `GET` | `web\src\components\school\hod\marks-moderation-workspace.tsx:28` |
| `/admin-command/hod/overview` | `GET` | `web\src\components\school\hod\overview-workspace.tsx:23` |
| `/admin-command/hod/reports` | `GET` | `web\src\components\school\hod\reports-workspace.tsx:22` |
| `/admin-command/hod/resource-requests` | `GET` | `web\src\components\school\hod\resource-requests-workspace.tsx:26` |
| `/admin-command/hod/subject-allocation` | `GET` | `web\src\components\school\hod\subject-allocation-workspace.tsx:25` |
| `/admin-command/ict-manager/asset-assignment` | `GET` | `web\src\components\school\ict-manager\asset-assignment-workspace.tsx:26` |
| `/admin-command/ict-manager/assets` | `GET` | `web\src\components\school\ict-manager\assets-workspace.tsx:27` |
| `/admin-command/ict-manager/facilities-issues` | `GET` | `web\src\components\school\ict-manager\facilities-issues-workspace.tsx:26` |
| `/admin-command/ict-manager/loans-returns` | `GET` | `web\src\components\school\ict-manager\loans-returns-workspace.tsx:26` |
| `/admin-command/ict-manager/maintenance` | `GET` | `web\src\components\school\ict-manager\maintenance-workspace.tsx:26` |
| `/admin-command/ict-manager/overview` | `GET` | `web\src\components\school\ict-manager\overview-workspace.tsx:23` |
| `/admin-command/ict-manager/reports` | `GET` | `web\src\components\school\ict-manager\reports-workspace.tsx:22` |
| `/admin-command/laboratory-technician/apparatus-issue` | `GET` | `web\src\components\school\laboratory-technician\apparatus-issue-workspace.tsx:27` |
| `/admin-command/laboratory-technician/chemicals` | `GET` | `web\src\components\school\laboratory-technician\chemicals-workspace.tsx:27` |
| `/admin-command/laboratory-technician/lab-inventory` | `GET` | `web\src\components\school\laboratory-technician\lab-inventory-workspace.tsx:27` |
| `/admin-command/laboratory-technician/lab-timetable` | `GET` | `web\src\components\school\laboratory-technician\lab-timetable-workspace.tsx:27` |
| `/admin-command/laboratory-technician/overview` | `GET` | `web\src\components\school\laboratory-technician\overview-workspace.tsx:23` |
| `/admin-command/laboratory-technician/reports` | `GET` | `web\src\components\school\laboratory-technician\reports-workspace.tsx:22` |
| `/admin-command/laboratory-technician/safety-incidents` | `GET` | `web\src\components\school\laboratory-technician\safety-incidents-workspace.tsx:26` |
| `/admin-command/librarian/books` | `GET` | `web\src\components\school\librarian\books-workspace.tsx:32` |
| `/admin-command/librarian/borrowers` | `GET` | `web\src\components\school\librarian\borrowers-workspace.tsx:30` |
| `/admin-command/librarian/fines-lost-damaged` | `GET` | `web\src\components\school\librarian\fines-lost-damaged-workspace.tsx:33` |
| `/admin-command/librarian/issue-book` | `GET` | `web\src\components\school\librarian\issue-book-workspace.tsx:31` |
| `/admin-command/librarian/overdue-books` | `GET` | `web\src\components\school\librarian\overdue-books-workspace.tsx:34` |
| `/admin-command/librarian/overview` | `GET` | `web\src\components\school\librarian\overview-workspace.tsx:30` |
| `/admin-command/librarian/reports` | `GET` | `web\src\components\school\librarian\reports-workspace.tsx:30` |
| `/admin-command/librarian/return-book` | `GET` | `web\src\components\school\librarian\return-book-workspace.tsx:32` |
| `/admin-command/nurse/dispensing-log` | `GET` | `web\src\components\school\nurse\dispensing-log-workspace.tsx:28` |
| `/admin-command/nurse/health-reports` | `GET` | `web\src\components\school\nurse\health-reports-workspace.tsx:28` |
| `/admin-command/nurse/medicine-inventory` | `GET` | `web\src\components\school\nurse\medicine-inventory-workspace.tsx:28` |
| `/admin-command/nurse/overview` | `GET` | `web\src\components\school\nurse\overview-workspace.tsx:28` |
| `/admin-command/nurse/parent-notifications` | `GET` | `web\src\components\school\nurse\parent-notifications-workspace.tsx:28` |
| `/admin-command/nurse/sick-bay-queue` | `GET` | `web\src\components\school\nurse\sick-bay-queue-workspace.tsx:27` |
| `/admin-command/nurse/visits` | `GET` | `web\src\components\school\nurse\visits-workspace.tsx:28` |
| `/admin-command/school/operational-blueprint` | `GET` | `web\src\components\school\operational-blueprint-workspace.tsx:11` |
| `/admin-command/parent/dashboard` | `GET` | `web\src\components\school\parent\dashboard-workspace.tsx:11` |
| `/admin-command/parent/downloads` | `GET` | `web\src\components\school\parent\downloads-workspace.tsx:11` |
| `/admin-command/parent/health` | `GET` | `web\src\components\school\parent\health-workspace.tsx:11` |
| `/admin-command/parent/messages` | `GET` | `web\src\components\school\parent\messages-workspace.tsx:11` |
| `/admin-command/parent/notifications` | `GET` | `web\src\components\school\parent\notifications-workspace.tsx:11` |
| `/admin-command/principal/academic-setup` | `GET` | `web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:24` |
| `/academics/academic-years` | `GET` | `web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:26` |
| `/academics/grading-systems` | `GET` | `web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:95` |
| `/academics/attendance-settings` | `GET` | `web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:96` |
| `/academics/report-card-settings` | `GET` | `web\src\components\school\principal-dashboard\academic-setup-workspace.tsx:97` |
| `/admin-command/principal/academics` | `GET` | `web\src\components\school\principal-dashboard\academics-workspace.tsx:17` |
| `/admin-command/principal/approvals` | `GET` | `web\src\components\school\principal-dashboard\approvals-workspace.tsx:16` |
| `/admin-command/principal/attendance` | `GET` | `web\src\components\school\principal-dashboard\attendance-workspace.tsx:24` |
| `/admin-command/principal/classes` | `GET` | `web\src\components\school\principal-dashboard\classes-streams-workspace.tsx:24` |
| `/academics/academic-years` | `GET` | `web\src\components\school\principal-dashboard\classes-streams-workspace.tsx:25` |
| `/academics/class-sections` | `GET` | `web\src\components\school\principal-dashboard\classes-streams-workspace.tsx:26` |
| `/admin-command/principal/communication` | `GET` | `web\src\components\school\principal-dashboard\communication-workspace.tsx:24` |
| `/admin-command/communication-templates` | `GET` | `web\src\components\school\principal-dashboard\communication-workspace.tsx:25` |
| `/admin-command/principal/discipline` | `GET` | `web\src\components\school\principal-dashboard\discipline-workspace.tsx:22` |
| `/admin-command/principal/exams` | `GET` | `web\src\components\school\principal-dashboard\exams-reports-workspace.tsx:23` |
| `/admin-command/principal/finance-overview` | `GET` | `web\src\components\school\principal-dashboard\finance-overview-workspace.tsx:22` |
| `/finance/fee-categories` | `GET` | `web\src\components\school\principal-dashboard\finance-overview-workspace.tsx:23` |
| `/admin-command/principal/overview` | `GET` | `web\src\components\school\principal-dashboard\overview-workspace.tsx:23` |
| `/admin-command/principal/reports` | `GET` | `web\src\components\school\principal-dashboard\reports-workspace.tsx:23` |
| `/admin-command/principal/school-profile` | `GET` | `web\src\components\school\principal-dashboard\school-profile-workspace.tsx:25` |
| `/admin-command/principal/settings` | `GET` | `web\src\components\school\principal-dashboard\settings-workspace.tsx:26` |
| `/admin-command/principal/setup-checklist` | `GET` | `web\src\components\school\principal-dashboard\setup-checklist-workspace.tsx:14` |
| `/admin-command/principal/staff` | `GET` | `web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:25` |
| `/academics/academic-terms` | `GET` | `web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:26` |
| `/academics/academic-years` | `GET` | `web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:27` |
| `/academics/class-sections` | `GET` | `web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:28` |
| `/academics/subjects` | `GET` | `web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:29` |
| `/academics/class-teachers` | `GET` | `web\src\components\school\principal-dashboard\staff-roles-workspace.tsx:30` |
| `/admin-command/principal/students` | `GET` | `web\src\components\school\principal-dashboard\students-workspace.tsx:24` |
| `/admin-command/principal/subjects` | `GET` | `web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:24` |
| `/academics/academic-years` | `GET` | `web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:25` |
| `/academics/subjects` | `GET` | `web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:26` |
| `/academics/departments` | `GET` | `web\src\components\school\principal-dashboard\subjects-departments-workspace.tsx:27` |
| `/admin-command/principal/teaching` | `GET` | `web\src\components\school\principal-dashboard\teaching-workspace.tsx:16` |
| `/admin-command/principal/academic-setup` | `GET` | `web\src\components\school\principal\academic-setup-workspace.tsx:18` |
| `/admin-command/principal/academics` | `GET` | `web\src\components\school\principal\academics-workspace.tsx:27` |
| `/admin-command/principal/approvals` | `GET` | `web\src\components\school\principal\approvals-workspace.tsx:26` |
| `/admin-command/principal/attendance-monitoring` | `GET` | `web\src\components\school\principal\attendance-monitoring-workspace.tsx:32` |
| `/admin-command/principal/classes-streams` | `GET` | `web\src\components\school\principal\classes-streams-workspace.tsx:26` |
| `/admin-command/principal/communication` | `GET` | `web\src\components\school\principal\communication-workspace.tsx:31` |
| `/admin-command/principal/discipline` | `GET` | `web\src\components\school\principal\discipline-workspace.tsx:28` |
| `/admin-command/principal/exams-report-cards` | `GET` | `web\src\components\school\principal\exams-report-cards-workspace.tsx:27` |
| `/admin-command/principal/finance-overview` | `GET` | `web\src\components\school\principal\finance-overview-workspace.tsx:25` |
| `/admin-command/principal/overview` | `GET` | `web\src\components\school\principal\overview-workspace.tsx:30` |
| `/admin-command/principal/reports` | `GET` | `web\src\components\school\principal\reports-workspace.tsx:22` |
| `/admin-command/principal/school-profile` | `GET` | `web\src\components\school\principal\school-profile-workspace.tsx:30` |
| `/admin-command/principal/setup-checklist` | `GET` | `web\src\components\school\principal\setup-checklist-workspace.tsx:25` |
| `/admin-command/principal/staff-roles` | `GET` | `web\src\components\school\principal\staff-roles-workspace.tsx:27` |
| `/admin-command/principal/students` | `GET` | `web\src\components\school\principal\students-workspace.tsx:28` |
| `/admin-command/principal/subjects-departments` | `GET` | `web\src\components\school\principal\subjects-departments-workspace.tsx:26` |
| `/admin-command/procurement-officer/deliveries` | `GET` | `web\src\components\school\procurement-officer\deliveries-workspace.tsx:26` |
| `/admin-command/procurement-officer/overview` | `GET` | `web\src\components\school\procurement-officer\overview-workspace.tsx:23` |
| `/admin-command/procurement-officer/purchase-orders` | `GET` | `web\src\components\school\procurement-officer\purchase-orders-workspace.tsx:27` |
| `/admin-command/procurement-officer/purchase-requests` | `GET` | `web\src\components\school\procurement-officer\purchase-requests-workspace.tsx:27` |
| `/admin-command/procurement-officer/quotations` | `GET` | `web\src\components\school\procurement-officer\quotations-workspace.tsx:26` |
| `/admin-command/procurement-officer/reports` | `GET` | `web\src\components\school\procurement-officer\reports-workspace.tsx:22` |
| `/admin-command/procurement-officer/suppliers` | `GET` | `web\src\components\school\procurement-officer\suppliers-workspace.tsx:26` |
| `/admin-command/admissions/dashboard` | `GET` | `web\src\components\school\registrar-command-center.tsx:1004` |
| `buildBillingApiPath("/api/finance/summary", tenantSlug)` | `GET` | `web\src\components\school\school-finance-page.tsx:271` |
| `buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug)` | `GET` | `web\src\components\school\school-finance-page.tsx:287` |
| `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `GET` | `web\src\components\school\school-finance-page.tsx:311` |
| `buildBillingApiPath(`/api/billing/reconciliation?${params.toString()}`, tenantSlug)` | `GET` | `web\src\components\school\school-finance-page.tsx:348` |
| `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `GET` | `web\src\components\school\school-finance-page.tsx:379` |
| `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        )` | `GET` | `web\src\components\school\school-finance-page.tsx:454` |
| `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        )` | `GET` | `web\src\components\school\school-finance-page.tsx:487` |
| `buildBillingApiPath(`/api/billing/reconciliation/export?${params.toString()}`, tenantSlug)` | `GET` | `web\src\components\school\school-finance-page.tsx:535` |
| `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `POST` | `web\src\components\school\school-finance-page.tsx:676` |
| `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`, tenantSlug)` | `POST` | `web\src\components\school\school-finance-page.tsx:725` |
| `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`, tenantSlug)` | `POST` | `web\src\components\school\school-finance-page.tsx:778` |
| `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`, tenantSlug)` | `GET` | `web\src\components\school\school-finance-page.tsx:838` |
| `buildBillingApiPath("/api/billing/invoices", tenantSlug)` | `POST` | `web\src\components\school\school-finance-page.tsx:893` |
| `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `POST` | `web\src\components\school\school-finance-page.tsx:949` |
| `buildBillingApiPath("/api/finance/summary", tenantSlug)` | `GET` | `web\src\components\school\school-pages.tsx:1117` |
| `buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug)` | `GET` | `web\src\components\school\school-pages.tsx:1133` |
| `buildBillingApiPath("/api/billing/student-balances", tenantSlug)` | `GET` | `web\src\components\school\school-pages.tsx:1157` |
| `buildBillingApiPath(`/api/billing/reconciliation?${params.toString()}`, tenantSlug)` | `GET` | `web\src\components\school\school-pages.tsx:1194` |
| `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `GET` | `web\src\components\school\school-pages.tsx:1225` |
| `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        )` | `GET` | `web\src\components\school\school-pages.tsx:1300` |
| `buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        )` | `GET` | `web\src\components\school\school-pages.tsx:1333` |
| `buildBillingApiPath(`/api/billing/reconciliation/export?${params.toString()}`, tenantSlug)` | `GET` | `web\src\components\school\school-pages.tsx:1381` |
| `buildBillingApiPath("/api/billing/fee-structures", tenantSlug)` | `POST` | `web\src\components\school\school-pages.tsx:1522` |
| `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`, tenantSlug)` | `POST` | `web\src\components\school\school-pages.tsx:1571` |
| `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`, tenantSlug)` | `POST` | `web\src\components\school\school-pages.tsx:1624` |
| `buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`, tenantSlug)` | `GET` | `web\src\components\school\school-pages.tsx:1684` |
| `buildBillingApiPath("/api/billing/invoices", tenantSlug)` | `POST` | `web\src\components\school\school-pages.tsx:1739` |
| `buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug)` | `POST` | `web\src\components\school\school-pages.tsx:1795` |
| `/admin-command/secretary/dashboard` | `GET` | `web\src\components\school\secretary-command-center.tsx:18` |
| `/admin-command/secretary/appointments` | `GET` | `web\src\components\school\secretary\appointments-workspace.tsx:33` |
| `/admin-command/secretary/calls-log` | `GET` | `web\src\components\school\secretary\calls-log-workspace.tsx:36` |
| `/admin-command/secretary/letters-documents` | `GET` | `web\src\components\school\secretary\letters-documents-workspace.tsx:32` |
| `/admin-command/secretary/overview` | `GET` | `web\src\components\school\secretary\overview-workspace.tsx:29` |
| `/admin-command/secretary/parent-messages` | `GET` | `web\src\components\school\secretary\parent-messages-workspace.tsx:34` |
| `/admin-command/secretary/reception-queue` | `GET` | `web\src\components\school\secretary\reception-queue-workspace.tsx:31` |
| `/admin-command/secretary/reports` | `GET` | `web\src\components\school\secretary\reports-workspace.tsx:31` |
| `/admin-command/secretary/student-clearance` | `GET` | `web\src\components\school\secretary\student-clearance-workspace.tsx:34` |
| `/admin-command/secretary/visitors` | `GET` | `web\src\components\school\secretary\visitors-workspace.tsx:34` |
| `/admin-command/security-officer/gate-register` | `GET` | `web\src\components\school\security-officer\gate-register-workspace.tsx:26` |
| `/admin-command/security-officer/incidents` | `GET` | `web\src\components\school\security-officer\incidents-workspace.tsx:25` |
| `/admin-command/security-officer/overview` | `GET` | `web\src\components\school\security-officer\overview-workspace.tsx:23` |
| `/admin-command/security-officer/reports` | `GET` | `web\src\components\school\security-officer\reports-workspace.tsx:22` |
| `/admin-command/security-officer/staff-movement` | `GET` | `web\src\components\school\security-officer\staff-movement-workspace.tsx:25` |
| `/admin-command/security-officer/student-exit-passes` | `GET` | `web\src\components\school\security-officer\student-exit-passes-workspace.tsx:26` |
| `/admin-command/security-officer/visitors` | `GET` | `web\src\components\school\security-officer\visitors-workspace.tsx:27` |
| `/admin-command/storekeeper/damaged-missing` | `GET` | `web\src\components\school\storekeeper\damaged-missing-workspace.tsx:35` |
| `/admin-command/storekeeper/items` | `GET` | `web\src\components\school\storekeeper\items-workspace.tsx:33` |
| `/admin-command/storekeeper/low-stock` | `GET` | `web\src\components\school\storekeeper\low-stock-workspace.tsx:31` |
| `/admin-command/storekeeper/overview` | `GET` | `web\src\components\school\storekeeper\overview-workspace.tsx:32` |
| `/admin-command/storekeeper/reports` | `GET` | `web\src\components\school\storekeeper\reports-workspace.tsx:30` |
| `/admin-command/storekeeper/requests` | `GET` | `web\src\components\school\storekeeper\requests-workspace.tsx:35` |
| `/admin-command/storekeeper/stock-in` | `GET` | `web\src\components\school\storekeeper\stock-in-workspace.tsx:11` |
| `/admin-command/storekeeper/stock-issue` | `GET` | `web\src\components\school\storekeeper\stock-issue-workspace.tsx:11` |
| `/admin-command/storekeeper/stocktake` | `GET` | `web\src\components\school\storekeeper\stocktake-workspace.tsx:34` |
| `buildBillingApiPath("/api/students/summary/dashboard", tenantSlug)` | `GET` | `web\src\components\school\student-directory-workspace.tsx:43` |
| `/admin-command/student/dashboard` | `GET` | `web\src\components\school\student\dashboard-workspace.tsx:11` |
| `/admin-command/student/downloads` | `GET` | `web\src\components\school\student\downloads-workspace.tsx:11` |
| `/admin-command/student/messages` | `GET` | `web\src\components\school\student\messages-workspace.tsx:11` |
| `/admin-command/student/notifications` | `GET` | `web\src\components\school\student\notifications-workspace.tsx:11` |
| `{
    endpoint: '/api/academics/assignments',
    method: 'POST',
    onSuccess: () => {
      refetch();
      setIsCreating(false);
      setNewTitle("");
      setNewDesc("");
      setNewDueDate("");
    }
  }` | `POST` | `web\src\components\school\teacher\assignments-homework-workspace.tsx:19` |
| `/admin-command/teacher/lesson-plans` | `GET` | `web\src\components\school\teacher\lesson-plans-workspace.tsx:11` |
| `/admin-command/teacher/messages` | `GET` | `web\src\components\school\teacher\messages-workspace.tsx:11` |
| `/admin-command/teacher/reports` | `GET` | `web\src\components\school\teacher\reports-workspace.tsx:11` |
| `/admin-command/teacher/resource-requests` | `GET` | `web\src\components\school\teacher\resource-requests-workspace.tsx:11` |
| `/admin-command/teacher/student-notes` | `GET` | `web\src\components\school\teacher\student-notes-workspace.tsx:11` |
| `/admin-command/teacher/attendance` | `GET` | `web\src\components\school\teacher\teacher-attendance-workspace.tsx:11` |
| `/admin-command/teacher/utilities` | `GET` | `web\src\components\school\teacher\utilities-workspace.tsx:11` |
| `/admin-command/transport-manager/drivers` | `GET` | `web\src\components\school\transport-manager\drivers-workspace.tsx:25` |
| `/admin-command/transport-manager/fuel-maintenance` | `GET` | `web\src\components\school\transport-manager\fuel-maintenance-workspace.tsx:26` |
| `/admin-command/transport-manager/overview` | `GET` | `web\src\components\school\transport-manager\overview-workspace.tsx:23` |
| `/admin-command/transport-manager/reports` | `GET` | `web\src\components\school\transport-manager\reports-workspace.tsx:22` |
| `/admin-command/transport-manager/routes` | `GET` | `web\src\components\school\transport-manager\routes-workspace.tsx:25` |
| `/admin-command/transport-manager/student-transport-list` | `GET` | `web\src\components\school\transport-manager\student-transport-list-workspace.tsx:25` |
| `/admin-command/transport-manager/trips` | `GET` | `web\src\components\school\transport-manager\trips-workspace.tsx:27` |
| `/admin-command/transport-manager/vehicles` | `GET` | `web\src\components\school\transport-manager\vehicles-workspace.tsx:26` |
| `studentId ? `/api/students/${studentId}/attendance` : null` | `GET` | `web\src\hooks\useAttendance.ts:12` |
| `studentId ? `/api/students/${studentId}/discipline` : null` | `GET` | `web\src\hooks\useDiscipline.ts:12` |
| `studentId ? `/api/students/${studentId}/fees` : null` | `GET` | `web\src\hooks\useFees.ts:12` |
| `studentId ? `/api/students/${studentId}/health` : null` | `GET` | `web\src\hooks\useHealth.ts:12` |
| `studentId ? `/api/students/${studentId}/library` : null` | `GET` | `web\src\hooks\useLibrary.ts:12` |
| `studentId ? `/api/students/${studentId}` : null` | `GET` | `web\src\hooks\useStudents.ts:25` |
| `studentId ? `/api/students/${studentId}/guardians` : null` | `GET` | `web\src\hooks\useStudents.ts:29` |
| `/apiurl: string` | `GET` | `web\src\lib\client\dashboard-api.ts:3` |
| `${baseUrl}${apiPath}` | `GET` | `web\src\lib\dashboard\api-client.ts:258` |
| `/api${path}` | `GET` | `web\src\lib\dashboard\school-api-proxy-client.ts:47` |
| `` | `GET` | `web\src\lib\data\school-hooks.test.tsx:29` |
| `/test-route` | `GET` | `web\src\lib\data\school-hooks.test.tsx:33` |
| `/test-route` | `GET` | `web\src\lib\data\school-hooks.test.tsx:45` |
| `/test-route` | `GET` | `web\src\lib\data\school-hooks.test.tsx:56` |
| `/admin-command/principal/overview` | `GET` | `web\src\lib\data\school-hooks.test.tsx:71` |
| `` | `POST` | `web\src\lib\data\school-hooks.test.tsx:79` |
| `/test-mutation` | `POST` | `web\src\lib\data\school-hooks.test.tsx:83` |
| `path: string | null` | `GET` | `web\src\lib\data\school-hooks.ts:37` |
| `path: string | ((vars: TVariables) => string)` | `POST` | `web\src\lib\data\school-hooks.ts:62` |

### Module: Parent (5 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/parent/overview` | `GET` | `web\src\components\parent\parent-command-center.tsx:28` |
| `/api/parent/academics` | `GET` | `web\src\components\parent\parent-command-center.tsx:48` |
| `/api/parent/finance` | `GET` | `web\src\components\parent\parent-command-center.tsx:68` |
| `/api/parent/communication` | `GET` | `web\src\components\parent\parent-command-center.tsx:88` |
| `/api/parent/dashboard` | `GET` | `web\src\components\portal\parent-command-center.tsx:745` |

### Module: Parent-portal (2 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/parent-portal/behavior/acknowledge` | `GET` | `web\src\components\school\parent\behavior-workspace.tsx:30` |
| `/api/parent-portal/fees/pay` | `GET` | `web\src\components\school\parent\fees-workspace.tsx:22` |

### Module: Payments (6 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/payments/mpesa/c2b/payments` | `GET` | `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:37` |
| `/api/payments/mpesa/c2b/payments?status=pending_review` | `GET` | `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:113` |
| `/api/payments/mpesa/c2b/payments/${selectedPaymentId}/reconcile` | `GET` | `web\src\components\school\accountant\m-pesa-reconciliation-workspace.tsx:171` |
| `/api/payments/mpesa/c2b/payments?status=pending_review` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1742` |
| `/api/payments/mpesa/c2b/payments/{id}/reconcile` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1743` |
| `/api/payments/mpesa/c2b/payments?status=pending_review` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1756` |

### Module: Permissions (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/permissions/me?schoolId=${schoolId}` | `GET` | `web\src\components\providers\permission-context.tsx:29` |

### Module: Platform (21 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/platform/sms-settings` | `GET` | `web\src\components\platform\workspaces\PlatformSmsSettingsWorkspace.tsx:14` |
| `/api/platform/security-policies` | `GET` | `web\src\components\platform\workspaces\SecurityPoliciesWorkspace.tsx:13` |
| `/api/platform/schools` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:208` |
| `/api/platform/schools/summary` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:219` |
| `/api/platform/modules` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:233` |
| `/api/platform/schools/${encodeURIComponent(tenantId)}/modules` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:247` |
| `/api/platform/schools` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:271` |
| `/api/platform/templates` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:479` |
| `/api/platform/broadcasts` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:485` |
| `/api/platform/audit-logs` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:491` |
| `/api/platform/backups` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:497` |
| `/api/platform/security-policies` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:503` |
| `/api/platform/reports` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:509` |
| `/api/platform/users` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:515` |
| `/api/platform/templates` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:521` |
| `/api/platform/broadcasts` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:534` |
| `/api/platform/security-policies` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:547` |
| `/api/platform/reports/request` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:560` |
| `/api/platform/settings` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:573` |
| `/api/platform/settings` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:586` |
| `/api/platform/gateways` | `GET` | `web\src\lib\platform\school-onboarding-client.ts:591` |

### Module: Portals (3 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/portals/parent/children` | `GET` | `web\src\lib\experiences\portal-api.ts:45` |
| `/api/portals/reports${studentId ? `?studentId=${studentId}` : ""}` | `GET` | `web\src\lib\experiences\portal-api.ts:49` |
| `/api/portals/fees/history${studentId ? `?studentId=${studentId}` : ""}` | `GET` | `web\src\lib\experiences\portal-api.ts:56` |

### Module: Procurement (8 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/procurement/dashboard` | `GET` | `web\src\components\modules\procurement\procurement-module-screen.tsx:462` |
| `/api/procurement/dashboard` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1418` |
| `/api/procurement/requests/{id}/approval` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1419` |
| `/api/procurement/dashboard` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1432` |
| `/api/procurement/dashboard` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1464` |
| `/api/procurement/purchase-orders` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1465` |
| `/api/procurement/dashboard` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1478` |
| `/api/procurement/dashboard` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1496` |

### Module: Procurement${request.path} (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/procurement${request.path}` | `GET` | `web\src\components\modules\procurement\procurement-module-screen.tsx:576` |

### Module: School (3 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/school/sms/wallet` | `GET` | `web\src\components\school\school-pages.tsx:2858` |
| `/api/school/modules/me` | `GET` | `web\src\components\school\school-pages.tsx:3911` |
| `/api/school/settings` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:809` |

### Module: Secretary (4 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/secretary/visitors` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4973` |
| `/api/secretary/visitors` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4975` |
| `/api/secretary/inquiries` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4977` |
| `/api/secretary/inquiries` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4979` |

### Module: Sms (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/sms/send` | `POST` | `web\src\components\school\school-pages.tsx:2913` |

### Module: Staff (2 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/staff/dashboard` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1556` |
| `/api/staff/dashboard` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1574` |

### Module: Student (4 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/student/dashboard` | `GET` | `web\src\components\school\student-command-center.tsx:9` |
| `/api/student/overview` | `GET` | `web\src\components\student\student-command-center.tsx:27` |
| `/api/student/academics` | `GET` | `web\src\components\student\student-command-center.tsx:47` |
| `/api/student/attendance` | `GET` | `web\src\components\student\student-command-center.tsx:67` |

### Module: Student-portal (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/student-portal/assignments/mark-done` | `GET` | `web\src\components\school\student\academics-workspace.tsx:25` |

### Module: Students (19 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/students/guardians/directory` | `GET` | `web\src\components\school\admin\parents-workspace.tsx:12` |
| `/api/students` | `GET` | `web\src\components\school\admin\parents-workspace.tsx:13` |
| `/api/students/guardians` | `POST` | `web\src\components\school\admin\parents-workspace.tsx:15` |
| `/api/students/${studentId}/attendance` | `GET` | `web\src\hooks\useAttendance.ts:13` |
| `/api/students/${studentId}/discipline` | `GET` | `web\src\hooks\useDiscipline.ts:13` |
| `/api/students/${studentId}/fees` | `GET` | `web\src\hooks\useFees.ts:13` |
| `/api/students/${studentId}/health` | `GET` | `web\src\hooks\useHealth.ts:13` |
| `/api/students/${studentId}/library` | `GET` | `web\src\hooks\useLibrary.ts:13` |
| `/api/students/${studentId}/guardians` | `GET` | `web\src\hooks\useStudents.ts:30` |
| `/api/students/admit` | `POST` | `web\src\hooks\useStudents.ts:35` |
| `/api/students/${studentId}` | `PATCH` | `web\src\hooks\useStudents.ts:39` |
| `/api/students/${studentId}` | `GET` | `web\src\hooks\useStudents.ts:40` |
| `/api/students/lifecycle/${studentId}/enroll` | `POST` | `web\src\lib\students\student-lifecycle.api.ts:15` |
| `/api/students/lifecycle/${studentId}/place-in-class` | `POST` | `web\src\lib\students\student-lifecycle.api.ts:24` |
| `/api/students/lifecycle/${studentId}/promote` | `POST` | `web\src\lib\students\student-lifecycle.api.ts:35` |
| `/api/students/lifecycle/${studentId}/suspend` | `POST` | `web\src\lib\students\student-lifecycle.api.ts:46` |
| `/api/students/lifecycle/${studentId}/initiate-clearance` | `POST` | `web\src\lib\students\student-lifecycle.api.ts:57` |
| `/api/students/lifecycle/${studentId}/exit` | `POST` | `web\src\lib\students\student-lifecycle.api.ts:66` |
| `/api/students/lifecycle/${studentId}/archive` | `PATCH` | `web\src\lib\students\student-lifecycle.api.ts:77` |

### Module: Students${queryparams} (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/students${queryParams}` | `GET` | `web\src\hooks\useStudents.ts:21` |

### Module: Students?class=' + encodeuricomponent(selectedclass) (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/students?class=' + encodeURIComponent(selectedClass)` | `GET` | `web\src\components\school\teacher\marks-entry-workspace.tsx:17` |

### Module: Support (12 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/support/public/status-subscriptions` | `POST (Guess)` | `web\src\app\support\status\page.tsx:158` |
| `/api/support/public/status-subscriptions/unsubscribe` | `GET` | `web\src\app\support\status\page.tsx:191` |
| `/api/support/tickets?limit=5` | `GET` | `web\src\components\school\ict-manager-command-center.tsx:35` |
| `/api/support/tickets` | `GET` | `web\src\components\school\ict-manager-command-center.tsx:90` |
| `/api/support/tickets` | `GET` | `web\src\components\school\ict-manager-command-center.tsx:228` |
| `/api/support/discipline` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4983` |
| `/api/support/discipline` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4985` |
| `/api/support/counselling` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4989` |
| `/api/support/counselling` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4991` |
| `/api/support/admin/notifications/dead-letter?audience=superadmin&channel=sms` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1714` |
| `/api/support/admin/notifications/dead-letter/{id}/retry` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1715` |
| `/api/support/admin/notifications/dead-letter?audience=superadmin&channel=sms` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1728` |

### Module: Support${path} (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/support${path}` | `GET` | `web\src\lib\support\support-live.ts:638` |

### Module: Support${path}${query ? `${separator}${query}` : ""} (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/support${path}${query ? `${separator}${query}` : ""}` | `GET` | `web\src\lib\support\support-live.ts:607` |

### Module: Sync (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/sync/retry` | `POST` | `web\src\components\sync\SyncCenter.tsx:30` |

### Module: Tasks (4 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/tasks` | `GET` | `web\src\lib\client\dashboard-api.ts:39` |
| `/api/tasks` | `POST` | `web\src\lib\client\dashboard-api.ts:40` |
| `/api/tasks/${id}/complete` | `PATCH` | `web\src\lib\client\dashboard-api.ts:41` |
| `/api/tasks/${id}/assign` | `PATCH` | `web\src\lib\client\dashboard-api.ts:42` |

### Module: Timetable (2 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/timetable/my-schedule` | `GET` | `web\src\components\school\teacher\my-timetable-workspace.tsx:23` |
| `/api/timetable/dashboard` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1628` |

### Module: Transport (8 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/transport/dashboard` | `GET` | `web\src\components\modules\transport\transport-module-screen.tsx:630` |
| `/api/transport/vehicles` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4941` |
| `/api/transport/vehicles` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4943` |
| `/api/transport/trips` | `GET` | `web\src\components\school\role-operational-command-center.tsx:4945` |
| `/api/transport/trips` | `POST` | `web\src\components\school\role-operational-command-center.tsx:4947` |
| `/api/transport/dashboard` | `GET` | `web\src\components\school\transport-manager-command-center.tsx:481` |
| `/api/transport/dashboard` | `GET` | `web\src\components\school\transport-manager-command-center.tsx:604` |
| `/api/transport/dashboard` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1664` |

### Module: Transport${path} (1 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/transport${path}` | `GET` | `web\src\components\modules\transport\transport-module-screen.tsx:660` |

### Module: V1 (4 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/v1/notifications?status=${statusQuery}` | `GET` | `web\src\components\common\notifications\notification-drawer.tsx:38` |
| `/api/v1/notifications/${id}/read` | `PATCH` | `web\src\components\common\notifications\notification-drawer.tsx:60` |
| `/api/v1/notifications/read-all` | `PATCH` | `web\src\components\common\notifications\notification-drawer.tsx:74` |
| `/api/v1/notifications/badges` | `GET` | `web\src\components\layouts\school-shell.tsx:90` |

### Module: Visitors (15 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/visitors` | `GET` | `web\src\components\modules\visitors\visitor-management-module-screen.tsx:14` |
| `/api/visitors/dashboard` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:288` |
| `/api/visitors/logs` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:352` |
| `/api/visitors/logs` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:472` |
| `/api/visitors/appointments` | `GET` | `web\src\components\school\secretary-command-center-full.tsx:582` |
| `/api/visitors/dashboard` | `GET` | `web\src\components\school\security-command-center.tsx:157` |
| `/api/visitors/logs` | `POST` | `web\src\components\school\security-command-center.tsx:308` |
| `/api/visitors/dashboard` | `GET` | `web\src\components\school\security-command-center.tsx:309` |
| `/api/visitors/logs/${recordId}/checkout` | `POST` | `web\src\components\school\security-command-center.tsx:327` |
| `/api/visitors/logs/${recordId}/checkout` | `PATCH` | `web\src\components\school\security-command-center.tsx:327` |
| `/api/visitors/logs/${recordId}/checkout` | `GET` | `web\src\components\school\security-command-center.tsx:328` |
| `/api/visitors/dashboard` | `GET` | `web\src\components\school\security-command-center.tsx:395` |
| `/api/visitors/appointments` | `GET` | `web\src\components\school\security-command-center.tsx:455` |
| `/api/visitors/student-exits` | `GET` | `web\src\components\school\security-command-center.tsx:498` |
| `/api/visitors/dashboard` | `GET` | `web\src\components\workflows\approval-command-panel.tsx:1813` |

### Module: Workflow (3 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `/api/workflow/events` | `POST` | `web\src\components\school\docx-operational-workspace.tsx:43` |
| `/api/workflow/events` | `POST` | `web\src\components\school\docx-operational-workspace.tsx:135` |
| `/api/workflow/events` | `POST` | `web\src\lib\client\dashboard-api.ts:53` |

### Module: Wrapper-api-calls (17 references)
| Endpoint / Call | Method | Location |
| --- | --- | --- |
| `ApprovalsApi.processAction` | `Depends on wrapper API definition` | `web\src\components\workflows\approvals\ApprovalDetailDrawer.tsx:23` |
| `ApprovalsApi.getPendingRequests` | `Depends on wrapper API definition` | `web\src\components\workflows\approvals\ApprovalWorkspace.tsx:17` |
| `ApprovalsApi.getMyRequests` | `Depends on wrapper API definition` | `web\src\components\workflows\approvals\ApprovalWorkspace.tsx:20` |
| `DashboardApi.getApprovals` | `Depends on wrapper API definition` | `web\src\hooks\useApprovals.ts:11` |
| `DashboardApi.approveRequest` | `Depends on wrapper API definition` | `web\src\hooks\useApprovals.ts:22` |
| `DashboardApi.rejectRequest` | `Depends on wrapper API definition` | `web\src\hooks\useApprovals.ts:32` |
| `DashboardApi.getFeed` | `Depends on wrapper API definition` | `web\src\hooks\useDashboardFeed.ts:14` |
| `DashboardApi.getSummary` | `Depends on wrapper API definition` | `web\src\hooks\useDashboardFeed.ts:15` |
| `DashboardApi.getTasks` | `Depends on wrapper API definition` | `web\src\hooks\useDashboardTasks.ts:11` |
| `DashboardApi.completeTask` | `Depends on wrapper API definition` | `web\src\hooks\useDashboardTasks.ts:22` |
| `DashboardApi.getNotifications` | `Depends on wrapper API definition` | `web\src\hooks\useNotifications.ts:11` |
| `DashboardApi.markNotificationRead` | `Depends on wrapper API definition` | `web\src\hooks\useNotifications.ts:22` |
| `DashboardApi.createEvent` | `Depends on wrapper API definition` | `web\src\lib\platform\school-onboarding-client.ts:292` |
| `DashboardApi.createEvent` | `Depends on wrapper API definition` | `web\src\lib\platform\school-onboarding-client.ts:330` |
| `DashboardApi.createEvent` | `Depends on wrapper API definition` | `web\src\lib\platform\school-onboarding-client.ts:372` |
| `DashboardApi.createEvent` | `Depends on wrapper API definition` | `web\src\lib\platform\school-onboarding-client.ts:428` |
| `DashboardApi.createEvent` | `Depends on wrapper API definition` | `web\src\lib\platform\school-onboarding-client.ts:465` |