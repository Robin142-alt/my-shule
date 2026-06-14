import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { AgpExecutionService } from '../../common/platform-governance/agp-execution.service';

export interface SendSmsParams {
  tenantId: string;
  userId: string;
  recipientPhone: string;
  message: string;
}

@Injectable()
export class CommunicationSmsService {

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly db: PrismaService,
    private readonly eventPublisher?: EventPublisherService,
    private readonly agp?: AgpExecutionService,
  ) {}

  async sendSms(params: SendSmsParams) {
    if (!this.agp) throw new Error('AGP Execution Service is required for this operation');

    return this.agp.execute({
      actionName: 'SMS_QUEUED',
      requiredCapability: 'school_sms:send',
      aggregateType: 'COMMUNICATION',
      aggregateId: params.recipientPhone,
      eventName: 'communication.sms.queued',
      eventPayload: {
        tenant_id: params.tenantId,
        sms_id: 'pending', // Will be filled properly downstream, or we could just use recipient
        recipient_phone: params.recipientPhone,
        message: params.message,
        sent_by: params.userId,
      },
      handler: async () => {
        const result = await this.db.query(
          `INSERT INTO communication_sms_outbox (
             tenant_id, 
             recipient_phone, 
             message, 
             status, 
             sent_by
           ) VALUES ($1, $2, $3, 'Pending', $4) RETURNING *`,
          [params.tenantId, params.recipientPhone, params.message, params.userId]
        );

        const smsId = result.rows[0].id;

        return { success: true, messageId: smsId, status: result.rows[0].status };
      },
      fallback: async (error) => {
        // Fallback behaviour: Record it failed, but return degradation gracefully
        return { success: false, messageId: 'FALLBACK', status: 'Failed' };
      }
    });
  }

  async getSms(tenantId: string) {
    const result = await this.db.query(
      `SELECT * FROM communication_sms_outbox WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return { data: result.rows };
  }
}
