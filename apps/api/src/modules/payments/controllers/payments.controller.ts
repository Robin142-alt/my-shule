import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

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
  @Permissions('billing:update')
  async requestFinanceApproval(
    @Body() dto: RequestFinanceApprovalDto,
  ) {
    return this.mpesaReconciliationService.requestFinanceApproval(dto);
  }

  @Post('reconciliation/approval-requests/:requestId/approve')
  @Permissions('billing:update')
  async approveFinanceApproval(
    @Param('requestId') requestId: string,
  ) {
    return this.mpesaReconciliationService.approveFinanceApproval(requestId);
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
