import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

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

  constructor(private readonly prisma: PrismaService, private readonly db: PrismaService) {}

  async sendSms(params: SendSmsParams) {
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
    return { success: true, messageId: result.rows[0].id, status: result.rows[0].status };
  }
}
