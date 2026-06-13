import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  AcceptInviteDto,
  ApproveLeaveRequestDto,
  ApproveStaffContractDto,
  ApproveStaffDto,
  ChangeStaffStatusDto,
  CompleteProfileDto,
  GetStaffAttendanceDto,
  InviteStaffDto,
  MarkStaffAttendanceDto,
  ReactivateStaffDto,
  RequestLeaveDto,
  GetLeaveRequestsDto,
  UpdateLeaveStatusDto,
  UploadStaffDocumentDto,
  VerifyStaffDocumentDto,
  CreateDepartmentDto,
  CreateJobTitleDto,
  AssignRoleDto,
  CreatePayrollBandDto,
  SetStaffSalaryDto,
  GeneratePayslipDto,
  CreatePerformanceReviewDto,
  CreateDisciplinaryRecordDto,
} from './dto/hr.dto';
import { HrService } from './hr.service';

@Controller('hr')
@RequiresModule('staff')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get('staff')
  @Permissions('hr:read')
  listStaffDirectory(@Query() query: Record<string, string | undefined>) {
    return this.hrService.listStaffDirectory(query);
  }

  @Post('staff/invite')
  @Permissions('hr:write')
  inviteStaff(@Body() dto: InviteStaffDto) {
    return this.hrService.inviteStaff(dto);
  }

  @Post('staff/accept-invite')
  @Permissions('hr:write')
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.hrService.acceptInvite(dto);
  }

  @Post('staff/complete-profile')
  @Permissions('hr:write')
  completeProfile(@Body() dto: CompleteProfileDto) {
    return this.hrService.completeProfile(dto);
  }

  @Post('staff/approve')
  @Permissions('hr:write')
  approveStaff(@Body() dto: ApproveStaffDto) {
    return this.hrService.approveStaff(dto);
  }

  @Post('staff/reactivate')
  @Permissions('hr:write')
  reactivateStaff(@Body() dto: ReactivateStaffDto) {
    return this.hrService.reactivateStaff(dto);
  }

  @Post('contracts/approve')
  @Permissions('hr:write')
  approveContract(@Body() dto: ApproveStaffContractDto) {
    return this.hrService.approveContract(dto);
  }

  @Get('attendance')
  @Permissions('hr:read')
  getDailyStaffAttendance(@Query() dto: GetStaffAttendanceDto) {
    return this.hrService.getDailyStaffAttendance(dto);
  }

  @Post('attendance')
  @Permissions('hr:write')
  markStaffAttendance(@Body() dto: MarkStaffAttendanceDto) {
    return this.hrService.markStaffAttendance(dto);
  }

  @Get('leave')
  @Permissions('hr:read')
  listLeaveRequests(@Query() dto: GetLeaveRequestsDto) {
    return this.hrService.listLeaveRequests(dto);
  }

  @Post('leave/request')
  @Permissions('hr:write')
  requestLeave(@Body() dto: RequestLeaveDto) {
    return this.hrService.requestLeave(dto);
  }

  @Post('leave/:id/status')
  @Permissions('hr:write')
  updateLeaveStatus(@Param('id') id: string, @Body() dto: UpdateLeaveStatusDto) {
    return this.hrService.updateLeaveStatus(id, dto);
  }

  @Post('leave/approve')
  @Permissions('hr:write')
  approveLeaveLegacy(@Body() dto: ApproveLeaveRequestDto) {
    // Legacy mapping
    return this.hrService.approveLeave(dto);
  }

  @Post('documents')
  @Permissions('hr:write')
  uploadDocument(@Body() dto: UploadStaffDocumentDto) {
    return this.hrService.uploadDocument(dto);
  }

  @Get('documents/:staffId')
  @Permissions('hr:read')
  listDocuments(@Param('staffId') staffId: string) {
    return this.hrService.listDocuments(staffId);
  }

  @Post('documents/:id/verify')
  @Permissions('hr:write')
  verifyDocument(@Param('id') id: string, @Body() dto: VerifyStaffDocumentDto) {
    return this.hrService.verifyDocument(id, dto);
  }

  @Patch('staff/status')
  @Permissions('hr:write')
  changeStaffStatus(@Body() dto: ChangeStaffStatusDto) {
    return this.hrService.changeStaffStatus(dto);
  }


  @Post('departments')
  @Permissions('hr:write')
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.hrService.createDepartment(dto);
  }

  @Get('departments')
  @Permissions('hr:read')
  listDepartments() {
    return this.hrService.listDepartments();
  }

  @Post('job-titles')
  @Permissions('hr:write')
  createJobTitle(@Body() dto: CreateJobTitleDto) {
    return this.hrService.createJobTitle(dto);
  }

  @Get('job-titles')
  @Permissions('hr:read')
  listJobTitles(@Query('department_id') departmentId?: string) {
    return this.hrService.listJobTitles(departmentId);
  }

  @Patch('staff/role')
  @Permissions('hr:write')
  assignRole(@Body() dto: AssignRoleDto) {
    return this.hrService.assignRole(dto);
  }

  @Post('payroll/bands')
  @Permissions('hr:write')
  createPayrollBand(@Body() dto: CreatePayrollBandDto) {
    return this.hrService.createPayrollBand(dto);
  }

  @Get('payroll/bands')
  @Permissions('hr:read')
  listPayrollBands() {
    return this.hrService.listPayrollBands();
  }

  @Patch('staff/salary')
  @Permissions('hr:write')
  setStaffSalary(@Body() dto: SetStaffSalaryDto) {
    return this.hrService.setStaffSalary(dto);
  }

  @Post('payroll/payslips')
  @Permissions('hr:write')
  generatePayslip(@Body() dto: GeneratePayslipDto) {
    return this.hrService.generatePayslip(dto);
  }

  @Get('payroll/payslips')
  @Permissions('hr:read')
  listPayslips(@Query('month') monthStr: string, @Query('year') yearStr: string) {
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    if (isNaN(month) || isNaN(year)) {
      throw new Error('month and year are required query parameters');
    }
    return this.hrService.listPayslips(month, year);
  }

  @Post('performance/reviews')
  @Permissions('hr:write')
  createPerformanceReview(@Body() dto: CreatePerformanceReviewDto) {
    return this.hrService.createPerformanceReview(dto);
  }

  @Get('performance/reviews')
  @Permissions('hr:read')
  listPerformanceReviews(@Query('staff_profile_id') staffProfileId?: string) {
    return this.hrService.listPerformanceReviews(staffProfileId);
  }

  @Post('performance/disciplinary')
  @Permissions('hr:write')
  createDisciplinaryRecord(@Body() dto: CreateDisciplinaryRecordDto) {
    return this.hrService.createDisciplinaryRecord(dto);
  }

  @Get('performance/disciplinary')
  @Permissions('hr:read')
  listDisciplinaryRecords(@Query('staff_profile_id') staffProfileId?: string) {
    return this.hrService.listDisciplinaryRecords(staffProfileId);
  }
}
