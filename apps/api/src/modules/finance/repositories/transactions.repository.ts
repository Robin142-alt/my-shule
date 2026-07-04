import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { FinancialTransactionEntity } from '../entities/transaction.entity';

interface CreateTransactionInput {
  tenant_id: string;
  idempotency_key_id: string;
  reference: string;
  description: string;
  currency_code: string;
  total_amount_minor: string;
  entry_count: number;
  effective_at: string | Date;
  posted_at: string | Date;
  created_by_user_id: string | null;
  request_id: string | null;
  metadata: Record<string, unknown>;
}

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async acquireReferenceLock(tenantId: string, reference: string, transactionClient?: any): Promise<void> {
    const lock = async (tx: any) => {
      const lockStr = `finance:transaction:${tenantId}:${reference}`;
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, lockStr);
    };

    await (transactionClient
      ? lock(transactionClient)
      : this.prisma.executeWithTenant(tenantId, null, lock));
  }

  async createTransaction(input: CreateTransactionInput, transactionClient?: any): Promise<FinancialTransactionEntity> {
    const write = async (tx: any) => {
      const transaction = await tx.ledgerTransaction.create({
        data: {
          schoolId: input.tenant_id,
          idempotencyKeyId: input.idempotency_key_id,
          reference: input.reference,
          description: input.description,
          currencyCode: input.currency_code,
          totalAmountMinor: input.total_amount_minor,
          entryCount: input.entry_count,
          effectiveAt: new Date(input.effective_at),
          postedAt: new Date(input.posted_at),
          createdByUserId: input.created_by_user_id,
          requestId: input.request_id,
          metadata: (input.metadata ?? {}) as any,
        },
      });

      return this.mapTransaction(transaction);
    };

    return transactionClient
      ? write(transactionClient)
      : this.prisma.executeWithTenant(input.tenant_id, input.created_by_user_id, write);
  }

  async findByReference(
    tenantId: string,
    reference: string,
    transactionClient?: any,
  ): Promise<FinancialTransactionEntity | null> {
    const read = async (tx: any) => {
      const transaction = await tx.ledgerTransaction.findFirst({
        where: { schoolId: tenantId, reference },
      });
      return transaction ? this.mapTransaction(transaction) : null;
    };

    return transactionClient
      ? read(transactionClient)
      : this.prisma.executeWithTenant(tenantId, null, read);
  }

  private mapTransaction(row: any): FinancialTransactionEntity {
    return Object.assign(new FinancialTransactionEntity(), {
      id: row.id,
      tenant_id: row.schoolId,
      idempotency_key_id: row.idempotencyKeyId,
      reference: row.reference,
      description: row.description,
      currency_code: row.currencyCode,
      total_amount_minor: row.totalAmountMinor,
      entry_count: row.entryCount,
      effective_at: row.effectiveAt,
      posted_at: row.postedAt,
      created_by_user_id: row.createdByUserId,
      request_id: row.requestId,
      metadata: (row.metadata && typeof row.metadata === 'object') ? row.metadata : {},
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    });
  }
}
