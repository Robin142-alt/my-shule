import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
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
  private readonly logger = new Logger(LmsSchemaService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    await this.databaseService.runSchemaBootstrap(buildSimpleOperationsSchema({
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
          submitted_at timestamptz NOT NULL DEFAULT NOW(),
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
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
        CREATE INDEX IF NOT EXISTS ix_lms_activity_events_course ON lms_activity_events (tenant_id, course_id, created_at DESC);
      `,
    }));

    this.logger.log('LMS schema and RLS policies verified');
  }
}
