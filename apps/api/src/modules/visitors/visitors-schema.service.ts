import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { buildSimpleOperationsSchema } from '../implementation100/simple-operations';

const VISITOR_TABLES = [
  'visitor_checkins',
  'visitor_appointments',
  'visitor_badges',
  'visitor_emergency_logs',
  'visitor_audit_logs',
] as const;

@Injectable()
export class VisitorsSchemaService implements OnModuleInit {
  private readonly logger = new Logger(VisitorsSchemaService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    await this.databaseService.runSchemaBootstrap(buildSimpleOperationsSchema({
      tables: VISITOR_TABLES,
      mainTable: 'visitor_checkins',
      auditTable: 'visitor_audit_logs',
      relatedTablesSql: `
        CREATE TABLE IF NOT EXISTS visitor_appointments (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          visitor_name text NOT NULL,
          host_user_id uuid,
          appointment_at timestamptz NOT NULL,
          status text NOT NULL DEFAULT 'scheduled',
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS visitor_badges (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          checkin_id uuid,
          badge_number text NOT NULL,
          status text NOT NULL DEFAULT 'issued',
          issued_at timestamptz NOT NULL DEFAULT NOW(),
          returned_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS visitor_emergency_logs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          checkin_id uuid,
          event_type text NOT NULL,
          severity text NOT NULL DEFAULT 'warning',
          notes text,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
      `,
      indexesSql: `
        CREATE INDEX IF NOT EXISTS ix_visitor_appointments_time ON visitor_appointments (tenant_id, appointment_at, status);
        CREATE INDEX IF NOT EXISTS ix_visitor_badges_status ON visitor_badges (tenant_id, status);
      `,
    }));

    this.logger.log('Visitor management schema and RLS policies verified');
  }
}
