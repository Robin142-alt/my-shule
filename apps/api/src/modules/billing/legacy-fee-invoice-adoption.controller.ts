import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { LegacyFeeInvoiceAdoptionService } from './legacy-fee-invoice-adoption.service';

class LegacyInvoiceSelectionDto {
  @IsString() @MinLength(1) @MaxLength(100) legacy_id!: string;
  @Matches(/^[a-f0-9]{64}$/) fingerprint!: string;
}
export class AdoptLegacyFeeInvoicesDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => LegacyInvoiceSelectionDto)
  invoices!: LegacyInvoiceSelectionDto[];
  @IsString() @MinLength(10) @MaxLength(1000) reason!: string;
}

@Controller('billing/legacy-invoices')
@RequiresModule('finance')
export class LegacyFeeInvoiceAdoptionController {
  constructor(private readonly adoption: LegacyFeeInvoiceAdoptionService) {}

  @Get() @Permissions('billing:read')
  preview(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.adoption.preview(limit === undefined ? 50 : Number(limit), offset === undefined ? 0 : Number(offset));
  }

  @Post('adopt') @Permissions('billing:write')
  adopt(@Body() dto: AdoptLegacyFeeInvoicesDto) {
    return this.adoption.adopt(dto.invoices, dto.reason);
  }
}
