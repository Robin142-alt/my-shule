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

    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      throw new Error(`payment.completed ${event.id} has an invalid amount_minor`);
    }

    try {
      this.logger.log(`Handling payment.completed for tenant ${tenant_id}: ${amountMinor} minor units`);

      await this.db.executeWithTenant(tenant_id, null, async (tx) => {
        const terms = await tx.$queryRawUnsafe<Array<{ academic_year: string; term_name: string }>>(
          `
            SELECT year.name AS academic_year, term.name AS term_name
            FROM academic_terms term
            JOIN academic_years year
              ON year.tenant_id = term.tenant_id
             AND year.id = term.academic_year_id
            WHERE term.tenant_id = $1
              AND term.status = 'active'
              AND year.status = 'active'
              AND CURRENT_DATE BETWEEN term.starts_on AND term.ends_on
            ORDER BY term.starts_on DESC
            LIMIT 1
          `,
          tenant_id,
        );
        const activeTerm = terms[0];

        if (!activeTerm) {
          throw new Error(`No active academic term is configured for tenant ${tenant_id}`);
        }

        const currentTerm = `${activeTerm.academic_year} - ${activeTerm.term_name}`;
        await tx.$executeRawUnsafe(
          `
            INSERT INTO tenant_finance_summary (tenant_id, current_term, total_collections_minor, total_arrears_minor)
            VALUES ($1, $2, $3, 0)
            ON CONFLICT (tenant_id, current_term)
            DO UPDATE SET
              total_collections_minor = tenant_finance_summary.total_collections_minor + EXCLUDED.total_collections_minor,
              last_updated = CURRENT_TIMESTAMP
          `,
          tenant_id,
          currentTerm,
          amountMinor,
        );
      });
    } catch (err: any) {
      this.logger.error(`Failed to update finance projection for tenant ${tenant_id}: ${err.message}`, err.stack);
      throw err;
    }
  }
}
