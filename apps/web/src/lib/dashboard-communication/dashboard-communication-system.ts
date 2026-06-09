import {
  resolveWidgetState,
  type CapabilityEnforcementSnapshot,
  type ModuleEntitlementInput,
  type RolePermissionInput,
  type WidgetCapabilityDescriptor,
  type WidgetState,
} from "@/lib/capability-engine/school-capability-engine";

export type DashboardEventType =
  | "EXAM_SUBMITTED"
  | "EXAM_VALIDATION_FAILED"
  | "DEAN_APPROVAL_GRANTED"
  | "FEE_PAYMENT_COMPLETED"
  | "DISCIPLINE_CASE_ESCALATED"
  | "DISCIPLINE_CASE_CREATED"
  | "ATTENDANCE_UPDATED"
  | "MEDICINE_DISPENSED"
  | "VISITOR_CHECKED_IN"
  | "LIBRARY_BOOK_OVERDUE"
  | "ASSET_ISSUED"
  | "STUDENT_ADMITTED"
  | "BUS_ROUTE_CHANGED"
  | "BOARDING_ROLL_CALL_MISSING"
  | "STUDENT_WELFARE_ALERTED"
  | "TRANSPORT_TRIP_UPDATED"
  | "INVENTORY_STOCK_CHANGED"
  | "STAFF_MOVEMENT_UPDATED"
  | "TEACHER_ATTENDANCE_UPDATED"
  | "PARENT_MEETING_BOOKED"
  | "PROCUREMENT_REQUESTED"
  | "LAB_PRACTICAL_REQUESTED"
  | "SMS_DELIVERY_FAILED"
  | "MPESA_CALLBACK_FAILED"
  | "REPORT_GENERATED"
  | "BACKUP_COMPLETED"
  | "DOCUMENT_PRINTED"
  | "TIMETABLE_CLASH_DETECTED"
  | "COUNSELLING_REFERRAL_CREATED"
  | "HOSTEL_EXEAT_REQUESTED"
  | "HR_LEAVE_REQUESTED"
  | "CBT_SESSION_READY"
  | "LMS_ASSIGNMENT_POSTED"
  | "USER_ROLE_CHANGED"
  | "MODULE_ENABLED"
  | "SYSTEM_HEALTH_DEGRADED"
  | "SUPPORT_TICKET_CREATED"
  | "AI_RISK_DETECTED"
  | "IOT_DEVICE_OFFLINE"
  | "VISITOR_EXIT_RECORDED"
  | "STOCK_ISSUE_RECORDED"
  | "LIBRARY_BOOK_ISSUED"
  | "MEDICAL_REFERRAL_CREATED"
  | "ADMISSION_APPLICATION_UPDATED"
  | "REPORT_CARD_GENERATED"
  | "GRADE_PROCESSING_COMPLETED"
  | "FEE_WAIVER_REQUESTED";

export interface DashboardEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  type: DashboardEventType;
  tenantId: string;
  sourceModule: string;
  entityId: string;
  occurredAt: string;
  payload: TPayload;
}

export type DashboardEventHandler = (event: DashboardEvent) => void;

export type WidgetRuntimeState = WidgetState;

export interface WidgetStateRecord {
  state: WidgetRuntimeState;
  message: string;
  lastEventId?: string;
  updatedAt?: string;
}

export interface ModuleOutputDefinition {
  moduleCode: string;
  outputKey: string;
  widgetId: string;
  dataSource: string;
  eventTypes: readonly DashboardEventType[];
}

export interface DashboardNotification {
  id: string;
  eventType: DashboardEventType;
  title: string;
  body: string;
  tone: "info" | "ok" | "warning" | "critical";
  targetChannels: readonly string[];
  createdAt: string;
}

export type DashboardNotificationHandler = (notification: DashboardNotification) => void;

export interface RegisterWidgetSubscriberInput {
  widget: WidgetCapabilityDescriptor;
  eventTypes: readonly DashboardEventType[];
  onEvent: (event: DashboardEvent) => void;
}

export interface DashboardCommunicationSystemOptions {
  moduleEntitlements?: ModuleEntitlementInput;
  rolePermissions?: RolePermissionInput;
  enforcement?: CapabilityEnforcementSnapshot;
}

export class DashboardEventBus {
  private readonly subscribers = new Map<DashboardEventType, Set<DashboardEventHandler>>();

  subscribe(eventType: DashboardEventType, handler: DashboardEventHandler) {
    const handlers = this.subscribers.get(eventType) ?? new Set<DashboardEventHandler>();
    handlers.add(handler);
    this.subscribers.set(eventType, handlers);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(eventType);
      }
    };
  }

  emit(event: DashboardEvent) {
    const handlers = this.subscribers.get(event.type) ?? new Set<DashboardEventHandler>();

    for (const handler of handlers) {
      handler(event);
    }
  }
}

export class WidgetStateStore {
  private readonly states = new Map<string, WidgetStateRecord>();
  private readonly subscribers = new Map<string, Set<(state: WidgetStateRecord) => void>>();

  setWidgetState(widgetId: string, state: WidgetStateRecord) {
    const nextState = {
      ...state,
      updatedAt: state.updatedAt ?? new Date().toISOString(),
    };
    this.states.set(widgetId, nextState);

    const subscribers = this.subscribers.get(widgetId) ?? new Set<(state: WidgetStateRecord) => void>();
    for (const subscriber of subscribers) {
      subscriber(nextState);
    }
  }

  getWidgetState(widgetId: string) {
    return this.states.get(widgetId) ?? null;
  }

  subscribe(widgetId: string, handler: (state: WidgetStateRecord) => void) {
    const handlers = this.subscribers.get(widgetId) ?? new Set<(state: WidgetStateRecord) => void>();
    handlers.add(handler);
    this.subscribers.set(widgetId, handlers);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(widgetId);
      }
    };
  }
}

export class ModuleOutputRegistry {
  private readonly outputs = new Map<string, ModuleOutputDefinition>();

  registerOutput(output: ModuleOutputDefinition) {
    this.outputs.set(`${output.moduleCode}:${output.outputKey}`, output);
  }

  resolveOutputsForEvent(event: DashboardEvent) {
    return [...this.outputs.values()].filter(
      (output) =>
        output.moduleCode === event.sourceModule
        && output.eventTypes.includes(event.type),
    );
  }
}

export class NotificationChannelLayer {
  private readonly subscribers = new Map<string, Set<DashboardNotificationHandler>>();

  subscribe(channel: string, handler: DashboardNotificationHandler) {
    const handlers = this.subscribers.get(channel) ?? new Set<DashboardNotificationHandler>();
    handlers.add(handler);
    this.subscribers.set(channel, handlers);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(channel);
      }
    };
  }

  publish(notification: DashboardNotification) {
    let deliveryCount = 0;

    for (const channel of notification.targetChannels) {
      const handlers = this.subscribers.get(channel) ?? new Set<DashboardNotificationHandler>();

      for (const handler of handlers) {
        handler(notification);
        deliveryCount += 1;
      }
    }

    return deliveryCount;
  }
}

export function createDashboardCommunicationSystem({
  moduleEntitlements,
  rolePermissions,
  enforcement,
}: DashboardCommunicationSystemOptions = {}) {
  const eventBus = new DashboardEventBus();
  const widgetStateStore = new WidgetStateStore();
  const moduleOutputRegistry = new ModuleOutputRegistry();
  const notificationChannel = new NotificationChannelLayer();

  return {
    eventBus,
    widgetStateStore,
    moduleOutputRegistry,
    notificationChannel,
    registerWidgetSubscriber({
      widget,
      eventTypes,
      onEvent,
    }: RegisterWidgetSubscriberInput) {
      const unsubscribers = eventTypes.map((eventType) =>
        eventBus.subscribe(eventType, (event) => {
          const capabilityState = resolveWidgetState({
            widget,
            moduleEntitlements,
            rolePermissions,
            enforcement,
          });

          if (capabilityState.state !== "ACTIVE") {
            widgetStateStore.setWidgetState(widget.id, {
              state: capabilityState.state,
              message: capabilityState.message,
              lastEventId: event.id,
            });
            return;
          }

          try {
            onEvent(event);
          } catch {
            widgetStateStore.setWidgetState(widget.id, {
              state: "FAILED",
              message: "Widget failed while processing event",
              lastEventId: event.id,
            });
          }
        }),
      );

      return () => {
        for (const unsubscribe of unsubscribers) {
          unsubscribe();
        }
      };
    },
  };
}
