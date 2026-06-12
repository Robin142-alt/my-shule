import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export interface CreateWorkflowEventInput {
  schoolId: string;
  sourceUserId?: string;
  sourceRole?: string;
  targetRoles: string[];
  eventType: string;
  entityType: string;
  entityId?: string;
  title: string;
  message?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  payload?: any;
}

@Injectable()
export class WorkflowService {

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

  constructor(private readonly prisma: PrismaService, private readonly db: PrismaService) {}

  async createWorkflowEvent(input: CreateWorkflowEventInput) {
    const result = await this.db.query(
      `INSERT INTO workflow_events (
        tenant_id, source_user_id, source_role, target_roles, event_type, 
        entity_type, entity_id, title, message, priority, payload
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) RETURNING *`,
      [
        input.schoolId,
        input.sourceUserId || null,
        input.sourceRole || null,
        JSON.stringify(input.targetRoles),
        input.eventType,
        input.entityType,
        input.entityId || null,
        input.title,
        input.message || null,
        input.priority || 'normal',
        input.payload ? JSON.stringify(input.payload) : '{}',
      ]
    );
    
    return result.rows[0];
  }

  async dispatchWorkflowEvent(eventId: string) {
    // In a real implementation this might publish to a message broker (RabbitMQ/Kafka)
    // or Outbox table for async processing. Here we just update the status to dispatched.
    const result = await this.db.query(
      `UPDATE workflow_events SET status = 'dispatched', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [eventId]
    );
    return result.rows[0];
  }

  async markEventHandled(eventId: string, handledByUserId: string) {
    const result = await this.db.query(
      `UPDATE workflow_events 
       SET status = 'handled', handled_by_user_id = $2, updated_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [eventId, handledByUserId]
    );
    return result.rows[0];
  }
}
