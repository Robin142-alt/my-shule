import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { LedgerEntryEntity } from '../entities/ledger-entry.entity';
import { AccountBalanceSnapshot, ValidatedLedgerEntry, EntryDirection } from '../finance.types';

@Injectable()
export class LedgerEntriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async insertEntries(
    tenantId: string,
    transactionId: string,
    entries: ValidatedLedgerEntry[],
  ): Promise<LedgerEntryEntity[]> {
    return this.prisma.executeWithTenant(tenantId, null, async (tx) => {
      const createdEntries = await Promise.all(entries.map(entry => 
        tx.ledgerEntry.create({
          data: {
            schoolId: tenantId,
            transactionId: transactionId,
            accountId: entry.account_id,
            lineNumber: entry.line_number,
            direction: entry.direction === 'debit' ? 'debit' : 'credit',
            amountMinor: entry.amount_minor,
            currencyCode: entry.currency_code,
            description: entry.description ?? null,
            metadata: (entry.metadata ?? {}) as any,
          }
        })
      ));

      return createdEntries.map(row => this.mapLedgerEntry(row));
    });
  }

  async calculateBalances(tenantId: string, accountIds: string[]): Promise<Map<string, AccountBalanceSnapshot>> {
    const uniqueAccountIds = Array.from(new Set(accountIds));

    if (uniqueAccountIds.length === 0) {
      return new Map();
    }

    return this.prisma.executeWithTenant(tenantId, null, async (tx) => {
      const result = await tx.$queryRaw<any[]>`
        SELECT
          a.id AS account_id,
          a.code AS account_code,
          a.currency_code,
          a.normal_balance,
          COALESCE(
            SUM(CASE WHEN lower(le.direction::text) = 'debit' THEN le.amount_minor::numeric ELSE 0 END),
            0
          )::text AS debit_total_minor,
          COALESCE(
            SUM(CASE WHEN lower(le.direction::text) = 'credit' THEN le.amount_minor::numeric ELSE 0 END),
            0
          )::text AS credit_total_minor
        FROM accounts a
        LEFT JOIN ledger_entries le
          ON le.tenant_id = a.tenant_id
         AND le.account_id = a.id
        WHERE a.tenant_id = ${tenantId}
          AND a.id = ANY(${uniqueAccountIds}::uuid[])
        GROUP BY a.id, a.code, a.currency_code, a.normal_balance
      `;

      return new Map(
        result.map((row) => [
          row.account_id,
          {
            account_id: row.account_id,
            account_code: row.account_code,
            currency_code: row.currency_code,
            normal_balance: row.normal_balance?.toLowerCase() as EntryDirection,
            debit_total_minor: row.debit_total_minor,
            credit_total_minor: row.credit_total_minor,
            balance_minor: '0',
          },
        ]),
      );
    });
  }

  async findByTransactionId(
    tenantId: string,
    transactionId: string,
  ): Promise<LedgerEntryEntity[]> {
    return this.prisma.executeWithTenant(tenantId, null, async (tx) => {
      const entries = await tx.ledgerEntry.findMany({
        where: { schoolId: tenantId, transactionId },
        orderBy: { lineNumber: 'asc' },
      });
      return entries.map(row => this.mapLedgerEntry(row));
    });
  }

  private mapLedgerEntry(row: any): LedgerEntryEntity {
    return Object.assign(new LedgerEntryEntity(), {
      id: row.id,
      tenant_id: row.schoolId,
      transaction_id: row.transactionId,
      account_id: row.accountId,
      line_number: row.lineNumber,
      direction: row.direction?.toLowerCase() as EntryDirection,
      amount_minor: row.amountMinor,
      currency_code: row.currencyCode,
      description: row.description,
      metadata: (row.metadata && typeof row.metadata === 'object') ? row.metadata : {},
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    });
  }
}
