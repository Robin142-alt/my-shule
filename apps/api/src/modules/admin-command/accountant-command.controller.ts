import { Body, Controller, Get, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { AccountantCommandService } from './accountant-command.service';
import { CreateAccountantExpenseDto } from './dto/create-accountant-expense.dto';
import { CreateFeeFollowUpDto } from './dto/create-fee-follow-up.dto';

@Controller('admin-command/accountant')
@RequiresModule('finance')
@Permissions('finance:read')
export class AccountantCommandController {
  constructor(private readonly service: AccountantCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('expenses')
  getExpenses() {
    return this.service.getExpenses();
  }

  @Post('expenses')
  @Permissions('finance:write')
  createExpense(@Body() dto: CreateAccountantExpenseDto) {
    return this.service.createExpense(dto);
  }

  @Post('actions')
  @Permissions('finance:write')
  recordAction(@Body() dto: any) {
    return this.service.recordAction(dto);
  }

  @Post('fee-follow-up')
  @Permissions('finance:follow-up')
  recordFeeFollowUp(@Body() dto: CreateFeeFollowUpDto) {
    return this.service.recordFeeFollowUp(dto);
  }
}
