import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AccountEntity } from '../entities/account.entity';
import { AccountCategory, EntryDirection } from '../finance.types';

@Injectable()
export class AccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, accountId: string, transactionClient?: any): Promise<AccountEntity | null> {
    const read = async (tx: any) => {
      const account = await tx.ledgerAccount.findUnique({
        where: { id: accountId, schoolId: tenantId },
      });
      return account ? this.mapAccount(account) : null;
    };

    return transactionClient
      ? read(transactionClient)
      : this.prisma.executeWithTenant(tenantId, null, read);
  }

  async findByCode(tenantId: string, accountCode: string, transactionClient?: any): Promise<AccountEntity | null> {
    const read = async (tx: any) => {
      const account = await tx.ledgerAccount.findFirst({
        where: { schoolId: tenantId, code: accountCode },
      });
      return account ? this.mapAccount(account) : null;
    };

    return transactionClient
      ? read(transactionClient)
      : this.prisma.executeWithTenant(tenantId, null, read);
  }

  async findByIds(tenantId: string, accountIds: string[], transactionClient?: any): Promise<AccountEntity[]> {
    const uniqueAccountIds = Array.from(new Set(accountIds));
    if (uniqueAccountIds.length === 0) return [];

    const read = async (tx: any) => {
      const accounts = await tx.ledgerAccount.findMany({
        where: { schoolId: tenantId, id: { in: uniqueAccountIds } },
        orderBy: { id: 'asc' },
      });
      return accounts.map((row: any) => this.mapAccount(row));
    };

    return transactionClient
      ? read(transactionClient)
      : this.prisma.executeWithTenant(tenantId, null, read);
  }

  async lockAccountsByIds(tenantId: string, accountIds: string[], transactionClient?: any): Promise<AccountEntity[]> {
    const uniqueAccountIds = Array.from(new Set(accountIds));
    if (uniqueAccountIds.length === 0) return [];

    const read = async (tx: any) => {
      // Prisma has no native FOR UPDATE on findMany, so we use $queryRaw
      const accounts = await tx.$queryRaw<any[]>`
        SELECT *
        FROM accounts
        WHERE tenant_id = ${tenantId}
          AND id = ANY(${uniqueAccountIds}::uuid[])
        ORDER BY id ASC
        FOR UPDATE
      `;
      return accounts.map((row: any) => this.mapRawAccount(row));
    };

    return transactionClient
      ? read(transactionClient)
      : this.prisma.executeWithTenant(tenantId, null, read);
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
