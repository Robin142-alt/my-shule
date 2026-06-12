import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { buildSimpleOperationsSchema } from '../implementation100/simple-operations';

const LMS_TABLES = [
  'lms_courses',
  'lms_content_items',
  'lms_assignments',
  'lms_submissions',
  'lms_activity_events',
  'lms_audit_logs',
] as const;

@Injectable()
export class LmsSchemaService implements OnModuleInit {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);
    
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

  private readonly logger = new Logger(LmsSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(buildSimpleOperationsSchema({
      tables: LMS_TABLES,
      mainTable: 'lms_courses',
      auditTable: 'lms_audit_logs',
      relatedTablesSql: `
        CREATE TABLE IF NOT EXISTS lms_content_items (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          course_id uuid,
          title text NOT NULL,
          content_type text NOT NULL,
          publish_status text NOT NULL DEFAULT 'draft',
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS lms_assignments (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          course_id uuid,
          title text NOT NULL,
          due_at timestamptz,
          status text NOT NULL DEFAULT 'open',
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS lms_submissions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          assignment_id uuid,
          student_id uuid NOT NULL,
          status text NOT NULL DEFAULT 'submitted',
          score numeric(8, 2),
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          submitted_by_user_id uuid,
          submitted_at timestamptz NOT NULL DEFAULT NOW(),
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        ALTER TABLE lms_submissions
          ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
        ALTER TABLE lms_submissions
          ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid;
        CREATE TABLE IF NOT EXISTS lms_activity_events (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          course_id uuid,
          actor_user_id uuid,
          event_type text NOT NULL,
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
      `,
      indexesSql: `
        CREATE INDEX IF NOT EXISTS ix_lms_assignments_course_due ON lms_assignments (tenant_id, course_id, due_at);
        CREATE INDEX IF NOT EXISTS ix_lms_submissions_student_assignment ON lms_submissions (tenant_id, student_id, assignment_id, submitted_at DESC);
        CREATE INDEX IF NOT EXISTS ix_lms_activity_events_course ON lms_activity_events (tenant_id, course_id, created_at DESC);
      `,
    }));

    this.logger.log('LMS schema and RLS policies verified');
  }
}
