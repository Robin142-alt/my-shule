import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

@Injectable()
export class VisitorsSchemaService implements OnModuleInit {
  private readonly logger = new Logger(VisitorsSchemaService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    const schemaSql = `
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      -- Core visitors registry (frequent visitors)
      CREATE TABLE IF NOT EXISTS visitors_registry (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        full_name text NOT NULL,
        phone_number text,
        id_number text,
        visitor_type text NOT NULL DEFAULT 'parent', -- parent, contractor, guest
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      -- Appointments (Scheduled by secretary)
      CREATE TABLE IF NOT EXISTS visitors_appointments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        visitor_id uuid REFERENCES visitors_registry(id),
        visitor_name text NOT NULL,
        host_user_id text NOT NULL,
        purpose text NOT NULL,
        appointment_time timestamptz NOT NULL,
        status text NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled
        created_by_user_id text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      -- Visitor Logs (Security Gate / Reception Check-ins)
      CREATE TABLE IF NOT EXISTS visitors_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        visitor_id uuid REFERENCES visitors_registry(id),
        visitor_name text NOT NULL,
        phone_number text,
        purpose text NOT NULL,
        host_user_id text,
        badge_number text,
        time_in timestamptz NOT NULL DEFAULT NOW(),
        time_out timestamptz,
        status text NOT NULL DEFAULT 'active', -- active, resolved, checked_out
        logged_by_user_id text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      -- Student Exits (Gate Pass)
      CREATE TABLE IF NOT EXISTS student_exits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        student_id text NOT NULL,
        reason text NOT NULL,
        authorized_by_user_id text NOT NULL,
        picked_up_by text,
        time_out timestamptz NOT NULL DEFAULT NOW(),
        time_in timestamptz,
        status text NOT NULL DEFAULT 'out', -- out, returned
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS ix_visitors_registry_tenant ON visitors_registry (tenant_id);
      CREATE INDEX IF NOT EXISTS ix_visitors_appointments_tenant ON visitors_appointments (tenant_id, appointment_time);
      CREATE INDEX IF NOT EXISTS ix_visitors_logs_tenant ON visitors_logs (tenant_id, status);
      CREATE INDEX IF NOT EXISTS ix_student_exits_tenant ON student_exits (tenant_id, status);
    `;

    await this.databaseService.runSchemaBootstrap(schemaSql);
    this.logger.log('Visitor management schema verified');
  }
}
