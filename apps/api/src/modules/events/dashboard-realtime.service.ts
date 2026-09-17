import {
  Injectable,
  MessageEvent,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, concat, from, interval, map, Observable, of, switchMap } from 'rxjs';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { ModuleAccessService } from '../module-access/module-access.service';
import {
  DashboardRealtimeEvent,
  DashboardRealtimeEventType,
  DashboardRealtimeNotification,
  DashboardRealtimeSnapshot,
  DomainEvent,
  SupportedDomainEventName,
} from './events.types';
import { OutboxEventsRepository } from './repositories/outbox-events.repository';

interface DashboardEventConfig {
  type: DashboardRealtimeEventType;
  sourceModule: string | ((event: DomainEvent) => string);
  requiredPermission: string | string[] | ((event: DomainEvent) => string | string[]);
  roleChannels: string[] | ((event: DomainEvent) => string[]);
  title: string | ((event: DomainEvent) => string);
  tone:
    | DashboardRealtimeNotification['tone']
    | ((event: DomainEvent) => DashboardRealtimeNotification['tone']);
  body(event: DomainEvent): string;
}

interface DashboardRealtimeFilter {
  enabledModules: string[];
  permissions: string[];
  role?: string | null;
  userId?: string | null;
}

interface DashboardSnapshotOptions {
  since?: string | null;
  limit?: number;
}

const eventConfigs: Partial<Record<SupportedDomainEventName, DashboardEventConfig>> = {
  'student.created': schoolDataChangedConfig(
    'Student record created',
    'admissions',
    ['students:read', 'admissions:read'],
    ['principal', 'deputy-principal', 'admissions-officer', 'secretary', 'teacher', 'class-teacher', 'grade-master'],
  ),
  'student.lifecycle.enrolled': schoolDataChangedConfig(
    'Student enrolled',
    'admissions',
    ['students:read', 'admissions:read'],
    ['principal', 'deputy-principal', 'admissions-officer', 'secretary', 'class-teacher', 'grade-master'],
    'ok',
  ),
  'student.lifecycle.class_assigned': schoolDataChangedConfig(
    'Student class placement updated',
    'academics',
    ['students:read', 'admissions:read', 'academics:read'],
    ['principal', 'deputy-principal', 'admissions-officer', 'secretary', 'teacher', 'class-teacher', 'grade-master'],
  ),
  'student.lifecycle.suspended': schoolDataChangedConfig(
    'Student suspension recorded',
    'discipline',
    ['students:read', 'discipline:read', 'discipline:manage'],
    ['principal', 'deputy-principal', 'discipline-master', 'class-teacher', 'grade-master'],
    'warning',
  ),
  'student.lifecycle.exited': schoolDataChangedConfig(
    'Student exit recorded',
    'admissions',
    ['students:read', 'admissions:read'],
    ['principal', 'deputy-principal', 'admissions-officer', 'secretary', 'class-teacher', 'grade-master'],
    'warning',
  ),
  'student.lifecycle.archived': schoolDataChangedConfig(
    'Student record archived',
    'admissions',
    ['students:read', 'admissions:read'],
    ['principal', 'deputy-principal', 'admissions-officer', 'secretary'],
  ),
  'student.academic_enrollment.created': schoolDataChangedConfig(
    'Academic enrollment created',
    'academics',
    ['students:read', 'admissions:read', 'academics:read'],
    ['principal', 'deputy-principal', 'admissions-officer', 'secretary', 'teacher', 'class-teacher', 'grade-master', 'exams-manager'],
    'ok',
  ),
  'student.academic_lifecycle.changed': schoolDataChangedConfig(
    'Student academic lifecycle updated',
    'academics',
    ['students:read', 'academics:read'],
    ['principal', 'deputy-principal', 'admissions-officer', 'teacher', 'class-teacher', 'grade-master', 'dean-academics', 'exams-manager'],
  ),
  'payment.completed': {
    type: 'FEE_PAYMENT_COMPLETED',
    sourceModule: 'finance',
    requiredPermission: 'finance:read',
    roleChannels: ['role:bursar', 'role:accountant', 'role:principal'],
    title: 'Fee payment completed',
    tone: 'ok',
    body: (event) => {
      const payload = payloadRecord(event);
      const amountMinor = Number(payload.amount_minor ?? 0);
      const amount = Number.isFinite(amountMinor) ? amountMinor / 100 : 0;
      const currency = typeof payload.currency_code === 'string' ? payload.currency_code : 'KES';
      const accountReference =
        typeof payload.account_reference === 'string' ? payload.account_reference : event.aggregate_id;

      return `${currency} ${amount} received for ${accountReference}.`;
    },
  },
  'exam.submitted': {
    type: 'EXAM_SUBMITTED',
    sourceModule: 'exams',
    requiredPermission: 'exams:review',
    roleChannels: ['role:dean-academics', 'role:principal', 'role:exams-manager'],
    title: 'Exam submitted for review',
    tone: 'warning',
    body: (event) => {
      const payload = payloadRecord(event);
      const examName = typeof payload.exam_name === 'string' ? payload.exam_name : 'Exam batch';
      const className = typeof payload.class_name === 'string' ? payload.class_name : 'class';
      const streamName = typeof payload.stream_name === 'string' ? payload.stream_name : 'stream';

      return `${examName} for ${className} ${streamName} is ready for moderation.`;
    },
  },
  'dean.approval.granted': {
    type: 'DEAN_APPROVAL_GRANTED',
    sourceModule: 'exams',
    requiredPermission: 'exams:approve',
    roleChannels: ['role:principal', 'role:exams-manager'],
    title: 'Dean academic approval updated',
    tone: 'info',
    body: (event) => {
      const payload = payloadRecord(event);
      const examName = typeof payload.exam_name === 'string' ? payload.exam_name : 'Exam batch';
      const decision = typeof payload.decision === 'string' ? payload.decision : 'reviewed';

      return `${examName} was ${decision} by the Dean.`;
    },
  },
  'discipline.case.escalated': {
    type: 'DISCIPLINE_CASE_ESCALATED',
    sourceModule: 'discipline',
    requiredPermission: 'discipline:read',
    roleChannels: ['role:discipline-master', 'role:deputy-principal', 'role:principal'],
    title: 'Discipline case escalated',
    tone: 'critical',
    body: (event) => {
      const payload = payloadRecord(event);
      const studentName = typeof payload.student_name === 'string' ? payload.student_name : 'A student';
      const severity = typeof payload.severity === 'string' ? payload.severity : 'case';

      return `${studentName} has a ${severity} discipline escalation.`;
    },
  },
  'school.operation.recorded': {
    type: 'SCHOOL_OPERATION_RECORDED',
    sourceModule: (event) => {
      const payload = payloadRecord(event);

      return typeof payload.module === 'string' && payload.module.trim()
        ? payload.module.trim()
        : 'platform';
    },
    requiredPermission: (event) => {
      const payload = payloadRecord(event);
      const moduleName = typeof payload.module === 'string' && payload.module.trim()
        ? payload.module.trim()
        : 'platform';

      if (moduleName === 'exams' && ['exam.series_published', 'exam.series_withdrawn'].includes(String(payload.operation_type))) {
        return ['exams:read', 'exams:subject-analytics'];
      }
      return moduleName === 'platform' ? 'auth:read' : `${moduleName}:read`;
    },
    roleChannels: (event) => {
      const payload = payloadRecord(event);
      const roles = Array.isArray(payload.target_roles) ? payload.target_roles : [];
      const userIds = Array.isArray(payload.target_user_ids) ? payload.target_user_ids : [];

      return [
        ...roles
          .filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
          .map((role) => `role:${role.trim()}`),
        ...userIds
          .filter((userId): userId is string => typeof userId === 'string' && userId.trim().length > 0)
          .map((userId) => `user:${userId.trim()}`),
      ];
    },
    title: (event) => {
      const payload = payloadRecord(event);

      return typeof payload.title === 'string' && payload.title.trim()
        ? payload.title.trim()
        : 'School update recorded';
    },
    tone: (event) => {
      const payload = payloadRecord(event);

      if (payload.severity === 'success') {
        return 'ok';
      }

      if (payload.severity === 'warning' || payload.severity === 'critical') {
        return payload.severity;
      }

      return 'info';
    },
    body: (event) => {
      const payload = payloadRecord(event);

      return typeof payload.body === 'string' && payload.body.trim()
        ? payload.body.trim()
        : 'A school operation was updated.';
    },
  },
  'workflow.action.dispatched': {
    type: 'WORKFLOW_ACTION_DISPATCHED',
    sourceModule: 'platform',
    requiredPermission: 'platform:operational-execute',
    roleChannels: ['role:principal', 'role:deputy-principal', 'role:school-owner'],
    title: 'Workflow action dispatched',
    tone: 'info',
    body: (event) => {
      const payload = payloadRecord(event);
      const actionId = typeof payload.action_id === 'string' ? payload.action_id : 'workflow action';
      const workflowId = typeof payload.workflow_id === 'string' ? payload.workflow_id : 'workflow';

      return `${actionId} dispatched through ${workflowId}.`;
    },
  },
  'workflow.action.completed': {
    type: 'WORKFLOW_ACTION_COMPLETED',
    sourceModule: 'platform',
    requiredPermission: 'platform:operational-execute',
    roleChannels: ['role:principal', 'role:deputy-principal', 'role:school-owner'],
    title: 'Workflow action completed',
    tone: 'ok',
    body: (event) => {
      const payload = payloadRecord(event);
      const actionId = typeof payload.action_id === 'string' ? payload.action_id : 'workflow action';
      const workflowId = typeof payload.workflow_id === 'string' ? payload.workflow_id : 'workflow';

      return `${actionId} completed through ${workflowId}.`;
    },
  },
  'boarding.request.submitted': {
    type: 'BOARDING_REQUEST_SUBMITTED',
    sourceModule: 'boarding',
    requiredPermission: 'boarding:read',
    roleChannels: ['role:boarding-master', 'role:deputy-principal'],
    title: 'New Boarding Request',
    tone: 'info',
    body: (event) => {
      const payload = payloadRecord(event);
      return `New boarding request for student ${payload.student_id}.`;
    },
  },
  'transport.request.submitted': {
    type: 'TRANSPORT_REQUEST_SUBMITTED',
    sourceModule: 'transport',
    requiredPermission: 'transport:read',
    roleChannels: ['role:transport-manager', 'role:deputy-principal'],
    title: 'New Transport Request',
    tone: 'info',
    body: (event) => {
      const payload = payloadRecord(event);
      return `New transport request for student ${payload.student_id}.`;
    },
  },
  'counselling.referral.submitted': {
    type: 'COUNSELLING_REFERRAL_SUBMITTED',
    sourceModule: 'counselling',
    requiredPermission: 'counselling:read',
    roleChannels: ['role:counsellor', 'role:deputy-principal'],
    title: 'New Counselling Referral',
    tone: (event) => {
      const payload = payloadRecord(event);
      return payload.priority === 'critical' ? 'critical' : payload.priority === 'high' ? 'warning' : 'info';
    },
    body: (event) => {
      const payload = payloadRecord(event);
      return `New counselling referral for student ${payload.student_id}.`;
    },
  },
  'procurement.request.submitted': {
    type: 'PROCUREMENT_REQUEST_SUBMITTED',
    sourceModule: 'procurement',
    requiredPermission: 'procurement:read',
    roleChannels: ['role:storekeeper', 'role:hod', 'role:principal'],
    title: 'New Procurement Request',
    tone: 'info',
    body: (event) => {
      const payload = payloadRecord(event);
      return `Procurement request for ${payload.quantity} ${payload.item_name}.`;
    },
  },
  'procurement.request.approved': schoolDataChangedConfig(
    'Procurement request approved',
    'procurement',
    ['procurement:read', 'procurement:approve'],
    ['principal', 'deputy-principal', 'procurement-officer', 'storekeeper', 'accountant', 'bursar'],
    'ok',
  ),
  'procurement.request.rejected': schoolDataChangedConfig(
    'Procurement request rejected',
    'procurement',
    ['procurement:read', 'procurement:approve'],
    ['principal', 'deputy-principal', 'procurement-officer', 'storekeeper', 'accountant', 'bursar'],
    'warning',
  ),
  'lab.request.submitted': {
    type: 'LAB_REQUEST_SUBMITTED',
    sourceModule: 'lab',
    requiredPermission: 'lab:read',
    roleChannels: ['role:lab-technician', 'role:hod'],
    title: 'New Lab Request',
    tone: 'info',
    body: (event) => {
      const payload = payloadRecord(event);
      return `Lab equipment ${payload.equipment_id} requested for ${payload.date_needed}.`;
    },
  },
  'asset.request.submitted': {
    type: 'ASSET_REQUEST_SUBMITTED',
    sourceModule: 'asset',
    requiredPermission: 'asset:read',
    roleChannels: ['role:system-monitor', 'role:deputy-principal'],
    title: 'New Asset Request',
    tone: 'info',
    body: (event) => {
      const payload = payloadRecord(event);
      return `Asset request submitted for ${payload.asset_type}.`;
    },
  },
  'attendance.register.marked': {
    type: 'ATTENDANCE_REGISTER_MARKED',
    sourceModule: 'academics',
    requiredPermission: 'attendance:read',
    roleChannels: ['role:principal', 'role:deputy-principal'],
    title: 'Attendance Register Marked',
    tone: 'info',
    body: (event) => {
      const payload = payloadRecord(event);
      return `Register marked. Present: ${payload.present_count}, Absent: ${payload.absent_count}.`;
    },
  },
  'discipline.incident.reported': {
    type: 'DISCIPLINE_INCIDENT_REPORTED',
    sourceModule: 'academics',
    requiredPermission: 'discipline:read',
    roleChannels: ['role:discipline-master', 'role:principal', 'role:deputy-principal'],
    title: 'New Discipline Incident',
    tone: (event) => {
      const payload = payloadRecord(event);
      return payload.severity === 'critical' || payload.severity === 'high' ? 'critical' : 'warning';
    },
    body: (event) => {
      const payload = payloadRecord(event);
      return `New discipline incident reported for student ${payload.student_id}.`;
    },
  },
  'welfare.case.referred': {
    type: 'WELFARE_CASE_REFERRED',
    sourceModule: 'academics',
    requiredPermission: 'counselling:read',
    roleChannels: ['role:counsellor', 'role:deputy-principal'],
    title: 'New Welfare Case Referred',
    tone: 'info',
    body: (event) => {
      const payload = payloadRecord(event);
      return `Welfare case referred for student ${payload.student_id}.`;
    },
  },
  'grading.system.created': schoolDataChangedConfig(
    'Grading system created',
    'exams',
    ['exams:read', 'academics:read'],
    ['principal', 'deputy-principal', 'dean-academics', 'exams-manager', 'hod', 'teacher', 'class-teacher', 'grade-master'],
    'ok',
  ),
  'report.card.published': schoolDataChangedConfig(
    'Report card published',
    'exams',
    ['reports:read', 'exams:read', 'auth:read'],
    ['principal', 'deputy-principal', 'dean-academics', 'exams-manager', 'hod', 'class-teacher', 'parent', 'student'],
    'ok',
  ),
  'communication.sms.queued': schoolDataChangedConfig(
    'School message queued',
    'communication',
    ['school_sms:send', 'principal:read', 'deputy:read'],
    ['principal', 'deputy-principal', 'secretary', 'system-monitor'],
  ),
  'communication.sms.provider_accepted': schoolDataChangedConfig(
    'School message accepted by SMS provider',
    'communication',
    ['school_sms:read', 'principal:read', 'deputy:read'],
    ['principal', 'deputy-principal', 'secretary', 'system-monitor'],
    'ok',
  ),
  'communication.sms.delivery_failed': schoolDataChangedConfig(
    'School message delivery failed',
    'communication',
    ['school_sms:read', 'principal:read', 'deputy:read'],
    ['principal', 'deputy-principal', 'secretary', 'system-monitor'],
    'warning',
  ),
  'communication.sms.delivery_unknown': schoolDataChangedConfig(
    'School message delivery requires reconciliation',
    'communication',
    ['school_sms:read', 'principal:read', 'deputy:read'],
    ['principal', 'deputy-principal', 'secretary', 'system-monitor'],
    'warning',
  ),
  'admissions.cleared': schoolDataChangedConfig(
    'Admission cleared',
    'admissions',
    ['admissions:read', 'students:read'],
    ['principal', 'deputy-principal', 'admissions-officer', 'secretary', 'class-teacher', 'grade-master'],
    'ok',
  ),
  'staff.updated': staffDataChangedConfig('Staff record updated'),
  'staff.invited': staffDataChangedConfig('Staff invitation created'),
  'staff.activated': staffDataChangedConfig('Staff account activated', 'ok'),
  'staff.role_updated': staffDataChangedConfig('Staff role updated'),
  'counselling.session.created': counsellingDataChangedConfig('Counselling session created'),
  'counselling.referral.accepted': counsellingDataChangedConfig('Counselling referral accepted', 'ok'),
  'counselling.referral.declined': counsellingDataChangedConfig('Counselling referral declined', 'warning'),
  'counselling.note.created': counsellingDataChangedConfig('Counselling note recorded'),
  'counselling.plan.created': counsellingDataChangedConfig('Counselling plan created'),
  'timetable.slot.created': timetableDataChangedConfig('Timetable slot created'),
  'timetable.slot.updated': timetableDataChangedConfig('Timetable slot updated'),
  'timetable.slot.cancelled': timetableDataChangedConfig('Timetable slot cancelled', 'warning'),
  'timetable.version.revision_created': timetableDataChangedConfig('Timetable revision created'),
  'timetable.version.published': timetableDataChangedConfig('Timetable published', 'ok'),
  'timetable.configuration.updated': timetableDataChangedConfig('Timetable configuration updated'),
  'timetable.requirements.updated': timetableDataChangedConfig('Subject period requirements updated'),
  'timetable.availability.updated': timetableDataChangedConfig('Teacher availability updated'),
  'timetable.resource.created': timetableDataChangedConfig('Timetable resource created', 'ok'),
  'timetable.resource.updated': timetableDataChangedConfig('Timetable resource updated'),
  'timetable.generation.completed': timetableDataChangedConfig('Timetable generation completed', 'ok'),
  'timetable.generation.partial': timetableDataChangedConfig(
    'Timetable generation completed with unscheduled lessons',
    'warning',
  ),
  'timetable.validation.completed': timetableValidationConfig(),
  'timetable.version.copied': timetableDataChangedConfig('Previous timetable copied', 'ok'),
  'timetable.version.auto_fixed': timetableDataChangedConfig('Timetable conflicts auto-fixed', 'ok'),
  'timetable.relief.assigned': timetableReliefConfig('Relief lesson assigned', 'ok'),
  'timetable.relief.cancelled': timetableReliefConfig('Relief lesson cancelled', 'warning'),
  'timetable.export.generated': timetableDataChangedConfig('Timetable export generated', 'ok'),
  'academic.calendar.updated': academicDataChangedConfig('Academic calendar updated'),
  'academic.class.updated': academicDataChangedConfig('Class setup updated'),
  'academic.stream.updated': academicDataChangedConfig('Stream setup updated'),
  'academic.department.updated': academicDataChangedConfig('Department setup updated'),
  'academic.hod.reassigned': academicDataChangedConfig('Head of department reassigned'),
  'academic.subject.updated': academicDataChangedConfig('Subject setup updated'),
  'academic.teacher_assignment.changed': academicDataChangedConfig('Teacher allocation updated'),
  'academic.cohort.promoted': academicDataChangedConfig('Cohort promoted'),
  'academic.policy.updated': academicDataChangedConfig('Academic policy updated'),
  'academic.role_assignment.changed': academicDataChangedConfig('Academic duty assignment updated'),
  'academic.curriculum.updated': academicDataChangedConfig('Curriculum setup updated'),
  'academic.setup.merged': academicDataChangedConfig('Academic setup merged', 'ok'),
};

@Injectable()
export class DashboardRealtimeService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly outboxEventsRepository: OutboxEventsRepository,
    private readonly moduleAccessService: ModuleAccessService,
    private readonly configService?: ConfigService,
  ) {}

  toDashboardEvent(
    event: DomainEvent,
    filter: DashboardRealtimeFilter,
  ): DashboardRealtimeEvent | null {
    const config = eventConfigs[event.event_name];

    if (!config) {
      return null;
    }

    const sourceModule = this.resolveConfigValue(config.sourceModule, event);
    const requiredPermission = this.resolveConfigValue(config.requiredPermission, event);
    const roleChannels = this.resolveConfigValue(config.roleChannels, event);
    const title = this.resolveConfigValue(config.title, event);
    const tone = this.resolveConfigValue(config.tone, event);

    if (
      !this.isCoreSource(sourceModule)
      && !filter.enabledModules.includes(sourceModule)
    ) {
      return null;
    }

    const isExactUserTarget = this.isExactUserTarget(filter.userId, roleChannels);
    if (
      !this.hasPermission(filter.permissions, requiredPermission)
      && !(
        event.event_name === 'school.operation.recorded'
        && isExactUserTarget
        && this.hasPermission(filter.permissions, 'auth:read')
      )
    ) {
      return null;
    }

    if (!this.isAudienceTargeted(filter.role, filter.userId, roleChannels)) {
      return null;
    }

    const channels = [
      `tenant:${event.tenant_id}`,
      `module:${sourceModule}`,
      ...roleChannels,
    ];

    const eventPayload = payloadRecord(event);

    return {
      id: event.id,
      type: config.type,
      tenantId: event.tenant_id,
      sourceModule,
      entityId: this.entityIdForDashboard(event),
      occurredAt: event.created_at,
      payload: eventPayload,
      channels,
      notification: {
        id: `notification:${event.id}`,
        eventType: config.type,
        title,
        body: config.body(event),
        tone,
        targetChannels: channels.filter((channel) => !channel.startsWith('tenant:')),
        createdAt: event.created_at,
      },
    };
  }

  async getCurrentTenantSnapshot(options: DashboardSnapshotOptions = {}): Promise<DashboardRealtimeSnapshot> {
    const tenantId = this.requireTenantId();
    const store = this.requestContext.requireStore();
    const enabledModules = await this.moduleAccessService.listCurrentTenantModules();
    const outboxEvents = await this.outboxEventsRepository.listDashboardStreamEvents(tenantId, {
      since: options.since,
      limit: options.limit,
    });
    const events = outboxEvents
      .map((event) => this.toDashboardEvent(event, {
        enabledModules,
        permissions: store.permissions,
        role: store.role,
        userId: store.user_id,
      }))
      .filter((event): event is DashboardRealtimeEvent => Boolean(event));

    return {
      tenant_id: tenantId,
      generated_at: new Date().toISOString(),
      cursor: this.cursorFromOutboxEvent(outboxEvents.at(-1)) ?? options.since ?? null,
      events,
    };
  }

  streamCurrentTenantEvents(): Observable<MessageEvent> {
    const pollMs = Math.max(5000, Number(this.configService?.get<number>('events.dashboardRealtimePollMs') ?? 15000));
    let cursor: string | null | undefined;

    return concat(of(0), interval(pollMs)).pipe(
      switchMap(() =>
        from(this.getCurrentTenantSnapshot({ since: cursor })).pipe(
          map((snapshot) => {
            cursor = snapshot.cursor;

            return {
              type: 'dashboard.events',
              data: snapshot,
            };
          }),
          catchError((error: unknown) => of({
            type: 'dashboard.events.error',
            data: {
              message: error instanceof Error ? error.message : 'Dashboard realtime stream failed',
            },
          })),
        ),
      ),
    );
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for dashboard realtime events');
    }

    return tenantId;
  }

  private hasPermission(permissions: string[], requiredPermission: string | string[]): boolean {
    const requiredPermissions = Array.isArray(requiredPermission)
      ? requiredPermission
      : [requiredPermission];

    return permissions.includes('*:*') || requiredPermissions.some((permission) => {
      const [moduleName] = permission.split(':');
      return permissions.includes(permission) || permissions.includes(`${moduleName}:*`);
    });
  }

  private isCoreSource(sourceModule: string): boolean {
    return sourceModule === 'platform';
  }

  private isAudienceTargeted(
    role: string | null | undefined,
    userId: string | null | undefined,
    targetChannels: string[],
  ): boolean {
    if (targetChannels.length === 0 || (!role && !userId)) {
      return true;
    }

    const normalizedChannels = targetChannels.map(
      (channel) => channel.trim().toLowerCase().replace(/[ _]+/g, '-'),
    );
    const normalizedRoleChannel = role
      ? `role:${role.trim().toLowerCase().replace(/[ _]+/g, '-')}`
      : null;
    const normalizedUserChannel = userId ? `user:${userId.trim().toLowerCase()}` : null;

    return Boolean(
      (normalizedRoleChannel && normalizedChannels.includes(normalizedRoleChannel))
      || (normalizedUserChannel && normalizedChannels.includes(normalizedUserChannel)),
    );
  }

  private isExactUserTarget(
    userId: string | null | undefined,
    targetChannels: string[],
  ): boolean {
    if (!userId) {
      return false;
    }

    const expectedChannel = `user:${userId.trim().toLowerCase()}`;
    return targetChannels.some((channel) => channel.trim().toLowerCase() === expectedChannel);
  }

  private entityIdForDashboard(event: DomainEvent): string {
    if (event.event_name === 'school.operation.recorded') {
      const payload = payloadRecord(event);

      return typeof payload.entity_id === 'string' && payload.entity_id.trim()
        ? payload.entity_id.trim()
        : typeof payload.operation_id === 'string'
          ? payload.operation_id
          : event.aggregate_id;
    }

    if (
      event.event_name === 'workflow.action.dispatched'
      || event.event_name === 'workflow.action.completed'
    ) {
      const payload = payloadRecord(event);

      return typeof payload.aggregate_id === 'string' ? payload.aggregate_id : event.aggregate_id;
    }

    return event.aggregate_id;
  }

  private cursorFromOutboxEvent(event: DomainEvent | undefined): string | null {
    if (!event) {
      return null;
    }

    return `${event.created_at}|${event.id}`;
  }

  private resolveConfigValue<T>(value: T | ((event: DomainEvent) => T), event: DomainEvent): T {
    return typeof value === 'function'
      ? (value as (event: DomainEvent) => T)(event)
      : value;
  }
}

function payloadRecord(event: DomainEvent): Record<string, unknown> {
  return event.payload as unknown as Record<string, unknown>;
}

function schoolDataChangedConfig(
  title: string,
  sourceModule: string,
  requiredPermission: string | string[],
  roles: string[],
  tone: DashboardRealtimeNotification['tone'] = 'info',
): DashboardEventConfig {
  return {
    type: 'SCHOOL_DATA_CHANGED',
    sourceModule,
    requiredPermission,
    roleChannels: roles.map((role) => `role:${role}`),
    title,
    tone,
    body: () => `${title}. School workspaces will refresh with the latest saved data.`,
  };
}

function staffDataChangedConfig(
  title: string,
  tone: DashboardRealtimeNotification['tone'] = 'info',
) {
  return schoolDataChangedConfig(
    title,
    'staff-management',
    ['users:read', 'principal:read', 'deputy:read'],
    ['principal', 'deputy-principal', 'school-admin', 'secretary', 'dean-academics', 'hod'],
    tone,
  );
}

function counsellingDataChangedConfig(
  title: string,
  tone: DashboardRealtimeNotification['tone'] = 'info',
) {
  return schoolDataChangedConfig(
    title,
    'counselling',
    ['counselling:read', 'principal:read', 'deputy:read'],
    ['principal', 'deputy-principal', 'counsellor'],
    tone,
  );
}

function timetableDataChangedConfig(
  title: string,
  tone: DashboardRealtimeNotification['tone'] = 'info',
) {
  return schoolDataChangedConfig(
    title,
    'timetable',
    ['timetable:read', 'academics:read'],
    ['principal', 'deputy-principal', 'dean-academics', 'exams-manager', 'hod', 'teacher', 'class-teacher', 'grade-master'],
    tone,
  );
}

function timetableValidationConfig(): DashboardEventConfig {
  return {
    ...timetableDataChangedConfig('Timetable validation completed'),
    tone: (event) => {
      const payload = payloadRecord(event);
      return Number(payload.hard_conflicts ?? 0) > 0 ? 'warning' : 'ok';
    },
    body: (event) => {
      const payload = payloadRecord(event);
      const conflicts = Number(payload.hard_conflicts ?? 0);
      const warnings = Number(payload.warnings ?? 0);

      if (conflicts > 0) {
        return `Timetable validation found ${conflicts} hard conflict${conflicts === 1 ? '' : 's'} and ${warnings} warning${warnings === 1 ? '' : 's'}.`;
      }

      return `Timetable validation passed with ${warnings} warning${warnings === 1 ? '' : 's'}.`;
    },
  };
}

function timetableReliefConfig(
  title: string,
  tone: DashboardRealtimeNotification['tone'],
): DashboardEventConfig {
  return {
    ...timetableDataChangedConfig(title, tone),
    roleChannels: (event) => {
      const payload = payloadRecord(event);
      const channels = [
        'role:principal',
        'role:deputy-principal',
        'role:dean-academics',
        'role:hod',
      ];

      if (typeof payload.relief_teacher_id === 'string' && payload.relief_teacher_id.trim()) {
        channels.push(`user:${payload.relief_teacher_id.trim()}`);
      }

      return channels;
    },
    body: (event) => {
      const payload = payloadRecord(event);
      const reliefDate = typeof payload.relief_date === 'string' ? payload.relief_date : 'the selected date';

      return `${title} for ${reliefDate}.`;
    },
  };
}

function academicDataChangedConfig(
  title: string,
  tone: DashboardRealtimeNotification['tone'] = 'info',
) {
  return schoolDataChangedConfig(
    title,
    'academics',
    'academics:read',
    ['principal', 'deputy-principal', 'dean-academics', 'exams-manager', 'hod', 'teacher', 'class-teacher', 'grade-master', 'admissions-officer'],
    tone,
  );
}
