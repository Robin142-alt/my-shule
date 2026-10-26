import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { SuspendPaymentChannelDto } from '../../tenant-finance/dto/payment-channel-workflow.dto';

import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../../module-access/module-access.decorator';
import { CreatePaymentIntentDto } from '../dto/create-payment-intent.dto';
import {
  GenerateMpesaReconciliationRangeReportDto,
  GenerateMpesaReconciliationReportDto,
  ListMpesaReconciliationReviewDto,
  RequestFinanceApprovalDto,
} from '../dto/generate-mpesa-reconciliation-report.dto';
import { PaymentIntentResponseDto } from '../dto/payment-intent-response.dto';
import {
  MpesaReconciliationProcessorResult,
  MpesaReconciliationRangeReport,
  MpesaReconciliationReport,
} from '../payments.types';
import { MpesaReconciliationService } from '../services/mpesa-reconciliation.service';
import { MpesaService } from '../services/mpesa.service';

@Controller('payments/mpesa')
@RequiresModule('finance')
export class PaymentsController {
  constructor(
    private readonly mpesaService: MpesaService,
    private readonly mpesaReconciliationService: MpesaReconciliationService,
  ) {}

  @Post('payment-intents')
  @Permissions('payments:create')
  async createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
  ): Promise<PaymentIntentResponseDto> {
    return this.mpesaService.createPaymentIntent(dto);
  }

  @Get('reconciliation/daily')
  @Permissions('billing:read')
  async getDailyReconciliationReport(
    @Query() query: GenerateMpesaReconciliationReportDto,
  ): Promise<MpesaReconciliationReport> {
    return this.mpesaReconciliationService.generateDailyReport(query);
  }

  @Post('payment-intents/:paymentIntentId/reversal-requests')
  @Permissions('billing:write')
  requestHistoricalStkReversal(@Param('paymentIntentId',ParseUUIDPipe) id:string,@Body() dto:SuspendPaymentChannelDto) {
    return this.mpesaReconciliationService.requestHistoricalStkReversal(id,dto.reason);
  }

  @Get('reconciliation/range')
  @Permissions('billing:read')
  async getRangeReconciliationReport(
    @Query() query: GenerateMpesaReconciliationRangeReportDto,
  ): Promise<MpesaReconciliationRangeReport> {
    return this.mpesaReconciliationService.generateDateRangeReport(query);
  }

  @Get('reconciliation/review')
  @Permissions('billing:read')
  async listReconciliationReviewItems(
    @Query() query: ListMpesaReconciliationReviewDto,
  ) {
    return this.mpesaReconciliationService.listAccountantReviewItems(query);
  }

  @Post('reconciliation/approval-requests')
  @Permissions('billing:write')
  async requestFinanceApproval(
    @Body() dto: RequestFinanceApprovalDto,
  ) {
    return this.mpesaReconciliationService.requestFinanceApproval(dto);
  }

  @Get('reconciliation/approval-requests')
  @Permissions('billing:read')
  listFinanceApprovals(@Query('limit') limit?: string,@Query('offset') offset?: string) {
    return this.mpesaReconciliationService.listFinanceApprovals(limit===undefined?50:Number(limit),offset===undefined?0:Number(offset));
  }

  @Post('reconciliation/approval-requests/:requestId/cancel')
  @Permissions('billing:write')
  cancelFinanceApproval(@Param('requestId',ParseUUIDPipe) requestId:string,@Body() dto:SuspendPaymentChannelDto) {
    return this.mpesaReconciliationService.cancelFinanceApproval(requestId,dto.reason);
  }

  @Post('reconciliation/approval-requests/:requestId/approve')
  @Permissions('billing:write')
  async approveFinanceApproval(
    @Param('requestId') requestId: string,
  ) {
    return this.mpesaReconciliationService.approveFinanceApproval(requestId);
  }

  @Post('reconciliation/approval-requests/:requestId/reopen')
  @Permissions('billing:write')
  reopenHistoricalApproval(@Param('requestId',ParseUUIDPipe) id:string,@Body() dto:SuspendPaymentChannelDto) {
    return this.mpesaReconciliationService.reopenHistoricalApproval(id,dto.reason);
  }

  @Post('reconciliation/daily/run')
  @Permissions('billing:update')
  async runDailyReconciliationProcessor(
    @Body() dto: Partial<GenerateMpesaReconciliationReportDto>,
  ): Promise<MpesaReconciliationProcessorResult> {
    return this.mpesaReconciliationService.runDailyProcessor({
      report_date: dto.report_date,
      missing_callback_grace_minutes: dto.missing_callback_grace_minutes,
    });
  }
}
