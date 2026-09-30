import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from "class-validator";
import type {
  CollectionChannelKind,
  CollectionConnectionMode,
  CollectionProviderCode,
} from "../payment-provider.catalog";

export class RequestPaymentChannelDto {
  @IsIn(["safaricom", "equity", "kcb", "coop", "other_bank"])
  provider_code!: CollectionProviderCode;
  @IsIn(["mpesa_paybill", "bank_paybill", "bank_account"])
  channel_kind!: CollectionChannelKind;
  @IsString() @Length(2, 100) display_name!: string;
  @IsString() @Length(2, 150) account_name!: string;
  @IsString() @Matches(/^[A-Za-z0-9 -]{3,40}$/) account_number!: string;
  @IsOptional() @IsString() @Matches(/^\d{5,10}$/) paybill_number?: string;
  @IsOptional() @IsString() @MaxLength(100) bank_name?: string;
  @IsOptional() @IsUUID() replaces_revision_id?: string;
  @IsString() @Length(5, 1000) reason!: string;
}

export class DecidePaymentChannelDto {
  @IsIn(["approve", "reject"]) decision!: "approve" | "reject";
  @IsString() @Length(5, 1000) reason!: string;
}

export class ConnectPaymentChannelDto {
  @IsIn(["daraja", "statement"]) connection_mode!: CollectionConnectionMode;
  @IsIn(["sandbox", "production"]) environment!: "sandbox" | "production";
  @IsObject() credentials!: Record<string, string>;
  @IsOptional() @IsIn(['daraja_direct','edge_signed']) callback_trust_mode?: 'daraja_direct' | 'edge_signed';
}

export class SuspendPaymentChannelDto {
  @IsString() @Length(5, 1000) reason!: string;
}

export class SandboxPaymentTestDto {
  @IsString() @Length(1,120) account_reference!: string;
  @IsString() @Matches(/^[1-9]\d{0,5}$/) amount!: string;
  @IsString() @Matches(/^254[17]\d{8}$/) msisdn!: string;
}
