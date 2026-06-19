
import { Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';

import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { SimpleOperationsRecordDto, SimpleOperationsStatusDto } from '../implementation100/simple-operations';
import { RequiresModule } from '../module-access/module-access.decorator';
import { BoardingService } from './boarding.service';

@Controller('boarding')
@RequiresModule('boarding')
export class BoardingController {

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


  @Inject(PrismaService)
  private readonly db!: PrismaService;

  @Inject(RequestContextService)
  private readonly requestContext!: RequestContextService;

  @Inject(SchoolOperationalEventsService)
  private readonly events!: SchoolOperationalEventsService;

  constructor(private readonly prisma: PrismaService, private readonly boardingService: BoardingService) {}

  @Get('dashboard')
  @Permissions('boarding:read')
  getDashboard() {
    return this.boardingService.getDashboard();
  }

  @Post('records')
  @Permissions('boarding:write')
  createRecord(@Body() dto: SimpleOperationsRecordDto) {
    return this.boardingService.createRecord(dto);
  }

  @Patch('records/:recordId/status')
  @Permissions('boarding:write')
  updateRecordStatus(
    @Param('recordId') recordId: string,
    @Body() dto: SimpleOperationsStatusDto,
  ) {
    return this.boardingService.updateStatus(recordId, dto);
  }

  @Post('referral')
  @Permissions('boarding:write')
  async createReferralPhase5(@Body() body: any) {
    const store = this.requestContext.requireStore();
    const result = await this.db.query(
      `INSERT INTO boarding_referrals (tenant_id, school_id, student_id, reason, status) 
       VALUES ($1, $1, $2, $3, $4) RETURNING *`,
      [store.tenant_id, store.tenant_id, body.student_id || null, body.reason || 'Referral', 'pending']
    );
    await this.events.recordSchoolOperation({
      schoolId: store.tenant_id,
      event: { 
        id: result.rows[0].id,
        type: 'boarding.referral.created', 
        module: 'boarding', 
        title: 'New Boarding Referral', 
        body: 'A new boarding referral was created', 
        actorRole: store.role || 'system',
        createdAt: new Date().toISOString()
      }
    });
    return result.rows[0];
  }


  @Get('roll-calls')
  @Permissions('boarding:read')
  async getRollCalls() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id as string;
    try {
      const items = await this.prisma.boardingAttendance.findMany({
        where: { schoolId: tenantId },
        include: { student: true },
      });
      return (items as any[]).map((item) => ({
        id: item.id,
        student: item.student ? `${item.student.firstName} ${item.student.lastName}` : 'Unknown Student',
        className: 'Form 4 East',
        dorm: 'Rusinga House',
        bed: 'Bunk A2',
        status: (item.status as string) === 'present' ? 'Present' : 'Missing',
        parentSmsSent: false,
        lastMarked: item.createdAt.toISOString(),
      }));
    } catch (e) {
      return [];
    }
  }

  @Get('exeats')
  @Permissions('boarding:read')
  async getExeats() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id as string;
    try {
      const tasks = await this.prisma.workflowTask.findMany({
        where: {
          schoolId: tenantId,
          title: {
            startsWith: 'Exeat:',
          },
        },
      });

      return tasks.map((task) => {
        try {
          const record = JSON.parse(task.description);
          return {
            id: task.relatedEntityId || task.id,
            student: record.student || 'Unknown Student',
            dorm: record.dorm || 'Unknown Dorm',
            reason: record.reason || 'No Reason',
            parentPhone: record.parentPhone || '',
            status: record.status || 'Pending',
          };
        } catch (e) {
          return {
            id: task.id,
            student: task.title.replace('Exeat:', '').trim(),
            dorm: 'Unknown Dorm',
            reason: task.description,
            parentPhone: '',
            status: 'Pending',
          };
        }
      });
    } catch (e) {
      return [];
    }
  }

  @Post('exeats')
  @Permissions('boarding:write')
  async handleExeat(@Body() body: any) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id as string;
    const userId = (store.user_id || '00000000-0000-0000-0000-000000000000') as string;
    const { action, request, id } = body;

    if (action === 'add_request') {
      const title = `Exeat: ${request.student}`;
      const description = JSON.stringify(request);
      await this.prisma.workflowTask.create({
        data: {
          schoolId: tenantId,
          title,
          description,
          assignedToUserId: userId,
          createdByUserId: userId,
          priority: 'NORMAL',
          status: 'TODO',
          relatedEntityType: 'Exeat',
          relatedEntityId: request.id as string,
        },
      });
      return { success: true };
    } else if (action === 'approve_request') {
      const task = await this.prisma.workflowTask.findFirst({
        where: {
          schoolId: tenantId,
          relatedEntityType: 'Exeat',
          relatedEntityId: id as string,
        },
      });
      if (task) {
        let record: any = {};
        try {
          record = JSON.parse(task.description);
        } catch (e) {}
        record = { ...record, status: 'Approved' };
        await this.prisma.workflowTask.update({
          where: { id: task.id },
          data: {
            description: JSON.stringify(record),
            status: 'DONE',
          },
        });
      }
      return { success: true };
    } else if (action === 'forward_request') {
      const task = await this.prisma.workflowTask.findFirst({
        where: {
          schoolId: tenantId,
          relatedEntityType: 'Exeat',
          relatedEntityId: id as string,
        },
      });
      if (task) {
        let record: any = {};
        try {
          record = JSON.parse(task.description);
        } catch (e) {}
        record = { ...record, status: 'Forwarded' };
        await this.prisma.workflowTask.update({
          where: { id: task.id },
          data: {
            description: JSON.stringify(record),
            status: 'IN_PROGRESS',
          },
        });
      }
      return { success: true };
    }
    return { success: false, message: 'Invalid action' };
  }
}
