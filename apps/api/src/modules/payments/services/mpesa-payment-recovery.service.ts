import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RequestContextService } from '../../../common/request-context/request-context.service';
import { PrismaService } from '../../../database/prisma.service';
import { PaymentIntentEntity } from '../entities/payment-intent.entity';
import { MPESA_EXPIRED_PAYMENT_FAILURE_REASON } from '../payments.constants';
import { PaymentIntentsRepository } from '../repositories/payment-intents.repository';

export interface ExpireStaleMpesaPaymentIntentsResult {
  tenant_id: string;
  expired_count: number;
  expired_payment_intent_ids: string[];
}

@Injectable()
export class MpesaPaymentRecoveryService {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);
    
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

  constructor(
    private readonly configService: ConfigService,
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly paymentIntentsRepository: PaymentIntentsRepository,
  ) {}

  async expireStalePaymentIntents(): Promise<ExpireStaleMpesaPaymentIntentsResult> {
    const tenantId = this.requireTenantId();

    return this.prisma.withRequestTransaction(async () => {
      const expiredIntents = await this.paymentIntentsRepository.expireStalePendingIntents(
        tenantId,
        {
          batch_size: Number(
            this.configService.get<number>('mpesa.staleIntentSweepBatchSize') ?? 100,
          ),
          failure_reason: MPESA_EXPIRED_PAYMENT_FAILURE_REASON,
        },
      );

      return {
        tenant_id: tenantId,
        expired_count: expiredIntents.length,
        expired_payment_intent_ids: expiredIntents.map(
          (paymentIntent: PaymentIntentEntity) => paymentIntent.id,
        ),
      };
    });
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.requireStore().tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for MPESA payment recovery');
    }

    return tenantId;
  }
}
