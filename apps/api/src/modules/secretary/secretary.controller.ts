import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { RequiresModule } from '../module-access/module-access.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RbacGuard } from '../../guards/rbac.guard';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';

@Controller('api/secretary')
@UseGuards(JwtAuthGuard, RbacGuard)
@RequiresModule('admissions')
export class SecretaryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Get('dashboard')
  @Permissions('secretary:read')
  async getDashboard() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) {
      return {
        metrics: { newAdmissions: 0, pendingInquiries: 0, visitorsToday: 0, activeTasks: 0 },
        quickLinks: [],
        recentActivity: []
      };
    }

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [newAdmissions, pendingInquiries, visitorsToday] = await Promise.all([
        this.prisma.admissionApplication.count({
          where: {
            schoolId: tenantId,
            applicationStatus: { in: ['SUBMITTED', 'INTERVIEW'] }
          }
        }),
        this.prisma.workflowTask.count({
          where: {
            schoolId: tenantId,
            title: { startsWith: 'Inquiry:' },
            status: { not: 'DONE' }
          }
        }),
        this.prisma.visitorLog.count({
          where: {
            schoolId: tenantId,
            timeIn: {
              gte: todayStart,
              lte: todayEnd
            }
          }
        })
      ]);

      return {
        metrics: {
          newAdmissions,
          pendingInquiries,
          visitorsToday,
          activeTasks: pendingInquiries
        },
        quickLinks: [],
        recentActivity: []
      };
    } catch (e) {
      return {
        metrics: { newAdmissions: 0, pendingInquiries: 0, visitorsToday: 0, activeTasks: 0 },
        quickLinks: [],
        recentActivity: []
      };
    }
  }

  @Get('visitors')
  @Permissions('secretary:read')
  async getVisitors() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) return [];

    try {
      const logs = await this.prisma.visitorLog.findMany({
        where: { schoolId: tenantId },
        include: { visitor: true },
        orderBy: { timeIn: 'desc' }
      });

      return logs.map(log => ({
        id: log.id,
        visitor: log.visitor?.fullName || '',
        phoneOrId: log.visitor?.phone || log.visitor?.idNumber || '',
        visiting: log.personToSeeUserId || log.studentToSeeId || '',
        reason: log.purpose,
        vehicle: log.passNumber || '',
        status: log.status === 'CHECKED_OUT' ? 'Exited' : (log.status === 'CHECKED_IN' ? 'Inside' : 'Waiting'),
        checkInTime: log.timeIn.toISOString(),
        slipPrinted: !!log.passNumber,
      }));
    } catch (e) {
      return [];
    }
  }

  @Post('visitors')
  @Permissions('secretary:write')
  async handleVisitors(@Body() body: any) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) return { success: false };

    const { action, id, visitor: visitorData } = body;

    try {
      if (action === 'register_visitor') {
        let visitor = await this.prisma.visitor.findFirst({
          where: {
            schoolId: tenantId,
            fullName: visitorData.visitor,
          }
        });

        if (!visitor) {
          visitor = await this.prisma.visitor.create({
            data: {
              schoolId: tenantId,
              fullName: visitorData.visitor,
              phone: visitorData.phoneOrId,
              idNumber: visitorData.phoneOrId,
            }
          });
        }

        await this.prisma.visitorLog.create({
          data: {
            id: visitorData.id || undefined,
            schoolId: tenantId,
            visitorId: visitor.id,
            purpose: visitorData.reason || '',
            personToSeeUserId: visitorData.visiting || null,
            timeIn: new Date(),
            passNumber: visitorData.vehicle || null,
            recordedByUserId: store.user_id || 'system',
            status: 'CHECKED_IN',
          }
        });
      } else if (action === 'print_slip') {
        await this.prisma.visitorLog.update({
          where: { id },
          data: {
            updatedAt: new Date()
          }
        });
      } else if (action === 'check_out') {
        await this.prisma.visitorLog.update({
          where: { id },
          data: {
            timeOut: new Date(),
            status: 'CHECKED_OUT'
          }
        });
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as any).message };
    }
  }

  @Get('inquiries')
  @Permissions('secretary:read')
  async getInquiries() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) return [];

    try {
      const tasks = await this.prisma.workflowTask.findMany({
        where: {
          schoolId: tenantId,
          title: { startsWith: 'Inquiry:' }
        },
        orderBy: { createdAt: 'desc' }
      });

      return tasks.map(task => {
        try {
          const record = JSON.parse(task.description);
          return { ...record, id: task.id };
        } catch (e) {
          return {
            id: task.id,
            parent: task.title.replace('Inquiry:', '').trim(),
            student: '',
            className: '',
            phone: '',
            issue: task.description,
            department: 'Finance',
            status: 'Waiting',
            smsSent: false,
          };
        }
      });
    } catch (e) {
      return [];
    }
  }

  @Post('inquiries')
  @Permissions('secretary:write')
  async handleInquiries(@Body() body: any) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) return { success: false };

    const { action, id, inquiry } = body;

    try {
      if (action === 'add_inquiry') {
        await this.prisma.workflowTask.create({
          data: {
            id: inquiry.id || undefined,
            schoolId: tenantId,
            title: `Inquiry: ${inquiry.parent}`,
            description: JSON.stringify(inquiry),
            assignedToUserId: store.user_id || 'system',
            createdByUserId: store.user_id || 'system',
            priority: 'NORMAL',
            status: 'TODO',
          }
        });
      } else if (action === 'mark_served') {
        const task = await this.prisma.workflowTask.findUnique({ where: { id } });
        if (task) {
          let record: any = {};
          try {
            record = JSON.parse(task.description);
          } catch (e) {
            record = {
              parent: task.title.replace('Inquiry:', '').trim(),
              student: '',
              className: '',
              phone: '',
              issue: task.description,
              department: 'Finance',
              smsSent: false
            };
          }
          record.status = 'Resolved';
          await this.prisma.workflowTask.update({
            where: { id },
            data: {
              status: 'DONE',
              description: JSON.stringify(record)
            }
          });
        }
      } else if (action === 'send_sms') {
        const task = await this.prisma.workflowTask.findUnique({ where: { id } });
        if (task) {
          let record: any = {};
          try {
            record = JSON.parse(task.description);
          } catch (e) {
            record = {
              parent: task.title.replace('Inquiry:', '').trim(),
              student: '',
              className: '',
              phone: '',
              issue: task.description,
              department: 'Finance',
              status: 'Waiting'
            };
          }
          record.smsSent = true;
          await this.prisma.workflowTask.update({
            where: { id },
            data: {
              description: JSON.stringify(record)
            }
          });
        }
      } else if (action === 'escalate') {
        const task = await this.prisma.workflowTask.findUnique({ where: { id } });
        if (task) {
          let record: any = {};
          try {
            record = JSON.parse(task.description);
          } catch (e) {
            record = {
              parent: task.title.replace('Inquiry:', '').trim(),
              student: '',
              className: '',
              phone: '',
              issue: task.description,
              department: 'Finance',
              smsSent: false
            };
          }
          record.status = 'Escalated';
          await this.prisma.workflowTask.update({
            where: { id },
            data: {
              priority: 'HIGH',
              description: JSON.stringify(record)
            }
          });
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as any).message };
    }
  }
}
