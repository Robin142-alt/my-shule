import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { buildSimpleOperationsSchema } from '../implementation100/simple-operations';

const HOSTEL_TABLES = [
  'hostels',
  'hostel_rooms',
  'hostel_allocations',
  'hostel_issues',
  'hostel_meal_consumption',
  'hostel_audit_logs',
] as const;

@Injectable()
export class HostelSchemaService implements OnModuleInit {
  private readonly logger = new Logger(HostelSchemaService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    await this.databaseService.runSchemaBootstrap(buildSimpleOperationsSchema({
      tables: HOSTEL_TABLES,
      mainTable: 'hostels',
      auditTable: 'hostel_audit_logs',
      relatedTablesSql: `
        CREATE TABLE IF NOT EXISTS hostel_rooms (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          hostel_id uuid,
          room_name text NOT NULL,
          capacity integer NOT NULL DEFAULT 0,
          occupied_count integer NOT NULL DEFAULT 0,
          status text NOT NULL DEFAULT 'available',
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS hostel_allocations (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          hostel_id uuid,
          room_id uuid,
          student_id uuid NOT NULL,
          allocated_from date NOT NULL DEFAULT CURRENT_DATE,
          allocated_to date,
          status text NOT NULL DEFAULT 'active',
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS hostel_issues (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          hostel_id uuid,
          student_id uuid,
          title text NOT NULL,
          severity text NOT NULL DEFAULT 'warning',
          status text NOT NULL DEFAULT 'open',
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS hostel_meal_consumption (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          hostel_id uuid,
          meal_date date NOT NULL DEFAULT CURRENT_DATE,
          meal_type text NOT NULL,
          expected_count integer NOT NULL DEFAULT 0,
          served_count integer NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
      `,
      indexesSql: `
        CREATE INDEX IF NOT EXISTS ix_hostel_allocations_student ON hostel_allocations (tenant_id, student_id, status);
        CREATE INDEX IF NOT EXISTS ix_hostel_meal_consumption_date ON hostel_meal_consumption (tenant_id, meal_date, meal_type);
      `,
    }));

    this.logger.log('Hostel schema and RLS policies verified');
  }
}
