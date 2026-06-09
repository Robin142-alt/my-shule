const fs = require('fs');

// INVENTORY
let invService = fs.readFileSync('apps/api/src/modules/inventory/inventory.service.ts', 'utf8');
if (!invService.includes('SchoolOperationalEventsService')) {
  invService = invService.replace(
    "import { Injectable",
    "import { SchoolOperationalEventsService } from '../events/school-operational-events.service';\nimport { Injectable"
  );
  invService = invService.replace(
    "private readonly inventoryRepository: InventoryRepository,",
    "private readonly inventoryRepository: InventoryRepository,\n    private readonly schoolEvents: SchoolOperationalEventsService,"
  );
}
if (!invService.includes('async createRequisition(')) {
  invService = invService.replace(
    "async createRequest(dto: CreateInventoryRequestDto) {",
    `async createRequisition(dto: CreateInventoryRequestDto) {
    const tenantId = this.requireTenantId();
    const result = await this.databaseService.query(
      \`
        INSERT INTO inventory_requisitions (
          tenant_id,
          requisition_number,
          department,
          requested_by,
          status,
          needed_by,
          priority,
          lines,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8::jsonb, $9)
        RETURNING id, requisition_number, status
      \`,
      [
        tenantId,
        this.buildNumber('REQ'),
        dto.department.trim(),
        dto.requested_by.trim(),
        'pending',
        dto.needed_by ?? null,
        dto.priority?.trim() || 'normal',
        JSON.stringify(dto.lines.map((line) => ({ ...line }))),
        dto.notes?.trim() || null,
      ]
    );

    const requisition = result.rows[0];

    await this.schoolEvents.recordSchoolOperation({
      event: {
        id: requisition.id,
        type: 'inventory.requisition_created',
        module: 'inventory',
        actorRole: this.requestContext.requireStore().role || 'staff',
        title: 'Inventory Requisition Created',
        body: \`Requisition \${requisition.requisition_number} created for \${dto.department}\`,
        entityId: requisition.id,
        severity: 'info',
        payload: { requisition_number: requisition.requisition_number },
      },
    });

    return requisition;
  }

  async createRequest(dto: CreateInventoryRequestDto) {`
  );
  fs.writeFileSync('apps/api/src/modules/inventory/inventory.service.ts', invService);
}

let invController = fs.readFileSync('apps/api/src/modules/inventory/inventory.controller.ts', 'utf8');
if (invController.includes("return this.inventoryService.createRequest(dto);")) {
  invController = invController.replace(
    "return this.inventoryService.createRequest(dto);",
    "return this.inventoryService.createRequisition(dto);"
  );
  fs.writeFileSync('apps/api/src/modules/inventory/inventory.controller.ts', invController);
}

let invModule = fs.readFileSync('apps/api/src/modules/inventory/inventory.module.ts', 'utf8');
if (!invModule.includes('EventsModule')) {
  invModule = invModule.replace(
    "import { Module } from '@nestjs/common';",
    "import { Module } from '@nestjs/common';\nimport { EventsModule } from '../events/events.module';"
  );
  invModule = invModule.replace(
    "controllers: [InventoryController],",
    "imports: [EventsModule],\n  controllers: [InventoryController],"
  );
  fs.writeFileSync('apps/api/src/modules/inventory/inventory.module.ts', invModule);
}

// CLINIC
let clinicService = fs.readFileSync('apps/api/src/modules/clinic/clinic.service.ts', 'utf8');
if (!clinicService.includes('SchoolOperationalEventsService')) {
  clinicService = clinicService.replace(
    "import { RequestContextService }",
    "import { SchoolOperationalEventsService } from '../events/school-operational-events.service';\nimport { RequestContextService }"
  );
  clinicService = clinicService.replace(
    "private readonly repository: ClinicRepository,",
    "private readonly repository: ClinicRepository,\n      private readonly schoolEvents: SchoolOperationalEventsService,"
  );
  clinicService = clinicService.replace(
    "return visit;\n  }\n\n  async dispenseMedicine",
    `await this.schoolEvents.recordSchoolOperation({
      event: {
        id: visit?.id,
        type: 'clinic.visit_recorded',
        module: 'clinic',
        actorRole: this.requestContext.requireStore().role || 'staff',
        title: 'Clinic Visit Recorded',
        body: \`Clinic visit recorded for student \${dto.student_id}\`,
        entityId: visit?.id,
        severity: 'info',
        payload: { student_id: dto.student_id },
      },
    });

    return visit;
  }

  async dispenseMedicine`
  );
  fs.writeFileSync('apps/api/src/modules/clinic/clinic.service.ts', clinicService);
}

let clinicModule = fs.readFileSync('apps/api/src/modules/clinic/clinic.module.ts', 'utf8');
if (!clinicModule.includes('EventsModule')) {
  clinicModule = clinicModule.replace(
    "import { Module } from '@nestjs/common';",
    "import { Module } from '@nestjs/common';\nimport { EventsModule } from '../events/events.module';"
  );
  clinicModule = clinicModule.replace(
    "controllers: [ClinicController],",
    "imports: [EventsModule],\n  controllers: [ClinicController],"
  );
  fs.writeFileSync('apps/api/src/modules/clinic/clinic.module.ts', clinicModule);
}

// LIBRARY
let libService = fs.readFileSync('apps/api/src/modules/library/library.service.ts', 'utf8');
if (!libService.includes('DatabaseService')) {
  libService = libService.replace(
    "import { RequestContextService }",
    "import { DatabaseService } from '../../database/database.service';\nimport { RequestContextService }"
  );
  libService = libService.replace(
    "private readonly libraryRepository: LibraryRepository,",
    "private readonly libraryRepository: LibraryRepository,\n      private readonly db: DatabaseService,"
  );
}

if (!libService.includes('SchoolOperationalEventsService')) {
  libService = libService.replace(
    "import { Injectable",
    "import { SchoolOperationalEventsService } from '../events/school-operational-events.service';\nimport { Injectable"
  );
  libService = libService.replace(
    "private readonly db: DatabaseService,",
    "private readonly db: DatabaseService,\n      private readonly schoolEvents: SchoolOperationalEventsService,"
  );
}

if (!libService.includes('async createLoan(')) {
  libService = libService.replace(
    "async issueCopy(dto: IssueLibraryCopyDto) {",
    `async createLoan(dto: any) {
    const tenantId = this.requireTenantId();
    const result = await this.db.query(
      \`
        INSERT INTO library_loans (
          tenant_id,
          book_id,
          borrower_id,
          status,
          due_date
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, status
      \`,
      [
        tenantId,
        dto.book_id || 'unknown',
        dto.borrower_id || 'unknown',
        'active',
        dto.due_date || new Date().toISOString(),
      ]
    );

    const loan = result.rows[0];

    await this.schoolEvents.recordSchoolOperation({
      event: {
        id: loan.id,
        type: 'library.loan_created',
        module: 'library',
        actorRole: this.requestContext.requireStore().role || 'staff',
        title: 'Library Loan Created',
        body: \`A new library loan was created for borrower \${dto.borrower_id}\`,
        entityId: loan.id,
        severity: 'info',
        payload: { book_id: dto.book_id },
      },
    });

    return loan;
  }

  async issueCopy(dto: IssueLibraryCopyDto) {`
  );
  fs.writeFileSync('apps/api/src/modules/library/library.service.ts', libService);
}

let libController = fs.readFileSync('apps/api/src/modules/library/library.controller.ts', 'utf8');
if (!libController.includes("@Post('loans')")) {
  libController = libController.replace(
    "export class LibraryController {",
    "export class LibraryController {\n  @Post('loans')\n  @Permissions('library:write')\n  createLoan(@Body() dto: any) {\n    return this.libraryService.createLoan(dto);\n  }"
  );
  fs.writeFileSync('apps/api/src/modules/library/library.controller.ts', libController);
}

let libModule = fs.readFileSync('apps/api/src/modules/library/library.module.ts', 'utf8');
if (!libModule.includes('EventsModule')) {
  libModule = libModule.replace(
    "import { Module } from '@nestjs/common';",
    "import { Module } from '@nestjs/common';\nimport { EventsModule } from '../events/events.module';"
  );
  libModule = libModule.replace(
    "controllers: [LibraryController],",
    "imports: [EventsModule],\n  controllers: [LibraryController],"
  );
  fs.writeFileSync('apps/api/src/modules/library/library.module.ts', libModule);
}

// SECURITY
let securityService = fs.readFileSync('apps/api/src/modules/security/security-operations.service.ts', 'utf8');
if (!securityService.includes('SchoolOperationalEventsService')) {
  securityService = securityService.replace(
    "import { Injectable, InternalServerErrorException } from '@nestjs/common';",
    "import { Injectable, InternalServerErrorException } from '@nestjs/common';\nimport { SchoolOperationalEventsService } from '../events/school-operational-events.service';"
  );
  securityService = securityService.replace(
    "private readonly visitorsService: VisitorsService,",
    "private readonly visitorsService: VisitorsService,\n    private readonly schoolEvents: SchoolOperationalEventsService,"
  );
  
  securityService = securityService.replace(
    "return this.visitorsService.createRecord(dto);",
    `const record = await this.visitorsService.createRecord(dto as any);
    await this.schoolEvents.recordSchoolOperation({
      event: {
        id: record.id,
        type: 'security.visitor_created',
        module: 'security',
        actorRole: this.requestContext.getStore()?.role || 'staff',
        title: 'Visitor Record Created',
        body: \`A visitor record was created for \${dto.name}\`,
        entityId: record.id,
        severity: 'info',
        payload: { visitor_name: dto.name },
      },
    });
    return record;`
  );
  fs.writeFileSync('apps/api/src/modules/security/security-operations.service.ts', securityService);
}

let secModule = fs.readFileSync('apps/api/src/modules/security/security.module.ts', 'utf8');
if (!secModule.includes('EventsModule')) {
  secModule = secModule.replace(
    "import { Global, Module } from '@nestjs/common';",
    "import { Global, Module } from '@nestjs/common';\nimport { EventsModule } from '../events/events.module';"
  );
  secModule = secModule.replace(
    "imports: [RedisModule, ObservabilityModule, VisitorsModule],",
    "imports: [RedisModule, ObservabilityModule, VisitorsModule, EventsModule],"
  );
  fs.writeFileSync('apps/api/src/modules/security/security.module.ts', secModule);
}
