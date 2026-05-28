export type TenantLifecycleState =
  | "PROVISIONING"
  | "SETUP_IN_PROGRESS"
  | "AWAITING_VERIFICATION"
  | "ACTIVE"
  | "ACTIVE_LIMITED"
  | "GRACE_PERIOD"
  | "PAYMENT_OVERDUE"
  | "SUSPENDED"
  | "RESTRICTED"
  | "ARCHIVED";

export type BillingState = "PAID" | "PENDING" | "GRACE" | "OVERDUE";

export type ManualBillingState = "ACTIVE" | "OVERDUE" | "SUSPENDED";

export type WidgetState = "ACTIVE" | "EMPTY" | "LOCKED" | "DEGRADED" | "FAILED" | "LOADING";

export type CapabilityEnforcementLevel =
  | "FULL_ACCESS"
  | "GRACE_WARNING"
  | "FUNCTIONAL_LIMITATION"
  | "OPERATIONAL_LOCKDOWN"
  | "SUSPENSION";

export type CapabilityWriteMode = "full" | "limited" | "read_only" | "blocked";

export type ModuleEntitlementInput =
  | ReadonlySet<string>
  | readonly string[]
  | Record<string, boolean>
  | null
  | undefined;

export type RolePermissionInput =
  | ReadonlySet<string>
  | readonly string[]
  | null
  | undefined;

export interface CapabilityEnforcementSnapshot {
  level: CapabilityEnforcementLevel;
  canLogin: boolean;
  writeMode: CapabilityWriteMode;
  message: string;
}

export interface ResolveCapabilityEnforcementInput {
  tenantLifecycle?: TenantLifecycleState;
  tenantLifecycleState?: TenantLifecycleState;
  billingState?: BillingState;
  manualBillingState?: ManualBillingState;
  overdueLevel?: CapabilityEnforcementLevel;
}

export interface WidgetCapabilityDescriptor {
  id: string;
  moduleCode?: string | null;
  hasData?: boolean;
  requiredPermission?: string | readonly string[] | null;
  runtimeState?: Extract<WidgetState, "DEGRADED" | "FAILED" | "LOADING"> | null;
  runtimeMessage?: string | null;
}

export type ResolvedWidgetCapability<TWidget extends WidgetCapabilityDescriptor> = TWidget & {
  state: WidgetState;
  message: string;
};

export interface ResolveWidgetStateInput<TWidget extends WidgetCapabilityDescriptor> {
  widget: TWidget;
  moduleEntitlements?: ModuleEntitlementInput;
  rolePermissions?: RolePermissionInput;
  enforcement?: CapabilityEnforcementSnapshot;
}

export interface ResolveDashboardWidgetStatesInput<TWidget extends WidgetCapabilityDescriptor> {
  widgets: readonly TWidget[];
  moduleEntitlements?: ModuleEntitlementInput;
  rolePermissions?: RolePermissionInput;
  enforcement?: CapabilityEnforcementSnapshot;
}

export interface SidebarCapabilityItem {
  id: string;
  moduleCode?: string | null;
  requiredPermission?: string | readonly string[] | null;
}

export interface BuildCapabilitySidebarInput<TItem extends SidebarCapabilityItem> {
  items: readonly TItem[];
  moduleEntitlements?: ModuleEntitlementInput;
  rolePermissions?: RolePermissionInput;
  enforcement?: CapabilityEnforcementSnapshot;
}

const saasBillingIdentifiers = new Set(["billing", "subscription", "subscriptions"]);

function isRecordEntitlementInput(value: ModuleEntitlementInput): value is Record<string, boolean> {
  return Boolean(value) && !Array.isArray(value) && !(value instanceof Set);
}

function isReadonlySet(value: RolePermissionInput | ModuleEntitlementInput): value is ReadonlySet<string> {
  return value instanceof Set;
}

function hasPermission(
  requiredPermission: string | readonly string[] | null | undefined,
  rolePermissions: RolePermissionInput,
) {
  if (!requiredPermission) {
    return true;
  }

  if (!rolePermissions) {
    return false;
  }

  const required = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];

  return required.every((permission) =>
    isReadonlySet(rolePermissions)
      ? rolePermissions.has(permission)
      : rolePermissions.includes(permission),
  );
}

function isSaasBillingItem(item: SidebarCapabilityItem) {
  return (
    saasBillingIdentifiers.has(item.id)
    || (typeof item.moduleCode === "string" && saasBillingIdentifiers.has(item.moduleCode))
  );
}

export function isModuleEntitled(
  moduleCode: string | null | undefined,
  moduleEntitlements: ModuleEntitlementInput,
) {
  if (!moduleCode) {
    return true;
  }

  if (!moduleEntitlements) {
    return true;
  }

  if (isReadonlySet(moduleEntitlements)) {
    return moduleEntitlements.has(moduleCode);
  }

  if (Array.isArray(moduleEntitlements)) {
    return moduleEntitlements.includes(moduleCode);
  }

  if (isRecordEntitlementInput(moduleEntitlements)) {
    return Boolean(moduleEntitlements[moduleCode]);
  }

  return false;
}

function enforcementSnapshot(
  level: CapabilityEnforcementLevel,
  message: string,
): CapabilityEnforcementSnapshot {
  const writeModeByLevel: Record<CapabilityEnforcementLevel, CapabilityWriteMode> = {
    FULL_ACCESS: "full",
    GRACE_WARNING: "full",
    FUNCTIONAL_LIMITATION: "limited",
    OPERATIONAL_LOCKDOWN: "read_only",
    SUSPENSION: "blocked",
  };

  return {
    level,
    canLogin: level !== "SUSPENSION",
    writeMode: writeModeByLevel[level],
    message,
  };
}

export function resolveCapabilityEnforcement({
  tenantLifecycle,
  tenantLifecycleState,
  billingState = "PAID",
  manualBillingState,
  overdueLevel,
}: ResolveCapabilityEnforcementInput = {}) {
  const lifecycle = tenantLifecycleState ?? tenantLifecycle ?? "ACTIVE";

  if (lifecycle === "SUSPENDED" || lifecycle === "ARCHIVED") {
    return enforcementSnapshot("SUSPENSION", "School access is suspended");
  }

  if (lifecycle === "RESTRICTED") {
    return enforcementSnapshot("OPERATIONAL_LOCKDOWN", "School is in read-only operational lockdown");
  }

  if (manualBillingState === "SUSPENDED") {
    return enforcementSnapshot("SUSPENSION", "School access is suspended");
  }

  if (overdueLevel && overdueLevel !== "FULL_ACCESS") {
    return enforcementSnapshot(
      overdueLevel,
      overdueLevel === "OPERATIONAL_LOCKDOWN"
        ? "School is in read-only operational lockdown"
        : "School payment enforcement is active",
    );
  }

  if (
    lifecycle === "PAYMENT_OVERDUE"
    || manualBillingState === "OVERDUE"
    || (!manualBillingState && billingState === "OVERDUE")
  ) {
    return enforcementSnapshot("FUNCTIONAL_LIMITATION", "Some non-critical actions are limited");
  }

  if (lifecycle === "GRACE_PERIOD" || (!manualBillingState && billingState === "GRACE")) {
    return enforcementSnapshot("GRACE_WARNING", "Payment grace warning is active");
  }

  if (
    lifecycle === "ACTIVE_LIMITED"
    || lifecycle === "PROVISIONING"
    || lifecycle === "SETUP_IN_PROGRESS"
    || lifecycle === "AWAITING_VERIFICATION"
  ) {
    return enforcementSnapshot("FUNCTIONAL_LIMITATION", "School setup limitations are active");
  }

  return enforcementSnapshot("FULL_ACCESS", "Full access");
}

export function resolveWidgetState<TWidget extends WidgetCapabilityDescriptor>({
  widget,
  moduleEntitlements,
  rolePermissions,
  enforcement = resolveCapabilityEnforcement(),
}: ResolveWidgetStateInput<TWidget>): ResolvedWidgetCapability<TWidget> {
  if (enforcement.level === "SUSPENSION") {
    return {
      ...widget,
      state: "LOCKED",
      message: "School access is suspended",
    };
  }

  if (enforcement.level === "OPERATIONAL_LOCKDOWN") {
    return {
      ...widget,
      state: "LOCKED",
      message: "School is in read-only operational lockdown",
    };
  }

  if (!isModuleEntitled(widget.moduleCode, moduleEntitlements)) {
    return {
      ...widget,
      state: "LOCKED",
      message: "Module not enabled for this school",
    };
  }

  if (!hasPermission(widget.requiredPermission, rolePermissions)) {
    return {
      ...widget,
      state: "LOCKED",
      message: "Role not permitted for this widget",
    };
  }

  if (widget.runtimeState === "FAILED") {
    return {
      ...widget,
      state: "FAILED",
      message: widget.runtimeMessage ?? "Widget failed; retry is available",
    };
  }

  if (widget.runtimeState === "LOADING") {
    return {
      ...widget,
      state: "LOADING",
      message: widget.runtimeMessage ?? "Loading widget data",
    };
  }

  if (widget.runtimeState === "DEGRADED") {
    return {
      ...widget,
      state: "DEGRADED",
      message: widget.runtimeMessage ?? "Widget is partially available",
    };
  }

  return {
    ...widget,
    state: widget.hasData ? "ACTIVE" : "EMPTY",
    message: widget.hasData ? "Ready" : "No data yet",
  };
}

export function resolveDashboardWidgetStates<TWidget extends WidgetCapabilityDescriptor>({
  widgets,
  moduleEntitlements,
  rolePermissions,
  enforcement = resolveCapabilityEnforcement(),
}: ResolveDashboardWidgetStatesInput<TWidget>) {
  return widgets.map((widget) =>
    resolveWidgetState({
      widget,
      moduleEntitlements,
      rolePermissions,
      enforcement,
    }),
  );
}

export function buildCapabilitySidebar<TItem extends SidebarCapabilityItem>({
  items,
  moduleEntitlements,
  rolePermissions,
  enforcement = resolveCapabilityEnforcement(),
}: BuildCapabilitySidebarInput<TItem>) {
  if (enforcement.level === "SUSPENSION") {
    return [];
  }

  return items.filter((item) => {
    if (isSaasBillingItem(item)) {
      return false;
    }

    return (
      isModuleEntitled(item.moduleCode, moduleEntitlements)
      && hasPermission(item.requiredPermission, rolePermissions)
    );
  });
}
