# Analysis Report: Backend Route Mapping for Role-Based Command Centers

**Date**: 2026-06-18
**Explorer**: explorer_2
**Status**: Read-only Investigation Completed

---

## 1. Summary of Findings

This investigation focuses on mapping the NestJS backend routes under `/admin-command/...` to satisfy the requirements of the multi-role front-end administrative command centers in the **MyShule** platform.

- **Current Backend Implementation**: Only **three** controllers are currently declared and registered in the `AdminCommandModule` (`apps/api/src/modules/admin-command/admin-command.module.ts`):
  1. `AdminCommandController` (Prefix: `admin-command`) — Serves general principal, basic secretary, and global search routes.
  2. `AdmissionsCommandController` (Prefix: `admin-command/admissions`) — Serves admissions-specific routes.
  3. `DeputyCommandController` (Prefix: `admin-command/deputy`) — Serves deputy-specific routes.

- **Missing Controller Routes**: We analyzed the frontend codebase (specifically `apps/web/src/components/school/`) to identify all calls made to `/api/admin-command/...` or `/admin-command/...`. A total of **19 roles** make specific API calls, out of which **16 roles** have **no dedicated controller** or are missing sub-workspace routes on the backend.

---

## 2. Role-Based Workspaces & Missing Backend Routes

The table below maps frontend workspaces, their queried endpoint patterns, and their current backend controller status:

| Role / Command Center | Frontend Endpoint Pattern | Backend Controller File | Status | Missing Endpoints |
| :--- | :--- | :--- | :--- | :--- |
| **Principal** | `/admin-command/principal/...` | `admin-command.controller.ts` | Fully Mapped | None |
| **Admissions** | `/admin-command/admissions/...` | `admissions-command.controller.ts` | Fully Mapped | None |
| **Deputy Principal** | `/admin-command/deputy/...` | `deputy-command.controller.ts` | Fully Mapped | None |
| **Storekeeper** | `/admin-command/storekeeper/...` | None | **Missing** | `overview`, `items`, `items/issue`, `items/receive`, `low-stock`, `requests`, `stocktake`, `damaged-missing`, `reports`, `reports/generate` |
| **Nurse** | `/admin-command/nurse/...` | None | **Missing** | `overview`, `visits`, `dispensing-log`, `medicine-inventory`, `sick-bay-queue`, `parent-notifications`, `health-reports`, `health-reports/generate` |
| **Transport Manager** | `/admin-command/transport-manager/...` | None | **Missing** | `overview`, `vehicles`, `drivers`, `routes`, `trips`, `fuel-maintenance`, `fuel-maintenance/fuel`, `fuel-maintenance/maintenance`, `student-transport-list`, `reports`, `reports/generate` |
| **Boarding Master** | `/admin-command/boarding-master/...` | None | **Missing** | `overview`, `hostels`, `rooms-beds`, `allocation`, `boarding-attendance`, `leave-exit`, `incidents`, `reports`, `reports/generate` |
| **Class Teacher** | `/admin-command/class-teacher/...` | None | **Missing** | `overview`, `my-class`, `learner-profiles`, `class-academics`, `attendance-follow-up`, `discipline-follow-up`, `welfare-notes`, `parent-contacts`, `report-comments`, `report-comments/submit-all`, `reports`, `reports/generate` |
| **Dean Academics** | `/admin-command/dean-academics/...` | None | **Missing** | `overview`, `teacher-workload`, `lesson-plans`, `lesson-logs`, `curriculum-coverage`, `assessments`, `academic-interventions`, `department-performance`, `reports` |
| **Exams Manager** | `/admin-command/exams-manager/...` | None | **Missing** | `overview`, `exam-setup`, `exam-timetable`, `marks-entry`, `moderation`, `publishing`, `report-cards`, `analysis`, `reports`, `reports/generate` |
| **Guidance / Counselling** | `/admin-command/guidance-counselling/...` | None | **Missing** | `overview`, `sessions`, `referrals`, `welfare-notes`, `follow-ups`, `parent-engagement`, `reports`, `reports/generate` |
| **Head of Department (HOD)** | `/admin-command/hod/...` | None | **Missing** | `overview`, `department-overview`, `review-queue`, `subject-allocation`, `department-teachers`, `lesson-plans`, `coverage-review`, `marks-moderation`, `resource-requests`, `reports` |
| **ICT Manager** | `/admin-command/ict-manager/...` | None | **Missing** | `overview`, `assets`, `asset-assignment`, `loans-returns`, `maintenance`, `facilities-issues`, `reports`, `reports/generate` |
| **Laboratory Technician** | `/admin-command/laboratory-technician/...` | None | **Missing** | `overview`, `lab-inventory`, `chemicals`, `apparatus-issue`, `lab-timetable`, `safety-incidents`, `reports`, `reports/generate` |
| **Librarian** | `/admin-command/librarian/...` | None | **Missing** | `overview`, `books`, `borrowers`, `issue-book`, `return-book`, `overdue-books`, `fines-lost-damaged`, `reports`, `reports/generate` |
| **Procurement Officer** | `/admin-command/procurement-officer/...` | None | **Missing** | `overview`, `suppliers`, `purchase-requests`, `quotations`, `purchase-orders`, `deliveries`, `reports`, `reports/generate` |
| **Secretary** | `/admin-command/secretary/...` | `admin-command.controller.ts` (dashboard only) | **Partially Missing** | `appointments`, `calls-log`, `reception-queue`, `parent-messages`, `letters-documents`, `student-clearance`, `visitors`, `visitors/check-in`, `reports`, `reports/generate` |
| **Security Officer** | `/admin-command/security-officer/...` | None | **Missing** | `overview`, `visitors`, `visitors/check-in`, `gate-register`, `student-exit-passes`, `student-exit-passes/flag-unauthorized`, `staff-movement`, `staff-movement/departure`, `incidents`, `reports`, `reports/generate` |
| **Teacher** | `/admin-command/teacher/...` | None | **Missing** | `profile`, `academic-setup`, `subject-allocations`, `syllabus-coverage`, `lesson-plans`, `resources`, `mark-entry`, `cbc-assessments`, `learner-progress`, `attendance`, `student-notes`, `clubs`, `invigilation`, `store-requests`, `resource-requests`, `messages`, `notifications`, `reports`, `utilities` |
| **Student** | `/admin-command/student/...` | None | **Missing** | `dashboard`, `downloads`, `messages`, `notifications` |
| **Parent** | `/admin-command/parent/...` | None | **Missing** | `dashboard`, `downloads`, `health`, `messages`, `notifications` |
| **Accountant** | `/admin-command/accountant/...` | None | **Missing** | `expenses` |

---

## 3. Recommended NestJS Controller Structure

To maintain clean architecture, enforce proper tenant isolation, and ensure secure role-based access, we recommend **Separate Role-Based Controllers** rather than a single monolithic controller.

### Design Principles:
1. **Encapsulation & Single Responsibility**: Group endpoints by role. Each controller should only handle queries and mutations relevant to that role's workspace.
2. **Class-Level Guards & Decorators**: Apply permissions and module checks at the controller level where possible.
3. **Common Request Context**: Use `RequestContextService` to extract the `tenant_id` (or `school_id`) and the authenticated `user_id` inside the service layers rather than parsing them manually from request parameters.

Below is the design and class signature for the missing controllers:

### 1. Storekeeper Command Controller
```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { StorekeeperCommandService } from './storekeeper-command.service';
import { IssueItemDto, ReceiveItemDto, GenerateReportDto } from './dto/storekeeper.dto';

@Controller('admin-command/storekeeper')
@RequiresModule('inventory')
@Permissions('storekeeper:read')
export class StorekeeperCommandController {
  constructor(private readonly service: StorekeeperCommandService) {}

  @Get('overview')
  getOverview() { return this.service.getOverview(); }

  @Get('items')
  getItems() { return this.service.getItems(); }

  @Post('items/issue')
  @Permissions('storekeeper:write')
  issueItem(@Body() dto: IssueItemDto) { return this.service.issueItem(dto); }

  @Post('items/receive')
  @Permissions('storekeeper:write')
  receiveItem(@Body() dto: ReceiveItemDto) { return this.service.receiveItem(dto); }

  @Get('low-stock')
  getLowStock() { return this.service.getLowStock(); }

  @Get('requests')
  getRequests() { return this.service.getRequests(); }

  @Get('stocktake')
  getStocktake() { return this.service.getStocktake(); }

  @Get('damaged-missing')
  getDamagedMissing() { return this.service.getDamagedMissing(); }

  @Get('reports')
  getReports() { return this.service.getReports(); }

  @Post('reports/generate')
  @Permissions('storekeeper:write')
  generateReport(@Body() dto: GenerateReportDto) { return this.service.generateReport(dto); }
}
```

### 2. Nurse Command Controller
```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { NurseCommandService } from './nurse-command.service';
import { LogVisitDto, GenerateReportDto } from './dto/nurse.dto';

@Controller('admin-command/nurse')
@RequiresModule('clinic')
@Permissions('nurse:read')
export class NurseCommandController {
  constructor(private readonly service: NurseCommandService) {}

  @Get('overview')
  getOverview() { return this.service.getOverview(); }

  @Get('visits')
  getVisits() { return this.service.getVisits(); }

  @Get('dispensing-log')
  getDispensingLog() { return this.service.getDispensingLog(); }

  @Get('medicine-inventory')
  getMedicineInventory() { return this.service.getMedicineInventory(); }

  @Get('sick-bay-queue')
  getSickBayQueue() { return this.service.getSickBayQueue(); }

  @Get('parent-notifications')
  getParentNotifications() { return this.service.getParentNotifications(); }

  @Get('health-reports')
  getHealthReports() { return this.service.getHealthReports(); }

  @Post('health-reports/generate')
  @Permissions('nurse:write')
  generateReport(@Body() dto: GenerateReportDto) { return this.service.generateReport(dto); }
}
```

### 3. Transport Manager Command Controller
```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { TransportCommandService } from './transport-command.service';
import { LogFuelDto, LogMaintenanceDto, GenerateReportDto } from './dto/transport.dto';

@Controller('admin-command/transport-manager')
@RequiresModule('transport')
@Permissions('transport:read')
export class TransportManagerCommandController {
  constructor(private readonly service: TransportCommandService) {}

  @Get('overview')
  getOverview() { return this.service.getOverview(); }

  @Get('vehicles')
  getVehicles() { return this.service.getVehicles(); }

  @Get('drivers')
  getDrivers() { return this.service.getDrivers(); }

  @Get('routes')
  getRoutes() { return this.service.getRoutes(); }

  @Get('trips')
  getTrips() { return this.service.getTrips(); }

  @Get('fuel-maintenance')
  getFuelMaintenance() { return this.service.getFuelMaintenance(); }

  @Post('fuel-maintenance/fuel')
  @Permissions('transport:write')
  logFuel(@Body() dto: LogFuelDto) { return this.service.logFuel(dto); }

  @Post('fuel-maintenance/maintenance')
  @Permissions('transport:write')
  logMaintenance(@Body() dto: LogMaintenanceDto) { return this.service.logMaintenance(dto); }

  @Get('student-transport-list')
  getStudentTransportList() { return this.service.getStudentTransportList(); }

  @Get('reports')
  getReports() { return this.service.getReports(); }

  @Post('reports/generate')
  @Permissions('transport:write')
  generateReport(@Body() dto: GenerateReportDto) { return this.service.generateReport(dto); }
}
```

### 4. Boarding Master Command Controller
```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { BoardingCommandService } from './boarding-command.service';
import { AssignBedDto, RollCallDto, GenerateReportDto } from './dto/boarding.dto';

@Controller('admin-command/boarding-master')
@RequiresModule('boarding')
@Permissions('boarding:read')
export class BoardingMasterCommandController {
  constructor(private readonly service: BoardingCommandService) {}

  @Get('overview')
  getOverview() { return this.service.getOverview(); }

  @Get('hostels')
  getHostels() { return this.service.getHostels(); }

  @Get('rooms-beds')
  getRoomsBeds() { return this.service.getRoomsBeds(); }

  @Get('allocation')
  getAllocation() { return this.service.getAllocation(); }

  @Post('allocation')
  @Permissions('boarding:write')
  createAllocation(@Body() dto: AssignBedDto) { return this.service.createAllocation(dto); }

  @Get('boarding-attendance')
  getBoardingAttendance() { return this.service.getBoardingAttendance(); }

  @Get('leave-exit')
  getLeaveExit() { return this.service.getLeaveExit(); }

  @Get('incidents')
  getIncidents() { return this.service.getIncidents(); }

  @Get('reports')
  getReports() { return this.service.getReports(); }

  @Post('reports/generate')
  @Permissions('boarding:write')
  generateReport(@Body() dto: GenerateReportDto) { return this.service.generateReport(dto); }
}
```

### 5. Class Teacher Command Controller
```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { ClassTeacherCommandService } from './class-teacher-command.service';
import { SubmitCommentsDto, GenerateReportDto } from './dto/class-teacher.dto';

@Controller('admin-command/class-teacher')
@RequiresModule('academics')
@Permissions('teacher:read')
export class ClassTeacherCommandController {
  constructor(private readonly service: ClassTeacherCommandService) {}

  @Get('overview')
  getOverview() { return this.service.getOverview(); }

  @Get('my-class')
  getMyClass() { return this.service.getMyClass(); }

  @Get('learner-profiles')
  getLearnerProfiles() { return this.service.getLearnerProfiles(); }

  @Get('class-academics')
  getClassAcademics() { return this.service.getClassAcademics(); }

  @Get('attendance-follow-up')
  getAttendanceFollowUp() { return this.service.getAttendanceFollowUp(); }

  @Get('discipline-follow-up')
  getDisciplineFollowUp() { return this.service.getDisciplineFollowUp(); }

  @Get('welfare-notes')
  getWelfareNotes() { return this.service.getWelfareNotes(); }

  @Get('parent-contacts')
  getParentContacts() { return this.service.getParentContacts(); }

  @Get('report-comments')
  getReportComments() { return this.service.getReportComments(); }

  @Post('report-comments/submit-all')
  @Permissions('teacher:write')
  submitAllComments(@Body() dto: SubmitCommentsDto) { return this.service.submitAllComments(dto); }

  @Get('reports')
  getReports() { return this.service.getReports(); }

  @Post('reports/generate')
  @Permissions('teacher:write')
  generateReport(@Body() dto: GenerateReportDto) { return this.service.generateReport(dto); }
}
```

### 6. Dean Academics Command Controller
```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { DeanCommandService } from './dean-command.service';

@Controller('admin-command/dean-academics')
@RequiresModule('academics')
@Permissions('academics:read')
export class DeanAcademicsCommandController {
  constructor(private readonly service: DeanCommandService) {}

  @Get('overview')
  getOverview() { return this.service.getOverview(); }

  @Get('teacher-workload')
  getTeacherWorkload() { return this.service.getTeacherWorkload(); }

  @Get('lesson-plans')
  getLessonPlans() { return this.service.getLessonPlans(); }

  @Get('lesson-logs')
  getLessonLogs() { return this.service.getLessonLogs(); }

  @Get('curriculum-coverage')
  getCurriculumCoverage() { return this.service.getCurriculumCoverage(); }

  @Get('assessments')
  getAssessments() { return this.service.getAssessments(); }

  @Get('academic-interventions')
  getAcademicInterventions() { return this.service.getAcademicInterventions(); }

  @Get('department-performance')
  getDepartmentPerformance() { return this.service.getDepartmentPerformance(); }

  @Get('reports')
  getReports() { return this.service.getReports(); }
}
```

### 7. Exams Manager Command Controller
```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { ExamsCommandService } from './exams-command.service';
import { GenerateReportDto } from './dto/exams.dto';

@Controller('admin-command/exams-manager')
@RequiresModule('exams')
@Permissions('exams:read')
export class ExamsManagerCommandController {
  constructor(private readonly service: ExamsCommandService) {}

  @Get('overview')
  getOverview() { return this.service.getOverview(); }

  @Get('exam-setup')
  getExamSetup() { return this.service.getExamSetup(); }

  @Get('exam-timetable')
  getExamTimetable() { return this.service.getExamTimetable(); }

  @Get('marks-entry')
  getMarksEntry() { return this.service.getMarksEntry(); }

  @Get('moderation')
  getModeration() { return this.service.getModeration(); }

  @Get('publishing')
  getPublishing() { return this.service.getPublishing(); }

  @Get('report-cards')
  getReportCards() { return this.service.getReportCards(); }

  @Get('analysis')
  getAnalysis() { return this.service.getAnalysis(); }

  @Get('reports')
  getReports() { return this.service.getReports(); }

  @Post('reports/generate')
  @Permissions('exams:write')
  generateReport(@Body() dto: GenerateReportDto) { return this.service.generateReport(dto); }
}
```

### 8. Guidance / Counselling Command Controller
```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { CounsellingCommandService } from './counselling-command.service';
import { GenerateReportDto } from './dto/counselling.dto';

@Controller('admin-command/guidance-counselling')
@RequiresModule('counselling')
@Permissions('counselling:read')
export class GuidanceCounsellingCommandController {
  constructor(private readonly service: CounsellingCommandService) {}

  @Get('overview')
  getOverview() { return this.service.getOverview(); }

  @Get('sessions')
  getSessions() { return this.service.getSessions(); }

  @Get('referrals')
  getReferrals() { return this.service.getReferrals(); }

  @Get('welfare-notes')
  getWelfareNotes() { return this.service.getWelfareNotes(); }

  @Get('follow-ups')
  getFollowUps() { return this.service.getFollowUps(); }

  @Get('parent-engagement')
  getParentEngagement() { return this.service.getParentEngagement(); }

  @Get('reports')
  getReports() { return this.service.getReports(); }

  @Post('reports/generate')
  @Permissions('counselling:write')
  generateReport(@Body() dto: GenerateReportDto) { return this.service.generateReport(dto); }
}
```

### 9. Head of Department (HOD) Command Controller
```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { HodCommandService } from './hod-command.service';

@Controller('admin-command/hod')
@RequiresModule('academics')
@Permissions('academics:read')
export class HODCommandController {
  constructor(private readonly service: HodCommandService) {}

  @Get('overview')
  getOverview() { return this.service.getOverview(); }

  @Get('department-overview')
  getDepartmentOverview() { return this.service.getDepartmentOverview(); }

  @Get('review-queue')
  getReviewQueue() { return this.service.getReviewQueue(); }

  @Get('subject-allocation')
  getSubjectAllocation() { return this.service.getSubjectAllocation(); }

  @Get('department-teachers')
  getDepartmentTeachers() { return this.service.getDepartmentTeachers(); }

  @Get('lesson-plans')
  getLessonPlans() { return this.service.getLessonPlans(); }

  @Get('coverage-review')
  getCoverageReview() { return this.service.getCoverageReview(); }

  @Get('marks-moderation')
  getMarksModeration() { return this.service.getMarksModeration(); }

  @Get('resource-requests')
  getResourceRequests() { return this.service.getResourceRequests(); }

  @Get('reports')
  getReports() { return this.service.getReports(); }
}
```

### 10. ICT Manager Command Controller
```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { IctCommandService } from './ict-command.service';
import { GenerateReportDto } from './dto/ict.dto';

@Controller('admin-command/ict-manager')
@RequiresModule('ict')
@Permissions('ict:read')
export class ICTManagerCommandController {
  constructor(private readonly service: IctCommandService) {}

  @Get('overview')
  getOverview() { return this.service.getOverview(); }

  @Get('assets')
  getAssets() { return this.service.getAssets(); }

  @Get('asset-assignment')
  getAssetAssignment() { return this.service.getAssetAssignment(); }

  @Get('loans-returns')
  getLoansReturns() { return this.service.getLoansReturns(); }

  @Get('maintenance')
  getMaintenance() { return this.service.getMaintenance(); }

  @Get('facilities-issues')
  getFacilitiesIssues() { return this.service.getFacilitiesIssues(); }

  @Get('reports')
  getReports() { return this.service.getReports(); }

  @Post('reports/generate')
  @Permissions('ict:write')
  generateReport(@Body() dto: GenerateReportDto) { return this.service.generateReport(dto); }
}
```

### 11. Laboratory Technician Command Controller
```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { LabCommandService } from './lab-command.service';
import { GenerateReportDto } from './dto/lab.dto';

@Controller('admin-command/laboratory-technician')
@RequiresModule('laboratory')
@Permissions('laboratory:read')
export class LaboratoryTechnicianCommandController {
  constructor(private readonly service: LabCommandService) {}

  @Get('overview')
  getOverview() { return this.service.getOverview(); }

  @Get('lab-inventory')
  getLabInventory() { return this.service.getLabInventory(); }

  @Get('chemicals')
  getChemicals() { return this.service.getChemicals(); }

  @Get('apparatus-issue')
  getApparatusIssue() { return this.service.getApparatusIssue(); }

  @Get('lab-timetable')
  getLabTimetable() { return this.service.getLabTimetable(); }

  @Get('safety-incidents')
  getSafetyIncidents() { return this.service.getSafetyIncidents(); }

  @Get('reports')
  getReports() { return this.service.getReports(); }

  @Post('reports/generate')
  @Permissions('laboratory:write')
  generateReport(@Body() dto: GenerateReportDto) { return this.service.generateReport(dto); }
}
```

### 12. Librarian Command Controller
```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { LibraryCommandService } from './library-command.service';
import { GenerateReportDto } from './dto/library.dto';

@Controller('admin-command/librarian')
@RequiresModule('library')
@Permissions('library:read')
export class LibrarianCommandController {
  constructor(private readonly service: LibraryCommandService) {}

  @Get('overview')
  getOverview() { return this.service.getOverview(); }

  @Get('books')
  getBooks() { return this.service.getBooks(); }

  @Get('borrowers')
  getBorrowers() { return this.service.getBorrowers(); }

  @Get('issue-book')
  getIssueBook() { return this.service.getIssueBook(); }

  @Get('return-book')
  getReturnBook() { return this.service.getReturnBook(); }

  @Get('overdue-books')
  getOverdueBooks() { return this.service.getOverdueBooks(); }

  @Get('fines-lost-damaged')
  getFinesLostDamaged() { return this.service.getFinesLostDamaged(); }

  @Get('reports')
  getReports() { return this.service.getReports(); }

  @Post('reports/generate')
  @Permissions('library:write')
  generateReport(@Body() dto: GenerateReportDto) { return this.service.generateReport(dto); }
}
```

### 13. Procurement Officer Command Controller
```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { ProcurementCommandService } from './procurement-command.service';
import { GenerateReportDto } from './dto/procurement.dto';

@Controller('admin-command/procurement-officer')
@RequiresModule('inventory')
@Permissions('procurement:read')
export class ProcurementOfficerCommandController {
  constructor(private readonly service: ProcurementCommandService) {}

  @Get('overview')
  getOverview() { return this.service.getOverview(); }

  @Get('suppliers')
  getSuppliers() { return this.service.getSuppliers(); }

  @Get('purchase-requests')
  getPurchaseRequests() { return this.service.getPurchaseRequests(); }

  @Get('quotations')
  getQuotations() { return this.service.getQuotations(); }

  @Get('purchase-orders')
  getPurchaseOrders() { return this.service.getPurchaseOrders(); }

  @Get('deliveries')
  getDeliveries() { return this.service.getDeliveries(); }

  @Get('reports')
  getReports() { return this.service.getReports(); }

  @Post('reports/generate')
  @Permissions('procurement:write')
  generateReport(@Body() dto: GenerateReportDto) { return this.service.generateReport(dto); }
}
```

### 14. Secretary Command Controller
```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { SecretaryCommandService } from './secretary-command.service';
import { CheckInVisitorDto, GenerateReportDto } from './dto/secretary.dto';

@Controller('admin-command/secretary')
@RequiresModule('frontoffice')
@Permissions('secretary:read')
export class SecretaryCommandController {
  constructor(private readonly service: SecretaryCommandService) {}

  @Get('overview')
  getOverview() { return this.service.getOverview(); }

  @Get('dashboard')
  getDashboard() { return this.service.getDashboard(); }

  @Get('visitors')
  getVisitors() { return this.service.getVisitors(); }

  @Post('visitors/check-in')
  @Permissions('secretary:write')
  checkInVisitor(@Body() dto: CheckInVisitorDto) { return this.service.checkInVisitor(dto); }

  @Get('appointments')
  getAppointments() { return this.service.getAppointments(); }

  @Get('calls-log')
  getCallsLog() { return this.service.getCallsLog(); }

  @Get('reception-queue')
  getReceptionQueue() { return this.service.getReceptionQueue(); }

  @Get('parent-messages')
  getParentMessages() { return this.service.getParentMessages(); }

  @Get('letters-documents')
  getLettersDocuments() { return this.service.getLettersDocuments(); }

  @Get('student-clearance')
  getStudentClearance() { return this.service.getStudentClearance(); }

  @Get('reports')
  getReports() { return this.service.getReports(); }

  @Post('reports/generate')
  @Permissions('secretary:write')
  generateReport(@Body() dto: GenerateReportDto) { return this.service.generateReport(dto); }
}
```

### 15. Security Officer Command Controller
```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { SecurityCommandService } from './security-command.service';
import { CheckInVisitorDto, FlagExitDto, StaffDepartureDto, GenerateReportDto } from './dto/security.dto';

@Controller('admin-command/security-officer')
@RequiresModule('frontoffice')
@Permissions('security:read')
export class SecurityOfficerCommandController {
  constructor(private readonly service: SecurityCommandService) {}

  @Get('overview')
  getOverview() { return this.service.getOverview(); }

  @Get('visitors')
  getVisitors() { return this.service.getVisitors(); }

  @Post('visitors/check-in')
  @Permissions('security:write')
  checkInVisitor(@Body() dto: CheckInVisitorDto) { return this.service.checkInVisitor(dto); }

  @Get('gate-register')
  getGateRegister() { return this.service.getGateRegister(); }

  @Get('student-exit-passes')
  getStudentExitPasses() { return this.service.getStudentExitPasses(); }

  @Post('student-exit-passes/flag-unauthorized')
  @Permissions('security:write')
  flagUnauthorizedExit(@Body() dto: FlagExitDto) { return this.service.flagUnauthorizedExit(dto); }

  @Get('staff-movement')
  getStaffMovement() { return this.service.getStaffMovement(); }

  @Post('staff-movement/departure')
  @Permissions('security:write')
  logStaffDeparture(@Body() dto: StaffDepartureDto) { return this.service.logStaffDeparture(dto); }

  @Get('incidents')
  getIncidents() { return this.service.getIncidents(); }

  @Get('reports')
  getReports() { return this.service.getReports(); }

  @Post('reports/generate')
  @Permissions('security:write')
  generateReport(@Body() dto: GenerateReportDto) { return this.service.generateReport(dto); }
}
```

### 16. Teacher Command Controller
```typescript
import { Controller, Get } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { TeacherCommandService } from './teacher-command.service';

@Controller('admin-command/teacher')
@RequiresModule('academics')
@Permissions('teacher:read')
export class TeacherCommandController {
  constructor(private readonly service: TeacherCommandService) {}

  @Get('profile')
  getProfile() { return this.service.getProfile(); }

  @Get('academic-setup')
  getAcademicSetup() { return this.service.getAcademicSetup(); }

  @Get('subject-allocations')
  getSubjectAllocations() { return this.service.getSubjectAllocations(); }

  @Get('syllabus-coverage')
  getSyllabusCoverage() { return this.service.getSyllabusCoverage(); }

  @Get('lesson-plans')
  getLessonPlans() { return this.service.getLessonPlans(); }

  @Get('resources')
  getResources() { return this.service.getResources(); }

  @Get('mark-entry')
  getMarkEntry() { return this.service.getMarkEntry(); }

  @Get('cbc-assessments')
  getCBCAssessments() { return this.service.getCBCAssessments(); }

  @Get('learner-progress')
  getLearnerProgress() { return this.service.getLearnerProgress(); }

  @Get('attendance')
  getAttendance() { return this.service.getAttendance(); }

  @Get('student-notes')
  getStudentNotes() { return this.service.getStudentNotes(); }

  @Get('clubs')
  getClubs() { return this.service.getClubs(); }

  @Get('invigilation')
  getInvigilation() { return this.service.getInvigilation(); }

  @Get('store-requests')
  getStoreRequests() { return this.service.getStoreRequests(); }

  @Get('resource-requests')
  getResourceRequests() { return this.service.getResourceRequests(); }

  @Get('messages')
  getMessages() { return this.service.getMessages(); }

  @Get('notifications')
  getNotifications() { return this.service.getNotifications(); }

  @Get('reports')
  getReports() { return this.service.getReports(); }

  @Get('utilities')
  getUtilities() { return this.service.getUtilities(); }
}
```

### 17. Student Command Controller
```typescript
import { Controller, Get } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { StudentCommandService } from './student-command.service';

@Controller('admin-command/student')
@Permissions('student:read')
export class StudentCommandController {
  constructor(private readonly service: StudentCommandService) {}

  @Get('dashboard')
  getDashboard() { return this.service.getDashboard(); }

  @Get('downloads')
  getDownloads() { return this.service.getDownloads(); }

  @Get('messages')
  getMessages() { return this.service.getMessages(); }

  @Get('notifications')
  getNotifications() { return this.service.getNotifications(); }
}
```

### 18. Parent Command Controller
```typescript
import { Controller, Get } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ParentCommandService } from './parent-command.service';

@Controller('admin-command/parent')
@Permissions('parent:read')
export class ParentCommandController {
  constructor(private readonly service: ParentCommandService) {}

  @Get('dashboard')
  getDashboard() { return this.service.getDashboard(); }

  @Get('downloads')
  getDownloads() { return this.service.getDownloads(); }

  @Get('health')
  getHealth() { return this.service.getHealth(); }

  @Get('messages')
  getMessages() { return this.service.getMessages(); }

  @Get('notifications')
  getNotifications() { return this.service.getNotifications(); }
}
```

### 19. Accountant Command Controller
```typescript
import { Controller, Get } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { AccountantCommandService } from './accountant-command.service';

@Controller('admin-command/accountant')
@RequiresModule('finance')
@Permissions('finance:read')
export class AccountantCommandController {
  constructor(private readonly service: AccountantCommandService) {}

  @Get('expenses')
  getExpenses() { return this.service.getExpenses(); }
}
```
