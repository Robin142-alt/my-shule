import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { BadRequestException, Injectable, Optional, UnauthorizedException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
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
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly libraryRepository: LibraryRepository,
      private readonly db: DatabaseService,
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
}
