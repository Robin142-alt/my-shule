import { resolveCapabilityEnforcement } from "@/lib/capability-engine/school-capability-engine";
import {
  createWidgetRegistry,
  getWidgetsForEvent,
  requiredWidgetStates,
  resolveRegisteredWidgets,
  resolveWidgetActions,
  type WidgetDefinition,
} from "@/lib/widget-registry/widget-registry";

function states() {
  return {
    ACTIVE: { label: "Active", visibility: "VISIBLE" as const },
    EMPTY: { label: "Empty", visibility: "VISIBLE" as const, message: "No data yet" },
    LOCKED: { label: "Locked", visibility: "DISABLED" as const, message: "Capability required" },
    DEGRADED: {
      label: "Degraded",
      visibility: "READONLY" as const,
      message: "Showing fallback data",
      retryable: true,
    },
    FAILED: {
      label: "Failed",
      visibility: "VISIBLE" as const,
      message: "Retry available",
      retryable: true,
    },
    LOADING: {
      label: "Loading",
      visibility: "VISIBLE" as const,
      message: "Loading latest data",
      retryable: false,
    },
  };
}

function widget(overrides: Partial<WidgetDefinition> = {}): WidgetDefinition {
  return {
    widgetId: "finance.feeStatus",
    name: "Fee Status",
    moduleSource: "finance",
    tenantScope: "TENANT",
    rolesAllowed: ["parent"],
    capabilitiesRequired: ["finance:read"],
    lifecycleState: "ACTIVE",
    eventSubscriptions: ["fee.paid", "invoice.updated"],
    dataContract: {
      inputSchema: {
        type: "object",
        properties: { tenantId: { type: "string" } },
        required: ["tenantId"],
      },
      outputSchema: {
        type: "object",
        properties: { balance: { type: "number" } },
        required: ["balance"],
      },
    },
    uiSchema: {
      type: "widget",
      layout: "card",
      renderMode: "LIVE",
    },
    states: states(),
    actions: [
      {
        actionId: "pay-now",
        label: "Pay Now",
        type: "CREATE",
        capabilityRequired: "finance:pay",
        handler: {
          type: "API",
          target: "/api/payments/checkout",
        },
        failurePolicy: "RETRY",
      },
      {
        actionId: "open-ledger",
        label: "Open Ledger",
        type: "NAVIGATE",
        capabilityRequired: "finance:read",
        handler: {
          type: "EVENT_BUS",
          target: "finance.ledger.opened",
        },
        failurePolicy: "DEGRADE",
      },
    ],
    ...overrides,
  };
}

describe("MyShule widget registry enforcer", () => {
  it("accepts only complete six-state widget definitions with unique global IDs", () => {
    const registry = createWidgetRegistry({
      version: "2026.05",
      widgets: [widget()],
    });

    expect(requiredWidgetStates).toEqual(["ACTIVE", "EMPTY", "LOCKED", "DEGRADED", "FAILED", "LOADING"]);
    expect(Object.keys(registry.widgets[0].states).sort()).toEqual([...requiredWidgetStates].sort());

    expect(() =>
      createWidgetRegistry({
        version: "2026.05",
        widgets: [widget(), widget()],
      }),
    ).toThrow(/Duplicate widgetId: finance\.feeStatus/);

    expect(() =>
      createWidgetRegistry({
        version: "2026.05",
        widgets: [
          widget({
            widgetId: "broken.missingFailed",
            states: {
              ACTIVE: states().ACTIVE,
              EMPTY: states().EMPTY,
              LOCKED: states().LOCKED,
              DEGRADED: states().DEGRADED,
              FAILED: states().FAILED,
            } as WidgetDefinition["states"],
          }),
        ],
      }),
    ).toThrow(/missing state config: LOADING/);
  });

  it("resolves all registered widgets through capability engine without hiding locked or degraded widgets", () => {
    const registry = createWidgetRegistry({
      version: "2026.05",
      widgets: [
        widget(),
        widget({
          widgetId: "exams.pendingReviews",
          name: "Pending Reviews",
          moduleSource: "exams",
          rolesAllowed: ["dean-academics"],
          capabilitiesRequired: ["exams:review"],
          eventSubscriptions: ["exam.submitted"],
          uiSchema: {
            type: "widget",
            layout: "table",
            renderMode: "LIVE",
          },
        }),
      ],
    });

    const resolved = resolveRegisteredWidgets({
      registry,
      moduleEntitlements: {
        finance: true,
        exams: false,
      },
      rolePermissions: ["finance:read"],
      enforcement: resolveCapabilityEnforcement({
        tenantLifecycle: "ACTIVE",
        manualBillingState: "ACTIVE",
      }),
      dataAvailability: {
        "finance.feeStatus": true,
        "exams.pendingReviews": true,
      },
      runtimeStates: {
        "finance.feeStatus": {
          state: "LOADING",
          message: "Loading tenant-scoped fee balance",
        },
      },
      role: "student",
    });

    expect(resolved.map((entry) => entry.widgetId)).toEqual(["finance.feeStatus", "exams.pendingReviews"]);
    expect(resolved.map((entry) => entry.state)).toEqual(["LOADING", "LOCKED"]);
    expect(resolved[0]).toEqual(expect.objectContaining({
      roleHintMatched: false,
      message: "Loading tenant-scoped fee balance",
      stateConfig: expect.objectContaining({ visibility: "VISIBLE" }),
    }));
    expect(resolved[1]).toEqual(expect.objectContaining({
      message: "Module not enabled for this school",
      stateConfig: expect.objectContaining({ visibility: "DISABLED" }),
    }));
  });

  it("maps event subscriptions to widgets without letting modules control dashboards", () => {
    const registry = createWidgetRegistry({
      version: "2026.05",
      widgets: [
        widget(),
        widget({
          widgetId: "discipline.escalations",
          name: "Discipline Escalations",
          moduleSource: "discipline",
          rolesAllowed: ["principal"],
          capabilitiesRequired: ["discipline:read"],
          eventSubscriptions: ["discipline.case.escalated"],
        }),
      ],
    });

    expect(getWidgetsForEvent(registry, "fee.paid").map((entry) => entry.widgetId)).toEqual(["finance.feeStatus"]);
    expect(getWidgetsForEvent(registry, "discipline.case.escalated").map((entry) => entry.widgetId)).toEqual([
      "discipline.escalations",
    ]);
  });

  it("keeps widget actions present while resolving ACTIVE, DEGRADED, FAILED, and LOCKED health states", () => {
    const sourceWidget = widget({
      actions: [
        ...widget().actions,
        {
          actionId: "sync-ledger",
          label: "Sync Ledger",
          type: "EVENT",
          capabilityRequired: "finance:read",
          handler: {
            type: "EVENT_BUS",
            target: "finance.ledger.sync",
          },
          failurePolicy: "DEGRADE",
        },
        {
          actionId: "export-ledger",
          label: "Export Ledger",
          type: "API",
          capabilityRequired: "finance:read",
          handler: {
            type: "API",
            target: "/api/finance/export",
          },
          failurePolicy: "ESCALATE",
        },
      ],
    });
    const actions = resolveWidgetActions(sourceWidget, {
      rolePermissions: ["finance:read"],
      runtimeActionStates: {
        "sync-ledger": "DEGRADED",
        "export-ledger": "FAILED",
      },
    });

    expect(actions.map((action) => action.actionId)).toEqual([
      "pay-now",
      "open-ledger",
      "sync-ledger",
      "export-ledger",
    ]);
    expect(actions.map((action) => action.state)).toEqual(["LOCKED", "ACTIVE", "DEGRADED", "FAILED"]);
    expect(actions[0]).toEqual(expect.objectContaining({
      enabled: false,
      failurePolicy: "RETRY",
    }));
  });
});
