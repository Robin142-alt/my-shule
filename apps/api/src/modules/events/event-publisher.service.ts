import { BadRequestException, Injectable } from '@nestjs/common';

import { AUTH_ANONYMOUS_USER_ID } from '../../auth/auth.constants';
import { RequestContextService } from '../../common/request-context/request-context.service';
import {
  DomainEvent,
  DeanApprovalGrantedPayload,
  DisciplineCaseEscalatedPayload,
  ExamSubmittedPayload,
  PaymentCompletedPayload,
  PublishDomainEventInput,
  StudentCreatedPayload,
  SupportedDomainEventName,
  CommunicationSmsQueuedPayload,
  AdmissionsClearedPayload,
  StaffUpdatedPayload,
  ReportCardPublishedPayload,
  StaffInvitedPayload,
  StaffActivatedPayload,
  StaffRoleUpdatedPayload,
  CounsellingSessionCreatedPayload,
  CounsellingReferralAcceptedPayload,
  CounsellingReferralDeclinedPayload,
  CounsellingNoteCreatedPayload,
  CounsellingPlanCreatedPayload,
  ProcurementRequestSubmittedPayload,
} from './events.types';
import { OutboxEventsRepository } from './repositories/outbox-events.repository';

@Injectable()
export class EventPublisherService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly outboxEventsRepository: OutboxEventsRepository,
  ) {}

  async publish<TName extends SupportedDomainEventName>(
    input: Omit<PublishDomainEventInput<TName>, 'tenant_id' | 'school_id' | 'headers'> & {
      tenant_id?: string;
      school_id?: string;
      headers?: Record<string, unknown>;
      actor_user_id?: string | null;
      actor_role?: string | null;
      source_dashboard?: string | null;
      correlation_id?: string | null;
    },
  ): Promise<DomainEvent<TName>> {
    const requestContext = this.requestContext.requireStore();
    const schoolId = input.school_id ?? input.tenant_id ?? requestContext.tenant_id;

    if (!schoolId) {
      throw new BadRequestException('Tenant context is required for domain event publishing');
    }

    const actorUserId = input.actor_user_id ?? (
      requestContext.user_id && requestContext.user_id !== AUTH_ANONYMOUS_USER_ID
        ? requestContext.user_id
        : null
    );
    const actorRole = input.actor_role ?? requestContext.role ?? null;
    const sourceDashboard = input.source_dashboard ?? requestContext.role ?? 'system';
    const correlationId = this.normalizeUuidOrNull(input.correlation_id ?? requestContext.trace_id);

    return this.outboxEventsRepository.createEvent({
      tenant_id: schoolId,
      school_id: schoolId,
      event_key: this.requireNonEmptyText(input.event_key, 'event_key'),
      event_name: input.event_name,
      aggregate_type: this.requireNonEmptyText(input.aggregate_type, 'aggregate_type'),
      aggregate_id: this.requireNonEmptyText(input.aggregate_id, 'aggregate_id'),
      payload: input.payload,
      headers: {
        request_id: requestContext.request_id,
        trace_id: requestContext.trace_id,
        span_id: requestContext.span_id,
        parent_span_id: requestContext.parent_span_id,
        user_id: actorUserId,
        role: actorRole,
        session_id: requestContext.session_id,
        ...input.headers,
      },
      available_at: input.available_at,
      actor_user_id: actorUserId,
      actor_role: actorRole,
      source_dashboard: sourceDashboard,
      correlation_id: correlationId,
    }) as Promise<DomainEvent<TName>>;
  }

  async publishStudentCreated(payload: StudentCreatedPayload): Promise<DomainEvent<'student.created'>> {
    return this.publish({
      event_key: `student.created:${payload.student_id}`,
      event_name: 'student.created',
      aggregate_type: 'student',
      aggregate_id: payload.student_id,
      payload,
    });
  }

  async publishPaymentCompleted(
    payload: PaymentCompletedPayload,
  ): Promise<DomainEvent<'payment.completed'>> {
    return this.publish({
      event_key: `payment.completed:${payload.payment_intent_id}`,
      event_name: 'payment.completed',
      aggregate_type: 'payment',
      aggregate_id: payload.payment_intent_id,
      payload,
    });
  }

  async publishExamSubmitted(payload: ExamSubmittedPayload): Promise<DomainEvent<'exam.submitted'>> {
    return this.publish({
      event_key: `exam.submitted:${payload.exam_id}`,
      event_name: 'exam.submitted',
      aggregate_type: 'exam',
      aggregate_id: payload.exam_id,
      payload,
    });
  }

  async publishDeanApprovalGranted(
    payload: DeanApprovalGrantedPayload,
  ): Promise<DomainEvent<'dean.approval.granted'>> {
    return this.publish({
      event_key: `dean.approval.granted:${payload.approval_id}`,
      event_name: 'dean.approval.granted',
      aggregate_type: 'exam_approval',
      aggregate_id: payload.approval_id,
      payload,
    });
  }

  async publishDisciplineCaseEscalated(
    payload: DisciplineCaseEscalatedPayload,
  ): Promise<DomainEvent<'discipline.case.escalated'>> {
    return this.publish({
      event_key: `discipline.case.escalated:${payload.case_id}`,
      event_name: 'discipline.case.escalated',
      aggregate_type: 'discipline_case',
      aggregate_id: payload.case_id,
      payload,
    });
  }

  async publishAttendanceRegisterMarked(
    payload: import('./events.types').AttendanceRegisterMarkedPayload,
  ): Promise<DomainEvent<'attendance.register.marked'>> {
    return this.publish({
      event_key: `attendance.register.marked:${payload.stream_id}:${payload.date}`,
      event_name: 'attendance.register.marked',
      aggregate_type: 'attendance_register',
      aggregate_id: payload.stream_id,
      payload,
    });
  }

  async publishDisciplineIncidentReported(
    payload: import('./events.types').DisciplineIncidentReportedPayload,
  ): Promise<DomainEvent<'discipline.incident.reported'>> {
    return this.publish({
      event_key: `discipline.incident.reported:${payload.incident_id}`,
      event_name: 'discipline.incident.reported',
      aggregate_type: 'discipline_incident',
      aggregate_id: payload.incident_id,
      payload,
    });
  }

  async publishWelfareCaseReferred(
    payload: import('./events.types').WelfareCaseReferredPayload,
  ): Promise<DomainEvent<'welfare.case.referred'>> {
    return this.publish({
      event_key: `welfare.case.referred:${payload.referral_id}`,
      event_name: 'welfare.case.referred',
      aggregate_type: 'welfare_case',
      aggregate_id: payload.referral_id,
      payload,
    });
  }

  async publishGradingSystemCreated(
    payload: import('./events.types').GradingSystemCreatedPayload,
  ): Promise<DomainEvent<'grading.system.created'>> {
    return this.publish({
      event_key: `grading.system.created:${payload.system_id}`,
      event_name: 'grading.system.created',
      aggregate_type: 'grading_system',
      aggregate_id: payload.system_id,
      payload,
    });
  }

  async publishReportCardPublished(
    payload: ReportCardPublishedPayload,
  ): Promise<DomainEvent<'report.card.published'>> {
    return this.publish({
      event_key: `report.card.published:${payload.report_id}`,
      event_name: 'report.card.published',
      aggregate_type: 'report_card',
      aggregate_id: payload.report_id,
      payload,
    });
  }

  async publishCommunicationSmsQueued(
    payload: CommunicationSmsQueuedPayload,
  ): Promise<DomainEvent<'communication.sms.queued'>> {
    return this.publish({
      event_key: `communication.sms.queued:${payload.sms_id}`,
      event_name: 'communication.sms.queued',
      aggregate_type: 'communication',
      aggregate_id: payload.sms_id,
      payload,
    });
  }

  async publishAdmissionsCleared(
    payload: AdmissionsClearedPayload,
  ): Promise<DomainEvent<'admissions.cleared'>> {
    return this.publish({
      event_key: `admissions.cleared:${payload.applicant_id}`,
      event_name: 'admissions.cleared',
      aggregate_type: 'admission',
      aggregate_id: payload.applicant_id,
      payload,
    });
  }

  async publishStaffUpdated(
    payload: StaffUpdatedPayload,
  ): Promise<DomainEvent<'staff.updated'>> {
    return this.publish({
      event_key: `staff.updated:${payload.staff_id}`,
      event_name: 'staff.updated',
      aggregate_type: 'staff',
      aggregate_id: payload.staff_id,
      payload,
    });
  }

  async publishStaffInvited(
    payload: StaffInvitedPayload,
  ): Promise<DomainEvent<'staff.invited'>> {
    return this.publish({
      event_key: `staff.invited:${payload.staff_id}`,
      event_name: 'staff.invited',
      aggregate_type: 'staff',
      aggregate_id: payload.staff_id,
      payload,
    });
  }

  async publishStaffActivated(
    payload: StaffActivatedPayload,
  ): Promise<DomainEvent<'staff.activated'>> {
    return this.publish({
      event_key: `staff.activated:${payload.staff_id}`,
      event_name: 'staff.activated',
      aggregate_type: 'staff',
      aggregate_id: payload.staff_id,
      payload,
    });
  }

  async publishStaffRoleUpdated(
    payload: StaffRoleUpdatedPayload,
  ): Promise<DomainEvent<'staff.role_updated'>> {
    return this.publish({
      event_key: `staff.role_updated:${payload.staff_id}`,
      event_name: 'staff.role_updated',
      aggregate_type: 'staff',
      aggregate_id: payload.staff_id,
      payload,
    });
  }

  async publishCounsellingSessionCreated(
    payload: CounsellingSessionCreatedPayload,
  ): Promise<DomainEvent<'counselling.session.created'>> {
    return this.publish({
      event_key: `counselling.session.created:${payload.session_id}`,
      event_name: 'counselling.session.created',
      aggregate_type: 'counselling_session',
      aggregate_id: payload.session_id,
      payload,
    });
  }

  async publishCounsellingReferralAccepted(
    payload: CounsellingReferralAcceptedPayload,
  ): Promise<DomainEvent<'counselling.referral.accepted'>> {
    return this.publish({
      event_key: `counselling.referral.accepted:${payload.referral_id}`,
      event_name: 'counselling.referral.accepted',
      aggregate_type: 'counselling_referral',
      aggregate_id: payload.referral_id,
      payload,
    });
  }

  async publishCounsellingReferralDeclined(
    payload: CounsellingReferralDeclinedPayload,
  ): Promise<DomainEvent<'counselling.referral.declined'>> {
    return this.publish({
      event_key: `counselling.referral.declined:${payload.referral_id}`,
      event_name: 'counselling.referral.declined',
      aggregate_type: 'counselling_referral',
      aggregate_id: payload.referral_id,
      payload,
    });
  }

  async publishCounsellingNoteCreated(
    payload: CounsellingNoteCreatedPayload,
  ): Promise<DomainEvent<'counselling.note.created'>> {
    return this.publish({
      event_key: `counselling.note.created:${payload.note_id}`,
      event_name: 'counselling.note.created',
      aggregate_type: 'counselling_note',
      aggregate_id: payload.note_id,
      payload,
    });
  }

  async publishCounsellingPlanCreated(
    payload: CounsellingPlanCreatedPayload,
  ): Promise<DomainEvent<'counselling.plan.created'>> {
    return this.publish({
      event_key: `counselling.plan.created:${payload.plan_id}`,
      event_name: 'counselling.plan.created',
      aggregate_type: 'counselling_plan',
      aggregate_id: payload.plan_id,
      payload,
    });
  }

  async publishProcurementRequestSubmitted(
    payload: ProcurementRequestSubmittedPayload,
  ): Promise<DomainEvent<'procurement.request.submitted'>> {
    return this.publish({
      event_key: `procurement.request.submitted:${payload.request_id}`,
      event_name: 'procurement.request.submitted',
      aggregate_type: 'procurement_request',
      aggregate_id: payload.request_id,
      payload,
    });
  }

  private requireNonEmptyText(value: string, fieldName: string): string {
    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
      throw new BadRequestException(`Domain event ${fieldName} is required`);
    }

    return normalizedValue;
  }

  private normalizeUuidOrNull(value: string | null | undefined): string | null {
    const normalizedValue = value?.trim();

    if (!normalizedValue) {
      return null;
    }

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalizedValue,
    )
      ? normalizedValue
      : null;
  }
}
