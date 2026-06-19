# Handoff Report - Backend Controllers Facade Stubs & Test Bypasses Investigation

## 1. Observation

### 1.1 Backend Controllers File Paths and Facade Stubs

We investigated the 9 backend modules flagged for returning empty/hardcoded stubs. Below are the file paths, action methods, line numbers, and verbatim code segments of the stubs:

#### 1. Exams
- **File Path**: `apps/api/src/modules/exams/exams.controller.ts`
- **Stubs**:
  - `getConfiguration()` (lines 327–331):
    ```typescript
    @Get('configuration')
    @Permissions('exams:read')
    getConfiguration() {
      return { items: [] };
    }
    ```
  - `getDrafts()` (lines 333–337):
    ```typescript
    @Get('draft')
    @Permissions('exams:read')
    getDrafts() {
      return { items: [] };
    }
    ```
  - `getAlignment()` (lines 339–343):
    ```typescript
    @Get('alignment')
    @Permissions('exams:read')
    getAlignment() {
      return { items: [] };
    }
    ```
  - `getReview()` (lines 345–349):
    ```typescript
    @Get('review')
    @Permissions('exams:read')
    getReview() {
      return { items: [] };
    }
    ```
  - `getLifecycle()` (lines 351–355):
    ```typescript
    @Get('lifecycle')
    @Permissions('exams:read')
    getLifecycle() {
      return { items: [] };
    }
    ```
  - Additionally, write operations return static success messages:
    - `saveDraft()` (lines 81-85): `return { success: true, message: 'Draft saved' };`
    - `alignExam()` (lines 87-91): `return { success: true, message: 'Alignment updated' };`
    - `reviewExam()` (lines 93-97): `return { success: true, message: 'Review completed' };`
    - `updateLifecycle()` (lines 99-103): `return { success: true, message: 'Lifecycle updated' };`

#### 2. Academics
- **File Paths**: 
  1. `apps/api/src/modules/academics/academic.controller.ts` (Core endpoint)
  2. `apps/api/src/modules/academics/academics.controller.ts` (Alternative/legacy endpoint)
- **Stubs in `academic.controller.ts`**:
  - `getCommunications()` (lines 15–19):
    ```typescript
    @Get('communications')
    @Permissions('academics:read')
    getCommunications() {
      return { items: [] };
    }
    ```
  - `lockBatch()` (lines 21–25):
    ```typescript
    @Post('dean/lock-batch')
    @Permissions('academics:write')
    lockBatch(@Body() body: any) {
      return { success: true };
    }
    ```
  - `deanAction()` (lines 27–31):
    ```typescript
    @Post('dean/action')
    @Permissions('academics:write')
    deanAction(@Body() body: any) {
      return { success: true };
    }
    ```
  - `importMarks()` (lines 33–37):
    ```typescript
    @Post('exams-manager/import-marks')
    @Permissions('academics:write')
    importMarks(@Body() body: any) {
      return { success: true };
    }
    ```
  - `exportMarks()` (lines 39–43):
    ```typescript
    @Get('exams-manager/export-marks')
    @Permissions('academics:read')
    exportMarks() {
      return { items: [] };
    }
    ```
  - `syncZeraki()` (lines 45–49):
    ```typescript
    @Post('exams-manager/zeraki-sync')
    @Permissions('academics:write')
    syncZeraki(@Body() body: any) {
      return { success: true };
    }
    ```
  - `compileGrades()` (lines 51–55):
    ```typescript
    @Post('grade-master/compile')
    @Permissions('academics:write')
    compileGrades(@Body() body: any) {
      return { success: true };
    }
    ```
  - `addComment()` (lines 57–61):
    ```typescript
    @Post('grade-master/comment')
    @Permissions('academics:write')
    addComment(@Body() body: any) {
      return { success: true };
    }
    ```
  - `getHodRequests()` (lines 63–67):
    ```typescript
    @Get('hod/requests')
    @Permissions('academics:read')
    getHodRequests() {
      return { items: [] };
    }
    ```
  - `getDepartmentMeetings()` (lines 80–84):
    ```typescript
    @Get('hod/department-meetings')
    @Permissions('academics:read')
    getDepartmentMeetings() {
      return { items: [] };
    }
    ```
  - `enterMarks()` (lines 86–90):
    ```typescript
    @Post('marks/enter')
    @Permissions('academics:write')
    enterMarks(@Body() body: any) {
      return { success: true };
    }
    ```
- **Stubs in `academics.controller.ts`**:
  - `getCommunications()` (lines 393–398):
    ```typescript
    @Get('communications')
    @Permissions('academics:read')
    getCommunications() {
      // Communications are handled in communication module
      return { items: [] };
    }
    ```

#### 3. Billing
- **File Path**: `apps/api/src/modules/billing/billing.controller.ts`
- **Stubs**:
  - `getStudentBalancesCsv()` (lines 323–327):
    ```typescript
    @Get('student-balances/csv')
    async getStudentBalancesCsv(@Query() query: any) {
      // For now return raw JSON from listStudentBalances until export logic is fully written
      return this.billingService.listStudentBalances(query);
    }
    ```
  - `getWaivers()` (lines 334–338):
    ```typescript
    @Get('waivers')
    async getWaivers() {
      // Return empty array for waivers in billing as they are handled in finance
      return [];
    }
    ```

#### 4. Boarding
- **File Path**: `apps/api/src/modules/boarding/boarding.controller.ts`
- **Stubs**:
  - `getRollCalls()` (lines 98–102):
    ```typescript
    @Get('roll-calls')
    @Permissions('boarding:read')
    getRollCalls() {
      return { items: [] };
    }
    ```
  - `getExeats()` (lines 104–108):
    ```typescript
    @Get('exeats')
    @Permissions('boarding:read')
    getExeats() {
      return { items: [] };
    }
    ```

#### 5. Clinic
- **File Path**: `apps/api/src/modules/clinic/clinic.controller.ts`
- **Stubs**:
  - `getParentStudentHistory()` (lines 127–131):
    ```typescript
    @Get('parent/students/me/history')
    @Permissions('portal:read_own_children')
    getParentStudentHistory() {
      return { items: [] };
    }
    ```
  - `getMedicinesStock()` (lines 133–137):
    ```typescript
    @Get('medicines/stock')
    @Permissions('clinic:read')
    getMedicinesStock() {
      return { items: [] };
    }
    ```

#### 6. Communication
- **File Path**: `apps/api/src/modules/communication/communication.controller.ts`
- **Stubs**:
  - `getSummary()` (lines 54–58):
    ```typescript
    @Get('summary')
    @Permissions('school_communication:read')
    getSummary() {
      return { items: [] };
    }
    ```
  - `getMessages()` (lines 60–64):
    ```typescript
    @Get('messages')
    @Permissions('school_communication:read')
    getMessages() {
      return { items: [] };
    }
    ```

#### 7. Timetable
- **File Path**: `apps/api/src/modules/timetable/timetable.controller.ts`
- **Stubs**:
  - `getTimetableDashboard()` (lines 37–42):
    ```typescript
    @Get('dashboard')
    @Permissions('timetable:read')
    getTimetableDashboard() {
      // Analytics stub - return empty dashboard until implemented
      return { metrics: {}, items: [] };
    }
    ```

#### 8. Transport
- **File Path**: `apps/api/src/modules/transport/transport.controller.ts`
- **Stubs**:
  - `getVehicles()` (lines 145–149):
    ```typescript
    @Get('vehicles')
    @Permissions('transport:read')
    getVehicles() {
      return { items: [] };
    }
    ```
  - `getTrips()` (lines 151–155):
    ```typescript
    @Get('trips')
    @Permissions('transport:read')
    getTrips() {
      return { items: [] };
    }
    ```

#### 9. Secretary
- **File Path**: `apps/api/src/modules/secretary/secretary.controller.ts`
- **Stubs**:
  - `getDashboard()` (lines 11–24):
    ```typescript
    @Get('dashboard')
    @Permissions('secretary:read')
    getDashboard() {
      return {
        metrics: {
          newAdmissions: 0,
          pendingInquiries: 0,
          visitorsToday: 0,
          activeTasks: 0
        },
        quickLinks: [],
        recentActivity: []
      };
    }
    ```
  - `getVisitors()` (lines 26–30):
    ```typescript
    @Get('visitors')
    @Permissions('secretary:read')
    getVisitors() {
      return { items: [] };
    }
    ```
  - `getInquiries()` (lines 32–36):
    ```typescript
    @Get('inquiries')
    @Permissions('secretary:read')
    getInquiries() {
      return { items: [] };
    }
    ```

---

### 1.2 Database Models in `prisma/schema.prisma`
We mapped the corresponding native Prisma models and legacy/custom tables for each module.

1. **Exams**:
   - `ExamCycle` (mapped to `exam_cycles`)
   - `ExamSubject` (mapped to `exam_subjects`)
   - `MarksEntry` (mapped to `marks_entry`)
   - `GradingScale` (mapped to `grading_scales`)
   - `GradingScaleRange` (mapped to `grading_scale_ranges`)
   - `ReportCard` (mapped to `report_cards`)
   - *Custom/Programmatic SQL tables (defined in `ExamsSchemaService`):* `exam_series`, `exam_assessments`, `exam_marks`, `student_report_cards`, `report_card_generation_batches`, `report_card_artifacts`, `exam_timetable_slots`, `exam_invigilators`, `exam_attendance_records`, `exam_student_cases`.

2. **Academics**:
   - `AcademicYear` (mapped to `academic_years`)
   - `Term` (mapped to `terms`)
   - `Department` (mapped to `departments`)
   - `Class` (mapped to `classes`)
   - `Stream` (mapped to `streams`)
   - `Subject` (mapped to `subjects`)
   - `ClassSubject` (mapped to `class_subjects`)
   - `TeacherSubjectAssignment` (mapped to `teacher_subject_assignments`)
   - `Student` (mapped to `students`)
   - `StudentEnrollment` (mapped to `student_enrollments`)
   - `AttendanceSession` (mapped to `attendance_sessions`)
   - `AttendanceRecord` (mapped to `attendance_records`)
   - `AcademicGradingSystem` (mapped to `academics_grading_systems`)
   - `AcademicAttendanceSetting` (mapped to `academics_attendance_settings`)
   - `AcademicAssignment` (mapped to `academics_assignments`)

3. **Billing**:
   - `FeeStructure` (mapped to `fee_structures`)
   - `FeeItem` (mapped to `fee_items`)
   - `StudentFeeAccount` (mapped to `student_fee_accounts`)
   - `Invoice` (mapped to `invoices`)
   - `InvoiceItem` (mapped to `invoice_items`)
   - `Payment` (mapped to `payments`)
   - `Receipt` (mapped to `receipts`)
   - `MpesaTransaction` (mapped to `mpesa_transactions`)
   - `FeeWaiver` (mapped to `fee_waivers`)

4. **Boarding**:
   - `BoardingHouse` (mapped to `boarding_houses`)
   - `Dormitory` (mapped to `dormitories`)
   - `Bed` (mapped to `beds`)
   - `BoardingAllocation` (mapped to `boarding_allocations`)
   - `BoardingAttendance` (mapped to `boarding_attendance`)
   - *Raw SQL tables used:* `boarding_referrals`

5. **Clinic**:
   - `MedicalVisit` (mapped to `medical_visits`)
   - `MedicineInventory` (mapped to `medicine_inventory`)
   - `MedicineDispensingLog` (mapped to `medicine_dispensing_logs`)

6. **Communication**:
   - `SmsLog` (mapped to `sms_logs`)
   - `CommunicationBroadcast` (mapped to `communication_broadcasts`)

7. **Timetable**:
   - `TimetableSlots` (mapped to `timetable_slots`)
   - `TimetableVersions` (mapped to `timetable_versions`)
   - `TimetableAuditLogs` (mapped to `timetable_audit_logs`)
   - `TimetablePeriod` (mapped to `timetable_periods`)
   - `ClassTimetableEntry` (mapped to `class_timetable_entries`)

8. **Transport**:
   - `TransportRoute` (mapped to `transport_routes`)
   - `TransportVehicle` (mapped to `transport_vehicles`)
   - `StudentTransportAssignment` (mapped to `student_transport_assignments`)
   - `VehicleFuelLog` (mapped to `vehicle_fuel_logs`)
   - `TransportRouteStops` (mapped to `transport_route_stops`)

9. **Secretary**:
   - `Visitor` (mapped to `visitors`)
   - `VisitorLog` (mapped to `visitor_logs`)
   - `GateIncident` (mapped to `gate_incidents`)
   - `AdmissionApplication` (mapped to `admission_applications`)
   - `AdmissionDocument` (mapped to `admission_documents`)
   - `AdmissionInterview` (mapped to `admission_interviews`)

---

### 1.3 Exams Test File Review (`apps/api/src/modules/exams/exams.test.ts`)
- **Self-Certification**: The test file uses direct mock injection to bypass actual service instantiation, casting mock objects as `never` (e.g. `{} as never`). 
- **Verbatim Bypass / Mock Simulation**:
  - `ExamsService handles HOD Review workflow for returning submitted marks` (lines 1379–1388):
    ```typescript
    test('ExamsService handles HOD Review workflow for returning submitted marks', async () => {
      const calls: string[] = [];

      // Mock simulation for HOD review workflow
      // The actual review flow goes through the repository layer
      calls.push('updateStatus');
      calls.push('reviewLog');

      assert.deepEqual(calls, ['updateStatus', 'reviewLog']);
    });
    ```
    This test contains no integration with `ExamsService` or database models. It merely asserts against a local array populated in the test itself.
- **Services/Assertions to Restore**:
  - Real instantiation of `ExamsService` and its dependent `ExamsRepository`, `ReportCardGenerationService`, and `PrismaService`.
  - Concrete assertions targeting actual database entries instead of mock calls.
  - Verification of tenant RLS (Row Level Security) constraint execution by checking that queries filter by `tenant_id` or `schoolId`.

---

## 2. Logic Chain

1. **Path Identification**: By executing name search queries, we isolated the exact controller file locations matching the flagged stubs.
2. **Facade Identification**: By opening and viewing all targeted controllers, we identified the specific action methods containing empty arrays (`[]`), empty metrics/stubs, or static success payloads.
3. **Database Mapping**: By grepping the Prisma schema for model definitions and cross-referencing imports in controllers/repositories, we determined the exact database models under each module.
4. **Bypass Discovery**: In inspecting `exams.test.ts`, we located simulated test flows where the production class is not called, indicating a mock bypass.
5. **Mitigation Strategy**: Restoring integration tests with actual database transactions is essential to verify multi-tenant isolation and programmatic behavior.

---

## 3. Caveats

- We assumed that all tables containing school data are mapped either in `prisma/schema.prisma` or bootstrapped programmatically via SQL files (such as `exams-schema.service.ts`). There may be other microservices or modules that generate tables dynamically on boot which were not explicitly analyzed.
- We did not implement any code modifications since our role is strictly read-only Explorer investigation.

---

## 4. Conclusion

1. Nine backend controllers are returning hardcoded facade stubs instead of querying the database.
2. The multi-tenant isolation relies on filtering by `schoolId` (native Prisma models) or `tenant_id` (programmatically generated tables).
3. The exams test file contains multiple mock bypasses and self-certifies workflows (e.g. HOD review workflow) using arrays populated locally within the test functions.

### Recommended Prisma Isolation Queries

To enforce tenant isolation, queries should extract the `tenant_id` from the RequestContext store and apply it consistently:

- **For native Prisma models (e.g. `Student`, `Visitor`, `Invoice`, etc.):**
  ```typescript
  const tenantId = this.requestContext.requireStore().tenant_id;
  const data = await this.prisma.student.findMany({
    where: { schoolId: tenantId }
  });
  ```

- **For programmatically managed tables (e.g. `TimetableSlots`, `exam_marks`, etc.):**
  ```typescript
  const tenantId = this.requestContext.requireStore().tenant_id;
  const data = await this.prisma.timetableSlots.findMany({
    where: { tenant_id: tenantId }
  });
  ```

---

## 5. Verification Method

To independently verify:
1. Inspect the controller files directly:
   - Run `cat apps/api/src/modules/secretary/secretary.controller.ts` to see empty/mock dashboards and visitor structures.
   - Run `cat apps/api/src/modules/exams/exams.controller.ts` to see stubs for configuration, drafts, alignment, review, and lifecycle.
2. Run project test suites to verify how tests execute:
   - Execute: `npm test` or the appropriate workspace test command for `apps/api/src/modules/exams/exams.test.ts` (e.g., `node --test apps/api/src/modules/exams/exams.test.ts`).
