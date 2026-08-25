import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { buildSimpleOperationsSchema } from '../implementation100/simple-operations';

const ASSET_TABLES = [
  'assets',
  'asset_assignments',
  'asset_repairs',
  'asset_depreciation_entries',
  'facility_issues',
  'asset_audit_logs',
] as const;

@Injectable()
export class AssetsSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(AssetsSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(buildSimpleOperationsSchema({
      tables: ASSET_TABLES,
      mainTable: 'assets',
      auditTable: 'asset_audit_logs',
      relatedTablesSql: `
        CREATE TABLE IF NOT EXISTS asset_assignments (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          asset_id uuid,
          assigned_to_type text NOT NULL,
          assigned_to_id uuid,
          status text NOT NULL DEFAULT 'active',
          assigned_at timestamptz NOT NULL DEFAULT NOW(),
          due_at timestamptz,
          returned_at timestamptz,
          assigned_to_name text,
          department text,
          notes text,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS asset_repairs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          asset_id uuid,
          issue_title text NOT NULL,
          repair_status text NOT NULL DEFAULT 'open',
          technician text,
          scheduled_for date,
          completed_at timestamptz,
          notes text,
          cost_minor bigint NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS asset_depreciation_entries (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          asset_id uuid,
          depreciation_date date NOT NULL DEFAULT CURRENT_DATE,
          book_value_minor bigint NOT NULL DEFAULT 0,
          depreciation_amount_minor bigint NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS facility_issues (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          title text NOT NULL,
          description text,
          location text NOT NULL,
          reported_by_user_id uuid,
          reported_by_name text,
          priority text NOT NULL DEFAULT 'normal',
          status text NOT NULL DEFAULT 'open',
          resolved_at timestamptz,
          resolution_notes text,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS due_at timestamptz;
        ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS assigned_to_name text;
        ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS department text;
        ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS notes text;
        ALTER TABLE asset_repairs ADD COLUMN IF NOT EXISTS technician text;
        ALTER TABLE asset_repairs ADD COLUMN IF NOT EXISTS scheduled_for date;
        ALTER TABLE asset_repairs ADD COLUMN IF NOT EXISTS completed_at timestamptz;
        ALTER TABLE asset_repairs ADD COLUMN IF NOT EXISTS notes text;
      `,
      indexesSql: `
        CREATE INDEX IF NOT EXISTS ix_asset_assignments_asset ON asset_assignments (tenant_id, asset_id, status);
        CREATE INDEX IF NOT EXISTS ix_asset_repairs_status ON asset_repairs (tenant_id, repair_status);
        CREATE INDEX IF NOT EXISTS ix_asset_assignments_due ON asset_assignments (tenant_id, status, due_at);
        CREATE INDEX IF NOT EXISTS ix_facility_issues_status ON facility_issues (tenant_id, status, priority);
      `,
    }));

    this.logger.log('Asset tracking schema and RLS policies verified');
  }
}
