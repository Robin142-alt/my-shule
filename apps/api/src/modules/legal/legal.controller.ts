import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { AllowPendingLegal } from './legal-access.decorator';
import { AcceptLegalDto, GuardianLegalDto, VerifyAuthorityDto, WithdrawGuardianDto, RevokeAuthorityDto } from './legal.dto';
import { LegalService } from './legal.service';
import { LegalVerificationService } from './legal-verification.service';
import { Public } from '../../auth/decorators/public.decorator';
import { currentDocuments } from './legal.service';
import { isDpaActive } from '../../../../../shared/legal/release';
import { isLegalEnforcementActive } from './legal-policy';

@Controller('legal')
export class LegalController {
  constructor(private readonly legal: LegalService, private readonly verification: LegalVerificationService) {}
  // Public document metadata lets deployment verify API/web compatibility without a user session.
  @Get('release') @Public() @Header('Cache-Control', 'no-store')
  release() {
    return { enforcement_active: isLegalEnforcementActive(), dpa_active: isDpaActive(), documents: currentDocuments.map(({ id, sha256, generation }) => ({ id, sha256, generation })) };
  }
  @Get('status') @AllowPendingLegal() @Header('Cache-Control', 'private, no-store')
  status() { return this.legal.status(); }
  @Get('access') @AllowPendingLegal() @Header('Cache-Control', 'private, no-store')
  async access() { return { ready: (await this.legal.status(false)).ready }; }
  @Post('accept') @AllowPendingLegal() @Header('Cache-Control', 'private, no-store')
  accept(@Body() dto: AcceptLegalDto) { return this.legal.accept(dto.selections); }
  @Post('guardian/authorise') @AllowPendingLegal() @Header('Cache-Control', 'private, no-store')
  authorise(@Body() dto: GuardianLegalDto) { return this.legal.authoriseChild(dto.student_id, dto.selections, dto.checked); }
  @Post('guardian/withdraw') @AllowPendingLegal() @Header('Cache-Control', 'private, no-store')
  withdraw(@Body() dto: WithdrawGuardianDto) { return this.legal.withdrawChild(dto.student_id, dto.checked); }
  @Get('verification/candidates') @AllowPendingLegal() @Header('Cache-Control', 'private, no-store')
  candidates(@Query('school_id') schoolId: string) { return this.verification.candidates(schoolId); }
  @Post('verification') @AllowPendingLegal() @Header('Cache-Control', 'private, no-store')
  verify(@Body() dto: VerifyAuthorityDto) { return this.verification.verify(dto); }
  @Post('verification/:id/revoke') @AllowPendingLegal() @Header('Cache-Control', 'private, no-store')
  revoke(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RevokeAuthorityDto) { return this.verification.revoke(dto.school_id, id, dto.checked); }
}
