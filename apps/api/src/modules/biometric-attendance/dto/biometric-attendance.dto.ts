export class RegisterBiometricDeviceDto {
  name!: string;
  location!: string;
  type!: string;
}

export class EnrollBiometricIdentityDto {
  teacher_user_id!: string;
  biometric_hash!: string;
}

export class SyncBiometricEventsDto {
  device_id!: string;
  events!: Array<{
    event_hash: string;
    biometric_hash: string;
    timestamp: string;
    event_type: 'check_in' | 'check_out';
    offline_mode_flag?: boolean;
    raw_payload?: Record<string, unknown>;
  }>;
}

export class ManualTeacherAttendanceOverrideDto {
  teacher_user_id!: string;
  attendance_date!: string;
  status!: 'present' | 'late' | 'absent' | 'half_day' | 'excused' | 'manual_override';
  reason!: string;
}
