const fs = require('fs');
const path = require('path');

const PROJECT_DIR = 'C:\\Users\\user\\Desktop\\PROJECTS\\Shule hub';
const scanResultsFile = path.join(PROJECT_DIR, '.agents', 'worker', 'audit_scan_results.json');
const isolationResultsFile = path.join(PROJECT_DIR, '.agents', 'worker', 'tenant_isolation_report.json');
const gapsFile = path.join(PROJECT_DIR, '.agents', 'worker', 'clean_gaps.json');

const scanData = JSON.parse(fs.readFileSync(scanResultsFile, 'utf8'));
const isolationData = JSON.parse(fs.readFileSync(isolationResultsFile, 'utf8'));
const gapsData = JSON.parse(fs.readFileSync(gapsFile, 'utf8'));

const outReportFile = path.join(PROJECT_DIR, 'system_audit_report.md');

let report = `# MyShule System Audit and Endpoint Gap Analysis Report

## 1. Executive Summary

This report presents a comprehensive backend endpoint audit and database schema verification for the MyShule platform. The audit cross-references expected backend endpoints extracted from the React frontend workspace (\`apps/web/src\`) with implemented NestJS controller routes (\`apps/api/src\`), and inspects the database schema (\`prisma/schema.prisma\`) for tenant isolation compliance.

### Key Metrics
* **Total Unique Expected Frontend Endpoints**: ${scanData.summary.totalExpectedFrontendEndpoints}
* **Total Actual Backend Controller Endpoints**: ${scanData.summary.totalActualBackendEndpoints}
* **Fully Wired & Matching Endpoints**: ${scanData.summary.fullyWiredEndpoints}
* **Expected Endpoints Missing from Backend**: ${scanData.summary.missingEndpoints} (Reconciled to **${gapsData.summary.totalMissing}** unique clean missing endpoints)
* **Extra Backend Endpoints**: ${scanData.summary.extraBackendEndpoints}
* **Total Database Models**: ${isolationData.summary.totalModels}
* **Models Without Tenant Scoping Fields**: ${isolationData.summary.withoutTenantCount}
* **Models with Tenant Scoping but Lacking Database Indexes**: ${isolationData.summary.withTenantButNotIndexedCount}

---

## 2. Methodology

The audit was conducted programmatically using static analysis scripts:
1. **Frontend Extraction**: API request patterns (hooks like \`useSchoolQuery\`, \`useSchoolMutation\`, wrappers like \`requestDashboardApi\`, and standard \`fetch\`/\`axios\` calls) were scanned from the Next.js React frontend codebase.
2. **Backend Routing Mapping**: All NestJS controller classes decorated with \`@Controller\` and their corresponding routing methods decorated with HTTP decorators (\`@Get\`, \`@Post\`, \`@Patch\`, \`@Delete\`, \`@Put\`) were parsed.
3. **Route Reconciliation**: Paths were normalized (stripping prefixes like \`/api\` or \`/api/v1\`, removing query strings, and converting route parameters like \`:id\` or template literals \`\${studentId}\` to a standardized \`:param\` placeholder) to allow exact matching.
4. **Schema Verification**: The Prisma schema was parsed to verify the presence of multi-tenant scoping fields (\`schoolId\`, \`school_id\`, \`tenantId\`, \`tenant_id\`) and corresponding database index declarations (\`@@index\`, \`@@unique\`).
5. **Service Verification**: Service files were scanned for Prisma client calls to detect references to non-existent models.

---

## 3. Major Architectural Findings

### 3.1 Route Prefix Mismatch Pattern (Critical)
A systematic routing mismatch exists across multiple core modules. The frontend UI is designed to target role-based command routes prefixed with \`/admin-command/<role>/\`. However, the backend exposes these domains under direct module prefixes (e.g., \`/inventory/\`, \`/clinic/\`, \`/transport/\`). This prefix discrepancy results in silent **404 Route Not Found** errors in the UI.

Specific prefix mismatches detected:
| Module | Frontend Expected Route Prefix | Backend Actual Route Prefix | Status |
| :--- | :--- | :--- | :--- |
| **Inventory / Store** | \`/admin-command/storekeeper/...\` | \`/inventory/...\` | **Broken** |
| **Nurse / Clinic** | \`/admin-command/nurse/...\` | \`/clinic/...\` | **Broken** |
| **Transport** | \`/admin-command/transport-manager/...\` | \`/transport/...\` | **Broken** |
| **Boarding** | \`/admin-command/boarding-master/...\` | \`/boarding/...\` | **Broken** |
| **Class Teacher** | \`/admin-command/class-teacher/...\` | \`/class-teacher/...\` | **Broken** |
| **Dean of Academics** | \`/admin-command/dean-academics/...\` | \`/academics/...\` | **Broken** |

### 3.2 Mismatched Route Names
Even where prefixes match or direct domain modules are targeted, several endpoints differ in shape:
* **Library Module**: Frontend requests \`GET /library/books\` and \`GET /library/loans\`, whereas the backend implements \`GET /library/catalog\` and \`GET /library/circulation\`.
* **Admissions Module**: Frontend requests \`GET /admin-command/admissions/admissions\`, but the backend only exposes \`/admin-command/admissions/overview\` and \`/admin-command/admissions/dashboard\`.

### 3.3 Unimplemented Workflow Mutations
Many POST/Patch/Delete operations expected by the frontend do not have corresponding controllers or service methods on the backend:
* **Admissions Command Center**: Only \`POST /admin-command/admissions/applications/:param/approve\` is implemented. All other onboarding mutation endpoints (like document verification, interview outcomes, parent invitations, and letter generation) are entirely missing.
* **Boarding Master**: The backend implements only a generic checklist \`/boarding/records\` endpoint, lacking specialized routes for bed allocation, roll call attendance, hostel setup, and exeat leave requests.

---

## 4. Database Schema & Tenant Isolation Audit

### 4.1 Global vs Tenant Scoped Models
Of the **${isolationData.summary.totalModels}** database models defined in \`schema.prisma\`, **${isolationData.summary.totalModels - isolationData.summary.withoutTenantCount}** models correctly contain tenant scoping fields (\`schoolId\`, \`school_id\`, \`tenantId\`, or \`tenant_id\`).

The only models lacking tenant fields are global or system-level models:
* \`User\` (global users credentials)
* \`School\` (the school tenant definition itself)
* \`Permission\` / \`RolePermission\` / \`ModulePermission\` (global security schema)
* \`SubscriptionPlan\` (global SaaS package tiers)

### 4.2 Database Index Gaps (High Risk)
While tenant fields are present on **${isolationData.summary.totalModels - isolationData.summary.withoutTenantCount}** tables, **${isolationData.summary.withTenantButNotIndexedCount}** models **do not have a database index** on their tenant fields. 

Without indexes, queries filtering by \`schoolId\` or \`tenant_id\` will result in full-table scans. As the multi-tenant database grows, this will cause severe performance degradation and risk cross-tenant latency.

Key tables lacking tenant indices include:
* \`Student\`
* \`LedgerAccount\` / \`LedgerTransaction\` / \`LedgerEntry\`
* \`DisciplineIncident\` / \`DisciplineCase\` / \`DisciplineAction\`
* \`AttendanceRecord\`
* \`ClinicVisit\` / \`ClinicMedicine\`
* \`LibraryBook\` / \`LibraryLoan\`
* \`InventoryItem\` / \`InventoryStockMovement\`
* \`TransportRoute\` / \`TransportVehicle\`

### 4.3 Service Queries and Missing Models
The backend service files scanned contain commented-out queries targeting three models that are completely missing from the Prisma schema:
* \`LibraryVisit\` (referenced in \`apps/api/src/modules/library/library.service.ts\`)
* \`LibraryRequest\` (referenced in \`apps/api/src/modules/library/library.service.ts\`)
* \`LibraryNotice\` (referenced in \`apps/api/src/modules/library/library.service.ts\`)

Active service logic is currently clean and does not reference any non-existent models.

---

## 5. Detailed Endpoint Gap Registry

Below is a detailed list of clean expected endpoints from the frontend that are currently missing in the backend, grouped by module.

`;

for (const [moduleName, endpoints] of Object.entries(gapsData.modules)) {
  report += `### Module: \`${moduleName}\` (${endpoints.length} gaps)\n\n`;
  report += `| Method | Clean Expected Path | Frontend Original References (Sample) |\n`;
  report += `| :--- | :--- | :--- |\n`;
  
  endpoints.forEach(e => {
    const rawPaths = Array.from(e.rawPaths).slice(0, 2).map(r => `\`${r}\``).join('<br>');
    report += `| **${e.method}** | \`${e.path}\` | ${rawPaths} |\n`;
  });
  
  report += `\n`;
}

report += `
---

## 6. Recommendations & Action Plan

To transition the MyShule platform to production readiness and ensure all workflows are end-to-end operational, the following steps are recommended:

1. **Resolve Route Prefix Discrepancies**:
   * Align the frontend API base paths in \`api-client.ts\` to use the backend's direct modules (\`/inventory\`, \`/clinic\`, \`/transport\`, \`/class-teacher\`), OR
   * Implement route aliases/redirects in the NestJS routing registry or Next.js API proxy to forward \`/admin-command/<role>/\` requests to their corresponding domain controllers.
2. **Implement Missing Scaffolding**:
   * Generate missing mutation endpoints for admissions, boarding exeat, student exits, and library book/fine management.
3. **Database Indexing**:
   * Add \`@@index([schoolId])\` or \`@@index([tenant_id])\` declarations to all tenant-scoped tables in \`prisma/schema.prisma\` to enforce fast multi-tenant isolation lookups.
4. **Prisma Schema Alignment**:
   * Clean up or implement commented-out service code and ensure any newly introduced data structures (like library visits or student welfare concerns) have matching models in \`schema.prisma\`.
`;

fs.writeFileSync(outReportFile, report, 'utf8');
console.log('Report written successfully to', outReportFile);
