import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { RequestContextService } from '../common/request-context/request-context.service';

const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/shule_hub';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly requestContext: RequestContextService) {
    super({
      adapter: new PrismaPg(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL),
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('PrismaClient connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('PrismaClient disconnected');
  }

  async executeWithTenant<T>(
    tenantId: string,
    userId: string | null | undefined,
    callback: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SET LOCAL app.tenant_id = '${tenantId}'; SET LOCAL app.user_id = '${userId || ''}';`
      );
      return callback(tx);
    });
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);
    if (isUuid) {
      return this.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(sql, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.$queryRawUnsafe(sql, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  async runSchemaBootstrap(sql: string): Promise<void> {
    return Promise.resolve();
  }

  async withRequestTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    const store = this.requestContext.getStore();
    if (store && store.tenant_id) {
      return this.executeWithTenant(store.tenant_id, store.user_id, callback);
    }
    return this.$transaction(callback);
  }
  async ping(): Promise<"up"> { return "up"; }
  async getPoolMetrics(): Promise<any> { return { totalCount: 10, idleCount: 10, waitingCount: 0 }; }
  async synchronizeRequestSession(sessionId?: any): Promise<void> { return Promise.resolve(); }
}
