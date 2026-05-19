"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  MailCheck,
  Plus,
  RotateCcw,
  ShieldBan,
  Trash2,
  UserRoundCog,
} from "lucide-react";

import { ActivityListCard, SimpleListCard } from "@/components/experience/activity-list-card";
import { ChartCard } from "@/components/experience/chart-card";
import { MetricGrid } from "@/components/experience/metric-grid";
import { QuickActionBar } from "@/components/experience/quick-action-bar";
import { PlatformShell } from "@/components/platform/platform-shell";
import { PlatformSupportWorkspace } from "@/components/support/platform-support-workspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import {
  fetchApiObservabilityAlerts,
  fetchApiObservabilityHealth,
  fetchApiReadiness,
  isDashboardApiConfigured,
} from "@/lib/dashboard/api-client";
import type { ExperienceNotificationItem } from "@/lib/experiences/types";
import {
  callbackFailures,
  infrastructureEvents,
  infrastructureMetrics,
  mapObservabilityAlertsToInfrastructureEvents,
  mapReadinessToInfrastructureMetrics,
  mpesaMonitoringRows,
  platformUsersRows,
  revenuePoints,
  subscriptionRows,
  supportActivity,
  superadminKpis,
  superadminNav,
  superadminProfile,
  superadminQuickActions,
  systemAlerts,
  tenantGrowthPoints,
  tenantRows,
  auditRows,
} from "@/lib/experiences/superadmin-data";
import {
  createPlatformSchool,
  deletePlatformSchool,
  fetchPlatformSchools,
  fetchPlatformModules,
  fetchPlatformSchoolModules,
  resendPlatformSchoolAdminInvite,
  updatePlatformSchoolModules,
  type PlatformSchool,
  type PlatformSchoolModuleAccess,
} from "@/lib/platform/school-onboarding-client";
import {
  defaultOnboardingModuleCodes,
  fallbackModuleCatalog,
  sortModuleCatalog,
  type ModuleRegistryItem,
} from "@/lib/module-access/module-access-map";
import { toSuperadminPath } from "@/lib/routing/experience-routes";

type SuperadminRouteMode = "hosted" | "public";

function buildSuperadminHref(
  section: Parameters<typeof toSuperadminPath>[0],
  routeMode: SuperadminRouteMode,
) {
  if (routeMode === "public") {
    return section === "dashboard" ? "/superadmin" : `/superadmin/${section}`;
  }

  return toSuperadminPath(section);
}

function mapSuperadminHref(href: string, routeMode: SuperadminRouteMode) {
  if (routeMode === "public") {
    return href === "/dashboard" ? "/superadmin" : `/superadmin${href}`;
  }

  return href;
}

function SuperadminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Platform owner workspace
          </p>
          <h2 className="mt-2 text-2xl font-bold text-foreground">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </Card>
  );
}

const emptySchoolForm = {
  schoolName: "",
  tenantId: "",
  county: "",
  adminName: "",
  adminEmail: "",
};

type PlatformSmsProviderCode = "textsms_kenya" | "africas_talking" | "twilio";

type PlatformSmsProvider = {
  id: string;
  provider_name: string;
  provider_code: PlatformSmsProviderCode;
  api_key_masked: string;
  username_masked?: string | null;
  sender_id: string;
  base_url?: string | null;
  is_active: boolean;
  is_default: boolean;
  last_test_status?: string | null;
  last_tested_at?: string | null;
  updated_at?: string | null;
};

type PlatformSmsProviderForm = {
  provider_name: string;
  provider_code: PlatformSmsProviderCode;
  api_key: string;
  username: string;
  sender_id: string;
  base_url: string;
  is_active: boolean;
  is_default: boolean;
};

const smsProviderOptions: Array<{
  code: PlatformSmsProviderCode;
  label: string;
}> = [
  { code: "textsms_kenya", label: "TextSMS Kenya" },
  { code: "africas_talking", label: "Africa's Talking" },
  { code: "twilio", label: "Twilio" },
];

const emptySmsProviderForm: PlatformSmsProviderForm = {
  provider_name: "TextSMS Kenya",
  provider_code: "textsms_kenya",
  api_key: "",
  username: "",
  sender_id: "MYSHULE",
  base_url: "",
  is_active: true,
  is_default: true,
};

type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

function unwrapPlatformPayload<T>(payload: T | ApiEnvelope<T> | null): T | null {
  return payload && typeof payload === "object" && "data" in payload
    ? (payload as ApiEnvelope<T>).data
    : (payload as T | null);
}

type PlatformTenantRow = Omit<(typeof tenantRows)[number], "invitationStatus"> & {
  adminEmail?: string;
  enabledModules?: string[];
  invitationStatus?: PlatformSchool["invitation_status"];
  invitationMessage?: string;
  invitationFailureCode?: string;
  invitationFailureReason?: string;
  invitationActionRequired?: string;
  canResendInvite?: boolean;
  inviteExpiresAt?: string;
};

function mapPlatformSchoolToTenantRow(row: PlatformSchool): PlatformTenantRow {
  const invitationLabel =
    row.invitation_status === "sent"
      ? "Invitation sent"
      : row.invitation_status === "queued"
        ? "Invite queued"
        : row.invitation_status === "blocked"
          ? "Email setup required"
          : "Invite delivery failed";

  return {
    id: row.tenant_id,
    schoolName: row.school_name,
    status: row.status === "active" ? "Active" : "Suspended",
    statusTone: row.status === "active" ? "ok" : "critical",
    subscription: "Not configured",
    studentCount: "0",
    lastActive: invitationLabel,
    revenue: "KES 0",
    adminEmail: row.admin_email,
    enabledModules: row.enabled_modules ?? [],
    invitationStatus: row.invitation_status,
    invitationMessage: row.invitation_message,
    invitationFailureCode: row.invitation_failure_code,
    invitationFailureReason: row.invitation_failure_reason,
    invitationActionRequired: row.invitation_action_required,
    canResendInvite: row.can_resend_invite,
    inviteExpiresAt: row.invite_expires_at,
  };
}

function ModuleAllocationEditor({
  tenant,
  catalog,
  onSaved,
}: {
  tenant: PlatformTenantRow;
  catalog: ModuleRegistryItem[];
  onSaved: (tenantId: string, moduleCodes: string[]) => void;
}) {
  const [rows, setRows] = useState<PlatformSchoolModuleAccess[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>(tenant.enabledModules ?? []);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTenantModules() {
      setIsLoading(true);
      setNotice(null);
      setError(null);

      try {
        const accessRows = await fetchPlatformSchoolModules(tenant.id);

        if (!cancelled) {
          setRows(accessRows);
          setSelectedCodes(accessRows.filter((row) => row.enabled).map((row) => row.code));
        }
      } catch (loadError) {
        if (!cancelled) {
          setRows(
            catalog.map((moduleItem) => ({
              ...moduleItem,
              enabled: (tenant.enabledModules ?? []).includes(moduleItem.code),
            })),
          );
          setSelectedCodes(tenant.enabledModules ?? []);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load live module access. Showing the last known allocation.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTenantModules();

    return () => {
      cancelled = true;
    };
  }, [catalog, tenant.enabledModules, tenant.id]);

  function toggleModule(moduleCode: string) {
    setSelectedCodes((currentCodes) =>
      currentCodes.includes(moduleCode)
        ? currentCodes.filter((code) => code !== moduleCode)
        : [...currentCodes, moduleCode],
    );
    setNotice(null);
    setError(null);
  }

  async function saveModules() {
    if (selectedCodes.length === 0) {
      setError("Select at least one module before saving.");
      return;
    }

    setIsSaving(true);
    setNotice(null);
    setError(null);

    try {
      const updatedRows = await updatePlatformSchoolModules({
        tenantId: tenant.id,
        moduleCodes: selectedCodes,
      });
      const enabledCodes = updatedRows.filter((row) => row.enabled).map((row) => row.code);

      setRows(updatedRows);
      setSelectedCodes(enabledCodes);
      onSaved(tenant.id, enabledCodes);
      setNotice("Module allocation updated. Disabled module data remains preserved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update module allocation.");
    } finally {
      setIsSaving(false);
    }
  }

  const visibleRows = rows.length > 0 ? rows : catalog.map((moduleItem) => ({
    ...moduleItem,
    enabled: selectedCodes.includes(moduleItem.code),
  }));

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-muted p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Module allocation</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Toggle modules without deleting the school&apos;s historical records.
          </p>
        </div>
        <StatusPill
          label={isLoading ? "Loading" : `${selectedCodes.length} enabled`}
          tone={selectedCodes.length > 0 ? "ok" : "warning"}
        />
      </div>
      {notice ? (
        <div className="rounded-[var(--radius-sm)] border border-success/20 bg-success/10 px-3 py-2 text-sm text-foreground">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-[var(--radius-sm)] border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-foreground">
          {error}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {visibleRows.map((moduleItem) => {
          const isSelected = selectedCodes.includes(moduleItem.code);

          return (
            <label
              key={moduleItem.code}
              className={`flex min-h-24 items-start gap-3 rounded-[var(--radius-sm)] border p-3 text-sm transition ${
                isSelected
                  ? "border-accent bg-surface"
                  : "border-border bg-white/60"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isSaving || moduleItem.status === "inactive"}
                onChange={() => toggleModule(moduleItem.code)}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span>
                <span className="block font-semibold text-foreground">{moduleItem.name}</span>
                <span className="mt-1 block leading-5 text-muted">{moduleItem.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      <Button disabled={isSaving || isLoading} onClick={saveModules}>
        {isSaving ? "Saving modules" : "Save module access"}
      </Button>
    </div>
  );
}

function TenantsTable() {
  const [rows, setRows] = useState<PlatformTenantRow[]>(tenantRows);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendingTenantId, setResendingTenantId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [schoolForm, setSchoolForm] = useState(emptySchoolForm);
  const [moduleCatalog, setModuleCatalog] = useState<ModuleRegistryItem[]>(fallbackModuleCatalog);
  const [selectedModuleCodes, setSelectedModuleCodes] = useState<string[]>(defaultOnboardingModuleCodes);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createdTenantForInvite, setCreatedTenantForInvite] = useState<PlatformTenantRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<PlatformTenantRow | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [hardDeleteEmptyTenant, setHardDeleteEmptyTenant] = useState(true);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const selectedTenant = rows.find((row) => row.id === selectedTenantId) ?? null;
  const isResendingInvite = resendingTenantId !== null;
  const blockedInviteRows = rows.filter((row) => row.invitationStatus === "blocked");

  useEffect(() => {
    let cancelled = false;

    async function loadSchools() {
      setIsLoadingSchools(true);

      try {
        const liveRows = await fetchPlatformSchools();

        if (!cancelled) {
          setRows(liveRows.map(mapPlatformSchoolToTenantRow));
        }
      } catch {
        if (!cancelled) {
          setRows(tenantRows);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSchools(false);
        }
      }
    }

    void loadSchools();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadModules() {
      try {
        const registry = await fetchPlatformModules();

        if (!cancelled) {
          setModuleCatalog(registry);
        }
      } catch {
        if (!cancelled) {
          setModuleCatalog(sortModuleCatalog(fallbackModuleCatalog));
        }
      }
    }

    void loadModules();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submitSchoolCreate() {
    if (
      schoolForm.schoolName.trim().length < 2 ||
      schoolForm.tenantId.trim().length < 2 ||
      schoolForm.adminName.trim().length < 2 ||
      !schoolForm.adminEmail.includes("@")
    ) {
      setCreateError("Enter the school name, school URL slug, admin name, and admin email.");
      return;
    }

    if (selectedModuleCodes.length === 0) {
      setCreateError("Select at least one module for this school.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    setCreateSuccess(null);
    setCreatedTenantForInvite(null);

    try {
      const createdSchool = await createPlatformSchool({
        schoolName: schoolForm.schoolName.trim(),
        tenantId: schoolForm.tenantId.trim(),
        county: schoolForm.county.trim() || undefined,
        adminName: schoolForm.adminName.trim(),
        adminEmail: schoolForm.adminEmail.trim(),
        moduleCodes: selectedModuleCodes,
      });
      const createdRow = mapPlatformSchoolToTenantRow(createdSchool);
      setRows((currentRows) => [
        createdRow,
        ...currentRows.filter((row) => row.id !== createdSchool.tenant_id),
      ]);
      setCreateSuccess(createdSchool.invitation_message);
      setCreatedTenantForInvite(createdRow);
      setSchoolForm(emptySchoolForm);
      setSelectedModuleCodes(defaultOnboardingModuleCodes);
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "Unable to create this school right now.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  function updateTenantStatus(tenantId: string, nextStatus: "Active" | "Suspended") {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === tenantId
          ? {
              ...row,
              status: nextStatus,
              statusTone: nextStatus === "Active" ? "ok" : "critical",
              lastActive: nextStatus === "Active" ? "just now" : row.lastActive,
            }
          : row,
      ),
    );
  }

  function toggleOnboardingModule(moduleCode: string) {
    setSelectedModuleCodes((currentCodes) =>
      currentCodes.includes(moduleCode)
        ? currentCodes.filter((code) => code !== moduleCode)
        : [...currentCodes, moduleCode],
    );
  }

  function updateTenantModules(tenantId: string, moduleCodes: string[]) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === tenantId ? { ...row, enabledModules: moduleCodes } : row,
      ),
    );
    setCreatedTenantForInvite((currentTenant) =>
      currentTenant?.id === tenantId
        ? { ...currentTenant, enabledModules: moduleCodes }
        : currentTenant,
    );
  }

  async function resendInviteForTenant(tenantId: string) {
    const tenant = rows.find((row) => row.id === tenantId) ?? createdTenantForInvite;

    if (!tenant || tenant.id !== tenantId) {
      return;
    }

    if (tenant.canResendInvite === false) {
      setResendMessage(
        tenant.invitationActionRequired ??
          "Email delivery is blocked by provider setup. Fix the email settings, then refresh this page.",
      );
      return;
    }

    setResendingTenantId(tenantId);
    setResendMessage(null);
    setResetMessage(null);

    try {
      const updatedSchool = await resendPlatformSchoolAdminInvite(tenantId);
      const updatedRow = mapPlatformSchoolToTenantRow(updatedSchool);

      setRows((currentRows) =>
        currentRows.map((row) => (row.id === updatedRow.id ? updatedRow : row)),
      );
      setCreatedTenantForInvite((currentTenant) =>
        currentTenant?.id === updatedRow.id ? updatedRow : currentTenant,
      );
      if (selectedTenantId === updatedRow.id) {
        setSelectedTenantId(updatedRow.id);
      }
      setResendMessage(updatedSchool.invitation_message);
      setCreateSuccess((currentMessage) =>
        createdTenantForInvite?.id === updatedRow.id ? updatedSchool.invitation_message : currentMessage,
      );
    } catch (error) {
      setResendMessage(
        error instanceof Error
          ? error.message
          : "Unable to resend this school invitation right now.",
      );
    } finally {
      setResendingTenantId(null);
    }
  }

  function startDeleteTenant(row: PlatformTenantRow) {
    setDeleteTarget(row);
    setDeleteConfirmation("");
    setDeleteReason("");
    setHardDeleteEmptyTenant(true);
    setDeleteError(null);
    setDeleteMessage(null);
  }

  async function submitDeleteTenant() {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    setDeleteMessage(null);

    try {
      const response = await deletePlatformSchool({
        tenantId: deleteTarget.id,
        confirmation: deleteConfirmation.trim(),
        reason: deleteReason.trim(),
        hardDeleteEmptyTenant,
      });

      if (response.deleted) {
        setRows((currentRows) => currentRows.filter((row) => row.id !== response.tenant_id));
      } else if (response.school) {
        const updatedRow = mapPlatformSchoolToTenantRow(response.school);
        setRows((currentRows) =>
          currentRows.map((row) => (row.id === response.tenant_id ? updatedRow : row)),
        );
      }

      setDeleteMessage(response.message);
      setDeleteTarget(null);
      setDeleteConfirmation("");
      setDeleteReason("");
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Unable to delete or deprovision this school.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: DataTableColumn<PlatformTenantRow>[] = [
    {
      id: "schoolName",
      header: "School Name",
      render: (row) => <span className="font-semibold">{row.schoolName}</span>,
    },
    {
      id: "status",
      header: "Status",
      render: (row) => <StatusPill label={row.status} tone={row.statusTone} />,
    },
    { id: "subscription", header: "Subscription", render: (row) => row.subscription },
    {
      id: "modules",
      header: "Modules",
      render: (row) => `${row.enabledModules?.length ?? 0} enabled`,
      className: "text-right",
      headerClassName: "text-right",
    },
    { id: "studentCount", header: "Student Count", render: (row) => row.studentCount, className: "text-right", headerClassName: "text-right" },
    { id: "lastActive", header: "Last Active", render: (row) => row.lastActive },
    { id: "revenue", header: "Revenue", render: (row) => row.revenue, className: "text-right font-semibold", headerClassName: "text-right" },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => {
            setSelectedTenantId(row.id);
            setResetMessage(null);
            setResendMessage(null);
          }}>
            Open tenant
          </Button>
          {row.adminEmail && row.invitationStatus !== "sent" ? (
            <Button
              variant="secondary"
              size="sm"
              aria-label={`Resend invite to ${row.schoolName}`}
              disabled={resendingTenantId === row.id || row.canResendInvite === false}
              onClick={() => void resendInviteForTenant(row.id)}
              title={row.canResendInvite === false ? row.invitationActionRequired : undefined}
            >
              <MailCheck className="h-4 w-4" />
              {row.canResendInvite === false
                ? "Fix email setup"
                : resendingTenantId === row.id
                  ? "Resending"
                  : "Resend invite"}
            </Button>
          ) : null}
          {row.status === "Suspended" ? (
            <Button variant="secondary" size="sm" onClick={() => updateTenantStatus(row.id, "Active")}>
              <RotateCcw className="h-4 w-4" />
              Activate
            </Button>
          ) : (
            <Button variant="danger" size="sm" onClick={() => updateTenantStatus(row.id, "Suspended")}>
              <ShieldBan className="h-4 w-4" />
              Suspend
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => {
            setSelectedTenantId(row.id);
            setResendMessage(null);
            setResetMessage(`A one-time admin reset bundle is ready for ${row.schoolName}.`);
          }}>
            <UserRoundCog className="h-4 w-4" />
            Reset admin
          </Button>
          <Button variant="ghost" size="sm" onClick={() => startDeleteTenant(row)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">School onboarding</p>
          <p className="mt-1 text-[13px] text-muted">
            Create a real tenant and email the first school administrator an invite.
          </p>
        </div>
        <Button onClick={() => {
          setIsCreateOpen(true);
          setCreateError(null);
          setCreateSuccess(null);
          setCreatedTenantForInvite(null);
          setSelectedModuleCodes(defaultOnboardingModuleCodes);
        }}>
          <Plus className="h-4 w-4" />
          Create school
        </Button>
      </div>
      {resendMessage && !selectedTenant ? (
        <div className="mb-4 rounded-[var(--radius-sm)] border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-foreground">
          {resendMessage}
        </div>
      ) : null}
      {deleteMessage ? (
        <div className="mb-4 rounded-[var(--radius-sm)] border border-success/20 bg-success/10 px-4 py-3 text-sm text-foreground">
          {deleteMessage}
        </div>
      ) : null}
      {blockedInviteRows.length > 0 ? (
        <div className="mb-4 flex gap-3 rounded-[var(--radius-sm)] border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-semibold">School invites are blocked by email provider setup.</p>
            <p className="mt-1 text-muted">
              Verify a Resend sending domain and set EMAIL_FROM to that verified domain before resending.
              The resend buttons are disabled so the system does not keep repeating the same failed delivery.
            </p>
          </div>
        </div>
      ) : null}
      <DataTable
        title="Tenant control"
        subtitle="Every tenant is isolated operationally, but platform support can review billing, access, and activity from one control surface."
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyMessage={
          isLoadingSchools
            ? "Loading live school records."
            : "No schools have been onboarded. Create the first school to send a real administrator invitation."
        }
      />
      <Modal
        open={isCreateOpen}
        title="Create school"
        description="This creates a real tenant, prepares RBAC roles, and emails the first school administrator."
        size="lg"
        onClose={() => {
          if (!isCreating) {
            setIsCreateOpen(false);
            setCreateSuccess(null);
            setCreateError(null);
            setCreatedTenantForInvite(null);
          }
        }}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={isCreating}
              onClick={() => setIsCreateOpen(false)}
            >
              Close
            </Button>
            <Button disabled={isCreating} onClick={submitSchoolCreate}>
              <MailCheck className="h-4 w-4" />
              {isCreating ? "Sending invite" : "Create and invite"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              id: "schoolName",
              label: "School name",
              placeholder: "Official school name",
              value: schoolForm.schoolName,
            },
            {
              id: "tenantId",
              label: "School URL slug",
              placeholder: "Unique school URL slug",
              value: schoolForm.tenantId,
            },
            {
              id: "county",
              label: "County",
              placeholder: "County name",
              value: schoolForm.county,
            },
            {
              id: "adminName",
              label: "Administrator name",
              placeholder: "Principal name",
              value: schoolForm.adminName,
            },
            {
              id: "adminEmail",
              label: "Administrator email",
              placeholder: "Administrator email address",
              value: schoolForm.adminEmail,
              type: "email",
              className: "md:col-span-2",
            },
          ].map((field) => (
            <label key={field.id} className={`space-y-1.5 ${field.className ?? ""}`}>
              <span className="text-[13px] font-semibold text-foreground">{field.label}</span>
              <input
                type={field.type ?? "text"}
                value={field.value}
                placeholder={field.placeholder}
                disabled={isCreating}
                onChange={(event) =>
                  setSchoolForm((currentForm) => ({
                    ...currentForm,
                    [field.id]: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
          ))}
        </div>
        <div className="mt-5 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Module stack</p>
              <p className="mt-1 text-[13px] text-muted">
                Enable only the modules this school should receive on day one.
              </p>
            </div>
            <StatusPill
              label={`${selectedModuleCodes.length} selected`}
              tone={selectedModuleCodes.length > 0 ? "ok" : "warning"}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {moduleCatalog.map((moduleItem) => {
              const isSelected = selectedModuleCodes.includes(moduleItem.code);

              return (
                <label
                  key={moduleItem.code}
                  className={`flex min-h-28 items-start gap-3 rounded-[var(--radius-sm)] border p-3 text-sm transition ${
                    isSelected
                      ? "border-accent bg-accent-soft"
                      : "border-border bg-surface-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isCreating || moduleItem.status === "inactive"}
                    onChange={() => toggleOnboardingModule(moduleItem.code)}
                    className="mt-1 h-4 w-4 rounded border-border"
                  />
                  <span>
                    <span className="block font-semibold text-foreground">{moduleItem.name}</span>
                    <span className="mt-1 block leading-5 text-muted">{moduleItem.description}</span>
                    {moduleItem.status === "inactive" ? (
                      <span className="mt-2 inline-flex text-xs font-semibold text-warning">
                        Globally inactive
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        {createError ? (
          <div className="mt-4 rounded-[var(--radius-sm)] border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {createError}
          </div>
        ) : null}
        {createSuccess ? (
          <div className="mt-4 space-y-3 rounded-[var(--radius-sm)] border border-success/20 bg-success/10 px-4 py-3 text-sm text-foreground">
            <p>{createSuccess}</p>
            {createdTenantForInvite ? (
              <div className="flex flex-col gap-3 rounded-xl border border-success/20 bg-white/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-foreground">{createdTenantForInvite.schoolName}</p>
                  <p className="mt-1 text-xs text-muted">
                    Admin invite: {createdTenantForInvite.adminEmail || "No administrator email recorded"}
                  </p>
                </div>
                {createdTenantForInvite.invitationStatus !== "sent" ? (
                  <Button
                    size="sm"
                    disabled={
                      resendingTenantId === createdTenantForInvite.id ||
                      createdTenantForInvite.canResendInvite === false
                    }
                    onClick={() => void resendInviteForTenant(createdTenantForInvite.id)}
                    title={
                      createdTenantForInvite.canResendInvite === false
                        ? createdTenantForInvite.invitationActionRequired
                        : undefined
                    }
                  >
                    <MailCheck className="h-4 w-4" />
                    {createdTenantForInvite.canResendInvite === false
                      ? "Fix email setup first"
                      : resendingTenantId === createdTenantForInvite.id
                        ? "Resending"
                        : "Resend invite now"}
                  </Button>
                ) : (
                  <StatusPill label="Invitation sent" tone="ok" />
                )}
              </div>
            ) : null}
            {createdTenantForInvite?.invitationActionRequired ? (
              <p className="rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-muted-strong">
                {createdTenantForInvite.invitationActionRequired}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
      <Modal
        open={Boolean(selectedTenant)}
        title="Tenant control"
        description="Review the tenant state, confirm support actions, and recover access safely."
        onClose={() => {
          setSelectedTenantId(null);
          setResetMessage(null);
          setResendMessage(null);
        }}
        footer={
          selectedTenant ? (
            <>
              <Button variant="secondary" onClick={() => setSelectedTenantId(null)}>
                Close
              </Button>
              <Button
                variant="secondary"
                disabled={
                  isResendingInvite ||
                  !selectedTenant.adminEmail ||
                  selectedTenant.canResendInvite === false
                }
                onClick={() => void resendInviteForTenant(selectedTenant.id)}
                title={
                  selectedTenant.canResendInvite === false
                    ? selectedTenant.invitationActionRequired
                    : undefined
                }
              >
                <MailCheck className="h-4 w-4" />
                {selectedTenant.canResendInvite === false
                  ? "Fix email setup"
                  : resendingTenantId === selectedTenant.id
                    ? "Resending"
                    : "Resend invite"}
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  setResetMessage(
                    `A one-time admin reset bundle is ready for ${selectedTenant.schoolName}.`,
                  )
                }
              >
                Reset admin
              </Button>
              {selectedTenant.status === "Suspended" ? (
                <Button
                  onClick={() => {
                    updateTenantStatus(selectedTenant.id, "Active");
                    setSelectedTenantId(null);
                  }}
                >
                  Activate
                </Button>
              ) : (
                <Button
                  variant="danger"
                  onClick={() => {
                    updateTenantStatus(selectedTenant.id, "Suspended");
                    setSelectedTenantId(null);
                  }}
                >
                  Suspend
                </Button>
              )}
              <Button
                variant="danger"
                onClick={() => {
                  startDeleteTenant(selectedTenant);
                  setSelectedTenantId(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          ) : null
        }
      >
        {selectedTenant ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  School
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {selectedTenant.schoolName}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Status
                </p>
                <div className="mt-2">
                  <StatusPill label={selectedTenant.status} tone={selectedTenant.statusTone} />
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Subscription
                </p>
                <p className="mt-2 text-sm text-foreground">{selectedTenant.subscription}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Revenue
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">{selectedTenant.revenue}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Admin invite
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {selectedTenant.adminEmail || "No admin email recorded"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {selectedTenant.invitationMessage || selectedTenant.lastActive}
                </p>
                {selectedTenant.invitationActionRequired ? (
                  <p className="mt-2 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-muted-strong">
                    {selectedTenant.invitationActionRequired}
                  </p>
                ) : null}
              </div>
            </div>
            <ModuleAllocationEditor
              tenant={selectedTenant}
              catalog={moduleCatalog}
              onSaved={updateTenantModules}
            />
            {resetMessage ? (
              <div className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-foreground">
                {resetMessage}
              </div>
            ) : null}
            {resendMessage ? (
              <div className="rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-foreground">
                {resendMessage}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
      <Modal
        open={Boolean(deleteTarget)}
        title="Delete school"
        description="Empty test tenants can be permanently removed. Schools with records are safely deprovisioned instead."
        size="lg"
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={
                isDeleting ||
                !deleteTarget ||
                deleteConfirmation.trim().toLowerCase() !== deleteTarget.id ||
                deleteReason.trim().length < 3
              }
              onClick={() => void submitDeleteTenant()}
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting" : "Delete or deprovision"}
            </Button>
          </>
        }
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
              <p className="font-semibold">This action affects the tenant workspace.</p>
              <p className="mt-1 text-muted-strong">
                If the school has students, invoices, support tickets, or MPESA records, the system will
                deactivate it instead of deleting history.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  School
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {deleteTarget.schoolName}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Confirmation slug
                </p>
                <p className="mt-2 font-mono text-sm font-semibold text-foreground">
                  {deleteTarget.id}
                </p>
              </div>
            </div>
            <label className="block space-y-1.5">
              <span className="text-[13px] font-semibold text-foreground">
                Type {deleteTarget.id} to confirm
              </span>
              <input
                value={deleteConfirmation}
                disabled={isDeleting}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-danger focus:ring-2 focus:ring-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[13px] font-semibold text-foreground">Audit reason</span>
              <textarea
                value={deleteReason}
                disabled={isDeleting}
                rows={3}
                placeholder="Example: Duplicate test tenant created during onboarding."
                onChange={(event) => setDeleteReason(event.target.value)}
                className="w-full resize-none rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-danger focus:ring-2 focus:ring-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={hardDeleteEmptyTenant}
                disabled={isDeleting}
                onChange={(event) => setHardDeleteEmptyTenant(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                Permanently delete if the tenant has no operational records. Otherwise, deprovision
                and keep the audit/history protected.
              </span>
            </label>
            {deleteError ? (
              <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                {deleteError}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function RevenuePage() {
  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="Revenue"
        description="Track subscription performance, collection reliability, and the tenant segments driving growth."
      />
      <MetricGrid items={superadminKpis.slice(2, 6)} />
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <ChartCard
          title="Monthly recurring revenue"
          subtitle="Revenue data appears after real subscriptions and payment activity are created."
          points={revenuePoints}
        />
        <SimpleListCard
          title="Collections quality"
          subtitle="Live billing health appears after schools are onboarded."
          items={[]}
        />
      </div>
    </div>
  );
}

function SubscriptionsPage() {
  const columns: DataTableColumn<(typeof subscriptionRows)[number]>[] = [
    { id: "tenant", header: "Tenant", render: (row) => <span className="font-semibold">{row.tenant}</span> },
    { id: "plan", header: "Plan", render: (row) => row.plan },
    { id: "renewal", header: "Renewal", render: (row) => row.renewal },
    { id: "amount", header: "Amount", render: (row) => row.amount, className: "text-right font-semibold", headerClassName: "text-right" },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.statusTone} /> },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="Subscriptions"
        description="Manage plan mix, renewal windows, grace enforcement, and the tenant revenue lifecycle."
      />
      <DataTable
        title="Subscription ledger"
        subtitle="Use this to inspect plan health before billing actions or support escalations."
        columns={columns}
        rows={subscriptionRows}
        getRowKey={(row) => row.id}
      />
    </div>
  );
}

function MpesaMonitoringPage() {
  const columns: DataTableColumn<(typeof mpesaMonitoringRows)[number]>[] = [
    { id: "school", header: "School", render: (row) => <span className="font-semibold">{row.school}</span> },
    { id: "checkoutRequestId", header: "Checkout Request", render: (row) => row.checkoutRequestId },
    { id: "callbackStatus", header: "Callback", render: (row) => row.callbackStatus },
    { id: "retries", header: "Retries", render: (row) => row.retries, className: "text-right", headerClassName: "text-right" },
    { id: "duplicate", header: "Duplicate", render: (row) => row.duplicate },
    {
      id: "reconciliation",
      header: "Reconciliation",
      render: (row) => <StatusPill label={row.reconciliation} tone={row.statusTone} />,
    },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="MPESA monitoring"
        description="Observe callbacks, retries, duplicate transaction handling, and reconciliation health without opening tenant dashboards."
      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DataTable
          title="Global callback monitor"
          subtitle="Platform-wide payment pipeline visibility."
          columns={columns}
          rows={mpesaMonitoringRows}
          getRowKey={(row) => row.id}
        />
        <SimpleListCard
          title="Escalation queue"
          subtitle="Cases worth human attention before the next automated sweep."
          items={callbackFailures}
        />
      </div>
    </div>
  );
}

function UsersPage() {
  const columns: DataTableColumn<(typeof platformUsersRows)[number]>[] = [
    { id: "name", header: "User", render: (row) => <span className="font-semibold">{row.name}</span> },
    { id: "role", header: "Role", render: (row) => row.role },
    { id: "scope", header: "Scope", render: (row) => row.scope },
    { id: "tickets", header: "Current load", render: (row) => row.tickets },
    { id: "lastActive", header: "Last active", render: (row) => row.lastActive },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="Users"
        description="Platform team members, operational scope, and who is actively handling support and tenant workflows."
      />
      <DataTable
        title="Platform operators"
        subtitle="Separate support, operations, and ownership responsibilities clearly."
        columns={columns}
        rows={platformUsersRows}
        getRowKey={(row) => row.id}
      />
    </div>
  );
}

function SupportPage() {
  return <PlatformSupportWorkspace defaultView="support" />;
}

function AuditLogsPage() {
  const columns: DataTableColumn<(typeof auditRows)[number]>[] = [
    { id: "actor", header: "Actor", render: (row) => row.actor },
    { id: "action", header: "Action", render: (row) => row.action },
    { id: "target", header: "Target", render: (row) => row.target },
    { id: "time", header: "Time", render: (row) => row.time },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="Audit logs"
        description="Critical platform actions across tenant access, financial workflows, and background operations."
      />
      <DataTable
        title="Recent platform audit trail"
        subtitle="Designed for trust, support reviews, and operational accountability."
        columns={columns}
        rows={auditRows}
        getRowKey={(row) => row.id}
      />
    </div>
  );
}

function InfrastructurePage() {
  const [metrics, setMetrics] = useState(infrastructureMetrics);
  const [events, setEvents] = useState(infrastructureEvents);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "degraded" | "error">(
    isDashboardApiConfigured() ? "loading" : "degraded",
  );
  const [message, setMessage] = useState(
    isDashboardApiConfigured()
      ? "Loading live infrastructure readiness..."
      : "Production API base URL is not configured for this frontend deployment.",
  );

  useEffect(() => {
    if (!isDashboardApiConfigured()) {
      return;
    }

    let cancelled = false;

    async function loadInfrastructure() {
      setLoadState("loading");
      setMessage("Loading live infrastructure readiness...");

      const [readinessResult, healthResult, alertsResult] = await Promise.allSettled([
        fetchApiReadiness(),
        fetchApiObservabilityHealth(),
        fetchApiObservabilityAlerts(),
      ]);

      if (cancelled) {
        return;
      }

      if (readinessResult.status !== "fulfilled") {
        setLoadState("error");
        setMessage("Live infrastructure readiness could not be loaded. Check API routing and platform credentials.");
        setMetrics(infrastructureMetrics);
        setEvents([
          {
            id: "infrastructure-unavailable",
            title: "Infrastructure telemetry unavailable",
            detail: readinessResult.reason instanceof Error
              ? readinessResult.reason.message
              : "The readiness endpoint did not respond successfully.",
            timeLabel: "Action",
            tone: "critical",
          },
        ]);
        return;
      }

      const health = healthResult.status === "fulfilled" ? healthResult.value : null;
      const alerts = alertsResult.status === "fulfilled" ? alertsResult.value.alerts : [];
      const degraded = readinessResult.value.status === "degraded"
        || health?.overall_status === "degraded"
        || health?.overall_status === "critical"
        || alerts.some((alert) => alert.severity === "critical");

      setMetrics(mapReadinessToInfrastructureMetrics(readinessResult.value, health));
      setEvents(mapObservabilityAlertsToInfrastructureEvents(alerts, readinessResult.value));
      setLoadState(degraded ? "degraded" : "ready");
      setMessage(
        degraded
          ? "Live telemetry is connected, but one or more dependencies need attention."
          : "Live telemetry is connected and no active infrastructure alerts were returned.",
      );
    }

    void loadInfrastructure();

    return () => {
      cancelled = true;
    };
  }, []);

  const stateTone = loadState === "ready" ? "ok" : loadState === "loading" || loadState === "degraded" ? "warning" : "critical";

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="Infrastructure"
        description="API latency, queue depth, Redis health, PostgreSQL health, and platform error rates in one surface."
        actions={<StatusPill label={loadState === "ready" ? "Live" : loadState === "loading" ? "Loading" : loadState === "degraded" ? "Degraded" : "Action"} tone={stateTone} />}
      />
      <Card className="p-4">
        <p className="text-sm leading-6 text-muted">{message}</p>
      </Card>
      <MetricGrid items={metrics} />
      <ActivityListCard
        title="Operational events"
        subtitle="Recent system behavior that impacts SLOs, worker recovery, or tenant trust."
        items={events}
      />
    </div>
  );
}

function NotificationsPage() {
  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="Notifications"
        description="Everything that needs human awareness now, from billing signals to platform incidents."
      />
      <ActivityListCard
        title="Notification stream"
        subtitle="Prioritized and phrased for support, operations, and owners."
        items={supportActivity}
      />
    </div>
  );
}

function PlatformNotice({ tone, message }: { tone: "success" | "error"; message: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${
        tone === "success"
          ? "border-success/20 bg-success/10 text-foreground"
          : "border-danger/20 bg-danger/10 text-foreground"
      }`}
    >
      {message}
    </div>
  );
}

async function parsePlatformSmsResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ApiEnvelope<T>
    | T
    | null;

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Your platform session expired. Sign in again to manage SMS providers.");
    }

    if (response.status >= 500) {
      throw new Error("SMS provider settings could not be loaded. Check API health and retry.");
    }

    throw new Error(
      payload && typeof payload === "object" && "message" in payload && payload.message
        ? payload.message
        : "Unable to complete this SMS settings request.",
    );
  }

  return unwrapPlatformPayload<T>(payload as T | ApiEnvelope<T> | null) as T;
}

function toProviderForm(provider: PlatformSmsProvider): PlatformSmsProviderForm {
  return {
    provider_name: provider.provider_name,
    provider_code: provider.provider_code,
    api_key: "",
    username: "",
    sender_id: provider.sender_id,
    base_url: provider.base_url ?? "",
    is_active: provider.is_active,
    is_default: provider.is_default,
  };
}

function getProviderTone(provider: PlatformSmsProvider): "ok" | "warning" | "critical" {
  if (!provider.is_active) return "warning";
  if (provider.last_test_status === "failed") return "critical";
  if (provider.is_default || provider.last_test_status === "ok") return "ok";
  return "warning";
}

function PlatformSmsSettingsPage() {
  const [providers, setProviders] = useState<PlatformSmsProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [form, setForm] = useState<PlatformSmsProviderForm>(emptySmsProviderForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId) ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadProviders() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/platform/sms/providers", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        const payload = await parsePlatformSmsResponse<PlatformSmsProvider[]>(response);

        if (!cancelled) {
          setProviders(Array.isArray(payload) ? payload : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "SMS provider settings could not be loaded. Check API health and retry.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateForm<K extends keyof PlatformSmsProviderForm>(
    key: K,
    value: PlatformSmsProviderForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setNotice(null);
    setError(null);
  }

  function startCreate() {
    setSelectedProviderId(null);
    setForm(emptySmsProviderForm);
    setNotice(null);
    setError(null);
  }

  function startEdit(provider: PlatformSmsProvider) {
    setSelectedProviderId(provider.id);
    setForm(toProviderForm(provider));
    setNotice(null);
    setError(null);
  }

  async function reloadProviders() {
    const response = await fetch("/api/platform/sms/providers", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    const payload = await parsePlatformSmsResponse<PlatformSmsProvider[]>(response);

    setProviders(Array.isArray(payload) ? payload : []);
  }

  async function saveProvider() {
    setIsSaving(true);
    setNotice(null);
    setError(null);

    try {
      const trimmedApiKey = form.api_key.trim();

      if (!selectedProvider && trimmedApiKey.length < 8) {
        setError("Enter the provider API key before saving a new SMS provider.");
        return;
      }

      const body: Record<string, unknown> = {
        provider_name: form.provider_name.trim(),
        provider_code: form.provider_code,
        username: form.username.trim() || undefined,
        sender_id: form.sender_id.trim(),
        base_url: form.base_url.trim() || undefined,
        is_active: form.is_active,
        is_default: form.is_default,
      };

      if (trimmedApiKey) {
        body.api_key = trimmedApiKey;
      }

      const response = await fetch(
        selectedProvider
          ? `/api/platform/sms/providers/${encodeURIComponent(selectedProvider.id)}`
          : "/api/platform/sms/providers",
        {
          method: selectedProvider ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            "x-myshule-csrf": await getCsrfToken(),
          },
          credentials: "same-origin",
          body: JSON.stringify(body),
        },
      );
      const provider = await parsePlatformSmsResponse<PlatformSmsProvider>(response);

      await reloadProviders();
      setSelectedProviderId(provider.id);
      setForm(toProviderForm(provider));
      setNotice("SMS provider saved securely. Secrets are masked and are not shown again.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save SMS provider.");
    } finally {
      setIsSaving(false);
    }
  }

  async function testProvider(provider: PlatformSmsProvider) {
    setNotice(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/platform/sms/providers/${encodeURIComponent(provider.id)}/test`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-myshule-csrf": await getCsrfToken(),
          },
          credentials: "same-origin",
        },
      );

      await parsePlatformSmsResponse<PlatformSmsProvider>(response);
      await reloadProviders();
      setNotice(`${provider.provider_name} connection test passed.`);
    } catch (testError) {
      setError(
        testError instanceof Error
          ? testError.message
          : "SMS provider test failed. Confirm the provider account, sender ID, and network access.",
      );
    }
  }

  async function setDefaultProvider(provider: PlatformSmsProvider) {
    setNotice(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/platform/sms/providers/${encodeURIComponent(provider.id)}/set-default`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-myshule-csrf": await getCsrfToken(),
          },
          credentials: "same-origin",
        },
      );

      await parsePlatformSmsResponse<PlatformSmsProvider>(response);
      await reloadProviders();
      setNotice(`${provider.provider_name} is now the default SMS provider.`);
    } catch (defaultError) {
      setError(defaultError instanceof Error ? defaultError.message : "Unable to set default provider.");
    }
  }

  const providerRows = providers.map((provider) => ({
    ...provider,
    providerLabel:
      smsProviderOptions.find((option) => option.code === provider.provider_code)?.label
      ?? provider.provider_name,
  }));

  const providerColumns: DataTableColumn<(typeof providerRows)[number]>[] = [
    { id: "provider", header: "Provider", render: (row) => <span className="font-semibold">{row.provider_name}</span> },
    { id: "type", header: "Type", render: (row) => row.providerLabel },
    { id: "sender", header: "Sender ID", render: (row) => row.sender_id },
    { id: "key", header: "API key", render: (row) => row.api_key_masked },
    {
      id: "status",
      header: "Status",
      render: (row) => (
        <StatusPill
          label={row.is_default ? "Default" : row.is_active ? "Active" : "Disabled"}
          tone={getProviderTone(row)}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>
            Edit
          </Button>
          <Button size="sm" variant="secondary" onClick={() => testProvider(row)}>
            Test
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDefaultProvider(row)}>
            Make default
          </Button>
        </div>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="SMS settings"
        description="Configure platform-owned SMS providers here. Schools consume SMS credits, but they never see API keys or provider credentials."
        actions={
          <Button variant="secondary" onClick={startCreate}>
            <Plus className="h-4 w-4" />
            Add provider
          </Button>
        }
      />

      {notice ? <PlatformNotice tone="success" message={notice} /> : null}
      {error ? <PlatformNotice tone="error" message={error} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <DataTable
          title="Platform SMS providers"
          subtitle={isLoading ? "Loading provider settings..." : "Credentials are encrypted at rest and only returned as masked values."}
          columns={providerColumns}
          rows={providerRows}
          getRowKey={(row) => row.id}
          emptyMessage="No SMS provider has been configured yet. Add TextSMS Kenya, Africa's Talking, or Twilio to start sending school messages through platform-managed credentials."
        />

        <Card className="space-y-4 p-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-muted">
              {selectedProvider ? "Edit provider" : "New provider"}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">
              Provider credentials
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Add TextSMS Kenya, Africa&apos;s Talking, or Twilio credentials. Secret fields are write-only after saving.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-sm text-foreground">
              <span className="font-medium">Provider name</span>
              <input
                className="input-base"
                value={form.provider_name}
                onChange={(event) => updateForm("provider_name", event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm text-foreground">
              <span className="font-medium">Provider</span>
              <select
                className="input-base"
                value={form.provider_code}
                disabled={Boolean(selectedProvider)}
                onChange={(event) =>
                  updateForm("provider_code", event.target.value as PlatformSmsProviderCode)
                }
              >
                {smsProviderOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-foreground">
              <span className="font-medium">API key</span>
              <input
                className="input-base"
                type="password"
                value={form.api_key}
                placeholder={selectedProvider?.api_key_masked ?? "Paste provider API key"}
                onChange={(event) => updateForm("api_key", event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm text-foreground">
              <span className="font-medium">Username</span>
              <input
                className="input-base"
                value={form.username}
                placeholder={selectedProvider?.username_masked ?? "Optional username"}
                onChange={(event) => updateForm("username", event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm text-foreground">
              <span className="font-medium">Sender ID</span>
              <input
                className="input-base"
                value={form.sender_id}
                onChange={(event) => updateForm("sender_id", event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm text-foreground">
              <span className="font-medium">Base URL</span>
              <input
                className="input-base"
                value={form.base_url}
                placeholder="Optional provider endpoint"
                onChange={(event) => updateForm("base_url", event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted p-3 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => updateForm("is_active", event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span>
                <span className="block font-semibold text-foreground">Enable provider</span>
                <span className="mt-1 block text-muted">Allow schools to send through this provider.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted p-3 text-sm">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(event) => updateForm("is_default", event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span>
                <span className="block font-semibold text-foreground">Make default</span>
                <span className="mt-1 block text-muted">Use this provider for new SMS dispatches.</span>
              </span>
            </label>
          </div>

          <div className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm leading-6 text-muted">
            Provider secrets are never exposed after save. Schools only see SMS balance, usage, logs, and purchase requests.
          </div>

          <div className="flex flex-wrap gap-2">
            <Button disabled={isSaving} onClick={saveProvider}>
              {isSaving ? "Saving..." : selectedProvider ? "Save changes" : "Save provider"}
            </Button>
            {selectedProvider ? (
              <Button variant="secondary" onClick={() => testProvider(selectedProvider)}>
                Test connection
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SettingsPage({ routeMode }: { routeMode: SuperadminRouteMode }) {
  const apiConfigured = isDashboardApiConfigured();
  const settingsCards = [
    {
      title: "Messaging and SMS providers",
      status: "Needs setup",
      tone: "warning" as const,
      description: "Manage platform-owned SMS providers, sender IDs, provider tests, and default dispatch routing.",
      href: buildSuperadminHref("sms-settings", routeMode),
      action: "Open SMS settings",
    },
    {
      title: "School invitations",
      status: "Operational",
      tone: "ok" as const,
      description: "Create schools, send administrator invites, and recover invitation delivery from the tenant control page.",
      href: buildSuperadminHref("schools", routeMode),
      action: "Open school onboarding",
    },
    {
      title: "Support routing and SLA",
      status: "Review queues",
      tone: "warning" as const,
      description: "Watch open, in-progress, escalated, resolved, SLA, and analytics support workspaces.",
      href: buildSuperadminHref("support", routeMode),
      action: "Open support",
    },
    {
      title: "Security and audit posture",
      status: "Audit ready",
      tone: "ok" as const,
      description: "Review platform owner actions, tenant-sensitive changes, and security-sensitive activity history.",
      href: buildSuperadminHref("audit-logs", routeMode),
      action: "Open audit logs",
    },
    {
      title: "Infrastructure readiness",
      status: apiConfigured ? "Connected" : "Needs API",
      tone: apiConfigured ? "ok" : "warning",
      description: "Monitor API health, callback reliability, queues, and production readiness signals.",
      href: buildSuperadminHref("infrastructure", routeMode),
      action: "Open infrastructure",
    },
    {
      title: "Notifications",
      status: "Tenant aware",
      tone: "ok" as const,
      description: "Review delivery posture for platform notices, support updates, and operational alerts.",
      href: buildSuperadminHref("notifications", routeMode),
      action: "Open notifications",
    },
  ] satisfies Array<{
    title: string;
    status: string;
    tone: "ok" | "warning" | "critical";
    description: string;
    href: string;
    action: string;
  }>;

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="Settings"
        description="Platform-wide control surfaces for messaging, school invitations, support operations, audit posture, and infrastructure readiness."
        actions={
          <Link href={buildSuperadminHref("sms-settings", routeMode)}>
            <Button variant="secondary">Open SMS settings</Button>
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {settingsCards.map((card) => (
          <Card key={card.title} className="flex min-h-56 flex-col justify-between p-5">
            <div>
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-semibold text-foreground">{card.title}</p>
                <StatusPill label={card.status} tone={card.tone} />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{card.description}</p>
            </div>
            <Link href={card.href} className="mt-5">
              <Button variant="secondary" className="w-full justify-center">
                {card.action}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SuperadminOverview({ routeMode }: { routeMode: SuperadminRouteMode }) {
  const quickActions = superadminQuickActions.map((action) => ({
    ...action,
    href: mapSuperadminHref(action.href, routeMode),
  }));

  return (
    <div className="space-y-6">
      <MetricGrid items={superadminKpis} columns="three" />
      <QuickActionBar actions={quickActions} />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <ChartCard
            title="Revenue trend"
            subtitle="Monthly revenue appears after live subscriptions, invoices, and payment settlements."
            points={revenuePoints}
          />
          <ChartCard
            title="Tenant growth"
            subtitle="New schools appear here after the platform owner completes real onboarding."
            points={tenantGrowthPoints}
          />
        </div>
        <div className="space-y-6">
          <SimpleListCard
            title="System alerts"
            subtitle="Signals the platform team should notice immediately."
            items={systemAlerts}
          />
          <SimpleListCard
            title="Failed callbacks"
            subtitle="Payment anomalies currently under watch."
            items={callbackFailures}
          />
          <ActivityListCard
            title="Support activity"
            subtitle="What the platform team is resolving right now."
            items={supportActivity}
          />
        </div>
      </div>
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-foreground">Tenant watchlist</p>
            <p className="mt-1 text-sm text-muted">
              Schools that usually need proactive commercial or operational support.
            </p>
          </div>
          <Link
            href={buildSuperadminHref("schools", routeMode)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            Open tenant control
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <TenantsTable />
      </Card>
    </div>
  );
}

export function SuperadminPages({
  section = "overview",
  routeMode = "hosted",
}: {
  section?: string;
  routeMode?: SuperadminRouteMode;
}) {
  const normalizedSection =
    section === "overview" || section === "schools" ? section : section;
  const activeHref =
    normalizedSection === "overview"
      ? buildSuperadminHref("dashboard", routeMode)
      : buildSuperadminHref(
          normalizedSection === "tenants"
            ? "schools"
            : (normalizedSection as Parameters<typeof toSuperadminPath>[0]),
          routeMode,
        );
  const navItems = superadminNav.map((item) => ({
    ...item,
    href: mapSuperadminHref(item.href, routeMode),
  }));
  const notifications: ExperienceNotificationItem[] = [
    ...systemAlerts.map(
      (item): ExperienceNotificationItem => ({
        id: item.id,
        title: item.title,
        detail: item.subtitle,
        timeLabel: "live",
        tone: item.tone ?? "ok",
        href: mapSuperadminHref("/notifications", routeMode),
      }),
    ),
    ...supportActivity.map(
      (item): ExperienceNotificationItem => ({
        id: item.id,
        title: item.title,
        detail: item.detail,
        timeLabel: item.timeLabel,
        tone: item.tone,
        href: mapSuperadminHref("/support", routeMode),
      }),
    ),
  ];

  return (
    <PlatformShell
      brand={{ title: "My Shule", subtitle: "Platform owner" }}
      navItems={navItems}
      activeHref={activeHref}
      topLabel="Platform owner workspace"
      title="Platform owner dashboard"
      subtitle="Run the business, monitor infrastructure, and intervene safely without leaking across tenant boundaries."
      status={{ label: "Platform healthy", tone: "ok" }}
      profile={superadminProfile}
      notifications={notifications}
      actions={
        <Link href={buildSuperadminHref("infrastructure", routeMode)}>
          <Button variant="secondary">
            <ExternalLink className="h-4 w-4" />
            Open incident feed
          </Button>
        </Link>
      }
    >
      {normalizedSection === "overview" ? <SuperadminOverview routeMode={routeMode} /> : null}
      {normalizedSection === "tenants" || normalizedSection === "schools" ? <TenantsTable /> : null}
      {normalizedSection === "revenue" ? <RevenuePage /> : null}
      {normalizedSection === "subscriptions" ? <SubscriptionsPage /> : null}
      {normalizedSection === "mpesa-monitoring" ? <MpesaMonitoringPage /> : null}
      {normalizedSection === "sms-settings" ? <PlatformSmsSettingsPage /> : null}
      {normalizedSection === "users" ? <UsersPage /> : null}
      {normalizedSection === "support" ? <SupportPage /> : null}
      {normalizedSection === "support-open" ? <PlatformSupportWorkspace defaultView="support-open" /> : null}
      {normalizedSection === "support-in-progress" ? <PlatformSupportWorkspace defaultView="support-in-progress" /> : null}
      {normalizedSection === "support-escalated" ? <PlatformSupportWorkspace defaultView="support-escalated" /> : null}
      {normalizedSection === "support-resolved" ? <PlatformSupportWorkspace defaultView="support-resolved" /> : null}
      {normalizedSection === "support-sla" ? <PlatformSupportWorkspace defaultView="support-sla" /> : null}
      {normalizedSection === "support-analytics" ? <PlatformSupportWorkspace defaultView="support-analytics" /> : null}
      {normalizedSection === "audit-logs" ? <AuditLogsPage /> : null}
      {normalizedSection === "infrastructure" ? <InfrastructurePage /> : null}
      {normalizedSection === "notifications" ? <NotificationsPage /> : null}
      {normalizedSection === "settings" ? <SettingsPage routeMode={routeMode} /> : null}
    </PlatformShell>
  );
}
