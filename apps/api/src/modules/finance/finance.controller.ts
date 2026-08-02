import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Res, Delete, StreamableFile } from '@nestjs/common';
import { PdfService } from '../../common/pdf/pdf.service';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { RequiresModule } from '../module-access/module-access.decorator';
import { FinanceTasksService } from './finance-tasks.service';
import { FinanceWidgetDataDto } from '../dashboard/dashboard.dto';
import { EventPublisherService } from '../events/event-publisher.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { createHash } from 'node:crypto';
import { RequestFeeWaiverDto } from './dto/request-fee-waiver.dto';

export class CreatePaymentDto {


  id!: string;
  student!: string;
  admissionNo!: string;
  amount!: number;
  method!: string;
  voteHead!: string;
  term!: string;
  reference!: string;
  receiptNo!: string;
  parentSmsSent!: boolean;
  status!: 'completed' | 'failed' | 'pending';
}

export class CreateFinanceTaskDto {
  title!: string;
  description!: string;
  dueDate!: string;
  assignedTo?: string;
}

type FeeStatementInvoice = {
  invoiceNumber: string;
  studentName: string;
  academicYear: string;
  term: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: string;
  dueDate: Date;
};

type FeeStatementPayment = {
  paymentReference: string;
  studentName: string;
  paymentMethod: string;
  amount: number;
  paymentDate: Date;
  status: string;
};

function formatKes(value: number) {
  return `KES ${value.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: Date) {
  return value.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function generateInvoiceNumber(tenantId: string, studentId: string, feeStructureId: string, academicYear: string, term: string) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const digest = createHash('sha256')
    .update(JSON.stringify({ tenantId, studentId, feeStructureId, academicYear, term }))
    .digest('hex')
    .slice(0, 10)
    .toUpperCase();

  return `INV-${date}-${digest}`;
}

export function buildFeeStatementContent(input: {
  generatedAt: Date;
  linkedChildCount: number;
  invoices: FeeStatementInvoice[];
  payments: FeeStatementPayment[];
}) {
  const totalDue = input.invoices.reduce((sum, invoice) => sum + invoice.amountDue, 0);
  const totalPaid = input.invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
  const totalBalance = input.invoices.reduce((sum, invoice) => sum + invoice.balance, 0);
  const paymentTotal = input.payments.reduce((sum, payment) => sum + payment.amount, 0);

  const invoiceLines = input.invoices.length > 0
    ? input.invoices.map((invoice) =>
        [
          invoice.invoiceNumber,
          invoice.studentName,
          `${invoice.academicYear} ${invoice.term}`,
          `Due ${formatKes(invoice.amountDue)}`,
          `Paid ${formatKes(invoice.amountPaid)}`,
          `Balance ${formatKes(invoice.balance)}`,
          invoice.status,
          `Due date ${formatDate(invoice.dueDate)}`,
        ].join(' | '),
      )
    : ['No invoices found for the linked learner records in this school.'];

  const paymentLines = input.payments.length > 0
    ? input.payments.map((payment) =>
        [
          payment.paymentReference,
          payment.studentName,
          payment.paymentMethod,
          formatKes(payment.amount),
          payment.status,
          formatDate(payment.paymentDate),
        ].join(' | '),
      )
    : ['No payments found for the linked learner records in this school.'];

  return [
    `Generated: ${formatDate(input.generatedAt)}`,
    `Linked learners: ${input.linkedChildCount}`,
    '',
    'Summary',
    `Total invoiced: ${formatKes(totalDue)}`,
    `Total paid against invoices: ${formatKes(totalPaid)}`,
    `Current balance: ${formatKes(totalBalance)}`,
    `Payments recorded: ${formatKes(paymentTotal)}`,
    '',
    'Invoices',
    ...invoiceLines,
    '',
    'Payments',
    ...paymentLines,
    '',
    'This statement is generated from tenant-scoped school finance records and only includes learners linked to the signed-in portal user.',
  ].join('\n');
}

import { SchoolOperationalEventsService } from '../events/school-operational-events.service';

@Controller('finance')
@RequiresModule('finance')
export class FinanceController {
  constructor(
    private readonly db: PrismaService,
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly tasksService: FinanceTasksService,
    private readonly eventPublisher: EventPublisherService,
    private readonly schoolEvents: SchoolOperationalEventsService,
    private readonly approvals: ApprovalsService,
  ) {}

  @Post('payment')
  @Permissions('finance:write')
  async createPayment(@Body() dto: CreatePaymentDto) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    const userId = store.user_id;

    if (!tenantId) {
      throw new Error('Tenant context required');
    }

    const idempotencyKey = `payment-${dto.id || Date.now()}`;
    
    const paymentMethodMap: Record<string, string> = {
      'M-Pesa': 'mpesa_c2b',
      'Cash': 'cash',
      'Bank': 'bank_deposit',
      'Bursary': 'eft',
    };
    
    const dbMethod = paymentMethodMap[dto.method] || 'cash';
    const amountMinor = Math.round((dto.amount || 0) * 100);

    const result = await this.db.query(
      `
        INSERT INTO manual_fee_payments (
          tenant_id,
          idempotency_key,
          receipt_number,
          payment_method,
          amount_minor,
          currency_code,
          payer_name,
          deposit_reference,
          created_by_user_id
        ) VALUES (
          $1, $2, $3, $4, $5, 'KES', $6, $7, $8
        ) RETURNING id
      `,
      [
        tenantId,
        idempotencyKey,
        dto.receiptNo || `RCPT-${Date.now()}`,
        dbMethod,
        amountMinor,
        dto.student || 'Unknown Payer',
        dto.reference || null,
        userId || null,
      ],
    );

    const paymentId = result.rows[0].id;

    await this.db.query(
      `
        INSERT INTO audit_logs (
          tenant_id,
          actor_user_id,
          action,
          resource_type,
          resource_id,
          metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        )
      `,
      [
        tenantId,
        userId || null,
        'RECORDED_FEE_PAYMENT',
        'manual_fee_payments',
        paymentId,
        JSON.stringify({
          amount: dto.amount,
          student: dto.student,
          method: dto.method,
        }),
      ],
    );

    // Emit event for projections
    await this.eventPublisher.publish({
      tenant_id: tenantId,
      event_name: 'payment.completed',
      event_key: idempotencyKey,
      aggregate_type: 'payment',
      aggregate_id: paymentId,
      payload: {
        tenant_id: tenantId,
        payment_intent_id: paymentId,
        mpesa_transaction_id: dto.receiptNo || `RCPT-${Date.now()}`,
        checkout_request_id: idempotencyKey,
        merchant_request_id: dto.reference || 'N/A',
        ledger_transaction_id: 'N/A',
        amount_minor: String(amountMinor),
        currency_code: 'KES',
        account_reference: dto.student || 'Unknown',
        external_reference: dto.reference || null,
        mpesa_receipt_number: dto.receiptNo || null,
        phone_number: null,
        completed_at: new Date().toISOString()
      }
    });

    return { success: true, paymentId };
  }

  @Get('tasks')
  @Permissions('finance:read')
  async getTasks(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) {
      throw new Error('Tenant context required');
    }

    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;

    return this.tasksService.getTasks(tenantId, pageNum, limitNum, status);
  }

  @Post('tasks')
  @Permissions('finance:write')
  async createTask(@Body() dto: CreateFinanceTaskDto) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    const userId = store.user_id;
    if (!tenantId) {
      throw new Error('Tenant context required');
    }
    if (!userId) {
      throw new Error('User context required');
    }

    return this.tasksService.createTask({
      tenantId,
      userId,
      ...dto,
    });
  }

  @Get('statements/download')
  @Permissions('portal:read_own_children')
  async downloadStatement(@Res({ passthrough: true }) res: any) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    const userId = store.user_id;
    if (!tenantId) {
      throw new Error('Tenant context required');
    }
    if (!userId) {
      throw new Error('User context required');
    }

    const statementData = await this.prisma.executeWithTenant(tenantId, userId, async (tx) => {
      const linkedChildren = await tx.studentGuardian.findMany({
        where: {
          guardianId: userId,
          schoolId: tenantId,
        },
        select: {
          studentId: true,
        },
      });
      const childIds = linkedChildren.map((child) => child.studentId);

      if (childIds.length === 0) {
        return {
          childIds,
          invoices: [],
          payments: [],
        };
      }

      const [invoices, payments] = await Promise.all([
        tx.invoice.findMany({
          where: {
            schoolId: tenantId,
            studentId: { in: childIds },
            deletedAt: null,
          },
          include: {
            student: { select: { firstName: true, lastName: true } },
            academicYear: { select: { name: true } },
            term: { select: { name: true } },
          },
          orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
          take: 100,
        }),
        tx.payment.findMany({
          where: {
            schoolId: tenantId,
            studentId: { in: childIds },
            deletedAt: null,
          },
          include: {
            student: { select: { firstName: true, lastName: true } },
          },
          orderBy: { paymentDate: 'desc' },
          take: 100,
        }),
      ]);

      return {
        childIds,
        invoices: invoices.map((invoice) => ({
          invoiceNumber: invoice.invoiceNumber,
          studentName: `${invoice.student.firstName} ${invoice.student.lastName}`,
          academicYear: invoice.academicYear.name,
          term: invoice.term.name,
          amountDue: invoice.amountDue,
          amountPaid: invoice.amountPaid,
          balance: invoice.balance,
          status: String(invoice.status),
          dueDate: invoice.dueDate,
        })),
        payments: payments.map((payment) => ({
          paymentReference: payment.paymentReference,
          studentName: `${payment.student.firstName} ${payment.student.lastName}`,
          paymentMethod: String(payment.paymentMethod),
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          status: String(payment.status),
        })),
      };
    });

    const content = buildFeeStatementContent({
      generatedAt: new Date(),
      linkedChildCount: statementData.childIds.length,
      invoices: statementData.invoices,
      payments: statementData.payments,
    });

    await this.db.query(
      `
        INSERT INTO audit_logs (
          tenant_id,
          actor_user_id,
          action,
          resource_type,
          resource_id,
          metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        )
      `,
      [
        tenantId,
        userId,
        'FEE_STATEMENT_GENERATED',
        'finance_statement',
        userId,
        JSON.stringify({
          linked_child_count: statementData.childIds.length,
          invoice_count: statementData.invoices.length,
          payment_count: statementData.payments.length,
        }),
      ],
    );

    const pdfService = new PdfService();
    const stream = pdfService.generatePdfStream(content, {
      title: 'Fee Statement',
      subject: 'Parent portal fee statement',
    });
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="fee-statement-${new Date().toISOString().slice(0, 10)}.pdf"`,
    });
    return new StreamableFile(stream);
  }

  @Get('summary')
  @Permissions('finance:read')
  async getSummary(): Promise<FinanceWidgetDataDto> {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) {
      throw new Error('Tenant context required');
    }

    const [collectionsTotal, outstandingTotal, mpesaTotal] = await this.prisma.executeWithTenant(tenantId, null, async (tx) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [collectionsRes, invoicesRes, mpesaRes] = await Promise.all([
        tx.payment.aggregate({
          _sum: { amount: true },
          where: { schoolId: tenantId, paymentDate: { gte: today, lt: tomorrow } }
        }),
        tx.invoice.aggregate({
          _sum: { balance: true },
          where: { schoolId: tenantId, status: { not: 'PAID' } }
        }),
        tx.payment.aggregate({
          _sum: { amount: true },
          where: { schoolId: tenantId, paymentMethod: 'MPESA' }
        })
      ]);

      return [
        collectionsRes._sum.amount || 0,
        invoicesRes._sum.balance || 0,
        mpesaRes._sum.amount || 0
      ];
    });

    const mpesaPercentage = collectionsTotal > 0 ? Math.round((mpesaTotal / collectionsTotal) * 100) : 0;
    const bankPercentage = collectionsTotal > 0 ? 100 - mpesaPercentage : 0;

    return {
      collectionsToday: `KES ${collectionsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      outstandingInvoices: `KES ${outstandingTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      failedPayments: '0',
      trendLabel: 'Live collections data',
      collectionMix: [
        { label: 'M-PESA', value: mpesaPercentage },
        { label: 'Bank', value: bankPercentage },
      ],
    };
  }

  @Get('fee-categories')
  @Permissions('finance:read')
  async listFeeCategories() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const result = await this.db.query(
      `SELECT * FROM finance_fee_categories WHERE tenant_id = $1 AND is_active = true ORDER BY name ASC`,
      [tenantId]
    );
    return result.rows;
  }

  @Post('fee-categories')
  @Permissions('finance:write')
  async createFeeCategory(@Body() dto: { name: string; description?: string; amount_minor: number; currency_code?: string }) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const result = await this.db.query(
      `INSERT INTO finance_fee_categories (tenant_id, name, description, amount_minor, currency_code)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tenantId, dto.name, dto.description || null, dto.amount_minor, dto.currency_code || 'KES']
    );
    return result.rows[0];
  }

  @Patch('fee-categories/:id')
  @Permissions('finance:write')
  async updateFeeCategory(@Body() dto: { name?: string; description?: string; amount_minor?: number; currency_code?: string }, @Param('id') id: string) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const result = await this.db.query(
      `UPDATE finance_fee_categories 
       SET name = COALESCE($1, name), description = COALESCE($2, description), amount_minor = COALESCE($3, amount_minor), currency_code = COALESCE($4, currency_code), updated_at = NOW()
       WHERE tenant_id = $5 AND id = $6::uuid RETURNING *`,
      [dto.name, dto.description, dto.amount_minor, dto.currency_code, tenantId, id]
    );
    return result.rows[0];
  }

  @Get('collections')
  @Permissions('finance:read')
  async getCollections() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const result = await this.db.query(
      `SELECT * FROM manual_fee_payments WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [tenantId]
    );
    return result.rows;
  }

  @Get('invoices')
  @Permissions('finance:read')
  async getInvoices() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const result = await this.db.query(
      `SELECT * FROM student_invoices WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [tenantId]
    );
    return result.rows;
  }

  @Get('accounts-overview')
  @Permissions('finance:read')
  async getAccountsOverview() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const result = await this.db.query(
      `
      SELECT 
        s.id, s.first_name, s.last_name, s.admission_number,
        (SELECT name FROM class_sections cs JOIN student_class_assignments sca ON sca.class_section_id = cs.id WHERE sca.student_id = s.id AND sca.status = 'active' LIMIT 1) as class_name,
        COALESCE((SELECT SUM(amount_minor) FROM ledger_entries le JOIN accounts a ON le.account_id = a.id WHERE a.metadata->>'student_id' = s.id::text AND a.category = 'asset'), 0) as balance_minor
      FROM students s
      WHERE s.tenant_id = $1
      ORDER BY s.first_name ASC
      LIMIT 100
      `,
      [tenantId]
    );
    return result.rows;
  }

  @Get('expenses')
  @Permissions('finance:read')
  async getExpenses() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const result = await this.db.query(
      `SELECT id, created_at as date, category, description, amount_minor, status FROM school_expenses WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [tenantId]
    );
    return result.rows;
  }

  @Get('bank-entries')
  @Permissions('finance:read')
  async getBankEntries() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const result = await this.db.query(
      `SELECT id, created_at as date, reference, description, type, amount_minor FROM bank_entries WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [tenantId]
    );
    return result.rows;
  }

  @Delete('fee-categories/:id')
  @Permissions('finance:write')
  async deleteFeeCategory(@Param('id') id: string) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const result = await this.db.query(
      `UPDATE finance_fee_categories SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id]
    );
    return result.rows[0];
  }

  @Post('fee-structures')
  @Permissions('finance:write')
  async createFeeStructure(@Body() dto: any) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const userId = this.requestContext.requireStore().user_id;
    const result = await this.db.query(
      `INSERT INTO fee_structures (tenant_id, name, academic_year, term, grade_level, currency_code, due_days, total_amount_minor, line_items, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10) RETURNING *`,
      [tenantId, dto.name, dto.academic_year, dto.term, dto.grade_level, dto.currency_code || 'KES', dto.due_days || 14, dto.total_amount_minor, JSON.stringify(dto.line_items || []), userId]
    );
    return result.rows[0];
  }

  @Post('invoices/generate')
  @Permissions('finance:write')
  async generateInvoices(@Body() dto: any) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const { fee_structure_id, term, academic_year } = dto;

    if (!tenantId) {
      throw new Error('Tenant context is required to generate invoices');
    }
    
    const fsRes = await this.db.query(`SELECT * FROM fee_structures WHERE id = $1 AND tenant_id = $2`, [fee_structure_id, tenantId]);
    if (fsRes.rowCount === 0) throw new Error('Fee structure not found');
    const fs = fsRes.rows[0];

    const studentsRes = await this.db.query(
      `SELECT s.id FROM students s 
       WHERE s.tenant_id = $1 AND s.metadata->>'grade_level' = $2 AND s.status = 'active'`,
      [tenantId, fs.grade_level]
    );

    const invoices = [];
    for (const student of studentsRes.rows) {
      const invoiceTerm = term || fs.term;
      const invoiceAcademicYear = academic_year || fs.academic_year;
      const studentId = typeof student.id === 'string' && student.id.trim() ? student.id : '';
      const feeStructureId = typeof fs.id === 'string' && fs.id.trim() ? fs.id : '';

      if (!invoiceTerm || !invoiceAcademicYear || !studentId || !feeStructureId) {
        throw new Error('Student, fee structure, term, and academic year are required to generate invoices');
      }

      const invRes = await this.db.query(
        `INSERT INTO student_invoices (tenant_id, student_id, invoice_number, fee_structure_id, term, academic_year, amount_minor, balance_minor)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          tenantId,
          studentId,
          generateInvoiceNumber(tenantId, studentId, feeStructureId, invoiceAcademicYear, invoiceTerm),
          feeStructureId,
          invoiceTerm,
          invoiceAcademicYear,
          fs.total_amount_minor,
          fs.total_amount_minor,
        ]
      );
      invoices.push(invRes.rows[0]);
    }
    return { generated: invoices.length, invoices };
  }

  @Get('receipts/:id')
  @Permissions('finance:read')
  async getReceipt(@Param('id') id: string) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const result = await this.db.query(
      `SELECT r.*, s.first_name, s.last_name, s.admission_number 
       FROM receipts r 
       JOIN students s ON r.student_id = s.id 
       WHERE r.id = $1 AND r.tenant_id = $2`,
      [id, tenantId]
    );
    if (result.rowCount === 0) throw new Error('Receipt not found');
    return result.rows[0];
  }

  @Get('waivers')
  @Permissions('finance:read')
  async listWaivers() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const result = await this.db.query(
      `
      SELECT *
      FROM (
        SELECT
          id::text,
          waiver_number,
          student_id::text,
          student_name,
          class_name,
          amount_minor::text,
          reason,
          lower(status) AS status,
          created_at
        FROM tenant_pending_waivers
        WHERE tenant_id = $1

        UNION ALL

        SELECT
          id::text,
          CONCAT('APR-', UPPER(LEFT(id::text, 8))) AS waiver_number,
          target_entity_id AS student_id,
          COALESCE(NULLIF(new_value ->> 'studentName', ''), target_entity_id) AS student_name,
          NULLIF(new_value ->> 'className', '') AS class_name,
          COALESCE(NULLIF(new_value ->> 'amountMinor', ''), '0') AS amount_minor,
          COALESCE(reason, 'Fee waiver approval request') AS reason,
          lower(status::text) AS status,
          created_at
        FROM approval_requests
        WHERE school_id = $1
          AND module = 'FINANCE'
          AND action = 'FEE_WAIVER'
      ) AS waiver_register
      ORDER BY created_at DESC
      LIMIT 100
      `,
      [tenantId],
    );
    return result.rows;
  }

  @Post('waivers')
  @Permissions('finance:write')
  async requestWaiver(@Body() dto: RequestFeeWaiverDto) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    const userId = store.user_id;
    const role = store.role || 'accountant';

    const approvalResult = await this.approvals.enforceApprovalRule({
      schoolId: tenantId as string,
      userId: userId as string,
      userRole: role,
      module: 'FINANCE',
      action: 'FEE_WAIVER',
      targetEntityType: 'STUDENT',
      targetEntityId: dto.student_id,
      newValue: {
        studentName: dto.student_name,
        className: dto.class_name,
        amountMinor: dto.amount_minor,
      },
      reason: dto.reason,
    });

    if (approvalResult.mode === 'CREATE_APPROVAL_REQUEST') {
      return { 
        success: true, 
        status: 'PENDING_APPROVAL', 
        message: 'Fee waiver request submitted for approval.',
        request: approvalResult.request 
      };
    }

    // Direct apply logic (if approval is NONE or AUTO_APPROVE)
    const result = await this.db.query(
      `INSERT INTO tenant_pending_waivers (tenant_id, waiver_number, student_id, student_name, class_name, amount_minor, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved') RETURNING *`,
      [tenantId, `WV-${Date.now()}`, dto.student_id, dto.student_name || 'N/A', dto.class_name || 'N/A', dto.amount_minor, dto.reason]
    );
    const waiver = result.rows[0];

    // Execute waiver directly (e.g., updating balance immediately)
    // For brevity, using the same balance update logic
    const invRes = await this.db.query(
      `SELECT id, balance_minor FROM student_invoices WHERE student_id = $1 AND tenant_id = $2 AND status = 'open' ORDER BY created_at ASC LIMIT 1`,
      [waiver.student_id, tenantId]
    );
    if ((invRes.rowCount ?? 0) > 0) {
      const inv = invRes.rows[0];
      const newBalance = Math.max(0, Number(inv.balance_minor) - Number(waiver.amount_minor));
      await this.db.query(
        `UPDATE student_invoices SET balance_minor = $1, status = CASE WHEN $1 <= 0 THEN 'paid' ELSE 'open' END WHERE id = $2`,
        [newBalance, inv.id]
      );
    }

    return { success: true, status: 'APPROVED', message: 'Fee waiver applied.', waiver };
  }

  @Post('waivers/:id/approve')
  @Permissions('finance:write')
  async approveWaiver(@Param('id') id: string, @Body() dto: { approved: boolean }, @Res({ passthrough: true }) res: any) {
    res.setHeader('Warning', '299 - "This endpoint is deprecated. Use the centralized Approvals engine instead."');
    const tenantId = this.requestContext.requireStore().tenant_id;
    const result = await this.db.query(
      `UPDATE tenant_pending_waivers SET status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [dto.approved ? 'approved' : 'rejected', id, tenantId]
    );
    
    // If approved, update student balance
    if (dto.approved && (result.rowCount ?? 0) > 0) {
      const waiver = result.rows[0];
      // Reduce balance in oldest open invoice
      const invRes = await this.db.query(
        `SELECT id, balance_minor FROM student_invoices WHERE student_id = $1 AND tenant_id = $2 AND status = 'open' ORDER BY created_at ASC LIMIT 1`,
        [waiver.student_id, tenantId]
      );
      if ((invRes.rowCount ?? 0) > 0) {
        const inv = invRes.rows[0];
        const newBalance = Math.max(0, Number(inv.balance_minor) - Number(waiver.amount_minor));
        await this.db.query(
          `UPDATE student_invoices SET balance_minor = $1, status = CASE WHEN $1 <= 0 THEN 'paid' ELSE 'open' END WHERE id = $2`,
          [newBalance, inv.id]
        );
      }
    }
    
    return result.rows[0];
  }

  @Get('balances')
  @Permissions('finance:read')
  async getBalances() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const result = await this.db.query(
      `SELECT student_id, SUM(balance_minor) as total_balance 
       FROM student_invoices 
       WHERE tenant_id = $1 AND status = 'open' 
       GROUP BY student_id`,
      [tenantId]
    );
    return { items: result.rows };
  }

  @Get('payments')
  @Permissions('finance:read')
  async getPayments() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const result = await this.db.query(
      `SELECT * FROM manual_fee_payments WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [tenantId]
    );
    return { items: result.rows };
  }
}
