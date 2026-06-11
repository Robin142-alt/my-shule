import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

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
  constructor(private readonly db: DatabaseService) {}

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
