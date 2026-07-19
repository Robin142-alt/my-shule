export type SupportedDomainEventName =
  | 'student.created'
  | 'student.lifecycle.enrolled'
  | 'student.lifecycle.class_assigned'
  | 'student.lifecycle.suspended'
  | 'student.lifecycle.exited'
  | 'student.lifecycle.archived'
  | 'student.academic_enrollment.created'
  | 'student.academic_lifecycle.changed'
  | 'payment.completed'
  | 'exam.submitted'
  | 'dean.approval.granted'
  | 'discipline.case.escalated'
  | 'school.operation.recorded'
  | 'workflow.action.dispatched'
  | 'workflow.action.completed'
  | 'boarding.request.submitted'
  | 'transport.request.submitted'
  | 'counselling.referral.submitted'
  | 'procurement.request.submitted'
  | 'lab.request.submitted'
  | 'asset.request.submitted'
  | 'attendance.register.marked'
  | 'discipline.incident.reported'
  | 'welfare.case.referred'
  | 'system.repair.triggered'
  | 'system.fallback.activated'
  | 'grading.system.created'
  | 'report.card.published'
  | 'communication.sms.queued'
  | 'admissions.cleared'
  | 'staff.updated'
  | 'staff.invited'
  | 'staff.activated'
  | 'staff.role_updated'
  | 'counselling.session.created'
  | 'counselling.referral.accepted'
  | 'counselling.referral.declined'
  | 'counselling.note.created'
  | 'counselling.plan.created'
  | 'timetable.slot.created'
  | 'timetable.slot.updated'
  | 'timetable.slot.cancelled'
  | 'timetable.version.revision_created'
  | 'timetable.version.published'
  | 'academic.calendar.updated'
  | 'academic.class.updated'
  | 'academic.stream.updated'
  | 'academic.department.updated'
  | 'academic.hod.reassigned'
  | 'academic.subject.updated'
  | 'academic.teacher_assignment.changed'
  | 'academic.policy.updated'
  | 'academic.role_assignment.changed'
  | 'academic.curriculum.updated'
  | 'academic.setup.merged';

export type OutboxEventStatus =
  | 'pending'
  | 'processing'
  | 'published'
  | 'failed'
  | 'discarded';

export type EventConsumerRunStatus = 'processing' | 'completed' | 'failed';

export interface StudentLifecycleEnrolledPayload {
  tenant_id: string;
  student_id: string;
  status: string;
}

export interface StudentLifecycleClassAssignedPayload {
  tenant_id: string;
  student_id: string;
  class_id: string;
}

export interface StudentLifecycleSuspendedPayload {
  tenant_id: string;
  student_id: string;
  status: string;
  reason: string;
}

export interface StudentLifecycleExitedPayload {
  tenant_id: string;
  student_id: string;
  status: string;
  reason: string;
}

export interface StudentLifecycleArchivedPayload {
  tenant_id: string;
  student_id: string;
  status: string;
}

export interface StudentCreatedPayload {
  tenant_id: string;
  student_id: string;
  created_at: string;
  created_by_user_id: string | null;
  admission_number?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PaymentCompletedPayload {
  tenant_id: string;
  payment_intent_id: string;
  mpesa_transaction_id: string;
  checkout_request_id: string;
  merchant_request_id: string;
  ledger_transaction_id: string;
  amount_minor: string;
  currency_code: string;
  account_reference: string;
  external_reference: string | null;
  mpesa_receipt_number: string | null;
  phone_number: string | null;
  completed_at: string;
}

export interface ExamSubmittedPayload {
  tenant_id: string;
  exam_id: string;
  exam_name: string;
  class_name: string;
  stream_name: string;
  submitted_by_user_id: string | null;
  submitted_at: string;
  completion_status?: string;
  missing_marks_count?: number;
}

export interface DeanApprovalGrantedPayload {
  tenant_id: string;
  approval_id: string;
  exam_id: string;
  exam_name: string;
  approved_by_user_id: string | null;
  approved_at: string;
  decision: 'approved' | 'rejected' | 'returned';
  reason_code?: string | null;
}

export interface DisciplineCaseEscalatedPayload {
  tenant_id: string;
  case_id: string;
  student_id: string;
  student_name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  escalated_to_role: string;
  escalated_at: string;
  summary: string;
}

export interface SchoolOperationRecordedPayload {
  tenant_id: string;
  school_id: string;
  operation_id: string;
  operation_type: string;
  module: string;
  actor_role: string;
  title: string;
  body: string;
  entity_id: string | null;
  severity: 'info' | 'warning' | 'critical' | 'success';
  target_roles: string[];
  notifications: Record<string, unknown>[];
  sms: Record<string, unknown>[];
  payload: Record<string, unknown>;
  occurred_at: string;
}

export interface WorkflowActionDispatchedPayload {
  tenant_id: string;
  command_id: string;
  dashboard_id: string;
  role: string;
  node_id: string;
  action_id: string;
  action_label?: string;
  capability_required?: string;
  workflow_id: string;
  execution_handler: string;
  fallback_handler: string;
  retry_policy: {
    maxAttempts: number;
    backoff: 'fixed' | 'exponential';
  };
  emitted_events: string[];
  audit_action: string;
  aggregate_id: string;
  requested_by_user_id: string;
  requested_at: string;
  payload: Record<string, unknown>;
}

export interface WorkflowActionCompletedPayload {
  tenant_id: string;
  command_id: string;
  dashboard_id: string;
  role: string;
  node_id: string;
  action_id: string;
  workflow_id: string;
  execution_handler: string;
  aggregate_id: string;
  completed_at: string;
  emitted_events: string[];
  audit_action: string;
  status: 'COMPLETED';
  payload: Record<string, unknown>;
}

export interface StudentAcademicEnrollmentCreatedPayload {
  tenant_id: string;
  student_id: string;
  academic_enrollment_id: string;
  application_id?: string | null;
  class_section_id?: string | null;
  class_name: string;
  stream_name: string;
  academic_year: string;
  status: string;
  occurred_at: string;
}

export interface StudentAcademicLifecycleChangedPayload {
  tenant_id: string;
  student_id: string;
  lifecycle_event_id: string;
  event_type: 'promotion' | 'graduation' | 'archive';
  source_enrollment_id: string;
  target_enrollment_id?: string | null;
  from_class_name: string;
  from_stream_name: string;
  from_academic_year: string;
  to_class_name?: string | null;
  to_stream_name?: string | null;
  to_academic_year?: string | null;
  reason: string;
  occurred_at: string;
}

export interface BoardingRequestSubmittedPayload {
  tenant_id: string;
  request_id: string;
  student_id: string;
  requested_by_user_id: string;
  requested_at: string;
  reason: string;
  status: string;
}

export interface TransportRequestSubmittedPayload {
  tenant_id: string;
  request_id: string;
  student_id: string;
  requested_by_user_id: string;
  requested_at: string;
  route_id?: string;
  status: string;
}

export interface CounsellingReferralSubmittedPayload {
  tenant_id: string;
  referral_id: string;
  student_id: string;
  referred_by_user_id: string;
  referred_at: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: string;
}

export interface ProcurementRequestSubmittedPayload {
  tenant_id: string;
  request_id: string;
  requested_by_user_id: string;
  requested_at: string;
  item_name: string;
  quantity: number;
  estimated_cost: number;
  status: string;
}

export interface LabRequestSubmittedPayload {
  tenant_id: string;
  request_id: string;
  requested_by_user_id: string;
  requested_at: string;
  equipment_id: string;
  date_needed: string;
  status: string;
}

export interface AssetRequestSubmittedPayload {
  tenant_id: string;
  request_id: string;
  requested_by_user_id: string;
  requested_at: string;
  asset_type: string;
  reason: string;
  status: string;
}

export interface AttendanceRegisterMarkedPayload {
  tenant_id: string;
  stream_id: string;
  marked_by_user_id: string;
  date: string;
  present_count: number;
  absent_count: number;
}

export interface DisciplineIncidentReportedPayload {
  tenant_id: string;
  incident_id: string;
  student_id: string;
  reported_by_user_id: string;
  date: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface WelfareCaseReferredPayload {
  tenant_id: string;
  referral_id: string;
  student_id: string;
  referred_by_user_id: string;
  date: string;
  reason: string;
}

export interface SystemRepairTriggeredPayload {
  action: string;
  error: string;
}

export interface SystemFallbackActivatedPayload {
  action: string;
  error: string;
}

export interface GradingSystemCreatedPayload {
  tenant_id: string;
  system_id: string;
  name: string;
  created_by_user_id: string;
}

export interface ReportCardPublishedPayload {
  tenant_id: string;
  report_id: string;
  student_id: string;
  exam_id: string;
  published_by_user_id: string;
}

export interface TimetableLifecyclePayload {
  tenant_id: string;
  entity_id: string;
  academic_year: string;
  term_name: string;
  action: 'created' | 'updated' | 'cancelled' | 'revision_created' | 'published';
  occurred_at: string;
  metadata?: Record<string, unknown>;
}

export interface AcademicSetupChangedPayload {
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  version: number;
  occurred_at: string;
  previous_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

export interface DomainEventPayloadMap {
  'student.created': StudentCreatedPayload;
  'student.lifecycle.enrolled': StudentLifecycleEnrolledPayload;
  'student.lifecycle.class_assigned': StudentLifecycleClassAssignedPayload;
  'student.lifecycle.suspended': StudentLifecycleSuspendedPayload;
  'student.lifecycle.exited': StudentLifecycleExitedPayload;
  'student.lifecycle.archived': StudentLifecycleArchivedPayload;
  'student.academic_enrollment.created': StudentAcademicEnrollmentCreatedPayload;
  'student.academic_lifecycle.changed': StudentAcademicLifecycleChangedPayload;
  'payment.completed': PaymentCompletedPayload;
  'exam.submitted': ExamSubmittedPayload;
  'dean.approval.granted': DeanApprovalGrantedPayload;
  'discipline.case.escalated': DisciplineCaseEscalatedPayload;
  'school.operation.recorded': SchoolOperationRecordedPayload;
  'workflow.action.dispatched': WorkflowActionDispatchedPayload;
  'workflow.action.completed': WorkflowActionCompletedPayload;
  'boarding.request.submitted': BoardingRequestSubmittedPayload;
  'transport.request.submitted': TransportRequestSubmittedPayload;
  'counselling.referral.submitted': CounsellingReferralSubmittedPayload;
  'procurement.request.submitted': ProcurementRequestSubmittedPayload;
  'lab.request.submitted': LabRequestSubmittedPayload;
  'asset.request.submitted': AssetRequestSubmittedPayload;
  'attendance.register.marked': AttendanceRegisterMarkedPayload;
  'discipline.incident.reported': DisciplineIncidentReportedPayload;
  'welfare.case.referred': WelfareCaseReferredPayload;
  'system.repair.triggered': SystemRepairTriggeredPayload;
  'system.fallback.activated': SystemFallbackActivatedPayload;
  'grading.system.created': GradingSystemCreatedPayload;
  'report.card.published': ReportCardPublishedPayload;
  'communication.sms.queued': CommunicationSmsQueuedPayload;
  'admissions.cleared': AdmissionsClearedPayload;
  'staff.updated': StaffUpdatedPayload;
  'staff.invited': StaffInvitedPayload;
  'staff.activated': StaffActivatedPayload;
  'staff.role_updated': StaffRoleUpdatedPayload;
  'counselling.session.created': CounsellingSessionCreatedPayload;
  'counselling.referral.accepted': CounsellingReferralAcceptedPayload;
  'counselling.referral.declined': CounsellingReferralDeclinedPayload;
  'counselling.note.created': CounsellingNoteCreatedPayload;
  'counselling.plan.created': CounsellingPlanCreatedPayload;
  'timetable.slot.created': TimetableLifecyclePayload;
  'timetable.slot.updated': TimetableLifecyclePayload;
  'timetable.slot.cancelled': TimetableLifecyclePayload;
  'timetable.version.revision_created': TimetableLifecyclePayload;
  'timetable.version.published': TimetableLifecyclePayload;
  'academic.calendar.updated': AcademicSetupChangedPayload;
  'academic.class.updated': AcademicSetupChangedPayload;
  'academic.stream.updated': AcademicSetupChangedPayload;
  'academic.department.updated': AcademicSetupChangedPayload;
  'academic.hod.reassigned': AcademicSetupChangedPayload;
  'academic.subject.updated': AcademicSetupChangedPayload;
  'academic.teacher_assignment.changed': AcademicSetupChangedPayload;
  'academic.policy.updated': AcademicSetupChangedPayload;
  'academic.role_assignment.changed': AcademicSetupChangedPayload;
  'academic.curriculum.updated': AcademicSetupChangedPayload;
  'academic.setup.merged': AcademicSetupChangedPayload;
}

export interface DomainEvent<
  TName extends SupportedDomainEventName = SupportedDomainEventName,
> {
  id: string;
  tenant_id: string;
  school_id?: string;
  event_key: string;
  event_name: TName;
  aggregate_type: string;
  aggregate_id: string;
  payload: DomainEventPayloadMap[TName];
  headers: Record<string, unknown>;
  status: OutboxEventStatus;
  attempt_count: number;
  available_at: string;
  published_at: string | null;
  last_error: string | null;
  actor_user_id?: string | null;
  actor_role?: string | null;
  source_dashboard?: string | null;
  correlation_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClaimedOutboxEvent {
  id: string;
  tenant_id: string;
  request_id: string;
  trace_id: string;
  span_id: string | null;
  user_id: string;
  role: string | null;
  session_id: string | null;
}

export interface PublishDomainEventInput<
  TName extends SupportedDomainEventName = SupportedDomainEventName,
> {
  tenant_id?: string;
  school_id?: string;
  event_key: string;
  event_name: TName;
  aggregate_type: string;
  aggregate_id: string;
  payload: DomainEventPayloadMap[TName];
  headers?: Record<string, unknown>;
  available_at?: string;
  actor_user_id?: string | null;
  actor_role?: string | null;
  source_dashboard?: string | null;
  correlation_id?: string | null;
}

export interface EventConsumerDescriptor<
  TName extends SupportedDomainEventName = SupportedDomainEventName,
> {
  readonly name: string;
  readonly event_name: TName;
  handle(event: DomainEvent<TName>): Promise<void>;
}

export interface EventConsumerRunRecord {
  id: string;
  tenant_id: string;
  outbox_event_id: string;
  event_key: string;
  consumer_name: string;
  status: EventConsumerRunStatus;
  attempt_count: number;
  last_error: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DispatchOutboxEventJobPayload {
  outbox_event_id: string;
  tenant_id: string;
  request_id: string;
  trace_id?: string;
  parent_span_id?: string | null;
  user_id?: string;
  role?: string | null;
  session_id?: string | null;
  enqueued_at?: string;
}

export type DashboardRealtimeEventType =
  | 'SCHOOL_DATA_CHANGED'
  | 'EXAM_SUBMITTED'
  | 'DEAN_APPROVAL_GRANTED'
  | 'FEE_PAYMENT_COMPLETED'
  | 'DISCIPLINE_CASE_ESCALATED'
  | 'SCHOOL_OPERATION_RECORDED'
  | 'WORKFLOW_ACTION_DISPATCHED'
  | 'WORKFLOW_ACTION_COMPLETED'
  | 'BOARDING_REQUEST_SUBMITTED'
  | 'TRANSPORT_REQUEST_SUBMITTED'
  | 'COUNSELLING_REFERRAL_SUBMITTED'
  | 'PROCUREMENT_REQUEST_SUBMITTED'
  | 'LAB_REQUEST_SUBMITTED'
  | 'ASSET_REQUEST_SUBMITTED'
  | 'ATTENDANCE_REGISTER_MARKED'
  | 'DISCIPLINE_INCIDENT_REPORTED'
  | 'WELFARE_CASE_REFERRED';

export interface DashboardRealtimeNotification {
  id: string;
  eventType: DashboardRealtimeEventType;
  title: string;
  body: string;
  tone: 'info' | 'ok' | 'warning' | 'critical';
  targetChannels: string[];
  createdAt: string;
}

export interface DashboardRealtimeEvent {
  id: string;
  type: DashboardRealtimeEventType;
  tenantId: string;
  sourceModule: string;
  entityId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  channels: string[];
  notification: DashboardRealtimeNotification;
}

export interface DashboardRealtimeSnapshot {
  tenant_id: string;
  generated_at: string;
  cursor: string | null;
  events: DashboardRealtimeEvent[];
}

export interface CommunicationSmsQueuedPayload {
  tenant_id: string;
  sms_id: string;
  recipient_phone: string;
  message: string;
  sent_by: string;
}

export interface AdmissionsClearedPayload {
  tenant_id: string;
  applicant_id: string;
  cleared_by: string;
}

export interface StaffUpdatedPayload {
  tenant_id: string;
  staff_id: string;
  updated_fields: string[];
  updated_by: string;
}

export interface StaffInvitedPayload {
  tenant_id: string;
  staff_id: string;
  email: string;
  invited_by: string;
}

export interface StaffActivatedPayload {
  tenant_id: string;
  staff_id: string;
  activated_by: string;
}

export interface StaffRoleUpdatedPayload {
  tenant_id: string;
  staff_id: string;
  role: string;
  updated_by: string;
}

export interface CounsellingSessionCreatedPayload {
  tenant_id: string;
  session_id: string;
  student_id: string;
  counsellor_user_id: string;
  scheduled_for: string;
  status: string;
}

export interface CounsellingReferralAcceptedPayload {
  tenant_id: string;
  referral_id: string;
  counsellor_user_id: string;
  accepted_at: string;
}

export interface CounsellingReferralDeclinedPayload {
  tenant_id: string;
  referral_id: string;
  counsellor_user_id: string;
  declined_at: string;
  reason?: string | null;
}

export interface CounsellingNoteCreatedPayload {
  tenant_id: string;
  note_id: string;
  session_id: string;
  student_id: string;
  counsellor_user_id: string;
  created_at: string;
}

export interface CounsellingPlanCreatedPayload {
  tenant_id: string;
  plan_id: string;
  student_id: string;
  counsellor_user_id: string;
  created_at: string;
}
