import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationStatus, NotificationPriority, NotificationChannel, NotificationDeliveryStatus } from '@prisma/client';

export interface CreateNotificationDto {
  schoolId: string;
  actorUserId?: string;
  targetUserId?: string;
  targetRole?: string;
  module: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  title: string;
  message: string;
  priority?: NotificationPriority;
  actionUrl?: string;
  actionLabel?: string;
  metadataJson?: any;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createNotification(data: CreateNotificationDto) {
    try {
      // 1. Check deduplication: if there's already an unresolved notification for the same entity and event type
      if (data.entityType && data.entityId) {
        const existing = await this.prisma.notification.findFirst({
          where: {
            schoolId: data.schoolId,
            module: data.module,
            eventType: data.eventType,
            entityType: data.entityType,
            entityId: data.entityId,
            status: { in: ['UNREAD', 'READ', 'ACTION_REQUIRED'] },
            ...(data.targetUserId ? { targetUserId: data.targetUserId } : {}),
            ...(data.targetRole ? { targetRole: data.targetRole } : {}),
          },
        });

        if (existing) {
          // Update the existing notification instead of creating a duplicate
          return this.prisma.notification.update({
            where: { id: existing.id },
            data: {
              title: data.title,
              message: data.message,
              metadataJson: data.metadataJson ? (data.metadataJson as any) : undefined,
              updatedAt: new Date(),
            } as any,
          });
        }
      }

      // 2. Fetch target notification rule
      const rule = await this.prisma.notificationRule.findFirst({
        where: {
          schoolId: data.schoolId,
          module: data.module,
          eventType: data.eventType,
          isActive: true,
        },
      });

      const priority = data.priority || (rule ? rule.priority : NotificationPriority.NORMAL);

      // Determine initial status based on if it's an actionable notification
      const isActionable = !!data.actionUrl;
      const initialStatus = isActionable ? NotificationStatus.ACTION_REQUIRED : NotificationStatus.UNREAD;

      // 3. Create Notification
      const notification = await this.prisma.notification.create({
        data: {
          schoolId: data.schoolId,
          actorUserId: data.actorUserId,
          targetUserId: data.targetUserId,
          targetRole: data.targetRole,
          module: data.module,
          eventType: data.eventType,
          entityType: data.entityType,
          entityId: data.entityId,
          channel: NotificationChannel.IN_APP, // default, though rules dictate delivery
          title: data.title,
          message: data.message,
          priority,
          status: initialStatus,
          actionUrl: data.actionUrl,
          actionLabel: data.actionLabel,
          metadataJson: data.metadataJson ? (data.metadataJson as any) : null,
        },
      });

      // 4. Create Deliveries based on Rule/Preferences
      // Simplified: If there are channels specified in rule, create delivery records
      if (rule && rule.channelsJson && Array.isArray(rule.channelsJson)) {
        for (const channel of rule.channelsJson) {
          if (channel !== 'IN_APP') {
             // In a real app, we'd check preferences here
             await this.prisma.notificationDelivery.create({
               data: {
                 notificationId: notification.id,
                 schoolId: data.schoolId,
                 channel: channel as NotificationChannel,
                 recipient: data.targetUserId || data.targetRole || 'unknown',
                 status: NotificationDeliveryStatus.QUEUED,
               }
             });
          }
        }
      }

      return notification;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  async getUserNotifications(schoolId: string, userId: string, role: string, query: any = {}) {
    const where: any = {
      schoolId,
      OR: [
        { targetUserId: userId },
        { targetRole: role },
      ],
    };

    if (query.status) {
      if (query.status === 'UNREAD') {
        where.status = { in: ['UNREAD', 'ACTION_REQUIRED'] };
      } else {
        where.status = query.status;
      }
    }

    if (query.module) {
      where.module = query.module;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit ? parseInt(query.limit) : 50,
      skip: query.skip ? parseInt(query.skip) : 0,
    });
  }

  async getBadges(schoolId: string, userId: string, role: string) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        schoolId,
        OR: [
          { targetUserId: userId },
          { targetRole: role },
        ],
        status: { in: ['UNREAD', 'ACTION_REQUIRED'] },
      },
      select: { module: true, status: true, priority: true }
    });

    const unreadCount = notifications.length;
    const urgentCount = notifications.filter(n => n.priority === 'URGENT').length;
    
    // Group by module
    const byModule = notifications.reduce((acc, curr) => {
      acc[curr.module] = (acc[curr.module] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      unreadCount,
      urgentCount,
      byModule,
    };
  }

  async markAsRead(id: string, schoolId: string) {
    return this.prisma.notification.update({
      where: { id_schoolId: { id, schoolId } } as any, // fallback if composite not defined, but here we can just use id and check schoolId
      data: { status: 'READ', readAt: new Date() }
    });
  }
  
  async safeMarkAsRead(id: string, schoolId: string, userId: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.schoolId !== schoolId || (notif.targetUserId && notif.targetUserId !== userId)) {
      throw new Error('Not found or unauthorized');
    }
    
    if (notif.status === 'UNREAD') {
      return this.prisma.notification.update({
        where: { id },
        data: { status: 'READ', readAt: new Date() }
      });
    }
    return notif;
  }

  async markAllAsRead(schoolId: string, userId: string, role: string) {
    return this.prisma.notification.updateMany({
      where: {
        schoolId,
        OR: [
          { targetUserId: userId },
          { targetRole: role },
        ],
        status: 'UNREAD',
      },
      data: { status: 'READ', readAt: new Date() },
    });
  }

  async dismiss(id: string, schoolId: string, userId: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.schoolId !== schoolId || (notif.targetUserId && notif.targetUserId !== userId)) {
      throw new Error('Not found or unauthorized');
    }
    
    return this.prisma.notification.update({
      where: { id },
      data: { status: 'DISMISSED', dismissedAt: new Date() }
    });
  }

  async markActionTaken(id: string, schoolId: string, userId: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.schoolId !== schoolId || (notif.targetUserId && notif.targetUserId !== userId)) {
      throw new Error('Not found or unauthorized');
    }
    
    return this.prisma.notification.update({
      where: { id },
      data: { status: 'ACTION_TAKEN' }
    });
  }
}
