import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface SendSmsParams {
  tenantId: string;
  userId: string;
  recipientPhone: string;
  message: string;
}

@Injectable()
export class CommunicationSmsService {
  constructor(private readonly db: DatabaseService) {}

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
