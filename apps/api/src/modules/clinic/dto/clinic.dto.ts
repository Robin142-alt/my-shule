import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ListClinicMedicinesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class CreateMedicineDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  medicine_name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  generic_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  brand_name?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  supplier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  manufacturer?: string;

  @IsIn(['tablets', 'bottles', 'sachets', 'injections', 'capsules', 'ml', 'grams', 'units'])
  unit_type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  storage_instructions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  side_effect_notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  barcode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  qr_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  storage_location?: string;

  @IsOptional()
  @IsString()
  clinic_location_id?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  cost_price_minor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  internal_value_minor?: number;

  @IsOptional()
  @IsBoolean()
  prescription_required?: boolean;

  @IsOptional()
  @IsBoolean()
  is_emergency_supply?: boolean;
}

export class ReceiveMedicineStockDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  batch_number!: string;

  @IsNumber()
  @Min(0.001)
  quantity_received!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimum_stock_threshold?: number;

  @IsString()
  expiry_date!: string;

  @IsOptional()
  @IsString()
  manufacturing_date?: string;

  @IsOptional()
  @IsString()
  date_received?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  supplier_invoice_reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  procurement_reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  storage_location?: string;

  @IsOptional()
  @IsObject()
  procurement_metadata?: Record<string, unknown>;
}

export class RecordClinicVisitDto {
  @IsString()
  student_id!: string;

  @IsOptional()
  @IsString()
  clinic_location_id?: string;

  @IsOptional()
  @IsString()
  visit_date?: string;

  @IsOptional()
  @IsString()
  symptoms_summary?: string;

  @IsOptional()
  @IsString()
  diagnosis_summary?: string;

  @IsOptional()
  @IsString()
  confidential_notes?: string;

  @IsOptional()
  @IsString()
  treatment_summary?: string;

  @IsOptional()
  @IsIn(['open', 'completed', 'referred', 'isolation'])
  status?: 'open' | 'completed' | 'referred' | 'isolation';
}

export class DispenseMedicineDto {
  @IsString()
  batch_id!: string;

  @IsNumber()
  @Min(0.001)
  quantity_dispensed!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  dosage!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  duration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  instructions?: string;
}
