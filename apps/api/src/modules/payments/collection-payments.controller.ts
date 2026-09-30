import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  BadRequestException,
} from "@nestjs/common";
import {
  IsISO8601,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from "class-validator";
import { Permissions } from "../../auth/decorators/permissions.decorator";
import { RequiresModule } from "../module-access/module-access.decorator";
import {
  DecidePaymentChannelDto,
  SuspendPaymentChannelDto,
} from "../tenant-finance/dto/payment-channel-workflow.dto";
import { CollectionPaymentsService } from "./collection-payments.service";

class StatementEntryDto {
  @IsUUID() revision_id!: string;
  @IsString() @Length(1, 100) provider_transaction_id!: string;
  @IsString() @Matches(/^[1-9][0-9]{0,18}$/) amount_minor!: string;
  @IsString() @MaxLength(120) account_reference!: string;
  @IsISO8601() occurred_at!: string;
  @IsString() @Length(5, 500) evidence_reference!: string;
}
class MatchCollectionDto extends SuspendPaymentChannelDto {
  @IsString() @Length(1, 120) student_id!: string;
}

@Controller("payments/collections")
@RequiresModule("finance")
export class CollectionPaymentsController {
  constructor(private readonly service: CollectionPaymentsService) {}
  @Get() @Permissions("billing:read") list(
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query("offset", new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    if (limit < 1 || limit > 100 || offset < 0)
      throw new BadRequestException("Invalid page");
    return this.service.list(limit, offset);
  }
  @Post("statement") @Permissions("billing:write") statement(
    @Body() dto: StatementEntryDto,
  ) {
    return this.service.statement(dto.revision_id, dto, dto.evidence_reference);
  }
  @Get("reversals") @Permissions("billing:read") reversals() {
    return this.service.listReversals();
  }
  @Post("reversals/:id/decision")
  @Permissions("principal:write")
  reversalDecision(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DecidePaymentChannelDto,
  ) {
    return this.service.decideReversal(id, dto.decision, dto.reason);
  }
  @Post(":id/decision") @Permissions("principal:write") decision(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DecidePaymentChannelDto,
  ) {
    return this.service.decide(id, dto.decision, dto.reason);
  }
  @Post(":id/match") @Permissions("billing:write") match(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: MatchCollectionDto,
  ) {
    return this.service.match(id, dto.student_id, dto.reason);
  }
  @Post(":id/reversal") @Permissions("billing:write") reversal(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SuspendPaymentChannelDto,
  ) {
    return this.service.requestReversal(id, dto.reason);
  }
}
