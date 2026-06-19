import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';

import { Roles } from '../../auth/decorators/roles.decorator';
import { SUPERADMIN_ROLE_OWNER } from '../../auth/auth.constants';
import {
  AnonymizeTenantOffboardingDto,
  CreateSchoolDto,
  DeleteSchoolDto,
  PlatformEmailReadinessResponseDto,
  PlatformSchoolDeleteResponseDto,
  PlatformSchoolResponseDto,
  PlatformTenantProductSummaryDto,
  PlatformTenantAnonymizeResponseDto,
  PlatformTenantOffboardingManifestDto,
  UpdateSchoolBillingDto,
} from './dto/create-school.dto';
import { PlatformOnboardingService } from './platform-onboarding.service';

@Controller('platform')
@Roles(SUPERADMIN_ROLE_OWNER)
export class PlatformOnboardingController {
  constructor(private readonly onboardingService: PlatformOnboardingService) {}

  @Get('schools')
  listSchools(): Promise<PlatformSchoolResponseDto[]> {
    return this.onboardingService.listSchools();
  }

  @Get('schools/summary')
  getProductTenantSummary(): Promise<PlatformTenantProductSummaryDto> {
    return this.onboardingService.getProductTenantSummary();
  }

  @Get('email/readiness')
  getEmailReadiness(): Promise<PlatformEmailReadinessResponseDto> {
    return this.onboardingService.getEmailReadiness();
  }

  @Post('schools')
  createSchool(@Body() dto: CreateSchoolDto): Promise<PlatformSchoolResponseDto> {
    return this.onboardingService.createSchool(dto);
  }

  @Post('schools/:tenantId/admin-invite/resend')
  resendSchoolAdminInvite(
    @Param('tenantId') tenantId: string,
  ): Promise<PlatformSchoolResponseDto> {
    return this.onboardingService.resendSchoolAdminInvite(tenantId);
  }

  @Patch('schools/:tenantId/billing')
  updateSchoolBilling(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateSchoolBillingDto,
  ): Promise<PlatformSchoolResponseDto> {
    return this.onboardingService.updateSchoolBilling(tenantId, dto);
  }

  @Get('schools/:tenantId/offboarding/export')
  exportTenantOffboardingPackage(
    @Param('tenantId') tenantId: string,
  ): Promise<PlatformTenantOffboardingManifestDto> {
    return this.onboardingService.exportTenantOffboardingPackage(tenantId);
  }

  @Post('schools/:tenantId/offboarding/anonymize')
  anonymizeTenantForLegalOffboarding(
    @Param('tenantId') tenantId: string,
    @Body() dto: AnonymizeTenantOffboardingDto,
  ): Promise<PlatformTenantAnonymizeResponseDto> {
    return this.onboardingService.anonymizeTenantForLegalOffboarding(tenantId, dto);
  }

  @Delete('schools/:tenantId')
  deleteSchool(
    @Param('tenantId') tenantId: string,
    @Body() dto: DeleteSchoolDto,
  ): Promise<PlatformSchoolDeleteResponseDto> {
    return this.onboardingService.deleteSchool(tenantId, dto);
  }

  @Delete('schools/:tenantId/hard-delete')
  hardDeleteSchool(
    @Param('tenantId') tenantId: string,
    @Body() dto: DeleteSchoolDto,
  ): Promise<PlatformSchoolDeleteResponseDto> {
    return this.onboardingService.hardDeleteSchool(tenantId, dto);
  }

  @Get('sms-settings')
  getSmsSettings() {
    return this.onboardingService.getSmsSettings();
  }

  @Get('security-policies')
  getSecurityPolicies() {
    return this.onboardingService.getSecurityPolicies();
  }

  @Get('modules')
  getModules() {
    return this.onboardingService.getModules();
  }

  @Get('templates')
  getTemplates() {
    return this.onboardingService.getTemplates();
  }

  @Get('broadcasts')
  getBroadcasts() {
    return this.onboardingService.getBroadcasts();
  }

  @Get('audit-logs')
  getAuditLogs() {
    return this.onboardingService.getAuditLogs();
  }

  @Get('backups')
  getBackups() {
    return this.onboardingService.getBackups();
  }

  @Get('reports')
  getReports() {
    return this.onboardingService.getReports();
  }

  @Get('users')
  getUsers() {
    return this.onboardingService.getUsers();
  }

  @Get('settings')
  getSettings() {
    return this.onboardingService.getSettings();
  }

  @Get('gateways')
  getGateways() {
    return this.onboardingService.getGateways();
  }

  @Post('reports/request')
  requestReport(@Body() body: any) {
    return this.onboardingService.requestReport(body);
  }
}
