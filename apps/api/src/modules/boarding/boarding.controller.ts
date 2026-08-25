
import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { SimpleOperationsRecordDto, SimpleOperationsStatusDto } from '../implementation100/simple-operations';
import { RequiresModule } from '../module-access/module-access.decorator';
import { BoardingMasterCommandService } from '../admin-command/boarding-master-command.service';
import { BoardingService } from './boarding.service';
import {
  CreateBoardingReferralDto,
  HandleLegacyExeatDto,
  SubmitLegacyBoardingRollCallDto,
} from './dto/legacy-boarding.dto';

@Controller('boarding')
@RequiresModule('boarding')
export class BoardingController {
  constructor(
    private readonly boardingService: BoardingService,
    private readonly boardingMasterCommand: BoardingMasterCommandService,
  ) {}

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
  createReferral(@Body() dto: CreateBoardingReferralDto) {
    return this.boardingService.createReferral(dto);
  }


  @Get('roll-calls')
  @Permissions('boarding:read')
  async getRollCalls() {
    const dashboard = await this.boardingMasterCommand.getBoardingAttendance();
    const items = Array.isArray(dashboard?.boardingattendanceList)
      ? dashboard.boardingattendanceList
      : [];
    return items.map((item: any) => ({
      id: item.id,
      student: Number(item.missing_students || 0) > 0
        ? `${Number(item.missing_students)} missing learner(s)`
        : 'All assigned boarders accounted for',
      className: 'House roll call',
      dorm: item.house_name || 'Unassigned boarding house',
      bed: `${Number(item.expected_students || 0)} expected`,
      status: String(item.status).toLowerCase() === 'attention_required' ? 'Missing' : 'Present',
      parentSmsSent: false,
      lastMarked: item.checked_at,
    }));
  }

  @Post('roll-calls')
  @Permissions('boarding:write')
  submitRollCall(@Body() dto: SubmitLegacyBoardingRollCallDto) {
    return this.boardingMasterCommand.submitRollCall(dto);
  }

  @Get('exeats')
  @Permissions('boarding:read')
  async getExeats() {
    const dashboard = await this.boardingMasterCommand.getLeaveExit();
    const items = Array.isArray(dashboard?.leaveexitList) ? dashboard.leaveexitList : [];
    return items.map((item: any) => ({
      id: item.id,
      student: item.student_name || 'Unassigned learner',
      dorm: item.hostel || 'Unassigned hostel',
      reason: item.reason || 'No reason recorded',
      parentPhone: item.guardian_phone || '',
      status: item.forwarded_at && item.status === 'Pending' ? 'Forwarded' : item.status,
    }));
  }

  @Post('exeats')
  @Permissions('boarding:write')
  handleExeat(@Body() body: HandleLegacyExeatDto) {
    if (body.action === 'add_request') {
      if (!body.request) throw new BadRequestException('Exeat request details are required');
      return this.boardingMasterCommand.createLeaveRequest(body.request);
    }
    if (!body.id) throw new BadRequestException('Leave request ID is required');
    if (body.action === 'approve_request') {
      return this.boardingMasterCommand.actionLeaveRequest(body.id, 'approved');
    }
    return this.boardingMasterCommand.forwardLeaveRequest(body.id);
  }
}
