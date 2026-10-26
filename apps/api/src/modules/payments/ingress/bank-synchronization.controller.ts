import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../../module-access/module-access.decorator';
import { BankSynchronizationService } from './bank-synchronization.service';

export class BankSyncRequestDto {
  @IsString() @MinLength(5) @MaxLength(1000) reason!:string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) from_date?:string;
}
@Controller('payments/bank-connections')
@RequiresModule('finance')
export class BankSynchronizationController {
  constructor(private readonly banks:BankSynchronizationService) {}
  @Get() @Permissions('billing:read') list() {return this.banks.list();}
  @Post(':id/retrieve') @Permissions('billing:write') retrieve(
    @Param('id',ParseUUIDPipe) id:string,@Body() input:BankSyncRequestDto,
  ) {return this.banks.requestSync(id,input.reason,input.from_date);}
}
