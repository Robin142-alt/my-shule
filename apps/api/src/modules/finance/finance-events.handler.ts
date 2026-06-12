import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventConsumerDescriptor, DomainEvent } from '../events/events.types';

@Injectable()
export class FinancePaymentCompletedConsumer implements EventConsumerDescriptor<'payment.completed'> {
  readonly name = 'FinancePaymentCompletedConsumer';
  readonly event_name = 'payment.completed';
  private readonly logger = new Logger(FinancePaymentCompletedConsumer.name);

  constructor(private readonly db: PrismaService) {}

  async handle(event: DomainEvent<'payment.completed'>): Promise<void> {
    const { tenant_id, payload } = event;
    const amountMinor = parseInt(payload.amount_minor, 10);
    const currentTerm = 'Term 2'; // Hardcoded for demo, normally fetched from active term config

    try {
      this.logger.log(`Handling payment.completed for tenant ${tenant_id}: ${amountMinor} minor units`);
      
      // Update tenant_finance_summary projection using upsert
      await this.db.query(
        `
        INSERT INTO tenant_finance_summary (tenant_id, current_term, total_collections_minor, total_arrears_minor)
        VALUES ($1, $2, $3, 0)
        ON CONFLICT (tenant_id, current_term) 
        DO UPDATE SET 
          total_collections_minor = tenant_finance_summary.total_collections_minor + EXCLUDED.total_collections_minor,
          last_updated = CURRENT_TIMESTAMP
        `,
        [tenant_id, currentTerm, amountMinor]
      );
    } catch (err: any) {
      this.logger.error(`Failed to update finance projection for tenant ${tenant_id}: ${err.message}`, err.stack);
      throw err;
    }
  }
}
