import { Controller, Get, Patch, Param, Body, Req } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { UnauthorizedException } from '@nestjs/common';

@Controller('notifications')
export class NotificationController {

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
  async getNotifications(@Req() req: any) {
    let tenantId = req.user?.tenantId || req.user?.tenant_id;
    const requestedTenantId = req.headers['x-tenant-id'];
    if (requestedTenantId && requestedTenantId !== tenantId) {
      if (req.user?.role !== 'platform_owner') {
        throw new UnauthorizedException('Cannot access another tenant data');
      }
      tenantId = requestedTenantId;
    }
    const result = await this.db.query(
      `SELECT * FROM notifications WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [tenantId]
    );
    return result.rows;
  }

  @Permissions('auth:read')
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    let tenantId = req.user?.tenantId || req.user?.tenant_id;
    const requestedTenantId = req.headers['x-tenant-id'];
    if (requestedTenantId && requestedTenantId !== tenantId) {
      if (req.user?.role !== 'platform_owner') {
        throw new UnauthorizedException('Cannot access another tenant data');
      }
      tenantId = requestedTenantId;
    }
    const result = await this.db.query(
      `UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );
    return result.rows[0];
  }
}

