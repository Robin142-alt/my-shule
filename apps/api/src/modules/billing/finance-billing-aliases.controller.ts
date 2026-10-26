import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { BillingService } from './billing.service';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';

export class GenerateLegacyRouteInvoicesDto {
  @IsUUID() fee_structure_id!: string;
  @IsOptional() @IsString() @MaxLength(40) term?: string;
  @IsOptional() @IsString() @MaxLength(24) academic_year?: string;
  @IsOptional() @IsString() @MaxLength(120) idempotency_key?: string;
}

/** Retain existing URLs while routing every new charge through shared billing. */
@Controller('finance')
@RequiresModule('finance')
export class FinanceBillingAliasesController {
  constructor(private readonly billing: BillingService) {}

  @Post('fee-structures') @Permissions('billing:write')
  createFeeStructure(@Body() dto: CreateFeeStructureDto) {
    return this.billing.createFeeStructure(dto);
  }

  @Post('invoices/generate') @Permissions('billing:write')
  async generateInvoices(@Body() dto: GenerateLegacyRouteInvoicesDto) {
    const structures = await this.billing.listFeeStructures();
    const structure = structures.find(row => row.id === dto.fee_structure_id);
    if (!structure) throw new BadRequestException('Fee structure was not found in this school');
    if ((dto.term && dto.term !== structure.term) || (dto.academic_year && dto.academic_year !== structure.academic_year)) {
      throw new BadRequestException('Choose a fee structure configured for the requested academic year and term');
    }
    const students = await this.billing.listBillableStudentsForFeeStructure(structure.id);
    if (students.length > 1000) throw new BadRequestException('Use the invoice workspace to bill selected groups of up to 1,000 learners');
    if (!students.length) return { generated: 0, invoices: [], skipped: [] };
    const result = await this.billing.bulkGenerateFeeInvoices({
      fee_structure_id: structure.id, idempotency_key: dto.idempotency_key?.trim() || `finance-route:${structure.id}`,
      target_students: students.map(row => ({ student_id: row.student_id, student_name: row.student_name,
        admission_number: row.admission_number, class_name: row.class_name ?? undefined, guardian_phone: row.guardian_phone ?? undefined })),
    });
    return { generated: result.generated_count, invoices: result.invoices, skipped: result.skipped };
  }
}
