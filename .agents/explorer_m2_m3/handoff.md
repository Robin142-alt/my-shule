# Phase 3 Remediation Investigation Report (Milestones 2, 3, & 4)

## 1. Observation

Direct observations of stubs, mocks, and silent error fallbacks:

### Milestone 2: Duplicate Controllers and payFees Mock Fallback
- **Duplicate controllers check**:
  - `apps/api/src/modules/auth/auth.controller.ts` is **Deleted** (the folder `apps/api/src/modules/auth` does not exist).
  - `apps/api/src/modules/parent-portal/parent-portal.controller.ts` is **Deleted** (the only file in that directory is `parent-portal-actions.controller.ts`).
  - `apps/api/src/modules/parent-portal/parent-portal-children.controller.ts` is **Deleted**.
- **`payFees` mock fallback** (in `apps/api/src/modules/parent-portal/parent-portal-actions.controller.ts` lines 24-41):
```typescript
    try {
      const payment = await this.prisma.payment.create({
        data: {
          schoolId: tenantId || "",
          studentId,
          amount: Number(amount),
          paymentReference: paymentReference || reference || `PAY-${Date.now()}`,
          paymentMethod: paymentMethod || 'MPESA',
          paymentDate: new Date(),
          status: 'CONFIRMED',
        }
      });
      return { success: true, paymentId: payment.id };
    } catch (error) {
      // Return fallback response on error/missing table
      console.error('payFees error:', error);
      return { success: true, paymentId: `MOCK-${Date.now()}`, isMock: true };
    }
```

---

### Milestone 3: Clinic, Library, Labs, and Miscellaneous Controller Stubs

#### Clinic Module (`apps/api/src/modules/clinic/clinic.service.ts` & `clinic.repository.ts`)
- **6 Clinic Stubs**:
  1. `listEmergencies()` (lines 251-259): Directly calls raw prisma `findMany` instead of repository layer:
     ```typescript
     const items = await this.prisma.medicalVisit.findMany({
       where: { schoolId: this.requireTenantId(), severity: 'EMERGENCY' },
       include: { student: true }
     });
     ```
  2. `recordEmergency(dto)` (lines 261-278): Bypasses repository layers, directly inserting into `medicalVisit` with default settings and no audit logs or notifications:
     ```typescript
     const visit = await this.prisma.medicalVisit.create({ ... });
     ```
  3. `listReferrals()` (lines 280-288): Directly calls raw prisma `findMany` for visits where status is `'REFERRED'`.
  4. `createReferral(dto)` (lines 290-299): Directly updates `medicalVisit` status to `'REFERRED'` via Prisma, bypassing business validation.
  5. `getSickBayQueue()` (lines 301-310): Directly calls raw prisma `findMany` for visits where status is `'OPEN'`, sorted by `visitTime`.
  6. `addToQueue(dto)` (lines 312-329): Directly creates a `medicalVisit` with status `'OPEN'` using raw prisma, bypassing inventory check.
- **2 Silent Errors in Clinic**:
  1. `isProcurementModuleEnabled` (in `apps/api/src/modules/clinic/clinic.service.ts` lines 428-435):
     ```typescript
     try {
       const enabledModules = await this.moduleAccessService.listEnabledModulesForTenant(tenantId);
       return enabledModules.includes('procurement');
     } catch {
       return false;
     }
     ```
  2. `appendAuditLog` (in `apps/api/src/modules/clinic/repositories/clinic.repository.ts` line 695):
     ```typescript
     await this.executeSql(
       `INSERT INTO clinic_audit_logs ...`,
       [...]
     ).catch(() => undefined);
     ```

#### Library Module (`apps/api/src/modules/library/library.service.ts`)
- **6 Library Stubs**:
  1. `getDepartments()` (lines 457-464): Queries `department` model directly.
  2. `getVisits()` (lines 466-475): Queries `libraryCirculationLedger` directly, limited to 20 items.
  3. `getRequests()` (lines 477-486): Queries `libraryReservations` directly, limited to 20 items.
  4. `getReports()` (lines 488-497): Queries `operationsReports` directly where title contains `'Library'`.
  5. `getNotices()` (lines 499-508): Queries `notification` directly where module is `'library'`.
  6. `getReturns()` (lines 510-512): Delegates directly to `listCirculation({ action: 'return' })` bypassing any specific verification.

#### Labs Module (`apps/api/src/modules/labs/labs.controller.ts` & `labs.repository.ts`)
- **4 Labs Stubs**:
  1. `getDashboard()`: Repository uses try-catch (lines 805-875) returning default zeroed counters and static labels like `Today's Practicals` when raw SQL queries on `lab_sessions` or `chemical_items` fail.
  2. `getInventory()`: Repository uses try-catch (lines 877-918) formatting items manually into a mock structure (`Apparatus` vs `Chemical`) and returning `[]` on error.
  3. `getRequests()`: Repository uses try-catch (lines 920-969) querying `lab_sessions` and mapping user names manually, returning `[]` on error.
  4. `getIssues()`: Repository uses try-catch (lines 971-1091) combining equipment and chemical usages, returning `[]` on error.

#### Miscellaneous Controller Stubs
- **`dashboard.controller.ts` (getSummary)** (lines 78-96):
  ```typescript
  try {
    const [students, staff, classes] = await Promise.all([
      this.prisma.student.count({ where: { schoolId: tenantId } }).catch(() => 0),
      this.prisma.schoolMembership.count({ where: { schoolId: tenantId } }).catch(() => 0),
      this.prisma.class.count({ where: { schoolId: tenantId } }).catch(() => 0),
    ]);
    return { students, staff, classes };
  } catch (error) {
    console.error('getSummary error:', error);
    return { students: 0, staff: 0, classes: 0 };
  }
  ```
- **`discipline.controller.ts` (getCases)** (lines 292-309):
  ```typescript
  try {
    const result = await this.executeSql(
      `SELECT * FROM discipline_incidents WHERE school_id = $1::uuid`,
      [tenantId]
    );
    return result.rows;
  } catch (e) {
    console.error('getCases error:', e);
    return [];
  }
  ```
- **`grade-master.controller.ts` (getOverview)** (lines 18-54):
  ```typescript
  try {
    const reportCards = await this.prisma.reportCard.findMany({
      where: { schoolId: tenantId }
    });
    // Computes average manually, then:
  } catch (e) {
    console.error('getOverview error:', e);
    return { totalReportCards: 0, averageScore: 0, passedCount: 0 };
  }
  ```
- **`operational-workflow-dispatcher.controller.ts` (getOfflineSync)** (lines 97-128):
  ```typescript
  try {
    const result = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int as count FROM sync_operation_logs WHERE tenant_id = $1::uuid`,
      tenantId
    );
    const syncedCount = result[0]?.count ?? 0;
    return { pending: 0, synced: syncedCount, failed: 0, conflicts: 0, status: 'operational' };
  } catch (e) {
    return { pending: 0, synced: 0, failed: 0, conflicts: 0, status: 'operational' };
  }
  ```
- **`attendance-mark.controller.ts` (markAttendance)** (lines 17-54):
  ```typescript
  try {
    const record = await this.prisma.attendanceRecord.upsert({ ... });
    return { success: true, recordId: record.id };
  } catch (error) {
    console.error('markAttendance error:', error);
    return { success: true, recordId: `MOCK-${Date.now()}`, isMock: true };
  }
  ```
- **`sms.controller.ts` (sendSms)** (lines 17-45):
  ```typescript
  try {
    const smsLog = await this.prisma.smsLog.create({ ... });
    return { success: true, logId: smsLog.id };
  } catch (error) {
    console.error('sendSms error:', error);
    return { success: true, logId: `MOCK-${Date.now()}`, isMock: true };
  }
  ```

---

### Milestone 4: Silent Catches and UI Click Handlers

- **13 Catch-and-Throw Patterns converting DB Errors to Generic Internal Server Errors**:
  - `apps/api/src/modules/academics/academic.controller.ts` contains **12** instances (lines 27, 44, 62, 94, 112, 127, 144, 173, 190, 205, 220, 248):
    ```typescript
    } catch (e: any) {
      throw new InternalServerErrorException(e.message);
    }
    ```
  - `apps/api/src/modules/academics/academics.controller.ts` contains **1** instance (lines 398-407):
    ```typescript
    } catch (e: any) {
      throw new InternalServerErrorException(e.message);
    }
    ```
- **Empty onClick Handler in `invoices-workspace.tsx`**:
  - Path: `apps/web/src/components/school/accountant/invoices-workspace.tsx`
  - Button at line 939 opens modal: `<Button variant="outline" onClick={() => setShowBulkModal(true)}>Bulk invoicing</Button>`
  - Modal definition (lines 1348-1364) has no operational logic or API call trigger, only a text warning and close button:
    ```typescript
    <Modal
      open={showBulkModal}
      title="Bulk invoicing"
      description="Configuration status"
      onClose={() => setShowBulkModal(false)}
      footer={
        <Button variant="secondary" onClick={() => setShowBulkModal(false)}>
          Close
        </Button>
      }
    >
      <div className="space-y-4 py-2">
        <p className="text-sm text-foreground">
          Bulk invoicing is not yet configured for direct execution. Please configure fee structures first.
        </p>
      </div>
    </Modal>
    ```

---

## 2. Logic Chain

1. **Verification of deletion (Milestone 2)**: 
   Using the `find_by_name` and `list_dir` tools, we checked the file system under `apps/api/src/modules/auth/` and `apps/api/src/modules/parent-portal/`. The results showed only one file in `parent-portal` (`parent-portal-actions.controller.ts`), and the folder `auth/` was entirely absent inside `modules/`. This confirms deletion.
2. **Detection of mock fallbacks**:
   Viewing `parent-portal-actions.controller.ts`, `attendance-mark.controller.ts`, and `sms.controller.ts` directly via the `view_file` tool confirmed that their `catch` blocks handle errors by returning `{ success: true, ... }` with `isMock: true` or a `MOCK-` prefix, confirming that they hide underlying failures from the client UI.
3. **Detection of clinic and library stubs (Milestone 3)**:
   In `clinic.service.ts`, we identified direct Prisma calls like `this.prisma.medicalVisit.findMany` instead of utilising the `ClinicRepository` pattern. Silent catches were also identified in `isProcurementModuleEnabled` (returns `false` silently) and `appendAuditLog` (returns `undefined` silently). For the Library module, direct calls on prisma fields like `prisma.department`, `prisma.libraryCirculationLedger`, `prisma.libraryReservations`, `prisma.operationsReports`, and `prisma.notification` were found, which bypass structural service-layer abstractions.
4. **Identification of UI-mocked structures (Labs)**:
   The `labs.repository.ts` functions (`getDashboard`, `getInventory`, `getRequests`, `getIssues`) contain catch blocks returning empty or default values on error and format DB data manually into specific objects to feed the dashboard UI directly.
5. **Milestone 4 Errors**:
   Ripgrep search for `catch (e: any)` in `academic.controller.ts` and `academics.controller.ts` revealed exactly 13 locations that catch any error `e` and throw `new InternalServerErrorException(e.message)`. This swallows original Postgres / Prisma metadata and returns a generic 500 error, presenting a risk of unhandled/silent database crashes.
6. **Invoices-workspace placeholder**:
   Inspection of `invoices-workspace.tsx` confirmed that the modal triggered by "Bulk invoicing" is an informational placeholder containing no button to trigger a backend service or mutation.

---

## 3. Caveats

- We assumed that the models referenced by stubs exist in the Postgres schema (e.g. `medical_visits` and `sync_operation_logs`). We verified their presence in `prisma/schema.prisma` successfully, but did not perform a live db migration state check.
- We did not write code changes since this is a read-only investigation.

---

## 4. Conclusion

- The codebase has been cleaned of duplicate controllers from Milestone 2.
- Multiple controllers (`parent-portal-actions.controller.ts`, `attendance-mark.controller.ts`, `sms.controller.ts`) contain mock handlers that return `isMock: true` when database calls fail.
- Clinic, Library, and Labs modules use a mix of raw Prisma queries bypassing repositories, direct SQL execution with generic UI formatting, and silent catches.
- Error handling in academics controllers (`academic.controller.ts` and `academics.controller.ts`) is generic and lacks error mapping.
- The "Bulk invoicing" modal is a frontend-only stub with no backend execution wiring.

---

## 5. Verification Method

To verify these findings:
1. Run `npm run test` or check spec tests for these modules:
   - `apps/api/src/modules/clinic/clinic.test.ts`
   - `apps/api/src/modules/library/library.test.ts`
   - `apps/api/src/modules/labs/labs.test.ts`
2. Inspect the verified lines in the following files:
   - `apps/api/src/modules/parent-portal/parent-portal-actions.controller.ts` lines 24-41
   - `apps/api/src/modules/clinic/clinic.service.ts` lines 251-329
   - `apps/api/src/modules/clinic/repositories/clinic.repository.ts` line 695
   - `apps/api/src/modules/library/library.service.ts` lines 457-512
   - `apps/api/src/modules/labs/repositories/labs.repository.ts` lines 805-1091
   - `apps/api/src/modules/academics/academic.controller.ts` (12 catches)
   - `apps/web/src/components/school/accountant/invoices-workspace.tsx` lines 1348-1364
