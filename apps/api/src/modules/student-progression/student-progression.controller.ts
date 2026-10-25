import { Body, Controller, Get, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { AgpExecutionService } from '../../common/platform-governance/agp-execution.service';
import { RequiresModule } from '../module-access/module-access.decorator';
import { ProgressionEngine } from './student-progression.service';
import { ProgressionApprovalDto, ProgressionCommandDto, ProgressionQueryDto, ProgressionRunDto } from './progression.dto';
@Controller('academics/progression')
@RequiresModule('academics')
@Roles('principal','school_admin','deputy_principal','dean_academics')
export class StudentProgressionController {
  constructor(private readonly engine:ProgressionEngine,private readonly context:RequestContextService,private readonly agp:AgpExecutionService) {}
  private actor() {
    const ctx=this.context.requireStore();
    if(!ctx.is_authenticated||!ctx.tenant_id||!ctx.user_id) throw new UnauthorizedException('Sign in to your school to manage student progression.');
    return {tenantId:ctx.tenant_id,userId:ctx.user_id,role:ctx.role??'',permissions:ctx.permissions};
  }
  @Get() @Permissions('academics:read') overview(@Query() input:ProgressionQueryDto) {return this.engine.overview(this.actor(),input);}
  @Get('students/:id') @Permissions('academics:read') detail(@Param('id') id:string) {return this.engine.detail(this.actor(),id);}
  @Post('commands') @Permissions('academics:manage-lifecycle') command(@Body() input:ProgressionCommandDto) {
    const actor=this.actor();return this.agp.execute({actionName:`STUDENT_PROGRESSION_${input.action.toUpperCase()}`,requiredCapability:'academics:manage-lifecycle',
      aggregateType:'student_progression',aggregateId:input.request_id,governanceRecordedInHandler:true,retrySafe:true,handler:()=>this.engine.command(actor,input)});
  }
  @Post('run') @Permissions('academics:manage-lifecycle') run(@Body() input:ProgressionRunDto) {
    const actor=this.actor();return this.agp.execute({actionName:'STUDENT_PROGRESSION_RETRY',requiredCapability:'academics:manage-lifecycle',aggregateType:'academic_year',
      aggregateId:input.academic_year_id,retrySafe:true,handler:()=>this.engine.runYear(actor,input.academic_year_id)});
  }
  @Post('approvals/:id') @Permissions('academics:manage-lifecycle') approve(@Param('id') id:string,@Body() input:ProgressionApprovalDto) {
    const actor=this.actor();return this.agp.execute({actionName:'STUDENT_PROGRESSION_APPROVAL',requiredCapability:'academics:manage-lifecycle',aggregateType:'student_progression_approval',
      aggregateId:id,governanceRecordedInHandler:true,retrySafe:true,handler:()=>this.engine.decideApproval(actor,id,input.decision,input.reason)});
  }
}
