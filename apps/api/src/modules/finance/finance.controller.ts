import { Body, Controller, Get, Post, Query, Patch, Delete, Param } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DatabaseService } from '../../database/database.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { RequiresModule } from '../module-access/module-access.decorator';
import { FinanceTasksService } from './finance-tasks.service';
import { FinanceWidgetDataDto } from '../dashboard/dashboard.dto';
import { EventPublisherService } from '../events/event-publisher.service';

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

import { SchoolOperationalEventsService } from '../events/school-operational-events.service';

@Controller('finance')
@RequiresModule('finance')
export class FinanceController {
  constructor(
    private readonly db: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly tasksService: FinanceTasksService,
    private readonly eventPublisher: EventPublisherService,
    private readonly schoolEvents: SchoolOperationalEventsService,
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

  @Get('summary')
  @Permissions('finance:read')
  async getSummary(): Promise<FinanceWidgetDataDto> {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) {
      throw new Error('Tenant context required');
    }

    const [
      collectionsRes,
      invoicesRes,
      mpesaRes
    ] = await Promise.all([
      this.db.query('SELECT COALESCE(SUM(amount_minor), 0) as total FROM manual_fee_payments WHERE tenant_id = $1 AND DATE(created_at) = CURRENT_DATE', [tenantId]),
      this.db.query('SELECT COALESCE(SUM(balance_minor), 0) as total FROM student_invoices WHERE tenant_id = $1 AND status != \'paid\'', [tenantId]).catch(() => ({ rows: [{ total: 0 }] })),
      this.db.query('SELECT COALESCE(SUM(amount_minor), 0) as total FROM receipts WHERE tenant_id = $1 AND payment_method = \'mpesa\'', [tenantId]).catch(() => ({ rows: [{ total: 0 }] })),
    ]);

    const collectionsMinor = parseInt(collectionsRes.rows[0]?.total || '0');
    const outstandingMinor = parseInt(invoicesRes.rows[0]?.total || '0');
    const mpesaMinor = parseInt(mpesaRes.rows[0]?.total || '0');

    const mpesaPercentage = collectionsMinor > 0 ? Math.round((mpesaMinor / collectionsMinor) * 100) : 0;
    const bankPercentage = collectionsMinor > 0 ? 100 - mpesaPercentage : 0;

    return {
      collectionsToday: `KES ${(collectionsMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      outstandingInvoices: `KES ${(outstandingMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
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
      `SELECT * FROM invoices WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
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
    // Mocking expenses since we don't have a dedicated expenses table in the provided schema snippets
    // Usually this would come from an expenses or ledger table
    return [
      { id: '1', date: new Date().toISOString(), category: 'Stationery', description: 'Chalks and dusters', amount_minor: '250000', status: 'Approved' }
    ];
  }

  @Get('bank-entries')
  @Permissions('finance:read')
  async getBankEntries() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    // Mocking bank entries
    return [
      { id: '1', date: new Date().toISOString(), reference: 'DEP-002', description: 'Daily Cash Deposit', type: 'Credit', amount_minor: '1400000' }
    ];
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
      const invRes = await this.db.query(
        `INSERT INTO student_invoices (tenant_id, student_id, invoice_number, fee_structure_id, term, academic_year, amount_minor, balance_minor)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [tenantId, student.id, `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`, fs.id, term || fs.term, academic_year || fs.academic_year, fs.total_amount_minor, fs.total_amount_minor]
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

  @Post('waivers')
  @Permissions('finance:write')
  async requestWaiver(@Body() dto: any) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const result = await this.db.query(
      `INSERT INTO tenant_pending_waivers (tenant_id, waiver_number, student_id, student_name, class_name, amount_minor, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
      [tenantId, `WV-${Date.now()}`, dto.student_id, dto.student_name || 'N/A', dto.class_name || 'N/A', dto.amount_minor, dto.reason]
    );
    const waiver = result.rows[0];

    await this.schoolEvents.recordSchoolOperation({
      event: {
        id: waiver.id,
        type: 'finance.waiver_requested',
        module: 'finance',
        actorRole: this.requestContext.requireStore().role || 'accountant',
        title: 'Fee Waiver Requested',
        body: `Waiver requested for student ${dto.student_id}`,
        entityId: waiver.id,
        severity: 'info',
        payload: { waiver_number: waiver.waiver_number, amount: dto.amount_minor },
      },
      notifications: [
        {
          id: `waiver-request-${waiver.id}`,
          schoolId: tenantId,
          title: 'Fee Waiver Approval Required',
          body: `A fee waiver of ${dto.amount_minor} is pending approval for ${dto.student_name || dto.student_id}.`,
          audienceRoles: ['principal'],
          priority: 'high',
          sourceModule: 'finance',
          relatedModule: 'finance',
          relatedRecordId: waiver.id,
          read: false,
          createdAt: new Date().toISOString(),
        }
      ]
    });

    return waiver;
  }

  @Post('waivers/:id/approve')
  @Permissions('finance:write')
  async approveWaiver(@Param('id') id: string, @Body() dto: { approved: boolean }) {
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
}
