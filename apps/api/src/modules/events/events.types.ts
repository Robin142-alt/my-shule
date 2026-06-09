export type SupportedDomainEventName =
  | 'student.created'
  | 'student.academic_enrollment.created'
  | 'student.academic_lifecycle.changed'
  | 'payment.completed'
  | 'exam.submitted'
  | 'dean.approval.granted'
  | 'discipline.case.escalated'
  | 'school.operation.recorded'
  | 'workflow.action.dispatched'
  | 'workflow.action.completed';
export type OutboxEventStatus =
  | 'pending'
  | 'processing'
  | 'published'
  | 'failed'
  | 'discarded';
export type EventConsumerRunStatus = 'processing' | 'completed' | 'failed';

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

export interface DomainEventPayloadMap {
  'student.created': StudentCreatedPayload;
  'student.academic_enrollment.created': StudentAcademicEnrollmentCreatedPayload;
  'student.academic_lifecycle.changed': StudentAcademicLifecycleChangedPayload;
  'payment.completed': PaymentCompletedPayload;
  'exam.submitted': ExamSubmittedPayload;
  'dean.approval.granted': DeanApprovalGrantedPayload;
  'discipline.case.escalated': DisciplineCaseEscalatedPayload;
  'school.operation.recorded': SchoolOperationRecordedPayload;
  'workflow.action.dispatched': WorkflowActionDispatchedPayload;
  'workflow.action.completed': WorkflowActionCompletedPayload;
}

export interface DomainEvent<
  TName extends SupportedDomainEventName = SupportedDomainEventName,
> {
  id: string;
  tenant_id: string;
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
  tenant_id: string;
  event_key: string;
  event_name: TName;
  aggregate_type: string;
  aggregate_id: string;
  payload: DomainEventPayloadMap[TName];
  headers?: Record<string, unknown>;
  available_at?: string;
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
  | 'EXAM_SUBMITTED'
  | 'DEAN_APPROVAL_GRANTED'
  | 'FEE_PAYMENT_COMPLETED'
  | 'DISCIPLINE_CASE_ESCALATED'
  | 'SCHOOL_OPERATION_RECORDED'
  | 'WORKFLOW_ACTION_DISPATCHED'
  | 'WORKFLOW_ACTION_COMPLETED';

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
