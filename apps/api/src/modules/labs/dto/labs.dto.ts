export class CreateLabDepartmentDto {
  name!: string;
  type!: 'SCIENCE' | 'TECHNICAL' | 'CUSTOM';
  hod_id?: string;
}

export class CreateLabDto {
  department_id!: string;
  name!: string;
  capacity!: number;
  location?: string;
}

export class CreateLabSessionDto {
  lab_id!: string;
  class_section_id!: string;
  subject_id?: string;
  subject!: string;
  date!: string;
  start_time!: string;
  end_time!: string;
  teacher_id!: string;
  is_mandatory?: boolean;
}

export class MarkLabAttendanceDto {
  attendance!: Array<{
    student_id: string;
    status: 'present' | 'absent' | 'late' | 'excused';
  }>;
}

export class CreateLabEquipmentDto {
  department_id!: string;
  lab_id!: string;
  name!: string;
  asset_tag!: string;
  quantity_total!: number;
  condition_status?: string;
  is_consumable?: boolean;
}

export class CreateChemicalItemDto {
  lab_id!: string;
  name!: string;
  chemical_formula?: string;
  hazard_class!: string;
  batch_number!: string;
  quantity_total!: number;
  unit?: string;
  manufacture_date?: string;
  expiry_date!: string;
}

export class IssueEquipmentDto {
  equipment_id!: string;
  quantity_used!: number;
  condition_after_use?: string;
}

export class ReconcileEquipmentDto {
  returned_quantity!: number;
  condition_after_use!: string;
}

export class IssueChemicalDto {
  chemical_id!: string;
  quantity_used!: number;
}

export class ChemicalDisposalRequestDto {
  reason!: string;
}
