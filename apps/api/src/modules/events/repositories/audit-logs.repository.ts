import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

interface CreateAuditLogInput {
  tenant_id: string;
  actor_user_id: string | null;
  request_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata: Record<string, unknown>;
}

@Injectable()
export class AuditLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  async createAuditLog(input: CreateAuditLogInput): Promise<void> {
    await this.executeSql(
      `
        INSERT INTO audit_logs (
          tenant_id,
          actor_user_id,
          request_id,
          action,
          resource_type,
          resource_id,
          ip_address,
          user_agent,
          metadata
        )
        VALUES (
          $1,
          $2::uuid,
          $3,
          $4,
          $5,
          $6::uuid,
          $7::inet,
          $8,
          $9::jsonb
        )
      `,
      [
        input.tenant_id,
        input.actor_user_id,
        input.request_id,
        input.action,
        input.resource_type,
        input.resource_id,
        input.ip_address ?? null,
        input.user_agent ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }
}
