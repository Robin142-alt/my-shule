import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  createDashboardCommunicationSystem,
  type DashboardEvent,
} from "@/lib/dashboard-communication/dashboard-communication-system";
import { resolveCapabilityEnforcement } from "@/lib/capability-engine/school-capability-engine";

const activeEnforcement = resolveCapabilityEnforcement({
  tenantLifecycle: "ACTIVE",
  billingState: "PAID",
});

function examSubmittedEvent(overrides: Partial<DashboardEvent> = {}): DashboardEvent {
  return {
    id: "event-exam-1",
    type: "EXAM_SUBMITTED",
    tenantId: "kisumu-boys",
    sourceModule: "exams",
    entityId: "exam-form-2-midterm",
    occurredAt: "2026-05-25T08:30:00.000Z",
    payload: {
      examName: "Form 2 Midterm",
      submittedBy: "Exams Office",
    },
    ...overrides,
  };
}

describe("dashboard communication enforcer", () => {
  it("routes dashboard events through the shared event bus only to matching subscribers", () => {
    const system = createDashboardCommunicationSystem({
      moduleEntitlements: { exams: true, finance: true },
      rolePermissions: ["exams:review", "finance:read"],
      enforcement: activeEnforcement,
    });
    const received: DashboardEvent[] = [];

    system.eventBus.subscribe("EXAM_SUBMITTED", (event) => {
      received.push(event);
    });

    system.eventBus.emit(examSubmittedEvent({
      id: "event-fee-ignored",
      type: "FEE_PAYMENT_COMPLETED",
      sourceModule: "finance",
      entityId: "receipt-1",
    }));
    system.eventBus.emit(examSubmittedEvent());

    expect(received.map((event) => event.id)).toEqual(["event-exam-1"]);
  });

  it("keeps widget state isolated by widget id", () => {
    const system = createDashboardCommunicationSystem({
      moduleEntitlements: { exams: true, discipline: true },
      rolePermissions: ["exams:review", "discipline:read"],
      enforcement: activeEnforcement,
    });

    system.widgetStateStore.setWidgetState("dean.pendingReviews", {
      state: "ACTIVE",
      message: "1 exam pending review",
      lastEventId: "event-exam-1",
    });
    system.widgetStateStore.setWidgetState("discipline.highRisk", {
      state: "EMPTY",
      message: "No high-risk cases",
    });

    expect(system.widgetStateStore.getWidgetState("dean.pendingReviews")).toEqual(
      expect.objectContaining({ state: "ACTIVE", lastEventId: "event-exam-1" }),
    );
    expect(system.widgetStateStore.getWidgetState("discipline.highRisk")).toEqual(
      expect.objectContaining({ state: "EMPTY", message: "No high-risk cases" }),
    );
  });

  it("resolves module outputs from the registry instead of letting dashboards own data", () => {
    const system = createDashboardCommunicationSystem({
      moduleEntitlements: { exams: true },
      rolePermissions: ["exams:review"],
      enforcement: activeEnforcement,
    });

    system.moduleOutputRegistry.registerOutput({
      moduleCode: "exams",
      outputKey: "pending-dean-reviews",
      widgetId: "dean.pendingReviews",
      dataSource: "/api/exams/reviews/pending",
      eventTypes: ["EXAM_SUBMITTED", "EXAM_VALIDATION_FAILED"],
    });

    expect(system.moduleOutputRegistry.resolveOutputsForEvent(examSubmittedEvent())).toEqual([
      expect.objectContaining({
        moduleCode: "exams",
        outputKey: "pending-dean-reviews",
        widgetId: "dean.pendingReviews",
      }),
    ]);
  });

  it("delivers dashboard notifications through the notification channel layer", () => {
    const system = createDashboardCommunicationSystem({
      moduleEntitlements: { exams: true },
      rolePermissions: ["exams:review"],
      enforcement: activeEnforcement,
    });
    const deanNotifications: string[] = [];

    system.notificationChannel.subscribe("role:dean-academics", (notification) => {
      deanNotifications.push(notification.title);
    });

    const deliveryCount = system.notificationChannel.publish({
      id: "notification-dean-1",
      eventType: "EXAM_SUBMITTED",
      title: "Form 2 Midterm ready for Dean review",
      body: "Exams Office submitted the batch for moderation.",
      tone: "warning",
      targetChannels: ["role:dean-academics"],
      createdAt: "2026-05-25T08:31:00.000Z",
    });

    expect(deliveryCount).toBe(1);
    expect(deanNotifications).toEqual(["Form 2 Midterm ready for Dean review"]);
  });

  it("keeps capability-locked widgets locked and ignores matching events", () => {
    const system = createDashboardCommunicationSystem({
      moduleEntitlements: { exams: false },
      rolePermissions: ["exams:review"],
      enforcement: activeEnforcement,
    });
    const handledEvents: string[] = [];

    system.registerWidgetSubscriber({
      widget: {
        id: "dean.pendingReviews",
        moduleCode: "exams",
        hasData: true,
        requiredPermission: "exams:review",
      },
      eventTypes: ["EXAM_SUBMITTED"],
      onEvent: (event) => {
        handledEvents.push(event.id);
      },
    });
    system.eventBus.emit(examSubmittedEvent());

    expect(handledEvents).toEqual([]);
    expect(system.widgetStateStore.getWidgetState("dean.pendingReviews")).toEqual(
      expect.objectContaining({
        state: "LOCKED",
        message: "Module not enabled for this school",
      }),
    );
  });

  it("isolates widget failures as FAILED without stopping other subscribers or hiding the widget", () => {
    const system = createDashboardCommunicationSystem({
      moduleEntitlements: { exams: true },
      rolePermissions: ["exams:review"],
      enforcement: activeEnforcement,
    });
    const healthyWidgetEvents: string[] = [];

    system.registerWidgetSubscriber({
      widget: {
        id: "dean.integrityChecker",
        moduleCode: "exams",
        hasData: true,
        requiredPermission: "exams:review",
      },
      eventTypes: ["EXAM_SUBMITTED"],
      onEvent: () => {
        throw new Error("integrity scan unavailable");
      },
    });
    system.registerWidgetSubscriber({
      widget: {
        id: "dean.pendingReviews",
        moduleCode: "exams",
        hasData: true,
        requiredPermission: "exams:review",
      },
      eventTypes: ["EXAM_SUBMITTED"],
      onEvent: (event) => {
        healthyWidgetEvents.push(event.id);
      },
    });

    system.eventBus.emit(examSubmittedEvent());

    expect(system.widgetStateStore.getWidgetState("dean.integrityChecker")).toEqual(
      expect.objectContaining({
        state: "FAILED",
        message: "Widget failed while processing event",
        lastEventId: "event-exam-1",
      }),
    );
    expect(healthyWidgetEvents).toEqual(["event-exam-1"]);
  });

  it("prevents school command centers from importing other dashboard command centers directly", () => {
    const commandCenterDir = join(process.cwd(), "src", "components", "school");
    const commandCenterFiles = readdirSync(commandCenterDir)
      .filter((fileName) => fileName.endsWith("-command-center.tsx"));

    for (const fileName of commandCenterFiles) {
      const source = readFileSync(join(commandCenterDir, fileName), "utf8");

      expect(source).not.toMatch(/from\s+["'](?:@\/components\/school\/|\.\/|\.\.\/).*command-center["']/);
    }
  });
});
