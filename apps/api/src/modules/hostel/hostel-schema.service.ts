import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
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

  private readonly logger = new Logger(HostelSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(buildSimpleOperationsSchema({
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
