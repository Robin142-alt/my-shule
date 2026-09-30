import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../../auth/decorators/public.decorator';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../../module-access/module-access.decorator';
import { IngressRoute, PaymentIngressService } from './payment-ingress.service';

@Controller('payments/ingress')
export class PaymentIngressController {
  constructor(private readonly ingress: PaymentIngressService) {}
  @Public() @Post(':provider/:environment/:tenant/:revision/:token/confirmation') @HttpCode(200)
  confirmation(@Param() route: IngressRoute,@Param('revision',ParseUUIDPipe) _id:string,@Body() body:unknown,@Req() req:Request) {
    return this.ingress.receive(route,body,this.raw(req),req.headers);
  }
  @Public() @Post(':provider/:environment/:tenant/:revision/:token/validation') @HttpCode(200)
  validation(@Param() route: IngressRoute,@Param('revision',ParseUUIDPipe) _id:string,@Body() body:unknown,@Req() req:Request) {
    return this.ingress.receive(route,body,this.raw(req),req.headers,true);
  }
  @Public() @Post('verification/:tenant/:id/:token/result') @HttpCode(200)
  result(@Param('tenant') tenant:string,@Param('id',ParseUUIDPipe) id:string,@Param('token') token:string,@Body() body:unknown,@Req() req:Request) {
    return this.ingress.result(tenant,id,token,body,this.raw(req),req.headers);
  }
  @Public() @Post('verification/:tenant/:id/:token/timeout') @HttpCode(200)
  timeout(@Param('tenant') tenant:string,@Param('id',ParseUUIDPipe) id:string,@Param('token') token:string,@Body() body:unknown,@Req() req:Request) {
    return this.ingress.result(tenant,id,token,body,this.raw(req),req.headers,true);
  }
  @Get() @RequiresModule('finance') @Permissions('billing:read') list() { return this.ingress.list(); }
  @Post(':id/retry') @RequiresModule('finance') @Permissions('billing:write') retry(@Param('id',ParseUUIDPipe) id:string) { return this.ingress.retry(id); }
  private raw(req:Request) { return (req as Request & {rawBody?:Buffer}).rawBody?.toString('utf8') ?? JSON.stringify(req.body); }
}
