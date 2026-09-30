import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { Permissions } from "../../auth/decorators/permissions.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import { SUPERADMIN_ROLE_OWNER } from "../../auth/auth.constants";
import { RequiresModule } from "../module-access/module-access.decorator";
import {
  ConnectPaymentChannelDto,
  DecidePaymentChannelDto,
  RequestPaymentChannelDto,
  SuspendPaymentChannelDto,
  SandboxPaymentTestDto,
} from "./dto/payment-channel-workflow.dto";
import { PaymentChannelWorkflowService } from "./payment-channel-workflow.service";
import { PaymentChannelQueryDto } from "./dto/payment-channel-query.dto";

@Controller("tenant-finance")
@RequiresModule("finance")
export class PaymentChannelWorkflowController {
  constructor(private readonly service: PaymentChannelWorkflowService) {}
  @Get("collection-providers") @Permissions("billing:read") providers() {
    return this.service.providers();
  }
  @Get("collection-instructions") @Permissions("auth:read") instructions() {
    return this.service.instructions();
  }
  @Get("collection-channel-summary") @Permissions("billing:read") summary() {
    return this.service.summary();
  }
  @Get("collection-channels") @Permissions("billing:read") list(@Query() query: PaymentChannelQueryDto) {
    return this.service.list(query);
  }
  @Post("collection-channels") @Permissions("billing:write") request(
    @Body() dto: RequestPaymentChannelDto,
  ) {
    return this.service.request(dto);
  }
  @Post("collection-channels/:id/decision")
  @Permissions("principal:write")
  decide(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DecidePaymentChannelDto,
  ) {
    return this.service.decide(id, dto);
  }
}

@Controller("platform/payment-integrations")
@Roles(SUPERADMIN_ROLE_OWNER)
export class PlatformPaymentIntegrationsController {
  constructor(private readonly service: PaymentChannelWorkflowService) {}
  @Get("providers") providers() {
    return this.service.providers();
  }
  @Get("summary") summary() {
    return this.service.platformSummary();
  }
  @Get() list(@Query() query: PaymentChannelQueryDto) {
    return this.service.platformList(query.limit, query.offset, query);
  }
  @Post(":tenantId/:id/connect") connect(
    @Param("tenantId") tenant: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ConnectPaymentChannelDto,
  ) {
    return this.service.connect(tenant, id, dto);
  }
  @Get(":tenantId/:id/health") health(
    @Param("tenantId") tenant: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.health(tenant, id);
  }
  @Post(":tenantId/:id/test") test(
    @Param("tenantId") tenant: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.test(tenant, id);
  }
  @Get(':tenantId/:id/callbacks') @Header('Cache-Control','no-store') callbacks(
    @Param('tenantId') tenant:string,@Param('id',ParseUUIDPipe) id:string,
  ) { return this.service.callbacks(tenant,id); }
  @Post(':tenantId/:id/sandbox-test') sandboxTest(
    @Param('tenantId') tenant:string,@Param('id',ParseUUIDPipe) id:string,@Body() dto:SandboxPaymentTestDto,
  ) { return this.service.sandboxTest(tenant,id,dto); }
  @Post(":tenantId/:id/activate") activate(
    @Param("tenantId") tenant: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.activate(tenant, id);
  }
  @Post(":tenantId/:id/suspend") suspend(
    @Param("tenantId") tenant: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SuspendPaymentChannelDto,
  ) {
    return this.service.suspend(tenant, id, dto.reason);
  }
}
