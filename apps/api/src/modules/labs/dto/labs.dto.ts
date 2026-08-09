import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const LAB_ITEM_TYPES = [
  'chemical',
  'apparatus',
  'consumable',
  'safety_equipment',
] as const;

export const LAB_UNITS = [
  'Pieces',
  'Bottles',
  'Packets',
  'Boxes',
  'Sets',
  'Pairs',
  'Litres',
  'Millilitres',
  'Kilograms',
  'Grams',
  'Metres',
  'Rolls',
  'Containers',
  'Custom',
] as const;

export class CreateLabDepartmentDto {
  @IsString()
  name!: string;

  @IsIn(['SCIENCE', 'TECHNICAL', 'CUSTOM'])
  type!: 'SCIENCE' | 'TECHNICAL' | 'CUSTOM';

  @IsOptional()
  @IsString()
  hod_id?: string;
}

export class CreateLabDto {
  @IsString()
  department_id!: string;

  @IsString()
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity!: number;

  @IsOptional()
  @IsString()
  location?: string;
}

export class CreateLabSessionDto {
  @IsString()
  lab_id!: string;

  @IsString()
  class_section_id!: string;

  @IsOptional()
  @IsString()
  subject_id?: string;

  @IsString()
  subject!: string;

  @IsString()
  date!: string;

  @IsString()
  start_time!: string;

  @IsString()
  end_time!: string;

  @IsString()
  teacher_id!: string;

  @IsOptional()
  @IsBoolean()
  is_mandatory?: boolean;
}

export class MarkLabAttendanceDto {
  @IsArray()
  @ArrayMinSize(1)
  attendance!: Array<{
    student_id: string;
    status: 'present' | 'absent' | 'late' | 'excused';
  }>;
}

export class CreateLabEquipmentDto {
  @IsOptional()
  @IsString()
  department_id?: string;

  @IsOptional()
  @IsString()
  lab_id?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  asset_tag?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity_total!: number;

  @IsOptional()
  @IsString()
  condition_status?: string;

  @IsOptional()
  @IsBoolean()
  is_consumable?: boolean;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimum_stock_level?: number;

  @IsOptional()
  @IsString()
  storage_location?: string;
}

export class CreateChemicalItemDto {
  @IsOptional()
  @IsString()
  lab_id?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  chemical_formula?: string;

  @IsOptional()
  @IsString()
  hazard_class?: string;

  @IsOptional()
  @IsString()
  batch_number?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity_total!: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  manufacture_date?: string;

  @IsOptional()
  @IsString()
  expiry_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimum_stock_level?: number;

  @IsOptional()
  @IsString()
  storage_location?: string;

  @IsOptional()
  @IsString()
  concentration?: string;
}

export class CreateLaboratoryItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  source_row?: number;

  @IsIn(LAB_ITEM_TYPES)
  item_type!: (typeof LAB_ITEM_TYPES)[number];

  @IsString()
  @MaxLength(160)
  item_name!: string;

  @IsString()
  @MaxLength(100)
  category!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsString()
  custom_unit?: string;

  @IsString()
  @MaxLength(240)
  storage_location!: string;

  @IsOptional()
  @IsString()
  storage_location_id?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimum_stock_level!: number;

  @IsOptional()
  @IsIn(['quantity', 'individual'])
  tracking_method?: 'quantity' | 'individual';

  @IsOptional()
  @IsString()
  concentration?: string;

  @IsOptional()
  @IsString()
  expiry_date?: string;

  @IsOptional()
  @IsString()
  safety_classification?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  serial_number?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  submission_id?: string;

  @IsOptional()
  @IsIn(['check', 'add_stock', 'create_separate'])
  duplicate_action?: 'check' | 'add_stock' | 'create_separate';
}

export class ImportLaboratoryItemsDto {
  @IsString()
  submission_id!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(250)
  @ValidateNested({ each: true })
  @Type(() => CreateLaboratoryItemDto)
  items!: CreateLaboratoryItemDto[];
}

export class AddLaboratoryStockDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity_added!: number;

  @IsOptional()
  @IsString()
  date_added?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  submission_id?: string;
}

export class IssueEquipmentDto {
  @IsString()
  equipment_id!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity_used!: number;

  @IsOptional()
  @IsString()
  condition_after_use?: string;
}

export class ReconcileEquipmentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  returned_quantity!: number;

  @IsString()
  condition_after_use!: string;
}

export class IssueChemicalDto {
  @IsString()
  chemical_id!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity_used!: number;
}

export class ChemicalDisposalRequestDto {
  @IsString()
  reason!: string;
}

export class PracticalRequestItemDto {
  @IsOptional()
  @IsString()
  item_id?: string;

  @IsOptional()
  @IsIn(['equipment', 'chemical'])
  item_source?: 'equipment' | 'chemical';

  @IsString()
  item_name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  requested_quantity!: number;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsBoolean()
  is_returnable?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePracticalRequestDto {
  @IsString()
  subject!: string;

  @IsString()
  class_name!: string;

  @IsString()
  practical_date!: string;

  @IsString()
  lesson_time!: string;

  @IsString()
  practical_title!: string;

  @IsOptional()
  @IsString()
  teacher_id?: string;

  @IsString()
  teacher_name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  learner_groups?: number;

  @IsOptional()
  @IsString()
  teacher_notes?: string;

  @IsOptional()
  @IsBoolean()
  is_assessment?: boolean;

  @IsOptional()
  @IsString()
  confidential_notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authorized_roles?: string[];

  @IsOptional()
  @IsString()
  submission_id?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PracticalRequestItemDto)
  items!: PracticalRequestItemDto[];
}

export class PracticalReviewItemDto {
  @IsString()
  request_item_id!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approved_quantity!: number;

  @IsOptional()
  @IsString()
  substitute_item_id?: string;

  @IsOptional()
  @IsString()
  substitute_item_name?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ReviewPracticalRequestDto {
  @IsIn(['under_review', 'partially_available', 'preparing', 'rejected'])
  status!: 'under_review' | 'partially_available' | 'preparing' | 'rejected';

  @IsOptional()
  @IsString()
  reason?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PracticalReviewItemDto)
  items!: PracticalReviewItemDto[];

  @IsOptional()
  @IsString()
  submission_id?: string;
}

export class PracticalPreparationItemDto {
  @IsOptional()
  @IsString()
  request_item_id?: string;

  @IsOptional()
  @IsString()
  item_id?: string;

  @IsOptional()
  @IsIn(['equipment', 'chemical'])
  item_source?: 'equipment' | 'chemical';

  @IsString()
  item_name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prepared_quantity!: number;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsBoolean()
  is_returnable?: boolean;

  @IsOptional()
  @IsString()
  substitute_item_id?: string;

  @IsOptional()
  @IsString()
  substitute_item_name?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class PreparePracticalDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PracticalPreparationItemDto)
  items!: PracticalPreparationItemDto[];

  @IsOptional()
  @IsString()
  preparation_note?: string;

  @IsOptional()
  @IsBoolean()
  mark_ready?: boolean;

  @IsOptional()
  @IsString()
  submission_id?: string;
}

export class PracticalIssueLineDto {
  @IsString()
  request_item_id!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity_issued!: number;

  @IsBoolean()
  is_returnable!: boolean;
}

export class ConfirmPracticalIssueDto {
  @IsString()
  received_by!: string;

  @IsOptional()
  @IsString()
  expected_return_at?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  submission_id?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PracticalIssueLineDto)
  items!: PracticalIssueLineDto[];
}

export class PracticalReturnLineDto {
  @IsString()
  issue_line_id!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  returned_good!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  used_or_consumed!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  broken!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  missing!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  still_with_teacher!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sent_for_maintenance!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  spilled_or_wasted!: number;
}

export class ReceivePracticalReturnDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  submission_id?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PracticalReturnLineDto)
  items!: PracticalReturnLineDto[];
}

export class RecordBreakageLossDto {
  @IsOptional()
  @IsString()
  item_id?: string;

  @IsOptional()
  @IsIn(['equipment', 'chemical'])
  item_source?: 'equipment' | 'chemical';

  @IsString()
  item_name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsString()
  date!: string;

  @IsOptional()
  @IsString()
  practical_or_activity?: string;

  @IsOptional()
  @IsString()
  class_name?: string;

  @IsOptional()
  @IsString()
  teacher_name?: string;

  @IsIn([
    'accidental_breakage',
    'wear_and_tear',
    'equipment_failure',
    'missing',
    'chemical_spill',
    'improper_use',
    'unknown',
  ])
  classification!: string;

  @IsString()
  explanation!: string;

  @IsOptional()
  @IsBoolean()
  refer_for_follow_up?: boolean;

  @IsOptional()
  @IsString()
  submission_id?: string;
}

export class CreateLabStorageLocationDto {
  @IsString()
  laboratory_or_store!: string;

  @IsOptional()
  @IsString()
  room_or_section?: string;

  @IsOptional()
  @IsString()
  cupboard_or_cabinet?: string;

  @IsOptional()
  @IsString()
  shelf?: string;
}

export class StartLabStocktakeDto {
  @IsOptional()
  @IsString()
  location_id?: string;

  @IsString()
  location_name!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(LAB_ITEM_TYPES)
  item_type?: (typeof LAB_ITEM_TYPES)[number];

  @IsOptional()
  @IsString()
  submission_id?: string;
}

export class LabStocktakeLineDto {
  @IsString()
  line_id!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  counted_quantity!: number;

  @IsOptional()
  @IsString()
  condition?: string;
}

export class SaveLabStocktakeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabStocktakeLineDto)
  items!: LabStocktakeLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class GenerateLabRegisterDto {
  @IsIn([
    'stock_book',
    'chemicals_register',
    'apparatus_register',
    'consumables_register',
    'issue_return_register',
    'breakage_loss_register',
    'expired_chemicals_register',
    'stocktake_sheet',
    'practical_preparation_checklist',
    'low_stock_list',
  ])
  report_type!: string;

  @IsOptional()
  @IsString()
  laboratory?: string;

  @IsOptional()
  @IsString()
  location_filter?: string;

  @IsOptional()
  @IsString()
  date_from?: string;

  @IsOptional()
  @IsString()
  date_to?: string;
}

export class LabSafetyChecklistItemDto {
  @IsString()
  label!: string;

  @IsBoolean()
  checked!: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

export class SaveLabSafetyCheckDto {
  @IsString()
  location_name!: string;

  @IsString()
  checked_on!: string;

  @IsString()
  next_due_date!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LabSafetyChecklistItemDto)
  checklist!: LabSafetyChecklistItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  submission_id?: string;
}
