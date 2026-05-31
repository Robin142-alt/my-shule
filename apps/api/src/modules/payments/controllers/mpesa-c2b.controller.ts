import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Optional,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import { Public } from '../../../auth/decorators/public.decorator';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../../module-access/module-access.decorator';
import { ReconcileMpesaC2bPaymentDto } from '../dto/reconcile-mpesa-c2b-payment.dto';
import { MpesaC2bPaymentEntity } from '../entities/mpesa-c2b-payment.entity';
import {
  MpesaC2bGatewayResponse,
  MpesaC2bPaymentStatus,
  MpesaC2bPayload,
} from '../payments.types';
import { MpesaC2bService } from '../services/mpesa-c2b.service';
import { MpesaCallbackChannelService } from '../services/mpesa-callback-channel.service';
import { MpesaCallbackTrustService } from '../services/mpesa-callback-trust.service';
import { MpesaSignatureService } from '../services/mpesa-signature.service';

@Controller(['payments/mpesa/c2b', 'mpesa/c2b'])
export class MpesaC2bController {
  constructor(
    private readonly mpesaC2bService: MpesaC2bService,
    @Optional() private readonly mpesaSignatureService?: MpesaSignatureService,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly mpesaCallbackTrustService?: MpesaCallbackTrustService,
    @Optional() private readonly mpesaCallbackChannelService?: MpesaCallbackChannelService,
  ) {}

  @Public()
  @Post('validation')
  @HttpCode(HttpStatus.OK)
  async validate(
    @Req() request: Request,
    @Body() payload: MpesaC2bPayload,
  ): Promise<MpesaC2bGatewayResponse> {
    this.verifyCallbackRequired(request);
    return this.mpesaC2bService.validatePayment(payload);
  }

  @Public()
  @Post('validation/:channelId/:secretRef')
  @HttpCode(HttpStatus.OK)
  async validateChannel(
    @Param('channelId') channelId: string,
    @Param('secretRef') secretRef: string,
    @Req() request: Request,
    @Body() payload: MpesaC2bPayload,
  ): Promise<MpesaC2bGatewayResponse> {
    const channel = await this.resolveCallbackChannel(channelId, secretRef, payload.BusinessShortCode);

    this.verifyCallbackRequired(request, channel.requires_edge_signature);

    return this.mpesaC2bService.validatePayment(payload);
  }

  @Public()
  @Post('confirmation')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @Req() request: Request,
    @Body() payload: MpesaC2bPayload,
  ): Promise<MpesaC2bGatewayResponse> {
    this.verifyCallbackRequired(request);
    await this.mpesaC2bService.processConfirmation(payload);

    return {
      ResultCode: 0,
      ResultDesc: 'Confirmation received successfully',
    };
  }

  @Public()
  @Post('confirmation/:channelId/:secretRef')
  @HttpCode(HttpStatus.OK)
  async confirmChannel(
    @Param('channelId') channelId: string,
    @Param('secretRef') secretRef: string,
    @Req() request: Request,
    @Body() payload: MpesaC2bPayload,
  ): Promise<MpesaC2bGatewayResponse> {
    const channel = await this.resolveCallbackChannel(channelId, secretRef, payload.BusinessShortCode);

    this.verifyCallbackRequired(request, channel.requires_edge_signature);
    await this.mpesaC2bService.processConfirmation(payload);

    return {
      ResultCode: 0,
      ResultDesc: 'Confirmation received successfully',
    };
  }

  @Get('payments')
  @RequiresModule('finance')
  @Permissions('billing:read')
  async listPayments(
    @Query('status') status?: MpesaC2bPaymentStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<MpesaC2bPaymentEntity[]> {
    return this.mpesaC2bService.listC2bPayments({
      status: status ?? null,
      limit,
      offset,
    });
  }

  @Post('payments/:paymentId/reconcile')
  @RequiresModule('finance')
  @Permissions('billing:update')
  async reconcilePayment(
    @Param('paymentId') paymentId: string,
    @Body() dto: ReconcileMpesaC2bPaymentDto,
  ): Promise<MpesaC2bPaymentEntity> {
    return this.mpesaC2bService.reconcilePendingPayment(paymentId, dto);
  }

  private verifyCallbackRequired(request: Request, requiresEdgeSignature = this.requiresEdgeSignature()): void {
    if (!requiresEdgeSignature) {
      return;
    }

    const callbackSecret =
      this.configService?.get<string>('mpesa.callbackSecret')
      ?? process.env.MPESA_CALLBACK_SECRET
      ?? '';

    if (!callbackSecret.trim()) {
      throw new UnauthorizedException('MPESA callback secret is not configured');
    }

    if (!this.mpesaSignatureService) {
      throw new UnauthorizedException('MPESA callback signature verification is unavailable');
    }

    this.mpesaSignatureService.verifyCallback(this.getRawBody(request), request.headers);
  }

  private requiresEdgeSignature(): boolean {
    return this.mpesaCallbackTrustService?.requiresEdgeSignature() ?? true;
  }

  private async resolveCallbackChannel(
    channelId: string,
    secretRef: string,
    shortcode: string | number | null | undefined,
  ): Promise<{ requires_edge_signature: boolean }> {
    if (!this.mpesaCallbackChannelService) {
      throw new UnauthorizedException('M-PESA callback channel verification is unavailable');
    }

    return this.mpesaCallbackChannelService.resolveChannelBySecret({
      channel_id: channelId,
      secret_ref: secretRef,
      shortcode: shortcode === undefined || shortcode === null ? null : String(shortcode),
    });
  }

  private getRawBody(request: Request): string {
    if (request.rawBody) {
      return request.rawBody.toString('utf8');
    }

    if (typeof request.body === 'string') {
      return request.body;
    }

    return JSON.stringify(request.body ?? {});
  }
}
