import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ComplianceService } from './compliance.service';
import { BreachResponseReportExportDto } from './dto/breach-response-report.dto';
import { ConsentRecordResponseDto } from './dto/consent-record-response.dto';
import { DataExportResponseDto } from './dto/data-export-response.dto';
import {
  CompleteDataSubjectRequestDto,
  DataSubjectRequestResponseDto,
  ReviewDataSubjectRequestDto,
  SubmitDataSubjectRequestDto,
  VerifyDataSubjectRequestIdentityDto,
} from './dto/data-subject-request.dto';
import { DeleteAccountResponseDto } from './dto/delete-account-response.dto';
import { RecordConsentDto } from './dto/record-consent.dto';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('me/export')
  @Permissions('auth:read')
  async exportMyData(): Promise<DataExportResponseDto> {
    return this.complianceService.exportMyData();
  }

  @Get('me/consents')
  @Permissions('auth:read')
  async listMyConsents(): Promise<ConsentRecordResponseDto[]> {
    return this.complianceService.listMyConsents();
  }

  @Post('me/consents')
  @Permissions('auth:read')
  async recordMyConsent(@Body() dto: RecordConsentDto): Promise<ConsentRecordResponseDto> {
    return this.complianceService.recordMyConsent(dto);
  }

  @Delete('me')
  @Permissions('auth:read')
  async deleteMyAccount(): Promise<DeleteAccountResponseDto> {
    return this.complianceService.deleteMyAccount();
  }

  @Post('data-subject-requests')
  @Permissions('compliance:write')
  async submitDataSubjectRequest(
    @Body() dto: SubmitDataSubjectRequestDto,
  ): Promise<DataSubjectRequestResponseDto> {
    return this.complianceService.submitDataSubjectRequest(dto);
  }

  @Post('data-subject-requests/:requestId/identity-verification')
  @Permissions('compliance:write')
  async verifyDataSubjectRequestIdentity(
    @Param('requestId') requestId: string,
    @Body() dto: VerifyDataSubjectRequestIdentityDto,
  ): Promise<DataSubjectRequestResponseDto> {
    return this.complianceService.verifyDataSubjectRequestIdentity(requestId, dto);
  }

  @Post('data-subject-requests/:requestId/review')
  @Permissions('compliance:write')
  async reviewDataSubjectRequest(
    @Param('requestId') requestId: string,
    @Body() dto: ReviewDataSubjectRequestDto,
  ): Promise<DataSubjectRequestResponseDto> {
    return this.complianceService.reviewDataSubjectRequest(requestId, dto);
  }

  @Post('data-subject-requests/:requestId/complete')
  @Permissions('compliance:write')
  async completeDataSubjectRequest(
    @Param('requestId') requestId: string,
    @Body() dto: CompleteDataSubjectRequestDto,
  ): Promise<DataSubjectRequestResponseDto> {
    return this.complianceService.completeDataSubjectRequest(requestId, dto);
  }

  @Get('breach-response-reports/:reportId/export')
  @Permissions('compliance:read')
  async exportBreachResponseReport(
    @Param('reportId') reportId: string,
  ): Promise<BreachResponseReportExportDto> {
    return this.complianceService.exportBreachResponseReport(reportId);
  }
}
