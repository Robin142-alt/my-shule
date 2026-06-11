import { Controller, Get, Post, Patch, Param, Body, Req } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { UnauthorizedException } from '@nestjs/common';

@Controller('tasks')
export class TaskController {
  constructor(private readonly db: DatabaseService) {}

  @Permissions('auth:read')
  @Get()
  async getTasks(@Req() req: any) {
    let tenantId = req.user?.tenantId || req.user?.tenant_id;
    const requestedTenantId = req.headers['x-tenant-id'];
    if (requestedTenantId && requestedTenantId !== tenantId) {
      if (req.user?.role !== 'platform_owner') {
        throw new UnauthorizedException('Cannot access another tenant data');
      }
      tenantId = requestedTenantId;
    }
    const result = await this.db.query(
      `SELECT * FROM dashboard_tasks WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return result.rows;
  }

  @Permissions('auth:read')
  @Post()
  async createTask(@Body() body: any, @Req() req: any) {
    let tenantId = req.user?.tenantId || req.user?.tenant_id;
    const requestedTenantId = req.headers['x-tenant-id'];
    if (requestedTenantId && requestedTenantId !== tenantId) {
      if (req.user?.role !== 'platform_owner') {
        throw new UnauthorizedException('Cannot access another tenant data');
      }
      tenantId = requestedTenantId;
    }
    const result = await this.db.query(
      `INSERT INTO dashboard_tasks (
        tenant_id, target_role, title, description, due_date
      ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tenantId, body.targetRole, body.title, body.description, body.dueDate || null]
    );
    return result.rows[0];
  }

  @Permissions('auth:read')
  @Patch(':id/complete')
  async completeTask(@Param('id') id: string, @Req() req: any) {
    let tenantId = req.user?.tenantId || req.user?.tenant_id;
    const requestedTenantId = req.headers['x-tenant-id'];
    if (requestedTenantId && requestedTenantId !== tenantId) {
      if (req.user?.role !== 'platform_owner') {
        throw new UnauthorizedException('Cannot access another tenant data');
      }
      tenantId = requestedTenantId;
    }
    const result = await this.db.query(
      `UPDATE dashboard_tasks SET status = 'completed', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );
    return result.rows[0];
  }

  @Permissions('auth:read')
  @Patch(':id/assign')
  async assignTask(@Param('id') id: string, @Body('userId') userId: string, @Req() req: any) {
    let tenantId = req.user?.tenantId || req.user?.tenant_id;
    const requestedTenantId = req.headers['x-tenant-id'];
    if (requestedTenantId && requestedTenantId !== tenantId) {
      if (req.user?.role !== 'platform_owner') {
        throw new UnauthorizedException('Cannot access another tenant data');
      }
      tenantId = requestedTenantId;
    }
    const result = await this.db.query(
      `UPDATE dashboard_tasks SET assigned_to_user_id = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId, userId]
    );
    return result.rows[0];
  }
}

