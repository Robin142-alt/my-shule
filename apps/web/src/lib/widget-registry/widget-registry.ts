import {
  resolveWidgetState,
  type CapabilityEnforcementSnapshot,
  type ModuleEntitlementInput,
  type RolePermissionInput,
  type WidgetState,
} from "@/lib/capability-engine/school-capability-engine";

export type Role = string;
export type WidgetTenantScope = "GLOBAL" | "TENANT";
export type WidgetLifecycleState = "ACTIVE" | "DEPRECATED" | "EXPERIMENTAL";
export type WidgetLayout = "card" | "table" | "chart" | "form";
export type WidgetRenderMode = "LIVE" | "STATIC";
export type WidgetStateVisibility = "VISIBLE" | "DISABLED" | "READONLY";
export type WidgetActionType = "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "NAVIGATE" | "EVENT";
export type WidgetActionHandlerType = "MODULE" | "EVENT_BUS" | "API";
export type WidgetActionFailurePolicy = "RETRY" | "DEGRADE" | "ESCALATE";
export type WidgetRuntimeOverrideState = Extract<WidgetState, "DEGRADED" | "FAILED" | "LOADING">;
export type WidgetActionHealthState = "ACTIVE" | "DEGRADED" | "FAILED" | "LOCKED";
export type JsonSchemaObject = Record<string, unknown>;

export const requiredWidgetStates = ["ACTIVE", "EMPTY", "LOCKED", "DEGRADED", "FAILED", "LOADING"] as const;

export interface WidgetStateConfig {
  label: string;
  visibility: WidgetStateVisibility;
  fallbackData?: unknown;
  message?: string;
  retryable?: boolean;
}

export interface WidgetAction {
  actionId: string;
  label: string;
  type: WidgetActionType;
  capabilityRequired: string;
  handler: {
    type: WidgetActionHandlerType;
    target: string;
  };
  failurePolicy: WidgetActionFailurePolicy;
}

export interface WidgetDefinition {
  widgetId: string;
  name: string;
  moduleSource: string;
  tenantScope: WidgetTenantScope;
  rolesAllowed: Role[];
  capabilitiesRequired: string[];
  lifecycleState: WidgetLifecycleState;
  eventSubscriptions: string[];
  dataContract: {
    inputSchema: JsonSchemaObject;
    outputSchema: JsonSchemaObject;
  };
  uiSchema: {
    type: "widget";
    layout: WidgetLayout;
    renderMode: WidgetRenderMode;
  };
  states: Record<WidgetState, WidgetStateConfig>;
  actions: WidgetAction[];
}

export interface WidgetRegistry {
  version: string;
  widgets: WidgetDefinition[];
}

export interface ResolveRegisteredWidgetsInput {
  registry: WidgetRegistry;
  moduleEntitlements?: ModuleEntitlementInput;
  rolePermissions?: RolePermissionInput;
  enforcement?: CapabilityEnforcementSnapshot;
  dataAvailability?: Record<string, boolean>;
  runtimeStates?: Record<string, {
    state: WidgetRuntimeOverrideState;
    message?: string;
  }>;
  role?: Role;
}

export type ResolvedWidgetDefinition = WidgetDefinition & {
  state: WidgetState;
  stateConfig: WidgetStateConfig;
  message: string;
  roleHintMatched: boolean;
};

export type ResolvedWidgetAction = WidgetAction & {
  state: WidgetActionHealthState;
  enabled: boolean;
};

export interface ResolveWidgetActionsInput {
  rolePermissions?: RolePermissionInput;
  runtimeActionStates?: Record<string, Extract<WidgetActionHealthState, "DEGRADED" | "FAILED">>;
}

export function createWidgetRegistry(registry: WidgetRegistry): WidgetRegistry {
  validateRegistry(registry);

  return {
    version: registry.version,
    widgets: registry.widgets.map((widget) => ({
      ...widget,
      rolesAllowed: [...widget.rolesAllowed],
      capabilitiesRequired: [...widget.capabilitiesRequired],
      eventSubscriptions: [...widget.eventSubscriptions],
      actions: widget.actions.map((action) => ({ ...action, handler: { ...action.handler } })),
    })),
  };
}

export function resolveRegisteredWidgets({
  registry,
  moduleEntitlements,
  rolePermissions,
  enforcement,
  dataAvailability = {},
  runtimeStates = {},
  role,
}: ResolveRegisteredWidgetsInput): ResolvedWidgetDefinition[] {
  return registry.widgets.map((widget) => {
    const runtimeState = runtimeStates[widget.widgetId];
    const resolved = resolveWidgetState({
      widget: {
        id: widget.widgetId,
        moduleCode: widget.moduleSource,
        requiredPermission: widget.capabilitiesRequired,
        hasData: dataAvailability[widget.widgetId] ?? false,
        runtimeState: runtimeState?.state,
        runtimeMessage: runtimeState?.message,
      },
      moduleEntitlements,
      rolePermissions,
      enforcement,
    });

    return {
      ...widget,
      state: resolved.state,
      message: resolved.message,
      stateConfig: widget.states[resolved.state],
      roleHintMatched: role ? widget.rolesAllowed.includes(role) : true,
    };
  });
}

export function getWidgetsForEvent(registry: WidgetRegistry, eventName: string): WidgetDefinition[] {
  return registry.widgets.filter((widget) => widget.eventSubscriptions.includes(eventName));
}

export function resolveWidgetActions(
  widget: WidgetDefinition,
  { rolePermissions, runtimeActionStates = {} }: ResolveWidgetActionsInput = {},
): ResolvedWidgetAction[] {
  return widget.actions.map((action) => {
    const hasCapability = hasPermission(action.capabilityRequired, rolePermissions);
    const state: WidgetActionHealthState = hasCapability
      ? runtimeActionStates[action.actionId] ?? "ACTIVE"
      : "LOCKED";

    return {
      ...action,
      state,
      enabled: state !== "LOCKED" && state !== "FAILED",
    };
  });
}

function validateRegistry(registry: WidgetRegistry) {
  if (!registry.version.trim()) {
    throw new Error("Widget registry version is required");
  }

  const seenWidgetIds = new Set<string>();

  for (const widget of registry.widgets) {
    if (seenWidgetIds.has(widget.widgetId)) {
      throw new Error(`Duplicate widgetId: ${widget.widgetId}`);
    }
    seenWidgetIds.add(widget.widgetId);

    for (const state of requiredWidgetStates) {
      if (!widget.states[state]) {
        throw new Error(`Widget ${widget.widgetId} missing state config: ${state}`);
      }
    }

    const seenActionIds = new Set<string>();
    for (const action of widget.actions) {
      if (seenActionIds.has(action.actionId)) {
        throw new Error(`Widget ${widget.widgetId} has duplicate actionId: ${action.actionId}`);
      }
      seenActionIds.add(action.actionId);
    }
  }
}

function hasPermission(requiredPermission: string, rolePermissions: RolePermissionInput): boolean {
  if (!rolePermissions) {
    return false;
  }

  if (isReadonlySet(rolePermissions)) {
    return rolePermissions.has("*:*") || rolePermissions.has(requiredPermission);
  }

  return rolePermissions.includes("*:*") || rolePermissions.includes(requiredPermission);
}

function isReadonlySet(value: RolePermissionInput): value is ReadonlySet<string> {
  return value instanceof Set;
}
