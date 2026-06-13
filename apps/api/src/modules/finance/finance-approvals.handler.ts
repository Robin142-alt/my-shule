import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ApprovalsExecutor } from '../approvals/approvals.executor';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class FinanceApprovalsHandler implements OnModuleInit {
  private readonly logger = new Logger(FinanceApprovalsHandler.name);

  constructor(
    private readonly approvalsExecutor: ApprovalsExecutor,
    private readonly db: DatabaseService,
  ) {}

  onModuleInit() {
    this.approvalsExecutor.registerHandler('FINANCE', 'FEE_WAIVER', async (context) => {
      this.logger.log(`Executing approved fee waiver: ${JSON.stringify(context)}`);

      const { schoolId, targetEntityId, newValue } = context;

      // 1. Insert into tenant_pending_waivers as 'approved' (for record keeping in finance module)
      const result = await this.db.query(
        `INSERT INTO tenant_pending_waivers (tenant_id, waiver_number, student_id, student_name, class_name, amount_minor, reason, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved') RETURNING *`,
        [schoolId, `WV-${Date.now()}`, targetEntityId, newValue.studentName || 'N/A', newValue.className || 'N/A', newValue.amountMinor, context.reason || 'Approved via Approvals Engine']
      );
      const waiver = result.rows[0];

      // 2. Reduce balance in oldest open invoice
      const invRes = await this.db.query(
        `SELECT id, balance_minor FROM student_invoices WHERE student_id = $1 AND tenant_id = $2 AND status = 'open' ORDER BY created_at ASC LIMIT 1`,
        [targetEntityId, schoolId]
      );
      
      if ((invRes.rowCount ?? 0) > 0) {
        const inv = invRes.rows[0];
        const newBalance = Math.max(0, Number(inv.balance_minor) - Number(waiver.amount_minor));
        await this.db.query(
          `UPDATE student_invoices SET balance_minor = $1, status = CASE WHEN $1 <= 0 THEN 'paid' ELSE 'open' END WHERE id = $2`,
          [newBalance, inv.id]
        );
        this.logger.log(`Invoice ${inv.id} balance reduced by ${waiver.amount_minor}`);
      }
    });
  }
}
