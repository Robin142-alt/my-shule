import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { buildSimpleOperationsSchema } from '../implementation100/simple-operations';

const AI_INSIGHTS_TABLES = [
  'ai_insight_runs',
  'ai_insight_alerts',
  'ai_forecasts',
  'ai_anomalies',
  'ai_recommendations',
  'ai_insight_audit_logs',
] as const;

@Injectable()
export class AiInsightsSchemaService implements OnModuleInit {
  private readonly logger = new Logger(AiInsightsSchemaService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    await this.databaseService.runSchemaBootstrap(buildSimpleOperationsSchema({
      tables: AI_INSIGHTS_TABLES,
      mainTable: 'ai_insight_runs',
      auditTable: 'ai_insight_audit_logs',
      relatedTablesSql: `
        CREATE TABLE IF NOT EXISTS ai_insight_alerts (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          run_id uuid,
          title text NOT NULL,
          severity text NOT NULL DEFAULT 'warning',
          status text NOT NULL DEFAULT 'open',
          evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS ai_forecasts (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          run_id uuid,
          forecast_type text NOT NULL,
          horizon_days integer NOT NULL DEFAULT 30,
          output jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS ai_anomalies (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          run_id uuid,
          anomaly_type text NOT NULL,
          score numeric(8, 4) NOT NULL DEFAULT 0,
          status text NOT NULL DEFAULT 'open',
          evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
        CREATE TABLE IF NOT EXISTS ai_recommendations (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          run_id uuid,
          title text NOT NULL,
          recommendation_status text NOT NULL DEFAULT 'open',
          rationale jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          audit_log_reference uuid
        );
      `,
      indexesSql: `
        CREATE INDEX IF NOT EXISTS ix_ai_insight_alerts_status ON ai_insight_alerts (tenant_id, status, severity);
        CREATE INDEX IF NOT EXISTS ix_ai_anomalies_status ON ai_anomalies (tenant_id, status, score DESC);
      `,
    }));

    this.logger.log('AI Insights schema and RLS policies verified');
  }
}
