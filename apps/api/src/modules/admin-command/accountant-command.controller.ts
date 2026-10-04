import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { AccountantCommandService } from './accountant-command.service';
import { CreateAccountantExpenseDto } from './dto/create-accountant-expense.dto';
import { CreateFeeFollowUpDto } from './dto/create-fee-follow-up.dto';
import { DecidePaymentChannelDto } from '../tenant-finance/dto/payment-channel-workflow.dto';

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
  getExpenses(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('status') status?: string,
  ) {
    return this.service.getExpenses(limit, offset, status);
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

  @Post('expenses/:id/decision')
  @Permissions('principal:write')
  decideExpense(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecidePaymentChannelDto) {
    return this.service.decideExpense(id, dto.decision, dto.reason);
  }

  @Post('fee-follow-up')
  @Permissions('finance:follow-up')
  recordFeeFollowUp(@Body() dto: CreateFeeFollowUpDto) {
    return this.service.recordFeeFollowUp(dto);
  }
}
