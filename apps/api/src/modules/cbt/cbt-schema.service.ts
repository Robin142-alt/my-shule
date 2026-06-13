import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { buildSimpleOperationsSchema } from '../implementation100/simple-operations';

const CBT_TABLES = [
  'cbt_exam_sessions',
  'cbt_questions',
  'cbt_attempts',
  'cbt_responses',
  'cbt_invigilation_events',
  'cbt_audit_logs',
] as const;

@Injectable()
export class CbtSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(CbtSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(buildSimpleOperationsSchema({
      tables: CBT_TABLES,
      mainTable: 'cbt_exam_sessions',
      auditTable: 'cbt_audit_logs',
      relatedTablesSql: `
        CREATE TABLE IF NOT EXISTS cbt_questions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          session_id uuid,
          question_text text NOT NULL,
          question_type text NOT NULL DEFAULT 'multiple_choice',
          max_score numeric(8, 2) NOT NULL DEFAULT 1,
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS cbt_attempts (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          session_id uuid,
          student_id uuid NOT NULL,
          status text NOT NULL DEFAULT 'started',
          score numeric(8, 2) NOT NULL DEFAULT 0,
          started_at timestamptz NOT NULL DEFAULT NOW(),
          submitted_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS cbt_responses (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          attempt_id uuid,
          question_id uuid,
          response jsonb NOT NULL DEFAULT '{}'::jsonb,
          score numeric(8, 2) NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS cbt_invigilation_events (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          session_id uuid,
          attempt_id uuid,
          event_type text NOT NULL,
          severity text NOT NULL DEFAULT 'info',
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
      `,
      indexesSql: `
        CREATE INDEX IF NOT EXISTS ix_cbt_attempts_session_student ON cbt_attempts (tenant_id, session_id, student_id);
        CREATE INDEX IF NOT EXISTS ix_cbt_invigilation_events_session ON cbt_invigilation_events (tenant_id, session_id, severity);
      `,
    }));

    this.logger.log('CBT schema and RLS policies verified');
  }
}
