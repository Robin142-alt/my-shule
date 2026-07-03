import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { buildSimpleOperationsSchema } from '../implementation100/simple-operations';

const BOARDING_TABLES = [
  'boarding_houses',
  'boarding_students',
  'boarding_meals',
  'boarding_dormitory_checks',
  'boarding_incidents',
  'boarding_reports',
  'boarding_audit_logs',
] as const;

@Injectable()
export class BoardingSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(BoardingSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(buildSimpleOperationsSchema({
      tables: BOARDING_TABLES,
      mainTable: 'boarding_houses',
      auditTable: 'boarding_audit_logs',
      relatedTablesSql: `
        CREATE TABLE IF NOT EXISTS boarding_students (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          house_id uuid,
          student_id uuid NOT NULL,
          bed_label text,
          status text NOT NULL DEFAULT 'active',
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS boarding_meals (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          house_id uuid,
          meal_date date NOT NULL DEFAULT CURRENT_DATE,
          meal_type text NOT NULL,
          planned_count integer NOT NULL DEFAULT 0,
          consumed_count integer NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS boarding_dormitory_checks (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          house_id uuid,
          checked_by_user_id uuid,
          check_status text NOT NULL DEFAULT 'clear',
          notes text,
          checked_at timestamptz NOT NULL DEFAULT NOW(),
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS boarding_incidents (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          house_id uuid,
          student_id uuid,
          title text NOT NULL,
          severity text NOT NULL DEFAULT 'warning',
          status text NOT NULL DEFAULT 'open',
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS boarding_reports (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          report_type text NOT NULL,
          status text NOT NULL DEFAULT 'queued',
          generated_by_user_id text,
          generated_from text,
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
      `,
      indexesSql: `
        CREATE INDEX IF NOT EXISTS ix_boarding_students_house ON boarding_students (tenant_id, house_id, status);
        CREATE INDEX IF NOT EXISTS ix_boarding_meals_date ON boarding_meals (tenant_id, meal_date, meal_type);
        CREATE INDEX IF NOT EXISTS ix_boarding_reports_tenant_status ON boarding_reports (tenant_id, status, created_at DESC);
      `,
    }));

    this.logger.log('Boarding schema and RLS policies verified');
  }
}
