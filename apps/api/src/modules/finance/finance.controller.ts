import { Body, Controller, Get, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DatabaseService } from '../../database/database.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { RequiresModule } from '../module-access/module-access.decorator';
import { FinanceTasksService } from './finance-tasks.service';

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

@Controller('finance')
@RequiresModule('finance')
export class FinanceController {
  constructor(
    private readonly db: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly tasksService: FinanceTasksService,
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
        result.rows[0].id,
        JSON.stringify({
          amount: dto.amount,
          student: dto.student,
          method: dto.method,
        }),
      ],
    );

    return { success: true, paymentId: result.rows[0].id };
  }

  @Get('tasks')
  @Permissions('finance:read')
  async getTasks() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) {
      throw new Error('Tenant context required');
    }

    return this.tasksService.getTasks(tenantId);
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
}
