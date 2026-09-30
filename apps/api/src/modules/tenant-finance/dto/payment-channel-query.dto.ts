import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class PaymentChannelQueryDto {
  @IsOptional()
  @IsIn(["superadmin", "school"])
  audience?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;

  @IsOptional()
  @IsIn([
    "all",
    "pending_approval",
    "connection",
    "attention",
    "active",
    "superseded",
    "rejected",
    "suspended",
  ])
  status = "all";

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsUUID()
  revision?: string;
}
