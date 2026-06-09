import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface CreateFinanceTaskParams {
  tenantId: string;
  userId: string;
  title: string;
  description: string;
  dueDate: string;
  assignedTo?: string;
}

@Injectable()
export class FinanceTasksService {
  constructor(private readonly db: DatabaseService) {}

  async getTasks(tenantId: string, page?: number, limit?: number, status?: string) {
    let query = `SELECT * FROM finance_tasks WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    if (limit) {
      params.push(limit);
      query += ` LIMIT $${params.length}`;
      if (page && page > 0) {
        const offset = (page - 1) * limit;
        params.push(offset);
        query += ` OFFSET $${params.length}`;
      }
    }

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async createTask(params: CreateFinanceTaskParams) {
    const result = await this.db.query(
      `INSERT INTO finance_tasks (tenant_id, title, description, due_date, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [params.tenantId, params.title, params.description, params.dueDate, params.assignedTo || null, params.userId]
    );
    return result.rows[0];
  }
}
