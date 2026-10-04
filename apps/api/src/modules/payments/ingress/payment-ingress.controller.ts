import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Req, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../../auth/decorators/public.decorator';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../../module-access/module-access.decorator';
import { IngressRoute, PaymentIngressService } from './payment-ingress.service';
import { decodeCallbackSchool } from '../../tenant-finance/payment-ingress-config.service';

@Controller('payments/ingress')
export class PaymentIngressController {
  constructor(private readonly ingress: PaymentIngressService) {}
  @Public() @Post(':provider/:environment/:tenant/:revision/:token/confirmation') @HttpCode(200)
  confirmation(@Param() route: IngressRoute,@Param('revision',ParseUUIDPipe) _id:string,@Body() body:unknown,@Req() req:Request) {
    return this.ingress.receive(this.collectionRoute(route),body,this.raw(req),req.headers);
  }
  @Public() @Post(':provider/:environment/:tenant/:revision/:token/validation') @HttpCode(200)
  validation(@Param() route: IngressRoute,@Param('revision',ParseUUIDPipe) _id:string,@Body() body:unknown,@Req() req:Request) {
    return this.ingress.receive(this.collectionRoute(route),body,this.raw(req),req.headers,true);
  }
  @Public() @Post('check/:tenant/:id/:token/result') @HttpCode(200)
  checkedResult(@Param('tenant') tenant:string,@Param('id',ParseUUIDPipe) id:string,@Param('token') token:string,@Body() body:unknown,@Req() req:Request) {
    return this.ingress.result(decodeCallbackSchool(tenant),id,token,body,this.raw(req),req.headers);
  }
  @Public() @Post('check/:tenant/:id/:token/timeout') @HttpCode(200)
  checkedTimeout(@Param('tenant') tenant:string,@Param('id',ParseUUIDPipe) id:string,@Param('token') token:string,@Body() body:unknown,@Req() req:Request) {
    return this.ingress.result(decodeCallbackSchool(tenant),id,token,body,this.raw(req),req.headers,true);
  }
  // Keep previously registered URLs valid for historical revisions and in-flight results.
  @Public() @Post('verification/:tenant/:id/:token/result') @HttpCode(200)
  result(@Param('tenant') tenant:string,@Param('id',ParseUUIDPipe) id:string,@Param('token') token:string,@Body() body:unknown,@Req() req:Request) {
    return this.ingress.result(tenant,id,token,body,this.raw(req),req.headers);
  }
  @Public() @Post('verification/:tenant/:id/:token/timeout') @HttpCode(200)
  timeout(@Param('tenant') tenant:string,@Param('id',ParseUUIDPipe) id:string,@Param('token') token:string,@Body() body:unknown,@Req() req:Request) {
    return this.ingress.result(tenant,id,token,body,this.raw(req),req.headers,true);
  }
  @Get() @RequiresModule('finance') @Permissions('billing:read') list(
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) { return this.ingress.list(limit, offset); }
  @Post(':id/retry') @RequiresModule('finance') @Permissions('billing:write') retry(@Param('id',ParseUUIDPipe) id:string) { return this.ingress.retry(id); }
  private collectionRoute(route:IngressRoute):IngressRoute {
    return route.provider === 'c2b' ? {...route,provider:'safaricom',tenant:decodeCallbackSchool(route.tenant)} : route;
  }
  private raw(req:Request) { return (req as Request & {rawBody?:Buffer}).rawBody?.toString('utf8') ?? JSON.stringify(req.body); }
}
