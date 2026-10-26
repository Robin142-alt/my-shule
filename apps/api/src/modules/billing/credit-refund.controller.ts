import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { IsDateString, IsIn, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { CreditRefundService } from './credit-refund.service';

export class RequestCreditRefundDto {
  @IsUUID() source_id!:string;
  @IsUUID() idempotency_key!:string;
  @IsIn(['manual','online']) source_kind!:'manual'|'online';
  @Matches(/^[1-9]\d{0,18}$/) amount_minor!:string;
  @IsString() @MinLength(5) @MaxLength(1000) reason!:string;
}
export class DecideCreditRefundDto {
  @IsIn(['approve','reject','cancel']) decision!:'approve'|'reject'|'cancel';
  @IsString() @MinLength(5) @MaxLength(1000) reason!:string;
}
export class CompleteCreditRefundDto {
  @IsString() @MinLength(3) @MaxLength(100) external_reference!:string;
  @IsString() @MinLength(10) @MaxLength(1000) evidence_reference!:string;
  @IsDateString() paid_at!:string;
}
@Controller('billing/credit-refunds')
@RequiresModule('finance')
export class CreditRefundController {
  constructor(private readonly refunds:CreditRefundService) {}
  @Get() @Permissions('billing:read')
  list(@Query('offset') offset?:string){return this.refunds.list(offset===undefined?0:Number(offset));}
  @Get('sources/:studentId') @Permissions('billing:read')
  sources(@Param('studentId') studentId:string){return this.refunds.sources(studentId);}
  @Post() @Permissions('billing:write')
  request(@Body() dto:RequestCreditRefundDto){return this.refunds.request(dto);}
  @Post(':id/decision') @Permissions('billing:write')
  decide(@Param('id',ParseUUIDPipe) id:string,@Body() dto:DecideCreditRefundDto){return this.refunds.decide(id,dto.decision,dto.reason);}
  @Post(':id/payout') @Permissions('billing:write')
  complete(@Param('id',ParseUUIDPipe) id:string,@Body() dto:CompleteCreditRefundDto){return this.refunds.complete(id,dto);}
}
