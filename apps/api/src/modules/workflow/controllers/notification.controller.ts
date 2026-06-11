import { Controller, Get, Patch, Param, Body, Req } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async getNotifications(@Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    const result = await this.db.query(
      `SELECT * FROM notifications WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [tenantId]
    );
    return result.rows;
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    const result = await this.db.query(
      `UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );
    return result.rows[0];
  }
}
