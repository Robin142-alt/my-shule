import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CommunicationSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(CommunicationSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE TABLE IF NOT EXISTS communication_sms_outbox (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        recipient_phone text NOT NULL,
        message text NOT NULL,
        status text NOT NULL DEFAULT 'Pending',
        sent_by uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE communication_sms_outbox DISABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS communication_sms_outbox_tenant_policy ON communication_sms_outbox;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS tenant_id text;
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns c
          WHERE c.table_name = 'communication_sms_outbox'
            AND c.column_name = 'tenant_id'
            AND c.data_type <> 'text'
        ) THEN
          ALTER TABLE communication_sms_outbox
            ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;
      END $$;
      UPDATE communication_sms_outbox
      SET tenant_id = COALESCE(NULLIF(tenant_id, ''), NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')
      WHERE tenant_id IS NULL OR tenant_id = '';
      ALTER TABLE communication_sms_outbox ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000';
      ALTER TABLE communication_sms_outbox ALTER COLUMN tenant_id SET NOT NULL;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS recipient_phone text NOT NULL DEFAULT '';
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS message text NOT NULL DEFAULT '';
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Pending';
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS sent_by uuid;
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT NOW();
      ALTER TABLE communication_sms_outbox ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();

      ALTER TABLE communication_sms_outbox ENABLE ROW LEVEL SECURITY;
      ALTER TABLE communication_sms_outbox FORCE ROW LEVEL SECURITY;

      CREATE POLICY communication_sms_outbox_tenant_policy ON communication_sms_outbox
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
    `);

    this.logger.log('Communication schema and RLS policies verified');
  }
}
