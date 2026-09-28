import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../../auth/decorators/public.decorator";
import { MpesaSignatureService } from "./services/mpesa-signature.service";
import { MpesaAsyncStatusService } from "./mpesa-async-status.service";

@Controller("payments/mpesa/transaction-status")
export class MpesaAsyncStatusController {
  constructor(
    private readonly service: MpesaAsyncStatusService,
    private readonly signature: MpesaSignatureService,
  ) {}
  @Public()
  @Post(":tenant/:id/:token/result")
  @HttpCode(200)
  result(
    @Param("tenant") tenant: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("token") token: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    this.verify(request);
    return this.service.receive(tenant, id, token, body);
  }
  @Public()
  @Post(":tenant/:id/:token/timeout")
  @HttpCode(200)
  timeout(
    @Param("tenant") tenant: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("token") token: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    this.verify(request);
    return this.service.receive(tenant, id, token, body, true);
  }
  private verify(request: Request) {
    const raw = (request as Request & { rawBody?: Buffer }).rawBody;
    if (!raw)
      throw new UnauthorizedException("Raw payment callback body is required");
    this.signature.verifyCallback(raw.toString("utf8"), request.headers);
  }
}
