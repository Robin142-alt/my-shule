import { Controller, Get, Post, Patch, Param, Body, Req } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { UnauthorizedException } from '@nestjs/common';

@Controller('tasks')
export class TaskController {

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

  constructor(private readonly prisma: PrismaService, private readonly db: PrismaService) {}

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

