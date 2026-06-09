import {
  buildCapabilitySidebar,
  resolveCapabilityEnforcement,
  resolveDashboardWidgetStates,
  resolveWidgetState,
} from "@/lib/capability-engine/school-capability-engine";
import { getRoleCapabilities, getRoleQuickActions, getRoleSidebar } from "@/lib/dashboard/role-config";
import { filterNavItemsByEnabledModules } from "@/lib/module-access/module-access-map";

describe("MyShule global enforcer", () => {
  it("resolves widgets only as ACTIVE, EMPTY, LOCKED, DEGRADED, FAILED, or LOADING without removing static dashboard sections", () => {
    const widgets = resolveDashboardWidgetStates({
      widgets: [
        { id: "exam-overview", moduleCode: "exams", hasData: true },
        { id: "discipline-risk", moduleCode: "discipline", hasData: true },
        { id: "library-audit", moduleCode: "library", hasData: false },
        {
          id: "finance-reconciliation",
          moduleCode: "finance",
          hasData: true,
          runtimeState: "DEGRADED",
          runtimeMessage: "Bank feed delayed; showing cached totals",
        },
        {
          id: "ai-risk-scanner",
          moduleCode: "analytics",
          hasData: true,
          runtimeState: "FAILED",
          runtimeMessage: "Risk scanner unavailable; retry queued",
        },
        {
          id: "transport-live-map",
          moduleCode: "transport",
          hasData: false,
          runtimeState: "LOADING",
          runtimeMessage: "Syncing live vehicle positions",
        },
      ],
      moduleEntitlements: {
        exams: true,
        discipline: false,
        library: true,
        finance: true,
        analytics: true,
        transport: true,
      },
      rolePermissions: ["exams:read", "library:read", "finance:read", "analytics:read", "transport:read"],
      enforcement: resolveCapabilityEnforcement({
        tenantLifecycle: "ACTIVE",
        billingState: "PAID",
      }),
    });

    expect(widgets.map((widget) => widget.id)).toEqual([
      "exam-overview",
      "discipline-risk",
      "library-audit",
      "finance-reconciliation",
      "ai-risk-scanner",
      "transport-live-map",
    ]);
    expect(widgets.map((widget) => widget.state)).toEqual([
      "ACTIVE",
      "LOCKED",
      "EMPTY",
      "DEGRADED",
      "FAILED",
      "LOADING",
    ]);
    expect(new Set(widgets.map((widget) => widget.state))).toEqual(
      new Set(["ACTIVE", "LOCKED", "EMPTY", "DEGRADED", "FAILED", "LOADING"]),
    );
    expect(widgets[1]?.message).toBe("Module not enabled for this school");
    expect(widgets[3]?.message).toBe("Bank feed delayed; showing cached totals");
    expect(widgets[4]?.message).toBe("Risk scanner unavailable; retry queued");
    expect(widgets[5]?.message).toBe("Syncing live vehicle positions");
  });

  it("generates sidebar items only from active module capabilities and never SaaS billing entries", () => {
    const sidebar = buildCapabilitySidebar({
      items: [
        { id: "dashboard", label: "Dashboard", moduleCode: null },
        { id: "exams", label: "Exams", moduleCode: "exams" },
        { id: "finance", label: "Finance", moduleCode: "finance" },
        { id: "billing", label: "SaaS Billing", moduleCode: "billing" },
      ],
      moduleEntitlements: {
        exams: true,
        finance: false,
        billing: true,
      },
      rolePermissions: ["exams:read"],
      enforcement: resolveCapabilityEnforcement({
        tenantLifecycle: "ACTIVE",
        billingState: "PAID",
      }),
    });

    expect(sidebar.map((item) => item.id)).toEqual(["dashboard", "exams"]);
  });

  it("applies overdue enforcement progressively through the capability engine only", () => {
    expect(
      resolveCapabilityEnforcement({
        tenantLifecycle: "ACTIVE",
        billingState: "GRACE",
      }),
    ).toEqual(expect.objectContaining({
      level: "GRACE_WARNING",
      canLogin: true,
      writeMode: "full",
    }));

    expect(
      resolveCapabilityEnforcement({
        tenantLifecycle: "ACTIVE",
        billingState: "OVERDUE",
      }),
    ).toEqual(expect.objectContaining({
      level: "FUNCTIONAL_LIMITATION",
      canLogin: true,
      writeMode: "limited",
    }));

    expect(
      resolveCapabilityEnforcement({
        tenantLifecycle: "ACTIVE",
        billingState: "OVERDUE",
        overdueLevel: "OPERATIONAL_LOCKDOWN",
      }),
    ).toEqual(expect.objectContaining({
      level: "OPERATIONAL_LOCKDOWN",
      canLogin: true,
      writeMode: "read_only",
    }));

    expect(
      resolveCapabilityEnforcement({
        tenantLifecycle: "SUSPENDED",
        billingState: "PAID",
      }),
    ).toEqual(expect.objectContaining({
      level: "SUSPENSION",
      canLogin: false,
      writeMode: "blocked",
    }));
  });

  it("treats manual billing controls as capability inputs without letting billing disable modules directly", () => {
    expect(
      resolveCapabilityEnforcement({
        tenantLifecycle: "ACTIVE",
        manualBillingState: "ACTIVE",
      }),
    ).toEqual(expect.objectContaining({
      level: "FULL_ACCESS",
      canLogin: true,
      writeMode: "full",
    }));

    expect(
      resolveCapabilityEnforcement({
        tenantLifecycle: "ACTIVE",
        manualBillingState: "OVERDUE",
      }),
    ).toEqual(expect.objectContaining({
      level: "FUNCTIONAL_LIMITATION",
      canLogin: true,
      writeMode: "limited",
    }));

    const suspendedEnforcement = resolveCapabilityEnforcement({
      tenantLifecycle: "ACTIVE",
      manualBillingState: "SUSPENDED",
    });
    const widgets = resolveDashboardWidgetStates({
      widgets: [{ id: "finance-ledger", moduleCode: "finance", hasData: true }],
      moduleEntitlements: { finance: true },
      rolePermissions: ["finance:read"],
      enforcement: suspendedEnforcement,
    });

    expect(suspendedEnforcement).toEqual(expect.objectContaining({
      level: "SUSPENSION",
      canLogin: false,
      writeMode: "blocked",
    }));
    expect(widgets).toEqual([
      expect.objectContaining({
        id: "finance-ledger",
        state: "LOCKED",
        message: "School access is suspended",
      }),
    ]);
  });

  it("locks widgets during operational lockdown without exposing system errors as UI state", () => {
    const state = resolveWidgetState({
      widget: { id: "marks-entry", moduleCode: "exams", hasData: true },
      moduleEntitlements: { exams: true },
      rolePermissions: ["exams:write"],
      enforcement: resolveCapabilityEnforcement({
        tenantLifecycle: "ACTIVE",
        billingState: "OVERDUE",
        overdueLevel: "OPERATIONAL_LOCKDOWN",
      }),
    });

    expect(state.state).toBe("LOCKED");
    expect(state.message).toBe("School is in read-only operational lockdown");
    expect(state.message).not.toMatch(/error|exception|500|failed/i);
  });

  it("routes school navigation filtering through module entitlements instead of local dashboard guesses", () => {
    const nav = filterNavItemsByEnabledModules(
      [
        { id: "dashboard" },
        { id: "exams" },
        { id: "finance" },
        { id: "transport" },
      ],
      {
        exams: true,
        finance: false,
        transport: false,
      },
    );

    expect(nav.map((item) => item.id)).toEqual(["dashboard", "exams"]);
  });

  it("routes legacy role sidebars, actions, and capabilities through the same capability engine", () => {
    const moduleEntitlements = {
      students: true,
      finance: false,
      inventory: false,
      communication_sms: true,
      reports: true,
    };

    expect(getRoleSidebar("admin", { moduleEntitlements }).map((item) => item.id)).toEqual([
      "dashboard",
      "students",
      "reports",
      "communication",
      "settings",
    ]);

    expect(getRoleQuickActions("admin", { moduleEntitlements }).map((item) => item.id)).toEqual([
      "add-student",
      "send-sms",
      "print-report",
    ]);

    expect(getRoleCapabilities("admin", { moduleEntitlements }).map((item) => item.id)).not.toEqual(
      expect.arrayContaining(["cap-billing", "cap-mpesa", "cap-inventory-stock", "cap-procurement"]),
    );
  });
});
