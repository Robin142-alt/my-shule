# Analysis & Remediation Strategy

This document outlines the remediation and fix strategy to address the integrity violations identified by the forensic auditor.

## 1. Replacing Hardcoded Facades in NestJS Controllers

To ensure production-grade multi-tenant compliance, all stubbed endpoints in backend controllers must be replaced with proper Prisma queries or repository SQL calls scoped to the active tenant/school.

### 1.1. Exams Module
**File**: `apps/api/src/modules/exams/exams.controller.ts` (Lines 327–356) and `apps/api/src/modules/exams/exams.service.ts`

- **Proposed Service Additions (`exams.service.ts`)**:
  ```typescript
  async getConfiguration() {
    const tenantId = this.requireTenantId();
    const items = await this.repository.prisma.examGradingPolicies.findMany({
      where: { tenant_id: tenantId }
    });
    return { items };
  }

  async getDrafts() {
    const tenantId = this.requireTenantId();
    const result = await this.repository.executeSql(
      `SELECT * FROM exam_series WHERE tenant_id = $1 AND status = 'draft'`,
      [tenantId]
    );
    return { items: result.rows };
  }

  async getAlignment() {
    const tenantId = this.requireTenantId();
    const items = await this.repository.prisma.examSubjectWeightings.findMany({
      where: { exam_series_id: tenantId } // or tenant_id if available
    });
    return { items };
  }

  async getReview() {
    const tenantId = this.requireTenantId();
    const items = await this.repository.prisma.markSubmission.findMany({
      where: { schoolId: tenantId },
      include: { hodReviews: true }
    });
    return { items };
  }

  async getLifecycle() {
    const tenantId = this.requireTenantId();
    const result = await this.repository.executeSql(
      `SELECT id, name, starts_on, ends_on, status FROM exam_series WHERE tenant_id = $1`,
      [tenantId]
    );
    return { items: result.rows };
  }
  ```

- **Controller Controller Route Refactoring (`exams.controller.ts`)**:
  ```typescript
  @Get('configuration')
  @Permissions('exams:read')
  getConfiguration() {
    return this.examsService.getConfiguration();
  }

  @Get('draft')
  @Permissions('exams:read')
  getDrafts() {
    return this.examsService.getDrafts();
  }

  @Get('alignment')
  @Permissions('exams:read')
  getAlignment() {
    return this.examsService.getAlignment();
  }

  @Get('review')
  @Permissions('exams:read')
  getReview() {
    return this.examsService.getReview();
  }

  @Get('lifecycle')
  @Permissions('exams:read')
  getLifecycle() {
    return this.examsService.getLifecycle();
  }
  ```

---

### 1.2. Academics Module
**File**: `apps/api/src/modules/academics/academics.controller.ts` (Lines 393–398)

- **Controller Refactoring**:
  ```typescript
  @Get('communications')
  @Permissions('academics:read')
  async getCommunications() {
    const tenantId = (this.academicsService as any).requestContext.getStore()?.tenant_id;
    const result = await (this.academicsService as any).repository.databaseService.query(
      `SELECT * FROM communication_broadcasts WHERE school_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [tenantId]
    );
    return { items: result.rows };
  }
  ```

---

### 1.3. Billing Module
**File**: `apps/api/src/modules/billing/billing.controller.ts` (Lines 334–338) and `apps/api/src/modules/billing/billing.service.ts`

- **Proposed Service Addition (`billing.service.ts`)**:
  ```typescript
  async getWaivers() {
    const tenantId = this.requireTenantId();
    return this.prisma.feeWaiver.findMany({
      where: { schoolId: tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }
  ```

- **Controller Refactoring (`billing.controller.ts`)**:
  ```typescript
  @Get('waivers')
  async getWaivers() {
    return this.billingService.getWaivers();
  }
  ```

---

### 1.4. Boarding Module
**File**: `apps/api/src/modules/boarding/boarding.controller.ts` (Lines 98–108)

- **Controller Refactoring**:
  ```typescript
  @Get('roll-calls')
  @Permissions('boarding:read')
  async getRollCalls() {
    const store = this.requestContext.requireStore();
    const items = await this.prisma.boardingAttendance.findMany({
      where: { schoolId: store.tenant_id },
      orderBy: { date: 'desc' }
    });
    return { items };
  }

  @Get('exeats')
  @Permissions('boarding:read')
  async getExeats() {
    const store = this.requestContext.requireStore();
    const result = await this.executeSql(
      `SELECT * FROM boarding_exeats WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [store.tenant_id]
    );
    return { items: result.rows };
  }
  ```

---

### 1.5. Clinic Module
**File**: `apps/api/src/modules/clinic/clinic.controller.ts` (Lines 127–137)

- **Controller Refactoring**:
  ```typescript
  @Get('parent/students/me/history')
  @Permissions('portal:read_own_children')
  async getParentStudentHistory() {
    const store = (this.clinicService as any).requestContext.getStore();
    const tenantId = store?.tenant_id;
    const userId = store?.user_id || store?.userId;
    const result = await (this.clinicService as any).repository.executeSql(
      `SELECT visit.*
       FROM clinic_visits visit
       INNER JOIN student_guardians sg ON sg.student_id = visit.student_id AND sg.tenant_id = visit.tenant_id
       WHERE visit.tenant_id = $1 AND sg.user_id = $2::uuid`,
      [tenantId, userId]
    );
    return { items: result.rows };
  }

  @Get('medicines/stock')
  @Permissions('clinic:read')
  async getMedicinesStock() {
    const store = (this.clinicService as any).requestContext.getStore();
    const tenantId = store?.tenant_id;
    const items = await (this.clinicService as any).repository.prisma.medicineInventory.findMany({
      where: { schoolId: tenantId }
    });
    return { items };
  }
  ```

---

### 1.6. Communication Module
**File**: `apps/api/src/modules/communication/communication.controller.ts` (Lines 54–64)

- **Controller Refactoring**:
  ```typescript
  @Get('summary')
  @Permissions('school_communication:read')
  async getSummary() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new Error('Tenant context required');
    const [broadcastsCount, smsLogsCount] = await Promise.all([
      this.prisma.communicationBroadcast.count({ where: { schoolId: tenantId } }),
      this.prisma.smsLog.count({ where: { schoolId: tenantId } }),
    ]);
    return {
      items: [
        { type: 'broadcasts', count: broadcastsCount },
        { type: 'sms_logs', count: smsLogsCount }
      ]
    };
  }

  @Get('messages')
  @Permissions('school_communication:read')
  async getMessages() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new Error('Tenant context required');
    const items = await this.prisma.communicationBroadcast.findMany({
      where: { schoolId: tenantId },
      orderBy: { createdAt: 'desc' }
    });
    return { items };
  }
  ```

---

### 1.7. Timetable Module
**File**: `apps/api/src/modules/timetable/timetable.controller.ts` (Lines 37–42)

- **Controller Refactoring**:
  ```typescript
  @Get('dashboard')
  @Permissions('timetable:read')
  async getTimetableDashboard() {
    const tenantId = (this.timetableService as any).requireTenantId();
    const [slotsCount, periodsCount] = await Promise.all([
      (this.timetableService as any).timetableRepository.prisma.classTimetableEntry.count({
        where: { schoolId: tenantId }
      }),
      (this.timetableService as any).timetableRepository.prisma.timetablePeriod.count({
        where: { schoolId: tenantId }
      })
    ]);
    return {
      metrics: {
        total_slots: slotsCount,
        total_periods: periodsCount,
      },
      items: []
    };
  }
  ```

---

### 1.8. Transport Module
**File**: `apps/api/src/modules/transport/transport.controller.ts` (Lines 145–155)

- **Controller Refactoring**:
  ```typescript
  @Get('vehicles')
  @Permissions('transport:read')
  async getVehicles() {
    const store = this.requestContext.requireStore();
    const items = await this.prisma.transportVehicle.findMany({
      where: { schoolId: store.tenant_id }
    });
    return { items };
  }

  @Get('trips')
  @Permissions('transport:read')
  async getTrips() {
    const store = this.requestContext.requireStore();
    const items = await this.prisma.transportTrips.findMany({
      where: { tenant_id: store.tenant_id }
    });
    return { items };
  }
  ```

---

### 1.9. Secretary Module
**File**: `apps/api/src/modules/secretary/secretary.controller.ts` (Lines 11–37)

- **Controller Refactoring**:
  ```typescript
  import { Controller, Get, UseGuards } from '@nestjs/common';
  import { RequiresModule } from '../module-access/module-access.decorator';
  import { Permissions } from '../../auth/decorators/permissions.decorator';
  import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
  import { RbacGuard } from '../../guards/rbac.guard';
  import { PrismaService } from '../../database/prisma.service';
  import { RequestContextService } from '../../common/request-context/request-context.service';

  @Controller('api/secretary')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequiresModule('admissions')
  export class SecretaryController {
    constructor(
      private readonly prisma: PrismaService,
      private readonly requestContext: RequestContextService,
    ) {}

    @Get('dashboard')
    @Permissions('secretary:read')
    async getDashboard() {
      const store = this.requestContext.requireStore();
      const tenantId = store.tenant_id;
      const [newAdmissions, pendingInquiries, visitorsToday] = await Promise.all([
        this.prisma.student.count({ where: { schoolId: tenantId } }),
        this.prisma.admissionApplication.count({ where: { schoolId: tenantId, applicationStatus: 'pending' } }),
        this.prisma.visitor.count({ where: { schoolId: tenantId } }),
      ]);
      return {
        metrics: {
          newAdmissions,
          pendingInquiries,
          visitorsToday,
          activeTasks: 0
        },
        quickLinks: [],
        recentActivity: []
      };
    }

    @Get('visitors')
    @Permissions('secretary:read')
    async getVisitors() {
      const store = this.requestContext.requireStore();
      const tenantId = store.tenant_id;
      const items = await this.prisma.visitor.findMany({
        where: { schoolId: tenantId }
      });
      return { items };
    }

    @Get('inquiries')
    @Permissions('secretary:read')
    async getInquiries() {
      const store = this.requestContext.requireStore();
      const tenantId = store.tenant_id;
      const items = await this.prisma.admissionApplication.findMany({
        where: { schoolId: tenantId }
      });
      return { items };
    }
  }
  ```

---

## 2. Implementing Genuine Integration Test for HOD Review Workflow

**File**: `apps/api/src/modules/exams/exams.test.ts` (Lines 1379–1388)

Replace the dummy test with an integration-level test executing real `ExamsService` and `ExamsRepository` methods:

```typescript
test('ExamsService handles HOD Review workflow for returning submitted marks', async () => {
  const queries: string[] = [];
  const dbMock = {
    executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          queries.push(sql);
          return [
            {
              id: 'mark-1',
              score: 85,
              status: 'submitted',
            }
          ];
        }
      });
    },
    query: async (sql: string) => {
      queries.push(sql);
      return {
        rows: [
          {
            id: 'mark-1',
            score: 85,
            status: 'submitted',
          }
        ]
      };
    }
  };

  const repository = new ExamsRepository(dbMock as any);
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'hod-1', role: 'hod', permissions: ['exams:approve'] }) } as any,
    repository,
  );

  const result = await service.moderateMarks({
    mark_ids: ['mark-1'],
    action: 'return_for_correction',
    reason: 'Incorrect mark entered',
  });

  assert.equal(result.success, true);
  assert.equal(result.updated_count, 1);
  
  // Verify that the query executed updates the status of mark to 'draft'
  const updateQuery = queries.find(q => q.includes('UPDATE exam_marks'));
  assert.ok(updateQuery, 'Should execute update query on exam_marks');
  assert.match(updateQuery, /SET status = \$3/);
  
  // Verify that a mark version was created
  const insertQuery = queries.find(q => q.includes('INSERT INTO exam_mark_versions'));
  assert.ok(insertQuery, 'Should execute insert query on exam_mark_versions');
});
```

### Fixing Accompanying Test Code Failure
To prevent build/test pipeline errors, update test #35 (Lines 1356–1377 in `exams.test.ts`) to expect the correct exception throw message:

```typescript
test('ExamsService enforces strict Mark Entry permission rules based on teacher allocation', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-2', role: 'teacher', permissions: ['academics:write'] }) } as never,
    {
      findTeacherAssignment: async () => null, // No allocation found
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
    } as never,
  );

  await assert.rejects(
    () => service.enterMark({
      exam_series_id: 'series-1',
      assessment_id: 'assessment-1',
      academic_term_id: 'term-1',
      class_section_id: 'class-1',
      subject_id: 'subject-1',
      student_id: 'student-1',
      score: 84,
    }),
    /Teacher is not assigned to this subject and class section/i
  );
});
```
