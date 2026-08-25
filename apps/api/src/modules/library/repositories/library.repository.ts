import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import type {
  IssueLibraryCopyDto,
  ReserveLibraryCopyDto,
  ReturnLibraryCopyDto,
} from '../dto/library.dto';

export interface LibraryBorrowerNotificationRecipient {
  user_id: string;
  guardian_id: string | null;
  recipient_kind: 'guardian' | 'student' | 'staff';
}

@Injectable()
export class LibraryRepository {

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

  constructor(private readonly prisma: PrismaService) {}

  async findCopyForUpdate(tenantId: string, copyId: string) {
    const result = await this.executeSql(
      `
        SELECT
          id::text,
          tenant_id,
          catalog_item_id::text,
          accession_number,
          barcode,
          qr_code,
          shelf_location,
          status,
          created_at,
          updated_at
        FROM library_copies
        WHERE tenant_id = $1
          AND id = $2::uuid
        FOR UPDATE
      `,
      [tenantId, copyId],
    );

    return result.rows[0] ?? null;
  }

  async findCopyByScanCodeForUpdate(tenantId: string, scanCode: string) {
    const result = await this.executeSql(
      `
        SELECT
          id::text,
          tenant_id,
          catalog_item_id::text,
          accession_number,
          barcode,
          qr_code,
          shelf_location,
          status,
          created_at,
          updated_at
        FROM library_copies
        WHERE tenant_id = $1
          AND (
            id::text = $2
            OR accession_number = $2
            OR barcode = $2
            OR qr_code = $2
          )
        LIMIT 1
        FOR UPDATE
      `,
      [tenantId, scanCode],
    );

    return result.rows[0] ?? null;
  }

  async findBorrowerByScanCode(tenantId: string, scanCode: string) {
    const result = await this.executeSql(
      `
        SELECT
          id::text,
          tenant_id,
          borrower_type,
          subject_id::text,
          scan_code,
          restrictions,
          created_at
        FROM library_borrowers
        WHERE tenant_id = $1
          AND (
            id::text = $2
            OR subject_id::text = $2
            OR scan_code = $2
          )
        LIMIT 1
      `,
      [tenantId, scanCode],
    );

    return result.rows[0] ?? null;
  }

  async issueCopy(input: IssueLibraryCopyDto & {
    tenant_id: string;
    issued_by_user_id: string | null;
  }) {
    const result = await this.executeSql(
      `
        UPDATE library_copies
        SET status = 'issued',
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND status = 'available'
        RETURNING id::text, status
      `,
      [input.tenant_id, input.copy_id],
    );

    return result.rows[0] ?? null;
  }

  async createReservation(input: ReserveLibraryCopyDto & {
    tenant_id: string;
  }) {
    const result = await this.executeSql(
      `
        WITH next_position AS (
          SELECT COALESCE(MAX(queue_position), 0) + 1 AS queue_position
          FROM library_reservations
          WHERE tenant_id = $1
            AND catalog_item_id = $2::uuid
            AND status = 'waiting'
        )
        INSERT INTO library_reservations (
          tenant_id,
          catalog_item_id,
          borrower_id,
          queue_position
        )
        SELECT $1, $2::uuid, $3::uuid, queue_position
        FROM next_position
        RETURNING id::text, queue_position
      `,
      [input.tenant_id, input.catalog_item_id, input.borrower_id],
    );

    return result.rows[0];
  }

  async findLoanForReturn(tenantId: string, loanId: string) {
    const result = await this.executeSql(
      `
        SELECT
          id::text,
          tenant_id,
          copy_id::text,
          borrower_id::text,
          action,
          metadata,
          metadata ->> 'due_on' AS due_on,
          created_at
        FROM library_circulation_ledger
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND action = 'issue'
        LIMIT 1
      `,
      [tenantId, loanId],
    );

    return result.rows[0] ?? null;
  }

  async findActiveLoanByCopyId(tenantId: string, copyId: string) {
    const result = await this.executeSql(
      `
        SELECT
          issue.id::text,
          issue.tenant_id,
          issue.copy_id::text,
          issue.borrower_id::text,
          issue.action,
          issue.metadata,
          issue.metadata ->> 'due_on' AS due_on,
          issue.created_at
        FROM library_circulation_ledger issue
        WHERE issue.tenant_id = $1
          AND issue.copy_id = $2::uuid
          AND issue.action = 'issue'
          AND NOT EXISTS (
            SELECT 1
            FROM library_circulation_ledger returned
            WHERE returned.tenant_id = issue.tenant_id
              AND returned.copy_id = issue.copy_id
              AND returned.borrower_id = issue.borrower_id
              AND returned.action = 'return'
              AND returned.created_at >= issue.created_at
          )
        ORDER BY issue.created_at DESC
        LIMIT 1
      `,
      [tenantId, copyId],
    );

    return result.rows[0] ?? null;
  }

  async listActiveNotificationRecipientsForBorrower(
    tenantId: string,
    borrowerId: string,
  ): Promise<LibraryBorrowerNotificationRecipient[]> {
    const result = await this.executeSql<LibraryBorrowerNotificationRecipient>(
      `
        WITH selected_borrower AS (
          SELECT borrower_type, subject_id
          FROM library_borrowers
          WHERE tenant_id = $1
            AND id = $2::uuid
          LIMIT 1
        ), recipient_candidates AS (
          SELECT
            portal.user_id,
            NULL::uuid AS guardian_id,
            'student'::text AS recipient_kind
          FROM selected_borrower borrower
          INNER JOIN student_portal_access portal
            ON portal.tenant_id = $1
           AND portal.student_id = borrower.subject_id
           AND LOWER(portal.status) = 'active'
           AND portal.user_id IS NOT NULL
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = portal.tenant_id
           AND membership.user_id = portal.user_id
           AND LOWER(membership.status) = 'active'
          WHERE LOWER(borrower.borrower_type) = 'student'

          UNION ALL

          SELECT
            guardian.user_id,
            guardian.id AS guardian_id,
            'guardian'::text AS recipient_kind
          FROM selected_borrower borrower
          INNER JOIN student_guardians guardian
            ON guardian.tenant_id = $1
           AND guardian.student_id = borrower.subject_id
           AND LOWER(guardian.status) = 'active'
           AND guardian.user_id IS NOT NULL
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = guardian.tenant_id
           AND membership.user_id = guardian.user_id
           AND LOWER(membership.status) = 'active'
          WHERE LOWER(borrower.borrower_type) = 'student'

          UNION ALL

          SELECT
            staff.user_id,
            NULL::uuid AS guardian_id,
            'staff'::text AS recipient_kind
          FROM selected_borrower borrower
          INNER JOIN staff_profiles staff
            ON staff.tenant_id = $1
           AND staff.id = borrower.subject_id
           AND LOWER(staff.status) = 'active'
           AND staff.user_id IS NOT NULL
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = staff.tenant_id
           AND membership.user_id = staff.user_id
           AND LOWER(membership.status) = 'active'
          WHERE LOWER(borrower.borrower_type) = 'staff'
        )
        SELECT DISTINCT ON (user_id)
          user_id::text,
          guardian_id::text,
          recipient_kind
        FROM recipient_candidates
        ORDER BY
          user_id,
          CASE recipient_kind WHEN 'guardian' THEN 1 WHEN 'student' THEN 2 ELSE 3 END
      `,
      [tenantId, borrowerId],
    );

    return result.rows;
  }

  async returnCopy(input: ReturnLibraryCopyDto & {
    tenant_id: string;
    copy_id?: string | null;
  }) {
    if (input.copy_id) {
      await this.executeSql(
        `
          UPDATE library_copies
          SET status = 'available',
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
        `,
        [input.tenant_id, input.copy_id],
      );
    }

    return { id: input.loan_id, status: 'returned' };
  }

  async createFine(input: {
    tenant_id: string;
    borrower_id: string;
    copy_id?: string | null;
    reason: string;
    amount_minor: number;
  }) {
    const result = await this.executeSql(
      `
        INSERT INTO library_fines (
          tenant_id,
          borrower_id,
          copy_id,
          reason,
          amount_minor
        )
        VALUES ($1, $2::uuid, $3::uuid, $4, $5)
        RETURNING id::text, amount_minor
      `,
      [
        input.tenant_id,
        input.borrower_id,
        input.copy_id ?? null,
        input.reason,
        input.amount_minor,
      ],
    );

    return result.rows[0];
  }

  async listCirculation(input: {
    tenant_id: string;
    borrower_id?: string;
    copy_id?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) {
    const result = await this.executeSql(
      `
        SELECT
          ledger.id::text,
          ledger.copy_id::text,
          ledger.borrower_id::text,
          ledger.action,
          ledger.metadata,
          ledger.created_at::text,
          copy.accession_number,
          catalog.title,
          catalog.author,
          borrower.borrower_type
        FROM library_circulation_ledger ledger
        LEFT JOIN library_copies copy
          ON copy.tenant_id = ledger.tenant_id
         AND copy.id = ledger.copy_id
        LEFT JOIN library_catalog_items catalog
          ON catalog.tenant_id = copy.tenant_id
         AND catalog.id = copy.catalog_item_id
        LEFT JOIN library_borrowers borrower
          ON borrower.tenant_id = ledger.tenant_id
         AND borrower.id = ledger.borrower_id
        WHERE ledger.tenant_id = $1
          AND ($2::uuid IS NULL OR ledger.borrower_id = $2::uuid)
          AND ($3::uuid IS NULL OR ledger.copy_id = $3::uuid)
          AND ($4::text IS NULL OR ledger.action = $4)
        ORDER BY ledger.created_at DESC
        LIMIT $5::integer OFFSET $6::integer
      `,
      [
        input.tenant_id,
        input.borrower_id ?? null,
        input.copy_id ?? null,
        input.action ?? null,
        normalizeLibraryListLimit(input.limit),
        normalizeLibraryListOffset(input.offset),
      ],
    );

    return result.rows;
  }

  async appendLedger(input: {
    tenant_id: string;
    copy_id?: string | null;
    borrower_id?: string | null;
    action: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.executeSql(
      `
        INSERT INTO library_circulation_ledger (
          tenant_id,
          copy_id,
          borrower_id,
          action,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        input.tenant_id,
        input.copy_id ?? null,
        input.borrower_id ?? null,
        input.action,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }

  async buildSummary(tenantId: string) {
    const [catalogResult, copiesResult, loansResult, circulationResult, finesResult] = await Promise.all([
      this.executeSql(
        `SELECT COUNT(*) as count FROM library_catalog_items WHERE tenant_id = $1`,
        [tenantId]
      ),
      this.executeSql(
        `SELECT 
           COUNT(*) as total_copies,
           SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_copies,
           SUM(CASE WHEN status = 'lost' OR status = 'damaged' THEN 1 ELSE 0 END) as lost_or_damaged_copies
         FROM library_copies WHERE tenant_id = $1`,
        [tenantId]
      ),
      this.executeSql(
        `SELECT COUNT(*) as count FROM library_loans WHERE tenant_id = $1 AND status = 'active'`,
        [tenantId]
      ),
      this.executeSql(
        `SELECT 
           COUNT(*) as count,
           SUM(CASE WHEN metadata->>'due_on' < CURRENT_DATE::text THEN 1 ELSE 0 END) as overdue_count
         FROM library_circulation_ledger 
         WHERE tenant_id = $1 AND action = 'issue'
           AND NOT EXISTS (
             SELECT 1 FROM library_circulation_ledger r 
             WHERE r.tenant_id = $1 AND r.copy_id = library_circulation_ledger.copy_id 
             AND r.action = 'return' AND r.created_at > library_circulation_ledger.created_at
           )`,
        [tenantId]
      ),
      this.executeSql(
        `SELECT SUM(amount_minor) as total_fines FROM library_fines WHERE tenant_id = $1`,
        [tenantId]
      )
    ]);

    // Gather recent activities
    const activitiesResult = await this.executeSql(
      `SELECT
          l.id,
          l.action,
          l.created_at,
          b.subject_id as borrower_id,
          c.title as item_title
       FROM library_circulation_ledger l
       LEFT JOIN library_copies cp ON l.copy_id = cp.id
       LEFT JOIN library_catalog_items c ON cp.catalog_item_id = c.id
       LEFT JOIN library_borrowers b ON l.borrower_id = b.id
       WHERE l.tenant_id = $1
       ORDER BY l.created_at DESC
       LIMIT 5`,
       [tenantId]
    );

    return {
      total_catalog_items: parseInt(catalogResult.rows[0]?.count || '0', 10),
      total_copies: parseInt(copiesResult.rows[0]?.total_copies || '0', 10),
      available_copies: parseInt(copiesResult.rows[0]?.available_copies || '0', 10),
      lost_or_damaged_copies: parseInt(copiesResult.rows[0]?.lost_or_damaged_copies || '0', 10),
      active_loans: parseInt(circulationResult.rows[0]?.count || '0', 10),
      overdue_loans: parseInt(circulationResult.rows[0]?.overdue_count || '0', 10),
      total_fines_minor: parseInt(finesResult.rows[0]?.total_fines || '0', 10),
      recent_activities: activitiesResult.rows.map(row => ({
        id: row.id,
        action: row.action,
        created_at: row.created_at,
        borrower_id: row.borrower_id,
        item_title: row.item_title
      }))
    };
  }

  async listCatalogItems(tenantId: string) {
    const result = await this.executeSql(
      `
        SELECT
          catalog.id::text,
          catalog.title,
          catalog.author,
          catalog.isbn,
          catalog.category AS subject,
          COUNT(copy.id)::int AS total,
          COUNT(copy.id) FILTER (WHERE copy.status = 'available')::int AS available
        FROM library_catalog_items catalog
        LEFT JOIN library_copies copy
          ON copy.tenant_id = catalog.tenant_id
         AND copy.catalog_item_id = catalog.id
        WHERE catalog.tenant_id = $1
        GROUP BY
          catalog.id,
          catalog.title,
          catalog.author,
          catalog.isbn,
          catalog.category
        ORDER BY catalog.title ASC, catalog.id ASC
      `,
      [tenantId],
    );

    return result.rows;
  }
}

function normalizeLibraryListLimit(limit: number | undefined): number {
  const parsed = Number(limit ?? 25);

  if (!Number.isFinite(parsed)) {
    return 25;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
}

function normalizeLibraryListOffset(offset: number | undefined): number {
  const parsed = Number(offset ?? 0);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(Math.trunc(parsed), 0);
}
