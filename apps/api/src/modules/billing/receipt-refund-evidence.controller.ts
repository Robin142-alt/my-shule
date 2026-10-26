import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { IsDateString, IsIn, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { ReceiptRefundEvidenceService } from './receipt-refund-evidence.service';

export class RecordReceiptRefundDto {
  @IsUUID() receipt_id!:string;
  @IsIn(['manual','stk']) source_kind!:'manual'|'stk';
  @Matches(/^[1-9]\d{0,18}$/) amount_minor!:string;
  @IsString() @MinLength(3) @MaxLength(100) external_reference!:string;
  @IsString() @MinLength(10) @MaxLength(1000) evidence_reference!:string;
  @IsDateString() paid_at!:string;
  @IsString() @MinLength(5) @MaxLength(1000) reason!:string;
}
export class DecideReceiptRefundDto {
  @IsIn(['approve','reject']) decision!:'approve'|'reject';
  @IsString() @MinLength(5) @MaxLength(1000) reason!:string;
}
@Controller('billing/refund-evidence')
@RequiresModule('finance')
export class ReceiptRefundEvidenceController {
  constructor(private readonly refunds:ReceiptRefundEvidenceService) {}
  @Get() @Permissions('billing:read')
  list(@Query('offset') offset?:string){return this.refunds.list(offset===undefined?0:Number(offset));}
  @Post() @Permissions('billing:write')
  request(@Body() dto:RecordReceiptRefundDto){return this.refunds.request(dto);}
  @Post(':id/decision') @Permissions('billing:write')
  decide(@Param('id',ParseUUIDPipe) id:string,@Body() dto:DecideReceiptRefundDto){return this.refunds.decide(id,dto.decision,dto.reason);}
}
