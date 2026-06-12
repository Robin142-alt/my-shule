export interface School {
  id: string;
  name: string;
  code: string;
  county?: string;
  curriculum_mode?: string;
  plan?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

export interface Student {
  id: string;
  school_id: string;
  admission_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  date_of_birth: string;
  class_id?: string;
  stream_id?: string;
  status: "ACTIVE" | "INACTIVE" | "GRADUATED" | "SUSPENDED" | "EXPELLED" | "TRANSFERRED";
  admission_date: string;
  boarding_status: "DAY" | "BOARDING";
  transport_status: "NONE" | "SCHOOL_BUS" | "PRIVATE";
  parent_guardian_id?: string;
}

export interface ParentGuardian {
  id: string;
  school_id: string;
  full_name: string;
  phone: string;
  email?: string;
  relationship: string;
  national_id_optional?: string;
}

export interface StudentGuardian {
  id: string;
  school_id: string;
  student_id: string;
  guardian_id: string;
  relationship: string;
  is_primary: boolean;
}

export interface User {
  id: string;
  school_id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

export interface FeeAccount {
  id: string;
  school_id: string;
  student_id: string;
  balance: number;
  last_payment_date?: string;
  status: "CLEARED" | "ARREARS" | "OVERPAID";
}

export interface AttendanceRecord {
  id: string;
  school_id: string;
  student_id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  notes?: string;
}

export interface DisciplineCase {
  id: string;
  school_id: string;
  student_id: string;
  reported_by: string;
  date: string;
  incident_type: string;
  description: string;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "APPEALED";
  action_taken?: string;
}

export interface HealthVisit {
  id: string;
  school_id: string;
  student_id: string;
  date: string;
  reason: string;
  treatment?: string;
  notes?: string;
}

export interface LibraryLoan {
  id: string;
  school_id: string;
  student_id: string;
  book_id: string;
  borrow_date: string;
  due_date: string;
  return_date?: string;
  status: "ACTIVE" | "RETURNED" | "OVERDUE" | "LOST";
}

export interface TransportAssignment {
  id: string;
  school_id: string;
  student_id: string;
  route_id: string;
  vehicle_id: string;
  pickup_point: string;
  dropoff_point: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface BoardingAssignment {
  id: string;
  school_id: string;
  student_id: string;
  hostel_id: string;
  room_id: string;
  bed_id: string;
  status: "ACTIVE" | "INACTIVE";
}
