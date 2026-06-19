# Handoff Report - explorer_frontend_2

## 1. Observation
- React frontend codebase is located under `C:\Users\user\Desktop\PROJECTS\Shule hub\apps\web\src`.
- The codebase uses custom react-query hooks `useSchoolQuery` and `useSchoolMutation` defined in `web\src\lib\data\school-hooks.ts`.
- Direct `fetch` requests are also present in components (e.g. `web\src\components\modules\exams\ReportCardGenerator.tsx` calling `/api/exams/series/publish`).
- Client wrappers `DashboardApi` and `ApprovalsApi` are defined under `web\src\lib\client\` and invoked in various workspaces.
- Running the static analysis script:
  ```powershell
  python "C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_frontend_2\scan_endpoints.py"
  ```
  Completed with the output:
  > "Successfully wrote 891 endpoint references to C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_frontend_2\analysis.md"

## 2. Logic Chain
- To collect all expected backend endpoints, we must scan the React codebase for references to API calls.
- We analyzed how frontend requests are initiated and identified five key interaction vectors:
  1. Scoped query hooks (`useSchoolQuery`)
  2. Scoped mutation hooks (`useSchoolMutation`)
  3. Direct native requests (`fetch`)
  4. Scoped utility requests (`fetchWithTenant`)
  5. Wrapper-based calls (`DashboardApi` and `ApprovalsApi` calls)
  6. Literal `/api/` string occurrences for functions that wrap fetch calls (e.g. scanner actions).
- By tokenizing each file, matching function invocation brackets to find matching parentheses, and splitting arguments on top-level commas, we cleanly separated endpoints, methods, and parameters.
- Filtering out import declarations and comment lines, we reached the set of actual backend API interactions.

## 3. Caveats
- Dynamic segments inside template strings (e.g. `${studentId}`) are parsed as template expressions.
- The HTTP method is inferred from query/mutation context (queries are GET, mutations default to POST unless PATCH/DELETE/PUT is explicitly provided as a parameter).
- Literal API strings inside custom utility functions (e.g. `buildBillingApiPath("/api/billing/student-balances")`) are captured as `apiString` references, with the query path correctly extracted.

## 4. Conclusion
- The React frontend codebase interacts with 891 unique backend endpoint occurrences.
- These endpoints are split across domains including Academics, Billing, Exams, Attendance, Hostel, Library, Security/Visitors, Transport, AI-Insights, and Workflow.
- The detailed extraction report has been successfully written to:
  `C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_frontend_2\analysis.md`

## 5. Verification Method
- **Action**: Check the generated markdown file:
  `C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_frontend_2\analysis.md`
- **Script Run**: Run the scan tool programmatically to confirm:
  ```powershell
  python "C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_frontend_2\scan_endpoints.py"
  ```
- **Invalidation Condition**: Major frontend route changes, deletion/rename of HTTP request hooks or clients, or code refactoring that introduces new request libraries (e.g. axios).
