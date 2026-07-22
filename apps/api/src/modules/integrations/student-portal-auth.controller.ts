import { Body, Controller, Post } from '@nestjs/common';

import { Public } from '../../auth/decorators/public.decorator';
import {
  RequestStudentOtpDto,
  StudentPortalPasswordLoginDto,
  VerifyParentOtpDto,
} from './dto/integrations.dto';
import { ParentPortalAuthService } from './parent-portal-auth.service';

@Public()
@Controller('auth/student')
export class StudentPortalAuthController {
  constructor(private readonly portalAuthService: ParentPortalAuthService) {}

  @Post('otp/request')
  requestOtp(@Body() dto: RequestStudentOtpDto) {
    return this.portalAuthService.requestStudentOtp(dto);
  }

  @Post('login')
  login(@Body() dto: StudentPortalPasswordLoginDto) {
    return this.portalAuthService.loginStudentWithPassword(dto);
  }

  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyParentOtpDto) {
    return this.portalAuthService.verifyStudentOtp(dto);
  }
}
