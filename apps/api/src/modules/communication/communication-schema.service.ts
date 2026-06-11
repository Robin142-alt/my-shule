import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class CommunicationSchemaService implements OnModuleInit {
  private readonly logger = new Logger(CommunicationSchemaService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    await this.databaseService.runSchemaBootstrap(`
      CREATE TABLE IF NOT EXISTS communication_sms_outbox (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        recipient_phone text NOT NULL,
        message text NOT NULL,
        status text NOT NULL DEFAULT 'Pending',
        sent_by uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE communication_sms_outbox ENABLE ROW LEVEL SECURITY;
      ALTER TABLE communication_sms_outbox FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS communication_sms_outbox_tenant_policy ON communication_sms_outbox;
      CREATE POLICY communication_sms_outbox_tenant_policy ON communication_sms_outbox
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
    `);

    this.logger.log('Communication schema and RLS policies verified');
  }
}
