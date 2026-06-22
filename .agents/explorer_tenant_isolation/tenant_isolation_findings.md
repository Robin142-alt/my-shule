# Tenant Isolation Security & Database Schema Compliance Report

## Summary
A comprehensive audit of the MyShule codebase was performed, focusing on database schema definitions (`prisma/schema.prisma`), raw database migrations (`schema.sql`), and NestJS controller/service layers. The investigation revealed major gaps in tenant isolation including missing database indexes on tenant fields for over 150 tables, a critical logic bug in the Academics repository RLS context extraction, a complete schema mismatch in the workflow notification controller, and a bypass vector in the student clearance exit flow.

---

## 1. Missing Tenant Scoping Fields (Prisma Schema)

### Gap 1.1: transitive Scoping in `RolePermission`
* **File**: `prisma/schema.prisma` (lines 1057–1069)
* **Code Snippet**:
  ```prisma
  model RolePermission {
    id           String     @id @default(uuid())
    roleId       String     @map("role_id")
    role         Role       @relation(fields: [roleId], references: [id])
    permissionId String     @map("permission_id")
    permission   Permission @relation(fields: [permissionId], references: [id])
    allowed      Boolean    @default(true)
    createdAt    DateTime   @default(now()) @map("created_at")
    updatedAt    DateTime   @updatedAt @map("updated_at")

    @@unique([roleId, permissionId])
    @@map("role_permissions")
  }
  ```
* **Gap Description**: The `RolePermission` model stores school-owned permissions mapping but lacks direct tenant-scoping fields (`schoolId`, `school_id`, `tenantId`, or `tenant_id`). It relies entirely on transitive scoping through the `Role` table. This creates a risk where queries or mutations targeting `RolePermission` directly could bypass tenant validation if not joined with the `Role` table.
* **AGENTS.md Rule Reference**: Section 6: Tenant Isolation Rules — *"Every school-owned record must be scoped. ... Agents must never allow cross-school reads/writes."*

---

## 2. Missing Database Indexes on Tenant Fields

Over 150 models in `prisma/schema.prisma` have tenant-scoping fields (`schoolId` / `school_id` / `tenantId` / `tenant_id`) but completely lack a database index (`@@index`) or unique constraint (`@@unique`) starting with that field. This violates the AGENTS.md rule requiring tenant-aware indexes for all queries.

### Key Models Lacking Indices
1. **Academic Assignments, Resources & Logs**:
   * `AcademicAssignment` (lines 3632–3649) — No indexes defined.
   * `AcademicResource` (lines 3651–3668) — No indexes defined.
   * `LessonLog` (lines 3670–3686) — No indexes defined.
   * `ClassTeacherAssignment` (lines 3688–3701) — No indexes defined.
   * `ReportCardSetting` (lines 3703–3715) — No indexes defined.
   * `AcademicAuditLog` (lines 3590–3602) — No indexes defined.
2. **Legacy Discipline & Counselling Tables** (lines 3721–3992):
   * `OffenseCategory`, `DisciplineIncident`, `LegacyDisciplineAction`, `DisciplineComment`, `DisciplineAttachment`, `BehaviorPoint`, `DisciplineNotification`, `ParentAcknowledgement`, `DisciplineAuditLog`, `CounsellingReferral`, `LegacyCounsellingSession`, `CounsellingNote`, `BehaviorImprovementPlan`, `BehaviorImprovementPlanStep`.
   * **Violation**: These models contain `tenant_id` and `school_id` fields but have **zero** index annotations.
3. **Exams, Tasks & Platform Logs** (lines 3996–4317):
   * `ExamSeries`, `ExamAssessments`, `ExamAssessmentComponents`, `ExamSubjectWeightings`, `ExamMarkEntryWindows`, `ExamMarks`, `ExamMarkVersions`, `StudentReportCards`, `ReportCardArtifacts`, `ReportCardGenerationBatches`, `ExamMarkAuditLogs`, `StudentReportCardAuditLogs`, `ExamTimetableSlots`, `ExamInvigilators`, `ExamAttendanceRecords`, `ExamStudentCases`, `ExamGradeBoundaries`, `ExamGradingPolicies`, `EventConsumerRuns`, `OutboxEvents`, `Tasks`.
4. **Operations & Finance Dashboards** (lines 4320–6488):
   * `PrincipalDashboardSnapshots`, `AdminIncidents`, `Announcements`, `MeetingMinutes`, `AdmissionsApplications`, `BillingNotifications`, `StudentFeePaymentAllocations`, `StudentFeeCredits`, `ManualFeePayments`, `ManualFeePaymentAllocations`, `Subscriptions`, `UsageRecords`, `BiometricDevices`, `BiometricIdentities`, `BiometricEvents`, `AttendanceRules`, `TeacherAttendanceLogs`, `BoardingReferrals`, `AcademicsAttendance`, `ClinicMedicines`, `ClinicMedicineBatches`, `ClinicVisits`, `ClinicMedicineDispenses`, `ClinicProcurementRecommendations`, `ClinicAlerts`, `ClinicAuditLogs`, `ClinicStockMovements`, `CommunicationSmsOutbox`, `ConsentRecords`, `DataSubjectRequests`, `TenantFinanceSummary`, `FinanceTasks`, `FinanceFeeCategories`, `StudentInvoices`, `TenantPendingWaivers`, `StaffContracts`, `StaffLeaveRequests`, `StaffAuditLogs`, `SchoolIntegrations`, `IntegrationLogs`, `ParentOtpChallenges`, `PlatformSmsProviders`, `SchoolSmsWallets`, `SmsWalletTransactions`, `SmsPurchaseRequests`, `InventoryRequisitions`, `InventoryItemBalances`, `InventoryLocations`, `InventorySuppliers`, `InventoryPurchaseOrders`, `InventoryReservations`, `InventoryRequestBackorders`, `InventoryTransfers`, `InventoryIncidents`, `InventoryStockCountSnapshots`, `IotDevices`, `IotTelemetryReadings`, `IotAlerts`, `IotDeviceCommands`, `IotDeviceCredentials`, `IotGatewayIngestions`, `IotAuditLogs`, `LabDepartments`, `Labs`, `LabSessions`, `LabAttendance`, `LabEquipment`, `ChemicalItems`, `LabSessionEquipmentUsage`, `LabSessionChemicalUsage`, `ChemicalDisposalRequests`, `LibraryReservations`, `LibraryCirculationLedger`, `LmsSubmissions`, `ModuleRegistry`, `SchoolModuleAccess`, `ModulePackages`, `ModulePackageItems`, `ModuleUsageEvents`, `OperationsEmergencies`, `OperationsAlerts`, `OperationsReports`, `CallbackLogs`, `MpesaC2bPayments`, `MpesaVerificationJobs`, `PaymentIntents`, `MpesaCallbackChannels`, `MpesaPayloadVault`, `MpesaPayloadSupportAccessLogs`, `FinanceApprovalRequests`, `MpesaReconciliationBatches`, `MpesaReconciliationDiscrepancies`, `Tenants`, `TenantDomains`, `AuthActionTokens`, `AuthEmailOutbox`, `ProcurementSuppliers`, `ProcurementRequests`, `ProcurementRequestItems`, `ProcurementApprovals`, `PurchaseOrderItems`, `ProcurementBudgetLinks`, `SupplierInvoices`, `ProcurementAuditLogs`, `SecretaryQueueTickets`, `SecurityIncidents`, `SecurityPanicAlerts`, `SupportCategories`, `SupportKbArticles`, `SupportSystemComponents`, `SupportTickets`, `SupportMessages`, `SupportInternalNotes`, `SupportStatusLogs`, `SupportAttachments`, `SupportNotifications`, `SupportStatusSubscriptions`, `SupportStatusUnsubscribeTokens`, `SupportStatusNotificationAttempts`, `SyncCursors`, `SyncDevices`, `SyncOperationLogs`, `TenantFinancialAccounts`, `TenantMpesaConfigs`, `MpesaConfigAuditLogs`, `TenantPaymentChannels`, `TenantBankAccounts`, `TimetableSlots`, `TimetableVersions`, `TimetableAuditLogs`, `TransportRouteStops`, `TransportDrivers`, `TransportManifests`, `TransportManifestStudents`, `TransportTrips`, `TransportTripEvents`, `VehicleServiceLogs`, `TransportAuditLogs`, `VisitorsAppointments`, `VisitorsLogs`, `DashboardTasks`, `WorkflowEvents`.

### AGENTS.md Rule Reference
Section 9: Database Contract Rules — *"Use tenant-aware indexes for school-scoped queries."* Without these indexes, every query filtering by `schoolId` or `tenant_id` triggers full table scans, destroying database performance at scale.

---

## 3. NestJS Database Queries Scoping Gaps

### Gap 3.1: Student Clearance School Scoping Bypass
* **File**: `apps/api/src/modules/students/student-lifecycle.service.ts` (lines 192–197)
* **Code Snippet**:
  ```typescript
  if (clearanceId) {
    const clearance = await this.prisma.studentClearance.findUnique({ where: { id: clearanceId } });
    if (!clearance || clearance.status !== 'CLEARED') {
      throw new BadRequestException('Student must be fully cleared before exiting');
    }
  }
  ```
* **Gap Description**: The service checks whether a student exit is authorized by querying a `StudentClearance` record. However, it only looks up the clearance by its ID and checks if its status is `'CLEARED'`. It **fails** to verify that `clearance.schoolId === schoolId`. This enables a cross-school data leak: an attacker or developer bug could supply a valid `'CLEARED'` ID from school B to successfully exit a student in school A, bypassing local clearance validation.
* **AGENTS.md Rule Reference**: Section 6: Tenant Isolation Rules — *"Super Admin, Principal, etc. ... parent access to children from another school ... Mutate school-owned data without school_id or tenant scope."*

### Gap 3.2: Mismatched Schema in Workflow Notification Controller
* **File**: `apps/api/src/modules/workflow/controllers/notification.controller.ts` (lines 45–48 and 63–66)
* **Code Snippet**:
  ```typescript
  const result = await this.db.query(
    `SELECT * FROM notifications WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [tenantId]
  );
  ...
  const result = await this.db.query(
    `UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [id, tenantId]
  );
  ```
* **Gap Description**: The raw SQL query in this controller filters on `tenant_id` and updates `is_read`. However, the `Notification` schema defines:
  1. `schoolId` mapped to `school_id` in the database, **not** `tenant_id`.
  2. `status` (a `NotificationStatus` enum), **not** `is_read`.
  This mismatch causes immediate database query exceptions (`column "tenant_id" does not exist` and `column "is_read" does not exist`), breaking both the notification workflow and tenant isolation.
* **AGENTS.md Rule Reference**: Section 10: Frontend and Backend Wiring Rules — *"Every frontend workflow must map to a backend contract. ... Backend must not return shapes the frontend cannot render."*

---

## 4. Logic Bug in AcademicsRepository RLS Context Extraction

### Gap 4.1: SQL Query Passed as Tenant ID to PostgreSQL Session context
* **File**: `apps/api/src/modules/academics/repositories/academics.repository.ts` (lines 43–48)
* **Code Snippet**:
  ```typescript
  private getTenantId(params: any[]): string {
    for (const p of params) {
      if (typeof p === 'string' && p.length > 20) return p;
    }
    throw new Error('Tenant ID missing for raw query');
  }
  ```
  * Example call (lines 841–843):
    ```typescript
    const result = await this.executeSql(this.getTenantId([`SELECT id, name, starts_on, ends_on FROM academic_years WHERE tenant_id = $1 ORDER BY starts_on DESC`,
      [tenantId]]), `SELECT id, name, starts_on, ends_on FROM academic_years WHERE tenant_id = $1 ORDER BY starts_on DESC`,
      [tenantId]);
    ```
* **Gap Description**:
  The `getTenantId` function automatically extracts the tenant ID parameter by finding the first string parameter whose length is greater than 20. However, the repository calls this helper by wrapping the query string and its params array into a single outer array: `this.getTenantId([query_string, [tenantId]])`.
  Since the first element of this array is the SQL query string itself (which is a string of length > 20), `getTenantId` **returns the SQL query string** instead of the actual tenant ID UUID!
  This value is passed directly to `executeWithTenant` in the Prisma service, executing:
  `SET LOCAL app.tenant_id = 'SELECT id, name, starts_on, ends_on FROM academic_years WHERE tenant_id = $1...';`
  Since the Postgres session's `app.tenant_id` is set to the SQL query statement instead of the actual tenant ID, all Row Level Security (RLS) policies using:
  `USING (tenant_id = current_setting('app.tenant_id', true))`
  will mismatch, causing all queries to return **zero rows** under RLS restrictions, completely breaking data queries.
* **AGENTS.md Rule Reference**: Section 6: Tenant Isolation Rules — *"Shared School Data Rules ... All cross-dashboard communication must remain school-scoped."* and Section 5: Agent Governance Protocol.
