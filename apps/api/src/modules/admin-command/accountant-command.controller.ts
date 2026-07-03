import { Body, Controller, Get, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { AccountantCommandService } from './accountant-command.service';

@Controller('admin-command/accountant')
@RequiresModule('finance')
@Permissions('finance:read')
export class AccountantCommandController {
  constructor(private readonly service: AccountantCommandService) {}

  @Get('expenses')
  getExpenses() {
    return this.service.getExpenses();
  }

  @Post('actions')
  @Permissions('finance:write')
  recordAction(@Body() dto: any) {
    return this.service.recordAction(dto);
  }
}
