import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
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

  private readonly logger = new Logger(AiInsightsSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(buildSimpleOperationsSchema({
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
