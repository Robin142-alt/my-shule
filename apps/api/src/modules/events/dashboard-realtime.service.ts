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
  sourceModule: string;
  requiredPermission: string;
  roleChannels: string[];
  title: string;
  tone: DashboardRealtimeNotification['tone'];
  body(event: DomainEvent): string;
}

interface DashboardRealtimeFilter {
  enabledModules: string[];
  permissions: string[];
}

interface DashboardSnapshotOptions {
  since?: string | null;
  limit?: number;
}

const eventConfigs: Partial<Record<SupportedDomainEventName, DashboardEventConfig>> = {
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

    if (
      !this.isCoreSource(config.sourceModule)
      && !filter.enabledModules.includes(config.sourceModule)
    ) {
      return null;
    }

    if (!this.hasPermission(filter.permissions, config.requiredPermission)) {
      return null;
    }

    const channels = [
      `tenant:${event.tenant_id}`,
      `module:${config.sourceModule}`,
      ...config.roleChannels,
    ];

    return {
      id: event.id,
      type: config.type,
      tenantId: event.tenant_id,
      sourceModule: config.sourceModule,
      entityId: this.entityIdForDashboard(event),
      occurredAt: event.created_at,
      payload: payloadRecord(event),
      channels,
      notification: {
        id: `notification:${event.id}`,
        eventType: config.type,
        title: config.title,
        body: config.body(event),
        tone: config.tone,
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
    const pollMs = Math.max(1000, Number(this.configService?.get<number>('events.dashboardRealtimePollMs') ?? 5000));
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

  private hasPermission(permissions: string[], requiredPermission: string): boolean {
    const [moduleName] = requiredPermission.split(':');

    return (
      permissions.includes('*:*')
      || permissions.includes(requiredPermission)
      || permissions.includes(`${moduleName}:*`)
    );
  }

  private isCoreSource(sourceModule: string): boolean {
    return sourceModule === 'platform';
  }

  private entityIdForDashboard(event: DomainEvent): string {
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
}

function payloadRecord(event: DomainEvent): Record<string, unknown> {
  return event.payload as unknown as Record<string, unknown>;
}
