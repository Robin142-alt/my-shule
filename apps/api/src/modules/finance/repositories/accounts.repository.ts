import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AccountEntity } from '../entities/account.entity';
import { AccountCategory, EntryDirection } from '../finance.types';

@Injectable()
export class AccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, accountId: string): Promise<AccountEntity | null> {
    return this.prisma.executeWithTenant(tenantId, null, async (tx) => {
      const account = await tx.ledgerAccount.findUnique({
        where: { id: accountId, schoolId: tenantId },
      });
      return account ? this.mapAccount(account) : null;
    });
  }

  async findByCode(tenantId: string, accountCode: string): Promise<AccountEntity | null> {
    return this.prisma.executeWithTenant(tenantId, null, async (tx) => {
      const account = await tx.ledgerAccount.findFirst({
        where: { schoolId: tenantId, code: accountCode },
      });
      return account ? this.mapAccount(account) : null;
    });
  }

  async findByIds(tenantId: string, accountIds: string[]): Promise<AccountEntity[]> {
    const uniqueAccountIds = Array.from(new Set(accountIds));
    if (uniqueAccountIds.length === 0) return [];

    return this.prisma.executeWithTenant(tenantId, null, async (tx) => {
      const accounts = await tx.ledgerAccount.findMany({
        where: { schoolId: tenantId, id: { in: uniqueAccountIds } },
        orderBy: { id: 'asc' },
      });
      return accounts.map((row) => this.mapAccount(row));
    });
  }

  async lockAccountsByIds(tenantId: string, accountIds: string[]): Promise<AccountEntity[]> {
    const uniqueAccountIds = Array.from(new Set(accountIds));
    if (uniqueAccountIds.length === 0) return [];

    return this.prisma.executeWithTenant(tenantId, null, async (tx) => {
      // Prisma has no native FOR UPDATE on findMany, so we use $queryRaw
      const accounts = await tx.$queryRaw<any[]>`
        SELECT *
        FROM accounts
        WHERE tenant_id = ${tenantId}::uuid
          AND id = ANY(${uniqueAccountIds}::uuid[])
        ORDER BY id ASC
        FOR UPDATE
      `;
      return accounts.map((row) => this.mapRawAccount(row));
    });
  }

  private mapAccount(row: any): AccountEntity {
    return Object.assign(new AccountEntity(), {
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category?.toLowerCase() as AccountCategory,
      normal_balance: row.normalBalance?.toLowerCase() as EntryDirection,
      currency_code: row.currencyCode,
      allow_manual_entries: row.allowManualEntries,
      is_active: row.isActive,
      metadata: (row.metadata && typeof row.metadata === 'object') ? row.metadata : {},
    });
  }

  private mapRawAccount(row: any): AccountEntity {
    return Object.assign(new AccountEntity(), {
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category?.toLowerCase() as AccountCategory,
      normal_balance: row.normal_balance?.toLowerCase() as EntryDirection,
      currency_code: row.currency_code,
      allow_manual_entries: row.allow_manual_entries,
      is_active: row.is_active,
      metadata: (row.metadata && typeof row.metadata === 'object') ? row.metadata : {},
    });
  }
}
