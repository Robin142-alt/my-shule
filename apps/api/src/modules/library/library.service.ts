import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { BadRequestException, Injectable, Optional, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import type {
  IssueLibraryCopyDto,
  IssueLibraryByScanDto,
  ReserveLibraryCopyDto,
  ReturnLibraryByScanDto,
  ReturnLibraryCopyDto,
} from './dto/library.dto';
import { LibraryRepository } from './repositories/library.repository';

interface LibraryBillingHandoff {
  createLibraryFineCharge?: (input: {
    tenantId: string;
    borrowerId: string;
    fineId: string;
    amountMinor: number;
    reason: string;
  }) => Promise<unknown>;
}

@Injectable()
export class LibraryService {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  constructor(private readonly prisma: PrismaService, private readonly requestContext: RequestContextService,
    private readonly libraryRepository: LibraryRepository,
      private readonly db: PrismaService,
      @Optional() private readonly schoolEvents?: SchoolOperationalEventsService,
    @Optional() private readonly billingService?: LibraryBillingHandoff,
  ) {}

  async createLoan(dto: any) {
    const tenantId = this.requireTenantId();
    const result = await this.db.query(
      `
        INSERT INTO library_loans (
          tenant_id,
          book_id,
          borrower_id,
          status,
          due_date
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, status
      `,
      [
        tenantId,
        dto.book_id || 'unknown',
        dto.borrower_id || 'unknown',
        'active',
        dto.due_date || new Date().toISOString(),
      ]
    );

    const loan = result.rows[0];

    await this.schoolEvents?.recordSchoolOperation({
      event: {
        id: loan.id,
        type: 'library.loan_created',
        module: 'library',
        actorRole: this.requestContext.requireStore().role || 'staff',
        title: 'Library Loan Created',
        body: `A new library loan was created for borrower ${dto.borrower_id}`,
        entityId: loan.id,
        severity: 'info',
        payload: { book_id: dto.book_id },
      },
    });

    return loan;
  }

  async issueCopy(dto: IssueLibraryCopyDto) {
    const tenantId = this.requireTenantId();
    const copy = await this.libraryRepository.findCopyForUpdate(tenantId, dto.copy_id);

    if (!copy || copy.status !== 'available') {
      throw new BadRequestException('Library copy is not available for issue');
    }

    const issued = await this.libraryRepository.issueCopy({
      ...dto,
      tenant_id: tenantId,
      issued_by_user_id: this.getActorUserId(),
    });

    await this.libraryRepository.appendLedger({
      tenant_id: tenantId,
      copy_id: dto.copy_id,
      borrower_id: dto.borrower_id,
      action: 'issue',
      metadata: { due_on: dto.due_on },
    });

    return issued;
  }

  async issueByScan(dto: IssueLibraryByScanDto) {
    const tenantId = this.requireTenantId();
    const borrower = await this.libraryRepository.findBorrowerByScanCode(
      tenantId,
      dto.borrower_scan_code.trim(),
    );

    if (!borrower) {
      throw new BadRequestException('Library borrower was not found for the scanned ID');
    }

    const copy = await this.libraryRepository.findCopyByScanCodeForUpdate(
      tenantId,
      dto.book_scan_code.trim(),
    );

    if (!copy || copy.status !== 'available') {
      throw new BadRequestException('Scanned library copy is not available for issue');
    }

    const issued = await this.libraryRepository.issueCopy({
      copy_id: copy.id,
      borrower_id: borrower.id,
      due_on: dto.due_on,
      tenant_id: tenantId,
      issued_by_user_id: this.getActorUserId(),
    });

    await this.libraryRepository.appendLedger({
      tenant_id: tenantId,
      copy_id: copy.id,
      borrower_id: borrower.id,
      action: 'issue',
      metadata: {
        due_on: dto.due_on,
        source: 'scanner',
        borrower_scan_code: dto.borrower_scan_code.trim(),
        book_scan_code: dto.book_scan_code.trim(),
      },
    });

    return issued;
  }

  async reserveCopy(dto: ReserveLibraryCopyDto) {
    const tenantId = this.requireTenantId();
    const reservation = await this.libraryRepository.createReservation({
      ...dto,
      tenant_id: tenantId,
    });

    await this.libraryRepository.appendLedger({
      tenant_id: tenantId,
      borrower_id: dto.borrower_id,
      action: 'reserve',
      metadata: {
        catalog_item_id: dto.catalog_item_id,
        queue_position: reservation.queue_position,
      },
    });

    return reservation;
  }

  async returnCopy(dto: ReturnLibraryCopyDto) {
    const tenantId = this.requireTenantId();
    const loan = await this.libraryRepository.findLoanForReturn(tenantId, dto.loan_id);

    if (!loan) {
      throw new BadRequestException('Library loan was not found');
    }

    const returned = await this.libraryRepository.returnCopy({
      ...dto,
      tenant_id: tenantId,
      copy_id: loan.copy_id,
    });
    const fineAmount = this.calculateFineMinor(loan.due_on, dto.returned_on, dto.daily_fine_minor ?? 0);

    if (fineAmount > 0) {
      const fine = await this.libraryRepository.createFine({
        tenant_id: tenantId,
        borrower_id: loan.borrower_id,
        copy_id: loan.copy_id,
        reason: 'overdue',
        amount_minor: fineAmount,
      });

      await this.billingService?.createLibraryFineCharge?.({
        tenantId,
        borrowerId: loan.borrower_id,
        fineId: fine.id,
        amountMinor: fineAmount,
        reason: 'overdue',
      });

      await this.schoolEvents?.recordSchoolOperation({
        event: {
          id: fine.id,
          type: 'library.overdue_fine_created',
          module: 'library',
          actorRole: this.requestContext.requireStore().role || 'staff',
          title: 'Library Overdue Fine',
          body: `Overdue fine of ${fineAmount} charged to ${loan.borrower_id}`,
          entityId: loan.borrower_id,
          severity: 'warning',
          payload: { fineAmount, borrowerId: loan.borrower_id },
        },
        notifications: [
          {
            id: `lib-overdue-${fine.id}`,
            schoolId: tenantId,
            title: 'Overdue Book Returned',
            body: `An overdue book was returned with a fine of ${fineAmount}`,
            audienceRoles: ['parent', 'student'],
            priority: 'normal',
            sourceModule: 'library',
            relatedModule: 'finance',
            relatedRecordId: fine.id,
            read: false,
            createdAt: new Date().toISOString(),
          }
        ]
      });
    }

    await this.libraryRepository.appendLedger({
      tenant_id: tenantId,
      copy_id: loan.copy_id,
      borrower_id: loan.borrower_id,
      action: 'return',
      metadata: {
        returned_on: dto.returned_on,
        overdue_fine_minor: fineAmount,
      },
    });

    return returned;
  }

  async returnByScan(dto: ReturnLibraryByScanDto) {
    const tenantId = this.requireTenantId();
    const copy = await this.libraryRepository.findCopyByScanCodeForUpdate(
      tenantId,
      dto.book_scan_code.trim(),
    );

    if (!copy) {
      throw new BadRequestException('Library copy was not found for the scanned code');
    }

    const loan = await this.libraryRepository.findActiveLoanByCopyId(tenantId, copy.id);

    if (!loan) {
      throw new BadRequestException('Scanned library copy does not have an active loan');
    }

    const returned = await this.libraryRepository.returnCopy({
      loan_id: loan.id,
      returned_on: dto.returned_on,
      daily_fine_minor: dto.daily_fine_minor,
      tenant_id: tenantId,
      copy_id: loan.copy_id,
    });
    const fineAmount = this.calculateFineMinor(loan.due_on, dto.returned_on, dto.daily_fine_minor ?? 0);

    if (fineAmount > 0) {
      const fine = await this.libraryRepository.createFine({
        tenant_id: tenantId,
        borrower_id: loan.borrower_id,
        copy_id: loan.copy_id,
        reason: 'overdue',
        amount_minor: fineAmount,
      });

      await this.billingService?.createLibraryFineCharge?.({
        tenantId,
        borrowerId: loan.borrower_id,
        fineId: fine.id,
        amountMinor: fineAmount,
        reason: 'overdue',
      });

      await this.schoolEvents?.recordSchoolOperation({
        event: {
          id: fine.id,
          type: 'library.overdue_fine_created',
          module: 'library',
          actorRole: this.requestContext.requireStore().role || 'staff',
          title: 'Library Overdue Fine',
          body: `Overdue fine of ${fineAmount} charged to ${loan.borrower_id}`,
          entityId: loan.borrower_id,
          severity: 'warning',
          payload: { fineAmount, borrowerId: loan.borrower_id },
        },
        notifications: [
          {
            id: `lib-overdue-${fine.id}`,
            schoolId: tenantId,
            title: 'Overdue Book Returned',
            body: `An overdue book was returned with a fine of ${fineAmount}`,
            audienceRoles: ['parent', 'student'],
            priority: 'normal',
            sourceModule: 'library',
            relatedModule: 'finance',
            relatedRecordId: fine.id,
            read: false,
            createdAt: new Date().toISOString(),
          }
        ]
      });
    }

    await this.libraryRepository.appendLedger({
      tenant_id: tenantId,
      copy_id: loan.copy_id,
      borrower_id: loan.borrower_id,
      action: 'return',
      metadata: {
        returned_on: dto.returned_on,
        overdue_fine_minor: fineAmount,
        source: 'scanner',
        book_scan_code: dto.book_scan_code.trim(),
      },
    });

    return returned;
  }

  listCirculation(query: Record<string, string | undefined> = {}) {
    const input: {
      tenant_id: string;
      borrower_id?: string;
      copy_id?: string;
      action?: string;
      limit?: number;
      offset?: number;
    } = {
      tenant_id: this.requireTenantId(),
    };
    const borrowerId = this.optionalText(query.borrower_id);
    const copyId = this.optionalText(query.copy_id);
    const action = this.optionalText(query.action);
    const limit = this.optionalPositiveInteger(query.limit);
    const offset = this.optionalNonNegativeInteger(query.offset);

    if (borrowerId) input.borrower_id = borrowerId;
    if (copyId) input.copy_id = copyId;
    if (action) input.action = action;
    if (limit !== undefined) input.limit = limit;
    if (offset !== undefined) input.offset = offset;

    return this.libraryRepository.listCirculation(input);
  }

  async getSummary() {
    const tenantId = this.requireTenantId();
    return this.libraryRepository.buildSummary(tenantId);
  }

  async listCatalogItems() {
    const tenantId = this.requireTenantId();
    const db = (this.libraryRepository as any).databaseService;
    const res = await db.query(
      `SELECT c.id, c.title, c.author, c.isbn, c.category_id as subject, 
              COUNT(cp.id)::int as total,
              SUM(CASE WHEN cp.status = 'available' THEN 1 ELSE 0 END)::int as available
       FROM library_catalog_items c
       LEFT JOIN library_copies cp ON c.id = cp.catalog_item_id AND c.tenant_id = cp.tenant_id
       WHERE c.tenant_id = $1
       GROUP BY c.id, c.title, c.author, c.isbn, c.category_id
       ORDER BY c.title ASC`,
      [tenantId]
    );
    return res.rows;
  }

  private calculateFineMinor(dueOn: string, returnedOn: string, dailyFineMinor: number): number {
    const due = Date.parse(dueOn);
    const returned = Date.parse(returnedOn);

    if (!Number.isFinite(due) || !Number.isFinite(returned) || returned <= due || dailyFineMinor <= 0) {
      return 0;
    }

    const overdueDays = Math.ceil((returned - due) / (24 * 60 * 60 * 1000));
    return overdueDays * dailyFineMinor;
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for library operations');
    }

    return tenantId;
  }

  private getActorUserId(): string | null {
    const userId = this.requestContext.getStore()?.user_id;
    return userId && userId !== 'anonymous' ? userId : null;
  }

  private optionalText(value: string | undefined): string | undefined {
    const normalized = value?.trim() ?? '';
    return normalized || undefined;
  }

  private optionalPositiveInteger(value: string | undefined): number | undefined {
    const normalized = value?.trim();

    if (!normalized) {
      return undefined;
    }

    const parsed = Number(normalized);

    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : undefined;
  }

  private optionalNonNegativeInteger(value: string | undefined): number | undefined {
    const normalized = value?.trim();

    if (!normalized) {
      return undefined;
    }

    const parsed = Number(normalized);

    return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : undefined;
  }

  async getDepartments() {
    const tenantId = this.requireTenantId();
    if (!this.prisma?.department) throw new InternalServerErrorException('Prisma is not available');
    const items = await this.prisma.department.findMany({
      where: { schoolId: tenantId }
    });
    return { items };
  }

  async getVisits() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql(
      `
        SELECT
          id::text,
          title,
          message,
          created_at::text,
          payload->>'visitor_name' AS visitor_name,
          payload->>'visitor_type' AS visitor_type,
          payload->>'purpose' AS purpose,
          payload->>'time_in' AS time_in,
          payload->>'time_out' AS time_out,
          payload->>'reading_program' AS reading_program,
          payload->>'notes' AS notes
        FROM workflow_events
        WHERE tenant_id = $1
          AND entity_type = 'library_visit'
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [tenantId],
    );

    return {
      items: result.rows.map((row: any) => ({
        id: row.id,
        visitor_name: row.visitor_name || row.payload?.visitor_name || row.title || 'Library visitor',
        visitor_type: row.visitor_type || row.payload?.visitor_type || 'student',
        purpose: row.purpose || row.payload?.purpose || row.message || 'Library use',
        time_in: row.time_in || row.payload?.time_in || row.created_at,
        time_out: row.time_out || row.payload?.time_out || '',
        reading_program: row.reading_program || row.payload?.reading_program || '',
        notes: row.notes || row.payload?.notes || '',
        status: row.time_out || row.payload?.time_out ? 'Completed' : 'Active',
        created_at: row.created_at,
      })),
    };
  }

  async getRequests() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql(
      `
        SELECT
          id::text,
          title,
          message,
          priority,
          created_at::text,
          payload->>'request_type' AS request_type,
          payload->>'target_role' AS target_role,
          payload->>'details' AS details,
          payload->>'required_by' AS required_by,
          payload->>'status' AS status
        FROM workflow_events
        WHERE tenant_id = $1
          AND entity_type = 'library_request'
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [tenantId],
    );

    return {
      items: result.rows.map((row: any) => ({
        id: row.id,
        request_type: row.request_type || row.payload?.request_type || row.title || 'Library request',
        target_role: row.target_role || row.payload?.target_role || 'principal',
        details: row.details || row.payload?.details || row.message || '',
        required_by: row.required_by || row.payload?.required_by || '',
        priority: row.priority || row.payload?.priority || 'normal',
        status: row.status || row.payload?.status || 'Pending',
        created_at: row.created_at,
      })),
    };
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    if (!this.prisma?.operationsReports) throw new InternalServerErrorException('Prisma is not available');
    const items = await this.prisma.operationsReports.findMany({
      where: { tenant_id: tenantId, title: { contains: 'Library' } },
      orderBy: { created_at: 'desc' },
      take: 20
    });
    return { items };
  }

  async getNotices() {
    const tenantId = this.requireTenantId();
    if (!this.prisma?.notification) throw new InternalServerErrorException('Prisma is not available');
    const items = await this.prisma.notification.findMany({
      where: { schoolId: tenantId, module: 'library' },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    return { items };
  }

  async getReturns() {
    return this.listCirculation({ action: 'return' });
  }

}
