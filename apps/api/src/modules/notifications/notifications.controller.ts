import { Controller, Get, Patch, Param, Query, Body, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Request } from 'express';

// Minimal interface for JWT payload mapping, typically you'd have a custom decorator
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    schoolId: string;
    role: string;
  };
}

@Controller('v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getUserNotifications(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('module') module?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const user = req.user;
    if (!user || !user.schoolId) {
      throw new Error('Unauthorized or no school selected');
    }

    return this.notificationsService.getUserNotifications(user.schoolId, user.id, user.role, {
      status,
      module,
      limit,
      skip,
    });
  }

  @Get('badges')
  async getBadges(@Req() req: AuthenticatedRequest) {
    const user = req.user;
    if (!user || !user.schoolId) {
      return { unreadCount: 0, urgentCount: 0, byModule: {} };
    }

    return this.notificationsService.getBadges(user.schoolId, user.id, user.role);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: AuthenticatedRequest) {
    const user = req.user;
    if (!user || !user.schoolId) {
      throw new Error('Unauthorized');
    }

    return this.notificationsService.markAllAsRead(user.schoolId, user.id, user.role);
  }

  @Patch(':id/read')
  async markAsRead(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const user = req.user;
    if (!user || !user.schoolId) {
      throw new Error('Unauthorized');
    }

    return this.notificationsService.safeMarkAsRead(id, user.schoolId, user.id);
  }

  @Patch(':id/dismiss')
  async dismiss(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const user = req.user;
    if (!user || !user.schoolId) {
      throw new Error('Unauthorized');
    }

    return this.notificationsService.dismiss(id, user.schoolId, user.id);
  }

  @Patch(':id/action-taken')
  async markActionTaken(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const user = req.user;
    if (!user || !user.schoolId) {
      throw new Error('Unauthorized');
    }

    return this.notificationsService.markActionTaken(id, user.schoolId, user.id);
  }
}
