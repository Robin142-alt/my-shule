import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';

import { Roles } from '../../auth/decorators/roles.decorator';
import { SUPERADMIN_ROLE_OWNER } from '../../auth/auth.constants';
import {
  CreateSchoolDto,
  DeleteSchoolDto,
  PlatformEmailReadinessResponseDto,
  PlatformSchoolDeleteResponseDto,
  PlatformSchoolResponseDto,
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

  @Delete('schools/:tenantId')
  deleteSchool(
    @Param('tenantId') tenantId: string,
    @Body() dto: DeleteSchoolDto,
  ): Promise<PlatformSchoolDeleteResponseDto> {
    return this.onboardingService.deleteSchool(tenantId, dto);
  }
}
