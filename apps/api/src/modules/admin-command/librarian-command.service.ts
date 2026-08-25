import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

const LIBRARY_WORKFLOW_TARGET_ROLES = new Set([
  'librarian',
  'principal',
  'deputy_principal',
  'class_teacher',
  'accountant',
  'storekeeper',
  'procurement_officer',
]);

const LIBRARY_GENERAL_NOTICE_TARGET_ROLES = new Set([
  'librarian',
  'principal',
  'class_teacher',
  'teacher',
  'parent',
  'student',
]);

const LIBRARY_GENERAL_NOTICE_TYPES = new Set(['general', 'new_arrival']);

@Injectable()
export class LibrarianCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly operations: AdminCommandOperationsService,
  ) {}

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  private requireUserId(): string {
    const userId = this.operations.uuidOrNull(this.requestContext.getStore()?.user_id);
    if (!userId) {
      throw new UnauthorizedException('User context is required');
    }
    return userId;
  }

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    return this.prisma.query<T>(query, params);
  }

  async getOverview() {
    const tenantId = this.requireTenantId();
    const metrics = await this.executeSql(`
      SELECT 
        (SELECT COUNT(*)::int FROM library_catalog_items WHERE tenant_id = $1) as "totalBooks",
        (SELECT COUNT(*)::int FROM library_borrowers WHERE tenant_id = $1) as "activeBorrowers",
        (SELECT COUNT(*)::int
         FROM library_circulation_ledger issue
         WHERE issue.tenant_id = $1
           AND issue.action = 'issue'
           AND issue.metadata->>'due_on' < CURRENT_DATE::text
           AND NOT EXISTS (
             SELECT 1 FROM library_circulation_ledger returned
             WHERE returned.tenant_id = issue.tenant_id
               AND returned.copy_id = issue.copy_id
               AND returned.borrower_id = issue.borrower_id
               AND returned.action = 'return'
               AND returned.created_at >= issue.created_at
           )) as "overdueBooks"
    `, [tenantId]);

    const row = metrics.rows[0] || { totalBooks: 0, activeBorrowers: 0, overdueBooks: 0 };
    return {
      metrics: {
        totalBooks: row.totalBooks || 0,
        activeBorrowers: row.activeBorrowers || 0,
        overdueBooks: row.overdueBooks || 0,
      },
      recentLoans: []
    };
  }

  async getBooks() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT
          item.id::text,
          item.title,
          item.author,
          item.isbn,
          item.category,
          COALESCE(MAX(copy.shelf_location), '') AS shelf_location,
          COUNT(copy.id)::int AS copies_total,
          COUNT(copy.id) FILTER (WHERE copy.status = 'available')::int AS copies_available
        FROM library_catalog_items item
        LEFT JOIN library_copies copy ON copy.tenant_id = item.tenant_id AND copy.catalog_item_id = item.id
        WHERE item.tenant_id = $1
        GROUP BY item.id, item.title, item.author, item.isbn, item.category
        ORDER BY item.title ASC
      `,
      [tenantId]
    );
    const books = res.rows.map((row: any) => ({
      ...row,
      status: Number(row.copies_available) > 0 ? 'Available' : 'All Issued',
    }));
    return {
      metrics: {
        total_titles: books.length,
        total_copies: books.reduce((sum: number, row: any) => sum + Number(row.copies_total ?? 0), 0),
        available_copies: books.reduce((sum: number, row: any) => sum + Number(row.copies_available ?? 0), 0),
        categories: new Set(books.map((row: any) => row.category).filter(Boolean)).size,
      },
      books,
    };
  }

  async getBorrowers() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT borrower.id::text,
               borrower.borrower_type,
               borrower.subject_id::text,
               COALESCE(CONCAT(student.first_name, ' ', student.last_name), borrower.scan_code, borrower.subject_id::text) AS name,
               COALESCE(student.admission_number, borrower.scan_code, '') AS admission_no,
               COALESCE(allocation.class_name, student.current_class_id, '') AS class_name,
               borrower.created_at::text
        FROM library_borrowers borrower
        LEFT JOIN students student ON student.tenant_id = borrower.tenant_id AND student.id = borrower.subject_id
        LEFT JOIN student_allocations allocation ON allocation.tenant_id = student.tenant_id AND allocation.student_id = student.id AND allocation.is_current = TRUE
        WHERE borrower.tenant_id = $1
        ORDER BY name ASC
      `,
      [tenantId]
    );
    return res.rows;
  }

  async getCirculationOptions() {
    const tenantId = this.requireTenantId();
    const [borrowers, catalogItems, staff] = await Promise.all([
      this.executeSql(
        `
          SELECT borrower.id::text AS id,
                 COALESCE(
                   NULLIF(CONCAT_WS(' ', student.first_name, student.last_name), ''),
                   borrower.scan_code,
                   borrower.subject_id::text,
                   borrower.id::text
                 )
                 || COALESCE(' - ' || NULLIF(student.admission_number, ''), '')
                 || COALESCE(' - ' || NULLIF(allocation.class_name, ''), '') AS label,
                 borrower.borrower_type,
                 COALESCE(student.admission_number, borrower.scan_code, '') AS admission_no,
                 COALESCE(allocation.class_name, '') AS class_name
          FROM library_borrowers borrower
          LEFT JOIN students student ON student.tenant_id = borrower.tenant_id AND student.id = borrower.subject_id
          LEFT JOIN student_allocations allocation ON allocation.tenant_id = student.tenant_id AND allocation.student_id = student.id AND allocation.is_current = TRUE
          WHERE borrower.tenant_id = $1
          ORDER BY label ASC
          LIMIT 500
        `,
        [tenantId],
      ),
      this.executeSql(
        `
          SELECT item.id::text AS id,
                 item.title
                 || COALESCE(' - ' || NULLIF(item.isbn, ''), '')
                 || ' (' || (COUNT(copy.id) FILTER (WHERE copy.status = 'available'))::int || ' available)' AS label,
                 item.title,
                 COALESCE(item.isbn, '') AS isbn,
                 (COUNT(copy.id) FILTER (WHERE copy.status = 'available'))::int AS copies_available
          FROM library_catalog_items item
          LEFT JOIN library_copies copy ON copy.tenant_id = item.tenant_id AND copy.catalog_item_id = item.id
          WHERE item.tenant_id = $1
          GROUP BY item.id, item.title, item.isbn
          ORDER BY item.title ASC
          LIMIT 500
        `,
        [tenantId],
      ),
      this.executeSql(
        `
          SELECT id::text AS id,
                 COALESCE(NULLIF(full_name, ''), NULLIF(display_name, ''), staff_number, id::text)
                 || COALESCE(' - ' || NULLIF(staff_number, ''), '') AS label,
                 staff_number,
                 COALESCE(status, 'active') AS status
          FROM staff_profiles
          WHERE tenant_id = $1
            AND COALESCE(status, 'active') = 'active'
          ORDER BY label ASC
          LIMIT 300
        `,
        [tenantId],
      ),
    ]);

    return {
      borrowers: borrowers.rows,
      catalogItems: catalogItems.rows,
      staff: staff.rows,
    };
  }

  async getIssueBook() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      this.activeLoansSql(false),
      [tenantId]
    );
    const recent_issues = res.rows.map((row: any) => this.mapLoan(row));
    return {
      metrics: {
        issued_today: recent_issues.filter((row: any) => row.issue_date === new Date().toISOString().slice(0, 10)).length,
        total_active_issues: recent_issues.length,
        due_this_week: recent_issues.filter((row: any) => row.due_date && new Date(row.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length,
      },
      recent_issues,
    };
  }

  async getReservations() {
    const tenantId = this.requireTenantId();
    const res = await this.prisma.query(
      `
        SELECT
          id::text,
          entity_id,
          created_at::text,
          payload
        FROM workflow_events
        WHERE tenant_id = $1
          AND event_type = 'library.reservation.created'
          AND entity_type = 'library_reservation'
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [tenantId],
    );
    const reservations = res.rows.map((row: any) => {
      const payload = row.payload ?? {};
      return {
        id: row.entity_id ?? row.id,
        borrower_id: payload.borrower_id ?? '',
        borrower_name: payload.borrower_name ?? payload.borrower_id ?? 'Borrower not linked',
        catalog_item_id: payload.catalog_item_id ?? '',
        book_title: payload.book_title ?? payload.catalog_item_id ?? 'Catalogue item not linked',
        requested_date: payload.requested_date ?? String(row.created_at ?? '').slice(0, 10),
        expiry_date: payload.expiry_date ?? '',
        status: payload.status ?? 'waiting',
      };
    });
    return {
      metrics: {
        total_reservations: reservations.length,
        ready: reservations.filter((row: any) => String(row.status).toLowerCase() === 'ready').length,
        waiting: reservations.filter((row: any) => String(row.status).toLowerCase() === 'waiting').length,
      },
      reservations,
    };
  }

  async createReservation(dto: any) {
    const tenantId = this.requireTenantId();
    const borrowerId = this.operations.requiredText(dto?.borrower_id, 'Borrower ID');
    const catalogItemId = this.operations.requiredText(dto?.catalog_item_id, 'Catalogue item ID');
    const bookTitle = String(dto?.book_title ?? dto?.title ?? catalogItemId).trim();
    const borrowerName = String(dto?.borrower_name ?? dto?.borrower ?? borrowerId).trim();
    const expiryDate = String(dto?.expiry_date ?? '').trim();
    const event = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.requestContext.getStore()?.user_id,
      sourceRole: 'librarian',
      targetRoles: ['librarian'],
      eventType: 'library.reservation.created',
      entityType: 'library_reservation',
      entityId: dto?.reservation_id ?? null,
      title: 'Library reservation created',
      message: `${borrowerName} reserved ${bookTitle}.`,
      priority: 'normal',
      payload: {
        borrower_id: borrowerId,
        borrower_name: borrowerName,
        catalog_item_id: catalogItemId,
        book_title: bookTitle,
        requested_date: new Date().toISOString().slice(0, 10),
        expiry_date: expiryDate || null,
        status: String(dto?.status ?? 'waiting').toLowerCase(),
        source_dashboard: 'librarian-dashboard',
      },
    });
    return { success: true, event };
  }

  async getReturnBook() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT returned.id::text,
               returned.created_at::text AS return_date,
               returned.metadata,
               issue.created_at::text AS issue_date,
               issue.metadata->>'due_on' AS due_date,
               item.title AS book_title,
               item.isbn,
               student.admission_number AS admission_no,
               CONCAT(student.first_name, ' ', student.last_name) AS student_name
        FROM library_circulation_ledger returned
        INNER JOIN library_circulation_ledger issue
          ON issue.tenant_id = returned.tenant_id
         AND issue.copy_id = returned.copy_id
         AND issue.borrower_id = returned.borrower_id
         AND issue.action = 'issue'
         AND issue.created_at <= returned.created_at
        INNER JOIN library_copies copy ON copy.tenant_id = returned.tenant_id AND copy.id = returned.copy_id
        INNER JOIN library_catalog_items item ON item.tenant_id = copy.tenant_id AND item.id = copy.catalog_item_id
        INNER JOIN library_borrowers borrower ON borrower.tenant_id = returned.tenant_id AND borrower.id = returned.borrower_id
        LEFT JOIN students student ON student.tenant_id = borrower.tenant_id AND student.id = borrower.subject_id
        WHERE returned.tenant_id = $1
          AND returned.action = 'return'
        ORDER BY returned.created_at DESC
      `,
      [tenantId]
    );
    const returns = res.rows.map((row: any) => ({
      id: row.id,
      student_name: row.student_name ?? 'Borrower',
      admission_no: row.admission_no ?? '',
      book_title: row.book_title,
      isbn: row.isbn ?? '',
      issue_date: String(row.issue_date).slice(0, 10),
      due_date: row.due_date ?? '',
      return_date: String(row.return_date).slice(0, 10),
      condition: row.metadata?.condition ?? 'Good',
      status: row.metadata?.condition === 'Damaged' ? 'Damaged' : 'Returned',
    }));
    return {
      metrics: {
        returned_today: returns.filter((row: any) => row.return_date === new Date().toISOString().slice(0, 10)).length,
        pending_returns: (await this.getIssueBook()).metrics.total_active_issues,
        overdue_returns: (await this.getOverdueBooks()).metrics.overdue_count,
      },
      returns,
    };
  }

  async getOverdueBooks() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      this.activeLoansSql(true),
      [tenantId]
    );
    const overdue = res.rows.map((row: any) => this.mapLoan(row));
    return {
      metrics: {
        overdue_count: overdue.length,
        reminders_sent: 0,
      },
      overdueBooks: overdue,
      overdue_books: overdue,
    };
  }

  async getFinesLostDamaged() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT fine.id::text,
               COALESCE(CONCAT(student.first_name, ' ', student.last_name), borrower.scan_code, 'Borrower') AS student_name,
               COALESCE(student.admission_number, borrower.scan_code, '') AS admission_no,
               COALESCE(allocation.class_name, student.current_class_id, '') AS class_name,
               item.title AS book_title,
               fine.reason AS fine_type,
               fine.amount_minor,
               fine.created_at::text AS date_created,
               fine.billing_reference,
               fine.reason AS notes
        FROM library_fines fine
        INNER JOIN library_borrowers borrower ON borrower.tenant_id = fine.tenant_id AND borrower.id = fine.borrower_id
        LEFT JOIN students student ON student.tenant_id = borrower.tenant_id AND student.id = borrower.subject_id
        LEFT JOIN student_allocations allocation ON allocation.tenant_id = student.tenant_id AND allocation.student_id = student.id AND allocation.is_current = TRUE
        LEFT JOIN library_copies copy ON copy.tenant_id = fine.tenant_id AND copy.id = fine.copy_id
        LEFT JOIN library_catalog_items item ON item.tenant_id = copy.tenant_id AND item.id = copy.catalog_item_id
        WHERE fine.tenant_id = $1
        ORDER BY fine.created_at DESC
      `,
      [tenantId]
    );
    const fines = res.rows.map((row: any) => ({
      id: row.id,
      student_name: row.student_name,
      admission_no: row.admission_no,
      class_name: row.class_name,
      book_title: row.book_title ?? 'Library item',
      fine_type: this.formatFineType(row.fine_type),
      amount: Number(row.amount_minor ?? 0) / 100,
      date_created: String(row.date_created).slice(0, 10),
      status: row.billing_reference === 'waived' ? 'Waived' : row.billing_reference === 'paid' ? 'Paid' : 'Pending',
      notes: row.notes,
    }));
    return {
      metrics: {
        total_fines: fines.length,
        pending_amount: fines.filter((fine: any) => fine.status === 'Pending').reduce((sum: number, fine: any) => sum + fine.amount, 0),
        collected_amount: fines.filter((fine: any) => fine.status === 'Paid').reduce((sum: number, fine: any) => sum + fine.amount, 0),
        waived_amount: fines.filter((fine: any) => fine.status === 'Waived').reduce((sum: number, fine: any) => sum + fine.amount, 0),
      },
      fines,
    };
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    return this.operations.listReportSnapshots(tenantId, 'librarian-command');
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.requestContext.getStore()?.user_id);
    const [overview, books, borrowers, issueBook, returnBook, overdueBooks, finesLostDamaged] = await Promise.all([
      this.getOverview(),
      this.getBooks(),
      this.getBorrowers(),
      this.getIssueBook(),
      this.getReturnBook(),
      this.getOverdueBooks(),
      this.getFinesLostDamaged(),
    ]);
    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'librarian-command',
      reportId: 'library-operations',
      title: String(dto?.name || dto?.title || 'Library operations report'),
      format: dto?.format,
      generatedByUserId: userId,
      sections: { overview, books, borrowers, issueBook, returnBook, overdueBooks, finesLostDamaged },
      filters: { requested_from: 'librarian-dashboard' },
      targetRoles: ['principal', 'librarian'],
    });
  }

  async recordAction(dto: any) {
    const tenantId = this.requireTenantId();
    const action = String(dto?.action || 'workflow_action')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'workflow_action';
    const title = this.operations.requiredText(dto?.title || `Library ${action.replace(/_/g, ' ')}`, 'Library action title');
    const message = this.operations.requiredText(dto?.description || dto?.message || title, 'Library action description');
    const targetRoles = Array.isArray(dto?.target_roles)
      ? [...new Set<string>(dto.target_roles.map((role: unknown) => String(role).trim().toLowerCase()).filter(Boolean))]
      : ['librarian', 'principal', 'class_teacher'];
    if (targetRoles.length === 0 || targetRoles.some((role) => !LIBRARY_WORKFLOW_TARGET_ROLES.has(role))) {
      throw new BadRequestException('Library workflow actions may target only governed library, leadership, class, finance, stores, or procurement roles.');
    }
    return this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.requestContext.getStore()?.user_id,
      sourceRole: 'librarian',
      targetRoles,
      eventType: `library.${action}`,
      entityType: String(dto?.entityType || 'library_workflow'),
      entityId: dto?.entityId ?? dto?.entity_id ?? null,
      title,
      message,
      priority: dto?.priority === 'high' || dto?.priority === 'urgent' ? 'high' : 'normal',
      payload: {
        ...dto,
        action,
        target_roles: targetRoles,
        source_dashboard: 'librarian-dashboard',
      },
    });
  }

  async sendNotice(dto: any) {
    const tenantId = this.requireTenantId();
    const title = this.operations.requiredText(dto?.title, 'Notice title');
    const message = this.operations.requiredText(dto?.message || dto?.body, 'Notice message');
    const noticeType = String(dto?.notice_type || 'general').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_') || 'general';
    if (!LIBRARY_GENERAL_NOTICE_TYPES.has(noticeType)) {
      throw new BadRequestException('Borrower-specific overdue, fine, and lost-book notices must be sent from the exact borrower record.');
    }
    const targetRoles = Array.isArray(dto?.target_roles)
      ? [...new Set<string>(dto.target_roles.map((role: unknown) => String(role).trim().toLowerCase()).filter(Boolean))]
      : ['parent', 'student'];
    if (targetRoles.length === 0 || targetRoles.some((role) => !LIBRARY_GENERAL_NOTICE_TARGET_ROLES.has(role))) {
      throw new BadRequestException('General library notices may target only approved school library audiences.');
    }
    const channels = Array.isArray(dto?.channels)
      ? [...new Set<string>(dto.channels.map((channel: unknown) => String(channel).trim().toLowerCase()).filter(Boolean))]
      : ['in_app'];
    if (channels.length !== 1 || channels[0] !== 'in_app') {
      throw new BadRequestException('General library notices currently support verified in-app delivery only.');
    }

    const event = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.requestContext.getStore()?.user_id,
      sourceRole: 'librarian',
      targetRoles,
      eventType: 'library.notice_sent',
      entityType: 'library_notice',
      entityId: dto?.entityId ?? dto?.entity_id ?? null,
      title,
      message,
      priority: dto?.priority === 'high' || dto?.priority === 'urgent' ? 'high' : 'normal',
      payload: {
        ...dto,
        notice_type: noticeType,
        target_roles: targetRoles,
        channels,
        source_dashboard: 'librarian-dashboard',
      },
    });

    await this.operations.notifyRoles(tenantId, {
      key: `library-notice-${event?.id ?? Date.now()}`,
      type: 'library.notice_sent',
      title,
      body: message,
      targetRoles,
      metadata: {
        notice_type: noticeType,
        channels,
        event_id: event?.id ?? null,
      },
    });

    return {
      success: true,
      event,
      recipientRoles: targetRoles,
      channels,
    };
  }

  async checkoutLibraryVisit(dto: any) {
    const tenantId = this.requireTenantId();
    const visitorName = this.operations.requiredText(dto?.visitor_name ?? dto?.name, 'Visitor or class');
    const purpose = this.operations.requiredText(dto?.purpose, 'Visit purpose');
    const visitId = String(dto?.visit_id ?? dto?.id ?? visitorName)
      .trim()
      .slice(0, 120);
    const checkedOutAt = dto?.checked_out_at ? new Date(dto.checked_out_at).toISOString() : new Date().toISOString();
    const readingNotes = String(dto?.reading_notes ?? dto?.notes ?? '').trim();
    const title = 'Library visit checked out';
    const message = `${visitorName} was checked out from the library visit log.`;

    const event = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.requestContext.getStore()?.user_id,
      sourceRole: 'librarian',
      targetRoles: ['librarian', 'class_teacher'],
      eventType: 'library.visit.checked_out',
      entityType: 'library_visit',
      entityId: visitId || null,
      title,
      message,
      priority: 'normal',
      payload: {
        ...dto,
        visit_id: visitId || null,
        visitor_name: visitorName,
        purpose,
        checked_out_at: checkedOutAt,
        reading_notes: readingNotes || null,
        status: 'checked_out',
        source_dashboard: 'librarian-dashboard',
      },
    });

    await this.operations.notifyRoles(tenantId, {
      key: `library-visit-checkout-${event?.id ?? visitId ?? Date.now()}`,
      type: 'library.visit.checked_out',
      title,
      body: message,
      targetRoles: ['librarian', 'class_teacher'],
      metadata: {
        visit_id: visitId || null,
        event_id: event?.id ?? null,
      },
    });

    return { success: true, event };
  }

  async addBook(dto: any) {
    const tenantId = this.requireTenantId();
    const title = this.operations.requiredText(dto.title, 'Book title');
    const copies = this.operations.positiveInteger(dto.copies_total ?? dto.copies ?? 1, 'Copies');
    const item = await this.operations.writeSql(
      `
        INSERT INTO library_catalog_items (tenant_id, isbn, title, author, category)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [tenantId, dto.isbn ?? null, title, dto.author ?? null, dto.category ?? null],
    );
    const itemId = item.rows[0]?.id;
    for (let index = 0; index < copies; index += 1) {
      await this.operations.writeSql(
        `
          INSERT INTO library_copies (tenant_id, catalog_item_id, accession_number, barcode, shelf_location)
          VALUES ($1, $2::uuid, $3, $4, $5)
        `,
        [
          tenantId,
          itemId,
          `${String(dto.isbn || title).replace(/[^A-Za-z0-9]/g, '').slice(0, 12) || 'BOOK'}-${Date.now()}-${index + 1}`,
          dto.barcode ?? null,
          dto.shelf_location ?? null,
        ],
      );
    }
    await this.operations.recordAudit(tenantId, 'library.book.added', 'library_catalog_item', itemId, { title, copies }, this.requireUserId());
    return item.rows[0];
  }

  async deleteBook(id: string) {
    const tenantId = this.requireTenantId();
    const issued = await this.operations.readSql(
      `SELECT COUNT(*) AS count FROM library_copies WHERE tenant_id = $1 AND catalog_item_id = $2::uuid AND status = 'issued'`,
      [tenantId, id],
    );
    if (Number(issued.rows[0]?.count ?? 0) > 0) {
      throw new BadRequestException('Book has issued copies and cannot be removed');
    }
    await this.operations.writeSql(`DELETE FROM library_copies WHERE tenant_id = $1 AND catalog_item_id = $2::uuid`, [tenantId, id]);
    const deleted = await this.operations.writeSql(`DELETE FROM library_catalog_items WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`, [tenantId, id]);
    if (!deleted.rows[0]) throw new NotFoundException('Book was not found');
    await this.operations.recordAudit(tenantId, 'library.book.deleted', 'library_catalog_item', id, {}, this.requireUserId());
    return deleted.rows[0];
  }

  async issueBook(dto: any) {
    const tenantId = this.requireTenantId();
    const borrower = await this.resolveBorrower(tenantId, dto.student_admission_no ?? dto.borrower_code);
    const copy = await this.resolveAvailableCopy(tenantId, dto.book_isbn ?? dto.copy_code ?? dto.book_title);
    const dueOn = dto.due_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await this.operations.writeSql(
      `UPDATE library_copies SET status = 'issued', updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid AND status = 'available'`,
      [tenantId, copy.id],
    );
    const ledger = await this.operations.writeSql(
      `
        INSERT INTO library_circulation_ledger (tenant_id, copy_id, borrower_id, action, metadata)
        VALUES ($1, $2::uuid, $3::uuid, 'issue', $4::jsonb)
        RETURNING *
      `,
      [tenantId, copy.id, borrower.id, JSON.stringify({ due_on: dueOn, issued_by_user_id: this.requireUserId() })],
    );
    await this.operations.recordAudit(tenantId, 'library.book.issued', 'library_circulation_ledger', ledger.rows[0]?.id ?? null, {
      copy_id: copy.id,
      borrower_id: borrower.id,
      due_on: dueOn,
    }, this.requireUserId());
    return ledger.rows[0];
  }

  async issueDepartmentResource(dto: any) {
    const tenantId = this.requireTenantId();
    const department = this.operations.requiredText(dto.department, 'Department');
    const assignedTo = this.operations.requiredText(dto.assigned_to ?? dto.assignedTo ?? dto.staff_name, 'Responsible staff member');
    const borrower = await this.resolveStaffBorrower(tenantId, dto.staff_identifier ?? dto.staff_id ?? dto.staff_number ?? assignedTo);
    const copy = await this.resolveAvailableCopy(tenantId, dto.book_isbn ?? dto.copy_code ?? dto.book_title);
    const dueOn = dto.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const metadata = {
      due_on: dueOn,
      issued_by_user_id: this.requireUserId(),
      department,
      assigned_to: assignedTo,
      purpose: dto.purpose ?? 'department_resource',
      notes: dto.notes ?? null,
    };

    await this.operations.writeSql(
      `UPDATE library_copies SET status = 'issued', updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid AND status = 'available'`,
      [tenantId, copy.id],
    );
    const ledger = await this.operations.writeSql(
      `
        INSERT INTO library_circulation_ledger (tenant_id, copy_id, borrower_id, action, metadata)
        VALUES ($1, $2::uuid, $3::uuid, 'issue', $4::jsonb)
        RETURNING *
      `,
      [tenantId, copy.id, borrower.id, JSON.stringify(metadata)],
    );
    await this.operations.recordAudit(tenantId, 'library.department_resource.issued', 'library_circulation_ledger', ledger.rows[0]?.id ?? null, {
      copy_id: copy.id,
      borrower_id: borrower.id,
      department,
      assigned_to: assignedTo,
      due_on: dueOn,
    }, this.requireUserId());
    return ledger.rows[0];
  }

  async returnBook(dto: any) {
    const tenantId = this.requireTenantId();
    const borrower = await this.resolveBorrower(tenantId, dto.student_admission_no ?? dto.borrower_code);
    const copy = await this.resolveCopy(tenantId, dto.book_isbn ?? dto.copy_code ?? dto.book_title);
    const active = await this.operations.readSql(
      `
        SELECT id::text, metadata, created_at::text
        FROM library_circulation_ledger issue
        WHERE tenant_id = $1 AND copy_id = $2::uuid AND borrower_id = $3::uuid AND action = 'issue'
          AND NOT EXISTS (
            SELECT 1 FROM library_circulation_ledger returned
            WHERE returned.tenant_id = issue.tenant_id AND returned.copy_id = issue.copy_id
              AND returned.borrower_id = issue.borrower_id AND returned.action = 'return'
              AND returned.created_at >= issue.created_at
          )
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [tenantId, copy.id, borrower.id],
    );
    if (!active.rows[0]) throw new NotFoundException('Active loan was not found for this student and book');
    const condition = String(dto.condition || 'Good');
    const nextStatus = condition === 'Lost' ? 'lost' : condition === 'Damaged' ? 'damaged' : 'available';
    await this.operations.writeSql(`UPDATE library_copies SET status = $3, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid`, [tenantId, copy.id, nextStatus]);
    const ledger = await this.operations.writeSql(
      `
        INSERT INTO library_circulation_ledger (tenant_id, copy_id, borrower_id, action, metadata)
        VALUES ($1, $2::uuid, $3::uuid, 'return', $4::jsonb)
        RETURNING *
      `,
      [tenantId, copy.id, borrower.id, JSON.stringify({ condition, returned_by_user_id: this.requireUserId() })],
    );
    if (condition === 'Lost' || condition === 'Damaged') {
      await this.createFine({
        student_admission_no: dto.student_admission_no,
        book_isbn: dto.book_isbn,
        fine_type: condition,
        amount: Number(dto.amount ?? 500),
        notes: `${condition} book on return`,
      });
    }
    return ledger.rows[0];
  }

  async remindOverdueBorrower(id: string) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const result = await this.operations.writeSql<{
      overdue_count: number;
      recipient_count: number;
      notification_count: number;
      event_id: string | null;
      borrower_id: string | null;
      book_title: string | null;
      audits_created: number;
    }>(
      `
        WITH selected_overdue AS (
          SELECT
            issue.id,
            issue.borrower_id,
            issue.copy_id,
            issue.metadata->>'due_on' AS due_on,
            borrower.borrower_type,
            borrower.subject_id,
            item.title AS book_title,
            student.id AS student_id,
            staff.user_id AS staff_user_id
          FROM library_circulation_ledger issue
          INNER JOIN library_borrowers borrower
            ON borrower.tenant_id = issue.tenant_id
           AND borrower.id = issue.borrower_id
          INNER JOIN library_copies copy
            ON copy.tenant_id = issue.tenant_id
           AND copy.id = issue.copy_id
          INNER JOIN library_catalog_items item
            ON item.tenant_id = copy.tenant_id
           AND item.id = copy.catalog_item_id
          LEFT JOIN students student
            ON student.tenant_id = borrower.tenant_id
           AND student.id::text = borrower.subject_id::text
           AND LOWER(borrower.borrower_type) = 'student'
           AND student.deleted_at IS NULL
          LEFT JOIN staff_profiles staff
            ON staff.tenant_id = borrower.tenant_id
           AND staff.id::text = borrower.subject_id::text
           AND LOWER(borrower.borrower_type) = 'staff'
          WHERE issue.tenant_id = $1
            AND issue.id = $2::uuid
            AND issue.action = 'issue'
            AND issue.metadata->>'due_on' < CURRENT_DATE::text
            AND NOT EXISTS (
              SELECT 1
              FROM library_circulation_ledger returned
              WHERE returned.tenant_id = issue.tenant_id
                AND returned.copy_id = issue.copy_id
                AND returned.borrower_id = issue.borrower_id
                AND returned.action = 'return'
                AND returned.created_at >= issue.created_at
            )
          LIMIT 1
        ), recipient_candidates AS (
          SELECT
            portal.user_id,
            NULL::uuid AS guardian_id,
            'student'::text AS recipient_kind
          FROM selected_overdue overdue
          INNER JOIN student_portal_access portal
            ON portal.tenant_id = $1
           AND portal.student_id::text = overdue.student_id::text
           AND LOWER(portal.status) = 'active'
           AND portal.user_id IS NOT NULL
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = portal.tenant_id
           AND membership.user_id = portal.user_id
           AND LOWER(membership.status) = 'active'

          UNION ALL

          SELECT
            guardian.user_id,
            guardian.id AS guardian_id,
            'guardian'::text AS recipient_kind
          FROM selected_overdue overdue
          INNER JOIN student_guardians guardian
            ON guardian.tenant_id = $1
           AND guardian.student_id::text = overdue.student_id::text
           AND LOWER(guardian.status) = 'active'
           AND guardian.user_id IS NOT NULL
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = guardian.tenant_id
           AND membership.user_id = guardian.user_id
           AND LOWER(membership.status) = 'active'

          UNION ALL

          SELECT
            overdue.staff_user_id AS user_id,
            NULL::uuid AS guardian_id,
            'staff'::text AS recipient_kind
          FROM selected_overdue overdue
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = $1
           AND membership.user_id = overdue.staff_user_id
           AND LOWER(membership.status) = 'active'
          WHERE overdue.staff_user_id IS NOT NULL
        ), recipients AS (
          SELECT DISTINCT ON (candidate.user_id)
            candidate.user_id,
            candidate.guardian_id,
            candidate.recipient_kind
          FROM recipient_candidates candidate
          ORDER BY
            candidate.user_id,
            CASE candidate.recipient_kind WHEN 'guardian' THEN 1 WHEN 'student' THEN 2 ELSE 3 END
        ), delivery AS (
          SELECT
            (SELECT COUNT(*)::int FROM selected_overdue) AS overdue_count,
            (SELECT COUNT(*)::int FROM recipients) AS recipient_count
        ), inserted_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type,
            entity_type, entity_id, title, message, priority, payload, status
          )
          SELECT
            $1,
            $3::uuid,
            'librarian',
            '["librarian"]'::jsonb,
            'library.overdue.reminder_sent',
            'library_circulation_ledger',
            overdue.id::text,
            'Library overdue reminder queued',
            delivery.recipient_count::text || ' exact borrower or linked guardian account(s) were queued.',
            'normal',
            jsonb_build_object(
              'issue_id', overdue.id::text,
              'borrower_id', overdue.borrower_id::text,
              'recipient_scope', 'exact_active_borrower_accounts',
              'recipient_count', delivery.recipient_count,
              'source_dashboard', 'librarian-overdue-loans'
            ),
            'published'
          FROM selected_overdue overdue
          CROSS JOIN delivery
          WHERE delivery.recipient_count > 0
          RETURNING id, entity_id
        ), inserted_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, recipient_guardian_id,
            type, title, body, status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            'library-overdue-' || event.entity_id || '-' || recipient.user_id::text,
            recipient.user_id,
            recipient.guardian_id,
            'library.overdue.reminder',
            'Library overdue reminder',
            overdue.book_title || ' was due on ' || overdue.due_on || '. Please arrange its return.',
            'unread',
            'normal',
            'library',
            event.entity_id,
            jsonb_build_object(
              'event_id', event.id::text,
              'issue_id', overdue.id::text,
              'borrower_id', overdue.borrower_id::text,
              'recipient_kind', recipient.recipient_kind,
              'recipient_scope', 'exact_active_borrower_account',
              'source_dashboard', 'librarian-overdue-loans'
            )
          FROM inserted_event event
          CROSS JOIN selected_overdue overdue
          CROSS JOIN recipients recipient
          ON CONFLICT (tenant_id, notification_key)
          DO UPDATE SET
            recipient_user_id = EXCLUDED.recipient_user_id,
            recipient_guardian_id = EXCLUDED.recipient_guardian_id,
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            status = 'unread',
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING id
        ), action_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1,
            $3::uuid,
            current_setting('app.request_id', true),
            'library.overdue.reminder_sent',
            'library_circulation_ledger',
            overdue.id::text,
            jsonb_build_object(
              'borrower_id', overdue.borrower_id::text,
              'recipient_scope', 'exact_active_borrower_accounts',
              'notification_count', (SELECT COUNT(*) FROM inserted_notifications)
            )
          FROM selected_overdue overdue
          WHERE EXISTS (SELECT 1 FROM inserted_event)
          RETURNING id
        )
        SELECT
          delivery.overdue_count,
          delivery.recipient_count,
          (SELECT COUNT(*)::int FROM inserted_notifications) AS notification_count,
          (SELECT id::text FROM inserted_event LIMIT 1) AS event_id,
          (SELECT borrower_id::text FROM selected_overdue LIMIT 1) AS borrower_id,
          (SELECT book_title FROM selected_overdue LIMIT 1) AS book_title,
          (SELECT COUNT(*)::int FROM action_audit) AS audits_created
        FROM delivery
      `,
      [tenantId, id, actorUserId],
    );

    const delivery = result.rows[0];
    if (!delivery || Number(delivery.overdue_count) !== 1) {
      throw new NotFoundException('The active overdue library loan was not found in this school.');
    }
    const recipientCount = Number(delivery.recipient_count ?? 0);
    const notificationCount = Number(delivery.notification_count ?? 0);
    if (!delivery.event_id || recipientCount === 0) {
      throw new BadRequestException('No active borrower or linked guardian account can receive this overdue reminder.');
    }
    if (notificationCount !== recipientCount || Number(delivery.audits_created) !== 1) {
      throw new BadRequestException('The overdue reminder could not be recorded for every exact recipient.');
    }

    return {
      success: true,
      borrowerId: delivery.borrower_id,
      bookTitle: delivery.book_title,
      recipientCount,
      notificationCount,
      eventId: delivery.event_id,
    };
  }

  async createFine(dto: any) {
    const tenantId = this.requireTenantId();
    const borrower = await this.resolveBorrower(tenantId, dto.student_admission_no ?? dto.borrower_code);
    const copy = await this.resolveCopy(tenantId, dto.book_isbn ?? dto.copy_code ?? dto.book_title);
    const result = await this.operations.writeSql(
      `
        INSERT INTO library_fines (tenant_id, borrower_id, copy_id, reason, amount_minor)
        VALUES ($1, $2::uuid, $3::uuid, $4, $5)
        RETURNING *
      `,
      [tenantId, borrower.id, copy.id, dto.fine_type ?? dto.reason ?? 'library fine', Math.round(Number(dto.amount ?? 0) * 100)],
    );
    await this.operations.recordAudit(tenantId, 'library.fine.created', 'library_fine', result.rows[0]?.id ?? null, {
      borrower_id: borrower.id,
      copy_id: copy.id,
    }, this.requireUserId());
    return result.rows[0];
  }

  async updateFineStatus(id: string, status: 'paid' | 'waived') {
    const tenantId = this.requireTenantId();
    const result = await this.operations.writeSql(
      `UPDATE library_fines SET billing_reference = $3 WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id, status],
    );
    if (!result.rows[0]) throw new NotFoundException('Library fine was not found');
    await this.operations.recordAudit(tenantId, `library.fine.${status}`, 'library_fine', id, {}, this.requireUserId());
    return result.rows[0];
  }

  private activeLoansSql(overdueOnly: boolean) {
    return `
      SELECT issue.id::text,
             issue.borrower_id::text,
             issue.created_at::text AS issue_date,
             issue.metadata->>'due_on' AS due_date,
             item.title AS book_title,
             item.isbn,
             student.admission_number AS admission_no,
             CONCAT(student.first_name, ' ', student.last_name) AS student_name,
             COALESCE(allocation.class_name, student.current_class_id, '') AS class_name
      FROM library_circulation_ledger issue
      INNER JOIN library_copies copy ON copy.tenant_id = issue.tenant_id AND copy.id = issue.copy_id
      INNER JOIN library_catalog_items item ON item.tenant_id = copy.tenant_id AND item.id = copy.catalog_item_id
      INNER JOIN library_borrowers borrower ON borrower.tenant_id = issue.tenant_id AND borrower.id = issue.borrower_id
      LEFT JOIN students student ON student.tenant_id = borrower.tenant_id AND student.id = borrower.subject_id
      LEFT JOIN student_allocations allocation ON allocation.tenant_id = student.tenant_id AND allocation.student_id = student.id AND allocation.is_current = TRUE
      WHERE issue.tenant_id = $1
        AND issue.action = 'issue'
        ${overdueOnly ? "AND issue.metadata->>'due_on' < CURRENT_DATE::text" : ''}
        AND NOT EXISTS (
          SELECT 1 FROM library_circulation_ledger returned
          WHERE returned.tenant_id = issue.tenant_id AND returned.copy_id = issue.copy_id
            AND returned.borrower_id = issue.borrower_id AND returned.action = 'return'
            AND returned.created_at >= issue.created_at
        )
      ORDER BY issue.created_at DESC
    `;
  }

  private mapLoan(row: any) {
    const dueDate = row.due_date ?? '';
    return {
      id: row.id,
      borrower_id: row.borrower_id,
      student_name: row.student_name ?? 'Borrower',
      admission_no: row.admission_no ?? '',
      class_name: row.class_name ?? '',
      book_title: row.book_title,
      isbn: row.isbn ?? '',
      issue_date: String(row.issue_date).slice(0, 10),
      due_date: dueDate,
      status: dueDate && new Date(dueDate) < new Date() ? 'Overdue' : 'Active',
    };
  }

  private async resolveBorrower(tenantId: string, admissionNo: string) {
    const code = this.operations.requiredText(admissionNo, 'Student admission number');
    const existing = await this.operations.readSql(
      `SELECT id::text FROM library_borrowers WHERE tenant_id = $1 AND (id::text = $2 OR scan_code = $2) LIMIT 1`,
      [tenantId, code],
    );
    if (existing.rows[0]) return existing.rows[0] as any;
    const student = await this.operations.readSql(
      `SELECT id::text, admission_number FROM students WHERE tenant_id = $1 AND admission_number = $2 LIMIT 1`,
      [tenantId, code],
    );
    if (!student.rows[0]) throw new NotFoundException('Student borrower was not found');
    const borrower = await this.operations.writeSql(
      `INSERT INTO library_borrowers (tenant_id, borrower_type, subject_id, scan_code) VALUES ($1, 'student', $2::uuid, $3) RETURNING id::text`,
      [tenantId, student.rows[0].id, code],
    );
    return borrower.rows[0] as any;
  }

  private async resolveStaffBorrower(tenantId: string, staffIdentifier: string) {
    const code = this.operations.requiredText(staffIdentifier, 'Staff identifier');
    const existing = await this.operations.readSql(
      `SELECT id::text FROM library_borrowers WHERE tenant_id = $1 AND borrower_type = 'staff' AND (id::text = $2 OR scan_code = $2) LIMIT 1`,
      [tenantId, code],
    );
    if (existing.rows[0]) return existing.rows[0] as any;
    const staff = await this.operations.readSql(
      `
        SELECT id::text, staff_number, display_name
        FROM staff_profiles
        WHERE tenant_id = $1
          AND (
            id::text = $2
            OR user_id::text = $2
            OR staff_number = $2
            OR display_name ILIKE $2
          )
        LIMIT 1
      `,
      [tenantId, code],
    );
    if (!staff.rows[0]) throw new NotFoundException('Staff borrower was not found');
    const borrower = await this.operations.writeSql(
      `INSERT INTO library_borrowers (tenant_id, borrower_type, subject_id, scan_code) VALUES ($1, 'staff', $2::uuid, $3) RETURNING id::text`,
      [tenantId, staff.rows[0].id, staff.rows[0].staff_number ?? code],
    );
    return borrower.rows[0] as any;
  }

  private async resolveAvailableCopy(tenantId: string, bookCode: string) {
    const copy = await this.resolveCopy(tenantId, bookCode, true);
    if (copy.status !== 'available') throw new BadRequestException('No available copy found for this book');
    return copy;
  }

  private async resolveCopy(tenantId: string, bookCode: string, availableOnly = false) {
    const code = this.operations.requiredText(bookCode, 'Book ISBN, title, or copy code');
    const result = await this.operations.readSql(
      `
        SELECT copy.id::text, copy.status
        FROM library_copies copy
        INNER JOIN library_catalog_items item ON item.tenant_id = copy.tenant_id AND item.id = copy.catalog_item_id
        WHERE copy.tenant_id = $1
          AND ($3::boolean = FALSE OR copy.status = 'available')
          AND (
            copy.id::text = $2 OR copy.accession_number = $2 OR copy.barcode = $2 OR item.isbn = $2 OR item.title ILIKE $2
          )
        ORDER BY copy.created_at ASC
        LIMIT 1
      `,
      [tenantId, code, availableOnly],
    );
    if (!result.rows[0]) throw new NotFoundException('Library copy was not found');
    return result.rows[0] as any;
  }

  private formatFineType(value: string) {
    return String(value || 'Fine')
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
}
