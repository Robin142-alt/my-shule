
import { Inject } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
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

  @Inject(DatabaseService)
  private readonly db!: DatabaseService;

  @Inject(RequestContextService)
  private readonly requestContext!: RequestContextService;

  @Inject(SchoolOperationalEventsService)
  private readonly events!: SchoolOperationalEventsService;

  constructor(private readonly boardingService: BoardingService) {}

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

}
